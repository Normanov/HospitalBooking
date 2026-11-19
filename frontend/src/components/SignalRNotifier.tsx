import React, { useEffect, useRef, useState } from 'react';
import { SignalREvent } from '../types/dentacore';
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  CheckCircle2,
  Info,
  Radio,
  X,
} from 'lucide-react';

interface SignalRNotifierProps {
  events: SignalREvent[];
  onDismiss: (id: string) => void;
}

type SeverityKey = SignalREvent['severity'];

interface SeverityVisualConfig {
  icon: React.ReactNode;
  cardBorder: string;
  cardShadow: string;
  auroraGlow: string;
  iconShellBg: string;
  iconRingBorder: string;
  accentBarGradient: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  pulseDot: string;
  spotlightTint: string;
}

const SEVERITY_THEMES: Record<SeverityKey, SeverityVisualConfig> = {
  success: {
    icon: <CheckCircle2 className="h-4.5 w-4.5 text-white drop-shadow-2xs" />,
    cardBorder: 'border-emerald-300/75',
    cardShadow: 'shadow-[0_20px_45px_-12px_rgba(16,185,129,0.22),0_0_0_1px_rgba(255,255,255,0.75)_inset]',
    auroraGlow: 'from-emerald-400/25 via-teal-300/20 to-cyan-300/15',
    iconShellBg: 'from-emerald-600 via-teal-500 to-cyan-500 shadow-emerald-600/30',
    iconRingBorder: 'border-emerald-400/45',
    accentBarGradient: 'from-emerald-500 via-teal-400 to-cyan-400',
    badgeBg: 'bg-emerald-500/12',
    badgeText: 'text-emerald-800',
    badgeBorder: 'border-emerald-300/65',
    pulseDot: 'bg-emerald-500',
    spotlightTint: 'rgba(16, 185, 129, 0.12)',
  },
  warning: {
    icon: <AlertTriangle className="h-4.5 w-4.5 text-white drop-shadow-2xs" />,
    cardBorder: 'border-amber-300/80',
    cardShadow: 'shadow-[0_20px_45px_-12px_rgba(245,158,11,0.22),0_0_0_1px_rgba(255,255,255,0.75)_inset]',
    auroraGlow: 'from-amber-400/25 via-orange-300/20 to-yellow-300/15',
    iconShellBg: 'from-amber-500 via-orange-500 to-amber-600 shadow-amber-600/30',
    iconRingBorder: 'border-amber-400/50',
    accentBarGradient: 'from-amber-500 via-orange-400 to-yellow-400',
    badgeBg: 'bg-amber-500/12',
    badgeText: 'text-amber-800',
    badgeBorder: 'border-amber-300/65',
    pulseDot: 'bg-amber-500',
    spotlightTint: 'rgba(245, 158, 11, 0.12)',
  },
  danger: {
    icon: <AlertCircle className="h-4.5 w-4.5 text-white drop-shadow-2xs" />,
    cardBorder: 'border-rose-300/80',
    cardShadow: 'shadow-[0_20px_45px_-12px_rgba(244,63,94,0.24),0_0_0_1px_rgba(255,255,255,0.75)_inset]',
    auroraGlow: 'from-rose-400/25 via-pink-300/20 to-amber-300/15',
    iconShellBg: 'from-rose-600 via-rose-500 to-pink-500 shadow-rose-600/30',
    iconRingBorder: 'border-rose-400/50',
    accentBarGradient: 'from-rose-500 via-pink-500 to-orange-400',
    badgeBg: 'bg-rose-500/12',
    badgeText: 'text-rose-800',
    badgeBorder: 'border-rose-300/65',
    pulseDot: 'bg-rose-500',
    spotlightTint: 'rgba(244, 63, 94, 0.12)',
  },
  info: {
    icon: <Info className="h-4.5 w-4.5 text-white drop-shadow-2xs" />,
    cardBorder: 'border-sky-300/80',
    cardShadow: 'shadow-[0_20px_45px_-12px_rgba(14,165,233,0.22),0_0_0_1px_rgba(255,255,255,0.75)_inset]',
    auroraGlow: 'from-sky-400/25 via-cyan-300/20 to-teal-300/15',
    iconShellBg: 'from-sky-600 via-cyan-500 to-teal-500 shadow-sky-600/30',
    iconRingBorder: 'border-sky-400/45',
    accentBarGradient: 'from-sky-500 via-cyan-400 to-teal-400',
    badgeBg: 'bg-sky-500/12',
    badgeText: 'text-sky-800',
    badgeBorder: 'border-sky-300/65',
    pulseDot: 'bg-sky-500',
    spotlightTint: 'rgba(14, 165, 233, 0.12)',
  },
};

export const SignalRNotifier: React.FC<SignalRNotifierProps> = ({ events, onDismiss }) => {
  // UI-only states for smooth 3D exit animations and spatial hover refraction
  const [dismissingIds, setDismissingIds] = useState<Record<string, boolean>>({});
  const [hoveredCard, setHoveredCard] = useState<{
    id: string;
    x: number;
    y: number;
    rotateX: number;
    rotateY: number;
  } | null>(null);

  const dismissTimersRef = useRef<Record<string, number>>({});

  useEffect(() => {
    const timers = dismissTimersRef.current;
    return () => {
      Object.values(timers).forEach((timerId) => window.clearTimeout(timerId));
    };
  }, []);

  if (events.length === 0) return null;

  const handleAnimatedDismiss = (id: string) => {
    if (dismissingIds[id]) return;

    setDismissingIds((prev) => ({ ...prev, [id]: true }));
    dismissTimersRef.current[id] = window.setTimeout(() => {
      onDismiss(id);
      setDismissingIds((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      delete dismissTimersRef.current[id];
    }, 260);
  };

  const handleCardPointerMove = (
    event: React.PointerEvent<HTMLDivElement>,
    id: string
  ) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const relX = (event.clientX - rect.left) / rect.width;
    const relY = (event.clientY - rect.top) / rect.height;

    setHoveredCard({
      id,
      x: relX * 100,
      y: relY * 100,
      rotateX: Number((-(relY - 0.5) * 8).toFixed(2)),
      rotateY: Number(((relX - 0.5) * 10).toFixed(2)),
    });
  };

  const handleCardPointerLeave = (id: string) => {
    setHoveredCard((prev) => (prev?.id === id ? null : prev));
  };

  return (
    <aside
      aria-label="CRM bildirishnomalari"
      className="fixed inset-x-3 bottom-3 min-[375px]:inset-x-4 min-[375px]:bottom-4 sm:inset-auto sm:bottom-5 sm:right-5 z-50 flex flex-col gap-2.5 sm:w-full sm:max-w-[395px] pointer-events-none [perspective:1200px]"
    >
      <style>{`
        @keyframes dcToast3DEnter {
          0% {
            opacity: 0;
            transform: perspective(1000px) translate3d(0, 28px, -30px) rotateX(14deg) scale(0.94);
          }
          65% {
            opacity: 1;
            transform: perspective(1000px) translate3d(0, -3px, 6px) rotateX(-2deg) scale(1.01);
          }
          100% {
            opacity: 1;
            transform: perspective(1000px) translate3d(0, 0, 0) rotateX(0deg) scale(1);
          }
        }
        @keyframes dcToast3DExit {
          0% {
            opacity: 1;
            transform: perspective(1000px) translate3d(0, 0, 0) rotateY(0deg) scale(1);
          }
          100% {
            opacity: 0;
            transform: perspective(1000px) translate3d(38px, 6px, -24px) rotateY(-12deg) scale(0.92);
          }
        }
        @keyframes dcToastOrbit3D {
          0% { transform: rotateX(66deg) rotateY(-20deg) rotateZ(0deg); }
          100% { transform: rotateX(66deg) rotateY(-20deg) rotateZ(360deg); }
        }
        @keyframes dcToastIconFlip {
          0%, 100% { transform: translateZ(6px) rotateY(0deg); }
          50% { transform: translateZ(12px) rotateY(15deg); }
        }
        @keyframes dcToastShimmer {
          0% { transform: translateX(-130%) skewX(-18deg); }
          100% { transform: translateX(340%) skewX(-18deg); }
        }
        .dc-toast-enter {
          animation: dcToast3DEnter 0.55s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .dc-toast-exit {
          animation: dcToast3DExit 0.26s cubic-bezier(0.4, 0, 1, 1) forwards;
        }
        .dc-toast-orbit {
          transform-style: preserve-3d;
          animation: dcToastOrbit3D 9s linear infinite;
        }
        .dc-toast-icon-float {
          transform-style: preserve-3d;
          animation: dcToastIconFlip 4.5s ease-in-out infinite;
        }
        .dc-toast-shimmer {
          animation: dcToastShimmer 6.5s ease-in-out infinite;
        }
      `}</style>

      {events.map((event, index) => {
        const theme = SEVERITY_THEMES[event.severity] ?? SEVERITY_THEMES.info;
        const isExiting = Boolean(dismissingIds[event.id]);
        const isHovered = hoveredCard?.id === event.id;

        return (
          <div
            key={event.id}
            role="status"
            aria-live="polite"
            onPointerMove={(e) => handleCardPointerMove(e, event.id)}
            onPointerLeave={() => handleCardPointerLeave(event.id)}
            style={{
              animationDelay: isExiting ? '0ms' : `${Math.min(index * 60, 240)}ms`,
              transform:
                isHovered && !isExiting
                  ? `perspective(1000px) rotateX(${hoveredCard.rotateX}deg) rotateY(${hoveredCard.rotateY}deg) translateZ(8px)`
                  : undefined,
            }}
            className={`mac-glass group relative pointer-events-auto overflow-hidden rounded-2xl sm:rounded-[22px] border bg-white/72 p-3.5 min-[375px]:p-4 backdrop-blur-2xl backdrop-saturate-150 transition-[box-shadow,background-color,transform] duration-300 ease-out hover:bg-white/85 ${
              theme.cardBorder
            } ${theme.cardShadow} ${isExiting ? 'dc-toast-exit' : 'dc-toast-enter'}`}
          >
            {/* Top Specular Frosted Glass Edge */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-95"
            />

            {/* Left 3D Volumetric Accent Pill */}
            <div
              aria-hidden="true"
              className={`pointer-events-none absolute left-0 top-3 bottom-3 w-1 rounded-r-full bg-gradient-to-b ${theme.accentBarGradient} opacity-90`}
            />

            {/* Ambient Severity Aurora Glow */}
            <div
              aria-hidden="true"
              className={`pointer-events-none absolute -top-12 -left-10 h-28 w-44 rounded-full bg-gradient-to-br ${theme.auroraGlow} blur-2xl opacity-85`}
            />

            {/* Interactive Cursor Refraction Spotlight */}
            <div
              aria-hidden="true"
              style={{
                opacity: isHovered ? 0.95 : 0,
                background: isHovered
                  ? `radial-gradient(220px circle at ${hoveredCard.x}% ${hoveredCard.y}%, rgba(255,255,255,0.85), ${theme.spotlightTint} 45%, transparent 75%)`
                  : undefined,
              }}
              className="pointer-events-none absolute inset-0 transition-opacity duration-300"
            />

            {/* Subtle Traveling Shimmer Sweep */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 overflow-hidden"
            >
              <div className="dc-toast-shimmer h-full w-1/3 bg-gradient-to-r from-transparent via-white/35 to-transparent" />
            </div>

            {/* Card Content */}
            <div className="relative z-10 flex items-start gap-3">
              {/* 3D Orbital Icon Shell */}
              <div className="relative mt-0.5 flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center [perspective:500px]">
                {/* 3D Rotating Gyro Ring */}
                <span
                  aria-hidden="true"
                  className={`dc-toast-orbit pointer-events-none absolute -inset-1 rounded-full border ${theme.iconRingBorder}`}
                />
                {/* 3D Gradient Glass Tile */}
                <div
                  className={`dc-toast-icon-float relative flex h-full w-full items-center justify-center rounded-xl border border-white/50 bg-gradient-to-br ${theme.iconShellBg} shadow-md transition-transform duration-500 group-hover:[transform:rotateY(180deg)_scale(1.06)]`}
                >
                  {theme.icon}
                </div>
              </div>

              {/* Textual Payload */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider backdrop-blur-sm ${theme.badgeBg} ${theme.badgeText} ${theme.badgeBorder}`}
                  >
                    <span className="relative flex h-1.5 w-1.5 shrink-0">
                      <span
                        className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${theme.pulseDot}`}
                      />
                      <span
                        className={`relative inline-flex h-1.5 w-1.5 rounded-full ${theme.pulseDot}`}
                      />
                    </span>
                    <Bell className="h-2.5 w-2.5 shrink-0" />
                    <span>CRM xabarnomasi</span>
                  </span>

                  <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium text-slate-400">
                    <Radio className="h-2.5 w-2.5 text-teal-600/70" />
                    {event.timestamp}
                  </span>
                </div>

                <h4 className="mt-1.5 text-xs sm:text-[13px] font-extrabold tracking-tight text-slate-900 leading-snug break-words">
                  {event.title}
                </h4>
                <p className="mt-0.5 text-[11px] sm:text-xs font-medium text-slate-600 leading-relaxed break-words">
                  {event.message}
                </p>
              </div>

              {/* Frosted Dismiss Button */}
              <button
                type="button"
                onClick={() => handleAnimatedDismiss(event.id)}
                aria-label="Bildirishnomani yopish"
                className="relative -mr-1 -mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-slate-200/70 bg-white/60 text-slate-400 backdrop-blur-md transition-all duration-200 hover:scale-105 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 active:scale-95 cursor-pointer"
              >
                <X className="h-3.5 w-3.5 transition-transform duration-200 hover:rotate-90" />
              </button>
            </div>
          </div>
        );
      })}
    </aside>
  );
};