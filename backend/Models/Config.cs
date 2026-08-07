using System.Text.Json;
using System.Text.Json.Serialization;

namespace Operion.Api.Models;

// ----- Procedure definition (loaded from Procedures/open-appendectomy-v1.json) -----

public sealed class ProcedureDefinition
{
    public string ProcedureCode { get; set; } = "";
    public string Version { get; set; } = "";
    public string Role { get; set; } = "";
    public string Title { get; set; } = "";
    public int StartingScore { get; set; } = 100;
    public ScoreBounds ScoreBounds { get; set; } = new();
    public List<string> DeviationTypes { get; set; } = new();
    public List<ProcedureStep> Steps { get; set; } = new();
    public List<InstrumentItem> InstrumentCatalog { get; set; } = new();
    public List<SutureItem> SutureCatalog { get; set; } = new();
}

public sealed class ScoreBounds
{
    public int Min { get; set; } = 0;
    public int Max { get; set; } = 100;
}

public sealed class ProcedureStep
{
    public int StepId { get; set; }
    public List<int> SourceSteps { get; set; } = new();
    public string Phase { get; set; } = "";
    public string Title { get; set; } = "";
    public string ExpectedEvent { get; set; } = "";
    public string? Target { get; set; }
    public List<string> AllowedInstruments { get; set; } = new();
    public string? RequiredSuture { get; set; }
    public List<string>? CountTargets { get; set; }
    public Dictionary<string, int>? ExpectedCounts { get; set; }
    public int SuccessScore { get; set; }
    public Dictionary<string, int> Penalties { get; set; } = new();
    public string? ClinicalNote { get; set; }
    public int? NextStepId { get; set; }
}

public sealed class InstrumentItem
{
    public string Code { get; set; } = "";
    public string Name { get; set; } = "";
    public bool Sterile { get; set; }
}

public sealed class SutureItem
{
    public string Code { get; set; } = "";
    public string Name { get; set; } = "";
}

// ----- Scenarios (loaded from Procedures/scenarios.json) -----

public sealed class ScenariosFile
{
    public List<Scenario> Scenarios { get; set; } = new();
}

public sealed class Scenario
{
    public string ScenarioId { get; set; } = "";
    public string Name { get; set; } = "";
    public string Difficulty { get; set; } = "";
    public string ProcedureCode { get; set; } = "";
    public PatientProfile Patient { get; set; } = new();
    public List<string> EnabledErrors { get; set; } = new();
    public int StartingScore { get; set; } = 100;
    public string? Description { get; set; }
}

public sealed class PatientProfile
{
    public string BodyType { get; set; } = "NORMAL";
    public bool HasAdhesion { get; set; }
}

// ----- Clinical knowledge table (loaded from Procedures/clinical-knowledge.json) -----

public sealed class ClinicalKnowledgeFile
{
    public List<ClinicalKnowledgeEntry> Entries { get; set; } = new();
}

public sealed class ClinicalKnowledgeEntry
{
    // stepId may be an int or the wildcard string "*" in JSON.
    [JsonConverter(typeof(StringOrNumberConverter))]
    public string StepId { get; set; } = "*";
    public string DeviationType { get; set; } = "";
    public string PossibleRisk { get; set; } = "";
    public string Explanation { get; set; } = "";
    public string RecommendedAction { get; set; } = "";
    public string Severity { get; set; } = "MEDIUM";
    public string? Source { get; set; }
}

public sealed class StringOrNumberConverter : JsonConverter<string>
{
    public override string Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        => reader.TokenType == JsonTokenType.Number
            ? reader.GetInt32().ToString()
            : reader.GetString() ?? "*";

    public override void Write(Utf8JsonWriter writer, string value, JsonSerializerOptions options)
        => writer.WriteStringValue(value);
}
