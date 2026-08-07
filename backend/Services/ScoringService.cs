using Operion.Api.Models;

namespace Operion.Api.Services;

// Applies score changes within the procedure's bounds. Deterministic; the LLM never touches the score.
public sealed class ScoringService
{
    private readonly ProcedureStore _store;

    public ScoringService(ProcedureStore store) => _store = store;

    public void Apply(SessionRecord session, int change)
    {
        var bounds = _store.Procedure.ScoreBounds;
        session.RawScore += change;
        session.Score = Math.Clamp(session.RawScore, bounds.Min, bounds.Max);
    }
}
