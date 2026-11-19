import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  LockKeyhole,
  Mail,
  Phone,
  Stethoscope,
  User,
} from 'lucide-react';
import { AuthSession, registerPatient, signIn } from '../lib/api';

interface AuthScreenProps {
  onAuthenticated: (session: AuthSession) => void;
  onBack: () => void;
  initialMode?: 'login' | 'register';
  allowPatientRegistration?: boolean;
  portalLabel?: string;
  backLabel?: string;
  startupError?: string | null;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onAuthenticated,
  onBack,
  initialMode = 'login',
  allowPatientRegistration = true,
  portalLabel = 'DentaCore',
  backLabel = 'Bosh sahifaga qaytish',
  startupError,
}) => {
  const [isRegistering, setIsRegistering] = useState(allowPatientRegistration && initialMode === 'register');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(startupError ?? null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      if (isRegistering) {
        await registerPatient({
          fullName: fullName.trim(),
          email: email.trim(),
          phoneNumber: phoneNumber.trim(),
          password,
        });
      }
      onAuthenticated(await signIn(email.trim(), password));
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'So‘rovni bajarib bo‘lmadi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="relative min-h-[100dvh] w-full overflow-x-hidden bg-gradient-to-br from-[#F4F8FA] via-[#EBF5F5] to-[#E6F1F8] flex items-center justify-center px-3.5 py-6 sm:px-6 sm:py-10 selection:bg-teal-500/20 selection:text-teal-900">
      <style>{`
        @keyframes dcOrbFloatSlow {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(24px, -28px, 0) scale(1.08); }
        }
        @keyframes dcOrbFloatReverse {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(-26px, 22px, 0) scale(1.06); }
        }
        @keyframes dcGlassEntrance {
          0% {
            opacity: 0;
            transform: translate3d(0, 22px, 0) scale(0.975);
          }
          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
          }
        }
        @keyframes dcFieldReveal {
          0% {
            opacity: 0;
            transform: translate3d(0, -10px, 0);
          }
          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }
        @keyframes dcShakeSoft {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .dc-orb-1 { animation: dcOrbFloatSlow 14s ease-in-out infinite; }
        .dc-orb-2 { animation: dcOrbFloatReverse 17s ease-in-out infinite; }
        .dc-glass-card {
          animation: dcGlassEntrance 0.65s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .dc-field-enter {
          animation: dcFieldReveal 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .dc-error-pop {
          animation: dcFieldReveal 0.3s ease-out both, dcShakeSoft 0.35s ease-in-out;
        }
      `}</style>

      {/* Ambient Aurora Mesh Background (Blurred Glass Refraction Layer) */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="dc-orb-1 absolute -top-24 -left-20 h-72 w-72 sm:h-96 sm:w-96 rounded-full bg-gradient-to-tr from-teal-400/30 via-emerald-300/25 to-cyan-300/20 blur-3xl" />
        <div className="dc-orb-2 absolute -bottom-28 -right-20 h-80 w-80 sm:h-[28rem] sm:w-[28rem] rounded-full bg-gradient-to-bl from-cyan-400/25 via-sky-300/25 to-indigo-300/20 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 sm:h-80 sm:w-80 rounded-full bg-teal-200/20 blur-3xl" />
      </div>

      {/* macOS Frosted Glass Container */}
      <section className="mac-glass dc-glass-card relative z-10 w-full max-w-[430px] rounded-[26px] sm:rounded-[32px] border border-white/80 bg-white/65 p-5 min-[375px]:p-6 sm:p-9 backdrop-blur-2xl backdrop-saturate-150 shadow-[0_24px_60px_-15px_rgba(15,23,42,0.12),0_0_0_1px_rgba(255,255,255,0.65)_inset] transition-all duration-500">
        {/* Top Specular Edge Highlight */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-90"
        />

        {/* Back Navigation Pill */}
        <div className="flex items-center justify-between gap-2 mb-5 sm:mb-6">
          <button
            type="button"
            onClick={onBack}
            className="group inline-flex items-center gap-1.5 rounded-full border border-slate-200/70 bg-white/60 px-3 py-1.5 text-xs sm:text-[13px] font-semibold text-slate-600 shadow-xs backdrop-blur-md transition-all duration-200 hover:border-slate-300 hover:bg-white/95 hover:text-slate-900 active:scale-[0.97]"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
            <span className="truncate max-w-[200px] min-[375px]:max-w-none">{backLabel}</span>
          </button>

          <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-500/20 bg-teal-500/10 px-2.5 py-1 text-[11px] font-bold tracking-wider uppercase text-teal-800 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-teal-500 animate-pulse" />
            {portalLabel}
          </span>
        </div>

        {/* Brand Icon with Ambient Glow */}
        <div className="relative mx-auto mb-5 flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center">
          <div
            aria-hidden="true"
            className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-teal-500 to-cyan-400 opacity-35 blur-lg"
          />
          <div className="relative flex h-full w-full items-center justify-center rounded-2xl border border-white/50 bg-gradient-to-br from-teal-600 via-teal-500 to-cyan-500 text-white shadow-lg shadow-teal-600/25 transition-transform duration-300 hover:scale-105">
            <Stethoscope className="h-7 w-7 sm:h-8 sm:w-8 drop-shadow-xs" />
          </div>
        </div>

        {/* Header Typography */}
        <div className="text-center">
          <h1 className="text-xl min-[375px]:text-2xl sm:text-[26px] font-extrabold tracking-tight text-slate-900 leading-tight">
            {isRegistering
              ? 'Bemor sifatida ro‘yxatdan o‘ting'
              : allowPatientRegistration
                ? 'Hisobingizga kiring'
                : 'Admin CRM’ga kiring'}
          </h1>
          <p className="mt-1.5 text-xs min-[375px]:text-sm text-slate-500 leading-relaxed">
            {isRegistering
              ? 'Shaxsiy klinika portalingizni yarating.'
              : allowPatientRegistration
                ? 'Bemorlar uchun shaxsiy klinika portali.'
                : 'Faqat tasdiqlangan klinika xodimlari uchun.'}
          </p>
        </div>

        {/* Form */}
        <form className="mt-6 sm:mt-7 space-y-3.5 sm:space-y-4" onSubmit={handleSubmit}>
          {isRegistering && (
            <div className="dc-field-enter space-y-3.5 sm:space-y-4">
              <label className="block text-xs sm:text-sm font-semibold text-slate-700">
                Ism-familiya
                <div className="group relative mt-1.5">
                  <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors duration-200 group-focus-within:text-teal-600" />
                  <input
                    required
                    maxLength={160}
                    autoComplete="name"
                    placeholder="Masalan: Sardor Karimov"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    className="w-full rounded-xl sm:rounded-2xl border border-slate-200/80 bg-white/65 pl-10 pr-3.5 py-2.5 sm:py-3 text-base sm:text-sm text-slate-900 placeholder:text-slate-400/80 shadow-2xs backdrop-blur-md outline-none transition-all duration-200 hover:bg-white/85 focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/15"
                  />
                </div>
              </label>

              <label className="block text-xs sm:text-sm font-semibold text-slate-700">
                Telefon raqami
                <div className="group relative mt-1.5">
                  <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors duration-200 group-focus-within:text-teal-600" />
                  <input
                    required
                    maxLength={32}
                    type="tel"
                    autoComplete="tel"
                    placeholder="+998 90 123 45 67"
                    value={phoneNumber}
                    onChange={(event) => setPhoneNumber(event.target.value)}
                    className="w-full rounded-xl sm:rounded-2xl border border-slate-200/80 bg-white/65 pl-10 pr-3.5 py-2.5 sm:py-3 text-base sm:text-sm text-slate-900 placeholder:text-slate-400/80 shadow-2xs backdrop-blur-md outline-none transition-all duration-200 hover:bg-white/85 focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/15"
                  />
                </div>
              </label>
            </div>
          )}

          <label className="block text-xs sm:text-sm font-semibold text-slate-700">
            Email
            <div className="group relative mt-1.5">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors duration-200 group-focus-within:text-teal-600" />
              <input
                required
                maxLength={160}
                type="email"
                autoComplete="email"
                placeholder="name@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl sm:rounded-2xl border border-slate-200/80 bg-white/65 pl-10 pr-3.5 py-2.5 sm:py-3 text-base sm:text-sm text-slate-900 placeholder:text-slate-400/80 shadow-2xs backdrop-blur-md outline-none transition-all duration-200 hover:bg-white/85 focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/15"
              />
            </div>
          </label>

          <label className="block text-xs sm:text-sm font-semibold text-slate-700">
            Parol
            <div className="group relative mt-1.5">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors duration-200 group-focus-within:text-teal-600" />
              <input
                required
                minLength={isRegistering ? 12 : 1}
                type={showPassword ? 'text' : 'password'}
                autoComplete={isRegistering ? 'new-password' : 'current-password'}
                placeholder="••••••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl sm:rounded-2xl border border-slate-200/80 bg-white/65 pl-10 pr-11 py-2.5 sm:py-3 text-base sm:text-sm text-slate-900 placeholder:text-slate-400/80 shadow-2xs backdrop-blur-md outline-none transition-all duration-200 hover:bg-white/85 focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/15"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Parolni yashirish' : 'Parolni ko‘rsatish'}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-200/50 hover:text-slate-700"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {isRegistering && (
              <span className="mt-1.5 block text-[11px] sm:text-xs font-normal text-slate-500">
                Kamida 12 ta belgi.
              </span>
            )}
          </label>

          {(error || startupError) && (
            <div
              role="alert"
              className="dc-error-pop flex items-start gap-2.5 rounded-xl sm:rounded-2xl border border-rose-200/90 bg-rose-50/85 px-3.5 py-3 text-xs sm:text-sm text-rose-800 backdrop-blur-md shadow-xs"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
              <p className="leading-snug">{error || startupError}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="group relative mt-2 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 px-4 py-3 sm:py-3.5 text-sm sm:text-[15px] font-semibold text-white shadow-lg shadow-slate-900/20 transition-all duration-300 hover:shadow-xl hover:shadow-teal-900/25 hover:brightness-110 active:scale-[0.985] disabled:cursor-wait disabled:opacity-65"
          >
            {/* Subtle Glass Shimmer Sweep on Hover */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full"
            />
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-teal-300" />
                <span>Tekshirilmoqda...</span>
              </>
            ) : (
              <>
                <LockKeyhole className="h-4 w-4 text-teal-300 transition-transform duration-200 group-hover:scale-110" />
                <span>{isRegistering ? 'Ro‘yxatdan o‘tish' : 'Kirish'}</span>
              </>
            )}
          </button>
        </form>

        {/* Mode Switcher */}
        {allowPatientRegistration && (
          <div className="mt-5 sm:mt-6 pt-4 border-t border-slate-200/60 text-center">
            <button
              type="button"
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError(null);
              }}
              className="inline-flex items-center justify-center rounded-lg px-2 py-1 text-xs sm:text-sm font-semibold text-teal-700 transition-all duration-200 hover:bg-teal-500/10 hover:text-teal-900 active:scale-[0.98]"
            >
              {isRegistering ? 'Hisobingiz bormi? Kirish' : 'Bemor sifatida ro‘yxatdan o‘tish'}
            </button>
          </div>
        )}
      </section>
    </main>
  );
};