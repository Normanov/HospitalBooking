import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  CalendarCheck2,
  Check,
  Clock3,
  HeartPulse,
  LoaderCircle,
  Menu,
  ShieldCheck,
  Sparkles,
  Star,
  Stethoscope,
  X,
} from 'lucide-react';
import { apiRequest } from '../lib/api';

interface LandingDoctor {
  id: string;
  fullName: string;
  specialty: string;
  experienceYears: number;
  rating: number;
}

interface LandingService {
  id: string;
  name: string;
  category: string;
  price: number;
  durationMinutes: number;
  description: string;
}

interface ClientLandingProps {
  onBook: () => void;
  onLogin: () => void;
  onRegister: () => void;
  onAdminLogin: () => void;
}

export const ClientLanding: React.FC<ClientLandingProps> = ({
  onBook,
  onLogin,
  onRegister,
  onAdminLogin,
}) => {
  const [doctors, setDoctors] = useState<LandingDoctor[]>([]);
  const [services, setServices] = useState<LandingService[]>([]);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [loadingCatalog, setLoadingCatalog] = useState(true);

  // UI-only states for 3D spatial tilt and mobile navigation
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [heroTilt, setHeroTilt] = useState({ rotateX: 0, rotateY: 0 });

  useEffect(() => {
    Promise.all([
      apiRequest<LandingDoctor[]>('/api/v1/public/doctors'),
      apiRequest<LandingService[]>('/api/v1/public/services'),
    ])
      .then(([doctorRows, serviceRows]) => {
        setDoctors(doctorRows);
        setServices(serviceRows);
      })
      .catch((error: unknown) => {
        setCatalogError(error instanceof Error ? error.message : 'Klinika ma’lumotlarini yuklab bo‘lmadi.');
      })
      .finally(() => setLoadingCatalog(false));
  }, []);

  const handleHeroMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    setHeroTilt({
      rotateX: Number((-y * 12).toFixed(2)),
      rotateY: Number((x * 14).toFixed(2)),
    });
  };

  const handleHeroMouseLeave = () => {
    setHeroTilt({ rotateX: 0, rotateY: 0 });
  };

  return (
    <main className="relative min-h-[100dvh] w-full overflow-x-hidden bg-gradient-to-br from-[#F4F8FA] via-[#EBF5F5] to-[#E6F1F8] text-slate-900 selection:bg-teal-500/20 selection:text-teal-950">
      <style>{`
        @keyframes dcAuroraDrift1 {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(32px, -24px, 0) scale(1.08); }
        }
        @keyframes dcAuroraDrift2 {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(-28px, 26px, 0) scale(1.06); }
        }
        @keyframes dcSpin3DOrbitA {
          0% { transform: rotateX(68deg) rotateY(-18deg) rotateZ(0deg); }
          100% { transform: rotateX(68deg) rotateY(-18deg) rotateZ(360deg); }
        }
        @keyframes dcSpin3DOrbitB {
          0% { transform: rotateX(62deg) rotateY(24deg) rotateZ(360deg); }
          100% { transform: rotateX(62deg) rotateY(24deg) rotateZ(0deg); }
        }
        @keyframes dcSpin3DCore {
          0% { transform: translateZ(34px) rotateY(0deg) rotateX(6deg); }
          50% { transform: translateZ(46px) rotateY(180deg) rotateX(-6deg); }
          100% { transform: translateZ(34px) rotateY(360deg) rotateX(6deg); }
        }
        @keyframes dcFloat3DBadge {
          0%, 100% { transform: translate3d(0, 0, 52px); }
          50% { transform: translate3d(0, -8px, 64px); }
        }
        @keyframes dcFloat3DBadgeAlt {
          0%, 100% { transform: translate3d(0, 0, 44px); }
          50% { transform: translate3d(0, 7px, 56px); }
        }
        @keyframes dcFadeUp3D {
          0% {
            opacity: 0;
            transform: perspective(900px) translate3d(0, 22px, -20px) rotateX(6deg);
          }
          100% {
            opacity: 1;
            transform: perspective(900px) translate3d(0, 0, 0) rotateX(0deg);
          }
        }
        .dc-aurora-1 { animation: dcAuroraDrift1 15s ease-in-out infinite; }
        .dc-aurora-2 { animation: dcAuroraDrift2 18s ease-in-out infinite; }
        .dc-orbit-a {
          transform-style: preserve-3d;
          animation: dcSpin3DOrbitA 14s linear infinite;
        }
        .dc-orbit-b {
          transform-style: preserve-3d;
          animation: dcSpin3DOrbitB 19s linear infinite;
        }
        .dc-core-3d {
          transform-style: preserve-3d;
          animation: dcSpin3DCore 16s ease-in-out infinite;
        }
        .dc-badge-float-1 {
          animation: dcFloat3DBadge 5.5s ease-in-out infinite;
        }
        .dc-badge-float-2 {
          animation: dcFloat3DBadgeAlt 6.5s ease-in-out infinite;
        }
        .dc-reveal-3d {
          animation: dcFadeUp3D 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .dc-preserve-3d {
          transform-style: preserve-3d;
        }
      `}</style>

      {/* Ambient Aurora Mesh Background */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="dc-aurora-1 absolute -top-28 -left-24 h-80 w-80 sm:h-[28rem] sm:w-[28rem] rounded-full bg-gradient-to-tr from-teal-400/25 via-emerald-300/20 to-cyan-300/20 blur-3xl" />
        <div className="dc-aurora-2 absolute top-1/3 -right-28 h-80 w-80 sm:h-[30rem] sm:w-[30rem] rounded-full bg-gradient-to-bl from-cyan-400/20 via-sky-300/20 to-indigo-300/15 blur-3xl" />
        <div className="dc-aurora-1 absolute -bottom-32 left-1/4 h-72 w-72 sm:h-96 sm:w-96 rounded-full bg-teal-300/20 blur-3xl" />
      </div>

      {/* Floating macOS Glass Navigation Header */}
      <header className="sticky top-0 z-40 border-b border-white/70 bg-white/65 backdrop-blur-2xl backdrop-saturate-150 transition-all">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-3 min-[375px]:px-4 sm:px-8 sm:py-4">
          <a
            href="#"
            className="group flex items-center gap-2.5 shrink-0"
            aria-label="DentaCore bosh sahifa"
          >
            <span className="relative flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl sm:rounded-2xl bg-gradient-to-br from-teal-600 via-teal-500 to-cyan-500 text-white shadow-lg shadow-teal-600/25 transition-transform duration-500 group-hover:[transform:rotateY(180deg)]">
              <Stethoscope className="h-4 w-4 sm:h-5 sm:w-5" />
            </span>
            <span className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900">
              Denta<span className="text-teal-700">Core</span>
            </span>
          </a>

          <nav
            className="hidden items-center gap-7 lg:gap-9 text-sm font-semibold text-slate-600 md:flex"
            aria-label="Asosiy navigatsiya"
          >
            <a className="relative py-1 transition-colors hover:text-teal-700" href="#services">
              Xizmatlar
            </a>
            <a className="relative py-1 transition-colors hover:text-teal-700" href="#doctors">
              Shifokorlar
            </a>
            <a className="relative py-1 transition-colors hover:text-teal-700" href="#about">
              Klinika haqida
            </a>
          </nav>

          <div className="flex items-center gap-1.5 min-[375px]:gap-2 sm:gap-2.5">
            <button
              onClick={onAdminLogin}
              className="hidden rounded-xl border border-slate-200/70 bg-white/50 px-3 py-2 text-xs lg:text-sm font-bold text-slate-700 backdrop-blur-md transition hover:bg-white hover:text-slate-950 md:inline-flex"
            >
              Xodimlar paneli
            </button>
            <button
              onClick={onLogin}
              className="hidden rounded-xl px-2.5 py-2 sm:px-3.5 text-xs sm:text-sm font-bold text-slate-700 transition hover:bg-white/80 hover:text-slate-950 min-[481px]:inline-flex"
            >
              Kirish
            </button>
            <button
              onClick={onBook}
              className="group relative inline-flex shrink-0 items-center justify-center whitespace-nowrap overflow-hidden rounded-xl bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 px-2.5 py-2.5 min-[375px]:px-3 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-slate-900/15 transition-all duration-300 hover:shadow-teal-900/25 hover:brightness-110 active:scale-[0.98]"
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full"
              />
              <span className="min-[360px]:hidden">Qabul</span>
              <span className="hidden min-[360px]:inline">Qabulga yozilish</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Menyuni ochish"
              aria-expanded={mobileMenuOpen}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 bg-white/70 text-slate-700 backdrop-blur-md transition hover:bg-white md:hidden"
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Glass Drawer */}
        {mobileMenuOpen && (
          <div className="border-t border-white/70 bg-white/85 px-4 py-4 backdrop-blur-2xl md:hidden">
            <nav className="flex flex-col gap-2 text-sm font-semibold text-slate-700" aria-label="Mobil navigatsiya">
              <a
                href="#services"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-xl px-3 py-2.5 transition hover:bg-teal-500/10 hover:text-teal-800"
              >
                Xizmatlar
              </a>
              <a
                href="#doctors"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-xl px-3 py-2.5 transition hover:bg-teal-500/10 hover:text-teal-800"
              >
                Shifokorlar
              </a>
              <a
                href="#about"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-xl px-3 py-2.5 transition hover:bg-teal-500/10 hover:text-teal-800"
              >
                Klinika haqida
              </a>
              <div className="my-1 h-px bg-slate-200/70" />
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onLogin();
                }}
                className="w-full rounded-xl px-3 py-2.5 text-left font-bold text-slate-800 transition hover:bg-white"
              >
                Bemorlar kirishi
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onAdminLogin();
                }}
                className="w-full rounded-xl bg-teal-500/10 px-3 py-2.5 text-left font-bold text-teal-900 transition hover:bg-teal-500/20"
              >
                Xodimlar paneli (Admin CRM)
              </button>
            </nav>
          </div>
        )}
      </header>

      {/* Hero Section with Spatial 3D Interactive Stage */}
      <section className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-4 pb-16 pt-8 min-[375px]:px-5 sm:px-8 sm:pt-14 lg:grid-cols-[1.06fr_.94fr] lg:pb-24">
        <div className="dc-reveal-3d relative z-10">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/70 px-3.5 py-1.5 text-[11px] sm:text-xs font-bold tracking-wider text-teal-800 shadow-xs backdrop-blur-xl">
            <Sparkles className="h-3.5 w-3.5 text-teal-600 animate-spin" style={{ animationDuration: '9s' }} />
            <span>ZAMONAVIY STOMATOLOGIYA</span>
          </div>

          <h1 className="max-w-2xl text-[29px] min-[375px]:text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-950 sm:text-5xl lg:text-[58px]">
            Sog‘lom tabassum —{' '}
            <span className="bg-gradient-to-r from-teal-700 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
              ishonchli parvarish
            </span>{' '}
            bilan.
          </h1>

          <p className="mt-5 max-w-xl text-sm min-[375px]:text-base leading-relaxed text-slate-600 sm:text-lg">
            Tajribali mutaxassislar, zamonaviy yondashuv va qulay qabul vaqti. Klinikamiz bilan tanishing va o‘zingizga mos qabulni onlayn tanlang.
          </p>

          <div className="mt-7 sm:mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={onBook}
              className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 px-6 py-3.5 text-sm font-bold text-white shadow-xl shadow-slate-900/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-teal-900/25 active:scale-[0.98]"
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 group-hover:translate-x-full"
              />
              <CalendarCheck2 className="h-4 w-4 text-teal-300" />
              <span>Qabulga yozilish</span>
              <ArrowRight className="h-4 w-4 text-teal-300 transition-transform duration-200 group-hover:translate-x-1" />
            </button>

            <button
              onClick={onRegister}
              className="rounded-2xl border border-white/85 bg-white/70 px-6 py-3.5 text-sm font-bold text-slate-800 shadow-sm backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-md active:scale-[0.98]"
            >
              Bemor kabinetini ochish
            </button>
          </div>

          <div className="mt-7 sm:mt-8 flex flex-wrap gap-x-5 gap-y-2.5 text-xs font-semibold text-slate-600">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/55 px-3 py-1.5 backdrop-blur-md border border-white/70">
              <Check className="h-3.5 w-3.5 text-teal-700" /> Oson onlayn yozilish
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/55 px-3 py-1.5 backdrop-blur-md border border-white/70">
              <Check className="h-3.5 w-3.5 text-teal-700" /> Shaxsiy kabinet
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/55 px-3 py-1.5 backdrop-blur-md border border-white/70">
              <Check className="h-3.5 w-3.5 text-teal-700" /> Maxfiy ma’lumotlar
            </span>
          </div>
        </div>

        {/* 3D Interactive Spatial Showcase Card */}
        <div
          className="relative mx-auto w-full max-w-lg pb-6 sm:pb-0 [perspective:1300px]"
          onMouseMove={handleHeroMouseMove}
          onMouseLeave={handleHeroMouseLeave}
        >
          {/* Ambient 3D Back Glow */}
          <div
            aria-hidden="true"
            className="absolute -inset-6 rounded-[3rem] bg-gradient-to-br from-teal-300/35 via-cyan-200/30 to-indigo-200/25 blur-2xl"
          />

          {/* 3D Rotating Tilted Card */}
          <div
            style={{
              transform: `rotateX(${heroTilt.rotateX}deg) rotateY(${heroTilt.rotateY}deg)`,
            }}
            className="dc-preserve-3d relative rounded-[28px] sm:rounded-[34px] border border-white/50 bg-gradient-to-br from-[#0B3B3C] via-[#0F5254] to-[#0E7490] p-6 sm:p-10 text-white shadow-[0_30px_70px_-15px_rgba(13,61,63,0.45)] transition-transform duration-300 ease-out"
          >
            {/* Top Glass Specular Highlight */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent"
            />

            {/* 3D Gyroscopic Orbital Rings in Top-Right */}
            <div
              aria-hidden="true"
              className="dc-preserve-3d pointer-events-none absolute -right-8 -top-8 h-48 w-48 sm:h-60 sm:w-60 opacity-85"
            >
              <div className="dc-orbit-a absolute inset-3 rounded-full border-2 border-teal-200/30 shadow-[0_0_25px_rgba(94,234,212,0.25)]" />
              <div className="dc-orbit-b absolute inset-8 rounded-full border border-dashed border-cyan-100/40" />
              <div className="dc-orbit-a absolute inset-14 rounded-full border border-white/30" />
            </div>

            <div className="dc-preserve-3d relative flex min-h-[300px] sm:min-h-[350px] flex-col justify-between">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3.5 py-1.5 text-xs font-semibold backdrop-blur-md">
                  <span className="h-2 w-2 rounded-full bg-emerald-300 animate-pulse" />
                  DentaCore Care
                </span>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md">
                  <HeartPulse className="h-5 w-5 text-teal-100" />
                </div>
              </div>

              {/* 3D Spinning Levitating Emblem */}
              <div className="my-5 sm:my-6">
                <div className="dc-core-3d mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/35 bg-gradient-to-br from-white/25 to-white/5 shadow-[0_15px_35px_rgba(0,0,0,0.25)] backdrop-blur-xl">
                  <Stethoscope className="h-8 w-8 text-white drop-shadow" />
                </div>
                <p className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-teal-200">
                  Sizga mos parvarish
                </p>
                <h2 className="mt-1.5 max-w-sm text-2xl sm:text-3xl font-extrabold leading-tight">
                  Har bir tabassumga e’tibor.
                </h2>
                <p className="mt-2.5 max-w-sm text-xs sm:text-sm leading-relaxed text-teal-50/90">
                  Davolash rejasi va xizmatlar haqida klinika mutaxassislaridan ma’lumot oling.
                </p>
              </div>

              <div className="flex items-center gap-2.5 border-t border-white/20 pt-4 text-xs text-teal-50">
                <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-300" />
                <span>Bemor ma’lumotlari xavfsiz saqlanadi</span>
              </div>
            </div>

            {/* 3D Pop-Out Floating Glass Pill (Top Right on Desktop) */}
            <div className="dc-badge-float-2 mac-glass hidden sm:flex absolute -right-6 top-20 items-center gap-2.5 rounded-2xl border border-white/85 bg-white/80 px-3.5 py-2.5 text-slate-900 shadow-xl backdrop-blur-2xl">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-500/15 text-teal-700">
                <Sparkles className="h-4 w-4" />
              </span>
              <div className="text-left">
                <span className="block text-[11px] font-extrabold text-slate-900">100% Raqamli</span>
                <span className="block text-[10px] font-medium text-slate-500">Tezkor navbat</span>
              </div>
            </div>

            {/* 3D Pop-Out Floating Glass Pill (Bottom Left) */}
            <div className="dc-badge-float-1 mac-glass absolute -bottom-5 left-3 right-3 sm:right-auto sm:-left-8 flex items-center gap-3 rounded-2xl border border-white/85 bg-white/80 px-3.5 py-3 text-slate-900 shadow-[0_20px_40px_-12px_rgba(15,23,42,0.18)] backdrop-blur-2xl">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-100 to-amber-50 text-amber-600 border border-amber-200/60">
                <Clock3 className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-extrabold text-slate-900">
                  Qulay vaqtni tanlang
                </span>
                <span className="mt-0.5 block truncate text-[11px] text-slate-500">
                  Onlayn jadvaldan band qiling
                </span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section with 3D Perspective Cards */}
      <section
        id="services"
        className="relative z-10 scroll-mt-20 border-y border-white/75 bg-white/45 py-14 sm:py-20 backdrop-blur-xl"
      >
        <div className="mx-auto max-w-7xl px-4 min-[375px]:px-5 sm:px-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-teal-700">
                Xizmatlar
              </p>
              <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950">
                Sizga kerakli yordam
              </h2>
            </div>
            <button
              onClick={onBook}
              className="group inline-flex items-center gap-2 self-start rounded-full border border-teal-600/20 bg-white/75 px-4 py-2 text-xs sm:text-sm font-bold text-teal-800 shadow-2xs backdrop-blur-md transition hover:bg-white hover:text-teal-950 sm:self-auto"
            >
              <span>Qabul vaqtini tanlash</span>
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
            </button>
          </div>

          {catalogError && (
            <p
              role="alert"
              className="mt-6 rounded-2xl border border-rose-200/90 bg-rose-50/85 p-4 text-xs sm:text-sm text-rose-800 backdrop-blur-md"
            >
              Xizmatlar ro‘yxatini yuklab bo‘lmadi: {catalogError}
            </p>
          )}

          {loadingCatalog ? (
            <div className="mt-8 flex items-center gap-2.5 text-sm font-medium text-slate-600" role="status">
              <LoaderCircle className="h-4 w-4 animate-spin text-teal-600" />
              <span>Xizmatlar yuklanmoqda...</span>
            </div>
          ) : services.length ? (
            <div className="mt-8 grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3 [perspective:1100px]">
              {services.slice(0, 6).map((service, idx) => (
                <article
                  key={service.id}
                  style={{ animationDelay: `${idx * 70}ms` }}
                  className="mac-glass dc-reveal-3d group relative overflow-hidden rounded-2xl sm:rounded-3xl border border-white/85 bg-white/65 p-5 sm:p-6 shadow-[0_14px_34px_-12px_rgba(15,23,42,0.08)] backdrop-blur-2xl transition-all duration-300 ease-out hover:-translate-y-1.5 hover:[transform:translateY(-6px)_rotateX(3deg)_rotateY(-3deg)] hover:bg-white/85 hover:shadow-[0_24px_48px_-14px_rgba(13,148,136,0.18)]"
                >
                  {/* Specular Top Edge */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent"
                  />
                  {/* Hover Light Sweep */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-teal-400/10 to-transparent transition-transform duration-700 group-hover:translate-x-full"
                  />

                  <span className="inline-flex rounded-full border border-teal-500/20 bg-teal-500/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-teal-800">
                    {service.category}
                  </span>
                  <h3 className="mt-3 text-base sm:text-lg font-extrabold text-slate-900 group-hover:text-teal-900 transition-colors">
                    {service.name}
                  </h3>
                  <p className="mt-2 min-h-10 text-xs sm:text-sm leading-relaxed text-slate-600">
                    {service.description}
                  </p>
                  <div className="mt-5 flex items-center justify-between border-t border-slate-200/70 pt-4 text-xs sm:text-sm">
                    <span className="font-extrabold text-slate-900">
                      {formatMoney(service.price)}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100/80 px-2.5 py-1 text-xs font-semibold text-slate-600">
                      <Clock3 className="h-3.5 w-3.5 text-teal-700" />
                      {service.durationMinutes} daqiqa
                    </span>
                  </div>
                </article>
              ))}
            </div>
          ) : !catalogError ? (
            <p className="mt-8 rounded-2xl border border-dashed border-slate-300/80 bg-white/60 p-6 text-sm text-slate-600 backdrop-blur-md">
              Xizmatlar ro‘yxati hozircha mavjud emas. Tafsilotlarni klinika administratoridan oling.
            </p>
          ) : null}
        </div>
      </section>

      {/* Doctors Section with 3D Rotating Emblem Halos */}
      <section id="doctors" className="relative z-10 scroll-mt-20 py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 min-[375px]:px-5 sm:px-8">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-teal-700">
            Mutaxassislar
          </p>
          <div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950">
              Sizning parvarishingiz — mutaxassislar qo‘lida
            </h2>
            <button
              onClick={onBook}
              className="group inline-flex items-center gap-2 self-start rounded-xl bg-gradient-to-r from-slate-900 to-teal-950 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg sm:self-auto"
            >
              <span>Shifokor tanlash</span>
              <ArrowRight className="h-4 w-4 text-teal-300 transition-transform duration-200 group-hover:translate-x-1" />
            </button>
          </div>

          {loadingCatalog ? null : doctors.length ? (
            <div className="mt-8 grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3 [perspective:1100px]">
              {doctors.slice(0, 6).map((doctor, idx) => (
                <article
                  key={doctor.id}
                  style={{ animationDelay: `${idx * 70}ms` }}
                  className="mac-glass dc-reveal-3d group relative flex items-center gap-4 rounded-2xl sm:rounded-3xl border border-white/85 bg-white/65 p-4 sm:p-5 shadow-[0_14px_34px_-12px_rgba(15,23,42,0.08)] backdrop-blur-2xl transition-all duration-300 ease-out hover:-translate-y-1.5 hover:[transform:translateY(-6px)_rotateX(3deg)_rotateY(3deg)] hover:bg-white/90 hover:shadow-[0_24px_48px_-14px_rgba(13,148,136,0.18)]"
                >
                  {/* 3D Spinning Ring Around Doctor Avatar */}
                  <div className="relative flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center">
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 rounded-2xl border border-dashed border-teal-500/40 transition-transform duration-700 group-hover:rotate-180 group-hover:scale-110"
                    />
                    <div className="relative flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500/20 via-cyan-500/15 to-white text-teal-800 border border-white/80 shadow-xs transition-transform duration-500 group-hover:[transform:rotateY(180deg)]">
                      <Stethoscope className="h-6 w-6" />
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm sm:text-base font-extrabold text-slate-900">
                      {doctor.fullName}
                    </h3>
                    <p className="mt-0.5 truncate text-xs sm:text-sm font-semibold text-teal-700">
                      {doctor.specialty}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] sm:text-xs text-slate-500">
                      <span>{doctor.experienceYears} yil tajriba</span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1 font-bold text-amber-600">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        {doctor.rating.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : !catalogError ? (
            <p className="mt-8 rounded-2xl border border-dashed border-slate-300/80 bg-white/60 p-6 text-sm text-slate-600 backdrop-blur-md">
              Shifokorlar ro‘yxati hozircha mavjud emas.
            </p>
          ) : null}
        </div>
      </section>

      {/* Spatial 3D Call-To-Action Banner */}
      <section id="about" className="relative z-10 px-4 pb-16 min-[375px]:px-5 sm:px-8 sm:pb-20">
        <div className="relative mx-auto flex max-w-7xl flex-col justify-between gap-6 overflow-hidden rounded-[28px] sm:rounded-[36px] border border-white/20 bg-gradient-to-br from-slate-950 via-[#0C2E30] to-teal-950 p-6 sm:p-11 text-white shadow-[0_30px_70px_-15px_rgba(15,23,42,0.4)] sm:flex-row sm:items-center">
          {/* 3D Rotating Decorative Rings Inside Banner */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -bottom-24 h-72 w-72 sm:h-96 sm:w-96 opacity-30 [perspective:900px]"
          >
            <div className="dc-orbit-a absolute inset-0 rounded-full border-2 border-teal-400/50" />
            <div className="dc-orbit-b absolute inset-10 rounded-full border border-cyan-300/40" />
          </div>

          <div className="relative z-10 max-w-xl">
            <p className="inline-flex items-center gap-1.5 rounded-full border border-teal-400/30 bg-teal-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-teal-300">
              Keyingi qadam
            </p>
            <h2 className="mt-3 text-xl min-[375px]:text-2xl font-extrabold leading-tight sm:text-3xl lg:text-4xl">
              Sog‘lom tabassum sari bugun qadam qo‘ying.
            </h2>
            <p className="mt-2.5 text-xs sm:text-sm leading-relaxed text-slate-300">
              Qulay vaqtni tanlang yoki shaxsiy kabinetingizga kiring.
            </p>
          </div>

          <div className="relative z-10 flex flex-col gap-3 sm:min-w-56">
            <button
              onClick={onBook}
              className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-r from-teal-400 to-emerald-400 px-5 py-3.5 text-xs sm:text-sm font-extrabold text-slate-950 shadow-lg shadow-teal-500/25 transition-all duration-300 hover:-translate-y-0.5 hover:brightness-105 active:scale-[0.98]"
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover:translate-x-full"
              />
              <span>Qabulga yozilish</span>
            </button>
            <button
              onClick={onLogin}
              className="rounded-xl sm:rounded-2xl border border-white/25 bg-white/10 px-5 py-3.5 text-xs sm:text-sm font-bold text-white backdrop-blur-md transition hover:bg-white/20 active:scale-[0.98]"
            >
              Shaxsiy kabinetga kirish
            </button>
          </div>
        </div>
      </section>

      {/* Frosted Glass Footer */}
      <footer className="relative z-10 border-t border-white/75 bg-white/50 px-4 py-6 text-center sm:text-left text-xs text-slate-600 backdrop-blur-xl sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 sm:flex-row">
          <span>
            © {new Date().getFullYear()} DentaCore · Klinikaga murojaat qilish uchun administrator bilan bog‘laning.
          </span>
          <button
            onClick={onAdminLogin}
            className="font-bold text-teal-800 transition hover:text-teal-950"
          >
            Xodimlar uchun Admin CRM kirishi
          </button>
        </div>
      </footer>
    </main>
  );
};

function formatMoney(value: number): string {
  return `${new Intl.NumberFormat('uz-UZ').format(value)} so‘m`;
}