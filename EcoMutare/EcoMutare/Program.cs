using System.Security.Claims;
using System.Text;
using EcoMutare.Data;
using EcoMutare.Domain.Entities;
using EcoMutare.Services.Auth;
using EcoMutare.Services.Community;
using EcoMutare.Services.Insights;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers()
    .AddJsonOptions(o =>
    {
        // Enumi se šalju kao stringovi ("Bike"), ne kao brojevi; camelCase je zadani.
        o.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
    });

// EF Core: MySQL baza (produkcija na serveru / lokalno).
// ServerVersion.AutoDetect dohvaća verziju izravno sa servera, a fallback je MySQL 8.0.
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? "Server=localhost;Port=3306;Database=ecomutare;User=root;Password=root;";

builder.Services.AddDbContext<AppDbContext>(options =>
{
    try
    {
        options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString));
    }
    catch
    {
        options.UseMySql(connectionString, new MySqlServerVersion(new Version(8, 0, 36)));
    }
});

// Memory cache za ORS rute (1h), Open-Meteo vrijeme (30 min), elevaciju (6h) i Sesizări (15 min)
builder.Services.AddMemoryCache();
builder.Services.AddHttpClient();

// HttpClient za Open-Meteo (forecast + elevation, besplatno bez ključa) s resilience politikom
builder.Services.AddHttpClient<EcoMutare.Integrations.OpenMeteo.OpenMeteoClient>((sp, client) =>
{
    var opts = sp.GetRequiredService<Microsoft.Extensions.Options.IOptions<EcoMutare.Integrations.OpenMeteo.OpenMeteoOptions>>().Value;
    client.BaseAddress = new Uri(opts.BaseUrl);
    client.Timeout = TimeSpan.FromSeconds(Math.Max(2, opts.TimeoutSeconds));
}).AddStandardResilienceHandler();

builder.Services.AddScoped<EcoMutare.Services.Routing.IWeatherProvider>(sp =>
    sp.GetRequiredService<EcoMutare.Integrations.OpenMeteo.OpenMeteoClient>());
builder.Services.AddScoped<EcoMutare.Services.Routing.IElevationProvider>(sp =>
    sp.GetRequiredService<EcoMutare.Integrations.OpenMeteo.OpenMeteoClient>());

// HttpClient za OpenRouteService (foot-walking, cycling-regular, driving-car, wheelchair) s resilience politikom
builder.Services.AddHttpClient<EcoMutare.Services.Routing.IRoutingProvider, EcoMutare.Integrations.OpenRouteService.OpenRouteServiceClient>((sp, client) =>
{
    var opts = sp.GetRequiredService<Microsoft.Extensions.Options.IOptions<EcoMutare.Integrations.OpenRouteService.OpenRouteServiceOptions>>().Value;
    client.BaseAddress = new Uri(opts.BaseUrl);
    client.Timeout = TimeSpan.FromSeconds(Math.Max(2, opts.TimeoutSeconds));
}).AddStandardResilienceHandler();

// Pravila, Crowd Community Intelligence, Green Intelligence i glavni multimodalni planer ruta (sat 12-48)
builder.Services.Configure<EcoMutare.Services.Routing.RoutingOptions>(
    builder.Configuration.GetSection(EcoMutare.Services.Routing.RoutingOptions.SectionName));
builder.Services.AddSingleton<EcoMutare.Services.Routing.IRulesEngine, EcoMutare.Services.Routing.RulesEngine>();
builder.Services.AddSingleton<ICommunityIntelligenceService, CommunityIntelligenceService>();
builder.Services.AddSingleton<IGreenIntelligenceService, GreenIntelligenceService>();
builder.Services.AddScoped<EcoMutare.Services.Routing.MockRoutePlanner>();
builder.Services.AddScoped<EcoMutare.Services.Routing.IRoutePlanner, EcoMutare.Services.Routing.RoutePlanner>();

// JWT + Auth0 Dual autentikacija (podržava lokalni HS256 JWT za 5 demo računa i Auth0 RS256 OIDC tokene)
const string FallbackJwtKey = "EcoMutareTimisoaraUniHack2026SuperSecretJwtKeyMin32Bytes!";
var jwt = builder.Configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>() ?? new JwtOptions();
if (string.IsNullOrWhiteSpace(jwt.Key) || jwt.Key.Length < 32)
{
    jwt.Key = FallbackJwtKey;
}

builder.Services.Configure<JwtOptions>(opts =>
{
    builder.Configuration.GetSection(JwtOptions.SectionName).Bind(opts);
    if (string.IsNullOrWhiteSpace(opts.Key) || opts.Key.Length < 32)
    {
        opts.Key = FallbackJwtKey;
    }
});
builder.Services.Configure<Auth0Options>(builder.Configuration.GetSection(Auth0Options.SectionName));
builder.Services.AddScoped<JwtTokenService>();

var auth0 = builder.Configuration.GetSection(Auth0Options.SectionName).Get<Auth0Options>() ?? new Auth0Options();
var auth0Domain = (auth0.Domain ?? string.Empty).Replace("https://", "", StringComparison.OrdinalIgnoreCase).TrimEnd('/');
bool hasAuth0Domain = !string.IsNullOrWhiteSpace(auth0Domain);

var authBuilder = builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = hasAuth0Domain ? "DualJwt" : JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = hasAuth0Domain ? "DualJwt" : JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(JwtBearerDefaults.AuthenticationScheme, o =>
{
    o.MapInboundClaims = false; // zadržava "sub" claim kakav jest
    o.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidIssuer = jwt.Issuer,
        ValidateAudience = true,
        ValidAudience = jwt.Audience,
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Key)),
        ValidateLifetime = true,
        ClockSkew = TimeSpan.FromMinutes(1),
    };
});

if (hasAuth0Domain)
{
    authBuilder.AddJwtBearer("Auth0Jwt", o =>
    {
        o.Authority = $"https://{auth0Domain}/";
        o.Audience = string.IsNullOrWhiteSpace(auth0.Audience) ? "https://api.begreen.tm.ro" : auth0.Audience;
        o.MapInboundClaims = false;
        o.TokenValidationParameters = new TokenValidationParameters
        {
            NameClaimType = "sub",
            ClockSkew = TimeSpan.FromSeconds(30)
        };
        o.Events = new JwtBearerEvents
        {
            OnTokenValidated = async ctx =>
            {
                try
                {
                    var principal = ctx.Principal;
                    if (principal?.Identity is not ClaimsIdentity identity) return;

                    var sub = principal.FindFirst("sub")?.Value;
                    var email = principal.FindFirst("email")?.Value
                                ?? principal.FindFirst("https://begreen.tm.ro/email")?.Value;

                    if (string.IsNullOrWhiteSpace(email) && !string.IsNullOrWhiteSpace(sub))
                    {
                        var cleanSub = string.Concat(sub.Where(ch => char.IsLetterOrDigit(ch) || ch is '.' or '_' or '-'));
                        email = $"{cleanSub}@auth0.begreen.tm.ro".ToLowerInvariant();
                    }

                    if (!string.IsNullOrWhiteSpace(email))
                    {
                        var db = ctx.HttpContext.RequestServices.GetRequiredService<AppDbContext>();
                        var normalizedEmail = email.Trim().ToLowerInvariant();
                        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == normalizedEmail);
                        if (user is null)
                        {
                            user = new User
                            {
                                Email = normalizedEmail,
                                DisplayName = principal.FindFirst("name")?.Value ?? normalizedEmail.Split('@')[0],
                                PasswordHash = PasswordHelper.Hash($"Auth0::{sub ?? Guid.NewGuid().ToString("N")}"),
                                PointsBalance = 50
                            };
                            db.Users.Add(user);
                            await db.SaveChangesAsync();
                        }
                        identity.AddClaim(new Claim("ecomutare_uid", user.Id.ToString()));
                    }
                }
                catch
                {
                    // Ako MySQL trenutno nije dostupan, ne rušimo provjeru tokena
                }
            }
        };
    })
    .AddPolicyScheme("DualJwt", "Local HS256 or Auth0 RS256 JWT", o =>
    {
        o.ForwardDefaultSelector = ctx =>
        {
            var authHeader = ctx.Request.Headers.Authorization.FirstOrDefault();
            if (!string.IsNullOrWhiteSpace(authHeader) && authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            {
                var token = authHeader.Substring("Bearer ".Length).Trim();
                var handler = new JsonWebTokenHandler();
                if (handler.CanReadToken(token))
                {
                    var parsed = handler.ReadJsonWebToken(token);
                    if (parsed.Alg.Equals("RS256", StringComparison.OrdinalIgnoreCase) ||
                        (parsed.Issuer?.Contains(auth0Domain, StringComparison.OrdinalIgnoreCase) ?? false))
                    {
                        return "Auth0Jwt";
                    }
                }
            }
            return JwtBearerDefaults.AuthenticationScheme;
        };
    });
}

builder.Services.AddAuthorization();

// Swagger (UI + OpenAPI dokument na /swagger/v1/swagger.json + Authorize Bearer gumb)
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.CustomSchemaIds(t => t.FullName?.Replace("+", ".") ?? t.Name);
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "Unesite JWT token dobiven na POST /auth/login ili POST /auth/auth0 (ili izravni Auth0 Access Token).",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

// CORS: otvoreno za hackathon (web verzija i dashboard dolaze s drugih portova)
builder.Services.AddCors(options =>
{
    options.AddPolicy("Dev", policy => policy
        .AllowAnyOrigin()
        .AllowAnyMethod()
        .AllowAnyHeader());
});

// Postavke vanjskih servisa (options pattern)
builder.Services.Configure<EcoMutare.Integrations.OpenRouteService.OpenRouteServiceOptions>(
    builder.Configuration.GetSection(EcoMutare.Integrations.OpenRouteService.OpenRouteServiceOptions.SectionName));
builder.Services.Configure<EcoMutare.Integrations.OpenMeteo.OpenMeteoOptions>(
    builder.Configuration.GetSection(EcoMutare.Integrations.OpenMeteo.OpenMeteoOptions.SectionName));
builder.Services.Configure<EcoMutare.Integrations.Gemini.GeminiOptions>(
    builder.Configuration.GetSection(EcoMutare.Integrations.Gemini.GeminiOptions.SectionName));

var app = builder.Build();

// Automatska inicijalizacija i seed baze na serveru pri pokretanju (BE2 sat 38–48)
using (var scope = app.Services.CreateScope())
{
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    try
    {
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var insights = scope.ServiceProvider.GetRequiredService<IGreenIntelligenceService>();
        await DatabaseSeeder.SeedAllAsync(db, insights, logger);
        logger.LogInformation("MySQL baza uspješno spojena, verificirana i napunjena demo podacima.");
    }
    catch (Exception ex)
    {
        logger.LogWarning("Upozorenje: Spajanje/seed na MySQL bazu nije uspjelo ({Message}). API nastavlja raditi preko ugrađenog fallback spremnika.", ex.Message);
    }
}

if (string.IsNullOrWhiteSpace(app.Configuration["OpenRouteService:ApiKey"]))
{
    app.Logger.LogWarning("OpenRouteService:ApiKey nije postavljen. Koristi se pametni lokalni fallback za Timișoaru ili postavi ključ u User Secrets.");
}

// Swagger je uključen i u produkciji (dio demoa)
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    // Token za zaštićene endpointe: klikni Authorize u gornjem desnom kutu ili u konzoli preglednika:
    // localStorage.setItem('ecomutare_jwt', '<token>') i osvježi stranicu.
    c.UseRequestInterceptor("(req) => { var t = localStorage.getItem('ecomutare_jwt'); if (t && !req.headers['Authorization']) { req.headers['Authorization'] = 'Bearer ' + t; } return req; }");
});

// HTTPS redirect samo izvan developmenta (Expo Go ne vjeruje dev certifikatu)
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

// CORS mora biti prije UseAuthorization
app.UseCors("Dev");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
