import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  LoaderCircle,
  Phone,
  PlusCircle,
  Sparkles,
  Stethoscope,
  User,
  X,
} from 'lucide-react';
import { ApiError, apiRequest } from '../../lib/api';

interface PublicDoctor {
  id: string;
  fullName: string;
  specialty: string;
  colorCode: string;
  experienceYears: number;
  rating: number;
}

interface PublicService {
  id: string;
  name: string;
  category: string;
  price: number;
  durationMinutes: number;
  description: string;
}

interface BookingResult {
  bookingCode: string;
  date: string;
  startTime: string;
}

interface LivePublicBookingProps {
  onClose: () => void;
  patientName?: string;
}

export const LivePublicBooking: React.FC<LivePublicBookingProps> = ({
  onClose,
  patientName,
}) => {
  const [doctors, setDoctors] = useState<PublicDoctor[]>([]);
  const [services, setServices] = useState<PublicService[]>([]);
  const [doctorId, setDoctorId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [date, setDate] = useState(getLocalDate);
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [startTime, setStartTime] = useState('');
  const [fullName, setFullName] = useState(patientName ?? '');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [result, setResult] = useState<BookingResult | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (patientName !== undefined) {
      setFullName(patientName);
    }
  }, [patientName]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);

    Promise.all([
      apiRequest<PublicDoctor[]>('/api/v1/public/doctors', {
        signal: controller.signal,
      }),
      apiRequest<PublicService[]>('/api/v1/public/services', {
        signal: controller.signal,
      }),
    ])
      .then(([doctorRows, serviceRows]) => {
        if (controller.signal.aborted) return;
        setDoctors(doctorRows);
        setServices(serviceRows);
        setDoctorId(doctorRows[0]?.id ?? '');
        setServiceId(serviceRows[0]?.id ?? '');
      })
      .catch((loadError) => {
        if (!controller.signal.aborted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Klinika ma’lumotlarini yuklab bo‘lmadi.'
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!doctorId || !serviceId || !date) return;
    const controller = new AbortController();
    setStartTime('');
    setSlots([]);
    setSlotsLoading(true);
    setError(null);

    apiRequest<string[]>(
      `/api/v1/public/slots?doctorId=${encodeURIComponent(
        doctorId
      )}&date=${encodeURIComponent(date)}&serviceId=${encodeURIComponent(
        serviceId
      )}`,
      { signal: controller.signal }
    )
      .then((availableSlots) => {
        if (!controller.signal.aborted) {
          setSlots(availableSlots);
        }
      })
      .catch((loadError) => {
        if (!controller.signal.aborted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Bo‘sh vaqtlarni yuklab bo‘lmadi.'
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setSlotsLoading(false);
        }
      });

    return () => controller.abort();
  }, [doctorId, serviceId, date]);

  const selectedDoctor = useMemo(
    () => doctors.find((d) => d.id === doctorId),
    [doctors, doctorId]
  );

  const selectedService = useMemo(
    () => services.find((s) => s.id === serviceId),
    [services, serviceId]
  );

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // Clipboard fallback ignored
    }
  };

  const handleBookAnother = () => {
    setResult(null);
    setStartTime('');
    setNotes('');
    setError(null);
    setCopiedCode(false);
  };

  const submitBooking = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!startTime) {
      setError('Avval bo‘sh vaqtni tanlang.');
      return;
    }

    const resolvedName = (patientName ?? fullName).trim();
    const resolvedPhone = patientName ? '' : phoneNumber.trim();

    if (!patientName && resolvedName.length < 2) {
      setError('Iltimos, ism-familiyangizni to‘liq kiriting.');
      return;
    }

    if (!patientName && resolvedPhone.length < 7) {
      setError('Iltimos, bog‘lanish uchun telefon raqamingizni kiriting.');
      return;
    }

    setSubmitting(true);
    try {
      const booking = await apiRequest<BookingResult>('/api/v1/public/bookings', {
        method: 'POST',
        headers: { 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({
          doctorId,
          serviceId,
          date,
          startTime,
          fullName: resolvedName,
          phoneNumber: resolvedPhone,
          notes: notes.trim() || null,
        }),
      });
      setResult(booking);
    } catch (bookingError) {
      setError(
        bookingError instanceof Error
          ? bookingError.message
          : 'Qabulga yozib bo‘lmadi.'
      );
      if (bookingError instanceof ApiError && bookingError.status === 409) {
        setSlots((current) => current.filter((slot) => slot !== startTime));
        setStartTime('');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 py-10 relative overflow-hidden">
        <div className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-emerald-400/20 blur-3xl" />

        <section className="mac-glass relative w-full max-w-lg rounded-3xl border border-white/85 bg-white/85 backdrop-blur-2xl p-7 sm:p-8 text-center shadow-2xl shadow-slate-900/10 space-y-5">
          {/* Apple Modal Header */}
          <div className="flex items-center justify-between pb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-3 py-1 rounded-full">
              Tasdiqlangan Talon
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Yopish"
              className="rounded-full p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100/80 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/15 to-teal-500/15 border border-emerald-200 text-emerald-600 shadow-inner">
            <CheckCircle2 className="h-9 w-9" />
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Qabulga yozildingiz
            </h1>
            <p className="text-xs text-slate-500">
              Elektron taloningiz rasmiylashtirildi. Klinika registratsiyasida ushbu kodni
              ko‘rsating.
            </p>
          </div>

          {/* Electronic Ticket Card */}
          <div className="rounded-2xl border border-dashed border-teal-300/90 bg-gradient-to-br from-teal-50/70 to-white/90 p-4 space-y-3 text-left">
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-dashed border-teal-200">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Bron Kodi
                </span>
                <span className="font-mono text-xl font-black text-teal-800 tracking-wide">
                  {result.bookingCode}
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleCopyCode(result.bookingCode)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-teal-50 border border-teal-200 text-xs font-bold text-teal-800 shadow-2xs transition-all cursor-pointer"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Nusxalandi</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Nusxa olish</span>
                  </>
                )}
              </button>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Sana va vaqt:</span>
                <span className="font-mono font-bold text-slate-900">
                  {result.date} · {result.startTime.slice(0, 5)}
                </span>
              </div>
              {selectedDoctor && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Shifokor:</span>
                  <span className="font-bold text-slate-900">{selectedDoctor.fullName}</span>
                </div>
              )}
              {selectedService && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Xizmat:</span>
                  <span className="font-semibold text-teal-800">
                    {selectedService.name} ({formatMoney(selectedService.price)})
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleBookAnother}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 px-4 py-2.5 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Yana yozilish</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 px-5 py-2.5 text-xs font-bold text-white shadow-md transition-all cursor-pointer"
            >
              Yopish
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-6 sm:py-10 relative overflow-hidden">
      {/* Subtle macOS Ambient Glow */}
      <div className="pointer-events-none absolute -top-24 left-1/4 w-96 h-96 rounded-full bg-teal-400/15 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-1/4 w-80 h-80 rounded-full bg-cyan-400/15 blur-3xl" />

      <section className="mac-glass relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-white/85 bg-white/80 backdrop-blur-2xl shadow-2xl shadow-slate-900/10">
        {/* Apple Modal Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200/60 bg-white/55">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            <span>Onlayn Qabulga Yozilish</span>
          </span>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Yopish"
          >
            <X className="h-4 w-4" />
            <span>Yopish</span>
          </button>
        </div>

        {/* Hero Header */}
        <header className="border-b border-slate-200/60 px-6 py-5 bg-gradient-to-r from-white/70 to-teal-50/40">
          <div className="flex items-center gap-3.5">
            <div className="rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-600 p-3 text-white shadow-md shadow-teal-600/20">
              <Stethoscope className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Onlayn qabulga yozilish
              </h1>
              <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
                Sizga mos mutaxassis, xizmat turi va qulay vaqtni tanlang.
              </p>
            </div>
          </div>
        </header>

        {loading ? (
          <div
            className="flex flex-col items-center justify-center gap-3 p-16 text-sm text-slate-500"
            role="status"
          >
            <LoaderCircle className="h-6 w-6 animate-spin text-teal-600" />
            <span>Klinika ma’lumotlari yuklanmoqda...</span>
          </div>
        ) : (
          <form onSubmit={submitBooking} className="space-y-6 p-5 sm:p-7">
            {/* 1. Doctor Selection Cards */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                  1. Shifokorni tanlang
                </span>
                <span className="text-[11px] text-slate-400">
                  {doctors.length} ta mutaxassis
                </span>
              </div>

              {doctors.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-5 text-center text-xs text-slate-500">
                  Hozircha faol shifokorlar ro‘yxati mavjud emas.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {doctors.map((doctor) => {
                    const isSelected = doctor.id === doctorId;
                    const initials = doctor.fullName
                      .trim()
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((p) => p[0]?.toUpperCase())
                      .join('');
                    return (
                      <button
                        key={doctor.id}
                        type="button"
                        onClick={() => setDoctorId(doctor.id)}
                        className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-white border-teal-500 shadow-md ring-2 ring-teal-500/20 -translate-y-0.5'
                            : 'bg-white/65 border-slate-200/85 hover:bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div
                            style={{
                              backgroundColor: doctor.colorCode || '#0d9488',
                            }}
                            className="w-9 h-9 rounded-xl text-white font-extrabold text-xs flex items-center justify-center shadow-xs shrink-0"
                          >
                            {initials || 'DR'}
                          </div>
                          <span className="text-[11px] font-bold text-amber-600 bg-amber-50 border border-amber-200/70 px-2 py-0.5 rounded-full">
                            ⭐ {doctor.rating.toFixed(1)}
                          </span>
                        </div>

                        <div className="text-xs font-extrabold text-slate-900 truncate">
                          {doctor.fullName}
                        </div>
                        <div className="text-[11px] font-semibold text-teal-700 mt-0.5 truncate">
                          {doctor.specialty}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1">
                          {doctor.experienceYears} yillik tajriba
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. Service Selection Cards */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                  2. Xizmat turini tanlang
                </span>
                <span className="text-[11px] text-slate-400">
                  {services.length} ta xizmat
                </span>
              </div>

              {services.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-5 text-center text-xs text-slate-500">
                  Xizmatlar ro‘yxati topilmadi.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {services.map((service) => {
                    const isSelected = service.id === serviceId;
                    return (
                      <button
                        key={service.id}
                        type="button"
                        onClick={() => setServiceId(service.id)}
                        className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                          isSelected
                            ? 'bg-white border-teal-500 shadow-sm ring-2 ring-teal-500/20'
                            : 'bg-white/65 border-slate-200/85 hover:bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-xs font-extrabold text-slate-900">
                              {service.name}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              {service.category} · ~{service.durationMinutes} daqiqa
                            </div>
                          </div>
                          <span className="font-mono text-xs font-extrabold text-teal-800 bg-teal-50 border border-teal-200/70 px-2.5 py-1 rounded-xl shrink-0">
                            {formatMoney(service.price)}
                          </span>
                        </div>
                        {service.description && (
                          <p className="text-[11px] text-slate-500 line-clamp-2">
                            {service.description}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 3. Date & Interactive Slots Grid */}
            <div className="rounded-2xl bg-white/75 border border-slate-200/80 p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800 block">
                    3. Sana va bo‘sh vaqtni tanlang
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {slotsLoading
                      ? 'Bo‘sh vaqtlar tekshirilmoqda...'
                      : slots.length
                      ? `${slots.length} ta bo‘sh vaqt mavjud`
                      : 'Tanlangan kun uchun bo‘sh vaqt topilmadi.'}
                  </span>
                </div>

                <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700">
                  <CalendarDays className="w-4 h-4 text-teal-600" />
                  <input
                    required
                    type="date"
                    min={getLocalDate()}
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-teal-500 focus:outline-none cursor-pointer"
                  />
                </label>
              </div>

              {slotsLoading ? (
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <div
                      key={idx}
                      className="h-10 rounded-xl bg-slate-200/60 animate-pulse"
                    />
                  ))}
                </div>
              ) : slots.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-4 text-center text-xs text-slate-500">
                  Ushbu sanada bo‘sh vaqt qolmagan. Boshqa sanani yoki shifokorni tanlab
                  ko‘ring.
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-2">
                  {slots.map((slot) => {
                    const isSelected = startTime === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => {
                          setStartTime(slot);
                          if (error) setError(null);
                        }}
                        className={`py-2.5 px-2 rounded-xl border font-mono text-xs transition-all cursor-pointer flex items-center justify-center gap-1 ${
                          isSelected
                            ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white border-teal-600 font-extrabold shadow-md ring-2 ring-teal-500/30 scale-[1.03]'
                            : 'bg-white text-slate-800 border-slate-200 hover:border-teal-400 hover:-translate-y-0.5'
                        }`}
                      >
                        <Clock
                          className={`w-3 h-3 ${
                            isSelected ? 'text-teal-100' : 'text-slate-400'
                          }`}
                        />
                        <span>{slot.slice(0, 5)}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 4. Patient Contact Details */}
            <div className="grid gap-4 sm:grid-cols-2">
              {patientName ? (
                <div className="sm:col-span-2 rounded-2xl border border-teal-200/80 bg-teal-50/70 p-4 text-xs sm:text-sm text-teal-950 flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>
                    Qabul <strong>{patientName}</strong> hisobiga biriktiriladi.
                  </span>
                </div>
              ) : (
                <>
                  <label className="text-xs font-bold text-slate-700 space-y-1.5">
                    <span className="inline-flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-teal-600" />
                      Ism-familiya *
                    </span>
                    <input
                      required
                      maxLength={160}
                      placeholder="Masalan: Jasur Toshmatov"
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                    />
                  </label>
                  <label className="text-xs font-bold text-slate-700 space-y-1.5">
                    <span className="inline-flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-teal-600" />
                      Telefon *
                    </span>
                    <input
                      required
                      maxLength={32}
                      type="tel"
                      placeholder="+998 90 123 45 67"
                      value={phoneNumber}
                      onChange={(event) => setPhoneNumber(event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 font-mono text-xs font-semibold text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                    />
                  </label>
                </>
              )}
            </div>

            <label className="block text-xs font-bold text-slate-700 space-y-1.5">
              <span>Izoh yoki shikoyat (ixtiyoriy)</span>
              <textarea
                maxLength={1000}
                rows={2}
                placeholder="Masalan: Tishda og‘riq bor yoki profilaktik ko‘rik..."
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
              />
            </label>

            {error && (
              <p
                role="alert"
                className="rounded-2xl border border-rose-200 bg-rose-50/90 p-3.5 text-xs font-medium text-rose-800"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={
                loading ||
                submitting ||
                slotsLoading ||
                !startTime ||
                !doctors.length ||
                !services.length
              }
              className="w-full rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 px-4 py-3.5 text-xs sm:text-sm font-extrabold text-white shadow-lg shadow-teal-600/20 transition-all active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <LoaderCircle className="w-4 h-4 animate-spin" />
                  <span>Band qilinmoqda...</span>
                </>
              ) : (
                <span>
                  {startTime
                    ? `Qabulni band qilish (${date} · ${startTime.slice(0, 5)})`
                    : 'Avval bo‘sh vaqtni tanlang'}
                </span>
              )}
            </button>
          </form>
        )}
      </section>
    </main>
  );
};

function formatMoney(value: number): string {
  return `${new Intl.NumberFormat('uz-UZ').format(value)} so‘m`;
}

function getLocalDate(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}