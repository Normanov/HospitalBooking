import React, { useEffect, useMemo, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Doctor,
  ServiceItem,
  Appointment,
  Patient,
  ToothData,
  ToothCondition,
  Invoice,
} from '../../types/dentacore';
import {
  calculateDynamicSlots,
  formatMoneyUzs,
  getTodayDateString,
} from '../../data/mockData';
import { MacWindowHeader } from '../../components/MacWindowHeader';
import {
  Globe2,
  Ticket,
  Activity,
  Receipt,
  CheckCircle2,
  Clock,
  Calendar,
  User,
  Phone,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  PlusCircle,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react';

interface PatientPortalProps {
  doctors: Doctor[];
  services: ServiceItem[];
  appointments: Appointment[];
  patients: Patient[];
  teethMap: Record<number, ToothData>;
  invoices: Invoice[];
  onBookSuccess: (newAppointment: Appointment, patient: Patient) => void;
  onTriggerSignalR: (
    title: string,
    message: string,
    severity: 'info' | 'success' | 'warning' | 'danger'
  ) => void;
}

type PortalSubTab = 'booking' | 'vouchers' | 'teeth' | 'billing';

const UPPER_JAW = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_JAW = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

const STATUS_META: Record<string, { label: string; badge: string }> = {
  Pending: {
    label: 'Tasdiq kutilmoqda',
    badge: 'bg-amber-100/90 text-amber-800 border border-amber-200',
  },
  Confirmed: {
    label: 'Tasdiqlangan',
    badge: 'bg-emerald-100/90 text-emerald-800 border border-emerald-200',
  },
  InProgress: {
    label: 'Qabulda',
    badge: 'bg-sky-100/90 text-sky-800 border border-sky-200',
  },
  Completed: {
    label: 'Yakunlangan',
    badge: 'bg-teal-100/90 text-teal-800 border border-teal-200',
  },
  Cancelled: {
    label: 'Bekor qilingan',
    badge: 'bg-rose-100/90 text-rose-700 border border-rose-200',
  },
  NoShow: {
    label: 'Kelmagan',
    badge: 'bg-slate-200/80 text-slate-700 border border-slate-300',
  },
};

const CONDITION_META: Record<
  ToothCondition,
  { label: string; badge: string; dot: string }
> = {
  Healthy: {
    label: 'Sogʻlom',
    badge: 'bg-emerald-500/10 text-emerald-800 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  Caries: {
    label: 'Karies',
    badge: 'bg-rose-500/12 text-rose-800 border-rose-200',
    dot: 'bg-rose-500',
  },
  Filling: {
    label: 'Plomba',
    badge: 'bg-sky-500/12 text-sky-800 border-sky-200',
    dot: 'bg-sky-500',
  },
  Crown: {
    label: 'Qoplama',
    badge: 'bg-amber-500/12 text-amber-800 border-amber-200',
    dot: 'bg-amber-500',
  },
  Endodontic: {
    label: 'Endo (Kanal)',
    badge: 'bg-purple-500/12 text-purple-800 border-purple-200',
    dot: 'bg-purple-500',
  },
  Implant: {
    label: 'Implant',
    badge: 'bg-teal-500/12 text-teal-800 border-teal-200',
    dot: 'bg-teal-500',
  },
  Extracted: {
    label: 'Olingan',
    badge: 'bg-slate-200/80 text-slate-600 border-slate-300',
    dot: 'bg-slate-400',
  },
};

export const PatientPortal: React.FC<PatientPortalProps> = ({
  doctors,
  services,
  appointments,
  patients,
  teethMap,
  invoices,
  onBookSuccess,
  onTriggerSignalR,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<PortalSubTab>('booking');

  // Active logged-in demo patient: Otabek Salimov (pat-1)
  const currentPatient = useMemo(
    () => patients.find((p) => p.id === 'pat-1') || patients[0],
    [patients]
  );

  const patientAppointments = useMemo(
    () =>
      currentPatient
        ? appointments.filter((a) => a.patientId === currentPatient.id)
        : [],
    [appointments, currentPatient]
  );

  const patientInvoices = useMemo(
    () =>
      currentPatient
        ? invoices.filter((i) => i.patientId === currentPatient.id)
        : [],
    [invoices, currentPatient]
  );

  // Wizard state
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(doctors[0]?.id || '');
  const [selectedServiceId, setSelectedServiceId] = useState<string>(services[0]?.id || '');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [selectedSlot, setSelectedSlot] = useState<{ startTime: string; endTime: string } | null>(
    null
  );
  const [patientFullName, setPatientFullName] = useState<string>(
    currentPatient?.fullName || ''
  );
  const [patientPhone, setPatientPhone] = useState<string>(
    currentPatient?.phoneNumber || ''
  );
  const [complaintNote, setComplaintNote] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastBookedAppointment, setLastBookedAppointment] = useState<Appointment | null>(null);
  const [selectedToothNum, setSelectedToothNum] = useState<number>(16);

  // Sync defaults if props load asynchronously
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

  useEffect(() => {
    if (currentPatient) {
      setPatientFullName(currentPatient.fullName);
      setPatientPhone(currentPatient.phoneNumber);
    }
  }, [currentPatient]);

  const selectedDoctor = useMemo(
    () => doctors.find((d) => d.id === selectedDoctorId) || doctors[0],
    [doctors, selectedDoctorId]
  );

  const selectedService = useMemo(
    () => services.find((s) => s.id === selectedServiceId) || services[0],
    [services, selectedServiceId]
  );

  const slots = useMemo(
    () =>
      selectedDoctor
        ? calculateDynamicSlots(selectedDoctor, appointments, selectedDate)
        : [],
    [selectedDoctor, appointments, selectedDate]
  );

  const treatedTeeth = useMemo(
    () =>
      Object.values(teethMap)
        .filter((t) => t.condition !== 'Healthy' || (t.surfaces && t.surfaces.length > 0))
        .sort((a, b) => a.number - b.number),
    [teethMap]
  );

  const tabs = [
    {
      id: 'booking',
      label: 'Onlayn Qabulga Yozilish',
      icon: <Globe2 className="w-3.5 h-3.5" />,
    },
    {
      id: 'vouchers',
      label: 'Mening Talonlarim',
      icon: <Ticket className="w-3.5 h-3.5" />,
      badge: `${patientAppointments.length}`,
    },
    {
      id: 'teeth',
      label: 'Mening Tish Pasportim',
      icon: <Activity className="w-3.5 h-3.5" />,
    },
    {
      id: 'billing',
      label: 'Toʻlovlar & Qarz Balansi',
      icon: <Receipt className="w-3.5 h-3.5" />,
    },
  ];

  const handleResetWizard = () => {
    setWizardStep(1);
    setSelectedSlot(null);
    setComplaintNote('');
    setErrorMessage(null);
  };

  const handleConfirmBooking = () => {
    setErrorMessage(null);

    if (!currentPatient || !selectedDoctor || !selectedService) {
      setErrorMessage('Shifokor yoki xizmat maʼlumotlari topilmadi.');
      return;
    }

    if (!selectedSlot) {
      setErrorMessage('Iltimos, boʻsh vaqt slotini tanlang.');
      return;
    }

    const trimmedName = patientFullName.trim() || currentPatient.fullName;
    const trimmedPhone = patientPhone.trim() || currentPatient.phoneNumber;

    // Double Booking exclusion check
    const isConflict = appointments.some(
      (a) =>
        a.doctorId === selectedDoctor.id &&
        a.date === selectedDate &&
        a.startTime === selectedSlot.startTime &&
        a.status !== 'Cancelled' &&
        a.status !== 'NoShow'
    );

    if (isConflict) {
      setErrorMessage(
        'Ushbu vaqt oraligʻi allaqachon boshqa bemor tomonidan band qilindi (409 Conflict). Boshqa vaqtni tanlang.'
      );
      return;
    }

    const bookingCode = `DC-${Math.floor(1000 + Math.random() * 9000)}`;
    const updatedPatient: Patient = {
      ...currentPatient,
      fullName: trimmedName,
      phoneNumber: trimmedPhone,
    };

    const newApp: Appointment = {
      id: `app-${Date.now()}`,
      doctorId: selectedDoctor.id,
      doctorName: selectedDoctor.fullName,
      patientId: updatedPatient.id,
      patientName: updatedPatient.fullName,
      patientPhone: updatedPatient.phoneNumber,
      serviceId: selectedService.id,
      serviceName: selectedService.name,
      date: selectedDate,
      startTime: selectedSlot.startTime,
      endTime: selectedSlot.endTime,
      status: 'Pending',
      source: 'Online',
      notes: complaintNote.trim() || 'Onlayn bemor portali orqali yozildi',
      bookingCode,
      createdAt: new Date().toLocaleString('uz-UZ'),
    };

    onBookSuccess(newApp, updatedPatient);
    setLastBookedAppointment(newApp);
    setWizardStep(4);

    try {
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
    } catch {
      // Fallback if canvas-confetti is unavailable
    }

    onTriggerSignalR(
      'Yangi Onlayn Qabul Yaratildi',
      `${updatedPatient.fullName} → ${selectedDoctor.fullName} (${selectedSlot.startTime})`,
      'success'
    );
  };

  if (!currentPatient) {
    return (
      <div className="mac-glass rounded-3xl border border-white/80 bg-white/80 backdrop-blur-2xl p-8 text-center text-xs text-slate-500">
        Bemor profili maʼlumotlari topilmadi.
      </div>
    );
  }

  return (
    <div className="mac-glass relative rounded-3xl border border-white/80 bg-white/80 backdrop-blur-2xl shadow-2xl shadow-slate-900/10 overflow-hidden">
      <MacWindowHeader
        title={`Bemor Portali — ${currentPatient.fullName}`}
        subtitle="Onlayn navbat olish, elektron talonlar va tish pasporti"
        role="Patient"
        tabs={tabs}
        activeTab={activeSubTab}
        onTabChange={(id) => setActiveSubTab(id as PortalSubTab)}
      />

      <div className="p-5 sm:p-6 md:p-8 space-y-6">
        {/* SUB-TAB 1: ONLINE BOOKING WIZARD */}
        {activeSubTab === 'booking' && (
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Stepper tracker */}
            <div className="flex items-center justify-between p-3.5 bg-white/75 backdrop-blur-xl rounded-2xl border border-slate-200/80 shadow-2xs text-xs">
              {[
                { num: 1, label: 'Shifokor & Xizmat' },
                { num: 2, label: 'Sana & Vaqt Sloti' },
                { num: 3, label: 'Tasdiqlash' },
              ].map((s, idx) => (
                <React.Fragment key={s.num}>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                        wizardStep === s.num
                          ? 'bg-gradient-to-br from-teal-600 to-emerald-600 text-white shadow-xs scale-105'
                          : wizardStep > s.num
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-slate-200/80 text-slate-500'
                      }`}
                    >
                      {wizardStep > s.num ? '✓' : s.num}
                    </span>
                    <span
                      className={`font-semibold hidden sm:inline ${
                        wizardStep >= s.num ? 'text-slate-900' : 'text-slate-400'
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                  {idx < 2 && (
                    <div
                      className={`h-0.5 flex-1 mx-3 rounded-full ${
                        wizardStep > s.num ? 'bg-emerald-300' : 'bg-slate-200'
                      }`}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* Step 1: Doctor & Service */}
            {wizardStep === 1 && (
              <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                    1. Shifokorni Tanlang
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    {doctors.length} ta mutaxassis mavjud
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {doctors.map((doc) => {
                    const isSel = selectedDoctor?.id === doc.id;
                    return (
                      <button
                        key={doc.id}
                        type="button"
                        onClick={() => {
                          setSelectedDoctorId(doc.id);
                          setSelectedSlot(null);
                          setErrorMessage(null);
                        }}
                        className={`text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                          isSel
                            ? 'bg-white border-teal-500 shadow-md ring-2 ring-teal-500/20 -translate-y-0.5'
                            : 'bg-white/65 border-slate-200/90 hover:bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2.5">
                          <img
                            src={doc.avatarUrl}
                            alt={doc.fullName}
                            className="w-12 h-12 rounded-2xl object-cover ring-2 ring-white shadow-xs"
                          />
                          {isSel && (
                            <span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center text-[10px] font-bold">
                              ✓
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs font-extrabold text-slate-900">{doc.fullName}</h4>
                        <p className="text-[11px] text-teal-700 font-semibold mt-0.5">
                          {doc.specialty}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-1.5">
                          ⭐ {doc.rating} • {doc.experienceYears} yil tajriba
                        </p>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                    2. Kerakli Xizmat Turini Tanlang
                  </h3>
                  <span className="text-[11px] text-slate-400">Taxminiy narxlar</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {services.map((srv) => {
                    const isSel = selectedService?.id === srv.id;
                    return (
                      <button
                        key={srv.id}
                        type="button"
                        onClick={() => {
                          setSelectedServiceId(srv.id);
                          setErrorMessage(null);
                        }}
                        className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer flex justify-between items-center gap-3 ${
                          isSel
                            ? 'bg-white border-teal-500 shadow-xs ring-2 ring-teal-500/20'
                            : 'bg-white/65 border-slate-200/90 hover:bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 truncate">
                            {srv.name}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            {srv.category} • ~{srv.durationMinutes} daqiqa
                          </div>
                        </div>
                        <span className="text-xs font-extrabold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-xl border border-teal-100 font-mono shrink-0">
                          {formatMoneyUzs(srv.price)}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex justify-end pt-3 border-t border-slate-200/60">
                  <button
                    type="button"
                    disabled={!selectedDoctor || !selectedService}
                    onClick={() => setWizardStep(2)}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-xs shadow-sm cursor-pointer inline-flex items-center gap-1.5 transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    <span>Keyingi: Sana & Vaqt</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Date & Slots */}
            {wizardStep === 2 && (
              <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                  <div>
                    <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                      Sana va Boʻsh Vaqt Slotini Tanlang
                    </h3>
                    {selectedDoctor && (
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Shifokor: <strong className="text-slate-800">{selectedDoctor.fullName}</strong>
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-teal-600" />
                    <input
                      type="date"
                      min={getTodayDateString()}
                      value={selectedDate}
                      onChange={(e) => {
                        setSelectedDate(e.target.value);
                        setSelectedSlot(null);
                        setErrorMessage(null);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 focus:border-teal-500 focus:outline-none cursor-pointer"
                    />
                  </div>
                </div>

                {slots.length === 0 ? (
                  <div className="p-8 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 text-center text-xs text-slate-500">
                    Ushbu sana uchun boʻsh vaqt slotlari topilmadi. Boshqa sanani tanlang.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                    {slots.map((s, idx) => {
                      const isSel = selectedSlot?.startTime === s.startTime;
                      if (!s.isAvailable) {
                        return (
                          <div
                            key={idx}
                            title="Band qilingan vaqt"
                            className="p-2.5 rounded-xl bg-slate-100/80 border border-slate-200/60 text-slate-400 text-center text-xs font-mono line-through opacity-65 select-none"
                          >
                            <div>{s.startTime}</div>
                            <div className="text-[9px]">Band</div>
                          </div>
                        );
                      }
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setSelectedSlot({ startTime: s.startTime, endTime: s.endTime });
                            setErrorMessage(null);
                          }}
                          className={`p-2.5 rounded-xl border text-center font-mono text-xs cursor-pointer transition-all ${
                            isSel
                              ? 'bg-gradient-to-br from-teal-600 to-emerald-600 text-white border-teal-600 font-bold shadow-md ring-2 ring-teal-500/30 scale-[1.03]'
                              : 'bg-white text-slate-800 border-slate-200 hover:border-teal-400 hover:-translate-y-0.5'
                          }`}
                        >
                          <div className="font-bold">{s.startTime}</div>
                          <div
                            className={`text-[10px] ${
                              isSel ? 'text-teal-100' : 'text-slate-400'
                            }`}
                          >
                            {s.endTime}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="flex justify-between pt-3 border-t border-slate-200/60">
                  <button
                    type="button"
                    onClick={() => setWizardStep(1)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Orqaga</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!selectedSlot) return;
                      setWizardStep(3);
                    }}
                    disabled={!selectedSlot}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all ${
                      selectedSlot
                        ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-xs cursor-pointer active:scale-[0.98]'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <span>Keyingi: Tasdiqlash</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Confirmation */}
            {wizardStep === 3 && selectedDoctor && selectedService && (
              <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-5">
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                  Qabul Maʼlumotlarini Tasdiqlash
                </h3>

                {errorMessage && (
                  <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50/90 to-teal-50/40 border border-slate-200/80 space-y-2.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Shifokor:</span>
                    <span className="font-bold text-slate-900">{selectedDoctor.fullName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Xizmat:</span>
                    <span className="text-teal-700 font-bold">{selectedService.name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Sana va Vaqt:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {selectedDate} ({selectedSlot?.startTime} – {selectedSlot?.endTime})
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-200/70">
                    <span className="text-slate-500 font-semibold">Taxminiy xizmat narxi:</span>
                    <span className="font-mono font-black text-teal-800 text-sm">
                      {formatMoneyUzs(selectedService.price)}
                    </span>
                  </div>
                </div>

                {/* Patient Contact Verification */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <User className="w-3 h-3 text-teal-600" />
                      <span>Bemor F.I.Sh.:</span>
                    </label>
                    <input
                      type="text"
                      value={patientFullName}
                      onChange={(e) => setPatientFullName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-900 focus:border-teal-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-teal-600" />
                      <span>Aloqa telefoni:</span>
                    </label>
                    <input
                      type="tel"
                      value={patientPhone}
                      onChange={(e) => setPatientPhone(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 font-mono text-xs font-semibold text-slate-900 focus:border-teal-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Shikoyat yoki qisqacha izoh (ixtiyoriy):
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Masalan: Tishda sovuq-issiqqa ogʻriq bor..."
                    value={complaintNote}
                    onChange={(e) => setComplaintNote(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500/25 focus:border-teal-500 focus:outline-none"
                  />
                </div>

                <div className="flex justify-between pt-3 border-t border-slate-200/60">
                  <button
                    type="button"
                    onClick={() => setWizardStep(2)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Orqaga</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmBooking}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-xs shadow-md shadow-teal-600/20 cursor-pointer active:scale-[0.98]"
                  >
                    Navbatni Tasdiqlash & Talon Olish
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Success Voucher */}
            {wizardStep === 4 && (
              <div className="bg-white/85 backdrop-blur-xl rounded-3xl p-7 sm:p-8 border border-slate-200/80 shadow-xs text-center space-y-5">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/15 to-teal-500/15 border border-emerald-200 text-emerald-600 mx-auto flex items-center justify-center shadow-inner">
                  <CheckCircle2 className="w-9 h-9" />
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-lg font-extrabold text-slate-900">
                    Qabulingiz Muvaffaqiyatli Qayd Etildi!
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto leading-5">
                    Elektron navbat taloningiz shakllantirildi. Qabul vaqtidan 10 daqiqa oldin
                    klinika registratsiyasiga murojaat qilishingiz mumkin.
                  </p>
                </div>

                {lastBookedAppointment && (
                  <div className="max-w-sm mx-auto rounded-2xl border border-dashed border-teal-300 bg-teal-50/50 p-4 text-left text-xs space-y-1.5">
                    <div className="flex justify-between items-center pb-1.5 border-b border-teal-200/70">
                      <span className="font-mono font-black text-teal-800">
                        Talon #{lastBookedAppointment.bookingCode}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                        Tasdiq kutilmoqda
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Shifokor:</span>
                      <span className="font-bold text-slate-900">
                        {lastBookedAppointment.doctorName}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Sana & Vaqt:</span>
                      <span className="font-mono font-bold text-slate-900">
                        {lastBookedAppointment.date} ({lastBookedAppointment.startTime})
                      </span>
                    </div>
                  </div>
                )}

                <div className="pt-2 flex flex-wrap items-center justify-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      handleResetWizard();
                      setActiveSubTab('vouchers');
                    }}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-bold text-xs shadow-xs cursor-pointer"
                  >
                    Mening Talonlarim Boʻlimiga Oʻtish
                  </button>
                  <button
                    type="button"
                    onClick={handleResetWizard}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Yana bir qabulga yozilish</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SUB-TAB 2: MY VOUCHERS */}
        {activeSubTab === 'vouchers' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900">
                Mening Faol Talonlarim & Navbatim ({patientAppointments.length})
              </h3>
              <button
                type="button"
                onClick={() => {
                  handleResetWizard();
                  setActiveSubTab('booking');
                }}
                className="text-xs font-bold text-teal-700 hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Yangi talon olish</span>
              </button>
            </div>

            {patientAppointments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 p-10 text-center space-y-2">
                <Ticket className="w-7 h-7 text-teal-600 mx-auto" />
                <p className="text-xs font-bold text-slate-800">
                  Sizda hozircha elektron talonlar mavjud emas
                </p>
                <p className="text-[11px] text-slate-500">
                  Onlayn qabulga yozilish orqali bir necha soniyada talon olishingiz mumkin.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {patientAppointments.map((app) => {
                  const statusMeta = STATUS_META[app.status] || {
                    label: app.status,
                    badge: 'bg-teal-100 text-teal-800',
                  };
                  return (
                    <div
                      key={app.id}
                      className="bg-white/85 backdrop-blur-xl rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all space-y-3"
                    >
                      <div className="flex items-center justify-between pb-2.5 border-b border-dashed border-slate-200">
                        <span className="text-xs font-mono font-black text-teal-800 flex items-center gap-1.5">
                          <Ticket className="w-3.5 h-3.5 text-teal-600" />
                          Talon #{app.bookingCode || 'DC-8891'}
                        </span>
                        <span
                          className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${statusMeta.badge}`}
                        >
                          {statusMeta.label}
                        </span>
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-500 flex items-center gap-1">
                            <Stethoscope className="w-3.5 h-3.5 text-slate-400" />
                            Shifokor:
                          </span>
                          <span className="font-bold text-slate-900">{app.doctorName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            Sana & Vaqt:
                          </span>
                          <span className="font-mono font-bold text-slate-900">
                            {app.date} ({app.startTime} – {app.endTime})
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Xizmat:</span>
                          <span className="text-teal-700 font-semibold">{app.serviceName}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* SUB-TAB 3: MY TEETH PASSPORT (FULL FDI 11–48) */}
        {activeSubTab === 'teeth' && (
          <div className="bg-white/85 backdrop-blur-xl rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3.5 border-b border-slate-200/70">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Bemorning Shaxsiy Tish Pasporti
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Shifokor koʻrigi natijasida qoʻyilgan plomba, qoplama va davolangan tishlar
                </p>
              </div>
              <span className="text-[10px] font-mono bg-teal-500/15 text-teal-800 border border-teal-500/20 font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                FDI 11–48 EMR
              </span>
            </div>

            {/* Interactive FDI Dental Map */}
            <div className="space-y-3 bg-slate-50/90 p-3.5 rounded-2xl border border-slate-200/80">
              <div className="grid grid-cols-8 sm:grid-cols-16 gap-1">
                {UPPER_JAW.map((num) => {
                  const tooth = teethMap[num];
                  const cond: ToothCondition = tooth?.condition || 'Healthy';
                  const meta = CONDITION_META[cond];
                  const isSel = selectedToothNum === num;
                  return (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setSelectedToothNum(num)}
                      className={`p-1.5 rounded-xl border text-center transition-all cursor-pointer ${
                        isSel
                          ? 'bg-white border-teal-500 ring-2 ring-teal-500/30 scale-105 shadow-xs'
                          : `${meta.badge} hover:scale-105`
                      }`}
                    >
                      <span className="block font-mono text-[10px] font-black">{num}</span>
                      <span className={`mx-auto mt-1 block w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-8 sm:grid-cols-16 gap-1 pt-2 border-t border-dashed border-slate-300">
                {LOWER_JAW.map((num) => {
                  const tooth = teethMap[num];
                  const cond: ToothCondition = tooth?.condition || 'Healthy';
                  const meta = CONDITION_META[cond];
                  const isSel = selectedToothNum === num;
                  return (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setSelectedToothNum(num)}
                      className={`p-1.5 rounded-xl border text-center transition-all cursor-pointer ${
                        isSel
                          ? 'bg-white border-teal-500 ring-2 ring-teal-500/30 scale-105 shadow-xs'
                          : `${meta.badge} hover:scale-105`
                      }`}
                    >
                      <span className="block font-mono text-[10px] font-black">{num}</span>
                      <span className={`mx-auto mt-1 block w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Tooth Details */}
            {(() => {
              const tooth = teethMap[selectedToothNum];
              const cond: ToothCondition = tooth?.condition || 'Healthy';
              const meta = CONDITION_META[cond];
              return (
                <div className="p-4 rounded-2xl bg-teal-50/60 border border-teal-200/70 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-slate-900">
                        #{selectedToothNum}-Tish
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${meta.badge}`}
                      >
                        {meta.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      {tooth?.diagnosis
                        ? `Tashxis: ${tooth.diagnosis}`
                        : 'Ushbu tishda patologik oʻzgarishlar qayd etilmagan.'}
                      {tooth?.treatmentPlan ? ` • Muolaja: ${tooth.treatmentPlan}` : ''}
                    </p>
                  </div>
                  {tooth?.cost ? (
                    <span className="font-mono font-extrabold text-teal-800">
                      {formatMoneyUzs(tooth.cost)}
                    </span>
                  ) : null}
                </div>
              );
            })()}

            {/* Treated Teeth Cards */}
            {treatedTeeth.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                {treatedTeeth.map((tooth) => {
                  const meta = CONDITION_META[tooth.condition] || CONDITION_META.Healthy;
                  return (
                    <button
                      key={tooth.number}
                      type="button"
                      onClick={() => setSelectedToothNum(tooth.number)}
                      className="text-left p-3.5 rounded-2xl bg-white border border-slate-200/90 hover:border-teal-400 transition-all space-y-1 cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-black text-slate-900">
                          {tooth.number}-Tish
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${meta.badge}`}
                        >
                          {meta.label}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600 truncate">
                        {tooth.diagnosis || tooth.treatmentPlan || 'Davolangan'}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* SUB-TAB 4: BILLING & DEBT */}
        {activeSubTab === 'billing' && (
          <div className="bg-white/85 backdrop-blur-xl rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3.5 border-b border-slate-200/70">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Mening Toʻlovlarim & Qarzdorlik Balansi
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Klinika kassa hisob-kitoblari shaffofligi
                </p>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-slate-500 block">Jami Qarz:</span>
                <span
                  className={`font-mono font-black text-sm ${
                    currentPatient.totalDebt > 0 ? 'text-rose-600' : 'text-emerald-600'
                  }`}
                >
                  {currentPatient.totalDebt > 0
                    ? formatMoneyUzs(currentPatient.totalDebt)
                    : '0 soʻm (Qarz yoʻq)'}
                </span>
              </div>
            </div>

            {patientInvoices.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center space-y-1.5">
                <ShieldCheck className="w-7 h-7 text-emerald-600 mx-auto" />
                <p className="text-xs font-bold text-slate-800">
                  Hisob-fakturalar roʻyxati boʻsh
                </p>
                <p className="text-[11px] text-slate-500">
                  Koʻrik va muolajalardan soʻng barcha cheklar shu yerda aks etadi.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {patientInvoices.map((inv) => {
                  const remaining = Math.max(0, inv.totalAmount - inv.paidAmount);
                  return (
                    <div
                      key={inv.id}
                      className="p-4 rounded-2xl bg-white border border-slate-200/90 flex flex-wrap justify-between items-center gap-3 text-xs hover:shadow-xs transition-all"
                    >
                      <div className="space-y-0.5">
                        <span className="font-bold text-slate-900 block">
                          {inv.items.map((i) => i.serviceName).join(', ')}
                        </span>
                        <span className="block text-[10px] text-slate-400 font-mono">
                          Hisob ID: {inv.id}
                        </span>
                      </div>

                      <div className="text-right space-y-0.5">
                        <span className="font-mono font-extrabold text-slate-900 block">
                          {formatMoneyUzs(inv.totalAmount)}
                        </span>
                        <div className="flex items-center justify-end gap-2 text-[10px] font-mono">
                          <span className="text-emerald-700 font-semibold">
                            Toʻlangan: {formatMoneyUzs(inv.paidAmount)}
                          </span>
                          {remaining > 0 && (
                            <span className="text-rose-600 font-bold">
                              • Qoldiq: {formatMoneyUzs(remaining)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};