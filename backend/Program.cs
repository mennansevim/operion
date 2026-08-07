using Microsoft.EntityFrameworkCore;
using Operion.Api.Data;
using Operion.Api.Hubs;
using Operion.Api.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddSignalR();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddHttpClient();

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy => policy
        .SetIsOriginAllowed(_ => true)
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials());
});

var provider = builder.Configuration["Database:Provider"] ?? "Postgres";
builder.Services.AddDbContext<OperionDbContext>(opt =>
{
    if (provider.Equals("InMemory", StringComparison.OrdinalIgnoreCase))
        opt.UseInMemoryDatabase("operion");
    else
        opt.UseNpgsql(builder.Configuration.GetConnectionString("Postgres"));
});

builder.Services.AddSingleton<ProcedureStore>();
builder.Services.AddScoped<ScoringService>();
builder.Services.AddScoped<ProcedureService>();
builder.Services.AddScoped<IAiFeedbackService, AiFeedbackService>();

var app = builder.Build();

// Load procedure/scenario/clinical files eagerly so failures surface at startup.
app.Services.GetRequiredService<ProcedureStore>();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<OperionDbContext>();
    db.Database.EnsureCreated();
}

app.UseSwagger();
app.UseSwaggerUI();
app.UseCors();

app.MapControllers();
app.MapHub<SimulationHub>("/hubs/simulation");
app.MapGet("/", () => Results.Ok(new { service = "Operion API", status = "ok" }));

app.Run();
