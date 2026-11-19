import React, { useState, useEffect, useMemo } from 'react';
import {
  Appointment,
  Patient,
  ToothData,
  ToothCondition,
  ToothSurface,
  AppointmentStatus,
} from '../../types/dentacore';
import { formatMoneyUzs } from '../../data/mockData';
import { MacWindowHeader } from '../../components/MacWindowHeader';
import {
  Calendar,
  Activity,
  UserCheck,
  Clock,
  CheckCircle2,
  PlayCircle,
  FileText,
  Save,
  Code2,
  ShieldCheck,
  AlertCircle,
  Copy,
  Check,
  X,
  Stethoscope,
  Sparkles,
} from 'lucide-react';

interface DoctorWorkstationProps {
  doctorAppointments: Appointment[];
  patients: Patient[];
  teethMap: Record<number, ToothData>;
  onStatusChange: (appointmentId: string, newStatus: AppointmentStatus) => void;
  onSaveTeethMap: (patientId: string, updatedMap: Record<number, ToothData>) => void;
  onTriggerSignalR: (
    title: string,
    message: string,
    severity: 'info' | 'success' | 'warning' | 'danger'
  ) => void;
}

const CONDITION_CONFIG: Record<
  ToothCondition,
  { label: string; short: string; color: string; bg: string; border: string; defaultPrice: number }
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
    label: 'Qoplama (Zirkon/Crown)',
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
    color: 'text-slate-500',
    bg: 'bg-slate-200/70',
    border: 'border-slate-300',
    defaultPrice: 0,
  },
};

const STATUS_META: Record<AppointmentStatus, { label: string; badge: string }> = {
  Pending: { label: 'Kutmoqda', badge: 'bg-amber-100 text-amber-800 border border-amber-200' },
  Confirmed: { label: 'Tasdiqlangan', badge: 'bg-sky-100 text-sky-800 border border-sky-200' },
  InProgress: {
    label: 'Qabulda',
    badge: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
  },
  Completed: { label: 'Yakunlangan', badge: 'bg-slate-200/80 text-slate-700 border border-slate-300' },
  Cancelled: { label: 'Bekor qilingan', badge: 'bg-rose-100 text-rose-700 border border-rose-200' },
  NoShow: { label: 'Kelmadi', badge: 'bg-zinc-200 text-zinc-700 border border-zinc-300' },
};

// FDI Quadrants
const QUADRANT_1 = [18, 17, 16, 15, 14, 13, 12, 11];
const QUADRANT_2 = [21, 22, 23, 24, 25, 26, 27, 28];
const QUADRANT_4 = [48, 47, 46, 45, 44, 43, 42, 41];
const QUADRANT_3 = [31, 32, 33, 34, 35, 36, 37, 38];

export const DoctorWorkstation: React.FC<DoctorWorkstationProps> = ({
  doctorAppointments,
  patients,
  teethMap,
  onStatusChange,
  onSaveTeethMap,
  onTriggerSignalR,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'schedule' | 'odontogram' | 'emr'>('schedule');
  const [scheduleFilter, setScheduleFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [selectedPatientId, setSelectedPatientId] = useState<string>(patients[0]?.id || '');
  const [selectedToothNum, setSelectedToothNum] = useState<number>(16);
  const [activeTeeth, setActiveTeeth] = useState<Record<number, ToothData>>(teethMap);
  const [showJsonbModal, setShowJsonbModal] = useState<boolean>(false);
  const [copiedJson, setCopiedJson] = useState<boolean>(false);

  // Sync teethMap when parent updates it
  useEffect(() => {
    setActiveTeeth(teethMap);
  }, [teethMap]);

  // Ensure selectedPatientId stays valid if patients list changes
  useEffect(() => {
    if (!selectedPatientId && patients.length > 0) {
      setSelectedPatientId(patients[0].id);
    }
  }, [patients, selectedPatientId]);

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

  const filteredAppointments = useMemo(() => {
    return doctorAppointments.filter((app) => {
      if (scheduleFilter === 'active') {
        return app.status === 'Pending' || app.status === 'Confirmed' || app.status === 'InProgress';
      }
      if (scheduleFilter === 'completed') {
        return app.status === 'Completed';
      }
      return true;
    });
  }, [doctorAppointments, scheduleFilter]);

  const treatedTeethList = useMemo(
    () =>
      Object.values(activeTeeth)
        .filter((t) => t.condition !== 'Healthy' || (t.surfaces && t.surfaces.length > 0))
        .sort((a, b) => a.number - b.number),
    [activeTeeth]
  );

  const totalEstimatedCost = useMemo(
    () => Object.values(activeTeeth).reduce((acc, t) => acc + (t.cost || 0), 0),
    [activeTeeth]
  );

  const tabs = [
    {
      id: 'schedule',
      label: 'Shaxsiy Navbatim',
      icon: <Calendar className="w-3.5 h-3.5" />,
      badge: `${doctorAppointments.length}`,
    },
    {
      id: 'odontogram',
      label: 'Tish Formulasi (FDI 11–48)',
      icon: <Activity className="w-3.5 h-3.5" />,
    },
    {
      id: 'emr',
      label: 'Bemor EMR Kartochkasi',
      icon: <UserCheck className="w-3.5 h-3.5" />,
    },
  ];

  const updateToothState = (partial: Partial<ToothData>) => {
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
    const prevSurfaces = currentTooth.surfaces || [];
    const exists = prevSurfaces.includes(surface);
    const updatedSurfaces = exists
      ? prevSurfaces.filter((s) => s !== surface)
      : [...prevSurfaces, surface];

    updateToothState({ surfaces: updatedSurfaces });
  };

  const handleSaveOdontogram = () => {
    if (!selectedPatient) return;
    onSaveTeethMap(selectedPatient.id, activeTeeth);
    onTriggerSignalR(
      'Tish Formulasi Yangilandi',
      `${selectedPatient.fullName} EMR kartasidagi ${selectedToothNum}-tish muolaja rejasi saqlandi`,
      'success'
    );
  };

  const handleCopyJson = async () => {
    if (!selectedPatient) return;
    const payload = JSON.stringify({ patientId: selectedPatient.id, teeth: activeTeeth }, null, 2);
    try {
      await navigator.clipboard.writeText(payload);
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    } catch {
      // Ignore clipboard failure silently
    }
  };

  const renderToothButton = (num: number) => {
    const data = activeTeeth[num];
    const condition: ToothCondition = data?.condition || 'Healthy';
    const surfacesCount = data?.surfaces?.length || 0;
    const isSel = selectedToothNum === num;
    const cfg = CONDITION_CONFIG[condition] || CONDITION_CONFIG.Healthy;

    return (
      <button
        key={num}
        type="button"
        onClick={() => setSelectedToothNum(num)}
        title={`Tish #${num} — ${cfg.label}`}
        className={`p-1.5 rounded-xl border flex flex-col items-center justify-between min-h-[58px] transition-all cursor-pointer ${
          isSel
            ? 'ring-2 ring-teal-500 border-teal-500 bg-white shadow-md scale-[1.04] z-10'
            : `${cfg.bg} border-slate-200/90 hover:border-teal-400 hover:-translate-y-0.5`
        }`}
      >
        <span className="font-mono text-[10px] font-black text-slate-800">{num}</span>
        <div className="my-0.5 flex items-center justify-center h-4">
          {condition === 'Extracted' ? (
            <span className="text-rose-500 font-black text-xs">✕</span>
          ) : condition === 'Implant' ? (
            <span className="text-[10px] font-mono text-teal-700 font-extrabold">⚙</span>
          ) : (
            <div
              className={`w-3.5 h-3.5 rounded-sm border ${cfg.border} bg-white flex items-center justify-center`}
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
    <div className="mac-glass rounded-3xl border border-white/80 bg-white/80 backdrop-blur-2xl shadow-2xl shadow-slate-900/10 overflow-hidden">
      <MacWindowHeader
        title="Dr. Jasur Aliyev — Shifokor Ish Stoli"
        subtitle="Bosh Stomatolog / Implantolog ish stansiyasi va klinik koʻrik xonasi"
        role="Doctor"
        tabs={tabs}
        activeTab={activeSubTab}
        onTabChange={(id) => setActiveSubTab(id as 'schedule' | 'odontogram' | 'emr')}
      />

      <div className="p-5 sm:p-6 md:p-8 space-y-6">
        {/* SUB-TAB 1: PERSONAL SCHEDULE & QUEUE */}
        {activeSubTab === 'schedule' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/70 p-4 rounded-2xl border border-slate-200/80">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">Bugungi Shaxsiy Navbatim</h3>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-200/80 px-2 py-0.5 rounded-full">
                    <ShieldCheck className="w-3 h-3" />
                    Data Isolation
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Faqat sizga biriktirilgan bemorlar oqimi va tezkor qabul boshqaruvi
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex p-1 rounded-xl bg-slate-200/70 text-[11px] font-bold">
                  {[
                    { id: 'all', label: `Barchasi (${doctorAppointments.length})` },
                    { id: 'active', label: 'Navbatda' },
                    { id: 'completed', label: 'Yakunlangan' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setScheduleFilter(item.id as 'all' | 'active' | 'completed')}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        scheduleFilter === item.id
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {filteredAppointments.length === 0 ? (
              <div className="rounded-2xl border border-slate-200/80 bg-white/70 p-10 text-center text-xs text-slate-500">
                Ushbu filtr boʻyicha qabullar topilmadi.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAppointments.map((app) => {
                  const statusMeta = STATUS_META[app.status] || {
                    label: app.status,
                    badge: 'bg-slate-100 text-slate-700',
                  };
                  return (
                    <div
                      key={app.id}
                      className="mac-glass-subtle rounded-2xl p-4 bg-white/85 border border-slate-200/80 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between space-y-3"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-mono font-bold text-slate-800 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-teal-600" />
                            {app.startTime} – {app.endTime}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${statusMeta.badge}`}
                          >
                            {statusMeta.label}
                          </span>
                        </div>

                        <div>
                          <h4 className="text-xs font-extrabold text-slate-900">
                            {app.patientName}
                          </h4>
                          <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                            {app.patientPhone}
                          </p>
                          <p className="text-[11px] text-teal-700 font-semibold mt-1.5 bg-teal-50/70 px-2.5 py-1 rounded-lg border border-teal-100 inline-block">
                            {app.serviceName}
                          </p>
                          {app.notes && (
                            <p className="text-[11px] text-slate-500 italic mt-1.5">
                              “{app.notes}”
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Doctor Fast Actions */}
                      <div className="pt-2.5 border-t border-slate-200/60 flex gap-2">
                        {app.status === 'Confirmed' && (
                          <button
                            type="button"
                            onClick={() => onStatusChange(app.id, 'InProgress')}
                            className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-all active:scale-[0.98]"
                          >
                            <PlayCircle className="w-3.5 h-3.5" />
                            <span>Qabulga Kiritish</span>
                          </button>
                        )}

                        {app.status === 'InProgress' && (
                          <button
                            type="button"
                            onClick={() => {
                              onStatusChange(app.id, 'Completed');
                              setSelectedPatientId(app.patientId);
                              setActiveSubTab('odontogram');
                            }}
                            className="flex-1 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-all active:scale-[0.98]"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Yakunlash & FDI Karta</span>
                          </button>
                        )}

                        {app.status === 'Completed' && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPatientId(app.patientId);
                              setActiveSubTab('odontogram');
                            }}
                            className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-[11px] font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
                            <span>Tish Formulasini Ochish</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* SUB-TAB 2: INTERACTIVE ODONTOGRAM (FDI 11–48) */}
        {activeSubTab === 'odontogram' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white/80 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-xs font-semibold text-slate-500">Koʻrikdagi Bemor:</span>
                <select
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="bg-white font-bold text-slate-900 text-xs px-3 py-2 rounded-xl border border-slate-200 focus:border-teal-500 focus:outline-none cursor-pointer"
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.fullName} ({p.phoneNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowJsonbModal(true)}
                  className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Code2 className="w-3.5 h-3.5 text-teal-600" />
                  <span>JSONB Koʻrish</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveOdontogram}
                  disabled={!selectedPatient}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-xs font-bold shadow-xs inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-[0.98]"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Oʻzgarishlarni Saqlash</span>
                </button>
              </div>
            </div>

            {/* Matrix & Editor Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Teeth Matrix (8 Cols) */}
              <div className="lg:col-span-8 bg-white/80 rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 pb-2.5 border-b border-slate-200/70">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                    FDI 11–48 Standart Tish Formulasi
                  </span>
                  <span className="text-[11px]">
                    Tahrirlash uchun kerakli tish raqamini bosing
                  </span>
                </div>

                {/* Upper Jaw */}
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                    <span>1-Kvadrant (Oʻng)</span>
                    <span className="text-teal-700">Yuqori Jagʻ</span>
                    <span>2-Kvadrant (Chap)</span>
                  </div>
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-2.5 bg-slate-50/90 p-3 rounded-2xl border border-slate-200/70">
                    <div className="grid grid-cols-8 gap-1 xl:border-r xl:border-dashed xl:border-slate-300 xl:pr-2">
                      {QUADRANT_1.map((num) => renderToothButton(num))}
                    </div>
                    <div className="grid grid-cols-8 gap-1 xl:pl-1">
                      {QUADRANT_2.map((num) => renderToothButton(num))}
                    </div>
                  </div>
                </div>

                {/* Occlusal Arch Divider */}
                <div className="relative flex items-center justify-center py-0.5">
                  <div className="w-full border-t border-dashed border-slate-300" />
                  <span className="bg-white px-2.5 text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">
                    Okklyuzion Chiziq
                  </span>
                  <div className="w-full border-t border-dashed border-slate-300" />
                </div>

                {/* Lower Jaw */}
                <div className="space-y-2">
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-2.5 bg-slate-50/90 p-3 rounded-2xl border border-slate-200/70">
                    <div className="grid grid-cols-8 gap-1 xl:border-r xl:border-dashed xl:border-slate-300 xl:pr-2">
                      {QUADRANT_4.map((num) => renderToothButton(num))}
                    </div>
                    <div className="grid grid-cols-8 gap-1 xl:pl-1">
                      {QUADRANT_3.map((num) => renderToothButton(num))}
                    </div>
                  </div>
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                    <span>4-Kvadrant (Oʻng)</span>
                    <span className="text-teal-700">Pastki Jagʻ</span>
                    <span>3-Kvadrant (Chap)</span>
                  </div>
                </div>

                <div className="p-3.5 bg-teal-50/70 rounded-xl border border-teal-200/70 flex flex-wrap justify-between items-center gap-2 text-xs">
                  <span className="font-medium text-slate-700">
                    Rejalashtirilgan umumiy muolaja qiymati ({treatedTeethList.length} ta tish):
                  </span>
                  <span className="font-mono font-black text-sm text-teal-800">
                    {formatMoneyUzs(totalEstimatedCost)}
                  </span>
                </div>
              </div>

              {/* Tooth Surfaces and Clinical Plan (4 Cols) */}
              <div className="lg:col-span-4 bg-white/85 rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/70">
                  <span className="font-extrabold text-slate-900 text-xs">
                    #{selectedToothNum}-Tish Yuzalari (MODBL)
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      CONDITION_CONFIG[currentTooth.condition].bg
                    } ${CONDITION_CONFIG[currentTooth.condition].color} ${
                      CONDITION_CONFIG[currentTooth.condition].border
                    }`}
                  >
                    {CONDITION_CONFIG[currentTooth.condition].label}
                  </span>
                </div>

                {/* Interactive Surface Selector */}
                <div className="flex flex-col items-center p-3 bg-slate-50/90 rounded-2xl border border-slate-200/70 space-y-2">
                  <div className="relative w-24 h-24 flex items-center justify-center">
                    <button
                      type="button"
                      title="Buccal (B)"
                      onClick={() => toggleSurface('Buccal')}
                      className={`absolute top-0 w-16 h-5 rounded-t-md text-[9px] font-bold transition-all cursor-pointer ${
                        currentTooth.surfaces?.includes('Buccal')
                          ? 'bg-rose-500 text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      B
                    </button>
                    <button
                      type="button"
                      title="Mesial (M)"
                      onClick={() => toggleSurface('Mesial')}
                      className={`absolute left-0 w-5 h-16 rounded-l-md text-[9px] font-bold transition-all cursor-pointer flex items-center justify-center ${
                        currentTooth.surfaces?.includes('Mesial')
                          ? 'bg-rose-500 text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      M
                    </button>
                    <button
                      type="button"
                      title="Occlusal (O)"
                      onClick={() => toggleSurface('Occlusal')}
                      className={`w-11 h-11 rounded-lg text-[9px] font-bold z-10 transition-all cursor-pointer flex items-center justify-center ${
                        currentTooth.surfaces?.includes('Occlusal')
                          ? 'bg-rose-500 text-white shadow-xs'
                          : 'bg-slate-200/90 text-slate-700 hover:bg-slate-300/80'
                      }`}
                    >
                      O
                    </button>
                    <button
                      type="button"
                      title="Distal (D)"
                      onClick={() => toggleSurface('Distal')}
                      className={`absolute right-0 w-5 h-16 rounded-r-md text-[9px] font-bold transition-all cursor-pointer flex items-center justify-center ${
                        currentTooth.surfaces?.includes('Distal')
                          ? 'bg-rose-500 text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      D
                    </button>
                    <button
                      type="button"
                      title="Lingual (L)"
                      onClick={() => toggleSurface('Lingual')}
                      className={`absolute bottom-0 w-16 h-5 rounded-b-md text-[9px] font-bold transition-all cursor-pointer ${
                        currentTooth.surfaces?.includes('Lingual')
                          ? 'bg-rose-500 text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      L
                    </button>
                  </div>
                  <p className="text-[10px] font-mono text-slate-500">
                    Belgilangan:{' '}
                    {currentTooth.surfaces?.length
                      ? currentTooth.surfaces.join(', ')
                      : 'Tanlanmagan'}
                  </p>
                </div>

                {/* Condition Selector */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                    Klinik Holat:
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(Object.keys(CONDITION_CONFIG) as ToothCondition[]).map((cond) => {
                      const isSel = currentTooth.condition === cond;
                      const cfg = CONDITION_CONFIG[cond];
                      return (
                        <button
                          key={cond}
                          type="button"
                          onClick={() => {
                            updateToothState({
                              condition: cond,
                              cost: cfg.defaultPrice,
                              diagnosis:
                                cond === 'Healthy'
                                  ? ''
                                  : currentTooth.diagnosis || `${cfg.label} aniqlandi`,
                            });
                          }}
                          className={`p-2 rounded-xl border text-left text-[11px] transition-all cursor-pointer ${
                            isSel
                              ? `${cfg.bg} ${cfg.color} ${cfg.border} font-bold ring-1 ring-teal-500`
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {cfg.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Tashxis (Diagnosis):
                    </label>
                    <input
                      type="text"
                      value={currentTooth.diagnosis || ''}
                      onChange={(e) => updateToothState({ diagnosis: e.target.value })}
                      placeholder="Masalan: Chuqur karies (K02.1)"
                      className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs focus:border-teal-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Muolaja Rejasi:
                    </label>
                    <input
                      type="text"
                      value={currentTooth.treatmentPlan || ''}
                      onChange={(e) => updateToothState({ treatmentPlan: e.target.value })}
                      placeholder="Masalan: Fotopolimer plomba oʻrnatildi"
                      className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs focus:border-teal-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Muolaja Narxi (UZS):
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="10000"
                      value={currentTooth.cost || 0}
                      onChange={(e) => updateToothState({ cost: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 font-mono text-xs font-bold text-slate-900 focus:border-teal-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SUB-TAB 3: PATIENT EMR MEDICAL CARD */}
        {activeSubTab === 'emr' && selectedPatient && (
          <div className="bg-white/85 rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/70">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-teal-600" />
                  <h3 className="text-base font-extrabold text-slate-900">
                    {selectedPatient.fullName}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 font-mono">
                  {selectedPatient.phoneNumber} • {selectedPatient.gender}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <select
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  aria-label="Bemorni almashtirish"
                  className="bg-white font-bold text-slate-800 text-xs px-3 py-1.5 rounded-xl border border-slate-200 focus:outline-none cursor-pointer"
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.fullName}
                    </option>
                  ))}
                </select>

                <span className="text-xs font-mono font-bold text-rose-600 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200">
                  Qarzdorlik: {formatMoneyUzs(selectedPatient.totalDebt)}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-950 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">
                  Klinik Ogohlantirish & Allergiyalar:
                </strong>
                <span className="mt-0.5 block">
                  {selectedPatient.notes || 'Hech qanday allergik asoratlar qayd etilmagan.'}
                </span>
              </div>
            </div>

            {/* Active Dental Treatment Summary */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Odontogramma boʻyicha muolajalar ({treatedTeethList.length} ta tish)
                </h4>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('odontogram')}
                  className="text-xs font-bold text-teal-700 hover:underline cursor-pointer"
                >
                  FDI kartani tahrirlash →
                </button>
              </div>

              {treatedTeethList.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-4">
                  Ushbu bemor uchun hali patologik tish yozuvlari kiritilmagan.
                </p>
              ) : (
                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200/80 overflow-hidden">
                  {treatedTeethList.map((tooth) => {
                    const cfg = CONDITION_CONFIG[tooth.condition] || CONDITION_CONFIG.Healthy;
                    return (
                      <div
                        key={tooth.number}
                        className="p-3 bg-white flex flex-wrap items-center justify-between gap-2 text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono font-black text-slate-900 bg-slate-100 px-2 py-1 rounded-lg">
                            #{tooth.number}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.bg} ${cfg.color} ${cfg.border}`}
                          >
                            {cfg.label}
                          </span>
                          <span className="text-slate-700 font-medium">
                            {tooth.treatmentPlan || tooth.diagnosis || '—'}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-slate-900">
                          {formatMoneyUzs(tooth.cost || 0)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* JSONB Modal */}
      {showJsonbModal && selectedPatient && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowJsonbModal(false);
          }}
          className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div className="bg-slate-900/95 text-white rounded-3xl max-w-xl w-full p-6 border border-white/15 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-xs font-mono font-bold text-teal-300">
                PostgreSQL TreatmentRecords.OdontogramData (JSONB)
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleCopyJson()}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-semibold text-white cursor-pointer"
                >
                  {copiedJson ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedJson ? 'Nusxalandi' : 'Nusxa'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowJsonbModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
                  aria-label="Yopish"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <pre className="bg-black/60 p-4 rounded-2xl text-xs font-mono text-teal-300 max-h-72 overflow-y-auto leading-relaxed">
              {JSON.stringify({ patientId: selectedPatient.id, teeth: activeTeeth }, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};