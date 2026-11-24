/**
 * MagnificationDock — macOS-inspired magnification dock component
 * Adapted from framer-motion to motion/react (Motion for React v12)
 * Used by LiveStaffCRM mobile bottom bar and LivePatientPortal mobile bottom bar.
 */

import {
  motion,
  MotionValue,
  useMotionValue,
  useSpring,
  useTransform,
  AnimatePresence,
  type SpringOptions,
} from 'motion/react';
import React, {
  Children,
  cloneElement,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type DockItemData = {
  icon: React.ReactNode;
  label: React.ReactNode;
  onClick: () => void;
  className?: string;
  badge?: React.ReactNode;
  isActive?: boolean;
};

export type MagnificationDockProps = {
  items: DockItemData[];
  className?: string;
  distance?: number;
  panelHeight?: number;
  baseItemSize?: number;
  dockHeight?: number;
  magnification?: number;
  spring?: SpringOptions;
};

type DockItemProps = {
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  mouseX: MotionValue<number>;
  spring: SpringOptions;
  distance: number;
  baseItemSize: number;
  magnification: number;
  isActive?: boolean;
};

// ─── DockItem ─────────────────────────────────────────────────────────────────

function DockItem({
  children,
  className = '',
  onClick,
  mouseX,
  spring,
  distance,
  magnification,
  baseItemSize,
  isActive = false,
}: DockItemProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isHovered = useMotionValue(0);

  const mouseDistance = useTransform(mouseX, (val) => {
    const rect = ref.current?.getBoundingClientRect() ?? { x: 0, width: baseItemSize };
    return val - rect.x - baseItemSize / 2;
  });

  const targetSize = useTransform(
    mouseDistance,
    [-distance, 0, distance],
    [baseItemSize, magnification, baseItemSize],
  );
  const size = useSpring(targetSize, spring);

  return (
    <motion.div
      ref={ref}
      style={{ width: size, height: size }}
      onHoverStart={() => isHovered.set(1)}
      onHoverEnd={() => isHovered.set(0)}
      onFocus={() => isHovered.set(1)}
      onBlur={() => isHovered.set(0)}
      onClick={onClick}
      className={`relative inline-flex items-center justify-center rounded-full cursor-pointer select-none
        ${isActive
          ? 'bg-gradient-to-br from-teal-600 to-emerald-600 text-white shadow-lg shadow-teal-700/25 ring-2 ring-white/60'
          : 'bg-white/80 border border-white/80 text-slate-600 shadow-md hover:bg-white backdrop-blur-sm'}
        transition-colors duration-200 ${className}`}
      tabIndex={0}
      role="button"
      aria-pressed={isActive}
    >
      {Children.map(children, (child) =>
        React.isValidElement(child)
          ? cloneElement(child as React.ReactElement<{ isHovered?: MotionValue<number> }>, {
              isHovered,
            })
          : child,
      )}
    </motion.div>
  );
}

// ─── DockLabel (tooltip) ──────────────────────────────────────────────────────

type DockLabelProps = {
  className?: string;
  children: React.ReactNode;
  isHovered?: MotionValue<number>;
};

function DockLabel({ children, className = '', isHovered }: DockLabelProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!isHovered) return;
    const unsubscribe = isHovered.on('change', (latest) => {
      setIsVisible(latest === 1);
    });
    return () => unsubscribe();
  }, [isHovered]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: -4 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
          className={`${className} pointer-events-none absolute -top-9 left-1/2 w-max max-w-[120px] whitespace-nowrap rounded-xl border border-white/70 bg-white/95 px-2.5 py-1 text-[11px] font-bold text-slate-800 shadow-lg shadow-slate-900/10 backdrop-blur-xl`}
          role="tooltip"
          style={{ x: '-50%' }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── DockIcon ─────────────────────────────────────────────────────────────────

type DockIconProps = {
  className?: string;
  children: React.ReactNode;
  isHovered?: MotionValue<number>;
};

function DockIcon({ children, className = '' }: DockIconProps) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      {children}
    </div>
  );
}

// ─── DockBadge ───────────────────────────────────────────────────────────────

type DockBadgeProps = {
  children: React.ReactNode;
  alert?: boolean;
};

function DockBadge({ children, alert = false }: DockBadgeProps) {
  return (
    <span
      className={`absolute -top-0.5 -right-0.5 z-10 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-black text-white shadow-sm ${
        alert ? 'bg-rose-500' : 'bg-teal-600'
      }`}
    >
      {children}
    </span>
  );
}

// ─── MagnificationDock (main export) ─────────────────────────────────────────

export function MagnificationDock({
  items,
  className = '',
  spring = { mass: 0.1, stiffness: 150, damping: 12 },
  magnification = 68,
  distance = 180,
  panelHeight = 68,
  dockHeight = 256,
  baseItemSize = 48,
}: MagnificationDockProps) {
  const mouseX = useMotionValue(Infinity);
  const isHovered = useMotionValue(0);

  const maxHeight = useMemo(
    () => Math.max(dockHeight, magnification + magnification / 2 + 4),
    [dockHeight, magnification],
  );
  const heightRow = useTransform(isHovered, [0, 1], [panelHeight, maxHeight]);
  const height = useSpring(heightRow, spring);

  return (
    <motion.div
      style={{ height, scrollbarWidth: 'none' }}
      className="flex w-full max-w-full items-end justify-center"
    >
      <motion.div
        onMouseMove={({ pageX }) => {
          isHovered.set(1);
          mouseX.set(pageX);
        }}
        onMouseLeave={() => {
          isHovered.set(0);
          mouseX.set(Infinity);
        }}
        className={`${className} flex items-end w-fit gap-2.5 rounded-[28px] border border-white/70 bg-white/80 backdrop-blur-2xl pb-2 pt-2 px-3 shadow-[0_12px_40px_rgba(0,0,0,0.12),inset_0_1px_1px_rgba(255,255,255,0.9)]`}
        style={{ height: panelHeight }}
        role="toolbar"
        aria-label="Navigation dock"
      >
        {items.map((item, index) => (
          <DockItem
            key={index}
            onClick={item.onClick}
            className={item.className}
            mouseX={mouseX}
            spring={spring}
            distance={distance}
            magnification={magnification}
            baseItemSize={baseItemSize}
            isActive={item.isActive}
          >
            {/* Badge */}
            {item.badge !== undefined && item.badge !== null && (
              <DockBadge>{item.badge}</DockBadge>
            )}
            <DockIcon>{item.icon}</DockIcon>
            <DockLabel>{item.label}</DockLabel>
          </DockItem>
        ))}
      </motion.div>
    </motion.div>
  );
}

export default MagnificationDock;
