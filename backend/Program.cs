using Microsoft.AspNetCore.HttpLogging;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Operion.Api.Data;
using Operion.Api.Hubs;
using Operion.Api.Services;

// .env dosyasındaki anahtarları (ör. OPENAI_API_KEY) ortam değişkenine yükle.
LoadDotEnv();

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddSignalR();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddHttpClient();

// Tüm REST trafiğini (yol + gövde) konsola yazarak VR↔backend iletişimini görünür kılar.
builder.Services.AddHttpLogging(o =>
{
    o.LoggingFields = HttpLoggingFields.RequestMethod | HttpLoggingFields.RequestPath
        | HttpLoggingFields.RequestBody | HttpLoggingFields.ResponseStatusCode | HttpLoggingFields.ResponseBody;
    o.RequestBodyLogLimit = 8192;
    o.ResponseBodyLogLimit = 8192;
    o.MediaTypeOptions.AddText("application/json");
});

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

app.UseHttpLogging();
app.UseSwagger();
app.UseSwaggerUI();
app.UseCors();

var simulatorPath = Path.GetFullPath(Path.Combine(app.Environment.ContentRootPath, "..", "simulator"));
if (Directory.Exists(simulatorPath))
{
    var fp = new PhysicalFileProvider(simulatorPath);
    app.UseDefaultFiles(new DefaultFilesOptions
    {
        FileProvider = fp,
        RequestPath = "/sim"
    });
    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = fp,
        RequestPath = "/sim"
    });
}

app.MapControllers();
app.MapHub<SimulationHub>("/hubs/simulation");
app.MapGet("/", () => Results.Ok(new { service = "Operion API", status = "ok" }));

app.Run();

static void LoadDotEnv()
{
    var candidates = new[]
    {
        Path.Combine(Directory.GetCurrentDirectory(), ".env"),
        Path.Combine(AppContext.BaseDirectory, ".env"),
    };
    foreach (var path in candidates)
    {
        if (!File.Exists(path)) continue;
        foreach (var raw in File.ReadAllLines(path))
        {
            var line = raw.Trim();
            if (line.Length == 0 || line.StartsWith('#')) continue;
            var idx = line.IndexOf('=');
            if (idx <= 0) continue;
            var key = line[..idx].Trim();
            var val = line[(idx + 1)..].Trim().Trim('"');
            if (string.IsNullOrEmpty(Environment.GetEnvironmentVariable(key)))
                Environment.SetEnvironmentVariable(key, val);
        }
        return;
    }
}
