// Operion — Web tabanlı olay simülatörü
// Backend'i Unity/VR olmadan test etmek için event gönderir, yanıtları loglar.

// ---- Prosedür kataloğu (open-appendectomy-v1.json'dan) ----
const INSTRUMENT_CATALOG = [
  { code: "SCALPEL_NO_15", name: "No:15 Bistüri (No:3 sap)" },
  { code: "SCALPEL_NO_15_USED", name: "Kullanılmış/Kirli No:15 Bistüri" },
  { code: "MONOPOLAR_CAUTERY", name: "Monopolar Koter Kalemi" },
  { code: "MAYO_SCISSORS", name: "Mayo Makası" },
  { code: "METZENBAUM_SCISSORS", name: "Metzenbaum Makası" },
  { code: "STILLE_FORCEPS", name: "Stille Penset" },
  { code: "DEBAKEY_FORCEPS", name: "DeBakey Penset" },
  { code: "FARABEUF_RETRACTOR", name: "Farabeuf Ekartör" },
  { code: "ROUX_RETRACTOR", name: "Roux Ekartör" },
  { code: "LANGENBECK_RETRACTOR", name: "Langenbeck Ekartör" },
  { code: "BABCOCK_ATRAUMATIC", name: "Atravmatik Babcock" },
  { code: "MOSQUITO_CLAMP", name: "Mosquito Klemp" },
  { code: "PEAN_CLAMP", name: "Pean Klemp" },
  { code: "STRAIGHT_CLAMP_ATRAUMATIC", name: "Düz Dişsiz İşaret Pensi" },
  { code: "NEEDLE_HOLDER", name: "Portegü" },
  { code: "FOERSTER_CLAMP", name: "Foerster Klemp" },
];

const SUTURE_CATALOG = [
  { code: "SILK_3_0", name: "3/0 İpek" },
  { code: "VICRYL_2_0", name: "2/0 Vicryl (Poliglaktin)" },
  { code: "VICRYL_1_0", name: "0/1 Vicryl" },
  { code: "PROLENE_0", name: "0 Prolen" },
  { code: "POLYAMIDE_4_0", name: "4/0 Polyamid" },
];

const TOTAL_STEPS = 18;

// ---- Durum ----
const state = {
  sessionId: null,
  currentStep: null,
  connection: null,
};

// ---- DOM kısayolları ----
const $ = (id) => document.getElementById(id);
const els = {
  baseUrl: $("baseUrl"),
  scenario: $("scenario"),
  userId: $("userId"),
  startBtn: $("startBtn"),
  endBtn: $("endBtn"),
  scoreValue: $("scoreValue"),
  progressBar: $("progressBar"),
  progressLabel: $("progressLabel"),
  connState: $("connState"),
  taskCard: $("taskCard"),
  targetSelect: $("targetSelect"),
  sutureSelect: $("sutureSelect"),
  correctBtn: $("correctBtn"),
  instrumentGrid: $("instrumentGrid"),
  countBtn: $("countBtn"),
  countPanel: $("countPanel"),
  countSendBtn: $("countSendBtn"),
  cntCompress: $("cntCompress"),
  cntInstrument: $("cntInstrument"),
  cntNeedle: $("cntNeedle"),
  log: $("log"),
  clearLogBtn: $("clearLogBtn"),
  reportModal: $("reportModal"),
  reportBody: $("reportBody"),
  closeReportBtn: $("closeReportBtn"),
};

// ---- Yardımcılar ----
const baseUrl = () => els.baseUrl.value.replace(/\/+$/, "");
const nowIso = () => new Date().toISOString();
const timeLabel = () => new Date().toLocaleTimeString("tr-TR");

function log(kind, tag, contentNode) {
  const entry = document.createElement("div");
  entry.className = `log-entry log-${kind}`;
  const head = document.createElement("div");
  head.className = "le-head";
  head.innerHTML = `<span class="le-tag">${tag}</span><span class="le-time">${timeLabel()}</span>`;
  entry.appendChild(head);
  if (typeof contentNode === "string") {
    const pre = document.createElement("pre");
    pre.textContent = contentNode;
    entry.appendChild(pre);
  } else if (contentNode) {
    entry.appendChild(contentNode);
  }
  els.log.appendChild(entry);
  els.log.scrollTop = els.log.scrollHeight;
}

function logJson(kind, tag, obj) {
  log(kind, tag, JSON.stringify(obj, null, 2));
}

// ---- Backend çağrıları ----
async function postJson(path, body) {
  const url = `${baseUrl()}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.data = data;
    throw err;
  }
  return data;
}

// ---- Seans başlat ----
async function startSession() {
  const body = { userId: els.userId.value.trim() || "u1", scenarioId: els.scenario.value };
  log("info", "→ Seans Başlat", JSON.stringify(body, null, 2));
  try {
    const data = await postJson("/api/sessions", body);
    state.sessionId = data.sessionId;
    logJson("success", "← Seans Başladı", data);
    setScore(data.score);
    setStep(data.currentStep);
    els.startBtn.disabled = true;
    els.endBtn.disabled = false;
    await connectHub();
  } catch (e) {
    log("error", "✕ Başlatma Hatası", formatError(e));
  }
}

// ---- Olay gönder ----
async function sendEvent(fields) {
  if (!state.sessionId) {
    log("error", "✕ Uyarı", "Önce seansı başlatın.");
    return;
  }
  const payload = { eventId: crypto.randomUUID(), timestamp: nowIso(), ...fields };
  log("info", `→ ${fields.eventType}`, JSON.stringify(payload, null, 2));
  try {
    const data = await postJson(`/api/sessions/${state.sessionId}/events`, payload);
    handleEventResponse(data);
  } catch (e) {
    log("error", "✕ Olay Hatası", formatError(e));
  }
}

function handleEventResponse(data) {
  if (typeof data.score === "number") setScore(data.score);

  if (data.deviation) {
    const d = data.deviation;
    log(
      "error",
      `⚠ Sapma: ${d.deviationType}`,
      `Beklenen: ${d.expected ?? "-"}\nGerçekleşen: ${d.actual ?? "-"}\nŞiddet: ${d.severity ?? "-"}\n${data.message ?? ""}`
    );
  } else {
    log("success", "✓ Doğru Aksiyon", data.message || "Aksiyon kabul edildi.");
  }

  if (data.completed) {
    log("info", "🏁 Prosedür Tamamlandı", "Raporu görmek için 'Seansı Bitir'e basın.");
  } else if (data.nextStep) {
    setStep(data.nextStep);
  }
}

// ---- Seans bitir ----
async function endSession() {
  if (!state.sessionId) return;
  log("info", "→ Seans Bitir", `sessionId: ${state.sessionId}`);
  try {
    const report = await postJson(`/api/sessions/${state.sessionId}/complete`, {});
    logJson("success", "← Rapor", report);
    showReport(report);
  } catch (e) {
    log("error", "✕ Bitirme Hatası", formatError(e));
  } finally {
    await disconnectHub();
    state.sessionId = null;
    state.currentStep = null;
    els.startBtn.disabled = false;
    els.endBtn.disabled = true;
  }
}

// ---- SignalR ----
async function connectHub() {
  try {
    const conn = new signalR.HubConnectionBuilder()
      .withUrl(`${baseUrl()}/hubs/simulation`)
      .withAutomaticReconnect()
      .build();

    conn.on("AiFeedback", (fb) => logAiFeedback(fb));
    conn.on("ScoreUpdate", (upd) => {
      if (upd && typeof upd.score === "number") {
        setScore(upd.score);
        log("info", "↺ Skor Güncellendi", `Yeni skor: ${upd.score}`);
      }
    });

    conn.onreconnected(() => setConn(true));
    conn.onclose(() => setConn(false));

    await conn.start();
    await conn.invoke("JoinSession", state.sessionId);
    state.connection = conn;
    setConn(true);
    log("info", "⇄ Hub Bağlandı", "AiFeedback ve ScoreUpdate dinleniyor.");
  } catch (e) {
    setConn(false);
    log("error", "✕ Hub Hatası", formatError(e));
  }
}

async function disconnectHub() {
  if (state.connection) {
    try { await state.connection.stop(); } catch { /* yoksay */ }
    state.connection = null;
  }
  setConn(false);
}

function logAiFeedback(fb) {
  const block = document.createElement("div");
  block.className = "ai-block";
  const sev = fb.severity || "MEDIUM";
  const line = (k, v) => v ? `<div class="ai-line"><span class="k">${k}:</span> ${v}</div>` : "";
  block.innerHTML =
    `<div class="ai-line"><span class="k">Adım:</span> ${fb.stepId ?? "-"} ` +
    `<span class="sev sev-${sev}">${sev}</span> ` +
    `<span class="k">${fb.deviationType ?? ""}</span></div>` +
    line("Olası Risk", fb.possibleRisk) +
    line("Açıklama", fb.explanation) +
    line("Önerilen Müdahale", fb.recommendedAction) +
    line("Kaynak", fb.source);
  log("ai", "🧠 AI Geri Bildirim", block);
}

// ---- UI güncelleyiciler ----
function setScore(score) {
  if (typeof score !== "number") return;
  els.scoreValue.textContent = score;
  const hue = Math.max(0, Math.min(120, (score / 100) * 120));
  els.scoreValue.style.color = `hsl(${hue}, 70%, 55%)`;
}

function setStep(step) {
  state.currentStep = step;
  if (!step) return;
  const id = step.stepId;
  els.progressLabel.textContent = `Adım ${id} / ${TOTAL_STEPS}`;
  els.progressBar.style.width = `${(id / TOTAL_STEPS) * 100}%`;

  const allowed = step.allowedInstruments || [];
  els.taskCard.classList.remove("empty");
  els.taskCard.innerHTML = `
    <div><span class="task-step-id">Adım ${id}</span></div>
    <div class="task-title">${step.title ?? ""}</div>
    <div class="task-row"><span class="k">Faz</span><span>${step.phase ?? "-"}</span></div>
    <div class="task-row"><span class="k">Beklenen</span><span>${step.expectedEvent ?? "-"}</span></div>
    <div class="task-row"><span class="k">Aletler</span>
      <span class="chip-list">${allowed.map((c) => `<span class="chip hi">${c}</span>`).join("") || "<span class='muted'>-</span>"}</span>
    </div>`;
  highlightAllowed(allowed);
}

function highlightAllowed(allowed) {
  const set = new Set(allowed || []);
  els.instrumentGrid.querySelectorAll("button[data-code]").forEach((btn) => {
    btn.classList.toggle("allowed", set.has(btn.dataset.code));
  });
}

// ---- Aksiyon kurma ----
function buildInstrumentButtons() {
  els.instrumentGrid.innerHTML = "";
  for (const ins of INSTRUMENT_CATALOG) {
    const btn = document.createElement("button");
    btn.className = "btn btn-ghost";
    btn.dataset.code = ins.code;
    btn.innerHTML = `${ins.name}<small>${ins.code}</small>`;
    btn.addEventListener("click", () => deliverInstrument(ins.code));
    els.instrumentGrid.appendChild(btn);
  }
}

function buildSutureOptions() {
  for (const s of SUTURE_CATALOG) {
    const opt = document.createElement("option");
    opt.value = s.code;
    opt.textContent = s.name;
    els.sutureSelect.appendChild(opt);
  }
}

function deliverInstrument(instrumentCode) {
  const fields = {
    eventType: "instrument_delivered",
    instrumentCode,
    target: els.targetSelect.value,
  };
  const suture = els.sutureSelect.value;
  if (suture) fields.sutureCode = suture;
  sendEvent(fields);
}

function sendCorrectInstrument() {
  const allowed = state.currentStep?.allowedInstruments || [];
  if (!allowed.length) {
    log("error", "✕ Uyarı", "Mevcut adımda izinli alet yok.");
    return;
  }
  deliverInstrument(allowed[0]);
}

function sendCountConfirmed() {
  sendEvent({
    eventType: "count_confirmed",
    counts: {
      COMPRESS: Number(els.cntCompress.value),
      INSTRUMENT: Number(els.cntInstrument.value),
      NEEDLE: Number(els.cntNeedle.value),
    },
  });
}

// ---- Rapor ----
function showReport(report) {
  const rows = [
    ["Skor", report.score],
    ["Başarı Oranı", report.successRate != null ? `%${report.successRate}` : "-"],
    ["Doğru Aksiyon", report.correctActions],
    ["Yanlış Aksiyon", report.wrongActions],
    ["Steril İhlali", report.sterileViolations],
    ["Kullanılan İpucu", report.hintsUsed],
  ];
  els.reportBody.innerHTML =
    rows.map(([k, v]) => `<div class="report-row"><span class="k">${k}</span><span class="v">${v ?? "-"}</span></div>`).join("") +
    (report.summary ? `<div class="report-summary">${report.summary}</div>` : "");
  els.reportModal.classList.remove("hidden");
}

// ---- Genel ----
function setConn(on) {
  els.connState.textContent = on ? "Bağlı" : "Bağlı değil";
  els.connState.className = `conn-badge ${on ? "conn-on" : "conn-off"}`;
}

function formatError(e) {
  if (e.data) return `${e.message}\n${JSON.stringify(e.data, null, 2)}`;
  return e.message || String(e);
}

// ---- Olay bağlama ----
function bindEvents() {
  els.startBtn.addEventListener("click", startSession);
  els.endBtn.addEventListener("click", endSession);
  els.correctBtn.addEventListener("click", sendCorrectInstrument);
  els.clearLogBtn.addEventListener("click", () => (els.log.innerHTML = ""));
  els.closeReportBtn.addEventListener("click", () => els.reportModal.classList.add("hidden"));

  els.countBtn.addEventListener("click", () => els.countPanel.classList.toggle("hidden"));
  els.countSendBtn.addEventListener("click", sendCountConfirmed);

  // Özel event butonları (data-evt)
  document.querySelectorAll("button[data-evt]").forEach((btn) => {
    btn.addEventListener("click", () => sendEvent({ eventType: btn.dataset.evt }));
  });
}

// ---- Başlangıç ----
buildInstrumentButtons();
buildSutureOptions();
bindEvents();
setConn(false);
