import React from 'react';
import { UserRole } from '../types/dentacore';
import { LogOut, ShieldCheck, Stethoscope } from 'lucide-react';

interface MacMenuBarProps {
  currentRole: UserRole;
  onLogout: () => void;
}

export const MacMenuBar: React.FC<MacMenuBarProps> = ({
  currentRole,
  onLogout,
}) => {
  const rolesConfig: Record<UserRole, { title: string; color: string }> = {
    SuperAdmin: {
      title: 'Super Admin',
      color: 'bg-rose-500/12 text-rose-700 border-rose-300/70 shadow-rose-500/10',
    },
    Doctor: {
      title: 'Shifokor',
      color: 'bg-sky-500/12 text-sky-700 border-sky-300/70 shadow-sky-500/10',
    },
    Receptionist: {
      title: 'Administrator',
      color: 'bg-emerald-500/12 text-emerald-700 border-emerald-300/70 shadow-emerald-500/10',
    },
    Patient: {
      title: 'Patient',
      color: 'bg-amber-500/12 text-amber-700 border-amber-300/70 shadow-amber-500/10',
    },
  };

  const roleDotColor: Record<UserRole, string> = {
    SuperAdmin: 'bg-rose-500',
    Doctor: 'bg-sky-500',
    Receptionist: 'bg-emerald-500',
    Patient: 'bg-amber-500',
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/75 bg-white/65 px-3 py-2.5 min-[375px]:px-4 sm:px-6 sm:py-3 backdrop-blur-2xl backdrop-saturate-150 shadow-[0_10px_30px_-12px_rgba(15,23,42,0.08),0_1px_0_0_rgba(255,255,255,0.85)_inset] transition-all">
      <style>{`
        @keyframes dcMenuDrop3D {
          0% {
            opacity: 0;
            transform: perspective(900px) translate3d(0, -10px, 0) rotateX(-5deg);
          }
          100% {
            opacity: 1;
            transform: perspective(900px) translate3d(0, 0, 0) rotateX(0deg);
          }
        }
        @keyframes dcLogoOrbitSlow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes dcEdgeShimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(250%); }
        }
        .dc-menubar-enter {
          animation: dcMenuDrop3D 0.55s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .dc-logo-orbit {
          animation: dcLogoOrbitSlow 18s linear infinite;
        }
        .dc-edge-glint {
          animation: dcEdgeShimmer 7s ease-in-out infinite;
        }
      `}</style>

      {/* Top Specular Glass Edge */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-95"
      />

      {/* Subtle Traveling Light Glint Along Bottom Edge */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px overflow-hidden"
      >
        <div className="dc-edge-glint h-full w-1/3 bg-gradient-to-r from-transparent via-teal-400/60 to-transparent" />
      </div>

      <div className="dc-menubar-enter mx-auto flex max-w-7xl items-center justify-between gap-2">
        {/* 3D Brand Emblem & Wordmark */}
        <div className="group flex items-center gap-2 min-[375px]:gap-2.5 [perspective:800px]">
          <div className="relative flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center">
            {/* Ambient Teal Glow */}
            <span
              aria-hidden="true"
              className="absolute inset-0.5 rounded-xl bg-gradient-to-tr from-teal-500 to-cyan-400 opacity-30 blur-sm transition-opacity duration-300 group-hover:opacity-55"
            />
            {/* Rotating Dashed Orbital Halo */}
            <span
              aria-hidden="true"
              className="dc-logo-orbit pointer-events-none absolute -inset-0.5 rounded-xl border border-dashed border-teal-500/35"
            />
            {/* 3D Flipping Glass Icon Tile */}
            <span className="relative flex h-full w-full items-center justify-center rounded-xl border border-white/50 bg-gradient-to-br from-teal-600 via-teal-500 to-cyan-500 text-white shadow-md shadow-teal-700/20 transition-transform duration-500 ease-out [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)_scale(1.04)]">
              <Stethoscope className="h-4 w-4 sm:h-[18px] sm:w-[18px] drop-shadow-2xs" />
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[15px] min-[375px]:text-base sm:text-[17px] font-extrabold tracking-tight text-slate-900">
              Denta
              <span className="bg-gradient-to-r from-teal-700 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
                Core
              </span>
            </span>
          </div>
        </div>

        {/* Right Controls: Frosted Role Pill & Logout Action */}
        <div className="flex items-center gap-1.5 min-[375px]:gap-2.5 sm:gap-3">
          <div
            className={`group/role inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 min-[375px]:px-3.5 min-[375px]:py-1.5 text-[11px] min-[375px]:text-xs font-bold shadow-2xs backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm ${rolesConfig[currentRole].color}`}
          >
            <span className="relative flex h-1.5 w-1.5 shrink-0">
              <span
                className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${roleDotColor[currentRole]}`}
              />
              <span
                className={`relative inline-flex h-1.5 w-1.5 rounded-full ${roleDotColor[currentRole]}`}
              />
            </span>
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 transition-transform duration-300 group-hover/role:scale-110" />
            <span className="truncate max-w-[92px] min-[375px]:max-w-none">
              {currentRole === 'Patient' ? 'Bemor' : rolesConfig[currentRole].title}
            </span>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="group relative inline-flex h-8 w-8 sm:h-auto sm:w-auto items-center justify-center gap-1.5 overflow-hidden rounded-full border border-slate-200/80 bg-white/70 sm:px-3.5 sm:py-1.5 text-xs font-bold text-slate-600 shadow-2xs backdrop-blur-md transition-all duration-250 hover:-translate-y-0.5 hover:border-rose-200/90 hover:bg-rose-50/90 hover:text-rose-700 hover:shadow-md hover:shadow-rose-500/10 active:scale-95"
            aria-label="Tizimdan chiqish"
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-rose-200/35 to-transparent transition-transform duration-500 group-hover:translate-x-full"
            />
            <LogOut className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
            <span className="hidden sm:inline">Chiqish</span>
          </button>
        </div>
      </div>
    </header>
  );
};