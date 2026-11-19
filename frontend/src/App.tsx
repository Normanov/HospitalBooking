 import React, { useCallback, useEffect, useRef, useState } from 'react';
import { UserRole, SignalREvent } from './types/dentacore';
import { MacMenuBar } from './components/MacMenuBar';
import { SignalRNotifier } from './components/SignalRNotifier';
import { LivePatientPortal } from './features/patient/LivePatientPortal';
import { LivePublicBooking } from './features/public-booking/LivePublicBooking';
import { LiveStaffCRM } from './features/crm/LiveStaffCRM';
import { AuthScreen } from './components/AuthScreen';
import { ClientLanding } from './components/ClientLanding';
import {
  AuthSession,
  onSessionExpired,
  restoreSession,
  signOut,
} from './lib/api';
import {
  ShieldAlert,
  ArrowRight,
  LogOut,
  Sparkles,
  AlertCircle,
  X,
} from 'lucide-react';

interface AppProps {
  portal?: 'client' | 'admin';
}

export default function App({ portal = 'client' }: AppProps) {
  const isAdminPortal = portal === 'admin';
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [publicScreen, setPublicScreen] = useState<
    'landing' | 'login' | 'register' | 'booking'
  >('landing');

  // Track SignalR auto-dismiss timers to prevent memory leaks
  const toastTimersRef = useRef<Map<string, number>>(new Map());

  useEffect(
    () =>
      onSessionExpired(() => {
        setSession(null);
        setPublicScreen('login');
        setAuthError('Sessiya muddati tugadi. Qayta kiring.');
      }),
    [],
  );

  useEffect(() => {
    const timers = toastTimersRef.current;
    return () => {
      timers.forEach((timerId) => window.clearTimeout(timerId));
      timers.clear();
    };
  }, []);

  useEffect(() => {
    if (!isAdminPortal && window.location.pathname.replace(/\/+$/, '') === '/admin') {
      window.location.replace(portalUrl(1));
      return;
    }

    let isMounted = true;
    restoreSession()
      .then((restored) => {
        if (isMounted) setSession(restored);
      })
      .catch((error: unknown) => {
        if (isMounted) {
          setAuthError(
            error instanceof Error ? error.message : 'Sessiyani tiklab bo‘lmadi.'
          );
        }
      })
      .finally(() => {
        if (isMounted) setIsRestoringSession(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isAdminPortal]);

  const handleLogout = async (nextScreen: 'landing' | 'login' = 'landing') => {
    try {
      await signOut();
    } catch (error) {
      setAuthError(
        error instanceof Error
          ? error.message
          : 'Tizimdan chiqishda xatolik yuz berdi.'
      );
    } finally {
      setSession(null);
      setPublicScreen(nextScreen);
    }
  };

  const currentRole: UserRole = session?.user.role ?? 'Patient';

  const switchPortal = (portOffset: number) => {
    window.location.assign(portalUrl(portOffset));
  };

  const handleAuthenticated = (authenticatedSession: AuthSession) => {
    setAuthError(null);
    if (isAdminPortal && authenticatedSession.user.role === 'Patient') {
      void signOut()
        .then(() => {
          setAuthError(
            'Bu portal faqat klinika xodimlari uchun. Xodim hisobidan kiring.'
          );
        })
        .catch((error: unknown) => {
          const detail =
            error instanceof Error ? error.message : 'Noma’lum xatolik.';
          setAuthError(
            `Bu portal faqat klinika xodimlari uchun. Bemor sessiyasini yopib bo‘lmadi: ${detail}`
          );
        });
      return;
    }
    setSession(authenticatedSession);
  };

  // SignalR Toast Notifications
  const [signalrEvents, setSignalrEvents] = useState<SignalREvent[]>([]);

  const handleDismissSignalR = useCallback((id: string) => {
    const existingTimer = toastTimersRef.current.get(id);
    if (existingTimer) {
      window.clearTimeout(existingTimer);
      toastTimersRef.current.delete(id);
    }
    setSignalrEvents((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const triggerSignalR = useCallback(
    (
      title: string,
      message: string,
      severity: 'info' | 'success' | 'warning' | 'danger'
    ) => {
      const id = `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const newEvent: SignalREvent = {
        id,
        type:
          severity === 'danger'
            ? 'SlotInvalidated'
            : 'AppointmentStatusChanged',
        title,
        message,
        timestamp: new Date().toLocaleTimeString('uz-UZ'),
        severity,
      };

      setSignalrEvents((prev) => [newEvent, ...prev.slice(0, 3)]);

      const timerId = window.setTimeout(() => {
        toastTimersRef.current.delete(id);
        setSignalrEvents((prev) => prev.filter((e) => e.id !== id));
      }, 6000);

      toastTimersRef.current.set(id, timerId);
    },
    []
  );

  // 1. macOS Glass Session Restoration Screen
  if (isRestoringSession) {
    return (
      <main
        className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden bg-gradient-to-br from-slate-100 via-teal-50/40 to-slate-200/80"
        role="status"
        aria-live="polite"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -left-24 w-96 h-96 rounded-full bg-teal-400/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-emerald-400/20 blur-3xl"
        />

        <div className="mac-glass relative rounded-3xl border border-white/85 bg-white/75 backdrop-blur-2xl px-8 py-7 shadow-[0_24px_60px_-15px_rgba(15,23,42,0.14),inset_0_1px_0_0_rgba(255,255,255,0.95)] flex flex-col items-center gap-4 text-center max-w-xs w-full">
          <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center shadow-lg shadow-teal-600/25">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-extrabold text-slate-900 tracking-tight">
              DentaCore
            </p>
            <p className="text-xs font-medium text-slate-600">
              DentaCore sessiyasi tekshirilmoqda...
            </p>
          </div>
          <div className="w-36 h-1.5 rounded-full bg-slate-200/80 overflow-hidden">
            <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 animate-[pulse_1.4s_ease-in-out_infinite]" />
          </div>
        </div>
      </main>
    );
  }

  // 2. Public Online Booking Flow
  if (!isAdminPortal && publicScreen === 'booking') {
    return (
      <LivePublicBooking
        onClose={() => setPublicScreen('landing')}
        patientName={
          currentRole === 'Patient' ? session?.user.fullName : undefined
        }
      />
    );
  }

  // 3. Unauthenticated Routes (Admin Login / Client Landing & Auth)
  if (!session) {
    if (isAdminPortal) {
      return (
        <AuthScreen
          initialMode="login"
          allowPatientRegistration={false}
          portalLabel="Xodimlar portali"
          backLabel="Bemorlar portaliga qaytish"
          onBack={() => switchPortal(-1)}
          onAuthenticated={handleAuthenticated}
          startupError={authError}
        />
      );
    }
    if (publicScreen === 'login' || publicScreen === 'register') {
      return (
        <AuthScreen
          initialMode={publicScreen}
          onBack={() => setPublicScreen('landing')}
          onAuthenticated={handleAuthenticated}
          startupError={authError}
        />
      );
    }
    return (
      <ClientLanding
        onBook={() => setPublicScreen('booking')}
        onLogin={() => setPublicScreen('login')}
        onRegister={() => setPublicScreen('register')}
        onAdminLogin={() => switchPortal(1)}
      />
    );
  }

  // 4. Role Isolation Guard: Patient on Admin Portal
  if (isAdminPortal && currentRole === 'Patient') {
    return (
      <main className="relative min-h-screen flex items-center justify-center px-4 py-10 overflow-hidden bg-gradient-to-br from-slate-100 via-rose-50/30 to-slate-200/80">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 right-1/4 w-80 h-80 rounded-full bg-rose-400/15 blur-3xl"
        />
        <section className="mac-glass relative w-full max-w-md rounded-3xl border border-white/85 bg-white/80 backdrop-blur-2xl p-8 text-center shadow-[0_24px_60px_-15px_rgba(15,23,42,0.16),inset_0_1px_0_0_rgba(255,255,255,0.95)]">
          <div className="mx-auto mb-4 w-12 h-12 rounded-2xl bg-rose-500/12 border border-rose-300/60 text-rose-600 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            Xodimlar portali
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Bu hisob bemor portaliga tegishli. Admin CRM’ga shifokor,
            administrator yoki Super Admin hisobi bilan kiring.
          </p>
          <div className="mt-6 flex flex-col gap-2.5">
            <a
              href={portalUrl(-1)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-teal-600/20 hover:from-teal-500 hover:to-emerald-500 transition-all"
            >
              <span>Bemorlar portaliga qaytish</span>
              <ArrowRight className="w-4 h-4" />
            </a>
            <button
              type="button"
              onClick={() => void handleLogout('login')}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Xodim hisobi bilan kirish</span>
            </button>
          </div>
        </section>
      </main>
    );
  }

  // 5. Role Isolation Guard: Staff on Client Portal
  if (!isAdminPortal && currentRole !== 'Patient') {
    return (
      <main className="relative min-h-screen flex items-center justify-center px-4 py-10 overflow-hidden bg-gradient-to-br from-slate-100 via-teal-50/40 to-slate-200/80">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 left-1/4 w-80 h-80 rounded-full bg-teal-400/20 blur-3xl"
        />
        <section className="mac-glass relative w-full max-w-md rounded-3xl border border-white/85 bg-white/80 backdrop-blur-2xl p-8 text-center shadow-[0_24px_60px_-15px_rgba(15,23,42,0.16),inset_0_1px_0_0_rgba(255,255,255,0.95)]">
          <div className="mx-auto mb-4 w-12 h-12 rounded-2xl bg-teal-500/12 border border-teal-300/60 text-teal-700 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            Xodimlar hisobi aniqlandi
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Xavfsiz Admin CRM boshqa portalda ishlaydi. Xodimlar paneliga
            o‘ting.
          </p>
          <div className="mt-6 flex flex-col gap-2.5">
            <a
              href={portalUrl(1)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-teal-600/20 hover:from-teal-500 hover:to-emerald-500 transition-all"
            >
              <span>Admin CRM’ga o‘tish</span>
              <ArrowRight className="w-4 h-4" />
            </a>
            <button
              type="button"
              onClick={() => void handleLogout('login')}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Boshqa hisob bilan kirish</span>
            </button>
          </div>
        </section>
      </main>
    );
  }

  // 6. Authenticated Desktop Workspace (Staff CRM or Patient Portal)
  return (
    <div className="relative min-h-screen flex flex-col antialiased selection:bg-teal-500 selection:text-white overflow-x-hidden">
      {/* Subtle Ambient macOS Desktop Backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-br from-slate-100 via-teal-50/35 to-slate-200/75"
      >
        <div className="absolute -top-32 left-1/4 w-[28rem] h-[28rem] rounded-full bg-teal-400/12 blur-3xl" />
        <div className="absolute top-1/3 -right-24 w-[26rem] h-[26rem] rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="absolute -bottom-32 left-12 w-[24rem] h-[24rem] rounded-full bg-indigo-400/10 blur-3xl" />
      </div>

      <MacMenuBar
        currentRole={currentRole}
        onLogout={() => void handleLogout('landing')}
      />

      <main className={`flex-1 w-full mx-auto px-2 sm:px-4 lg:px-6 py-3 sm:py-6 ${currentRole !== 'Patient' ? 'max-w-[1680px]' : 'max-w-7xl'}`}>
        {authError && (
          <div
            className="mb-5 rounded-2xl border border-rose-200/90 bg-rose-50/90 backdrop-blur-xl px-4 py-3 text-sm text-rose-800 shadow-xs flex items-center justify-between gap-3"
            role="alert"
          >
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{authError}</span>
            </div>
            <button
              type="button"
              onClick={() => setAuthError(null)}
              className="p-1 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-100/80 transition-colors cursor-pointer"
              aria-label="Xabarni yopish"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {currentRole !== 'Patient' && (
          <LiveStaffCRM
            role={currentRole}
            fullName={session.user.fullName}
            onNotify={triggerSignalR}
            onLogout={() => void handleLogout('landing')}
          />
        )}

        {/* Patient Role Isolation */}
        {currentRole === 'Patient' && (
          <LivePatientPortal
            fullName={session.user.fullName}
            onBookAppointment={() => setPublicScreen('booking')}
          />
        )}
      </main>

      <SignalRNotifier events={signalrEvents} onDismiss={handleDismissSignalR} />
    </div>
  );
}

function portalUrl(portOffset: number): string {
  const port = Number(window.location.port);
  return port
    ? `${window.location.protocol}//${window.location.hostname}:${port + portOffset}`
    : window.location.origin;
}