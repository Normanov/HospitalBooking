import React, { useEffect, useMemo, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Doctor,
  ServiceItem,
  Appointment,
  Patient,
} from '../../types/dentacore';
import {
  calculateDynamicSlots,
  formatMoneyUzs,
  getTodayDateString,
} from '../../data/mockData';
import {
  User,
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  Phone,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  AlertCircle,
  FileBadge,
  Copy,
  Check,
  PlusCircle,
  ShieldCheck,
} from 'lucide-react';

interface PublicBookingWizardProps {
  doctors: Doctor[];
  services: ServiceItem[];
  appointments: Appointment[];
  patients: Patient[];
  onBookSuccess: (newAppointment: Appointment, patient: Patient) => void;
  onTriggerSignalR: (
    title: string,
    message: string,
    severity: 'info' | 'success' | 'warning' | 'danger'
  ) => void;
}

function normalizePhoneDigits(phone: string): string {
  return phone.replace(/\D/g, '');
}

export const PublicBookingWizard: React.FC<PublicBookingWizardProps> = ({
  doctors,
  services,
  appointments,
  patients,
  onBookSuccess,
  onTriggerSignalR,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form selections
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(doctors[0]?.id || '');
  const [selectedServiceId, setSelectedServiceId] = useState<string>(services[0]?.id || '');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [selectedSlot, setSelectedSlot] = useState<{ startTime: string; endTime: string } | null>(
    null
  );

  // Patient inputs
  const [fullName, setFullName] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('+998');
  const [complaint, setComplaint] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Confirmed booking voucher details
  const [confirmedBooking, setConfirmedBooking] = useState<{
    appointment: Appointment;
    patient: Patient;
  } | null>(null);

  // Sync defaults when async props arrive
  useEffect(() => {
    if (!selectedDoctorId && doctors.length > 0) {
      setSelectedDoctorId(doctors[0].id);
    }
  }, [doctors, selectedDoctorId]);

  useEffect(() => {
    if (!selectedServiceId && services.length > 0) {
      setSelectedServiceId(services[0].id);
    }
  }, [services, selectedServiceId]);

  const selectedDoctor = useMemo(
    () => doctors.find((d) => d.id === selectedDoctorId) || doctors[0],
    [doctors, selectedDoctorId]
  );

  const selectedService = useMemo(
    () => services.find((s) => s.id === selectedServiceId) || services[0],
    [services, selectedServiceId]
  );

  // Dynamic slot calculation
  const slots = useMemo(
    () =>
      selectedDoctor
        ? calculateDynamicSlots(selectedDoctor, appointments, selectedDate)
        : [],
    [selectedDoctor, appointments, selectedDate]
  );

  const availableSlotsCount = useMemo(
    () => slots.filter((s) => s.isAvailable).length,
    [slots]
  );

  const handlePhoneChange = (val: string) => {
    let cleaned = val.replace(/[^\d+]/g, '');
    if (!cleaned.startsWith('+998')) {
      const digits = cleaned.replace(/\D/g, '');
      cleaned = digits.startsWith('998') ? `+${digits}` : `+998${digits}`;
    }
    if (cleaned.length > 13) {
      cleaned = cleaned.substring(0, 13);
    }
    setPhoneNumber(cleaned);
    if (errorMessage) setErrorMessage(null);
  };

  const handleCopyBookingCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // Clipboard fallback ignored
    }
  };

  const handleConfirmBooking = () => {
    setErrorMessage(null);

    if (!selectedDoctor || !selectedService) {
      setErrorMessage('Shifokor yoki xizmat maʼlumotlari topilmadi.');
      return;
    }

    // Validation
    if (!fullName.trim() || fullName.trim().length < 3) {
      setErrorMessage('Iltimos, toʻliq ism-sharifingizni kiriting (kamida 3 ta belgi).');
      return;
    }

    const phoneRegex = /^\+998(20|33|50|55|61|62|65|66|67|69|7[0-9]|88|9[0-57-9])\d{7}$/;
    if (!phoneRegex.test(phoneNumber)) {
      setErrorMessage('Telefon raqami notoʻgʻri formatda. Masalan: +998901234567');
      return;
    }

    if (!selectedSlot) {
      setErrorMessage('Iltimos, boʻsh vaqt slotini tanlang.');
      return;
    }

    // Double Booking Guard check
    const isAlreadyBooked = appointments.some(
      (app) =>
        app.doctorId === selectedDoctor.id &&
        app.date === selectedDate &&
        app.startTime === selectedSlot.startTime &&
        app.status !== 'Cancelled' &&
        app.status !== 'NoShow'
    );

    if (isAlreadyBooked) {
      setErrorMessage(
        'Afsuski, ushbu vaqt oraligʻi boshqa bemor tomonidan hozirgina band qilindi (Optimistic Concurrency 409 Conflict). Boshqa vaqtni tanlang.'
      );
      onTriggerSignalR(
        'Navbat Toʻqnashuvi (Double-Booking)',
        `${selectedDoctor.fullName} uchun ${selectedSlot.startTime} vaqti allaqachon band qilingan. Tizim birinchi soʻrovni qabul qildi.`,
        'danger'
      );
      setSelectedSlot(null);
      return;
    }

    // Idempotent Patient resolution (match by normalized phone number)
    const normalizedInputDigits = normalizePhoneDigits(phoneNumber);
    let existingPatient = patients.find(
      (p) => normalizePhoneDigits(p.phoneNumber) === normalizedInputDigits
    );

    if (!existingPatient) {
      existingPatient = {
        id: `pat-${Date.now()}`,
        fullName: fullName.trim(),
        phoneNumber,
        gender: 'Erkak',
        totalDebt: 0,
        notes: complaint.trim() || 'Onlayn portaldan birlamchi murojaat',
        createdAt: getTodayDateString(),
        lastVisit: selectedDate,
      };
    }

    const bookingCode = `DC-${Math.floor(1000 + Math.random() * 9000)}`;

    const newAppointment: Appointment = {
      id: `app-${Date.now()}`,
      doctorId: selectedDoctor.id,
      doctorName: selectedDoctor.fullName,
      patientId: existingPatient.id,
      patientName: existingPatient.fullName,
      patientPhone: existingPatient.phoneNumber,
      serviceId: selectedService.id,
      serviceName: selectedService.name,
      date: selectedDate,
      startTime: selectedSlot.startTime,
      endTime: selectedSlot.endTime,
      status: 'Pending',
      source: 'Online',
      notes: complaint.trim() || 'Onlayn portal orqali yozildi',
      bookingCode,
      createdAt: new Date().toLocaleString('uz-UZ'),
    };

    // Save and notify
    onBookSuccess(newAppointment, existingPatient);
    setConfirmedBooking({ appointment: newAppointment, patient: existingPatient });
    setStep(4);

    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {
      // Fallback if canvas not available
    }

    onTriggerSignalR(
      'Yangi Onlayn Qabul Band Qilindi!',
      `${existingPatient.fullName} → ${selectedDoctor.fullName} (${selectedDate} ${selectedSlot.startTime})`,
      'success'
    );
  };

  const handleReset = () => {
    setStep(1);
    setSelectedSlot(null);
    setFullName('');
    setPhoneNumber('+998');
    setComplaint('');
    setErrorMessage(null);
    setConfirmedBooking(null);
    setCopiedCode(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 relative">
      {/* Ambient macOS Frosted Aura */}
      <div className="pointer-events-none absolute -top-12 -left-12 w-56 h-56 rounded-full bg-teal-400/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-12 -right-12 w-56 h-56 rounded-full bg-emerald-400/15 blur-3xl" />

      {/* Main macOS Glass Window */}
      <div className="mac-glass relative rounded-3xl border border-white/85 bg-white/80 backdrop-blur-2xl shadow-2xl shadow-slate-900/10 overflow-hidden">
        {/* macOS Top Window Bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200/60 bg-white/55">
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500/90" />
            <span className="w-3 h-3 rounded-full bg-amber-400/90" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/90" />
          </div>
          <span className="text-[11px] font-semibold text-slate-500 inline-flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
            DentaCore Public Booking · Real-Time SignalR
          </span>
          <span className="text-[10px] font-mono font-bold text-teal-800 bg-teal-50 border border-teal-200/80 px-2 py-0.5 rounded-full">
            {step <= 3 ? `Qadam ${step}/3` : 'Tasdiqlandi'}
          </span>
        </div>

        {/* Wizard Header & Stepper */}
        <div className="p-5 sm:p-7">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-200/70">
            <div>
              <div className="inline-flex items-center gap-1.5 text-teal-700 bg-teal-50/90 border border-teal-200/70 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider">
                <Sparkles className="w-3 h-3" />
                <span>Tezkor & Qulay Navbat Tizimi</span>
              </div>
              <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mt-2 tracking-tight">
                Onlayn Qabulga Yozilish Portali
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                3 oddiy qadamda shifokor va qulay vaqtni tanlab elektron talon oling
              </p>
            </div>

            {/* Interactive Stepper Pills */}
            <div className="flex items-center gap-1.5 bg-slate-100/85 p-1.5 rounded-2xl border border-slate-200/70 self-start lg:self-auto">
              {[
                { num: 1 as const, label: 'Shifokor & Xizmat' },
                { num: 2 as const, label: 'Sana & Vaqt' },
                { num: 3 as const, label: 'Bemor Maʼlumoti' },
              ].map((s) => {
                const isClickable = step < 4 && s.num < step;
                return (
                  <button
                    key={s.num}
                    type="button"
                    disabled={!isClickable}
                    onClick={() => {
                      if (isClickable) {
                        setErrorMessage(null);
                        setStep(s.num);
                      }
                    }}
                    className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl text-xs transition-all ${
                      step === s.num
                        ? 'bg-white text-slate-900 font-bold shadow-xs'
                        : step > s.num
                        ? 'text-emerald-700 font-semibold hover:bg-white/60 cursor-pointer'
                        : 'text-slate-400 font-medium cursor-default'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                        step === s.num
                          ? 'bg-gradient-to-br from-teal-600 to-emerald-600 text-white shadow-xs'
                          : step > s.num
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-200/80 text-slate-500'
                      }`}
                    >
                      {step > s.num ? <CheckCircle2 className="w-3.5 h-3.5" /> : s.num}
                    </span>
                    <span className="hidden sm:inline">{s.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* STEP 1: Select Doctor & Service */}
          {step === 1 && (
            <div className="pt-6 space-y-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                    <User className="w-4 h-4 text-teal-600" />
                    <span>1. Shifokorni Tanlang</span>
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    {doctors.length} ta mutaxassis
                  </span>
                </div>

                {doctors.length === 0 ? (
                  <div className="p-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 text-center text-xs text-slate-500">
                    Hozircha faol shifokorlar roʻyxati mavjud emas.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                    {doctors.map((doc) => {
                      const isSelected = selectedDoctor?.id === doc.id;
                      return (
                        <button
                          key={doc.id}
                          type="button"
                          onClick={() => {
                            setSelectedDoctorId(doc.id);
                            setSelectedSlot(null);
                            setErrorMessage(null);
                          }}
                          className={`text-left p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? 'border-teal-500 bg-white shadow-md ring-2 ring-teal-500/20 -translate-y-0.5'
                              : 'border-slate-200/85 bg-white/65 hover:border-slate-300 hover:bg-white'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <img
                              src={doc.avatarUrl}
                              alt={doc.fullName}
                              className="w-12 h-12 rounded-2xl object-cover ring-2 ring-white shadow-xs shrink-0"
                            />
                            <div className="min-w-0">
                              <h4 className="text-xs font-extrabold text-slate-900 leading-tight truncate">
                                {doc.fullName}
                              </h4>
                              <p className="text-[11px] text-teal-700 font-semibold mt-0.5 truncate">
                                {doc.specialty}
                              </p>
                            </div>
                          </div>
                          <div className="mt-3.5 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                            <span>
                              ⭐ {doc.rating} ({doc.experienceYears} yil)
                            </span>
                            <span className="font-mono text-slate-600 bg-slate-100/80 px-2 py-0.5 rounded-md">
                              {doc.startHour}–{doc.endHour}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                    <FileBadge className="w-4 h-4 text-teal-600" />
                    <span>2. Kerakli Xizmat Turini Tanlang</span>
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    {services.length} ta xizmat
                  </span>
                </div>

                {services.length === 0 ? (
                  <div className="p-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 text-center text-xs text-slate-500">
                    Xizmatlar roʻyxati topilmadi.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {services.map((srv) => {
                      const isSelected = selectedService?.id === srv.id;
                      return (
                        <button
                          key={srv.id}
                          type="button"
                          onClick={() => {
                            setSelectedServiceId(srv.id);
                            setErrorMessage(null);
                          }}
                          className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            isSelected
                              ? 'border-teal-500 bg-white shadow-sm ring-2 ring-teal-500/20'
                              : 'border-slate-200/85 bg-white/65 hover:border-slate-300 hover:bg-white'
                          }`}
                        >
                          <div className="min-w-0">
                            <span className="text-[10px] uppercase font-bold text-teal-700 bg-teal-50 border border-teal-200/70 px-2 py-0.5 rounded-md">
                              {srv.category}
                            </span>
                            <h5 className="text-xs font-extrabold text-slate-900 mt-1.5 truncate">
                              {srv.name}
                            </h5>
                            <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                              {srv.description}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-xs font-mono font-extrabold text-teal-800 bg-teal-50/80 px-2.5 py-1 rounded-xl border border-teal-100 block">
                              {formatMoneyUzs(srv.price)}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono mt-1 block">
                              ~{srv.durationMinutes} daqiqa
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-200/60">
                <button
                  type="button"
                  disabled={!selectedDoctor || !selectedService}
                  onClick={() => setStep(2)}
                  className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-xs shadow-md shadow-teal-600/20 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                >
                  <span>Keyingi: Sana & Vaqt</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Select Date & Slot */}
          {step === 2 && selectedDoctor && (
            <div className="pt-6 space-y-6">
              {errorMessage && (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white/75 rounded-2xl border border-slate-200/80 shadow-2xs">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                    <CalendarIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900">Qabul Kuni</h4>
                    <p className="text-[11px] text-slate-500">
                      Shifokor: <strong className="text-slate-800">{selectedDoctor.fullName}</strong>
                    </p>
                  </div>
                </div>
                <input
                  type="date"
                  min={getTodayDateString()}
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setSelectedSlot(null);
                    setErrorMessage(null);
                  }}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white shadow-2xs focus:ring-2 focus:ring-teal-500/25 focus:border-teal-500 focus:outline-none cursor-pointer"
                />
              </div>

              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-teal-600" />
                    <span>Mavjud 30-Daqiqalik Vaqt Slotlari</span>
                  </h3>
                  <span className="text-xs text-teal-800 font-bold bg-teal-50 px-3 py-1 rounded-full border border-teal-200/80">
                    {availableSlotsCount} ta boʻsh vaqt mavjud
                  </span>
                </div>

                {slots.length === 0 ? (
                  <div className="p-8 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 text-center text-xs text-slate-500">
                    Tanlangan sana uchun vaqt slotlari mavjud emas. Boshqa sanani tanlang.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                    {slots.map((slot, index) => {
                      const isSelected = selectedSlot?.startTime === slot.startTime;
                      if (!slot.isAvailable) {
                        return (
                          <div
                            key={index}
                            title={slot.conflictReason}
                            className="p-2.5 rounded-xl border border-slate-200/70 bg-slate-100/80 text-slate-400 text-center cursor-not-allowed text-xs font-mono line-through opacity-65 select-none"
                          >
                            <div>{slot.startTime}</div>
                            <div className="text-[9px] truncate mt-0.5">
                              {slot.conflictReason || 'Band'}
                            </div>
                          </div>
                        );
                      }

                      return (
                        <button
                          key={index}
                          type="button"
                          onClick={() => {
                            setSelectedSlot({
                              startTime: slot.startTime,
                              endTime: slot.endTime,
                            });
                            setErrorMessage(null);
                          }}
                          className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer font-mono text-xs ${
                            isSelected
                              ? 'border-teal-600 bg-gradient-to-br from-teal-600 to-emerald-600 text-white font-bold shadow-md shadow-teal-600/25 ring-2 ring-teal-400/40 scale-[1.03]'
                              : 'border-slate-200/90 bg-white text-slate-800 hover:border-teal-400 hover:-translate-y-0.5'
                          }`}
                        >
                          <div className="font-bold">{slot.startTime}</div>
                          <div
                            className={`text-[10px] mt-0.5 ${
                              isSelected ? 'text-teal-100' : 'text-slate-400'
                            }`}
                          >
                            {slot.endTime} gacha
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-200/60">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    setStep(1);
                  }}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-semibold text-xs cursor-pointer transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Orqaga</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!selectedSlot) {
                      setErrorMessage('Iltimos, boʻsh vaqt slotini tanlang.');
                      return;
                    }
                    setErrorMessage(null);
                    setStep(3);
                  }}
                  disabled={!selectedSlot}
                  className={`inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all ${
                    selectedSlot
                      ? 'bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white shadow-teal-600/20 active:scale-[0.98] cursor-pointer'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                  }`}
                >
                  <span>Keyingi: Bemor Maʼlumotlari</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Patient Info & Confirmation */}
          {step === 3 && selectedDoctor && selectedService && (
            <div className="pt-6 space-y-5">
              {errorMessage && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Selected Summary Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-teal-50/80 to-white/90 border border-teal-200/80 flex flex-col sm:flex-row justify-between gap-3 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-extrabold text-teal-700 tracking-wider">
                    Tanlangan Qabul:
                  </span>
                  <h4 className="font-extrabold text-slate-900 text-sm mt-0.5">
                    {selectedDoctor.fullName}{' '}
                    <span className="font-medium text-slate-600">
                      ({selectedDoctor.specialty})
                    </span>
                  </h4>
                  <p className="text-slate-600 mt-0.5">
                    {selectedService.name} •{' '}
                    <strong className="font-mono text-teal-800">
                      {formatMoneyUzs(selectedService.price)}
                    </strong>
                  </p>
                </div>
                <div className="sm:text-right">
                  <span className="text-[10px] uppercase font-extrabold text-teal-700 tracking-wider">
                    Vaqt & Sana:
                  </span>
                  <p className="font-extrabold text-slate-900 text-sm mt-0.5">{selectedDate}</p>
                  <p className="font-mono text-teal-800 font-bold">
                    {selectedSlot?.startTime} – {selectedSlot?.endTime}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Ism va Familiyangiz *
                  </label>
                  <input
                    type="text"
                    placeholder="Masalan: Otabek Salimov"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-teal-500/25 focus:border-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Telefon Raqamingiz (+998) *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-teal-600 absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type="tel"
                      placeholder="+998901234567"
                      value={phoneNumber}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-mono font-semibold text-slate-900 focus:ring-2 focus:ring-teal-500/25 focus:border-teal-500 focus:outline-none"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Oʻzbekiston formati: +998 (9x, 33, 88, 77, 50) xxx xx xx
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Shikoyatingiz yoki Qisqacha Izoh (Ixtiyoriy)
                </label>
                <textarea
                  rows={2}
                  placeholder="Masalan: Pastki oʻng tishimda issiq-sovuqqa ogʻriq bor..."
                  value={complaint}
                  onChange={(e) => setComplaint(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:ring-2 focus:ring-teal-500/25 focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-200/60">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    setStep(2);
                  }}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-semibold text-xs cursor-pointer transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Orqaga</span>
                </button>

                <button
                  type="button"
                  onClick={handleConfirmBooking}
                  className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-xs shadow-md shadow-teal-600/20 transition-all active:scale-[0.98] cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Qabulni Tasdiqlash & Navbat Olish</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Success Voucher */}
          {step === 4 && confirmedBooking && (
            <div className="pt-6 text-center space-y-5">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/15 to-teal-500/15 border border-emerald-200 text-emerald-600 mx-auto flex items-center justify-center shadow-inner">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">
                  Qabulingiz Muvaffaqiyatli Band Qilindi!
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Sizning buyurtmangiz klinika CRM tizimiga (SignalR orqali) real vaqtda
                  yetkazildi.
                </p>
              </div>

              {/* Electronic Wallet-Style Voucher */}
              <div className="max-w-md mx-auto bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white rounded-3xl p-6 text-left border border-slate-800 shadow-2xl relative overflow-hidden">
                <div className="pointer-events-none absolute -right-10 -top-10 w-36 h-36 rounded-full bg-teal-500/15 blur-2xl" />

                <div className="flex items-center justify-between border-b border-dashed border-slate-700/90 pb-3.5 relative">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-teal-400 font-bold block">
                      DentaCore Elektron Talon
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xl font-mono font-black text-white tracking-wide">
                        {confirmedBooking.appointment.bookingCode}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopyBookingCode(
                            confirmedBooking.appointment.bookingCode || ''
                          )
                        }
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-[10px] font-semibold text-teal-200 transition-colors cursor-pointer"
                      >
                        {copiedCode ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span>Nusxalandi</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Nusxa</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                    Tasdiq kutilmoqda
                  </div>
                </div>

                <div className="mt-4 space-y-2.5 text-xs relative">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Bemor:</span>
                    <span className="font-bold text-white">
                      {confirmedBooking.patient.fullName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Telefon:</span>
                    <span className="font-mono text-slate-300">
                      {confirmedBooking.patient.phoneNumber}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Shifokor:</span>
                    <span className="font-bold text-teal-300">
                      {confirmedBooking.appointment.doctorName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Vaqt & Sana:</span>
                    <span className="font-mono text-white font-bold">
                      {confirmedBooking.appointment.date} (
                      {confirmedBooking.appointment.startTime} –{' '}
                      {confirmedBooking.appointment.endTime})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Xizmat:</span>
                    <span className="text-slate-200 font-medium">
                      {confirmedBooking.appointment.serviceName}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/90 text-[11px] text-slate-400 text-center">
                  Iltimos, qabul vaqtidan 10 daqiqa oldin klinikaga tashrif buyuring.
                </div>
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-800 font-bold text-xs cursor-pointer transition-colors"
                >
                  <PlusCircle className="w-4 h-4 text-teal-600" />
                  <span>Yana yangi qabulga yozilish</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};