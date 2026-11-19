# DentaCore — UI Design System

**Direction:** Apple-inspired clinical glass UI, premium and calm; prioritize clinical legibility over decoration.  
**Current repository:** Tailwind CSS v4 via `@tailwindcss/vite`, React 19, and `motion` are already present. The package is `motion`, so import animations from `motion/react`; do not assume `framer-motion` is installed. `react-router-dom` and TanStack Query are not currently dependencies.

## 1. Design tokens

Keep translucent surfaces over a light, low-detail canvas. Ensure text and controls retain WCAG AA contrast; do not lower text opacity to make the glass effect. Use no external font dependency for the MVP; fall back from SF system fonts to Inter/system UI.

| Token | Value | Use |
|---|---|---|
| `--dc-canvas` | `#f5f7fb` | Main page background |
| `--dc-ink` | `#172033` | Primary text |
| `--dc-muted` | `#64748b` | Secondary text |
| `--dc-accent` | `#0f766e` | Primary action, active state |
| `--dc-link` | `#0369a1` | Links and calendar navigation |
| `--dc-border` | `rgba(255,255,255,.72)` | Glass border |
| `--dc-glass` | `rgba(255,255,255,.76)` | Panels and dialogs |
| `--dc-shadow` | `0 18px 55px rgba(15,23,42,.08)` | Elevated surfaces |
| `--dc-radius-card` | `1.25rem` | Cards |
| `--dc-radius-control` | `.75rem` | Inputs and buttons |

## 2. Tailwind CSS v4 setup

This project uses Tailwind v4's CSS-first configuration. Keep `@import "tailwindcss";` and the existing Vite Tailwind plugin; do not add a v3 `tailwind.config.js` unless migrating versions deliberately.

```css
/* src/index.css */
@import "tailwindcss";

@theme {
  --color-dc-canvas: #f5f7fb;
  --color-dc-ink: #172033;
  --color-dc-muted: #64748b;
  --color-dc-accent: #0f766e;
  --color-dc-link: #0369a1;
  --font-sans: -apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, ui-sans-serif, system-ui, sans-serif;
}

@layer base {
  :root {
    color-scheme: light;
    font-synthesis: none;
    text-rendering: optimizeLegibility;
  }

  html {
    min-width: 320px;
    background: var(--color-dc-canvas);
  }

  body {
    min-height: 100vh;
    margin: 0;
    color: var(--color-dc-ink);
    font-family: var(--font-sans);
    background:
      radial-gradient(ellipse at 12% 8%, rgb(224 242 254 / 65%), transparent 42%),
      radial-gradient(ellipse at 88% 78%, rgb(237 233 254 / 48%), transparent 40%),
      var(--color-dc-canvas);
    -webkit-font-smoothing: antialiased;
  }

  :focus-visible {
    outline: 3px solid rgb(14 116 144 / 65%);
    outline-offset: 3px;
  }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      scroll-behavior: auto !important;
      animation-duration: .01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: .01ms !important;
    }
  }
}

@utility dc-glass {
  background: rgb(255 255 255 / 76%);
  -webkit-backdrop-filter: blur(24px) saturate(170%);
  backdrop-filter: blur(24px) saturate(170%);
  border: 1px solid rgb(255 255 255 / 72%);
  box-shadow: 0 18px 55px rgb(15 23 42 / 8%);
}

@utility dc-glass-subtle {
  background: rgb(255 255 255 / 58%);
  -webkit-backdrop-filter: blur(16px) saturate(150%);
  backdrop-filter: blur(16px) saturate(150%);
  border: 1px solid rgb(255 255 255 / 62%);
}

@utility dc-control {
  @apply min-h-11 rounded-xl border border-slate-200/80 bg-white/80 px-3 text-sm text-slate-800 shadow-sm transition-colors;
}
```

For unsupported browsers, the translucent surface still has an opaque-enough background. Do not rely on blur for contrast or information hierarchy.

## 3. Reusable Tailwind patterns

### Page shell and responsive glass panel

```tsx
<main className="mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8">
  <section className="dc-glass rounded-2xl p-4 sm:rounded-3xl sm:p-6">
    {/* Route content */}
  </section>
</main>
```

### Navigation/header

```tsx
<header className="sticky top-0 z-40 border-b border-white/60 bg-white/70 px-4 py-3 shadow-sm backdrop-blur-2xl sm:px-6">
  <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3">
    <a className="text-sm font-semibold tracking-tight text-slate-900" href="/">DentaCore</a>
    <nav aria-label="Asosiy navigatsiya" className="flex items-center gap-2">
      {/* Only render links authorized for the current server-backed session. */}
    </nav>
  </div>
</header>
```

### Buttons and form controls

```tsx
<button
  type="button"
  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-teal-900/15 transition hover:bg-teal-800 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50"
>
  Qabulga yozilish
</button>

<label className="grid gap-1.5 text-sm font-medium text-slate-700">
  Telefon raqami
  <input
    type="tel"
    autoComplete="tel"
    className="min-h-11 rounded-xl border border-slate-300/80 bg-white/90 px-3 text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20"
  />
</label>
```

### Appointment states

Pair color with readable text/icon; status should never be color-only.

```tsx
<span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900">
  <span aria-hidden="true" className="size-1.5 rounded-full bg-amber-600" />
  Kutmoqda
</span>
```

### Glass modal with Motion

```tsx
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

type ModalProps = { open: boolean; onClose: () => void };

export function BookingModal({ open, onClose }: ModalProps) {
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/35 p-4 backdrop-blur-sm"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-labelledby="booking-title"
            className="dc-glass w-full max-w-lg rounded-3xl p-5 sm:p-7"
            initial={reduceMotion ? false : { opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: reduceMotion ? 0 : 0.18, ease: "easeOut" }}
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="booking-title" className="text-lg font-semibold tracking-tight">
              Qabul vaqtini tanlang
            </h2>
            {/* Focus the first field; trap focus; close on Escape; restore focus on close. */}
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

Use an accessible dialog primitive for production focus trapping, Escape handling, and focus restoration; Motion only handles presentation. Do not animate every small state change if it delays clinical tasks.

## 4. Screen and component standards

- **Portal:** single-purpose booking steps, clear progress, slot availability with timezone, accessible error/retry states, booking confirmation code. On small screens use stacked cards rather than a dense calendar.
- **Staff calendar:** desktop time-grid with doctor filter; tablet/mobile agenda/list view. Distinguish booked, blocked, lunch and available slots. Keep patient phone hidden unless the server returned permission to view it.
- **Odontogram:** keyboard-focusable FDI teeth with accessible names and state labels; provide a textual list alternative. Never encode diagnosis only by color.
- **Admin permissions:** table remains usable on mobile via labeled per-staff cards or horizontal scrolling with pinned row labels. Require confirmation and show the effect of a permission change.
- **Loading/error/empty states:** preserve the surrounding layout; use skeletons only for known content regions; provide retry and a non-color status message.
- **Touch:** controls are at least 44 px high; avoid hover-only actions. Support visible keyboard focus.
- **Privacy:** hide sensitive fields from rendered output when not returned by the API; do not rely on CSS blur/visibility as data protection.

## 5. Motion and interaction rules

Use brief 120–220 ms transitions for hover/focus and 160–240 ms for route/modal changes. Prefer opacity/transform to layout animation. Respect `prefers-reduced-motion`; avoid perpetual shimmer, bouncing notifications, parallax, and animation that conveys critical clinical state without text.

```tsx
import type { PropsWithChildren } from "react";
import { motion, useReducedMotion } from "motion/react";

export function RouteSurface({ children }: PropsWithChildren) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.18, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
```

## 6. Verification checklist

- Run the existing `npm run lint` (TypeScript check) and `npm run build`.
- Check 360 px, 768 px, and desktop widths; test keyboard-only navigation and reduced motion.
- Verify contrast for all text/control/state combinations and focus visibility.
- Verify overlays scroll on short screens, do not trap page scroll incorrectly, and have accessible names.
- Confirm animation code imports from installed `motion/react`; do not copy `framer-motion` imports unless that package is deliberately added.
