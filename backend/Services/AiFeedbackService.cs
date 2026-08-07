using System.Text;
using System.Text.Json;
using Operion.Api.Models;

namespace Operion.Api.Services;

public sealed class AiFeedbackResult
{
    public int StepId { get; set; }
    public string DeviationType { get; set; } = "";
    public string PossibleRisk { get; set; } = "";
    public string Explanation { get; set; } = "";
    public string RecommendedAction { get; set; } = "";
    public string Severity { get; set; } = "MEDIUM";
    public string Source { get; set; } = "table";
    public string? ModelName { get; set; }
    public string? RequestJson { get; set; }
    public string? ResponseJson { get; set; }
}

public interface IAiFeedbackService
{
    Task<AiFeedbackResult?> GenerateAsync(int stepId, DeviationDto deviation, bool hasAdhesion, CancellationToken ct);
}

// Primary source is the expert-approved clinical knowledge table (traceable, no hallucination).
// If an OpenAI key is configured, the LLM only rephrases that grounded content into friendlier Turkish.
public sealed class AiFeedbackService : IAiFeedbackService
{
    private readonly ProcedureStore _store;
    private readonly IHttpClientFactory _httpFactory;
    private readonly IConfiguration _config;
    private readonly ILogger<AiFeedbackService> _logger;

    public AiFeedbackService(ProcedureStore store, IHttpClientFactory httpFactory,
        IConfiguration config, ILogger<AiFeedbackService> logger)
    {
        _store = store;
        _httpFactory = httpFactory;
        _config = config;
        _logger = logger;
    }

    public async Task<AiFeedbackResult?> GenerateAsync(int stepId, DeviationDto deviation, bool hasAdhesion, CancellationToken ct)
    {
        var entry = _store.GetClinicalEntry(stepId, deviation.DeviationType);

        var result = new AiFeedbackResult
        {
            StepId = stepId,
            DeviationType = deviation.DeviationType,
            PossibleRisk = entry?.PossibleRisk ?? "Prosedür kuralına aykırı bir işlem tespit edildi.",
            Explanation = entry?.Explanation ?? "Bu eylem kanonik prosedür sırasına veya alet uygunluğuna aykırıdır.",
            RecommendedAction = entry?.RecommendedAction ?? "Doğru adımı ve uygun aleti kontrol ederek işlemi tekrarlayın.",
            Severity = deviation.Severity,
            Source = "table",
            RequestJson = JsonSerializer.Serialize(new { stepId, deviation, hasAdhesion })
        };
        result.ResponseJson = JsonSerializer.Serialize(new { result.PossibleRisk, result.Explanation, result.RecommendedAction });

        var apiKey = _config["OpenAI:ApiKey"];
        if (string.IsNullOrWhiteSpace(apiKey)) apiKey = _config["OPENAI_API_KEY"];
        if (string.IsNullOrWhiteSpace(apiKey))
            return result;

        try
        {
            await RephraseWithLlm(result, apiKey, hasAdhesion, ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "LLM rephrase failed; falling back to clinical table content.");
        }

        return result;
    }

    private async Task RephraseWithLlm(AiFeedbackResult result, string apiKey, bool hasAdhesion, CancellationToken ct)
    {
        var model = _config["OpenAI:Model"] ?? _config["OPENAI_MODEL"] ?? "gpt-4o-mini";
        var system = "Sen ameliyathane scrub teknikeri eğitimi için bir cerrahi eğitmensin. Sana verilen doğrulanmış "
            + "klinik bulguyu (risk, açıklama, önerilen müdahale) kullanarak SADECE Türkçe, kısa ve pedagojik bir geri "
            + "bildirim yaz. Yeni tıbbi bilgi UYDURMA; yalnızca verilen içeriği yeniden ifade et. Yanıtı şu JSON şemasıyla "
            + "döndür: {\"possibleRisk\":string,\"explanation\":string,\"recommendedAction\":string}.";
        var user = JsonSerializer.Serialize(new
        {
            deviationType = result.DeviationType,
            hasAdhesion,
            possibleRisk = result.PossibleRisk,
            explanation = result.Explanation,
            recommendedAction = result.RecommendedAction
        });

        var body = new
        {
            model,
            messages = new object[]
            {
                new { role = "system", content = system },
                new { role = "user", content = user }
            },
            response_format = new { type = "json_object" },
            temperature = 0.3
        };

        var http = _httpFactory.CreateClient();
        using var req = new HttpRequestMessage(HttpMethod.Post, "https://api.openai.com/v1/chat/completions");
        req.Headers.Add("Authorization", $"Bearer {apiKey}");
        req.Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json");

        using var resp = await http.SendAsync(req, ct);
        resp.EnsureSuccessStatusCode();
        var raw = await resp.Content.ReadAsStringAsync(ct);

        using var doc = JsonDocument.Parse(raw);
        var content = doc.RootElement.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString();
        if (string.IsNullOrWhiteSpace(content)) return;

        using var parsed = JsonDocument.Parse(content);
        var root = parsed.RootElement;
        if (root.TryGetProperty("possibleRisk", out var r)) result.PossibleRisk = r.GetString() ?? result.PossibleRisk;
        if (root.TryGetProperty("explanation", out var e)) result.Explanation = e.GetString() ?? result.Explanation;
        if (root.TryGetProperty("recommendedAction", out var a)) result.RecommendedAction = a.GetString() ?? result.RecommendedAction;

        result.Source = "llm";
        result.ModelName = model;
        result.ResponseJson = content;
    }
}
