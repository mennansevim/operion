// Operion — Ameliyathane simülasyonu (web).
// Unity/VR olmadan tüm eğitim döngüsünü görsel olarak test etmek için event üretir.

// ---- Alet kataloğu (open-appendectomy-v1.json ile birebir + görsel ikonlar) ----
const INSTRUMENT_CATALOG = [
  { code: "SCALPEL_NO_15", name: "No:15 Bistüri", icon: "🔪" },
  { code: "SCALPEL_NO_15_USED", name: "Kirli No:15 Bistüri", icon: "🩸" },
  { code: "MONOPOLAR_CAUTERY", name: "Monopolar Koter", icon: "⚡" },
  { code: "MAYO_SCISSORS", name: "Mayo Makası", icon: "✂️" },
  { code: "METZENBAUM_SCISSORS", name: "Metzenbaum Makası", icon: "✂️" },
  { code: "STILLE_FORCEPS", name: "Stille Penset", icon: "🥢" },
  { code: "DEBAKEY_FORCEPS", name: "DeBakey Penset", icon: "🥢" },
  { code: "FARABEUF_RETRACTOR", name: "Farabeuf Ekartör", icon: "🪝" },
  { code: "ROUX_RETRACTOR", name: "Roux Ekartör", icon: "🪝" },
  { code: "LANGENBECK_RETRACTOR", name: "Langenbeck Ekartör", icon: "🪝" },
  { code: "BABCOCK_ATRAUMATIC", name: "Atravmatik Babcock", icon: "🗜️" },
  { code: "MOSQUITO_CLAMP", name: "Mosquito Klemp", icon: "🗜️" },
  { code: "PEAN_CLAMP", name: "Pean Klemp", icon: "🗜️" },
  { code: "STRAIGHT_CLAMP_ATRAUMATIC", name: "Düz İşaret Pensi", icon: "📎" },
  { code: "NEEDLE_HOLDER", name: "Portegü", icon: "🪡" },
  { code: "FOERSTER_CLAMP", name: "Foerster Klemp", icon: "🗜️" },
];

const SUTURE_CATALOG = [
  { code: "SILK_3_0", name: "3/0 İpek" },
  { code: "VICRYL_2_0", name: "2/0 Vicryl" },
  { code: "VICRYL_1_0", name: "0/1 Vicryl" },
  { code: "PROLENE_0", name: "0 Prolen" },
  { code: "POLYAMIDE_4_0", name: "4/0 Polyamid" },
];

// ---- 18 adımlık prosedür (kontrol listesi + görev rehberi için) ----
const STEPS = [
  { id: 1, phase: "Giriş", title: "Cilt insizyonu", instruction: "Cerraha No:15 bistüriyi teslim edin.", event: "instrument_delivered", target: "SURGEON", allowed: ["SCALPEL_NO_15"] },
  { id: 2, phase: "Giriş", title: "Cilt altı/fasya diseksiyonu", instruction: "Cerraha monopolar koter kalemini teslim edin.", event: "instrument_delivered", target: "SURGEON", allowed: ["MONOPOLAR_CAUTERY"] },
  { id: 3, phase: "Giriş", title: "Kas künt diseksiyonu", instruction: "Cerraha mayo makasını teslim edin.", event: "instrument_delivered", target: "SURGEON", allowed: ["MAYO_SCISSORS"] },
  { id: 4, phase: "Giriş", title: "Periton açılması", instruction: "Cerraha stille (veya DeBakey) pensetini teslim edin.", event: "instrument_delivered", target: "SURGEON", allowed: ["STILLE_FORCEPS", "DEBAKEY_FORCEPS"] },
  { id: 5, phase: "Ekartasyon", title: "Ekartör yerleştirme", instruction: "Cerraha uygun ekartörü (Farabeuf/Roux/Langenbeck) teslim edin.", event: "instrument_delivered", target: "SURGEON", allowed: ["FARABEUF_RETRACTOR", "ROUX_RETRACTOR", "LANGENBECK_RETRACTOR"] },
  { id: 6, phase: "Çekum", title: "Çekumun tutulması", instruction: "Cerraha atravmatik Babcock'ı teslim edin.", event: "instrument_delivered", target: "SURGEON", allowed: ["BABCOCK_ATRAUMATIC"] },
  { id: 7, phase: "Appendiks", title: "Appendiks ucunun tutulması", instruction: "Cerraha Babcock'ı teslim edin (appendiks ucu).", event: "instrument_delivered", target: "SURGEON", allowed: ["BABCOCK_ATRAUMATIC"] },
  { id: 8, phase: "Mezoappendiks", title: "Mezoappendiks bağlanması", instruction: "Mosquito/Pean klemp veya portegüyü teslim edin.", event: "instrument_delivered", target: "SURGEON", allowed: ["MOSQUITO_CLAMP", "PEAN_CLAMP", "NEEDLE_HOLDER"] },
  { id: 9, phase: "Kök hazırlık", title: "Purse-string sütürü", instruction: "Portegüye 3/0 ipek takıp cerraha teslim edin.", event: "instrument_delivered", target: "SURGEON", allowed: ["NEEDLE_HOLDER"], suture: "SILK_3_0" },
  { id: 10, phase: "Kök bağlama", title: "Kök bağlama", instruction: "Portegüye 2/0 Vicryl takıp cerraha teslim edin.", event: "instrument_delivered", target: "SURGEON", allowed: ["NEEDLE_HOLDER"], suture: "VICRYL_2_0" },
  { id: 11, phase: "İşaret pensi", title: "İşaret pensi", instruction: "Cerraha düz dişsiz işaret pensini teslim edin.", event: "instrument_delivered", target: "SURGEON", allowed: ["STRAIGHT_CLAMP_ATRAUMATIC"] },
  { id: 12, phase: "Kesim", title: "Appendiks kesimi", instruction: "Cerraha No:15 bistüriyi teslim edin (appendiks kesimi).", event: "instrument_delivered", target: "SURGEON", allowed: ["SCALPEL_NO_15"] },
  { id: 13, phase: "Temizlik", title: "Kirli bistüri ucunu değiştir", instruction: "Kirlenmiş bistüri ucunu KİRLİ ALANA bırakın.", event: "instrument_placed", target: "DIRTY_AREA", allowed: ["SCALPEL_NO_15_USED"] },
  { id: 14, phase: "Spesimen", title: "Spesimeni gönder", instruction: "Spesimeni (Babcock) PATOLOJİ KABINA bırakın.", event: "instrument_placed", target: "PATHOLOGY_CONTAINER", allowed: ["BABCOCK_ATRAUMATIC"] },
  { id: 15, phase: "Sayım", title: "Kapanış öncesi sayım", instruction: "Kompres/alet/iğne sayımını yapıp onaylayın.", event: "count_confirmed", counts: { COMPRESS: 10, INSTRUMENT: 20, NEEDLE: 3 } },
  { id: 16, phase: "Periton kapatma", title: "Periton kapatma", instruction: "Portegüye 0/1 Vicryl takıp cerraha teslim edin.", event: "instrument_delivered", target: "SURGEON", allowed: ["NEEDLE_HOLDER"], suture: "VICRYL_1_0" },
  { id: 17, phase: "Fasya kapatma", title: "Fasya kapatma", instruction: "Portegüye 0 Prolen takıp cerraha teslim edin.", event: "instrument_delivered", target: "SURGEON", allowed: ["NEEDLE_HOLDER"], suture: "PROLENE_0" },
  { id: 18, phase: "Cilt kapatma", title: "Cilt kapatma & pansuman", instruction: "Portegüye 4/0 Polyamid takıp cerraha teslim edin.", event: "instrument_delivered", target: "SURGEON", allowed: ["NEEDLE_HOLDER"], suture: "POLYAMIDE_4_0" },
];
const TOTAL_STEPS = STEPS.length;
const stepMeta = (id) => STEPS.find((s) => s.id === id);

const ZONE_MAP = {
  SURGEON: { eventType: "instrument_delivered", target: "SURGEON" },
  DIRTY_AREA: { eventType: "instrument_placed", target: "DIRTY_AREA" },
  PATHOLOGY_CONTAINER: { eventType: "instrument_placed", target: "PATHOLOGY_CONTAINER" },
};

// ---- Durum ----
const state = {
  sessionId: null,
  currentStep: null,
  connection: null,
  holding: null,
  counters: { correct: 0, wrong: 0, sterile: 0, hint: 0 },
  timeline: [],
};
let trafficCount = 0;

const monitor = {
  stress: 0,
  heartRate: 76,
  pulseRate: 74,
  respRate: 14,
  targetHeartRate: 76,
  targetPulseRate: 74,
  targetRespRate: 14,
  breathPhase: 0,
  wavePhase: 0,
  lastTick: 0,
  timerId: null,
  currentRiskScore: 0,
  currentStreak: 0,
  audioEnabled: true,
  audioReady: false,
  audioCtx: null,
  noiseSource: null,
  noiseGain: null,
};

// ---- DOM kısayolları ----
const $ = (id) => document.getElementById(id);
const els = {
  baseUrl: $("baseUrl"), scenario: $("scenario"), userId: $("userId"),
  startBtn: $("startBtn"), endBtn: $("endBtn"), helpBtn: $("helpBtn"),
  scoreValue: $("scoreValue"), progressBar: $("progressBar"), progressLabel: $("progressLabel"), connState: $("connState"),
  toast: $("toast"),
  taskCard: $("taskCard"), verdictBanner: $("verdictBanner"),
  cntCorrect: $("cntCorrect"), cntWrong: $("cntWrong"), cntSterile: $("cntSterile"), cntHint: $("cntHint"),
  compBoard: $("compBoard"),
  hrValue: $("hrValue"), pulseValue: $("pulseValue"), respValue: $("respValue"), riskValue: $("riskValue"),
  monitorState: $("monitorState"), vitalWave: $("vitalWave"), audioToggle: $("audioToggle"),
  aiCard: $("aiCard"),
  handHolding: $("handHolding"), sutureWrap: $("sutureWrap"), sutureSelect: $("sutureSelect"),
  autoBtn: $("autoBtn"), releaseBtn: $("releaseBtn"),
  countMode: $("countMode"), countSendBtn: $("countSendBtn"),
  cntCompress: $("cntCompress"), cntInstrument: $("cntInstrument"), cntNeedle: $("cntNeedle"),
  trayWrap: $("trayWrap"), instrumentGrid: $("instrumentGrid"),
  stepList: $("stepList"),
  log: $("log"), logToggle: $("logToggle"), clearLogBtn: $("clearLogBtn"),
  traffic: $("traffic"), trafficCount: $("trafficCount"), trafficClear: $("trafficClear"), trafficToggle: $("trafficToggle"),
  reportModal: $("reportModal"), reportBody: $("reportBody"), closeReportBtn: $("closeReportBtn"),
  reportUser: $("reportUser"), reportChart: $("reportChart"), reportChartLegend: $("reportChartLegend"), reportFlow: $("reportFlow"),
  helpModal: $("helpModal"), closeHelpBtn: $("closeHelpBtn"),
};

// ---- Yardımcılar ----
const baseUrl = () => els.baseUrl.value.replace(/\/+$/, "");
const nowIso = () => new Date().toISOString();
const timeLabel = () => new Date().toLocaleTimeString("tr-TR");
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function escapeHtml(v) {
  return String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function toast(kind, msg) {
  els.toast.textContent = msg;
  els.toast.className = `toast toast-${kind}`;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => els.toast.classList.add("hidden"), 2600);
}

// Alt konsol: her isteği KAYNAĞINI vurgulayarak listeler.
function traffic(kind, source, srcClass, dir, label, detail, minor = "") {
  const row = document.createElement("div");
  row.className = `tr-row tr-${kind}`;
  const cell = (cls, txt) => { const s = document.createElement("span"); s.className = cls; s.textContent = txt; return s; };
  row.append(
    cell("tr-time", timeLabel()),
    cell(`src ${srcClass}`, source),
    cell("tr-dir", dir),
    cell("tr-label", label),
    cell("tr-detail", detail || ""),
    cell("tr-minor", minor || "")
  );
  els.traffic.appendChild(row);
  els.traffic.scrollTop = els.traffic.scrollHeight;
  trafficCount++;
  els.trafficCount.textContent = `${trafficCount} istek`;
}

function briefReq(body) {
  if (!body) return "";
  if (body.eventType) {
    let s = body.eventType;
    if (body.instrumentCode) s += ` · ${body.instrumentCode}`;
    if (body.target) s += ` → ${body.target}`;
    if (body.sutureCode) s += ` · ${body.sutureCode}`;
    if (body.counts) s += ` · ${JSON.stringify(body.counts)}`;
    return s;
  }
  if (body.scenarioId) return `scenario=${body.scenarioId}`;
  return "";
}

function briefRes(data) {
  if (!data) return "";
  if (data.deviation) return `SAPMA ${data.deviation.deviationType} · skor=${data.score}`;
  if (data.completed) return `TAMAMLANDI · skor=${data.score}`;
  if (typeof data.score === "number" && data.currentStep) return `seans · adım ${data.currentStep.stepId} · skor=${data.score}`;
  if (typeof data.score === "number") return `OK · skor=${data.score}`;
  return "OK";
}

function log(kind, tag, content) {
  const entry = document.createElement("div");
  entry.className = `log-entry log-${kind}`;
  const head = document.createElement("div");
  head.className = "le-head";
  head.innerHTML = `<span class="le-tag">${tag}</span><span class="le-time">${timeLabel()}</span>`;
  entry.appendChild(head);
  if (content) {
    const pre = document.createElement("pre");
    pre.textContent = typeof content === "string" ? content : JSON.stringify(content, null, 2);
    entry.appendChild(pre);
  }
  els.log.appendChild(entry);
  els.log.scrollTop = els.log.scrollHeight;
}

// ---- Backend çağrıları ----
async function postJson(path, body) {
  traffic("req", "VR·SİM", "src-sim", "→", `POST ${path}`, briefReq(body));
  const res = await fetch(`${baseUrl()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (res.ok) traffic("res", "BACKEND", "src-backend", "←", `${res.status} ${path}`, briefRes(data));
  else traffic("err", "HATA", "src-err", "←", `${res.status} ${path}`, JSON.stringify(data));
  if (!res.ok) { const e = new Error(`HTTP ${res.status}`); e.data = data; throw e; }
  return data;
}

async function getJson(path) {
  traffic("req", "VR·SİM", "src-sim", "→", `GET ${path}`, "");
  const res = await fetch(`${baseUrl()}${path}`);
  const data = await res.json();
  traffic("res", "BACKEND", "src-backend", "←", `${res.status} ${path}`,
    Array.isArray(data) ? `${data.length} kayıt` : "");
  return data;
}

// ---- Seans yaşam döngüsü ----
async function startSession() {
  const body = { userId: els.userId.value.trim() || "u1", scenarioId: els.scenario.value };
  resetCounters();
  log("info", "→ Seans Başlat", body);
  try {
    const data = await postJson("/api/sessions", body);
    state.sessionId = data.sessionId;
    setScore(data.score);
    setStep(data.currentStep);
    els.startBtn.disabled = true;
    els.endBtn.disabled = false;
    setVerdict("idle", `Seans başladı — ${data.scenarioName}`);
    toast("info", "Seans başladı. İlk görevinizi yapın.");
    log("success", "← Seans Başladı", data);
    if (monitor.audioEnabled) { ensureAudio(); startHeartbeat(); }
    await connectHub();
  } catch (e) {
    log("error", "✕ Başlatma Hatası", formatError(e));
    toast("bad", "Backend'e bağlanılamadı. Çalışıyor mu? (dotnet run)");
  }
}

async function endSession() {
  if (!state.sessionId) return;
  const sid = state.sessionId;
  try {
    const report = await postJson(`/api/sessions/${sid}/complete`, {});
    log("success", "← Rapor", report);
    let events = [];
    try { events = await getJson(`/api/sessions/${sid}/events`); } catch {}
    showReport(report, events);
  } catch (e) {
    log("error", "✕ Bitirme Hatası", formatError(e));
  } finally {
    stopHeartbeat();
    await disconnectHub();
    state.sessionId = null;
    state.currentStep = null;
    release();
    els.startBtn.disabled = false;
    els.endBtn.disabled = true;
  }
}

// ---- Olay gönderme ----
async function sendEvent(fields) {
  if (!state.sessionId) { toast("bad", "Önce seansı başlatın."); return; }
  const payload = { eventId: crypto.randomUUID(), timestamp: nowIso(), ...fields };
  log("info", `→ ${fields.eventType}`, payload);
  try {
    const data = await postJson(`/api/sessions/${state.sessionId}/events`, payload);
    handleResponse(fields.eventType, data);
  } catch (e) {
    log("error", "✕ Olay Hatası", formatError(e));
    toast("bad", "Olay gönderilemedi.");
  }
}

function handleResponse(sentType, data) {
  if (typeof data.score === "number") setScore(data.score);
  const replay = (data.message || "").includes("yinelenen");

  if (data.deviation) {
    const d = data.deviation;
    if (!replay) {
      state.counters.wrong++;
      if (d.deviationType === "STERILE_VIOLATION") state.counters.sterile++;
    }
    setVerdict("bad", `SAPMA: ${d.deviationType}`);
    toast("bad", `${d.deviationType} — ${data.message || ""}`);
    log("error", `⚠ Sapma: ${d.deviationType}`,
      `Beklenen: ${d.expected ?? "-"}\nGerçekleşen: ${d.actual ?? "-"}\nŞiddet: ${d.severity ?? "-"}\n${data.message ?? ""}`);
    // Komplikasyon REST yanıtıyla anında gelir (SignalR'a bağlı değil).
    if (data.complication) {
      traffic("ai", "AI·TABLO", "src-aitable", "⚑", "Komplikasyon (deterministik)",
        `${data.complication.deviationType} · ${data.complication.possibleRisk || ""}`);
      showAiFeedback(data.complication);
    }
    // Kümülatif komplikasyon panosu + hasta monitörü tepkisi.
    if (data.cumulativeComplication) {
      renderComplications(data.cumulativeComplication);
      applyDeviationToMonitor(data.cumulativeComplication, d.severity);
    }
  } else if (sentType === "hint_requested") {
    if (!replay) state.counters.hint++;
    setVerdict("info", "İPUCU");
    aiState("info", `💡 ${data.message || "İpucu verildi."}`);
    toast("info", data.message || "İpucu verildi.");
    log("info", "💡 İpucu", data.message || "");
  } else {
    if (!replay) state.counters.correct++;
    const next = data.nextStep ? ` — sıradaki: Adım ${data.nextStep.stepId} · ${data.nextStep.title}` : "";
    setVerdict("good", data.completed ? "🏁 Tamamlandı" : `DOĞRU ✓ — Adım ${(data.nextStep?.stepId ?? data.currentStepId)}/${TOTAL_STEPS}`);
    // Doğru ilerleyince son uyarı temizlenir, panel olumlu duruma döner.
    aiState("ok", data.completed ? "🏁 Prosedür doğru tamamlandı." : `✓ Süreç doğru ilerliyor${next}`);
    toast("good", data.message || "Doğru aksiyon.");
    log("success", "✓ Doğru Aksiyon", data.message || "");
    relaxMonitor();
  }
  updateCounters();

  if (!replay) recordTimeline(sentType, data);

  if (data.completed) {
    setStep(null);
    markAllStepsDone();
    setVerdict("good", "🏁 Prosedür tamamlandı — 'Bitir & Rapor'");
    aiState("ok", "🏁 Prosedür doğru tamamlandı.");
    toast("good", "Prosedür tamamlandı! Raporu görün.");
  } else if (data.nextStep) {
    setStep(data.nextStep);
  }
}

// ---- SignalR ----
async function connectHub() {
  try {
    const conn = new signalR.HubConnectionBuilder()
      .withUrl(`${baseUrl()}/hubs/simulation`).withAutomaticReconnect().build();
    conn.on("AiFeedback", (fb) => {
      traffic(
        "ai",
        "AI·LLM",
        "src-aillm",
        "↺",
        "SignalR AiFeedback",
        `${fb.deviationType} · ${fb.possibleRisk || ""}`,
        fb.totalTokens ? `${fb.totalTokens} token` : ""
      );
      showAiFeedback(fb);
    });
    conn.on("ScoreUpdate", (u) => {
      if (u && typeof u.score === "number") {
        setScore(u.score);
        traffic("hub", "HUB", "src-hub", "↺", "SignalR ScoreUpdate", `skor=${u.score}`);
      }
    });
    conn.onreconnected(() => setConn(true));
    conn.onclose(() => setConn(false));
    await conn.start();
    await conn.invoke("JoinSession", state.sessionId);
    state.connection = conn;
    setConn(true);
  } catch (e) {
    setConn(false);
    log("error", "✕ Hub Hatası", formatError(e));
  }
}

async function disconnectHub() {
  if (state.connection) { try { await state.connection.stop(); } catch {} state.connection = null; }
  setConn(false);
}

function showAiFeedback(fb) {
  const sev = fb.severity || "MEDIUM";
  const isLlm = fb.source === "llm";
  const line = (k, v) => v ? `<div class="ai-line"><span class="k">${k}</span><span>${v}</span></div>` : "";
  const meta = isLlm
    ? `<span class="ai-call">🤖 AI çağrısı yapıldı</span>` +
      (fb.totalTokens ? `<span class="ai-tokens">${fb.modelName ? fb.modelName + " · " : ""}${fb.totalTokens} token</span>` : "")
    : `<span class="ai-src">Kaynak: klinik tablo</span>`;
  els.aiCard.classList.remove("empty");
  els.aiCard.innerHTML =
    `<div class="ai-head"><span class="sev sev-${sev}">${sev}</span>` +
    `<span class="ai-dev">${fb.deviationType ?? ""}</span>` + meta + `</div>` +
    line("Olası Risk", fb.possibleRisk) +
    line("Açıklama", fb.explanation) +
    line("Önerilen Müdahale", fb.recommendedAction);
  log("ai", "🧠 AI Geri Bildirim", `${fb.deviationType}\nRisk: ${fb.possibleRisk}\nAçıklama: ${fb.explanation}\nMüdahale: ${fb.recommendedAction}`);
}

// Panel olumlu/nötr duruma döner (doğru ilerleme veya ipucu) — son uyarı kalıcı olmaz.
function aiState(kind, text) {
  els.aiCard.classList.remove("empty");
  els.aiCard.innerHTML = `<div class="ai-state ai-${kind}">${text}</div>`;
}

function aiIdle() {
  els.aiCard.classList.add("empty");
  els.aiCard.innerHTML = `<p class="muted">Bir hata yaptığınızda, olası klinik komplikasyon ve doğru müdahale açıklaması burada belirir.</p>`;
}

// ---- Sahne: elde tutma / teslim ----
function pickUp(code) {
  if (!state.sessionId) { toast("bad", "Önce seansı başlatın."); return; }
  state.holding = code;
  const ins = INSTRUMENT_CATALOG.find((i) => i.code === code);
  els.handHolding.textContent = `${ins?.icon ?? ""} ${ins?.name ?? code}`;
  els.handHolding.classList.remove("empty");
  els.releaseBtn.disabled = false;
  els.instrumentGrid.querySelectorAll(".tray-card").forEach((c) =>
    c.classList.toggle("held", c.dataset.code === code));
  document.querySelectorAll(".zone").forEach((z) => z.classList.add("armed"));
  // Sütür gereken adımda doğru sütürü öner.
  const step = stepMeta(state.currentStep?.stepId);
  if (step?.suture && code === "NEEDLE_HOLDER") els.sutureSelect.value = step.suture;
}

function release() {
  state.holding = null;
  els.handHolding.textContent = "— (tepsiden bir alet seçin) —";
  els.handHolding.classList.add("empty");
  els.releaseBtn.disabled = true;
  els.instrumentGrid.querySelectorAll(".tray-card.held").forEach((c) => c.classList.remove("held"));
  document.querySelectorAll(".zone").forEach((z) => z.classList.remove("armed", "drag-over"));
}

function deliverToZone(zone) {
  if (!state.holding) { toast("bad", "Önce tepsiden bir alet seçin/sürükleyin."); return; }
  const map = ZONE_MAP[zone];
  const fields = { eventType: map.eventType, instrumentCode: state.holding, target: map.target };
  const step = stepMeta(state.currentStep?.stepId);
  const suture = els.sutureSelect.value;
  if (suture && (step?.suture || state.holding === "NEEDLE_HOLDER")) fields.sutureCode = suture;
  sendEvent(fields);
  release();
}

function autoDeliver() {
  const step = state.currentStep;
  if (!step) { toast("bad", "Aktif adım yok."); return; }
  const meta = stepMeta(step.stepId);
  if (meta?.event === "count_confirmed") { sendCount(); return; }
  const code = (step.allowedInstruments || meta?.allowed || [])[0];
  if (!code) { toast("bad", "Bu adımda izinli alet yok."); return; }
  const map = ZONE_MAP[meta?.target || "SURGEON"];
  const fields = { eventType: map.eventType, instrumentCode: code, target: map.target };
  if (meta?.suture) fields.sutureCode = meta.suture;
  sendEvent(fields);
  release();
}

function sendCount() {
  sendEvent({
    eventType: "count_confirmed",
    counts: {
      COMPRESS: Number(els.cntCompress.value),
      INSTRUMENT: Number(els.cntInstrument.value),
      NEEDLE: Number(els.cntNeedle.value),
    },
  });
}

// ---- UI güncelleyiciler ----
function setScore(score) {
  if (typeof score !== "number") return;
  els.scoreValue.textContent = score;
  const hue = Math.max(0, Math.min(120, (score / 100) * 120));
  els.scoreValue.style.color = `hsl(${hue}, 75%, 58%)`;
}

function setStep(step) {
  state.currentStep = step;
  if (!step) {
    els.progressLabel.textContent = `Adım — / ${TOTAL_STEPS}`;
    els.taskCard.classList.add("empty");
    els.taskCard.innerHTML = `<p class="muted">Aktif görev yok.</p>`;
    updateSceneMode(null);
    return;
  }
  const id = step.stepId;
  const meta = stepMeta(id);
  els.progressLabel.textContent = `Adım ${id} / ${TOTAL_STEPS}`;
  els.progressBar.style.width = `${(id / TOTAL_STEPS) * 100}%`;

  const allowed = step.allowedInstruments?.length ? step.allowedInstruments : (meta?.allowed || []);
  els.taskCard.classList.remove("empty");
  els.taskCard.innerHTML = `
    <div class="task-head"><span class="task-step-id">Adım ${id}</span><span class="task-phase">${meta?.phase ?? step.phase ?? ""}</span></div>
    <div class="task-title">${step.title ?? meta?.title ?? ""}</div>
    <div class="task-instruction">${meta?.instruction ?? ""}</div>
    <div class="task-row"><span class="k">Beklenen olay</span><span class="chip">${step.expectedEvent ?? meta?.event ?? "-"}</span></div>
    <div class="task-row"><span class="k">Doğru alet</span><span class="chip-list">${allowed.map((c) => `<span class="chip hi">${labelOf(c)}</span>`).join("") || "<span class='muted'>-</span>"}</span></div>`;

  updateSceneMode(step);
  updateStepList(id);
}

function labelOf(code) {
  return INSTRUMENT_CATALOG.find((i) => i.code === code)?.name ?? code;
}

function updateSceneMode(step) {
  const meta = step ? stepMeta(step.stepId) : null;
  const isCount = meta?.event === "count_confirmed";
  els.countMode.classList.toggle("hidden", !isCount);
  els.trayWrap.classList.toggle("dim", isCount);

  if (isCount && meta?.counts) {
    els.cntCompress.value = meta.counts.COMPRESS;
    els.cntInstrument.value = meta.counts.INSTRUMENT;
    els.cntNeedle.value = meta.counts.NEEDLE;
  }

  // Sütür seçici görünürlüğü.
  const needsSuture = !!meta?.suture;
  els.sutureWrap.classList.toggle("hidden", !needsSuture);
  if (needsSuture) els.sutureSelect.value = meta.suture;

  // Beklenen alet vurgusu.
  const allowed = new Set(step ? (step.allowedInstruments?.length ? step.allowedInstruments : meta?.allowed || []) : []);
  els.instrumentGrid.querySelectorAll(".tray-card").forEach((c) =>
    c.classList.toggle("expected", allowed.has(c.dataset.code)));

  // Beklenen bölge vurgusu.
  const zone = meta?.target || "SURGEON";
  document.querySelectorAll(".zone").forEach((z) =>
    z.classList.toggle("expected", !isCount && z.dataset.zone === zone));
}

function setVerdict(kind, text) {
  els.verdictBanner.textContent = text;
  els.verdictBanner.className = `verdict verdict-${kind}`;
}

function resetCounters() {
  state.counters = { correct: 0, wrong: 0, sterile: 0, hint: 0 };
  state.timeline = [];
  updateCounters();
  els.aiCard.classList.add("empty");
  els.aiCard.innerHTML = `<p class="muted">Bir hata yaptığınızda, olası klinik komplikasyon ve doğru müdahale açıklaması burada belirir.</p>`;
  resetComplications();
  baselineVitals();
  setMonitorLevel("STABLE");
}

// ---- Kümülatif komplikasyon panosu ----
function renderComplications(assess) {
  if (!assess || !assess.items || assess.items.length === 0) { resetComplications(); return; }
  const rows = assess.items.map((it) => `
    <div class="comp-item ${it.primary ? "primary" : ""}">
      <div class="comp-row">
        <span class="comp-dev">${escapeHtml(it.deviationType)}</span>
        ${it.primary ? '<span class="comp-tag">EN OLASI</span>' : ""}
        <span class="comp-prob">%${it.probability}</span>
      </div>
      <div class="comp-risk">${escapeHtml(it.risk)}</div>
      <div class="comp-bar"><span style="width:${it.probability}%"></span></div>
      <div class="comp-meta">${it.occurrences}× tekrar · şiddet ${escapeHtml(it.severity)}</div>
    </div>`).join("");
  els.compBoard.classList.remove("empty");
  els.compBoard.innerHTML =
    `<div class="comp-summary">${escapeHtml(assess.summary)}</div><div class="comp-list">${rows}</div>`;
}

function resetComplications() {
  if (!els.compBoard) return;
  els.compBoard.classList.add("empty");
  els.compBoard.innerHTML = `<p class="muted">Hatalar biriktikçe en olası komplikasyonlar burada (max 5) görünür.</p>`;
}

// ---- Hasta monitörü: canlı vital simülasyonu ----
function baselineVitals() {
  monitor.stress = 0;
  monitor.currentRiskScore = 0;
  monitor.targetHeartRate = 76;
  monitor.targetPulseRate = 74;
  monitor.targetRespRate = 14;
}

function applyDeviationToMonitor(assess, severity) {
  const risk = assess?.riskScore ?? 0;
  monitor.currentRiskScore = risk;
  const bump = { LOW: 6, MEDIUM: 12, HIGH: 22, CRITICAL: 34 }[severity] || 12;
  monitor.stress = clamp(Math.max(monitor.stress, risk) + bump, 0, 100);
  monitor.targetHeartRate = clamp(76 + monitor.stress * 0.9, 70, 175);
  // Aşırı stres altında nabız açığı (pulse deficit) belirir.
  monitor.targetPulseRate = clamp(monitor.targetHeartRate - 2 - (monitor.stress > 60 ? 6 : 0), 58, 172);
  monitor.targetRespRate = clamp(14 + monitor.stress * 0.22, 12, 40);
  setMonitorLevel(assess?.level, severity);
}

function relaxMonitor() {
  monitor.stress = clamp(monitor.stress - 22, 0, 100);
  monitor.currentRiskScore = clamp(monitor.currentRiskScore - 25, 0, 100);
  monitor.targetHeartRate = clamp(76 + monitor.stress * 0.9, 70, 175);
  monitor.targetPulseRate = clamp(monitor.targetHeartRate - 2, 58, 172);
  monitor.targetRespRate = clamp(14 + monitor.stress * 0.22, 12, 40);
  setMonitorLevel(monitor.stress > 55 ? "HIGH" : monitor.stress > 20 ? "ELEVATED" : "STABLE");
}

function setMonitorLevel(level, severity) {
  const cls = level === "CRITICAL" || severity === "CRITICAL" ? "critical"
    : level === "HIGH" ? "high"
    : level === "ELEVATED" || level === "MEDIUM" ? "elevated"
    : "stable";
  const mm = $("miniMonitor");
  if (mm) mm.className = `mini-monitor ${cls}`;
}

// PQRST benzeri tek atım dalga biçimi (faz 0..1).
function ecgSample(phase) {
  const t = phase - Math.floor(phase);
  const g = (c, w, a) => a * Math.exp(-Math.pow((t - c) / w, 2));
  return g(0.16, 0.03, 0.10) + g(0.26, 0.012, -0.15) + g(0.30, 0.012, 1.0) + g(0.34, 0.014, -0.25) + g(0.58, 0.05, 0.22);
}

function startMonitor() {
  if (monitor.timerId || !els.vitalWave) return;
  const canvas = els.vitalWave;
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  const wave = new Array(W).fill(H / 2);
  const sps = 240; // sabit tarama hızı (px/sn)
  monitor.lastTick = performance.now();

  function frame(now) {
    const dt = Math.min(0.05, (now - monitor.lastTick) / 1000);
    monitor.lastTick = now;
    const ease = Math.min(1, dt * 2.5);
    monitor.heartRate += (monitor.targetHeartRate - monitor.heartRate) * ease;
    monitor.pulseRate += (monitor.targetPulseRate - monitor.pulseRate) * ease;
    monitor.respRate += (monitor.targetRespRate - monitor.respRate) * ease;
    monitor.stress = clamp(monitor.stress - dt * 3, 0, 100);
    monitor.currentRiskScore = clamp(monitor.currentRiskScore - dt * 4, 0, 100);

    const steps = Math.max(1, Math.round(dt * sps));
    for (let i = 0; i < steps; i++) {
      monitor.wavePhase += (1 / sps) * (monitor.heartRate / 60);
      wave.push(H / 2 - ecgSample(monitor.wavePhase) * (H * 0.42));
      wave.shift();
    }
    drawEcg(ctx, W, H, wave);
    updateMonitorUi();
    monitor.timerId = requestAnimationFrame(frame);
  }
  monitor.timerId = requestAnimationFrame(frame);
}

function drawEcg(ctx, W, H, wave) {
  ctx.clearRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(45,212,191,0.10)";
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 14) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 14) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  const color = monitor.stress > 70 ? "#fb7185" : monitor.stress > 35 ? "#fcd34d" : "#34d399";
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.6;
  ctx.lineJoin = "round";
  ctx.shadowColor = color;
  ctx.shadowBlur = 6;
  ctx.beginPath();
  const stepX = W / wave.length;
  for (let i = 0; i < wave.length; i++) {
    const x = i * stepX;
    i ? ctx.lineTo(x, wave[i]) : ctx.moveTo(x, wave[i]);
  }
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function updateMonitorUi() {
  if (els.hrValue) els.hrValue.textContent = Math.round(monitor.heartRate);
  if (els.respValue) els.respValue.textContent = Math.round(monitor.respRate);
  if (els.riskValue) els.riskValue.textContent = `${Math.round(monitor.currentRiskScore)}%`;
  if (els.pulseValue) els.pulseValue.textContent = Math.round(monitor.pulseRate);
}

// ---- Nabız sesi (WebAudio: HR'ye senkron "lub-dub" kalp atışı) ----
function ensureAudio() {
  if (monitor.audioCtx) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  const ctx = new AC();
  const master = ctx.createGain();
  master.gain.value = 0.9;
  master.connect(ctx.destination);
  monitor.audioCtx = ctx;
  monitor.masterGain = master;
  monitor.audioReady = true;
}

// Tek perküsif kalp vuruşu: alçak sinüs + hızlı sönüm (frekans düşüşü "thump" hissi verir).
function thump(t0, freq, peak, dur) {
  const ctx = monitor.audioCtx;
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, t0);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.55, t0 + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g); g.connect(monitor.masterGain);
  osc.start(t0);
  osc.stop(t0 + dur + 0.03);
}

function scheduleHeartbeat() {
  if (!monitor.audioReady || !monitor.audioEnabled) return;
  const ctx = monitor.audioCtx;
  const t = ctx.currentTime + 0.02;
  const bpm = clamp(monitor.heartRate, 40, 200);
  const period = 60 / bpm;
  const amp = clamp(0.24 + (monitor.stress / 100) * 0.34, 0.24, 0.6);
  thump(t, 54, amp, 0.16);                                   // S1 "lub"
  thump(t + Math.min(0.16, period * 0.30), 44, amp * 0.7, 0.13); // S2 "dub"
  clearTimeout(monitor.beatTimer);
  monitor.beatTimer = setTimeout(scheduleHeartbeat, period * 1000);
}

function startHeartbeat() {
  if (!monitor.audioReady || !monitor.audioEnabled) return;
  if (monitor.audioCtx?.state === "suspended") monitor.audioCtx.resume();
  scheduleHeartbeat();
}

function stopHeartbeat() {
  clearTimeout(monitor.beatTimer);
}

function toggleAudio() {
  monitor.audioEnabled = !monitor.audioEnabled;
  els.audioToggle.classList.toggle("off", !monitor.audioEnabled);
  els.audioToggle.textContent = monitor.audioEnabled ? "🔊" : "🔇";
  if (monitor.audioEnabled) { ensureAudio(); startHeartbeat(); }
  else { stopHeartbeat(); }
}

function updateCounters() {
  els.cntCorrect.textContent = state.counters.correct;
  els.cntWrong.textContent = state.counters.wrong;
  els.cntSterile.textContent = state.counters.sterile;
  els.cntHint.textContent = state.counters.hint;
}

// ---- Kontrol listesi ----
function buildStepList() {
  els.stepList.innerHTML = "";
  for (const s of STEPS) {
    const li = document.createElement("li");
    li.className = "step-item pending";
    li.dataset.id = s.id;
    li.innerHTML = `<span class="step-mark">○</span><span class="step-txt"><b>${s.id}.</b> ${s.title}</span>`;
    els.stepList.appendChild(li);
  }
}

function updateStepList(currentId) {
  els.stepList.querySelectorAll(".step-item").forEach((li) => {
    const id = Number(li.dataset.id);
    li.classList.remove("done", "active", "pending");
    if (id < currentId) { li.classList.add("done"); li.querySelector(".step-mark").textContent = "✔"; }
    else if (id === currentId) { li.classList.add("active"); li.querySelector(".step-mark").textContent = "▶"; }
    else { li.classList.add("pending"); li.querySelector(".step-mark").textContent = "○"; }
  });
  const active = els.stepList.querySelector(".step-item.active");
  if (active) active.scrollIntoView({ block: "nearest" });
}

function markAllStepsDone() {
  els.stepList.querySelectorAll(".step-item").forEach((li) => {
    li.classList.remove("active", "pending"); li.classList.add("done");
    li.querySelector(".step-mark").textContent = "✔";
  });
  els.progressBar.style.width = "100%";
}

// ---- Rapor ----
function showReport(report, events) {
  els.reportUser.textContent = `— kullanıcı: ${els.userId.value.trim() || "u1"}`;
  const rows = [
    ["Skor", `${report.score}/100`],
    ["Başarı Oranı", report.successRate != null ? `%${report.successRate}` : "-"],
    ["Doğru Aksiyon", report.correctActions],
    ["Yanlış Aksiyon", report.wrongActions],
    ["Steril İhlali", report.sterileViolations],
    ["Kullanılan İpucu", report.hintsUsed],
  ];
  els.reportBody.innerHTML =
    rows.map(([k, v]) => `<div class="report-row"><span class="k">${k}</span><span class="v">${v ?? "-"}</span></div>`).join("") +
    (report.summary ? `<div class="report-summary">${escapeHtml(report.summary)}</div>` : "");
  drawReportChart();
  renderFlow(events);
  els.reportModal.classList.remove("hidden");
}

// Vital seyri kaydı (her geçerli olayda hedef nabız/solunum + risk).
function recordTimeline(type, data) {
  const label = data.deviation ? `SAPMA ${data.deviation.deviationType}`
    : type === "hint_requested" ? "İpucu"
    : data.completed ? "Tamamlandı"
    : `Adım ${data.currentStepId} ✓`;
  state.timeline.push({
    hr: Math.round(monitor.targetHeartRate),
    resp: Math.round(monitor.targetRespRate),
    risk: Math.round(monitor.currentRiskScore),
    ok: !data.deviation && type !== "hint_requested",
    label,
  });
}

function drawReportChart() {
  const c = els.reportChart, ctx = c.getContext("2d");
  const W = c.width, H = c.height, pad = 26;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#0a1120"; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "#22304f"; ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) { const y = pad + (H - 2 * pad) * i / 4; ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(W - pad, y); ctx.stroke(); }
  const tl = state.timeline;
  if (!tl.length) { ctx.fillStyle = "#8a99c0"; ctx.font = "12px sans-serif"; ctx.fillText("Bu seansta veri kaydı yok.", W / 2 - 70, H / 2); return; }
  const n = tl.length;
  const xAt = (i) => pad + (W - 2 * pad) * (n === 1 ? 0.5 : i / (n - 1));
  const yAt = (v) => H - pad - (H - 2 * pad) * clamp(v, 0, 1);
  const series = [
    { key: "hr", color: "#f87171", max: 200 },
    { key: "resp", color: "#60a5fa", max: 40 },
    { key: "risk", color: "#fbbf24", max: 100 },
  ];
  for (const s of series) {
    ctx.strokeStyle = s.color; ctx.lineWidth = 2; ctx.lineJoin = "round"; ctx.beginPath();
    tl.forEach((p, i) => { const x = xAt(i), y = yAt(p[s.key] / s.max); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.stroke();
    // Sapma noktalarını vurgula.
    tl.forEach((p, i) => { if (!p.ok) { ctx.fillStyle = s.color; ctx.beginPath(); ctx.arc(xAt(i), yAt(p[s.key] / s.max), 2.6, 0, 7); ctx.fill(); } });
  }
  els.reportChartLegend.innerHTML =
    '<span class="lg-hr">● Nabız (bpm)</span><span class="lg-resp">● Solunum (/dk)</span><span class="lg-risk">● Risk (%)</span>';
}

function renderFlow(events) {
  if (!events || !events.length) { els.reportFlow.innerHTML = '<p class="muted">Kayıt yok.</p>'; return; }
  els.reportFlow.innerHTML = events.map((e, i) => {
    const ok = e.isSuccess;
    const ins = e.instrumentCode ? ` · ${labelOf(e.instrumentCode)}` : "";
    const dev = e.deviationType ? ` · ${e.deviationType}` : "";
    const sc = typeof e.scoreChange === "number" ? `${e.scoreChange > 0 ? "+" : ""}${e.scoreChange}` : "";
    return `<div class="flow-row ${ok ? "ok" : "bad"}">` +
      `<span class="fr-idx">${i + 1}</span>` +
      `<span class="fr-mark">${ok ? "✓" : "✕"}</span>` +
      `<span class="fr-main">Adım ${e.stepId} · ${escapeHtml(e.eventType)}${escapeHtml(ins)}${escapeHtml(dev)}</span>` +
      `<span class="fr-score">${sc}</span></div>`;
  }).join("");
}

// ---- Genel ----
function setConn(on) {
  els.connState.textContent = on ? "● Canlı" : "● Bağlı değil";
  els.connState.className = `conn-badge ${on ? "conn-on" : "conn-off"}`;
}

function formatError(e) {
  return e.data ? `${e.message}\n${JSON.stringify(e.data, null, 2)}` : (e.message || String(e));
}

// ---- Kurulum ----
function buildTray() {
  els.instrumentGrid.innerHTML = "";
  for (const ins of INSTRUMENT_CATALOG) {
    const card = document.createElement("div");
    card.className = "tray-card";
    card.dataset.code = ins.code;
    card.draggable = true;
    card.innerHTML = `<span class="tray-ic">${ins.icon}</span><span class="tray-nm">${ins.name}</span>`;
    card.addEventListener("click", () => pickUp(ins.code));
    card.addEventListener("dragstart", (e) => { pickUp(ins.code); e.dataTransfer.setData("text/plain", ins.code); });
    els.instrumentGrid.appendChild(card);
  }
}

function buildSutures() {
  for (const s of SUTURE_CATALOG) {
    const opt = document.createElement("option");
    opt.value = s.code; opt.textContent = s.name;
    els.sutureSelect.appendChild(opt);
  }
}

function bindZones() {
  document.querySelectorAll(".zone").forEach((z) => {
    z.addEventListener("click", () => deliverToZone(z.dataset.zone));
    z.addEventListener("dragover", (e) => { e.preventDefault(); z.classList.add("drag-over"); });
    z.addEventListener("dragleave", () => z.classList.remove("drag-over"));
    z.addEventListener("drop", (e) => { e.preventDefault(); z.classList.remove("drag-over"); deliverToZone(z.dataset.zone); });
  });
}

function bindEvents() {
  els.startBtn.addEventListener("click", startSession);
  els.endBtn.addEventListener("click", endSession);
  els.autoBtn.addEventListener("click", autoDeliver);
  els.releaseBtn.addEventListener("click", release);
  els.countSendBtn.addEventListener("click", sendCount);
  els.clearLogBtn.addEventListener("click", () => (els.log.innerHTML = ""));
  els.trafficClear.addEventListener("click", () => { els.traffic.innerHTML = ""; trafficCount = 0; els.trafficCount.textContent = "0 istek"; });
  els.audioToggle.addEventListener("click", toggleAudio);
  els.trafficToggle.addEventListener("click", () => {
    const expanded = !els.traffic.classList.contains("expanded");
    els.traffic.classList.toggle("expanded", expanded);
    els.traffic.classList.toggle("compact", !expanded);
    els.trafficToggle.textContent = expanded ? "Daralt" : "Genişlet";
  });
  els.logToggle.addEventListener("click", () => {
    els.log.classList.toggle("hidden");
    els.logToggle.textContent = els.log.classList.contains("hidden")
      ? "▸ Geliştirici Günlüğü (JSON)" : "▾ Geliştirici Günlüğü (JSON)";
  });
  els.helpBtn.addEventListener("click", () => els.helpModal.classList.remove("hidden"));
  els.closeHelpBtn.addEventListener("click", () => els.helpModal.classList.add("hidden"));
  els.closeReportBtn.addEventListener("click", () => els.reportModal.classList.add("hidden"));
  document.querySelectorAll("button[data-evt]").forEach((btn) =>
    btn.addEventListener("click", () => sendEvent({ eventType: btn.dataset.evt })));
}

// ---- Başlangıç ----
if (location.hostname !== "localhost" && location.hostname !== "127.0.0.1") {
  els.baseUrl.value = location.origin;
}
buildTray();
buildSutures();
buildStepList();
bindZones();
bindEvents();
setConn(false);
resetComplications();
baselineVitals();
startMonitor();
