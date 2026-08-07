using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Operion.Api.Data;
using Operion.Api.Hubs;
using Operion.Api.Models;
using Operion.Api.Services;

namespace Operion.Api.Controllers;

[ApiController]
[Route("api/sessions")]
public sealed class SessionController : ControllerBase
{
    private readonly OperionDbContext _db;
    private readonly ProcedureStore _store;
    private readonly ProcedureService _procedure;
    private readonly IHubContext<SimulationHub> _hub;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<SessionController> _logger;

    public SessionController(OperionDbContext db, ProcedureStore store, ProcedureService procedure,
        IHubContext<SimulationHub> hub, IServiceScopeFactory scopeFactory, ILogger<SessionController> logger)
    {
        _db = db;
        _store = store;
        _procedure = procedure;
        _hub = hub;
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    [HttpPost]
    public async Task<ActionResult<StartSessionResponse>> Start([FromBody] StartSessionRequest req)
    {
        var scenario = _store.GetScenario(req.ScenarioId);
        if (scenario is null)
            return NotFound(new { message = $"Senaryo bulunamadı: {req.ScenarioId}" });

        var first = _store.FirstStep();
        if (first is null)
            return StatusCode(500, new { message = "Prosedür adımı tanımlı değil." });

        var userId = string.IsNullOrWhiteSpace(req.UserId) ? Guid.NewGuid().ToString() : req.UserId;
        if (!await _db.Users.AnyAsync(u => u.Id == userId))
            _db.Users.Add(new User { Id = userId, Name = userId });

        var session = new SessionRecord
        {
            UserId = userId,
            ScenarioId = scenario.ScenarioId,
            ProcedureCode = scenario.ProcedureCode,
            CurrentStepId = first.StepId,
            Score = scenario.StartingScore,
            RawScore = scenario.StartingScore,
            Status = "IN_PROGRESS"
        };
        _db.Sessions.Add(session);
        await _db.SaveChangesAsync();

        return Ok(new StartSessionResponse
        {
            SessionId = session.Id,
            ScenarioName = scenario.Name,
            ProcedureCode = scenario.ProcedureCode,
            CurrentStep = ProcedureService.MapStep(first),
            Score = session.Score,
            Status = session.Status
        });
    }

    [HttpPost("{sessionId}/events")]
    public async Task<ActionResult<ValidationResponse>> PostEvent(string sessionId, [FromBody] EventRequest ev)
    {
        var session = await _db.Sessions.FindAsync(sessionId);
        if (session is null)
            return NotFound(new { message = "Seans bulunamadı." });
        if (session.Status != "IN_PROGRESS")
            return BadRequest(new { message = "Seans aktif değil." });

        // Idempotency: ignore a replayed event id and return current state.
        if (!string.IsNullOrEmpty(ev.EventId) &&
            await _db.SessionEvents.AnyAsync(e => e.SessionId == sessionId && e.EventId == ev.EventId))
        {
            return Ok(new ValidationResponse
            {
                Success = true,
                CurrentStepId = session.CurrentStepId ?? 0,
                NextStepId = session.CurrentStepId,
                Score = session.Score,
                Message = "Bu olay daha önce işlendi (yinelenen).",
                NextStep = ProcedureService.MapStep(_store.GetStep(session.CurrentStepId))
            });
        }

        _logger.LogInformation("VR→REST | session={SessionId} event={Type} instrument={Instrument} target={Target} suture={Suture}",
            sessionId, ev.EventType, ev.InstrumentCode ?? "-", ev.Target ?? "-", ev.SutureCode ?? "-");

        var outcome = _procedure.Validate(session, ev);

        _db.SessionEvents.Add(new SessionEventRecord
        {
            SessionId = sessionId,
            EventId = ev.EventId,
            EventType = ev.EventType,
            StepId = outcome.CurrentStepId,
            InstrumentCode = ev.InstrumentCode,
            IsSuccess = outcome.Success,
            DeviationType = outcome.Deviation?.DeviationType,
            ScoreChange = outcome.ScoreChange,
            PayloadJson = JsonSerializer.Serialize(ev)
        });
        var sessionEventId = _db.ChangeTracker.Entries<SessionEventRecord>().First().Entity.Id;

        if (outcome.Completed)
        {
            session.Status = "COMPLETED";
            session.CompletedAt = DateTime.UtcNow;
        }
        await _db.SaveChangesAsync();

        _logger.LogInformation("REST→VR | session={SessionId} step={Step} success={Success} deviation={Deviation} scoreChange={Change} score={Score}",
            sessionId, outcome.CurrentStepId, outcome.Success, outcome.Deviation?.DeviationType ?? "-", outcome.ScoreChange, session.Score);

        await _hub.Clients.Group(sessionId).SendAsync("ScoreUpdate",
            new ScoreUpdateDto { SessionId = sessionId, Score = session.Score });

        AiFeedbackDto? complication = null;
        if (outcome.Deviation is not null)
        {
            complication = BuildComplication(sessionId, ev.EventId, outcome.CurrentStepId, outcome.Deviation);
            var hasAdhesion = _store.GetScenario(session.ScenarioId)?.Patient.HasAdhesion ?? false;
            QueueAiFeedback(sessionId, sessionEventId, ev.EventId, outcome.CurrentStepId, outcome.Deviation, hasAdhesion);
        }

        return Ok(new ValidationResponse
        {
            Success = outcome.Success,
            CurrentStepId = outcome.CurrentStepId,
            NextStepId = outcome.NextStepId,
            Score = session.Score,
            Deviation = outcome.Deviation,
            Message = outcome.Message,
            AllowRetry = outcome.AllowRetry,
            Completed = outcome.Completed,
            NextStep = outcome.NextStep,
            Complication = complication
        });
    }

    [HttpPost("{sessionId}/complete")]
    public async Task<ActionResult<ReportResponse>> Complete(string sessionId)
    {
        var session = await _db.Sessions.FindAsync(sessionId);
        if (session is null)
            return NotFound(new { message = "Seans bulunamadı." });

        if (session.Status == "IN_PROGRESS")
        {
            session.Status = "COMPLETED";
            session.CompletedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
        }

        return Ok(new ReportResponse
        {
            Score = session.Score,
            SuccessRate = session.Score,
            CorrectActions = session.CorrectActions,
            WrongActions = session.WrongActions,
            SterileViolations = session.SterileViolations,
            HintsUsed = session.HintsUsed,
            Summary = BuildSummary(session)
        });
    }

    [HttpGet("{sessionId}")]
    public async Task<ActionResult<StartSessionResponse>> Get(string sessionId)
    {
        var session = await _db.Sessions.FindAsync(sessionId);
        if (session is null)
            return NotFound(new { message = "Seans bulunamadı." });

        var scenario = _store.GetScenario(session.ScenarioId);
        return Ok(new StartSessionResponse
        {
            SessionId = session.Id,
            ScenarioName = scenario?.Name ?? session.ScenarioId,
            ProcedureCode = session.ProcedureCode,
            CurrentStep = ProcedureService.MapStep(_store.GetStep(session.CurrentStepId)),
            Score = session.Score,
            Status = session.Status
        });
    }

    [HttpGet("{sessionId}/events")]
    public async Task<ActionResult> GetEvents(string sessionId)
    {
        var events = await _db.SessionEvents
            .Where(e => e.SessionId == sessionId)
            .OrderBy(e => e.CreatedAt)
            .Select(e => new
            {
                e.EventId, e.EventType, e.StepId, e.InstrumentCode,
                e.IsSuccess, e.DeviationType, e.ScoreChange, e.CreatedAt, e.PayloadJson
            })
            .ToListAsync();
        return Ok(events);
    }

    [HttpGet("{sessionId}/feedbacks")]
    public async Task<ActionResult> GetFeedbacks(string sessionId)
    {
        var feedbacks = await _db.AiFeedbacks
            .Where(f => f.SessionId == sessionId)
            .OrderBy(f => f.CreatedAt)
            .Select(f => new
            {
                f.StepId, f.DeviationType, f.PossibleRisk, f.Explanation,
                f.RecommendedAction, f.Severity, f.Source, f.ModelName, f.CreatedAt
            })
            .ToListAsync();
        return Ok(feedbacks);
    }

    private AiFeedbackDto BuildComplication(string sessionId, string eventId, int stepId, DeviationDto dev)
    {
        var e = _store.GetClinicalEntry(stepId, dev.DeviationType);
        return new AiFeedbackDto
        {
            SessionId = sessionId,
            EventId = eventId,
            StepId = stepId,
            DeviationType = dev.DeviationType,
            PossibleRisk = e?.PossibleRisk ?? "Prosedür kuralına aykırı bir işlem tespit edildi.",
            Explanation = e?.Explanation ?? "Bu eylem kanonik prosedür sırasına veya alet uygunluğuna aykırıdır.",
            RecommendedAction = e?.RecommendedAction ?? "Doğru adımı ve uygun aleti kontrol ederek işlemi tekrarlayın.",
            Severity = dev.Severity,
            Source = "table"
        };
    }

    private static string BuildSummary(SessionRecord s)
    {
        var verdict = s.Score >= 85
            ? "Genel performans başarılı."
            : s.Score >= 60
                ? "Performans yeterli; gelişime açık alanlar mevcut."
                : "Performans yetersiz; prosedür sırası ve alet seçimi tekrar çalışılmalıdır.";
        return $"Kullanıcı {s.CorrectActions} doğru, {s.WrongActions} hatalı aksiyon gerçekleştirdi. " +
               $"Steril alan ihlali: {s.SterileViolations}, kullanılan ipucu: {s.HintsUsed}. {verdict}";
    }

    private void QueueAiFeedback(string sessionId, string sessionEventId, string eventId,
        int stepId, DeviationDto deviation, bool hasAdhesion)
    {
        _ = Task.Run(async () =>
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var ai = scope.ServiceProvider.GetRequiredService<IAiFeedbackService>();
                var db = scope.ServiceProvider.GetRequiredService<OperionDbContext>();
                var hub = scope.ServiceProvider.GetRequiredService<IHubContext<SimulationHub>>();

                var result = await ai.GenerateAsync(stepId, deviation, hasAdhesion, CancellationToken.None);
                if (result is null) return;

                db.AiFeedbacks.Add(new AiFeedbackRecord
                {
                    SessionId = sessionId,
                    SessionEventId = sessionEventId,
                    StepId = stepId,
                    DeviationType = result.DeviationType,
                    PossibleRisk = result.PossibleRisk,
                    Explanation = result.Explanation,
                    RecommendedAction = result.RecommendedAction,
                    Severity = result.Severity,
                    Source = result.Source,
                    ModelName = result.ModelName,
                    RequestJson = result.RequestJson,
                    ResponseJson = result.ResponseJson
                });
                await db.SaveChangesAsync();

                // Deterministik komplikasyon zaten REST yanıtında döndü; SignalR'ı yalnızca LLM zenginleştirmesi için kullan.
                if (result.Source != "llm") return;

                await hub.Clients.Group(sessionId).SendAsync("AiFeedback", new AiFeedbackDto
                {
                    SessionId = sessionId,
                    EventId = eventId,
                    StepId = stepId,
                    DeviationType = result.DeviationType,
                    PossibleRisk = result.PossibleRisk,
                    Explanation = result.Explanation,
                    RecommendedAction = result.RecommendedAction,
                    Severity = result.Severity,
                    Source = result.Source
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "AI feedback background task failed for session {SessionId}.", sessionId);
            }
        });
    }
}
