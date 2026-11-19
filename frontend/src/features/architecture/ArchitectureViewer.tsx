import React, { useState, useRef, useEffect } from 'react';
import {
  Download,
  Copy,
  Check,
  Database,
  Lock,
  Zap,
  Layers,
  ShieldAlert,
  Clock,
  Terminal,
  FileText,
  Sparkles,
  Server,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';

interface ArchitectureViewerProps {
  onTriggerSignalR: (
    title: string,
    message: string,
    severity: 'info' | 'success' | 'warning' | 'danger'
  ) => void;
}

interface RaceLogEntry {
  time: string;
  source: string;
  message: string;
  status: 'pending' | 'success' | 'conflict';
}

const FALLBACK_SRS_MARKDOWN = `# DentaCore CRM — Texnik Topshiriq (SRS) & Arxitektura

## 1. Tizim Arxitekturasi
- **Backend:** ASP.NET Core 8 Web API (Clean Architecture: Domain, Application, Infrastructure, WebAPI)
- **Database:** PostgreSQL 16 + \`btree_gist\` Extension + JSONB Odontogram (GIN Index)
- **Real-Time:** SignalR \`ClinicHub\` (Jonli navbat va tezkor bildirishnomalar)
- **Frontend:** React + TypeScript + Tailwind CSS (macOS Glassmorphism UI)

## 2. Double-Booking Himoyasi (PostgreSQL Exclusion Constraint)
\`\`\`sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

CREATE TABLE "Appointments" (
    "Id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "DoctorId" UUID NOT NULL REFERENCES "Users"("Id") ON DELETE RESTRICT,
    "PatientId" UUID NOT NULL REFERENCES "Patients"("Id") ON DELETE RESTRICT,
    "StartTimeUtc" TIMESTAMPTZ NOT NULL,
    "EndTimeUtc" TIMESTAMPTZ NOT NULL,
    "Status" VARCHAR(30) NOT NULL DEFAULT 'Pending',
    CONSTRAINT "chk_appointment_time_valid" CHECK ("EndTimeUtc" > "StartTimeUtc"),
    CONSTRAINT "no_overlapping_appointments_for_doctor"
        EXCLUDE USING gist (
            "DoctorId" WITH =,
            tsrange("StartTimeUtc", "EndTimeUtc", '[)') WITH &&
        ) WHERE ("Status" NOT IN ('Cancelled', 'NoShow'))
);
\`\`\`
`;

const ASCII_ARCHITECTURE = `+-----------------------+        +---------------------------+
| Public Booking Portal |        |   Clinic CRM Dashboard    |
| (Bemorlar uchun Web)  |        | (Admin / Shifokor / Kassa)|
+-----------+-----------+        +-------------+-------------+
            | REST (HTTPS)                     | REST + SignalR (WebSockets)
            v                                  v
+------------------------------------------------------------+
|                 ASP.NET Core 8 Web API                     |
|  [Rate Limiter] -> [JWT & RBAC] -> [Global Error Handler]  |
+-----------------------------+------------------------------+
                              |
              +---------------+---------------+
              |                               |
              v                               v
+---------------------------+   +----------------------------+
|     Application Layer     |   |      SignalR ClinicHub     |
| - SlotCalculationEngine   |   | - Live Queue Status        |
| - DoubleBookingGuard      |   | - Instant Booking Alerts   |
| - Billing & Debt Service  |   +----------------------------+
+-------------+-------------+
              | EF Core (Npgsql)
              v
+------------------------------------------------------------+
|                   PostgreSQL 16 Database                   |
|  [Users] [DoctorSchedules] [Patients] [Appointments]       |
|  [TreatmentRecords (JSONB Odontogram)] [Invoices/Payments] |
+------------------------------------------------------------+`;

const POSTGRES_DDL_SCRIPT = `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

CREATE TABLE "Appointments" (
    "Id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "DoctorId" UUID NOT NULL REFERENCES "Users"("Id") ON DELETE RESTRICT,
    "PatientId" UUID NOT NULL REFERENCES "Patients"("Id") ON DELETE RESTRICT,
    "StartTimeUtc" TIMESTAMPTZ NOT NULL,
    "EndTimeUtc" TIMESTAMPTZ NOT NULL,
    "Status" VARCHAR(30) NOT NULL DEFAULT 'Pending',
    CONSTRAINT "chk_appointment_time_valid" CHECK ("EndTimeUtc" > "StartTimeUtc"),
    CONSTRAINT "no_overlapping_appointments_for_doctor" 
        EXCLUDE USING gist (
            "DoctorId" WITH =,
            tsrange("StartTimeUtc", "EndTimeUtc", '[)') WITH &&
        ) WHERE ("Status" NOT IN ('Cancelled', 'NoShow'))
);`;

export const ArchitectureViewer: React.FC<ArchitectureViewerProps> = ({ onTriggerSignalR }) => {
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'concurrency' | 'erd' | 'sprint'>('overview');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 50, y: 50 });

  // Concurrency Simulation State
  const [isSimulatingRace, setIsSimulatingRace] = useState(false);
  const [raceLogs, setRaceLogs] = useState<RaceLogEntry[]>([]);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  const triggerCopyFeedback = (key: string) => {
    setCopiedKey(key);
    window.setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 2200);
  };

  const fetchSrsContent = async (): Promise<string> => {
    try {
      const res = await fetch('/ARCHITECTURE_AND_SRS.md');
      if (!res.ok) return FALLBACK_SRS_MARKDOWN;
      const text = await res.text();
      // Vite SPA fallback HTML qaytarsa, o'rnatilgan SRS matnidan foydalanamiz
      if (text.trim().toLowerCase().startsWith('<!doctype html') || text.trim().startsWith('<html')) {
        return FALLBACK_SRS_MARKDOWN;
      }
      return text;
    } catch {
      return FALLBACK_SRS_MARKDOWN;
    }
  };

  const handleDownloadMd = async () => {
    try {
      const text = await fetchSrsContent();
      const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ARCHITECTURE_AND_SRS.md';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onTriggerSignalR(
        'Fayl yuklandi',
        'ARCHITECTURE_AND_SRS.md muvaffaqiyatli yuklab olindi',
        'success'
      );
    } catch {
      onTriggerSignalR('Xatolik', 'Hujjatni yuklashda xatolik yuz berdi', 'danger');
    }
  };

  const handleCopyMd = async () => {
    try {
      const text = await fetchSrsContent();
      await navigator.clipboard.writeText(text);
      triggerCopyFeedback('srs');
      onTriggerSignalR(
        'Nusxalandi',
        'Toʻliq arxitektura spetsifikatsiyasi xotiraga nusxalandi',
        'info'
      );
    } catch {
      onTriggerSignalR('Xatolik', 'Buferga nusxalashda xatolik yuz berdi', 'danger');
    }
  };

  const handleCopySnippet = async (key: string, content: string, label: string) => {
    try {
      await navigator.clipboard.writeText(content);
      triggerCopyFeedback(key);
      onTriggerSignalR('Kod nusxalandi', `${label} buferga nusxalandi`, 'info');
    } catch {
      onTriggerSignalR('Xatolik', 'Kodni nusxalab boʻlmadi', 'danger');
    }
  };

  const clearRaceLogs = () => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
    setIsSimulatingRace(false);
    setRaceLogs([]);
  };

  const runRaceConditionSimulation = () => {
    clearRaceLogs();
    setIsSimulatingRace(true);

    const nowStr = () => new Date().toISOString().substring(11, 23);

    const t1 = window.setTimeout(() => {
      setRaceLogs([
        {
          time: nowStr(),
          source: 'Client A (Mobil Portal)',
          message: 'POST /api/v1/public/book -> Dr. Jasur Aliyev, Bugun 14:00 - 14:30',
          status: 'pending',
        },
        {
          time: nowStr(),
          source: 'Client B (Resepshn CRM)',
          message: 'POST /api/v1/crm/appointments -> Dr. Jasur Aliyev, Bugun 14:00 - 14:30',
          status: 'pending',
        },
      ]);
    }, 180);

    const t2 = window.setTimeout(() => {
      setRaceLogs((prev) => [
        ...prev,
        {
          time: nowStr(),
          source: 'Kestrel Pipeline',
          message: 'ASP.NET Core 8: Har ikki soʻrov bir millisekundda DB tranzaksiyasiga uzatildi',
          status: 'pending',
        },
      ]);
    }, 650);

    const t3 = window.setTimeout(() => {
      setRaceLogs((prev) => [
        ...prev,
        {
          time: nowStr(),
          source: 'PostgreSQL 16 (TRX #8941)',
          message: 'Client A yozuvi tasdiqlandi -> COMMIT SUCCESS (UUID: f958-4b42)',
          status: 'success',
        },
        {
          time: nowStr(),
          source: 'PostgreSQL btree_gist',
          message: 'TRX #8942: Exclusion Violation 23P01 ("no_overlapping_appointments_for_doctor") -> ROLLBACK!',
          status: 'conflict',
        },
      ]);
    }, 1350);

    const t4 = window.setTimeout(() => {
      setRaceLogs((prev) => [
        ...prev,
        {
          time: nowStr(),
          source: 'Client A Natija',
          message: 'HTTP 201 Created -> SignalR ClinicHub: NewOnlineBookingCreated yuborildi',
          status: 'success',
        },
        {
          time: nowStr(),
          source: 'Client B Natija',
          message: 'HTTP 409 Conflict (RFC 7807) -> "Ushbu vaqt oraligʻi allaqachon band qilindi"',
          status: 'conflict',
        },
      ]);
      setIsSimulatingRace(false);
      onTriggerSignalR(
        'Double-Booking Himoyasi Ishladi!',
        'PostgreSQL btree_gist bir xil vaqtga tushgan ikkinchi soʻrovni apparat darajasida 409 Conflict bilan qaytardi.',
        'warning'
      );
    }, 2050);

    timersRef.current = [t1, t2, t3, t4];
  };

  const handleHeroMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePos({ x, y });
  };

  const subTabs: {
    id: 'overview' | 'concurrency' | 'erd' | 'sprint';
    label: string;
    icon: React.ReactNode;
  }[] = [
    { id: 'overview', label: 'Arxitektura Qatlamlari', icon: <FileText className="w-3.5 h-3.5" /> },
    { id: 'concurrency', label: 'Double-Booking Guard', icon: <Lock className="w-3.5 h-3.5 text-amber-500" /> },
    { id: 'erd', label: 'PostgreSQL ERD & DDL', icon: <Database className="w-3.5 h-3.5 text-sky-500" /> },
    { id: 'sprint', label: '72 Soatlik Sprint Rejasi', icon: <Clock className="w-3.5 h-3.5 text-emerald-500" /> },
  ];

  return (
    <div className="space-y-6">
      {/* macOS Frosted Dark Hero Banner with Cursor Spotlight */}
      <div
        onMouseMove={handleHeroMouseMove}
        className="group relative overflow-hidden rounded-3xl bg-slate-950/95 backdrop-blur-2xl p-6 md:p-8 text-white shadow-2xl border border-white/15 transition-all"
      >
        {/* Dynamic Cursor Spotlight Refraction */}
        <div
          className="pointer-events-none absolute -inset-px opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background: `radial-gradient(520px circle at ${mousePos.x}% ${mousePos.y}%, rgba(20, 184, 166, 0.18), transparent 65%)`,
          }}
        />

        {/* Ambient Glass Orbs */}
        <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-teal-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 w-72 h-72 rounded-full bg-indigo-500/15 blur-3xl" />

        <div className="relative z-10 max-w-4xl">
          <div className="flex flex-wrap items-center gap-2 mb-3.5">
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-teal-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              <span>Senior Healthcare Systems Architecture</span>
            </span>
            <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/25 text-emerald-300 text-[11px] font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>v1.0 Production Spec</span>
            </span>
          </div>

          <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-teal-200 bg-clip-text text-transparent">
            DentaCore CRM — Texnik Topshiriq (SRS) & Arxitektura
          </h1>

          <p className="mt-2.5 text-slate-300/90 text-sm md:text-base leading-relaxed max-w-3xl">
            72 soat ichida production-ready MVP darajasida ishga tushirishga mo‘ljallangan to‘liq
            tizim spetsifikatsiyasi: Clean Architecture, PostgreSQL Exclusion Locking, SignalR
            jonli navbat va FDI 11–48 raqamli odontogramma.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={handleDownloadMd}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-400 hover:from-teal-300 hover:to-emerald-300 text-slate-950 font-bold text-xs md:text-sm shadow-lg shadow-teal-500/25 transition-all active:scale-[0.98] cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>ARCHITECTURE_AND_SRS.md Yuklab Olish</span>
            </button>

            <button
              onClick={handleCopyMd}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 backdrop-blur-md text-white font-semibold text-xs md:text-sm border border-white/15 transition-all active:scale-[0.98] cursor-pointer"
            >
              {copiedKey === 'srs' ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4 text-slate-300" />
              )}
              <span>{copiedKey === 'srs' ? 'Nusxalandi!' : 'Hujjatdan Nusxa Olish'}</span>
            </button>

            <div className="hidden sm:flex items-center space-x-2 text-xs text-slate-400 border-l border-white/15 pl-3.5">
              <Server className="w-3.5 h-3.5 text-teal-400" />
              <span>
                Spetsifikatsiya: <code className="text-teal-300 font-mono">/ARCHITECTURE_AND_SRS.md</code>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* macOS Glassmorphic Segmented Control */}
      <div className="inline-flex flex-wrap items-center gap-1 p-1.5 rounded-2xl bg-slate-200/70 backdrop-blur-xl border border-white/80 shadow-inner">
        {subTabs.map((tab) => {
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-900/5 scale-[1.01]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* SubTab 1: Overview */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500/15 to-emerald-500/15 border border-teal-500/20 text-teal-600 flex items-center justify-center mb-3.5">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">ASP.NET Core 8 Clean Architecture</h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                <code className="text-teal-700 font-mono bg-teal-50 px-1 rounded">Domain</code>,{' '}
                <code className="text-teal-700 font-mono bg-teal-50 px-1 rounded">Application</code>,{' '}
                <code className="text-teal-700 font-mono bg-teal-50 px-1 rounded">Infrastructure</code> va{' '}
                <code className="text-teal-700 font-mono bg-teal-50 px-1 rounded">WebAPI</code>. CQRS
                MediatR, FluentValidation va RFC 7807 ProblemDetails middleware.
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/15 to-sky-500/15 border border-indigo-500/20 text-indigo-600 flex items-center justify-center mb-3.5">
                <Database className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">PostgreSQL + JSONB Odontogram</h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                32 tishning har bir yuzasi (Occlusal, Mesial, Distal, Buccal, Lingual) holati va
                muolaja tarixi JSONB ustunida GIN index orqali saqlanadi.
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/15 to-orange-500/15 border border-amber-500/20 text-amber-600 flex items-center justify-center mb-3.5">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Zero-Collision Double-Booking Guard</h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                PostgreSQL <code className="text-amber-700 font-mono bg-amber-50 px-1 rounded">btree_gist</code>{' '}
                exclusion constraint orqali bitta shifokor uchun vaqt oraliqlari kesishishi baza
                darajasida taqiqlanadi.
              </p>
            </div>
          </div>

          {/* macOS Terminal Window for ASCII Architecture */}
          <div className="bg-slate-950/95 backdrop-blur-2xl rounded-2xl overflow-hidden border border-slate-800 shadow-xl">
            <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1.5">
                  <span className="w-3 h-3 rounded-full bg-rose-500/90" />
                  <span className="w-3 h-3 rounded-full bg-amber-400/90" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500/90" />
                </div>
                <span className="ml-2 text-xs font-mono text-slate-400 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-teal-400" />
                  <span>dentacore-architecture — zsh</span>
                </span>
              </div>

              <button
                onClick={() => handleCopySnippet('ascii', ASCII_ARCHITECTURE, 'Arxitektura sxemasi')}
                className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-[11px] font-mono border border-white/10 transition-colors cursor-pointer"
              >
                {copiedKey === 'ascii' ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                <span>{copiedKey === 'ascii' ? 'Nusxalandi' : 'Nusxa olish'}</span>
              </button>
            </div>

            <div className="p-5 overflow-x-auto">
              <pre className="text-[11px] md:text-xs font-mono text-teal-100/90 leading-snug">
                {ASCII_ARCHITECTURE}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* SubTab 2: Concurrency & Double Booking Simulator */}
      {activeSubTab === 'concurrency' && (
        <div className="space-y-5 bg-white/85 backdrop-blur-xl rounded-2xl p-6 border border-slate-200/80 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="max-w-2xl">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Lock className="w-5 h-5 text-amber-500" />
                <span>Double-Booking & Exclusion Constraint Simulyatsiyasi</span>
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Bir vaqtning o‘zida onlayn bemor va resepshn xodimi bitta shifokorning bir xil
                vaqtini (<code className="bg-slate-100 px-1.5 py-0.5 rounded text-amber-700 font-mono">14:00 - 14:30</code>)
                1 millisekund farq bilan band qilishga uringan holatni test qiling.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {raceLogs.length > 0 && !isSimulatingRace && (
                <button
                  onClick={clearRaceLogs}
                  className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Tozalash</span>
                </button>
              )}

              <button
                onClick={runRaceConditionSimulation}
                disabled={isSimulatingRace}
                className={`inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isSimulatingRace
                    ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white shadow-lg shadow-amber-500/25 active:scale-[0.98]'
                }`}
              >
                <Zap className={`w-4 h-4 ${isSimulatingRace ? 'animate-spin' : ''}`} />
                <span>
                  {isSimulatingRace ? 'Tranzaksiya ketmoqda...' : '1ms Poyga Holatini Sinash'}
                </span>
              </button>
            </div>
          </div>

          {/* Live Execution Terminal */}
          <div className="bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-inner">
            <div className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                <span className="ml-2">postgresql-isolation-monitor — SERIALIZABLE / GIST</span>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isSimulatingRace
                    ? 'bg-amber-500/20 text-amber-300'
                    : raceLogs.length > 0
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {isSimulatingRace ? 'RUNNING' : raceLogs.length > 0 ? 'COMPLETED' : 'READY'}
              </span>
            </div>

            <div className="p-4 font-mono text-xs min-h-[220px] max-h-[340px] overflow-y-auto">
              {raceLogs.length === 0 ? (
                <div className="text-slate-500 flex flex-col items-center justify-center h-40 text-center gap-2">
                  <Terminal className="w-6 h-6 text-slate-700" />
                  <span>
                    Simulyatsiyani boshlash uchun yuqoridagi tugmani bosing va ikkita parallel
                    so‘rovni ishga tushiring...
                  </span>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {raceLogs.map((log, idx) => (
                    <div
                      key={idx}
                      className="flex flex-wrap sm:flex-nowrap items-start gap-2 text-[11px] leading-relaxed"
                    >
                      <span className="text-slate-500 shrink-0">[{log.time}]</span>
                      <span
                        className={`px-2 py-0.5 rounded-md shrink-0 font-bold ${
                          log.status === 'success'
                            ? 'bg-emerald-950/90 text-emerald-400 border border-emerald-800/80'
                            : log.status === 'conflict'
                            ? 'bg-rose-950/90 text-rose-400 border border-rose-800/80'
                            : 'bg-slate-800 text-sky-400 border border-slate-700'
                        }`}
                      >
                        {log.source}
                      </span>
                      <span
                        className={
                          log.status === 'conflict'
                            ? 'text-rose-300 font-semibold'
                            : log.status === 'success'
                            ? 'text-emerald-200'
                            : 'text-slate-200'
                        }
                      >
                        {log.message}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="p-3.5 bg-amber-50/90 rounded-xl border border-amber-200/80 text-xs text-amber-950 flex items-start gap-2.5 leading-relaxed">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong>Arxitektura kafolati:</strong> PostgreSQL darajasidagi{' '}
              <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-amber-300">
                EXCLUDE USING gist
              </code>{' '}
              cheklovi sababli bitta shifokor vaqtiga ikki bemor yozilib qolmaydi. Ikkinchi so‘rovga
              RFC 7807 standartidagi <code className="font-mono">409 Conflict</code> javobi va eng
              yaqin bo‘sh slotlar qaytariladi.
            </div>
          </div>
        </div>
      )}

      {/* SubTab 3: ERD & DDL */}
      {activeSubTab === 'erd' && (
        <div className="space-y-5 bg-white/85 backdrop-blur-xl rounded-2xl p-6 border border-slate-200/80 shadow-xs">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Database className="w-5 h-5 text-sky-600" />
              <span>PostgreSQL Relyatsion Sxemasi va Jadvallar Tuzilishi</span>
            </h3>
            <p className="text-xs text-slate-600 mt-1">
              Barcha 8 ta asosiy jadval, GiST/GIN indekslar va ma’lumotlar yaxlitligi cheklovlari.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {[
              { name: 'Users', count: '10 ta ustun', desc: 'Xodimlar, shifokorlar, login va ranglar', badge: 'Auth & RBAC' },
              { name: 'DoctorSchedules', count: '8 ta ustun', desc: 'Hafta kunlari, smena va tushlik soatlari', badge: 'Scheduling' },
              { name: 'Patients', count: '9 ta ustun', desc: 'Bemorlar bazasi, +998 unikal indeks, qarz balansi', badge: 'EMR Core' },
              { name: 'Appointments', count: '11 ta ustun', desc: 'Qabullar, vaqt oraligʻi, exclusion constraint', badge: 'Zero-Collision' },
              { name: 'TreatmentRecords', count: '7 ta ustun', desc: 'Anamnez va JSONB Odontogram (GIN index)', badge: 'FDI 11-48' },
              { name: 'Services', count: '5 ta ustun', desc: 'Xizmatlar preyskuranti va davomiyligi', badge: 'Catalog' },
              { name: 'Invoices', count: '8 ta ustun', desc: 'Jami narx, chegirma, toʻlangan va qarz', badge: 'Billing' },
              { name: 'Payments', count: '6 ta ustun', desc: 'Naqd, Uzcard, Humo, Click, Payme', badge: 'Transactions' },
            ].map((tbl, i) => (
              <div
                key={i}
                className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/70 hover:bg-white hover:shadow-sm transition-all"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-xs text-slate-900 font-mono">{tbl.name}</span>
                  <span className="text-[10px] bg-sky-100/80 text-sky-700 font-semibold px-2 py-0.5 rounded-full">
                    {tbl.badge}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-1.5 leading-snug">{tbl.desc}</p>
                <div className="text-[10px] text-slate-400 mt-2.5 font-mono">{tbl.count}</div>
              </div>
            ))}
          </div>

          {/* DDL Code Window */}
          <div className="bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-lg">
            <div className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                <span className="ml-2 text-slate-300">001_init_appointments_gist.sql</span>
              </div>

              <button
                onClick={() => handleCopySnippet('ddl', POSTGRES_DDL_SCRIPT, 'PostgreSQL DDL skripti')}
                className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-[11px] border border-white/10 transition-colors cursor-pointer"
              >
                {copiedKey === 'ddl' ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                <span>{copiedKey === 'ddl' ? 'Nusxalandi' : 'SQL Nusxa olish'}</span>
              </button>
            </div>

            <div className="p-4 overflow-x-auto">
              <pre className="text-[11px] md:text-xs font-mono leading-relaxed text-teal-300">
                {POSTGRES_DDL_SCRIPT}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* SubTab 4: Sprint Plan */}
      {activeSubTab === 'sprint' && (
        <div className="space-y-5 bg-white/85 backdrop-blur-xl rounded-2xl p-6 border border-slate-200/80 shadow-xs">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-600" />
              <span>72 Soatlik (3 Kunlik) Solo-Sprint Ijro Xaritasi</span>
            </h3>
            <p className="text-xs text-slate-600 mt-1">
              MVP versiyani 3 kun ichida noldan ishlab chiqish va deploy qilish bo‘yicha bosqichma-bosqich
              reja.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                day: '1-KUN (00:00 – 24:00)',
                tag: 'Core Backend & DB',
                tagStyle: 'bg-teal-100 text-teal-800',
                checkColor: 'text-teal-600',
                tasks: [
                  'Clean Architecture qatlamlari va DI',
                  'PostgreSQL 16 + btree_gist migratsiyasi',
                  'SlotCalculationEngine (30/60 min slotlar)',
                  'Telefon (+998) idempotent bemor servisi',
                  'Public Booking API va Swagger hujjati',
                ],
              },
              {
                day: '2-KUN (24:00 – 48:00)',
                tag: 'CRM Logic & SignalR',
                tagStyle: 'bg-indigo-100 text-indigo-800',
                checkColor: 'text-indigo-600',
                tasks: [
                  'Appointments CRUD & Status pipeline',
                  'SignalR ClinicHub (StatusChanged, NewBooking)',
                  'FDI 11–48 JSONB Odontogram API',
                  'Invoices & Payments (Avans va qarz hisobi)',
                  'Kunlik kassa va shifokor ulushi hisoboti',
                ],
              },
              {
                day: '3-KUN (48:00 – 72:00)',
                tag: 'macOS UI & Docker',
                tagStyle: 'bg-emerald-100 text-emerald-800',
                checkColor: 'text-emerald-600',
                tasks: [
                  'Onlayn Bron 3-qadamli Wizard',
                  'Interaktiv Kalendar Grid (Multi-Doctor)',
                  'Interaktiv Tish Formulasi (SVG, 32 tish)',
                  'Kassa paneli va qarzdorlar nazorati',
                  'Docker Compose bilan production yigʻish',
                ],
              },
            ].map((sprint, idx) => (
              <div
                key={idx}
                className="border border-slate-200/80 rounded-2xl p-4 bg-slate-50/70 hover:bg-white hover:shadow-sm transition-all"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
                  <span className="font-bold text-xs text-slate-900">{sprint.day}</span>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${sprint.tagStyle}`}>
                    {sprint.tag}
                  </span>
                </div>
                <ul className="mt-3.5 space-y-2.5 text-xs text-slate-700">
                  {sprint.tasks.map((task, tIdx) => (
                    <li key={tIdx} className="flex items-start gap-2">
                      <CheckCircle2 className={`w-4 h-4 ${sprint.checkColor} shrink-0 mt-0.5`} />
                      <span>{task}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};