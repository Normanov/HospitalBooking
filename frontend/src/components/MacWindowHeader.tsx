import React, { useCallback, useEffect, useRef, useState } from 'react';
import { UserRole } from '../types/dentacore';
import { Lock, Minus, Plus, ShieldCheck, Sparkles, X } from 'lucide-react';

interface MacWindowHeaderProps {
  title: string;
  subtitle: string;
  role: UserRole;
  tabs: { id: string; label: string; icon?: React.ReactNode; badge?: string }[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

interface RoleThemeConfig {
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  dotColor: string;
  accentGlow: string;
  activeTabAccent: string;
  activeBadgeBg: string;
  activeBadgeText: string;
  workspaceLabel: string;
}

const ROLE_THEMES: Record<UserRole, RoleThemeConfig> = {
  SuperAdmin: {
    badgeBg: 'bg-gradient-to-r from-rose-500/12 via-amber-500/10 to-rose-500/12',
    badgeText: 'text-rose-800',
    badgeBorder: 'border-rose-300/70',
    dotColor: 'bg-rose-500',
    accentGlow: 'from-rose-400/20 via-amber-300/15 to-teal-400/20',
    activeTabAccent: 'text-rose-700',
    activeBadgeBg: 'bg-rose-500/12 border-rose-200/80',
    activeBadgeText: 'text-rose-700',
    workspaceLabel: 'SuperAdmin Workspace',
  },
  Doctor: {
    badgeBg: 'bg-gradient-to-r from-teal-500/12 via-cyan-500/12 to-sky-500/12',
    badgeText: 'text-teal-800',
    badgeBorder: 'border-teal-300/70',
    dotColor: 'bg-teal-500',
    accentGlow: 'from-teal-400/25 via-cyan-300/20 to-sky-400/20',
    activeTabAccent: 'text-teal-700',
    activeBadgeBg: 'bg-teal-500/12 border-teal-200/80',
    activeBadgeText: 'text-teal-700',
    workspaceLabel: 'Doctor Workspace',
  },
  Receptionist: {
    badgeBg: 'bg-gradient-to-r from-emerald-500/12 via-teal-500/12 to-cyan-500/12',
    badgeText: 'text-emerald-800',
    badgeBorder: 'border-emerald-300/70',
    dotColor: 'bg-emerald-500',
    accentGlow: 'from-emerald-400/25 via-teal-300/20 to-cyan-400/20',
    activeTabAccent: 'text-emerald-700',
    activeBadgeBg: 'bg-emerald-500/12 border-emerald-200/80',
    activeBadgeText: 'text-emerald-700',
    workspaceLabel: 'Receptionist Workspace',
  },
  Patient: {
    badgeBg: 'bg-gradient-to-r from-sky-500/12 via-indigo-500/10 to-teal-500/12',
    badgeText: 'text-sky-800',
    badgeBorder: 'border-sky-300/70',
    dotColor: 'bg-sky-500',
    accentGlow: 'from-sky-400/25 via-indigo-300/15 to-teal-400/20',
    activeTabAccent: 'text-sky-700',
    activeBadgeBg: 'bg-sky-500/12 border-sky-200/80',
    activeBadgeText: 'text-sky-700',
    workspaceLabel: 'Patient Workspace',
  },
};

export const MacWindowHeader: React.FC<MacWindowHeaderProps> = ({
  title,
  subtitle,
  role,
  tabs,
  activeTab,
  onTabChange,
}) => {
  const theme = ROLE_THEMES[role];

  // UI-only refs & states for silky 3D spotlight + sliding macOS segmented pill
  const headerRef = useRef<HTMLDivElement | null>(null);
  const tabListRef = useRef<HTMLDivElement | null>(null);
  const tabButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const [pillMetrics, setPillMetrics] = useState<{
    left: number;
    width: number;
    ready: boolean;
  }>({ left: 0, width: 0, ready: false });

  const [pointerGlow, setPointerGlow] = useState<{
    x: number;
    y: number;
    active: boolean;
  }>({ x: 50, y: 50, active: false });

  const measureActiveTabPill = useCallback(() => {
    const container = tabListRef.current;
    const activeButton = tabButtonRefs.current[activeTab];
    if (!container || !activeButton) {
      setPillMetrics((prev) => (prev.ready ? { ...prev, ready: false } : prev));
      return;
    }

    setPillMetrics({
      left: activeButton.offsetLeft,
      width: activeButton.offsetWidth,
      ready: true,
    });
  }, [activeTab]);

  useEffect(() => {
    measureActiveTabPill();

    // Auto-center active tab smoothly on small mobile screens when tab changes
    const activeButton = tabButtonRefs.current[activeTab];
    if (activeButton && typeof activeButton.scrollIntoView === 'function') {
      activeButton.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [activeTab, tabs, measureActiveTabPill]);

  useEffect(() => {
    const container = tabListRef.current;
    if (!container) return;

    const handleResize = () => measureActiveTabPill();
    window.addEventListener('resize', handleResize);

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => measureActiveTabPill());
      observer.observe(container);
      Object.values(tabButtonRefs.current).forEach((btn) => {
        if (btn) observer?.observe(btn);
      });
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      observer?.disconnect();
    };
  }, [tabs, measureActiveTabPill]);

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = headerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    setPointerGlow({ x, y, active: true });
  };

  const handlePointerLeave = () => {
    setPointerGlow((prev) => ({ ...prev, active: false }));
  };

  return (
    <div
      ref={headerRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className="mac-glass dc-win-header-enter relative overflow-hidden rounded-t-[24px] sm:rounded-t-[30px] border-b border-white/80 bg-white/65 px-3.5 py-3.5 min-[375px]:px-4 sm:px-6 sm:py-4.5 backdrop-blur-2xl backdrop-saturate-150 shadow-[0_14px_38px_-14px_rgba(15,23,42,0.10),0_1px_0_0_rgba(255,255,255,0.9)_inset] select-none transition-all duration-300"
    >
      <style>{`
        @keyframes dcWinHeaderEntrance {
          0% {
            opacity: 0;
            transform: perspective(1000px) translate3d(0, -14px, -12px) rotateX(-6deg);
          }
          100% {
            opacity: 1;
            transform: perspective(1000px) translate3d(0, 0, 0) rotateX(0deg);
          }
        }
        @keyframes dcWinOrbSpin3D {
          0% { transform: rotateX(65deg) rotateY(-20deg) rotateZ(0deg); }
          100% { transform: rotateX(65deg) rotateY(-20deg) rotateZ(360deg); }
        }
        @keyframes dcWinShimmerSweep {
          0% { transform: translateX(-120%) skewX(-18deg); }
          100% { transform: translateX(320%) skewX(-18deg); }
        }
        @keyframes dcBadgeFloatPulse {
          0%, 100% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(0, -1.5px, 0); }
        }
        .dc-win-header-enter {
          animation: dcWinHeaderEntrance 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .dc-win-orb-3d {
          transform-style: preserve-3d;
          animation: dcWinOrbSpin3D 11s linear infinite;
        }
        .dc-win-shimmer {
          animation: dcWinShimmerSweep 8.5s ease-in-out infinite;
        }
        .dc-win-badge-float {
          animation: dcBadgeFloatPulse 4s ease-in-out infinite;
        }
        .dc-no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .dc-no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {/* Top Specular Glass Edge Highlight */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-95"
      />

      {/* Ambient Role-Tinted Aurora Glow */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute -top-16 -left-12 h-36 w-64 rounded-full bg-gradient-to-r ${theme.accentGlow} blur-2xl opacity-80`}
      />

      {/* Interactive Cursor Refraction Spotlight */}
      <div
        aria-hidden="true"
        style={{
          opacity: pointerGlow.active ? 0.85 : 0,
          background: `radial-gradient(280px circle at ${pointerGlow.x}% ${pointerGlow.y}%, rgba(255, 255, 255, 0.75), rgba(20, 184, 166, 0.08) 45%, transparent 75%)`,
        }}
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
      />

      {/* Subtle Traveling Glass Shimmer Along Bottom Border */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px overflow-hidden"
      >
        <div className="dc-win-shimmer h-full w-1/3 bg-gradient-to-r from-transparent via-teal-400/70 to-transparent" />
      </div>

      {/* Main Content Wrapper */}
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 sm:gap-4">
        {/* Left Section: macOS Traffic Lights + 3D Role Workspace & Title */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-4 min-w-0">
          {/* Top Row on Mobile: Traffic Lights + Compact Role Pill */}
          <div className="flex items-center justify-between sm:justify-start gap-3">
            {/* macOS Red / Yellow / Green Traffic Light Cluster with Interactive Glyphs */}
            <div
              className="group/lights inline-flex items-center gap-2 rounded-full border border-white/75 bg-white/55 px-2.5 py-1.5 shadow-2xs backdrop-blur-md"
              aria-hidden="true"
            >
              <span className="relative flex h-3 w-3 items-center justify-center rounded-full bg-gradient-to-b from-[#FF6B63] to-[#FF5F56] border border-[#E0443E] shadow-[0_1px_2px_rgba(224,68,62,0.45),0_1px_0_rgba(255,255,255,0.5)_inset] transition-transform duration-200 hover:scale-115 cursor-pointer">
                <X className="h-2 w-2 stroke-[3] text-[#7A0B06] opacity-0 scale-50 transition-all duration-200 group-hover/lights:opacity-100 group-hover/lights:scale-100" />
              </span>
              <span className="relative flex h-3 w-3 items-center justify-center rounded-full bg-gradient-to-b from-[#FFC847] to-[#FFBD2E] border border-[#DEA123] shadow-[0_1px_2px_rgba(222,161,35,0.45),0_1px_0_rgba(255,255,255,0.5)_inset] transition-transform duration-200 hover:scale-115 cursor-pointer">
                <Minus className="h-2 w-2 stroke-[3] text-[#7D4E00] opacity-0 scale-50 transition-all duration-200 group-hover/lights:opacity-100 group-hover/lights:scale-100" />
              </span>
              <span className="relative flex h-3 w-3 items-center justify-center rounded-full bg-gradient-to-b from-[#34D74B] to-[#27C93F] border border-[#1AAB29] shadow-[0_1px_2px_rgba(26,171,41,0.45),0_1px_0_rgba(255,255,255,0.5)_inset] transition-transform duration-200 hover:scale-115 cursor-pointer">
                <Plus className="h-2 w-2 stroke-[3] text-[#0A5414] opacity-0 scale-50 transition-all duration-200 group-hover/lights:opacity-100 group-hover/lights:scale-100" />
              </span>
            </div>

            {/* Mobile-only Compact Role Workspace Pill so 320px screens never wrap awkwardly */}
            <div
              className={`dc-win-badge-float sm:hidden inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-mono font-bold shadow-2xs backdrop-blur-md ${theme.badgeBg} ${theme.badgeText} ${theme.badgeBorder}`}
            >
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span
                  className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${theme.dotColor}`}
                />
                <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${theme.dotColor}`} />
              </span>
              <ShieldCheck className="h-3 w-3 shrink-0" />
              <span className="truncate max-w-[125px]">{role}</span>
            </div>
          </div>

          {/* Vertical Glass Divider on Tablet/Desktop */}
          <div
            aria-hidden="true"
            className="hidden sm:block h-8 w-px shrink-0 bg-gradient-to-b from-transparent via-slate-300/80 to-transparent"
          />

          {/* Title, 3D Orbital Workspace Badge & Subtitle */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-[15px] min-[375px]:text-base md:text-[17px] font-extrabold tracking-tight text-slate-900">
                {title}
              </h1>

              {/* Desktop/Tablet 3D-Enhanced Role Workspace Pill */}
              <div
                className={`group/ws hidden sm:inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-mono font-bold shadow-2xs backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-sm ${theme.badgeBg} ${theme.badgeText} ${theme.badgeBorder}`}
              >
                {/* 3D Mini Gyro Ring Around Shield */}
                <span className="relative flex h-4 w-4 items-center justify-center [perspective:300px]">
                  <span
                    aria-hidden="true"
                    className="dc-win-orb-3d absolute inset-0 rounded-full border border-current opacity-40"
                  />
                  <ShieldCheck className="relative h-3 w-3 transition-transform duration-500 group-hover/ws:[transform:rotateY(180deg)]" />
                </span>
                <span>{theme.workspaceLabel}</span>
                {role === 'SuperAdmin' && (
                  <Lock className="h-2.5 w-2.5 opacity-75" aria-hidden="true" />
                )}
              </div>
            </div>

            <p className="mt-1 flex items-center gap-1.5 text-[11px] sm:text-xs font-medium text-slate-500 leading-snug">
              <Sparkles className="hidden min-[375px]:inline-block h-3 w-3 shrink-0 text-teal-600/80" />
              <span className="line-clamp-2 sm:truncate">{subtitle}</span>
            </p>
          </div>
        </div>

        {/* Right Section: 3D Spring-Animated macOS Segmented Control Tabs */}
        {tabs.length > 0 && (
          <div className="w-full lg:w-auto min-w-0">
            <div
              ref={tabListRef}
              role="tablist"
              aria-label={title}
              className="dc-no-scrollbar relative flex w-full lg:w-auto items-center gap-1 overflow-x-auto rounded-2xl border border-white/85 bg-slate-200/55 p-1 backdrop-blur-xl shadow-[0_2px_8px_rgba(15,23,42,0.05)_inset,0_1px_0_rgba(255,255,255,0.8)]"
            >
              {/* Gliding 3D Frosted Glass Active Indicator Pill */}
              {pillMetrics.ready && (
                <div
                  aria-hidden="true"
                  style={{
                    transform: `translate3d(${pillMetrics.left}px, 0, 0)`,
                    width: `${pillMetrics.width}px`,
                  }}
                  className="pointer-events-none absolute top-1 bottom-1 left-0 rounded-xl border border-white/95 bg-gradient-to-b from-white via-white/95 to-slate-50/90 shadow-[0_6px_16px_-4px_rgba(15,23,42,0.12),0_1px_0_rgba(255,255,255,1)_inset] transition-all duration-350 ease-[cubic-bezier(0.22,1,0.36,1)]"
                >
                  {/* Top Specular Rim on Active Pill */}
                  <span className="absolute inset-x-2.5 top-0 h-px bg-gradient-to-r from-transparent via-teal-400/50 to-transparent" />
                </div>
              )}

              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    ref={(el) => {
                      tabButtonRefs.current[tab.id] = el;
                    }}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => onTabChange(tab.id)}
                    className={`group/tab relative z-10 flex shrink-0 items-center justify-center gap-1.5 rounded-xl px-2.5 py-1.5 min-[375px]:px-3.5 min-[375px]:py-2 text-[11px] min-[375px]:text-xs font-bold tracking-tight transition-all duration-250 whitespace-nowrap cursor-pointer active:scale-[0.97] ${
                      isActive
                        ? `${
                            !pillMetrics.ready
                              ? 'bg-white shadow-sm border border-white/90'
                              : ''
                          } text-slate-950`
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
                    }`}
                  >
                    {tab.icon && (
                      <span
                        className={`inline-flex shrink-0 items-center justify-center transition-all duration-300 ${
                          isActive
                            ? `${theme.activeTabAccent} scale-105 [transform:rotateY(0deg)]`
                            : 'opacity-75 group-hover/tab:opacity-100 group-hover/tab:scale-110'
                        }`}
                      >
                        {tab.icon}
                      </span>
                    )}

                    <span>{tab.label}</span>

                    {tab.badge && (
                      <span
                        className={`inline-flex items-center justify-center rounded-full border px-1.5 py-0.2 text-[10px] font-mono leading-tight transition-all duration-250 ${
                          isActive
                            ? `${theme.activeBadgeBg} ${theme.activeBadgeText} font-extrabold shadow-2xs`
                            : 'border-slate-300/60 bg-white/60 text-slate-500 group-hover/tab:bg-white/90 group-hover/tab:text-slate-700'
                        }`}
                      >
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};