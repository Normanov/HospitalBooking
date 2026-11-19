import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Activity,
  CalendarDays,
  FileCode2,
  Globe2,
  Receipt,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { UserRole } from '../types/dentacore';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentRole: UserRole;
  pendingCount: number;
}

interface RoleStyleConfig {
  label: string;
  shortLabel: string;
  badge: string;
  dotColor: string;
  auroraGlow: string;
  activeAccent: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  currentRole,
  pendingCount,
}) => {
  const roleLabels: Record<UserRole, RoleStyleConfig> = {
    SuperAdmin: {
      label: 'Bosh Shifokor / Admin',
      shortLabel: 'Super Admin',
      badge:
        'bg-gradient-to-r from-rose-500/12 via-amber-500/10 to-rose-500/12 text-rose-700 border-rose-300/70 shadow-rose-500/10',
      dotColor: 'bg-rose-500',
      auroraGlow: 'from-rose-400/20 via-amber-300/15 to-teal-400/20',
      activeAccent: 'text-rose-400',
    },
    Receptionist: {
      label: 'Registratura (Resepshn)',
      shortLabel: 'Resepshn',
      badge:
        'bg-gradient-to-r from-emerald-500/12 via-teal-500/12 to-cyan-500/12 text-emerald-700 border-emerald-300/70 shadow-emerald-500/10',
      dotColor: 'bg-emerald-500',
      auroraGlow: 'from-emerald-400/20 via-teal-300/20 to-cyan-400/20',
      activeAccent: 'text-emerald-400',
    },
    Doctor: {
      label: 'Shifokor',
      shortLabel: 'Shifokor',
      badge:
        'bg-gradient-to-r from-sky-500/12 via-cyan-500/12 to-teal-500/12 text-sky-700 border-sky-300/70 shadow-sky-500/10',
      dotColor: 'bg-sky-500',
      auroraGlow: 'from-sky-400/20 via-cyan-300/20 to-teal-400/20',
      activeAccent: 'text-cyan-400',
    },
    Patient: {
      label: 'Bemor',
      shortLabel: 'Bemor',
      badge:
        'bg-gradient-to-r from-amber-500/12 via-orange-500/10 to-teal-500/12 text-amber-700 border-amber-300/70 shadow-amber-500/10',
      dotColor: 'bg-amber-500',
      auroraGlow: 'from-amber-400/20 via-teal-300/15 to-cyan-400/20',
      activeAccent: 'text-amber-300',
    },
  };

  const navItems = [
    { id: 'spec', label: 'SRS & Arxitektura', icon: FileCode2, badge: 'MD Spec' },
    { id: 'calendar', label: 'Kalendar & Navbat', icon: CalendarDays, count: pendingCount },
    { id: 'odontogram', label: 'Tish Formulasi (FDI)', icon: Activity, badge: '11-48' },
    { id: 'booking', label: 'Onlayn Bron Portal', icon: Globe2, badge: 'Public' },
    { id: 'patients', label: 'Bemorlar (EMR)', icon: Users },
    { id: 'billing', label: 'Kassa & Moliya', icon: Receipt },
  ];

  // UI-only refs & state for 3D sliding dock pill & pointer glass refraction
  const headerRef = useRef<HTMLElement | null>(null);
  const desktopNavRef = useRef<HTMLElement | null>(null);
  const desktopBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const mobileNavRef = useRef<HTMLDivElement | null>(null);
  const mobileBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const [desktopPill, setDesktopPill] = useState<{
    left: number;
    width: number;
    ready: boolean;
  }>({ left: 0, width: 0, ready: false });

  const [mobilePill, setMobilePill] = useState<{
    left: number;
    width: number;
    ready: boolean;
  }>({ left: 0, width: 0, ready: false });

  const [spotlight, setSpotlight] = useState<{
    x: number;
    y: number;
    visible: boolean;
  }>({ x: 50, y: 50, visible: false });

  const updatePillMetrics = useCallback(() => {
    const dBtn = desktopBtnRefs.current[activeTab];
    if (dBtn && dBtn.offsetWidth > 0) {
      setDesktopPill({
        left: dBtn.offsetLeft,
        width: dBtn.offsetWidth,
        ready: true,
      });
    } else {
      setDesktopPill((prev) => (prev.ready ? { ...prev, ready: false } : prev));
    }

    const mBtn = mobileBtnRefs.current[activeTab];
    if (mBtn && mBtn.offsetWidth > 0) {
      setMobilePill({
        left: mBtn.offsetLeft,
        width: mBtn.offsetWidth,
        ready: true,
      });
    } else {
      setMobilePill((prev) => (prev.ready ? { ...prev, ready: false } : prev));
    }
  }, [activeTab]);

  useEffect(() => {
    updatePillMetrics();

    const activeMobileBtn = mobileBtnRefs.current[activeTab];
    if (activeMobileBtn && typeof activeMobileBtn.scrollIntoView === 'function') {
      activeMobileBtn.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [activeTab, pendingCount, updatePillMetrics]);

  useEffect(() => {
    const handleResize = () => updatePillMetrics();
    window.addEventListener('resize', handleResize);

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => updatePillMetrics());
      if (desktopNavRef.current) observer.observe(desktopNavRef.current);
      if (mobileNavRef.current) observer.observe(mobileNavRef.current);
      Object.values(desktopBtnRefs.current).forEach((el) => el && observer?.observe(el));
      Object.values(mobileBtnRefs.current).forEach((el) => el && observer?.observe(el));
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      observer?.disconnect();
    };
  }, [updatePillMetrics]);

  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    const rect = headerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setSpotlight({
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
      visible: true,
    });
  };

  const handlePointerLeave = () => {
    setSpotlight((prev) => ({ ...prev, visible: false }));
  };

  const currentRoleTheme = roleLabels[currentRole];

  return (
    <header
      ref={headerRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className="sticky top-0 z-40 w-full overflow-x-clip border-b border-white/75 bg-white/65 backdrop-blur-2xl backdrop-saturate-150 shadow-[0_12px_36px_-14px_rgba(15,23,42,0.10),0_1px_0_0_rgba(255,255,255,0.9)_inset] transition-all duration-300"
    >
      <style>{`
        @keyframes dcNavDrop3D {
          0% {
            opacity: 0;
            transform: perspective(1100px) translate3d(0, -14px, -10px) rotateX(-6deg);
          }
          100% {
            opacity: 1;
            transform: perspective(1100px) translate3d(0, 0, 0) rotateX(0deg);
          }
        }
        @keyframes dcToothOrbit3D {
          0% { transform: rotateX(68deg) rotateY(-22deg) rotateZ(0deg); }
          100% { transform: rotateX(68deg) rotateY(-22deg) rotateZ(360deg); }
        }
        @keyframes dcToothFloat3D {
          0%, 100% { transform: translateZ(4px) rotateY(0deg); }
          50% { transform: translateZ(10px) rotateY(14deg); }
        }
        @keyframes dcNavBeamSweep {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(340%); }
        }
        @keyframes dcPendingBounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.12); }
        }
        .dc-nav-enter {
          animation: dcNavDrop3D 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .dc-tooth-ring-3d {
          transform-style: preserve-3d;
          animation: dcToothOrbit3D 11s linear infinite;
        }
        .dc-tooth-core-3d {
          transform-style: preserve-3d;
          animation: dcToothFloat3D 5s ease-in-out infinite;
        }
        .dc-nav-beam {
          animation: dcNavBeamSweep 8s ease-in-out infinite;
        }
        .dc-pending-pulse {
          animation: dcPendingBounce 2.4s ease-in-out infinite;
        }
        .dc-nav-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .dc-nav-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {/* Top Specular Glass Edge */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-95"
      />

      {/* Ambient Role-Aware Aurora Glow */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute -top-16 left-1/4 h-32 w-80 rounded-full bg-gradient-to-r ${currentRoleTheme.auroraGlow} blur-2xl opacity-75`}
      />

      {/* Interactive Cursor Refraction Spotlight */}
      <div
        aria-hidden="true"
        style={{
          opacity: spotlight.visible ? 0.9 : 0,
          background: `radial-gradient(300px circle at ${spotlight.x}% ${spotlight.y}%, rgba(255,255,255,0.8), rgba(20,184,166,0.09) 45%, transparent 75%)`,
        }}
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
      />

      {/* Traveling Bottom Specular Light Glint */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px overflow-hidden"
      >
        <div className="dc-nav-beam h-full w-1/3 bg-gradient-to-r from-transparent via-teal-400/75 to-transparent" />
      </div>

      <div className="dc-nav-enter relative z-10 mx-auto max-w-7xl px-3 min-[375px]:px-4 sm:px-6 lg:px-8">
        {/* Top Row: 3D Branding + Desktop Dock + Role Pill */}
        <div className="flex h-14 sm:h-16 items-center justify-between gap-2">
          {/* 3D Interactive Logo & Branding */}
          <div
            onClick={() => setActiveTab('spec')}
            className="group flex shrink-0 items-center gap-2 min-[375px]:gap-2.5 cursor-pointer select-none [perspective:900px]"
          >
            <div className="relative flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center [transform-style:preserve-3d]">
              {/* Soft Teal/Cyan Volumetric Back Glow */}
              <span
                aria-hidden="true"
                className="absolute inset-0 rounded-xl bg-gradient-to-tr from-teal-500 to-cyan-400 opacity-35 blur-md transition-opacity duration-300 group-hover:opacity-65"
              />
              {/* 3D Orbital Gyro Ring */}
              <span
                aria-hidden="true"
                className="dc-tooth-ring-3d pointer-events-none absolute -inset-1 rounded-full border border-teal-500/45"
              />
              {/* 3D Flipping Frosted Tooth Tile */}
              <div className="dc-tooth-core-3d relative flex h-full w-full items-center justify-center rounded-xl border border-white/55 bg-gradient-to-br from-teal-600 via-teal-500 to-cyan-500 text-white shadow-lg shadow-teal-600/25 transition-transform duration-500 ease-out group-hover:[transform:rotateY(180deg)_scale(1.06)]">
                <svg className="h-5 w-5 sm:h-6 sm:w-6 fill-current drop-shadow-2xs" viewBox="0 0 24 24">
                  <path d="M12 2C8.5 2 6 4.5 6 8c0 2.2 1 4.2 2.5 5.5.8.7 1.5 2 1.5 3.5 0 1.5.5 3 2 3s2-1.5 2-3c0-1.5.7-2.8 1.5-3.5C17 12.2 18 10.2 18 8c0-3.5-2.5-6-6-6zm0 4c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2z" />
                </svg>
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[15px] min-[375px]:text-base sm:text-lg font-extrabold tracking-tight text-slate-900">
                  Denta
                  <span className="bg-gradient-to-r from-teal-700 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
                    Core
                  </span>
                </span>
                <span className="inline-flex items-center gap-0.5 rounded-full border border-teal-300/65 bg-teal-500/10 px-1.5 py-0.5 text-[10px] sm:text-[11px] font-bold text-teal-800 backdrop-blur-sm">
                  <Sparkles className="hidden min-[375px]:inline h-2.5 w-2.5 text-teal-600" />
                  CRM 8.0
                </span>
              </div>
              <p className="hidden min-[360px]:block text-[10px] sm:text-[11px] font-medium text-slate-500 leading-none mt-0.5">
                Smart Dental &amp; Clinic SaaS
              </p>
            </div>
          </div>

          {/* Desktop 3D Spring-Gliding Glass Navigation Dock */}
          <nav
            ref={desktopNavRef}
            aria-label="Asosiy boshqaruv paneli"
            className="relative hidden md:flex items-center gap-0.5 xl:gap-1 rounded-2xl border border-white/85 bg-slate-200/50 p-1 backdrop-blur-xl shadow-[0_2px_8px_rgba(15,23,42,0.05)_inset,0_1px_0_rgba(255,255,255,0.85)]"
          >
            {/* Gliding 3D Dark Obsidian-Teal Active Pill */}
            {desktopPill.ready && (
              <div
                aria-hidden="true"
                style={{
                  transform: `translate3d(${desktopPill.left}px, 0, 0)`,
                  width: `${desktopPill.width}px`,
                }}
                className="pointer-events-none absolute top-1 bottom-1 left-0 rounded-xl border border-white/15 bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 shadow-[0_8px_20px_-6px_rgba(15,23,42,0.45),0_1px_0_rgba(255,255,255,0.22)_inset] transition-all duration-350 ease-[cubic-bezier(0.22,1,0.36,1)]"
              >
                <span className="absolute inset-x-2.5 top-0 h-px bg-gradient-to-r from-transparent via-teal-300/60 to-transparent" />
              </div>
            )}

            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  ref={(el) => {
                    desktopBtnRefs.current[item.id] = el;
                  }}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`group/nav relative z-10 flex items-center gap-1.5 rounded-xl px-2.5 py-2 xl:px-3 text-[11px] xl:text-xs font-bold tracking-tight transition-all duration-200 whitespace-nowrap cursor-pointer active:scale-[0.97] ${
                    isActive
                      ? `${!desktopPill.ready ? 'bg-slate-900 shadow-xs' : ''} text-white`
                      : 'text-slate-600 hover:text-slate-950 hover:bg-white/55'
                  }`}
                >
                  <Icon
                    className={`h-3.5 w-3.5 xl:h-4 xl:w-4 shrink-0 transition-transform duration-300 ${
                      isActive
                        ? 'text-teal-300 scale-105'
                        : 'text-slate-400 group-hover/nav:text-teal-600 group-hover/nav:scale-110'
                    }`}
                  />
                  <span>{item.label}</span>

                  {item.badge && (
                    <span
                      className={`hidden xl:inline-flex items-center rounded-md border px-1.5 py-0.2 text-[10px] font-mono leading-tight transition-colors ${
                        isActive
                          ? 'border-teal-400/30 bg-white/10 text-teal-200'
                          : 'border-slate-200/90 bg-white/75 text-slate-500 group-hover/nav:bg-white'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}

                  {item.count !== undefined && item.count > 0 && (
                    <span className="dc-pending-pulse ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-gradient-to-tr from-amber-500 to-orange-400 px-1 text-[10px] font-extrabold text-white shadow-sm shadow-amber-500/35">
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Authenticated Role Glass Pill */}
          <div className="flex shrink-0 items-center">
            <div
              className={`group/role inline-flex items-center gap-1.5 sm:gap-2 rounded-full border px-2.5 py-1 min-[375px]:px-3 min-[375px]:py-1.5 text-[11px] sm:text-xs font-bold shadow-2xs backdrop-blur-md transition-all duration-250 hover:-translate-y-0.5 hover:shadow-sm ${currentRoleTheme.badge}`}
            >
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span
                  className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${currentRoleTheme.dotColor}`}
                />
                <span
                  className={`relative inline-flex h-1.5 w-1.5 rounded-full ${currentRoleTheme.dotColor}`}
                />
              </span>
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 transition-transform duration-300 group-hover/role:scale-110" />
              <span className="hidden sm:inline truncate max-w-[165px] lg:max-w-none">
                {currentRoleTheme.label}
              </span>
              <span className="sm:hidden truncate max-w-[82px] min-[375px]:max-w-[115px]">
                {currentRoleTheme.shortLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Mobile 3D Gliding Frosted Glass Navigation Dock */}
        <div className="md:hidden pb-2.5 pt-1 border-t border-white/75">
          <div
            ref={mobileNavRef}
            className="dc-nav-scrollbar relative flex items-center gap-1 overflow-x-auto rounded-2xl border border-white/80 bg-slate-200/50 p-1 backdrop-blur-xl shadow-[0_2px_6px_rgba(15,23,42,0.04)_inset]"
          >
            {/* Gliding 3D Active Pill for Mobile Touch Bar */}
            {mobilePill.ready && (
              <div
                aria-hidden="true"
                style={{
                  transform: `translate3d(${mobilePill.left}px, 0, 0)`,
                  width: `${mobilePill.width}px`,
                }}
                className="pointer-events-none absolute top-1 bottom-1 left-0 rounded-xl border border-white/15 bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 shadow-md shadow-slate-900/20 transition-all duration-350 ease-[cubic-bezier(0.22,1,0.36,1)]"
              />
            )}

            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  ref={(el) => {
                    mobileBtnRefs.current[item.id] = el;
                  }}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`relative z-10 flex shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-1.5 min-[375px]:px-3 text-[11px] min-[375px]:text-xs font-bold whitespace-nowrap transition-colors duration-200 active:scale-[0.97] ${
                    isActive
                      ? `${!mobilePill.ready ? 'bg-slate-900' : ''} text-white`
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Icon
                    className={`h-3.5 w-3.5 shrink-0 ${
                      isActive ? 'text-teal-300' : 'text-slate-400'
                    }`}
                  />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span
                      className={`rounded px-1 py-0.2 text-[9px] font-mono ${
                        isActive
                          ? 'bg-white/15 text-teal-200'
                          : 'bg-white/75 text-slate-500 border border-slate-200/70'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                  {item.count !== undefined && item.count > 0 && (
                    <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-extrabold text-white">
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
};