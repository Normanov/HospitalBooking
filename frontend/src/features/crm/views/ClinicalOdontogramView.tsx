import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Smile,
  Pill,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Stethoscope,
  Save,
  Plus,
  Clock,
  User,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react';
import { AppleSelect, SelectOption } from '../../../components/ui/AppleSelect';
import { AppleSegmentedControl } from '../../../components/ui/AppleSegmentedControl';

export interface ToothRecord {
  toothNumber: number;
  condition: string;
  surfacesJson: string;
  diagnosis: string | null;
  treatmentPlan: string | null;
  cost: number;
}

export interface Patient {
  id: string;
  fullName: string;
  phoneNumber: string | null;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  startTime: string;
  bookingCode: string;
}

interface ClinicalOdontogramViewProps {
  patients: Patient[];
  selectedPatientId: string;
  onSelectPatient: (patientId: string) => void;
  teeth: ToothRecord[];
  selectedTooth: number;
  onSelectTooth: (tooth: number) => void;
  onSaveTooth: (toothData: {
    toothNumber: number;
    condition: string;
    surfaces: string[];
    diagnosis?: string;
    treatmentPlan?: string;
    cost: number;
  }) => Promise<boolean>;
  appointments: Appointment[];
  onCreatePrescription: (data: {
    appointmentId: string;
    medicineName: string;
    dosage: string;
    duration: string;
    instructions?: string;
  }) => Promise<boolean>;
  canEdit: boolean;
  canPrescribe: boolean;
  saving?: boolean;
}

const UPPER_JAW_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_JAW_TEETH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

const DENTAL_SURFACES = [
  { id: 'Occlusal', label: 'Chaynash (Occlusal)' },
  { id: 'Mesial', label: 'Oldingi (Mesial)' },
  { id: 'Distal', label: 'Orqa (Distal)' },
  { id: 'Buccal', label: 'Yonoq (Buccal)' },
  { id: 'Lingual', label: 'Til (Lingual)' },
];

const CONDITION_MAP: Record<
  string,
  { label: string; badge: string; dot: string; glow: string; border: string }
> = {
  Healthy: {
    label: 'Sog‘lom',
    badge: 'bg-emerald-500/10 text-emerald-800 border-emerald-200/80',
    dot: 'bg-emerald-500',
    glow: 'rgba(16, 185, 129, 0.25)',
    border: 'border-emerald-300',
  },
  Caries: {
    label: 'Karies',
    badge: 'bg-amber-500/15 text-amber-900 border-amber-300',
    dot: 'bg-amber-500',
    glow: 'rgba(245, 158, 11, 0.35)',
    border: 'border-amber-400',
  },
  Filling: {
    label: 'Plomba',
    badge: 'bg-sky-500/15 text-sky-900 border-sky-300',
    dot: 'bg-sky-500',
    glow: 'rgba(14, 165, 233, 0.35)',
    border: 'border-sky-400',
  },
  Crown: {
    label: 'Qoplama (Koronka)',
    badge: 'bg-purple-500/15 text-purple-900 border-purple-300',
    dot: 'bg-purple-500',
    glow: 'rgba(168, 85, 247, 0.35)',
    border: 'border-purple-400',
  },
  Endodontic: {
    label: 'Kanal davolash',
    badge: 'bg-orange-500/15 text-orange-900 border-orange-300',
    dot: 'bg-orange-500',
    glow: 'rgba(249, 115, 22, 0.35)',
    border: 'border-orange-400',
  },
  Implant: {
    label: 'Implant',
    badge: 'bg-teal-500/15 text-teal-900 border-teal-300',
    dot: 'bg-teal-500',
    glow: 'rgba(20, 184, 166, 0.35)',
    border: 'border-teal-400',
  },
  Extracted: {
    label: 'Olingan',
    badge: 'bg-rose-500/15 text-rose-900 border-rose-300 line-through',
    dot: 'bg-rose-500',
    glow: 'rgba(244, 63, 94, 0.25)',
    border: 'border-rose-300',
  },
};

function parseSurfaces(value: string | undefined): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) && parsed.every((item) => typeof item === 'string')
      ? parsed
      : [];
  } catch {
    return [];
  }
}

function formatMoney(amount: number): string {
  return `${new Intl.NumberFormat('uz-UZ').format(amount)} so‘m`;
}

export const ClinicalOdontogramView: React.FC<ClinicalOdontogramViewProps> = ({
  patients,
  selectedPatientId,
  onSelectPatient,
  teeth,
  selectedTooth,
  onSelectTooth,
  onSaveTooth,
  appointments,
  onCreatePrescription,
  canEdit,
  canPrescribe,
  saving = false,
}) => {
  const currentToothRecord = teeth.find((t) => t.toothNumber === selectedTooth);
  const currentSurfaces = parseSurfaces(currentToothRecord?.surfacesJson);

  // Form edit states
  const [condition, setCondition] = useState(currentToothRecord?.condition || 'Healthy');
  const [selectedSurfaces, setSelectedSurfaces] = useState<string[]>(currentSurfaces);
  const [diagnosis, setDiagnosis] = useState(currentToothRecord?.diagnosis || '');
  const [treatmentPlan, setTreatmentPlan] = useState(currentToothRecord?.treatmentPlan || '');
  const [cost, setCost] = useState(String(currentToothRecord?.cost || 0));

  // Prescription draft state
  const [prescriptionDraft, setPrescriptionDraft] = useState({
    appointmentId: '',
    medicineName: '',
    dosage: '',
    duration: '',
    instructions: '',
  });

  // When selectedTooth changes, sync local form
  React.useEffect(() => {
    const found = teeth.find((t) => t.toothNumber === selectedTooth);
    setCondition(found?.condition || 'Healthy');
    setSelectedSurfaces(parseSurfaces(found?.surfacesJson));
    setDiagnosis(found?.diagnosis || '');
    setTreatmentPlan(found?.treatmentPlan || '');
    setCost(String(found?.cost || 0));
  }, [selectedTooth, teeth]);

  const toggleSurface = (surface: string) => {
    setSelectedSurfaces((prev) =>
      prev.includes(surface) ? prev.filter((s) => s !== surface) : [...prev, surface]
    );
  };

  const handleSaveTooth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) return;

    await onSaveTooth({
      toothNumber: selectedTooth,
      condition,
      surfaces: selectedSurfaces,
      diagnosis: diagnosis.trim() || undefined,
      treatmentPlan: treatmentPlan.trim() || undefined,
      cost: Number(cost) || 0,
    });
  };

  const handlePrescriptionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prescriptionDraft.appointmentId || !prescriptionDraft.medicineName.trim()) return;

    const ok = await onCreatePrescription(prescriptionDraft);
    if (ok) {
      setPrescriptionDraft({
        appointmentId: '',
        medicineName: '',
        dosage: '',
        duration: '',
        instructions: '',
      });
    }
  };

  const patientOptions: SelectOption[] = patients.map((p) => ({
    value: p.id,
    label: p.fullName,
    sublabel: p.phoneNumber || 'Telefon yo‘q',
    icon: <User className="w-4 h-4 text-slate-500" />,
  }));

  const patientAppointments = appointments.filter((a) => a.patientId === selectedPatientId);

  return (
    <div className="space-y-6">
      {/* 1. Patient Selection Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-white/60 bg-white/70 p-4 sm:p-5 backdrop-blur-2xl shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-teal-500 to-cyan-500 text-white shadow-md shadow-teal-700/20">
            <Smile className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              Tibbiy karta va Tish formulasi (FDI 11–48)
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              32 ta tish xaritasi va davolash rejasini boshqarish
            </p>
          </div>
        </div>

        <div className="w-full sm:w-80">
          <AppleSelect
            searchable
            placeholder="Bemorni tanlang..."
            value={selectedPatientId}
            onChange={onSelectPatient}
            options={patientOptions}
          />
        </div>
      </div>

      {!selectedPatientId ? (
        <div className="rounded-3xl border border-white/60 bg-white/70 backdrop-blur-2xl p-16 text-center space-y-3 shadow-2xs">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
            <Smile className="h-8 w-8" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            Bemor tanlanmagan
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Odontogramma va tibbiy yozuvlarni ko‘rish yoki tahrirlash uchun yuqoridagi ro‘yxatdan bemorni tanlang.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 2. Interactive FDI 11-48 Odontogram Canvas with 3D Tooth Capsules */}
          <div className="relative overflow-hidden rounded-3xl border border-white/60 bg-white/75 p-5 sm:p-7 backdrop-blur-2xl shadow-2xs">
            {/* Ambient Aurora Glow */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-24 left-1/3 h-52 w-96 rounded-full bg-teal-400/10 blur-3xl"
            />

            <div className="flex flex-wrap items-center justify-between gap-3 mb-6 border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Interaktiv Tish Xaritasi
                </span>
                <span className="text-sm font-black text-slate-900">
                  FDI Xalqaro Standarti (32 tish)
                </span>
              </div>

              {/* Legend Badges */}
              <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold">
                {Object.entries(CONDITION_MAP).map(([key, meta]) => (
                  <span
                    key={key}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 ${meta.badge}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                    <span>{meta.label}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* UPPER JAW ARCH (18–11 | 21–28) */}
            <div className="space-y-2 mb-6">
              <div className="flex justify-between text-[11px] font-bold text-slate-400 px-2 uppercase tracking-wider">
                <span>O‘ng Yuqori (Q1: 18–11)</span>
                <span>Chap Yuqori (Q2: 21–28)</span>
              </div>

              <div className="grid grid-cols-8 sm:grid-cols-16 gap-1.5 sm:gap-2">
                {UPPER_JAW_TEETH.map((tooth) => {
                  const record = teeth.find((t) => t.toothNumber === tooth);
                  const cond = record?.condition || 'Healthy';
                  const meta = CONDITION_MAP[cond] ?? CONDITION_MAP.Healthy;
                  const isSelected = tooth === selectedTooth;

                  return (
                    <motion.button
                      key={tooth}
                      type="button"
                      whileHover={{ scale: 1.08, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => onSelectTooth(tooth)}
                      style={{
                        boxShadow: isSelected
                          ? `0 8px 24px -2px ${meta.glow}, 0 0 0 2px rgb(13, 148, 136)`
                          : `0 2px 6px rgba(0,0,0,0.03)`,
                      }}
                      className={`relative flex flex-col items-center justify-center rounded-2xl border py-2.5 px-1 sm:py-3 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-teal-600 text-white border-teal-600 font-black'
                          : `bg-white/90 hover:bg-white ${meta.border} text-slate-800 font-bold`
                      }`}
                    >
                      <span className="text-[10px] sm:text-xs font-mono tabular-nums">
                        {tooth}
                      </span>
                      <span
                        className={`mt-1 h-1.5 w-1.5 rounded-full ${
                          isSelected ? 'bg-white' : meta.dot
                        }`}
                      />
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Dental Arch Separator */}
            <div className="relative my-4 flex items-center justify-center">
              <div className="w-full border-t border-dashed border-slate-200" />
              <span className="absolute bg-white/90 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest text-slate-400 border border-slate-200/60 shadow-2xs">
                Chaynash Chizig‘i
              </span>
            </div>

            {/* LOWER JAW ARCH (48–41 | 31–38) */}
            <div className="space-y-2">
              <div className="grid grid-cols-8 sm:grid-cols-16 gap-1.5 sm:gap-2">
                {LOWER_JAW_TEETH.map((tooth) => {
                  const record = teeth.find((t) => t.toothNumber === tooth);
                  const cond = record?.condition || 'Healthy';
                  const meta = CONDITION_MAP[cond] ?? CONDITION_MAP.Healthy;
                  const isSelected = tooth === selectedTooth;

                  return (
                    <motion.button
                      key={tooth}
                      type="button"
                      whileHover={{ scale: 1.08, y: 2 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => onSelectTooth(tooth)}
                      style={{
                        boxShadow: isSelected
                          ? `0 8px 24px -2px ${meta.glow}, 0 0 0 2px rgb(13, 148, 136)`
                          : `0 2px 6px rgba(0,0,0,0.03)`,
                      }}
                      className={`relative flex flex-col items-center justify-center rounded-2xl border py-2.5 px-1 sm:py-3 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-teal-600 text-white border-teal-600 font-black'
                          : `bg-white/90 hover:bg-white ${meta.border} text-slate-800 font-bold`
                      }`}
                    >
                      <span
                        className={`mb-1 h-1.5 w-1.5 rounded-full ${
                          isSelected ? 'bg-white' : meta.dot
                        }`}
                      />
                      <span className="text-[10px] sm:text-xs font-mono tabular-nums">
                        {tooth}
                      </span>
                    </motion.button>
                  );
                })}
              </div>

              <div className="flex justify-between text-[11px] font-bold text-slate-400 px-2 uppercase tracking-wider">
                <span>O‘ng Pastki (Q4: 48–41)</span>
                <span>Chap Pastki (Q3: 31–38)</span>
              </div>
            </div>
          </div>

          {/* 3. Selected Tooth Detail Inspector & Editor */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 rounded-3xl border border-white/60 bg-white/75 p-5 sm:p-6 backdrop-blur-2xl shadow-2xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-teal-50 border border-teal-200 text-teal-700 font-black text-sm">
                    {selectedTooth}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Tish #{selectedTooth} · Holat va Tashxis
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Tanlangan tish uchun davolash rejasini tahrirlash
                    </p>
                  </div>
                </div>

                {currentToothRecord && (
                  <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200/70">
                    Joriy: {CONDITION_MAP[currentToothRecord.condition]?.label || currentToothRecord.condition}
                  </span>
                )}
              </div>

              <form onSubmit={handleSaveTooth} className="space-y-4">
                {/* Condition Pills */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Tish holati
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {Object.entries(CONDITION_MAP).map(([key, meta]) => {
                      const isChosen = condition === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setCondition(key)}
                          className={`flex items-center gap-2 rounded-2xl border p-2.5 text-xs font-bold transition-all cursor-pointer ${
                            isChosen
                              ? 'border-teal-600 bg-teal-50 text-teal-900 shadow-2xs ring-1 ring-teal-600'
                              : 'border-slate-200/90 bg-white/80 hover:bg-white text-slate-700'
                          }`}
                        >
                          <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                          <span className="truncate">{meta.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Surfaces Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Zararlangan tish yuzalari (Surfaces)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {DENTAL_SURFACES.map((surf) => {
                      const isSelected = selectedSurfaces.includes(surf.id);
                      return (
                        <button
                          key={surf.id}
                          type="button"
                          onClick={() => toggleSurface(surf.id)}
                          className={`rounded-2xl border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                            isSelected
                              ? 'border-teal-500 bg-teal-600 text-white shadow-2xs'
                              : 'border-slate-200 bg-white/80 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {surf.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Klinik tashxis
                    </label>
                    <input
                      value={diagnosis}
                      onChange={(e) => setDiagnosis(e.target.value)}
                      placeholder="Masalan, o‘rta karies..."
                      className="w-full rounded-2xl border border-slate-200/90 bg-white/80 px-3.5 py-2.5 text-xs text-slate-900 focus:border-teal-500 focus:bg-white focus:outline-none shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Davolash rejasi
                    </label>
                    <input
                      value={treatmentPlan}
                      onChange={(e) => setTreatmentPlan(e.target.value)}
                      placeholder="Masalan, fotokompozit plomba..."
                      className="w-full rounded-2xl border border-slate-200/90 bg-white/80 px-3.5 py-2.5 text-xs text-slate-900 focus:border-teal-500 focus:bg-white focus:outline-none shadow-2xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Xizmat narxi (UZS)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    className="w-full sm:w-64 rounded-2xl border border-slate-200/90 bg-white/80 px-3.5 py-2.5 tabular-nums text-xs font-bold text-slate-900 focus:border-teal-500 focus:bg-white focus:outline-none shadow-2xs"
                  />
                </div>

                {canEdit && (
                  <div className="flex justify-end pt-3 border-t border-slate-100">
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-teal-600 to-cyan-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-teal-700/20 hover:from-teal-500 hover:to-cyan-500 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      <Save className="h-4 w-4" />
                      <span>{saving ? 'Saqlanmoqda...' : 'Tishni saqlash'}</span>
                    </button>
                  </div>
                )}
              </form>
            </div>

            {/* 4. Electronic Prescription Writing Panel */}
            <div className="rounded-3xl border border-white/60 bg-white/75 p-5 sm:p-6 backdrop-blur-2xl shadow-2xs space-y-4">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                  <Pill className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Elektron Retsept
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Qabul bo‘yicha retsept yozish
                  </p>
                </div>
              </div>

              {canPrescribe ? (
                <form onSubmit={handlePrescriptionSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Bog‘liq qabul
                    </label>
                    <select
                      required
                      value={prescriptionDraft.appointmentId}
                      onChange={(e) =>
                        setPrescriptionDraft({
                          ...prescriptionDraft,
                          appointmentId: e.target.value,
                        })
                      }
                      className="w-full rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-900 focus:border-teal-500 focus:outline-none"
                    >
                      <option value="">Qabulni tanlang...</option>
                      {patientAppointments.map((app) => (
                        <option key={app.id} value={app.id}>
                          {app.startTime.slice(0, 5)} · #{app.bookingCode}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Dori vositasi
                    </label>
                    <input
                      required
                      value={prescriptionDraft.medicineName}
                      onChange={(e) =>
                        setPrescriptionDraft({
                          ...prescriptionDraft,
                          medicineName: e.target.value,
                        })
                      }
                      placeholder="Masalan, Amoxicillin"
                      className="w-full rounded-2xl border border-slate-200/90 bg-white/80 px-3 py-2 text-xs text-slate-900 focus:border-teal-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Dozasi
                      </label>
                      <input
                        required
                        value={prescriptionDraft.dosage}
                        onChange={(e) =>
                          setPrescriptionDraft({
                            ...prescriptionDraft,
                            dosage: e.target.value,
                          })
                        }
                        placeholder="500 mg"
                        className="w-full rounded-2xl border border-slate-200/90 bg-white/80 px-3 py-2 text-xs text-slate-900 focus:border-teal-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Muddati
                      </label>
                      <input
                        required
                        value={prescriptionDraft.duration}
                        onChange={(e) =>
                          setPrescriptionDraft({
                            ...prescriptionDraft,
                            duration: e.target.value,
                          })
                        }
                        placeholder="5 kun"
                        className="w-full rounded-2xl border border-slate-200/90 bg-white/80 px-3 py-2 text-xs text-slate-900 focus:border-teal-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Ko‘rsatma
                    </label>
                    <textarea
                      rows={2}
                      value={prescriptionDraft.instructions}
                      onChange={(e) =>
                        setPrescriptionDraft({
                          ...prescriptionDraft,
                          instructions: e.target.value,
                        })
                      }
                      placeholder="Ovqatdan keyin, kuniga 2 mahal..."
                      className="w-full rounded-2xl border border-slate-200/90 bg-white/80 p-2.5 text-xs text-slate-900 focus:border-teal-500 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={saving || !prescriptionDraft.appointmentId}
                    className="w-full rounded-2xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    Retseptni berish
                  </button>
                </form>
              ) : (
                <p className="text-xs text-slate-500">
                  Retsept yozish uchun shifokor ruxsati talab qilinadi.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
