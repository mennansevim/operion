using Operion.Api.Models;

namespace Operion.Api.Services;

public sealed class ValidationOutcome
{
    public bool Success { get; set; }
    public int CurrentStepId { get; set; }
    public int? NextStepId { get; set; }
    public DeviationDto? Deviation { get; set; }
    public string Message { get; set; } = "";
    public bool AllowRetry { get; set; }
    public bool Completed { get; set; }
    public int ScoreChange { get; set; }
    public StepView? NextStep { get; set; }
}

// Deterministic, fully explainable procedure validation. This is the safety-critical layer:
// it decides whether an action is correct; the LLM only explains deviations it flags.
public sealed class ProcedureService
{
    private readonly ProcedureStore _store;
    private readonly ScoringService _scoring;

    public ProcedureService(ProcedureStore store, ScoringService scoring)
    {
        _store = store;
        _scoring = scoring;
    }

    public ValidationOutcome Validate(SessionRecord session, EventRequest ev)
    {
        var step = _store.GetStep(session.CurrentStepId);
        if (step is null)
        {
            return new ValidationOutcome
            {
                Success = false,
                CurrentStepId = session.CurrentStepId ?? 0,
                Message = "Seans tamamlanmış veya geçerli bir adım bulunamadı.",
                Completed = true
            };
        }

        // Hint request: neutral guidance with a small penalty, stays on the same step.
        if (ev.EventType == "hint_requested")
        {
            session.HintsUsed++;
            _scoring.Apply(session, -2);
            var expected = step.RequiredSuture ?? string.Join(" / ", step.AllowedInstruments);
            return new ValidationOutcome
            {
                Success = false,
                CurrentStepId = step.StepId,
                NextStepId = step.StepId,
                Message = $"İpucu: {step.Title}. Beklenen: {expected}",
                AllowRetry = true,
                ScoreChange = -2
            };
        }

        // Always-deviations, independent of the expected event.
        if (ev.EventType == "sterile_area_violated")
        {
            session.SterileViolations++;
            return Deviate(session, step, "STERILE_VIOLATION", null, null, "Steril alan ihlali algılandı.");
        }
        if (ev.EventType == "instrument_dropped")
        {
            return Deviate(session, step, "INSTRUMENT_DROPPED", null, ev.InstrumentCode, "Alet düşürüldü; sterilite kaybı.");
        }

        // Wrong action type for the current step.
        if (ev.EventType != step.ExpectedEvent)
        {
            return Deviate(session, step, "WRONG_ORDER", step.ExpectedEvent, ev.EventType,
                $"Bu adımda beklenen işlem: {step.ExpectedEvent}.");
        }

        // Event type matches expectation; validate the details.
        switch (step.ExpectedEvent)
        {
            case "count_confirmed":
                if (step.ExpectedCounts is { Count: > 0 } expected && !CountsMatch(expected, ev.Counts))
                {
                    return Deviate(session, step, "COUNT_MISMATCH", Format(expected), Format(ev.Counts),
                        "Sayım uyuşmazlığı; kapanış öncesi tekrar sayım yapılmalıdır.");
                }
                break;

            case "instrument_delivered":
            case "instrument_placed":
                if (string.IsNullOrEmpty(ev.InstrumentCode) || !step.AllowedInstruments.Contains(ev.InstrumentCode))
                {
                    return Deviate(session, step, "WRONG_INSTRUMENT",
                        string.Join(" / ", step.AllowedInstruments), ev.InstrumentCode,
                        "Bu aşamada uygun olmayan bir alet kullanıldı.");
                }
                if (step.RequiredSuture is not null && ev.SutureCode != step.RequiredSuture)
                {
                    return Deviate(session, step, "WRONG_INSTRUMENT", step.RequiredSuture, ev.SutureCode,
                        "Bu aşamada yanlış sütür seçildi.");
                }
                if (step.Target is not null && !string.IsNullOrEmpty(ev.Target) && ev.Target != step.Target)
                {
                    var type = step.Penalties.ContainsKey("CONTAMINATED_TOOL_REUSE")
                        ? "CONTAMINATED_TOOL_REUSE" : "WRONG_ORDER";
                    return Deviate(session, step, type, step.Target, ev.Target,
                        "Alet yanlış alana yönlendirildi.");
                }
                break;
        }

        // Correct action.
        _scoring.Apply(session, step.SuccessScore);
        session.CorrectActions++;
        session.CurrentStepId = step.NextStepId;
        var completed = step.NextStepId is null;

        return new ValidationOutcome
        {
            Success = true,
            CurrentStepId = step.StepId,
            NextStepId = step.NextStepId,
            Message = completed ? "Prosedür tamamlandı." : "Doğru işlem.",
            AllowRetry = false,
            Completed = completed,
            ScoreChange = step.SuccessScore,
            NextStep = MapStep(_store.GetStep(step.NextStepId))
        };
    }

    private ValidationOutcome Deviate(SessionRecord session, ProcedureStep step, string type,
        string? expected, string? actual, string message)
    {
        session.WrongActions++;
        var penalty = step.Penalties.TryGetValue(type, out var p) ? p : DefaultPenalty(type);
        _scoring.Apply(session, -penalty);
        var severity = _store.GetClinicalEntry(step.StepId, type)?.Severity ?? "MEDIUM";

        return new ValidationOutcome
        {
            Success = false,
            CurrentStepId = step.StepId,
            NextStepId = step.StepId,
            Deviation = new DeviationDto { DeviationType = type, Expected = expected, Actual = actual, Severity = severity },
            Message = message,
            AllowRetry = true,
            ScoreChange = -penalty
        };
    }

    private static bool CountsMatch(Dictionary<string, int> expected, Dictionary<string, int>? actual)
    {
        if (actual is null) return false;
        return expected.All(kv => actual.TryGetValue(kv.Key, out var v) && v == kv.Value);
    }

    private static string Format(Dictionary<string, int>? counts)
        => counts is null ? "-" : string.Join(", ", counts.Select(kv => $"{kv.Key}:{kv.Value}"));

    private static int DefaultPenalty(string type) => type switch
    {
        "STERILE_VIOLATION" => 15,
        "COUNT_MISMATCH" => 20,
        "INSTRUMENT_DROPPED" => 10,
        "CONTAMINATED_TOOL_REUSE" => 12,
        "WRONG_INSTRUMENT" => 8,
        "WRONG_ORDER" => 5,
        _ => 5
    };

    public static StepView? MapStep(ProcedureStep? step) => step is null ? null : new StepView
    {
        StepId = step.StepId,
        Title = step.Title,
        Phase = step.Phase,
        ExpectedEvent = step.ExpectedEvent,
        AllowedInstruments = step.AllowedInstruments
    };
}
