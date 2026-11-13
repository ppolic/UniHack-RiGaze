var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();

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

var app = builder.Build();

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
