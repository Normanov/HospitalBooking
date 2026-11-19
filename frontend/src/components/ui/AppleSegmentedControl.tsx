import React from 'react';
import { motion } from 'motion/react';

export interface SegmentOption<T extends string = string> {
  id: T;
  label: string;
  badge?: number | string;
  icon?: React.ReactNode;
}

interface AppleSegmentedControlProps<T extends string = string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export function AppleSegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  className = '',
  size = 'md',
}: AppleSegmentedControlProps<T>) {
  return (
    <div
      role="tablist"
      className={`relative inline-flex items-center rounded-2xl bg-slate-200/50 p-1 backdrop-blur-xl border border-white/60 shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)] ${className}`}
    >
      {options.map((option) => {
        const isActive = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(option.id)}
            className={`relative z-10 inline-flex items-center justify-center gap-1.5 rounded-xl font-bold transition-colors cursor-pointer select-none ${
              size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3.5 py-1.5 text-xs'
            } ${isActive ? 'text-slate-900' : 'text-slate-600 hover:text-slate-900'}`}
          >
            {isActive && (
              <motion.div
                layoutId="apple-seg-pill"
                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                className="absolute inset-0 z-[-1] rounded-xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08),0_1px_1px_rgba(0,0,0,0.04)] border border-white/80"
              />
            )}
            {option.icon && (
              <span className={`shrink-0 ${isActive ? 'text-teal-600' : 'text-slate-500'}`}>
                {option.icon}
              </span>
            )}
            <span>{option.label}</span>
            {option.badge !== undefined && (
              <span
                className={`ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] font-mono leading-tight tabular-nums ${
                  isActive
                    ? 'bg-teal-50 text-teal-700 font-extrabold border border-teal-200/60'
                    : 'bg-slate-200/80 text-slate-600'
                }`}
              >
                {option.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
