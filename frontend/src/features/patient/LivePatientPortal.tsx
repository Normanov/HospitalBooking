import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard,
  CalendarDays,
  Smile,
  Pill,
  CircleDollarSign,
  ArrowRight,
  RefreshCw,
  LoaderCircle,
  Clock3,
  Stethoscope,
  History,
  CheckCircle2,
  ReceiptText,
  Check,
  ChevronDown,
  ChevronUp,
  Bell,
  LogOut,
  User,
  Sparkles,
  ShieldCheck,
  Plus,
} from 'lucide-react';
import { apiRequest, signOut } from '../../lib/api';
import { MagnificationDock } from '../../components/ui/MagnificationDock';

// ─── Types ───────────────────────────────────────────────────────────────────

interface PatientAppointment {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  doctorName: string;
  serviceName: string | null;
}

interface ToothRecord {
  toothNumber: number;
  condition: string;
  diagnosis: string | null;
  treatmentPlan: string | null;
  updatedAt: string;
}

interface PrescriptionItem {
  medicineName: string;
  dosage: string;
  duration: string;
  instructions: string;
}

interface PrescriptionRecord {
  id: string;
  issuedAt: string;
  notes: string | null;
  doctorName: string;
  items: PrescriptionItem[];
}

interface PaymentRecord {
  amount: number;
  method: string;
  createdAt: string;
  referenceCode: string;
}

interface InvoiceRecord {
  id: string;
  receiptNumber: string;
  totalAmount: number;
  paidAmount: number;
  debtAmount: number;
  status: string;
  createdAt: string;
  payments: PaymentRecord[];
}

interface PatientRecords {
  odontogram: ToothRecord[];
  prescriptions: PrescriptionRecord[];
  invoices: InvoiceRecord[];
}

type TabId = 'overview' | 'appointments' | 'odontogram' | 'prescriptions' | 'payments';

// ─── Constants ────────────────────────────────────────────────────────────────

const UPPER_JAW = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_JAW = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

// Arch offsets: index 0–15, center teeth (index 7-8) are deepest on upper jaw
// Values represent vertical offset in px (positive = down on upper, negative = down on lower)
const UPPER_ARCH_OFFSETS = [0, 4, 8, 14, 18, 22, 24, 26, 26, 24, 22, 18, 14, 8, 4, 0];
const LOWER_ARCH_OFFSETS = [0, -4, -8, -14, -18, -22, -24, -26, -26, -24, -22, -18, -14, -8, -4, 0];

const CONDITION_META: Record<string, { label: string; bg: string; ring: string; dot: string; glow: string }> = {
  Healthy:    { label: "Sog'lom",          bg: 'bg-emerald-50',    ring: 'ring-emerald-300/60', dot: 'bg-emerald-500', glow: 'shadow-emerald-400/30' },
  Caries:     { label: 'Karies',           bg: 'bg-rose-50',       ring: 'ring-rose-300/60',    dot: 'bg-rose-500',    glow: 'shadow-rose-400/30' },
  Filling:    { label: 'Plomba',           bg: 'bg-sky-50',        ring: 'ring-sky-300/60',     dot: 'bg-sky-500',     glow: 'shadow-sky-400/30' },
  Crown:      { label: 'Qoplama',          bg: 'bg-violet-50',     ring: 'ring-violet-300/60',  dot: 'bg-violet-500',  glow: 'shadow-violet-400/30' },
  Endodontic: { label: 'Ildiz kanali',     bg: 'bg-amber-50',      ring: 'ring-amber-300/60',   dot: 'bg-amber-500',   glow: 'shadow-amber-400/30' },
  Implant:    { label: 'Implant',          bg: 'bg-indigo-50',     ring: 'ring-indigo-300/60',  dot: 'bg-indigo-500',  glow: 'shadow-indigo-400/30' },
  Extracted:  { label: "Olingan (Yo'q)",   bg: 'bg-slate-100',     ring: 'ring-slate-300/60',   dot: 'bg-slate-400',   glow: 'shadow-slate-400/20' },
};

const LEGEND_ITEMS: Array<{ key: string; color: string }> = [
  { key: 'Healthy',    color: 'bg-emerald-500' },
  { key: 'Caries',     color: 'bg-rose-500' },
  { key: 'Filling',    color: 'bg-sky-500' },
  { key: 'Crown',      color: 'bg-violet-500' },
  { key: 'Endodontic', color: 'bg-amber-500' },
  { key: 'Implant',    color: 'bg-indigo-500' },
  { key: 'Extracted',  color: 'bg-slate-400' },
];

const STATUS_META: Record<string, { label: string; badge: string }> = {
  Pending:    { label: 'Tasdiq kutilmoqda', badge: 'bg-amber-100   text-amber-800  border border-amber-200' },
  Confirmed:  { label: 'Tasdiqlangan',      badge: 'bg-emerald-100 text-emerald-800 border border-emerald-200' },
  InProgress: { label: 'Qabulda',           badge: 'bg-sky-100     text-sky-800    border border-sky-200' },
  Completed:  { label: 'Yakunlangan',       badge: 'bg-teal-100    text-teal-800   border border-teal-200' },
  Cancelled:  { label: 'Bekor qilingan',    badge: 'bg-rose-100    text-rose-700   border border-rose-200' },
  NoShow:     { label: 'Kelmagan',          badge: 'bg-slate-100   text-slate-600  border border-slate-200' },
};

const NAV_ITEMS: Array<{ id: TabId; icon: React.ReactNode; label: string; shortLabel: string }> = [
  { id: 'overview',       icon: <LayoutDashboard className="w-5 h-5" />, label: 'Asosiy',       shortLabel: 'Asosiy' },
  { id: 'appointments',   icon: <CalendarDays className="w-5 h-5" />,   label: 'Qabullar',     shortLabel: 'Qabul' },
  { id: 'odontogram',     icon: <Smile className="w-5 h-5" />,          label: 'Tish Xaritasi',shortLabel: 'Tishlar' },
  { id: 'prescriptions',  icon: <Pill className="w-5 h-5" />,           label: 'Retseptlar',   shortLabel: 'Retsept' },
  { id: 'payments',       icon: <CircleDollarSign className="w-5 h-5" />,label: 'Moliya',      shortLabel: 'Moliya' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseDateTime(dateVal: string, timeVal: string): number {
  const datePart = dateVal.slice(0, 10);
  const timePart = (timeVal || '00:00:00').slice(0, 8);
  const parsed = new Date(`${datePart}T${timePart}`).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatDate(val: string): string {
  const d = new Date(val.length === 10 ? `${val}T12:00:00` : val);
  if (Number.isNaN(d.getTime())) return val;
  const months = ['yanvar','fevral','mart','aprel','may','iyun','iyul','avgust','sentabr','oktabr','noyabr','dekabr'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function formatMoney(val: number): string {
  return `${new Intl.NumberFormat('uz-UZ').format(Math.round(val))} so'm`;
}

function getInitials(name: string): string {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]?.toLocaleUpperCase() ?? '').join('') || 'BM';
}

function methodLabel(method: string): string {
  const map: Record<string, string> = { Cash: 'Naqd', UzcardHumo: 'Uzcard/Humo', Click: 'Click', Payme: 'Payme' };
  return map[method] ?? method;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface ToothCapsuleProps {
  number: number;
  record: ToothRecord | undefined;
  isSelected: boolean;
  archOffsetY: number;
  onClick: () => void;
}

const ToothCapsule: React.FC<ToothCapsuleProps> = ({ number, record, isSelected, archOffsetY, onClick }) => {
  const meta = record ? (CONDITION_META[record.condition] ?? CONDITION_META['Healthy']) : null;
  const isExtracted = record?.condition === 'Extracted';

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.12, y: -2 }}
      whileTap={{ scale: 0.93 }}
      transition={{ type: 'spring', stiffness: 380, damping: 22 }}
      style={{ transform: `translateY(${archOffsetY}px)` }}
      className={`
        relative flex flex-col items-center gap-0.5 cursor-pointer select-none
        w-7 sm:w-8 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500
      `}
      title={`${number}-tish${record ? `: ${meta?.label ?? record.condition}` : ": qayd yo'q"}`}
      aria-label={`${number}-tish`}
    >
      {/* Crown (top rounded part) */}
      <div
        className={`
          relative w-6 sm:w-7 h-7 sm:h-8 rounded-t-full flex items-center justify-center
          ring-1 ring-inset transition-all duration-150 tooth-capsule
          ${meta ? meta.bg : 'bg-white/80'}
          ${meta ? meta.ring : 'ring-slate-200/70'}
          ${isSelected ? `ring-2 ring-teal-500 shadow-lg ${meta?.glow ?? 'shadow-teal-400/25'} z-10` : ''}
          ${isExtracted ? 'opacity-50 border-dashed' : ''}
        `}
      >
        <span className="font-mono text-[9px] sm:text-[10px] font-black text-slate-700 leading-none">
          {number}
        </span>
        {/* Inner specular highlight */}
        <span className="absolute top-0 left-1/4 right-1/4 h-2 rounded-full bg-white/60 blur-[1px] pointer-events-none" />
      </div>

      {/* Root (bottom square part) */}
      <div
        className={`
          w-4 sm:w-5 h-2.5 sm:h-3 rounded-b-sm
          ${meta ? meta.bg : 'bg-slate-100/60'}
          ${isSelected ? 'opacity-100' : 'opacity-70'}
          ${isExtracted ? 'opacity-30' : ''}
        `}
      />

      {/* Status dot */}
      {meta && !isExtracted && (
        <span className={`w-1.5 h-1.5 rounded-full ${meta.dot} mt-0.5`} />
      )}
      {isExtracted && (
        <span className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-0.5 opacity-50" />
      )}
      {!record && (
        <span className="w-1.5 h-1.5 rounded-full bg-slate-200 mt-0.5" />
      )}
    </motion.button>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────

export interface LivePatientPortalProps {
  fullName: string;
  onBookAppointment: () => void;
}

export const LivePatientPortal: React.FC<LivePatientPortalProps> = ({ fullName, onBookAppointment }) => {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [appointments, setAppointments] = useState<PatientAppointment[]>([]);
  const [records, setRecords] = useState<PatientRecords | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedToothNumber, setSelectedToothNumber] = useState<number | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [expandedInvoices, setExpandedInvoices] = useState<Set<string>>(new Set());
  const mainRef = useRef<HTMLDivElement>(null);

  const initials = useMemo(() => getInitials(fullName), [fullName]);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [appts, recs] = await Promise.all([
        apiRequest<PatientAppointment[]>('/api/v1/portal/me/appointments'),
        apiRequest<PatientRecords>('/api/v1/portal/me/records'),
      ]);
      setAppointments(appts);
      setRecords(recs);
      if (!selectedToothNumber && recs.odontogram.length > 0) {
        setSelectedToothNumber(recs.odontogram[0].toothNumber);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ma'lumotlarni yuklab bo'lmadi.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedToothNumber]);

  useEffect(() => { void loadData(false); }, [loadData]);

  // Scroll to top on tab change
  useEffect(() => { mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' }); }, [activeTab]);

  const appointmentLists = useMemo(() => {
    const now = Date.now();
    const upcoming = appointments
      .filter(a => parseDateTime(a.date, a.startTime) >= now && a.status !== 'Cancelled' && a.status !== 'NoShow')
      .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
    const upcomingIds = new Set(upcoming.map(a => a.id));
    const history = appointments.filter(a => !upcomingIds.has(a.id))
      .sort((a, b) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime));
    return { upcoming, history };
  }, [appointments]);

  const totalDebt = useMemo(() =>
    records?.invoices.reduce((s, inv) => s + inv.debtAmount, 0) ?? 0,
    [records]
  );
  const totalPaid = useMemo(() =>
    records?.invoices.reduce((s, inv) => s + inv.paidAmount, 0) ?? 0,
    [records]
  );

  const selectedToothRecord = useMemo(() =>
    records?.odontogram.find(t => t.toothNumber === selectedToothNumber) ?? null,
    [records, selectedToothNumber]
  );

  const visibleAppointments = showHistory ? appointmentLists.history : appointmentLists.upcoming;

  const toggleInvoice = (id: string) => {
    setExpandedInvoices(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
  };

  // ─── Shared motion config ───
  const tabVariants = {
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.32, 0.72, 0, 1] as [number, number, number, number] } },
    exit:    { opacity: 0, y: -8, transition: { duration: 0.18, ease: [0.32, 0.72, 0, 1] as [number, number, number, number] } },
  };

  // ─── Loading State ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen portal-aurora-bg flex items-center justify-center p-4">
        <div className="liquid-glass-elevated rounded-[32px] p-10 flex flex-col items-center gap-5 max-w-xs w-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500/20 to-emerald-500/15 border border-teal-200/60 flex items-center justify-center">
            <LoaderCircle className="w-8 h-8 text-teal-700 animate-spin" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-extrabold tracking-tight text-slate-900">DentaCore</p>
            <p className="text-xs text-slate-500">Shaxsiy tibbiy ma'lumotlar yuklanmoqda...</p>
          </div>
          <div className="w-32 h-1.5 rounded-full bg-slate-200/80 overflow-hidden">
            <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // ─── Error State ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen portal-aurora-bg flex items-center justify-center p-4">
        <div className="liquid-glass-elevated rounded-[32px] p-8 max-w-sm w-full text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-100 border border-rose-200 flex items-center justify-center mx-auto">
            <span className="text-rose-600 text-2xl">!</span>
          </div>
          <div>
            <p className="font-extrabold text-slate-900 mb-1">Ma'lumotlarni yuklab bo'lmadi</p>
            <p className="text-xs text-slate-500 leading-5">{error}</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={() => void loadData(false)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-teal-700 to-emerald-600 text-white text-sm font-bold shadow-lg shadow-teal-900/15 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" /> Qayta urinish
          </motion.button>
        </div>
      </div>
    );
  }

  // ─── Main Layout ───────────────────────────────────────────────────────────
  return (
    <div className="relative min-h-screen portal-aurora-bg flex overflow-hidden">
      {/* Ambient orbs */}
      <div className="pointer-events-none fixed inset-0 -z-0 overflow-hidden">
        <div className="absolute -top-32 left-1/4 w-[32rem] h-[32rem] rounded-full bg-teal-300/15 blur-[80px]" />
        <div className="absolute top-1/2 -right-24 w-[28rem] h-[28rem] rounded-full bg-indigo-300/10 blur-[80px]" />
        <div className="absolute -bottom-24 left-8 w-[26rem] h-[26rem] rounded-full bg-emerald-300/12 blur-[80px]" />
      </div>

      {/* ── Desktop Sidebar ── */}
      <aside className="hidden lg:flex flex-col fixed top-0 left-0 h-screen w-64 z-30 sidebar-glass">
        {/* Logo */}
        <div className="px-6 py-6 border-b border-white/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-600 to-emerald-600 flex items-center justify-center shadow-md shadow-teal-900/20">
              <Smile className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-extrabold tracking-tight text-slate-900">DentaCore</p>
              <p className="text-[10px] text-slate-500 font-medium">Bemor Kabineti</p>
            </div>
          </div>
        </div>

        {/* Patient card */}
        <div className="px-4 py-4 border-b border-white/30">
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/50 border border-white/60">
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-teal-600 via-teal-700 to-cyan-600 flex items-center justify-center text-white font-extrabold text-sm shadow-sm">
              {initials}
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-extrabold text-slate-900 truncate">{fullName}</p>
              <p className="text-[10px] text-teal-700 font-semibold flex items-center gap-1 mt-0.5">
                <ShieldCheck className="w-3 h-3" /> Himoyalangan kabinet
              </p>
            </div>
          </div>
        </div>

        {/* Nav items — spring-animated macOS dock style */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <motion.button
                key={item.id}
                type="button"
                onClick={() => handleTabChange(item.id)}
                whileHover={{ scale: 1.03, x: 4 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 380, damping: 22 }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold cursor-pointer text-left relative ${
                  isActive
                    ? 'bg-gradient-to-r from-teal-700 to-emerald-600 text-white shadow-md shadow-teal-900/15'
                    : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
                }`}
              >
                <motion.span
                  animate={{ scale: isActive ? 1.15 : 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  className={isActive ? 'text-white' : 'text-slate-400'}
                >
                  {item.icon}
                </motion.span>
                <span className="font-bold">{item.label}</span>
                {isActive && (
                  <motion.span
                    layoutId="sidebarActiveIndicator"
                    className="absolute right-3 w-1.5 h-1.5 rounded-full bg-white/70"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </motion.button>
            );
          })}
        </nav>

        {/* Sidebar bottom actions */}
        <div className="px-3 pb-6 space-y-1 border-t border-white/30 pt-4">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onBookAppointment}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold bg-white/50 border border-white/60 text-teal-800 hover:bg-white/80 transition-all cursor-pointer"
          >
            <Plus className="w-5 h-5 text-teal-600" /> Qabulga yozilish
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => void signOut().catch(() => null)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold text-slate-500 hover:bg-rose-50 hover:text-rose-700 transition-all cursor-pointer"
          >
            <LogOut className="w-5 h-5" /> Chiqish
          </motion.button>
        </div>
      </aside>

      {/* ── Main scrollable content ── */}
      <main
        ref={mainRef}
        className="flex-1 lg:ml-64 pb-28 lg:pb-8 overflow-y-auto relative z-10"
      >
        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-20 bg-white/70 backdrop-blur-2xl border-b border-white/60 px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-600 to-emerald-600 flex items-center justify-center">
              <Smile className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-extrabold tracking-tight text-slate-900">DentaCore</span>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.93 }}
              onClick={() => void loadData(true)}
              disabled={refreshing}
              className="p-2 rounded-xl bg-white/60 border border-white/60 text-slate-500 hover:text-teal-700 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-teal-600' : ''}`} />
            </motion.button>
            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-teal-600 to-cyan-600 flex items-center justify-center text-white text-xs font-extrabold shadow-sm">
              {initials}
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-1.5 ring-white" />
            </div>
          </div>
        </header>

        {/* Desktop Header strip */}
        <div className="hidden lg:flex items-center justify-between px-8 pt-6 pb-2">
          <div>
            <p className="text-xs font-semibold text-teal-700 uppercase tracking-widest mb-1">
              {NAV_ITEMS.find(n => n.id === activeTab)?.label}
            </p>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Xush kelibsiz, {fullName.split(' ')[0]}</h1>
          </div>
          <div className="flex items-center gap-3">
            <motion.button
              whileTap={{ scale: 0.93 }}
              onClick={() => void loadData(true)}
              disabled={refreshing}
              className="p-2.5 rounded-xl liquid-glass text-slate-500 hover:text-teal-700 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-teal-600' : ''}`} />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={onBookAppointment}
              className="group flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-teal-700 to-emerald-600 text-white text-sm font-bold shadow-lg shadow-teal-900/15 hover:shadow-xl hover:from-teal-600 hover:to-emerald-500 transition-all cursor-pointer"
            >
              <CalendarDays className="w-4 h-4" />
              <span>Qabulga yozilish</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </motion.button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="px-4 lg:px-8 pt-4 lg:pt-6">
          <AnimatePresence mode="wait">
            {/* ── OVERVIEW ─────────────────────────────────────────────── */}
            {activeTab === 'overview' && (
              <motion.div key="overview" variants={tabVariants} initial="initial" animate="animate" exit="exit" className="space-y-5">

                {/* Hero welcome card */}
                <div className="liquid-glass-elevated rounded-[28px] p-6 sm:p-8 specular-highlight relative overflow-hidden">
                  <div className="pointer-events-none absolute top-0 right-0 w-64 h-48 rounded-full bg-teal-300/20 blur-3xl" />
                  <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
                    <div className="flex items-center gap-4">
                      <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-600 via-teal-700 to-cyan-600 flex items-center justify-center text-xl font-extrabold text-white shadow-xl shadow-teal-900/20 ring-4 ring-white/60">
                        {initials}
                        <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full ring-2 ring-white flex items-center justify-center">
                          <span className="w-2 h-2 bg-white rounded-full" />
                        </span>
                      </div>
                      <div>
                        <p className="inline-flex items-center gap-1.5 rounded-full border border-teal-500/20 bg-teal-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-teal-800 mb-2">
                          <ShieldCheck className="w-3 h-3" /> Shaxsiy kabinet
                        </p>
                        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950">{fullName}</h2>
                        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Sog'lig'ingiz, tish xaritangiz va qabullaringiz — bir joyda.</p>
                      </div>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.03, y: -1 }} whileTap={{ scale: 0.97 }}
                      onClick={onBookAppointment}
                      className="group flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-teal-700 to-emerald-600 text-white font-bold shadow-xl shadow-teal-900/20 hover:from-teal-600 hover:to-emerald-500 transition-all cursor-pointer sm:w-auto w-full"
                    >
                      <CalendarDays className="w-4 h-4" />
                      <span>Qabulga yozilish</span>
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                    </motion.button>
                  </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Upcoming appointments */}
                  <motion.button
                    type="button"
                    whileHover={{ y: -3, scale: 1.01 }} whileTap={{ scale: 0.98 }}
                    onClick={() => handleTabChange('appointments')}
                    transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                    className="liquid-glass rounded-[24px] p-5 text-left kpi-card-teal cursor-pointer group transition-all"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-teal-200/60 bg-teal-500/12 text-teal-800">
                        <CalendarDays className="w-4 h-4" />
                      </span>
                      <Sparkles className="w-3.5 h-3.5 text-slate-300 group-hover:text-teal-400 transition-colors" />
                    </div>
                    <p className="text-xs font-semibold text-slate-500">Bo'lajak qabullar</p>
                    <p className="text-2xl font-black tracking-tight text-slate-900 mt-1 tabular-nums">{appointmentLists.upcoming.length} ta</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {appointmentLists.upcoming[0] ? `Yaqini: ${formatDate(appointmentLists.upcoming[0].date)}` : 'Rejalashtirilmagan'}
                    </p>
                  </motion.button>

                  {/* Prescriptions */}
                  <motion.button
                    type="button"
                    whileHover={{ y: -3, scale: 1.01 }} whileTap={{ scale: 0.98 }}
                    onClick={() => handleTabChange('prescriptions')}
                    transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                    className="liquid-glass rounded-[24px] p-5 text-left kpi-card-violet cursor-pointer group transition-all"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-violet-200/60 bg-violet-500/12 text-violet-800">
                        <Pill className="w-4 h-4" />
                      </span>
                      <Sparkles className="w-3.5 h-3.5 text-slate-300 group-hover:text-violet-400 transition-colors" />
                    </div>
                    <p className="text-xs font-semibold text-slate-500">Retseptlar</p>
                    <p className="text-2xl font-black tracking-tight text-slate-900 mt-1 tabular-nums">{records?.prescriptions.length ?? 0} ta</p>
                    <p className="text-[11px] text-slate-400 mt-1">faol va avvalgi tavsiyalar</p>
                  </motion.button>

                  {/* Financial */}
                  <motion.button
                    type="button"
                    whileHover={{ y: -3, scale: 1.01 }} whileTap={{ scale: 0.98 }}
                    onClick={() => handleTabChange('payments')}
                    transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                    className={`liquid-glass rounded-[24px] p-5 text-left cursor-pointer group transition-all ${totalDebt > 0 ? 'kpi-card-amber' : 'kpi-card-emerald'}`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <span className={`flex h-9 w-9 items-center justify-center rounded-xl border ${totalDebt > 0 ? 'border-amber-200/60 bg-amber-500/12 text-amber-800' : 'border-emerald-200/60 bg-emerald-500/12 text-emerald-800'}`}>
                        {totalDebt > 0 ? <CircleDollarSign className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                      </span>
                      <Sparkles className="w-3.5 h-3.5 text-slate-300 group-hover:text-teal-400 transition-colors" />
                    </div>
                    <p className="text-xs font-semibold text-slate-500">Moliyaviy holat</p>
                    <p className={`text-xl font-black tracking-tight mt-1 tabular-nums ${totalDebt > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                      {totalDebt > 0 ? formatMoney(totalDebt) : "Qarz yo'q"}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {totalDebt > 0 ? "to'lovlar hisobga olingan qoldiq" : 'barcha hisob-fakturalar yopilgan'}
                    </p>
                  </motion.button>
                </div>

                {/* Next Appointment Spotlight */}
                {appointmentLists.upcoming[0] && (() => {
                  const next = appointmentLists.upcoming[0];
                  const statusInfo = STATUS_META[next.status] ?? { label: next.status, badge: 'bg-slate-100 text-slate-600 border border-slate-200' };
                  return (
                    <div className="liquid-glass rounded-[24px] p-5 sm:p-6 specular-highlight">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                        <p className="text-xs font-bold uppercase tracking-widest text-teal-700">Keyingi qabul</p>
                      </div>
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="space-y-2">
                          <p className="text-xl font-extrabold tracking-tight text-slate-900">{formatDate(next.date)}</p>
                          <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-600">
                            <Clock3 className="w-4 h-4 text-teal-600" />
                            {next.startTime.slice(0, 5)} – {next.endTime.slice(0, 5)}
                          </p>
                        </div>
                        <div className="text-right space-y-1.5">
                          <span className={`text-[11px] font-bold px-3 py-1 rounded-full ${statusInfo.badge}`}>{statusInfo.label}</span>
                          <p className="text-sm font-bold text-slate-800">{next.doctorName}</p>
                          <p className="text-xs text-slate-500">{next.serviceName ?? "Stomatologik ko'rik"}</p>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Quick summary of odontogram if data exists */}
                {records && records.odontogram.length > 0 && (
                  <motion.button
                    type="button"
                    whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}
                    onClick={() => handleTabChange('odontogram')}
                    className="w-full liquid-glass rounded-[24px] p-5 text-left cursor-pointer group transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-teal-200/60 bg-teal-500/12 text-teal-800">
                          <Smile className="w-4 h-4" />
                        </span>
                        <div>
                          <p className="text-sm font-bold text-slate-900">Tish xaritasi</p>
                          <p className="text-xs text-slate-500">{records.odontogram.length} ta tish bo'yicha ma'lumot mavjud</p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 group-hover:translate-x-1 transition-all" />
                    </div>
                  </motion.button>
                )}
              </motion.div>
            )}

            {/* ── APPOINTMENTS ─────────────────────────────────────────── */}
            {activeTab === 'appointments' && (
              <motion.div key="appointments" variants={tabVariants} initial="initial" animate="animate" exit="exit" className="space-y-5 max-w-2xl">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-extrabold tracking-tight text-slate-900">Qabullar</h2>
                  <motion.button
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={onBookAppointment}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-teal-700 to-emerald-600 text-white text-xs font-bold shadow-md shadow-teal-900/15 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Yangi qabul
                  </motion.button>
                </div>

                {/* Segmented Control */}
                <div className="seg-control flex gap-1 w-fit">
                  {(['Bo\'lajak', 'Tarix'] as const).map((label, idx) => {
                    const isHist = idx === 1;
                    const isActive = showHistory === isHist;
                    return (
                      <motion.button
                        key={label}
                        type="button"
                        onClick={() => setShowHistory(isHist)}
                        className={`relative px-5 py-2 rounded-[9px] text-sm font-bold transition-all cursor-pointer ${
                          isActive ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        {isActive && (
                          <motion.span
                            layoutId="segControlPill"
                            className="absolute inset-0 rounded-[9px] bg-white shadow-sm"
                            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                          />
                        )}
                        <span className="relative z-10">
                          {label} ({isHist ? appointmentLists.history.length : appointmentLists.upcoming.length})
                        </span>
                      </motion.button>
                    );
                  })}
                </div>

                {/* Appointment Cards */}
                {visibleAppointments.length === 0 ? (
                  <EmptyState
                    icon={showHistory ? <History className="w-5 h-5" /> : <CalendarDays className="w-5 h-5" />}
                    title={showHistory ? "Qabul tarixi hozircha bo'sh" : "Rejalashtirilgan qabul yo'q"}
                    detail={showHistory ? 'Tashriflaringiz yakunlangach shu yerda ko\'rinadi.' : 'Sizga mos vaqtni tanlab, onlayn tarzda qabulga yoziling.'}
                    action={!showHistory ? (
                      <motion.button
                        whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                        onClick={onBookAppointment}
                        className="mt-3 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-50 text-teal-800 text-xs font-bold border border-teal-100 cursor-pointer"
                      >
                        Vaqt tanlash <ArrowRight className="w-3.5 h-3.5" />
                      </motion.button>
                    ) : undefined}
                  />
                ) : (
                  <div className="space-y-3">
                    {visibleAppointments.map((item) => {
                      const statusInfo = STATUS_META[item.status] ?? { label: item.status, badge: 'bg-slate-100 text-slate-600 border border-slate-200' };
                      return (
                        <motion.article
                          key={item.id}
                          whileHover={{ y: -2 }}
                          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                          className="liquid-glass rounded-[24px] p-5 specular-highlight"
                        >
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div>
                              <p className="text-base font-extrabold tracking-tight text-slate-900">{formatDate(item.date)}</p>
                              <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mt-1">
                                <Clock3 className="w-3.5 h-3.5 text-teal-600" />
                                {item.startTime.slice(0, 5)} – {item.endTime.slice(0, 5)}
                              </p>
                            </div>
                            <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${statusInfo.badge} shrink-0`}>
                              {statusInfo.label}
                            </span>
                          </div>
                          <div className="flex items-center justify-between pt-3 border-t border-slate-100/80">
                            <div>
                              <p className="text-sm font-bold text-slate-800">{item.doctorName}</p>
                              <p className="text-xs text-slate-500 mt-0.5">{item.serviceName ?? "Stomatologik ko'rik"}</p>
                            </div>
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                              <Stethoscope className="w-4 h-4" />
                            </span>
                          </div>
                        </motion.article>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {/* ── ODONTOGRAM ───────────────────────────────────────────── */}
            {activeTab === 'odontogram' && (
              <motion.div key="odontogram" variants={tabVariants} initial="initial" animate="animate" exit="exit" className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-extrabold tracking-tight text-slate-900">Tish Xaritasi</h2>
                    <p className="text-xs text-slate-500 mt-0.5">FDI 11–48 interaktiv dental xarita</p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-800 text-[11px] font-bold">
                    <Sparkles className="w-3 h-3" /> FDI Standart
                  </span>
                </div>

                {/* Dental arch card */}
                <div className="liquid-glass-elevated rounded-[28px] p-5 sm:p-7 specular-highlight">
                  {/* Arch labels */}
                  <div className="flex justify-between items-center mb-2 px-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Yuqori o'ng</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600">Yuqori jag'</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Yuqori chap</span>
                  </div>

                  {/* Upper arch */}
                  <div className="dental-arch-container border-b-2 border-dashed border-slate-200/80 pb-4 mb-4">
                    <div className="flex items-end justify-center gap-1 sm:gap-1.5 w-full">
                      {UPPER_JAW.map((num, idx) => (
                        <ToothCapsule
                          key={num}
                          number={num}
                          record={records?.odontogram.find(t => t.toothNumber === num)}
                          isSelected={selectedToothNumber === num}
                          archOffsetY={-UPPER_ARCH_OFFSETS[idx]}
                          onClick={() => setSelectedToothNumber(num)}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Lower arch */}
                  <div className="dental-arch-container pt-4">
                    <div className="flex items-start justify-center gap-1 sm:gap-1.5 w-full">
                      {LOWER_JAW.map((num, idx) => (
                        <ToothCapsule
                          key={num}
                          number={num}
                          record={records?.odontogram.find(t => t.toothNumber === num)}
                          isSelected={selectedToothNumber === num}
                          archOffsetY={-LOWER_ARCH_OFFSETS[idx]}
                          onClick={() => setSelectedToothNumber(num)}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Lower arch labels */}
                  <div className="flex justify-between items-center mt-2 px-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pastki o'ng</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600">Pastki jag'</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pastki chap</span>
                  </div>

                  {/* Legend */}
                  <div className="flex flex-wrap gap-x-4 gap-y-2 pt-5 mt-3 border-t border-slate-100">
                    {LEGEND_ITEMS.map(({ key, color }) => (
                      <span key={key} className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-600">
                        <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
                        {CONDITION_META[key]?.label ?? key}
                      </span>
                    ))}
                    <span className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                      Qayd yo'q
                    </span>
                  </div>
                </div>

                {/* Selected Tooth Detail */}
                <AnimatePresence>
                  {selectedToothNumber !== null && (
                    <motion.div
                      key={`tooth-${selectedToothNumber}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                      className="liquid-glass rounded-[24px] p-5 specular-highlight"
                    >
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-teal-700 to-emerald-600 font-mono text-sm font-black text-white shadow-sm">
                            {selectedToothNumber}
                          </span>
                          <span className="font-extrabold text-slate-900">{selectedToothNumber}-tish holati</span>
                        </div>
                        {(() => {
                          const meta = selectedToothRecord ? CONDITION_META[selectedToothRecord.condition] : null;
                          return (
                            <span className={`rounded-full px-3 py-1 text-[11px] font-bold ring-1 ring-inset ${
                              meta ? `${meta.bg} ${meta.ring} text-slate-800` : 'bg-slate-100 text-slate-600 ring-slate-200'
                            }`}>
                              {selectedToothRecord ? (meta?.label ?? selectedToothRecord.condition) : "Qayd kiritilmagan"}
                            </span>
                          );
                        })()}
                      </div>

                      {selectedToothRecord ? (
                        <div className="space-y-2 text-xs">
                          {selectedToothRecord.diagnosis && (
                            <div className="rounded-xl bg-slate-50/80 border border-slate-100 px-3.5 py-2.5">
                              <span className="font-bold text-slate-700">Tashxis: </span>
                              <span className="text-slate-600">{selectedToothRecord.diagnosis}</span>
                            </div>
                          )}
                          {selectedToothRecord.treatmentPlan && (
                            <div className="rounded-xl bg-teal-50/60 border border-teal-100/80 px-3.5 py-2.5">
                              <span className="font-bold text-teal-800">Muolaja rejasi: </span>
                              <span className="text-teal-700">{selectedToothRecord.treatmentPlan}</span>
                            </div>
                          )}
                          <p className="text-[10px] text-slate-400 pt-1">
                            Yangilangan: {formatDate(selectedToothRecord.updatedAt)}
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500">
                          Ushbu tish bo'yicha shifokor ko'rigi qaydi hali kiritilmagan.
                        </p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Total count */}
                <p className="text-xs text-slate-400 text-center pb-2">
                  {records && records.odontogram.length > 0
                    ? `Jami ${records.odontogram.length} ta tish bo'yicha klinik ma'lumot mavjud`
                    : "Tishlar holati shifokor ko'rigidan so'ng yangilanadi"}
                </p>
              </motion.div>
            )}

            {/* ── PRESCRIPTIONS ────────────────────────────────────────── */}
            {activeTab === 'prescriptions' && (
              <motion.div key="prescriptions" variants={tabVariants} initial="initial" animate="animate" exit="exit" className="space-y-5 max-w-2xl">
                <h2 className="text-xl font-extrabold tracking-tight text-slate-900">Retseptlar</h2>

                {!records || records.prescriptions.length === 0 ? (
                  <EmptyState
                    icon={<Pill className="w-5 h-5" />}
                    title="Retseptlar hozircha yo'q"
                    detail="Shifokor tayinlagan dorilar va ichish tartibi shu bo'limda paydo bo'ladi."
                  />
                ) : (
                  <div className="space-y-4">
                    {records.prescriptions.map((rx) => (
                      <motion.article
                        key={rx.id}
                        whileHover={{ y: -1 }}
                        className="liquid-glass rounded-[24px] p-5 specular-highlight"
                      >
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div>
                            <p className="text-sm font-extrabold text-slate-900">{formatDate(rx.issuedAt)}</p>
                            <p className="text-xs text-slate-500 mt-0.5 font-medium">{rx.doctorName}</p>
                          </div>
                          <span className="flex items-center gap-1.5 rounded-xl bg-violet-500/12 px-3 py-1.5 text-[11px] font-bold text-violet-800">
                            <Pill className="w-3.5 h-3.5" /> {rx.items.length} ta dori
                          </span>
                        </div>

                        {rx.notes && (
                          <div className="mb-3 rounded-xl bg-slate-50/80 border border-slate-100 px-3.5 py-2.5 text-xs text-slate-600 leading-5">
                            {rx.notes}
                          </div>
                        )}

                        <ul className="space-y-2">
                          {rx.items.map((item, idx) => (
                            <li key={`${rx.id}-${idx}`} className="flex gap-2.5 rounded-xl border border-slate-100 bg-white/80 p-3 text-xs leading-5">
                              <Check className="mt-0.5 w-3.5 h-3.5 shrink-0 text-teal-600" />
                              <span>
                                <strong className="text-slate-900">{item.medicineName}</strong>
                                {' · '}
                                <span className="font-semibold text-teal-700">{item.dosage}</span>
                                {', '}
                                <span className="text-slate-600">{item.duration}. {item.instructions}</span>
                              </span>
                            </li>
                          ))}
                        </ul>
                      </motion.article>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* ── PAYMENTS ─────────────────────────────────────────────── */}
            {activeTab === 'payments' && (
              <motion.div key="payments" variants={tabVariants} initial="initial" animate="animate" exit="exit" className="space-y-5 max-w-2xl">
                <h2 className="text-xl font-extrabold tracking-tight text-slate-900">Moliya</h2>

                {/* Wallet summary card */}
                <div className={`rounded-[28px] p-6 text-white relative overflow-hidden specular-highlight ${
                  totalDebt > 0
                    ? 'bg-gradient-to-br from-amber-600 via-orange-600 to-red-600 shadow-lg shadow-amber-900/20'
                    : 'bg-gradient-to-br from-teal-700 via-teal-600 to-emerald-600 shadow-lg shadow-teal-900/20'
                }`}>
                  <div className="pointer-events-none absolute top-0 right-0 w-56 h-44 rounded-full bg-white/10 blur-2xl" />
                  <div className="relative">
                    <p className="text-xs font-bold uppercase tracking-widest text-white/70 mb-1">Moliyaviy holat</p>
                    <p className="text-3xl font-black tracking-tight tabular-nums">
                      {totalDebt > 0 ? formatMoney(totalDebt) : "Qarz yo'q"}
                    </p>
                    <p className="text-xs text-white/70 mt-1.5">
                      {totalDebt > 0 ? "Jami qoldiq qarz miqdori" : "Barcha hisob-fakturalar yopilgan"}
                    </p>
                    <div className="mt-4 flex items-center gap-6 text-xs font-semibold">
                      <div>
                        <p className="text-white/60">Jami to'langan</p>
                        <p className="text-white font-bold tabular-nums">{formatMoney(totalPaid)}</p>
                      </div>
                      <div className="w-px h-8 bg-white/20" />
                      <div>
                        <p className="text-white/60">Hisob-fakturalar</p>
                        <p className="text-white font-bold">{records?.invoices.length ?? 0} ta</p>
                      </div>
                    </div>
                  </div>
                </div>

                {!records || records.invoices.length === 0 ? (
                  <EmptyState
                    icon={<CircleDollarSign className="w-5 h-5" />}
                    title="To'lovlar tarixi hozircha bo'sh"
                    detail="Hisob-fakturalar va amalga oshirilgan to'lovlaringiz shu yerda ko'rinadi."
                  />
                ) : (
                  <div className="space-y-3">
                    {records.invoices.map((inv) => {
                      const paidPercent = inv.totalAmount > 0 ? Math.min(100, Math.round((inv.paidAmount / inv.totalAmount) * 100)) : 100;
                      const isExpanded = expandedInvoices.has(inv.id);
                      return (
                        <motion.article
                          key={inv.id}
                          whileHover={{ y: -1 }}
                          className="liquid-glass rounded-[24px] overflow-hidden"
                        >
                          <div className="p-5">
                            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                              <div className="flex items-center gap-3">
                                <span className="rounded-xl bg-amber-500/12 p-2.5 text-amber-700">
                                  <ReceiptText className="w-4 h-4" />
                                </span>
                                <div>
                                  <p className="font-mono text-sm font-extrabold text-slate-900">{inv.receiptNumber}</p>
                                  <p className="text-xs text-slate-500 mt-0.5">{formatDate(inv.createdAt)}</p>
                                </div>
                              </div>
                              <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${
                                inv.debtAmount > 0
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              }`}>
                                {inv.debtAmount > 0 ? `Qarz: ${formatMoney(inv.debtAmount)}` : "To'liq to'langan"}
                              </span>
                            </div>

                            {/* Progress bar */}
                            <div className="mb-4">
                              <div className="flex justify-between text-[10px] font-semibold text-slate-400 mb-1.5">
                                <span>To'lov jarayoni</span>
                                <span className="tabular-nums">{paidPercent}%</span>
                              </div>
                              <div className="h-1.5 w-full rounded-full bg-slate-200/70 overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${paidPercent}%` }}
                                  transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
                                  className={`h-full rounded-full ${inv.debtAmount > 0 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                />
                              </div>
                            </div>

                            {/* Money grid */}
                            <div className="grid grid-cols-3 gap-3 text-[11px]">
                              <MoneyCell label="Jami summa" value={inv.totalAmount} />
                              <MoneyCell label="To'langan" value={inv.paidAmount} />
                              <MoneyCell label="Qoldiq" value={inv.debtAmount} highlight={inv.debtAmount > 0} />
                            </div>

                            {/* Expand toggle */}
                            {inv.payments.length > 0 && (
                              <motion.button
                                type="button"
                                whileTap={{ scale: 0.97 }}
                                onClick={() => toggleInvoice(inv.id)}
                                className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-900 cursor-pointer transition-colors"
                              >
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                {isExpanded ? 'Yopish' : `To'lovlar tarixi (${inv.payments.length})`}
                              </motion.button>
                            )}
                          </div>

                          {/* Expanded payments */}
                          <AnimatePresence>
                            {isExpanded && inv.payments.length > 0 && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                className="overflow-hidden border-t border-slate-100"
                              >
                                <div className="px-5 pb-5 pt-4 space-y-2">
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">To'lovlar tarixi</p>
                                  {inv.payments.map((payment, idx) => (
                                    <div key={`${inv.id}-p-${idx}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50/80 px-3.5 py-2.5 text-xs text-slate-600">
                                      <span className="flex items-center gap-2">
                                        <span className="inline-block px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-[10px] font-bold text-slate-700">
                                          {methodLabel(payment.method)}
                                        </span>
                                        <span>{formatDate(payment.createdAt)}</span>
                                        {payment.referenceCode && (
                                          <span className="font-mono text-[10px] text-slate-400">#{payment.referenceCode}</span>
                                        )}
                                      </span>
                                      <strong className="font-mono font-bold text-slate-900 tabular-nums">{formatMoney(payment.amount)}</strong>
                                    </div>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.article>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

{/* -- Magnification Dock -- Mobile Bottom Nav (macOS spring physics) -- */}
      <nav
        className="lg:hidden fixed bottom-4 inset-x-3 sm:inset-x-4 z-50 flex justify-center pointer-events-none"
        aria-label="Mobil pastki menyu"
      >
        <div className="pointer-events-auto w-full max-w-sm">
          <MagnificationDock
            panelHeight={64}
            baseItemSize={44}
            magnification={68}
            distance={160}
            items={NAV_ITEMS.map((item) => ({
              icon: item.icon,
              label: item.shortLabel,
              isActive: activeTab === item.id,
              onClick: () => handleTabChange(item.id),
            }))}
          />
        </div>
      </nav>
    </div>
  );
};

// ─── Utility Components ───────────────────────────────────────────────────────

function EmptyState({
  icon,
  title,
  detail,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center rounded-[24px] border border-dashed border-slate-200/80 bg-white/40 backdrop-blur-md px-6 py-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white bg-white/90 text-teal-700 shadow-sm">
        {icon}
      </span>
      <p className="mt-3 text-sm font-bold text-slate-800">{title}</p>
      <p className="mt-1 max-w-xs text-xs leading-5 text-slate-500">{detail}</p>
      {action}
    </div>
  );
}

function MoneyCell({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <span className="min-w-0">
      <span className="block text-slate-400 mb-0.5">{label}</span>
      <strong
        className={`block truncate font-mono font-bold tabular-nums ${
          highlight ? 'text-amber-700' : 'text-slate-800'
        }`}
      >
        {formatMoney(value)}
      </strong>
    </span>
  );
}
