var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers()
    .AddJsonOptions(o =>
    {
        // Enumi se šalju kao stringovi ("Bike"), ne kao brojevi; camelCase je zadani.
        o.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
    });

// Memory cache za ORS rute (1h), Open-Meteo vrijeme (30 min) i elevaciju (6h)
builder.Services.AddMemoryCache();

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

// Pravila i glavni multimodalni planer ruta (sat 12-24), uz MockRoutePlanner kao fallback iza Routing:UseMock
builder.Services.Configure<EcoMutare.Services.Routing.RoutingOptions>(
    builder.Configuration.GetSection(EcoMutare.Services.Routing.RoutingOptions.SectionName));
builder.Services.AddSingleton<EcoMutare.Services.Routing.IRulesEngine, EcoMutare.Services.Routing.RulesEngine>();
builder.Services.AddSingleton<EcoMutare.Services.Insights.IGreenIntelligenceService, EcoMutare.Services.Insights.GreenIntelligenceService>();
builder.Services.AddScoped<EcoMutare.Services.Routing.MockRoutePlanner>();
builder.Services.AddScoped<EcoMutare.Services.Routing.IRoutePlanner, EcoMutare.Services.Routing.RoutePlanner>();

// Swagger (UI + OpenAPI dokument na /swagger/v1/swagger.json)
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

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

if (string.IsNullOrWhiteSpace(app.Configuration["Gemini:ApiKey"]))
{
    app.Logger.LogWarning("Gemini:ApiKey nije postavljen. Koristi: dotnet user-secrets set \"Gemini:ApiKey\" \"<kljuc>\"");
}

// Upozorenje pri startu ako ORS ključ nije postavljen
if (string.IsNullOrWhiteSpace(app.Configuration["OpenRouteService:ApiKey"]))
{
    app.Logger.LogWarning("OpenRouteService:ApiKey nije postavljen. Koristi: dotnet user-secrets set \"OpenRouteService:ApiKey\" \"<kljuc>\"");
}

// Swagger je uključen i u produkciji (dio demoa)
app.UseSwagger();
app.UseSwaggerUI();

// HTTPS redirect samo izvan developmenta (Expo Go ne vjeruje dev certifikatu)
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

// CORS mora biti prije UseAuthorization
app.UseCors("Dev");

app.UseAuthorization();

app.MapControllers();

app.Run();
