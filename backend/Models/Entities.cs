using System.ComponentModel.DataAnnotations;

namespace Operion.Api.Models;

// ----- Persisted entities -----

public sealed class User
{
    [Key] public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Name { get; set; } = "";
    public string? Email { get; set; }
}

public sealed class SessionRecord
{
    [Key] public string Id { get; set; } = Guid.NewGuid().ToString();
    public string UserId { get; set; } = "";
    public string ScenarioId { get; set; } = "";
    public string ProcedureCode { get; set; } = "";
    public int? CurrentStepId { get; set; }
    public int Score { get; set; }
    public int RawScore { get; set; }
    public string Status { get; set; } = "IN_PROGRESS"; // IN_PROGRESS | COMPLETED | ABORTED
    public int CorrectActions { get; set; }
    public int WrongActions { get; set; }
    public int SterileViolations { get; set; }
    public int HintsUsed { get; set; }
    public int ConsecutiveErrors { get; set; }
    public DateTime StartedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }
}

public sealed class SessionEventRecord
{
    [Key] public string Id { get; set; } = Guid.NewGuid().ToString();
    public string SessionId { get; set; } = "";
    public string EventId { get; set; } = "";
    public string EventType { get; set; } = "";
    public int StepId { get; set; }
    public string? InstrumentCode { get; set; }
    public bool IsSuccess { get; set; }
    public string? DeviationType { get; set; }
    public int ScoreChange { get; set; }
    public string? PayloadJson { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public sealed class AiFeedbackRecord
{
    [Key] public string Id { get; set; } = Guid.NewGuid().ToString();
    public string SessionId { get; set; } = "";
    public string? SessionEventId { get; set; }
    public int StepId { get; set; }
    public string? DeviationType { get; set; }
    public string PossibleRisk { get; set; } = "";
    public string Explanation { get; set; } = "";
    public string RecommendedAction { get; set; } = "";
    public string Severity { get; set; } = "MEDIUM";
    public string Source { get; set; } = "table";
    public string? ModelName { get; set; }
    public int? PromptTokens { get; set; }
    public int? CompletionTokens { get; set; }
    public int? TotalTokens { get; set; }
    public string? RequestJson { get; set; }
    public string? ResponseJson { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
