namespace Operion.Api.Models;

// ----- API request/response DTOs (contract shared with simulator & VR) -----

public sealed class StartSessionRequest
{
    public string UserId { get; set; } = "";
    public string ScenarioId { get; set; } = "";
}

public sealed class StepView
{
    public int StepId { get; set; }
    public string Title { get; set; } = "";
    public string Phase { get; set; } = "";
    public string ExpectedEvent { get; set; } = "";
    public List<string> AllowedInstruments { get; set; } = new();
}

public sealed class StartSessionResponse
{
    public string SessionId { get; set; } = "";
    public string ScenarioName { get; set; } = "";
    public string ProcedureCode { get; set; } = "";
    public StepView? CurrentStep { get; set; }
    public int Score { get; set; }
    public string Status { get; set; } = "IN_PROGRESS";
}

public sealed class EventRequest
{
    public string EventId { get; set; } = Guid.NewGuid().ToString();
    public string EventType { get; set; } = "";
    public string? InstrumentCode { get; set; }
    public string? SutureCode { get; set; }
    public string? Target { get; set; }
    public Dictionary<string, int>? Counts { get; set; }
    public DateTime? Timestamp { get; set; }
}

public sealed class DeviationDto
{
    public string DeviationType { get; set; } = "";
    public string? Expected { get; set; }
    public string? Actual { get; set; }
    public string Severity { get; set; } = "MEDIUM";
}

public sealed class ValidationResponse
{
    public bool Success { get; set; }
    public int CurrentStepId { get; set; }
    public int? NextStepId { get; set; }
    public int Score { get; set; }
    public DeviationDto? Deviation { get; set; }
    public string Message { get; set; } = "";
    public bool AllowRetry { get; set; }
    public bool Completed { get; set; }
    public StepView? NextStep { get; set; }
    // Deterministik komplikasyon açıklaması (klinik tablodan); SignalR'a bağlı kalmadan anında döner.
    public AiFeedbackDto? Complication { get; set; }
}

public sealed class ReportResponse
{
    public int Score { get; set; }
    public int SuccessRate { get; set; }
    public int CorrectActions { get; set; }
    public int WrongActions { get; set; }
    public int SterileViolations { get; set; }
    public int HintsUsed { get; set; }
    public string Summary { get; set; } = "";
}

public sealed class AiFeedbackDto
{
    public string SessionId { get; set; } = "";
    public string EventId { get; set; } = "";
    public int StepId { get; set; }
    public string DeviationType { get; set; } = "";
    public string PossibleRisk { get; set; } = "";
    public string Explanation { get; set; } = "";
    public string RecommendedAction { get; set; } = "";
    public string Severity { get; set; } = "MEDIUM";
    public string Source { get; set; } = "table";
    public string? ModelName { get; set; }
    public int? PromptTokens { get; set; }
    public int? CompletionTokens { get; set; }
    public int? TotalTokens { get; set; }
}

public sealed class ScoreUpdateDto
{
    public string SessionId { get; set; } = "";
    public int Score { get; set; }
}
