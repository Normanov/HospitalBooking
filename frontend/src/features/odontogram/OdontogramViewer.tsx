import React, { useState, useEffect, useMemo } from 'react';
import {
  ToothData,
  ToothCondition,
  ToothSurface,
  Patient,
  UserRole,
} from '../../types/dentacore';
import { formatMoneyUzs } from '../../data/mockData';
import {
  Activity,
  Save,
  Code2,
  User,
  Sparkles,
  DollarSign,
  Info,
  CheckCircle2,
  RotateCcw,
  Lock,
  Copy,
  Check,
  X,
} from 'lucide-react';

interface OdontogramViewerProps {
  patients: Patient[];
  teethMap: Record<number, ToothData>;
  onSaveTeethMap: (patientId: string, updatedMap: Record<number, ToothData>) => void;
  currentRole: UserRole;
  onTriggerSignalR: (
    title: string,
    message: string,
    severity: 'info' | 'success' | 'warning' | 'danger'
  ) => void;
}

const CONDITION_CONFIG: Record<
  ToothCondition,
  {
    label: string;
    short: string;
    color: string;
    bg: string;
    border: string;
    defaultPrice: number;
  }
> = {
  Healthy: {
    label: 'Sogʻlom',
    short: '',
    color: 'text-emerald-700',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-300',
    defaultPrice: 0,
  },
  Caries: {
    label: 'Karies (Kavita)',
    short: 'Kar',
    color: 'text-rose-700',
    bg: 'bg-rose-500/12',
    border: 'border-rose-300',
    defaultPrice: 350000,
  },
  Filling: {
    label: 'Plomba (Kompozit)',
    short: 'Plm',
    color: 'text-sky-700',
    bg: 'bg-sky-500/12',
    border: 'border-sky-300',
    defaultPrice: 350000,
  },
  Crown: {
    label: 'Qoplama (Zirkon/Koronka)',
    short: 'Qop',
    color: 'text-amber-700',
    bg: 'bg-amber-500/12',
    border: 'border-amber-300',
    defaultPrice: 1400000,
  },
  Endodontic: {
    label: 'Ildiz Kanali (Endo)',
    short: 'End',
    color: 'text-purple-700',
    bg: 'bg-purple-500/12',
    border: 'border-purple-300',
    defaultPrice: 650000,
  },
  Implant: {
    label: 'Titan Implant',
    short: 'Imp',
    color: 'text-teal-700',
    bg: 'bg-teal-500/12',
    border: 'border-teal-300',
    defaultPrice: 4500000,
  },
  Extracted: {
    label: 'Olingan (Yoʻq)',
    short: 'Yoʻq',
    color: 'text-slate-600',
    bg: 'bg-slate-200/75',
    border: 'border-slate-300',
    defaultPrice: 0,
  },
};

// Quadrant partitions (FDI 11–48)
const QUADRANT_1 = [18, 17, 16, 15, 14, 13, 12, 11]; // Yuqori o'ng
const QUADRANT_2 = [21, 22, 23, 24, 25, 26, 27, 28]; // Yuqori chap
const QUADRANT_4 = [48, 47, 46, 45, 44, 43, 42, 41]; // Pastki o'ng
const QUADRANT_3 = [31, 32, 33, 34, 35, 36, 37, 38]; // Pastki chap

export const OdontogramViewer: React.FC<OdontogramViewerProps> = ({
  patients,
  teethMap,
  onSaveTeethMap,
  currentRole,
  onTriggerSignalR,
}) => {
  const [selectedPatientId, setSelectedPatientId] = useState<string>(patients[0]?.id || '');
  const [selectedToothNum, setSelectedToothNum] = useState<number>(16);
  const [showJsonbModal, setShowJsonbModal] = useState<boolean>(false);
  const [copiedJson, setCopiedJson] = useState<boolean>(false);
  const [activeTeeth, setActiveTeeth] = useState<Record<number, ToothData>>(teethMap);

  const canEdit = currentRole === 'SuperAdmin' || currentRole === 'Doctor';

  // Sync local map when parent updates teethMap
  useEffect(() => {
    setActiveTeeth(teethMap);
  }, [teethMap]);

  // Keep selectedPatientId valid when patients list loads
  useEffect(() => {
    if (!selectedPatientId && patients.length > 0) {
      setSelectedPatientId(patients[0].id);
    }
  }, [patients, selectedPatientId]);

  // Close JSONB modal on Escape key
  useEffect(() => {
    if (!showJsonbModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowJsonbModal(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showJsonbModal]);

  const selectedPatient = useMemo(
    () => patients.find((p) => p.id === selectedPatientId) || patients[0],
    [patients, selectedPatientId]
  );

  const currentTooth: ToothData = useMemo(
    () =>
      activeTeeth[selectedToothNum] || {
        number: selectedToothNum,
        condition: 'Healthy',
        surfaces: [],
        diagnosis: '',
        treatmentPlan: '',
        cost: 0,
      },
    [activeTeeth, selectedToothNum]
  );

  const updateToothState = (partial: Partial<ToothData>) => {
    if (!canEdit) return;
    setActiveTeeth((prev) => {
      const base: ToothData = prev[selectedToothNum] || {
        number: selectedToothNum,
        condition: 'Healthy',
        surfaces: [],
        diagnosis: '',
        treatmentPlan: '',
        cost: 0,
      };
      return {
        ...prev,
        [selectedToothNum]: {
          ...base,
          ...partial,
          number: selectedToothNum,
          lastUpdated: new Date().toISOString(),
        },
      };
    });
  };

  const toggleSurface = (surface: ToothSurface) => {
    if (!canEdit) return;
    const prevSurfaces = currentTooth.surfaces || [];
    const exists = prevSurfaces.includes(surface);
    const updatedSurfaces = exists
      ? prevSurfaces.filter((s) => s !== surface)
      : [...prevSurfaces, surface];

    updateToothState({ surfaces: updatedSurfaces });
  };

  const handleConditionChange = (cond: ToothCondition) => {
    if (!canEdit) return;
    const config = CONDITION_CONFIG[cond];
    updateToothState({
      condition: cond,
      cost: config.defaultPrice,
      diagnosis:
        cond === 'Healthy'
          ? 'Sogʻlom emal'
          : currentTooth.diagnosis || `${config.label} aniqlandi`,
    });
  };

  const handleResetCurrentTooth = () => {
    if (!canEdit) return;
    setActiveTeeth((prev) => {
      const next = { ...prev };
      delete next[selectedToothNum];
      return next;
    });
  };

  const handleSaveOdontogram = () => {
    if (!canEdit || !selectedPatient) return;
    onSaveTeethMap(selectedPatient.id, activeTeeth);
    onTriggerSignalR(
      'Tish Formulasi Saqlandi!',
      `${selectedPatient.fullName} EMR kartasidagi ${selectedToothNum}-tish holati va muolaja rejasi saqlandi`,
      'success'
    );
  };

  // Total treatment plan calculation
  const { totalEstimatedCost, treatedTeethCount } = useMemo(() => {
    const entries = Object.values(activeTeeth);
    const cost = entries.reduce((acc, t) => acc + (t.cost || 0), 0);
    const count = entries.filter(
      (t) => t.condition !== 'Healthy' || (t.surfaces && t.surfaces.length > 0)
    ).length;
    return { totalEstimatedCost: cost, treatedTeethCount: count };
  }, [activeTeeth]);

  const renderToothButton = (num: number) => {
    const data = activeTeeth[num];
    const condition: ToothCondition = data?.condition || 'Healthy';
    const surfacesCount = data?.surfaces?.length || 0;
    const isSelected = selectedToothNum === num;
    const cfg = CONDITION_CONFIG[condition] || CONDITION_CONFIG.Healthy;

    return (
      <button
        key={num}
        type="button"
        onClick={() => setSelectedToothNum(num)}
        title={`Tish #${num} — ${cfg.label}`}
        className={`p-1.5 sm:p-2 rounded-xl border flex flex-col items-center justify-between min-h-[62px] transition-all cursor-pointer relative ${
          isSelected
            ? 'ring-2 ring-teal-500 border-teal-500 bg-white shadow-md scale-[1.05] z-10'
            : `${cfg.bg} border-slate-200/90 hover:border-teal-300 hover:-translate-y-0.5`
        }`}
      >
        <span className="font-mono text-[11px] font-black text-slate-800">{num}</span>

        {/* Tooth status indicator */}
        <div className="my-1 flex items-center justify-center h-4">
          {condition === 'Extracted' ? (
            <span className="text-rose-500 font-black text-xs">✕</span>
          ) : condition === 'Implant' ? (
            <span className="text-[11px] font-mono text-teal-700 font-extrabold">⚙</span>
          ) : (
            <div
              className={`w-3.5 h-3.5 rounded-sm border ${cfg.border} ${
                condition === 'Healthy' ? 'bg-white' : cfg.bg
              } flex items-center justify-center`}
            >
              {surfacesCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />}
            </div>
          )}
        </div>

        <span className={`text-[8px] font-bold truncate max-w-full ${cfg.color}`}>
          {cfg.short}
        </span>
      </button>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Frosted Glass Controls: Patient Selector & Actions */}
      <div className="relative overflow-hidden bg-white/80 backdrop-blur-2xl rounded-3xl p-5 border border-white/80 shadow-lg shadow-slate-900/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="pointer-events-none absolute -left-10 -top-10 w-36 h-36 rounded-full bg-teal-400/15 blur-2xl" />

        <div className="flex items-center space-x-3.5 relative">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-teal-500/15 to-emerald-500/15 border border-teal-500/20 text-teal-600 flex items-center justify-center shadow-inner">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                Interaktiv Tish Formulasi (FDI 11–48)
              </h2>
              <span className="text-[10px] font-mono bg-teal-500/15 text-teal-800 border border-teal-500/25 font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" />
                JSONB EMR
              </span>
              {!canEdit && (
                <span className="text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" />
                  Faqat koʻrish
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              World Dental Federation standarti boʻyicha 32 ta tish anatomiyasi va MODBL yuzalari
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 relative">
          {/* Patient Selector */}
          <div className="flex items-center space-x-2 bg-white/90 px-3 py-2 rounded-xl border border-slate-200/80 text-xs shadow-2xs">
            <User className="w-4 h-4 text-teal-600 shrink-0" />
            <span className="text-slate-500 font-medium">Bemor:</span>
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer"
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName} ({p.phoneNumber})
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => setShowJsonbModal(true)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-white/90 hover:bg-white text-slate-700 text-xs font-semibold border border-slate-200/80 shadow-2xs transition-all cursor-pointer"
          >
            <Code2 className="w-3.5 h-3.5 text-teal-600" />
            <span>JSONB Koʻrish</span>
          </button>

          {canEdit && (
            <button
              type="button"
              onClick={handleSaveOdontogram}
              disabled={!selectedPatient}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Oʻzgarishlarni Saqlash</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Visual Odontogram on Left, Tooth Details Editor on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Visual Odontogram (8 Cols) */}
        <div className="lg:col-span-8 bg-white/80 backdrop-blur-2xl rounded-3xl p-5 sm:p-6 border border-white/80 shadow-lg shadow-slate-900/5 space-y-6">
          {/* Legend */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3.5 border-b border-slate-200/70 text-xs">
            <span className="font-bold text-slate-800">Holat belgilari (Legend):</span>
            <div className="flex flex-wrap items-center gap-1.5">
              {(Object.entries(CONDITION_CONFIG) as [ToothCondition, typeof CONDITION_CONFIG[ToothCondition]][]).map(
                ([key, cfg]) => (
                  <span
                    key={key}
                    className={`inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full font-semibold ${cfg.bg} ${cfg.color} border ${cfg.border}`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    <span>{cfg.label}</span>
                  </span>
                )
              )}
            </div>
          </div>

          {/* Dental Chart Matrix */}
          <div className="space-y-5 select-none">
            {/* UPPER JAW (Maxilla) */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 px-2 uppercase tracking-wider">
                <span>1-Kvadrant (Yuqori Oʻng)</span>
                <span className="text-teal-700 font-extrabold">YUQORI JAGʻ (MAXILLA)</span>
                <span>2-Kvadrant (Yuqori Chap)</span>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-2.5 bg-slate-50/85 p-3 rounded-2xl border border-slate-200/80">
                <div className="grid grid-cols-8 gap-1 xl:border-r xl:border-dashed xl:border-slate-300 xl:pr-2">
                  {QUADRANT_1.map((num) => renderToothButton(num))}
                </div>
                <div className="grid grid-cols-8 gap-1 xl:pl-1">
                  {QUADRANT_2.map((num) => renderToothButton(num))}
                </div>
              </div>
            </div>

            {/* Occlusal Midline Divider */}
            <div className="relative flex items-center justify-center">
              <div className="w-full border-t border-dashed border-slate-300" />
              <span className="bg-white/90 px-3 py-0.5 rounded-full border border-slate-200/80 text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 shrink-0 mx-2">
                Okklyuzion Chiziq
              </span>
              <div className="w-full border-t border-dashed border-slate-300" />
            </div>

            {/* LOWER JAW (Mandibula) */}
            <div className="space-y-2">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-2.5 bg-slate-50/85 p-3 rounded-2xl border border-slate-200/80">
                <div className="grid grid-cols-8 gap-1 xl:border-r xl:border-dashed xl:border-slate-300 xl:pr-2">
                  {QUADRANT_4.map((num) => renderToothButton(num))}
                </div>
                <div className="grid grid-cols-8 gap-1 xl:pl-1">
                  {QUADRANT_3.map((num) => renderToothButton(num))}
                </div>
              </div>

              <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 px-2 uppercase tracking-wider">
                <span>4-Kvadrant (Pastki Oʻng)</span>
                <span className="text-teal-700 font-extrabold">PASTKI JAGʻ (MANDIBULA)</span>
                <span>3-Kvadrant (Pastki Chap)</span>
              </div>
            </div>
          </div>

          {/* Odontogram Summary Stat Bar */}
          <div className="p-4 bg-gradient-to-r from-teal-50/70 to-emerald-50/60 rounded-2xl border border-teal-200/70 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center space-x-5">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">
                  Patologik Tishlar:
                </span>
                <span className="font-extrabold text-teal-800 text-sm">
                  {treatedTeethCount} ta tish
                </span>
              </div>
              <div className="border-l border-teal-200 pl-5">
                <span className="text-slate-500 block text-[10px] uppercase font-bold">
                  Sogʻlom Tishlar:
                </span>
                <span className="font-extrabold text-emerald-700 text-sm inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {32 - treatedTeethCount} ta
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-slate-500 block text-[10px] uppercase font-bold">
                Davolash Rejasining Taxminiy Qiymati:
              </span>
              <span className="text-base font-black text-slate-900 font-mono">
                {formatMoneyUzs(totalEstimatedCost)}
              </span>
            </div>
          </div>
        </div>

        {/* Selected Tooth Details & Treatment Plan (4 Cols) */}
        <div className="lg:col-span-4 bg-white/85 backdrop-blur-2xl rounded-3xl p-5 border border-white/80 shadow-lg shadow-slate-900/5 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/70">
            <div className="flex items-center space-x-2.5">
              <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-600 to-emerald-600 text-white font-mono font-black flex items-center justify-center text-sm shadow-xs">
                {selectedToothNum}
              </span>
              <div>
                <h3 className="text-xs font-extrabold text-slate-900">
                  {selectedToothNum}-Tish Maʼlumotlari
                </h3>
                <p className="text-[10px] text-slate-400">FDI World Dental Notation</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                  CONDITION_CONFIG[currentTooth.condition].bg
                } ${CONDITION_CONFIG[currentTooth.condition].color} ${
                  CONDITION_CONFIG[currentTooth.condition].border
                }`}
              >
                {CONDITION_CONFIG[currentTooth.condition].label}
              </span>

              {canEdit && currentTooth.condition !== 'Healthy' && (
                <button
                  type="button"
                  onClick={handleResetCurrentTooth}
                  title="Tishni sogʻlom holatga qaytarish"
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Tooth Surface Interactive Selector (MODBL) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Zararlangan Yuzalar (MODBL):
            </label>
            <div className="flex justify-center p-3.5 bg-slate-50/90 rounded-2xl border border-slate-200/80">
              <div className="relative w-28 h-28 flex items-center justify-center">
                {/* Top: Buccal / Vestibular */}
                <button
                  type="button"
                  disabled={!canEdit}
                  onClick={() => toggleSurface('Buccal')}
                  className={`absolute top-0 w-20 h-6 rounded-t-lg border text-[9px] font-bold uppercase transition-all ${
                    currentTooth.surfaces?.includes('Buccal')
                      ? 'bg-rose-500 text-white border-rose-600 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                  } ${canEdit ? 'cursor-pointer' : 'cursor-not-allowed opacity-75'}`}
                >
                  Vestibulyar (B)
                </button>

                {/* Left: Mesial */}
                <button
                  type="button"
                  disabled={!canEdit}
                  onClick={() => toggleSurface('Mesial')}
                  className={`absolute left-0 w-6 h-20 rounded-l-lg border text-[9px] font-bold uppercase transition-all flex items-center justify-center ${
                    currentTooth.surfaces?.includes('Mesial')
                      ? 'bg-rose-500 text-white border-rose-600 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                  } ${canEdit ? 'cursor-pointer' : 'cursor-not-allowed opacity-75'}`}
                >
                  <span className="-rotate-90">M</span>
                </button>

                {/* Center: Occlusal */}
                <button
                  type="button"
                  disabled={!canEdit}
                  onClick={() => toggleSurface('Occlusal')}
                  className={`w-12 h-12 rounded-lg border text-[9px] font-bold uppercase z-10 transition-all flex items-center justify-center ${
                    currentTooth.surfaces?.includes('Occlusal')
                      ? 'bg-rose-500 text-white border-rose-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  } ${canEdit ? 'cursor-pointer' : 'cursor-not-allowed opacity-75'}`}
                >
                  Okklyuzal
                </button>

                {/* Right: Distal */}
                <button
                  type="button"
                  disabled={!canEdit}
                  onClick={() => toggleSurface('Distal')}
                  className={`absolute right-0 w-6 h-20 rounded-r-lg border text-[9px] font-bold uppercase transition-all flex items-center justify-center ${
                    currentTooth.surfaces?.includes('Distal')
                      ? 'bg-rose-500 text-white border-rose-600 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                  } ${canEdit ? 'cursor-pointer' : 'cursor-not-allowed opacity-75'}`}
                >
                  <span className="rotate-90">D</span>
                </button>

                {/* Bottom: Lingual */}
                <button
                  type="button"
                  disabled={!canEdit}
                  onClick={() => toggleSurface('Lingual')}
                  className={`absolute bottom-0 w-20 h-6 rounded-b-lg border text-[9px] font-bold uppercase transition-all ${
                    currentTooth.surfaces?.includes('Lingual')
                      ? 'bg-rose-500 text-white border-rose-600 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                  } ${canEdit ? 'cursor-pointer' : 'cursor-not-allowed opacity-75'}`}
                >
                  Til (L)
                </button>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 text-center mt-1.5">
              {currentTooth.surfaces?.length
                ? `Belgilangan: ${currentTooth.surfaces.join(', ')}`
                : 'Yuzalarni belgilash uchun ustiga bosing'}
            </p>
          </div>

          {/* Condition Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Tish Holati (Condition):
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.keys(CONDITION_CONFIG) as ToothCondition[]).map((cond) => {
                const isSelected = currentTooth.condition === cond;
                const cfg = CONDITION_CONFIG[cond];
                return (
                  <button
                    key={cond}
                    type="button"
                    disabled={!canEdit}
                    onClick={() => handleConditionChange(cond)}
                    className={`p-2 rounded-xl border text-left text-xs transition-all flex items-center space-x-1.5 ${
                      isSelected
                        ? `${cfg.bg} ${cfg.color} ${cfg.border} font-bold shadow-2xs ring-1 ring-teal-500`
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    } ${canEdit ? 'cursor-pointer' : 'cursor-not-allowed opacity-75'}`}
                  >
                    <span className="w-2 h-2 rounded-full bg-current shrink-0" />
                    <span className="truncate">{cfg.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Diagnosis & Plan Inputs */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Klinik Tashxis:
              </label>
              <input
                type="text"
                disabled={!canEdit}
                value={currentTooth.diagnosis || ''}
                onChange={(e) => updateToothState({ diagnosis: e.target.value })}
                placeholder="Masalan: K02.1 Oʻrta karies"
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 focus:outline-none disabled:bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Davolash Rejasi (Muolaja):
              </label>
              <input
                type="text"
                disabled={!canEdit}
                value={currentTooth.treatmentPlan || ''}
                onChange={(e) => updateToothState({ treatmentPlan: e.target.value })}
                placeholder="Masalan: Fotopolimer plomba oʻrnatish"
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 focus:outline-none disabled:bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-teal-600" />
                <span>Rejalashtirilgan Narx (UZS):</span>
              </label>
              <input
                type="number"
                min="0"
                step="50000"
                disabled={!canEdit}
                value={currentTooth.cost || 0}
                onChange={(e) => updateToothState({ cost: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 focus:outline-none disabled:bg-slate-50"
              />
            </div>
          </div>

          <div className="pt-2.5 border-t border-slate-200/70 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-teal-600 shrink-0" />
              <span>Avtomatik narx kassa moduliga uzatiladi</span>
            </span>
          </div>
        </div>
      </div>

      {/* macOS Dark Glass JSONB Export Modal */}
      {showJsonbModal && selectedPatient && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowJsonbModal(false);
          }}
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-slate-900/95 backdrop-blur-2xl text-white rounded-3xl max-w-2xl w-full p-6 border border-white/15 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center space-x-2.5">
                <div className="flex items-center space-x-1.5 mr-1">
                  <button
                    type="button"
                    onClick={() => setShowJsonbModal(false)}
                    className="w-3 h-3 rounded-full bg-rose-500 hover:bg-rose-400 cursor-pointer"
                    aria-label="Yopish"
                  />
                  <span className="w-3 h-3 rounded-full bg-amber-400" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500" />
                </div>
                <Code2 className="w-4 h-4 text-teal-400" />
                <h3 className="text-xs font-mono font-bold text-teal-300">
                  PostgreSQL JSONB Odontogram Snapshot
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setShowJsonbModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
                aria-label="Yopish"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Ushbu JSON maʼlumotlar bazasidagi{' '}
              <code className="text-teal-300 font-mono bg-white/5 px-1.5 py-0.5 rounded">
                TreatmentRecords.OdontogramData
              </code>{' '}
              ustuniga yoziladi.
            </p>

            <div className="bg-black/60 p-4 rounded-2xl border border-white/10 font-mono text-xs text-teal-300 max-h-80 overflow-y-auto leading-relaxed">
              <pre>
                {JSON.stringify(
                  {
                    patientId: selectedPatient.id,
                    patientName: selectedPatient.fullName,
                    updatedAt: new Date().toISOString(),
                    teeth: activeTeeth,
                  },
                  null,
                  2
                )}
              </pre>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowJsonbModal(false)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 font-semibold text-xs cursor-pointer"
              >
                Yopish
              </button>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(JSON.stringify(activeTeeth, null, 2));
                  setCopiedJson(true);
                  setTimeout(() => setCopiedJson(false), 1800);
                  onTriggerSignalR(
                    'JSONB Nusxalandi',
                    'Tish formulasi JSON formati buferga olindi',
                    'info'
                  );
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs cursor-pointer"
              >
                {copiedJson ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedJson ? 'Nusxalandi' : 'JSON Nusxa Olish'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};