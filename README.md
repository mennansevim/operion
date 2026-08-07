# Operion — VR Cerrahi Eğitim Simülasyonu (MVP)

Açık apendektomi prosedüründe **ameliyathane teknikeri (scrub)** eğitimi için geliştirilen adaptif VR eğitim
sisteminin backend + simülatör MVP'si. Sistem, kullanıcının aksiyonlarını **deterministik** olarak doğrular,
puanlar ve hata durumunda **LLM tabanlı** pedagojik geri bildirim üretir.

## Mimari

```
Unity/Web Simülatör
   │  event (REST)                 ▲ aiFeedback (SignalR, async)
   ▼                               │
ASP.NET Core Backend
 ├─ ProcedureService   → deterministik doğrulama (ms)     [güvenlik-kritik]
 ├─ ScoringService     → puanlama (ms)
 ├─ AiFeedbackService  → klinik tablo (birincil) + LLM cila (async)   [açıklama]
 └─ PostgreSQL / InMemory
```

**Temel ilke:** Güvenlik-kritik "doğru mu / yanlış mı" kararı deterministik katmanda verilir; LLM yalnızca
tespit edilen hatanın klinik sonucunu ve doğru müdahaleyi açıklar. Bu ayrım demo güvenilirliğini ve
açıklanabilirliği garanti eder (LLM erişilemese bile çekirdek döngü çalışır).

## Klasör yapısı

```
backend/
  Controllers/SessionController.cs     # REST uçları
  Services/ProcedureService.cs         # deterministik doğrulama (çekirdek)
  Services/ScoringService.cs           # puanlama
  Services/AiFeedbackService.cs        # klinik tablo + opsiyonel OpenAI
  Services/ProcedureStore.cs           # JSON konfigürasyon yükleyici
  Hubs/SimulationHub.cs                # SignalR (canlı geri bildirim)
  Data/OperionDbContext.cs             # EF Core (5 tablo)
  Models/                              # config, entity, DTO
  Procedures/
    open-appendectomy-v1.json          # 18 adımlık prosedür (60 adımdan seçili)
    scenarios.json                     # standart + yapışıklıklı vaka
    clinical-knowledge.json            # hata→komplikasyon→müdahale tablosu (RAG-lite)
simulator/
  index.html, app.js, styles.css       # Unity olmadan tüm döngüyü test eden web arayüzü
docker-compose.yml                     # PostgreSQL
```

## Çalıştırma

### 1. Backend (varsayılan: InMemory DB, sıfır kurulum)

```bash
cd backend
dotnet run
```

Backend `http://localhost:5080` üzerinde açılır. Swagger: `http://localhost:5080/swagger`.

### 2. Simülatör

```bash
cd simulator
python3 -m http.server 8000
```

Tarayıcıda `http://localhost:8000` → "Seansı Başlat" → alet butonlarıyla event gönder.

### 3. (Opsiyonel) PostgreSQL ile

```bash
docker compose up -d
```

`appsettings.json` içinde `Database:Provider` değerini `Postgres` yapın (varsayılan zaten Postgres;
Development ortamında InMemory'e düşer).

### 4. (Opsiyonel) LLM geri bildirimi

`appsettings.json` → `OpenAI:ApiKey` girildiğinde AI geri bildirimi, klinik tablo içeriğini GPT-4o mini ile
Türkçe olarak yeniden ifade eder. Anahtar boşsa doğrudan tablo içeriği kullanılır (kaynak izlenebilir kalır).
**API anahtarını repoya commit etmeyin** — ortam değişkeni veya user-secrets kullanın.

## API sözleşmesi

| Uç | Açıklama |
|---|---|
| `POST /api/sessions` | Seans başlatır, ilk adımı döner |
| `POST /api/sessions/{id}/events` | Event doğrular, anlık sonuç döner; hata varsa AI feedback SignalR ile gelir |
| `POST /api/sessions/{id}/complete` | Seansı bitirir, rapor döner |
| `GET /api/sessions/{id}` | Seans durumunu döner |
| Hub `/hubs/simulation` | `JoinSession`, dinle: `AiFeedback`, `ScoreUpdate` |

## Yol haritası

- **Faz 1 (bu MVP):** GPT-4o mini + klinik tablo (RAG-lite), deterministik doğrulama, web simülatör, Unity PC/VR.
- **Faz 2:** Uzman onaylı etiketli veriyle Qwen/Llama sınıfı yerel modele geçiş (QLoRA), çevrimdışı çalışma.

Model bağımlılığı `IAiFeedbackService` arkasında soyutlanmıştır; Faz 2 geçişi tek implementasyon değişikliğidir.
