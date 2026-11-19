import React, { useRef, useState } from 'react';
import { motion } from 'motion/react';

interface AppleKpiCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon: React.ReactNode;
  theme?: 'teal' | 'emerald' | 'amber' | 'violet' | 'rose' | 'slate';
  trend?: string;
  onClick?: () => void;
  className?: string;
}

const THEME_STYLES = {
  teal: {
    bg: 'bg-gradient-to-br from-teal-500/8 via-white to-cyan-500/5',
    border: 'border-teal-200/50 hover:border-teal-300',
    iconBg: 'bg-teal-500/12 text-teal-700',
    valueText: 'text-slate-900',
    glow: 'rgba(20, 184, 166, 0.15)',
  },
  emerald: {
    bg: 'bg-gradient-to-br from-emerald-500/8 via-white to-teal-500/5',
    border: 'border-emerald-200/50 hover:border-emerald-300',
    iconBg: 'bg-emerald-500/12 text-emerald-700',
    valueText: 'text-emerald-800',
    glow: 'rgba(16, 185, 129, 0.15)',
  },
  amber: {
    bg: 'bg-gradient-to-br from-amber-500/8 via-white to-orange-500/5',
    border: 'border-amber-200/50 hover:border-amber-300',
    iconBg: 'bg-amber-500/12 text-amber-700',
    valueText: 'text-amber-800',
    glow: 'rgba(245, 158, 11, 0.15)',
  },
  violet: {
    bg: 'bg-gradient-to-br from-violet-500/8 via-white to-purple-500/5',
    border: 'border-violet-200/50 hover:border-violet-300',
    iconBg: 'bg-violet-500/12 text-violet-700',
    valueText: 'text-violet-800',
    glow: 'rgba(139, 92, 246, 0.15)',
  },
  rose: {
    bg: 'bg-gradient-to-br from-rose-500/8 via-white to-red-500/5',
    border: 'border-rose-200/50 hover:border-rose-300',
    iconBg: 'bg-rose-500/12 text-rose-700',
    valueText: 'text-rose-800',
    glow: 'rgba(244, 63, 94, 0.15)',
  },
  slate: {
    bg: 'bg-gradient-to-br from-slate-100/70 via-white to-slate-50',
    border: 'border-slate-200/70 hover:border-slate-300',
    iconBg: 'bg-slate-100 text-slate-700',
    valueText: 'text-slate-900',
    glow: 'rgba(100, 116, 139, 0.1)',
  },
};

export const AppleKpiCard: React.FC<AppleKpiCardProps> = ({
  label,
  value,
  subtext,
  icon,
  theme = 'teal',
  trend,
  onClick,
  className = '',
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0, shadowX: 0, shadowY: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const t = THEME_STYLES[theme];

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = -((y - centerY) / centerY) * 6;
    const rotateY = ((x - centerX) / centerX) * 6;

    setTilt({
      rotateX: Number(rotateX.toFixed(2)),
      rotateY: Number(rotateY.toFixed(2)),
      shadowX: Number(((x - centerX) / 8).toFixed(1)),
      shadowY: Number(((y - centerY) / 8).toFixed(1)),
    });
  };

  const handlePointerLeave = () => {
    setIsHovered(false);
    setTilt({ rotateX: 0, rotateY: 0, shadowX: 0, shadowY: 0 });
  };

  return (
    <div
      ref={cardRef}
      onPointerEnter={() => setIsHovered(true)}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onClick={onClick}
      style={{
        transform: isHovered
          ? `perspective(900px) rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) translateZ(4px)`
          : 'perspective(900px) rotateX(0deg) rotateY(0deg) translateZ(0px)',
        boxShadow: isHovered
          ? `${-tilt.shadowX}px ${-tilt.shadowY + 12}px 28px -4px ${t.glow}, 0 2px 8px rgba(0,0,0,0.04), inset 0 1px 1px rgba(255,255,255,0.85)`
          : '0 8px 24px -6px rgba(0,0,0,0.04), inset 0 1px 1px rgba(255,255,255,0.8)',
      }}
      className={`relative overflow-hidden rounded-3xl border ${t.border} ${t.bg} p-4 sm:p-5 backdrop-blur-2xl transition-[transform,box-shadow,border-color] duration-250 ease-out select-none ${
        onClick ? 'cursor-pointer active:scale-[0.98]' : ''
      } ${className}`}
    >
      {/* Specular Top Rim */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-90"
      />

      <div className="flex items-center justify-between gap-2.5">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
          {label}
        </span>
        <div
          className={`flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-2xl ${t.iconBg} shadow-2xs transition-transform duration-300 ${
            isHovered ? 'scale-110' : ''
          }`}
        >
          {icon}
        </div>
      </div>

      <div className="mt-2.5 flex items-baseline justify-between gap-2">
        <span
          className={`text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums ${t.valueText}`}
        >
          {value}
        </span>
        {trend && (
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
            {trend}
          </span>
        )}
      </div>

      {subtext && (
        <p className="mt-1 text-[11px] font-medium text-slate-500 truncate">
          {subtext}
        </p>
      )}
    </div>
  );
};
