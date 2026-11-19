import React, { useEffect, useMemo, useState } from 'react';
import {
  Appointment,
  Doctor,
  ServiceItem,
  Patient,
  Invoice,
  AppointmentStatus,
} from '../../types/dentacore';
import { formatMoneyUzs } from '../../data/mockData';
import { MacWindowHeader } from '../../components/MacWindowHeader';
import {
  CalendarDays,
  Receipt,
  UserPlus,
  Clock,
  CheckCircle2,
  XCircle,
  Banknote,
  CreditCard,
  Smartphone,
  Phone,
  AlertCircle,
  Search,
  X,
  ArrowRightCircle,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

interface ReceptionWorkstationProps {
  doctors: Doctor[];
  appointments: Appointment[];
  services: ServiceItem[];
  patients: Patient[];
  invoices: Invoice[];
  onStatusChange: (appointmentId: string, newStatus: AppointmentStatus) => void;
  onAddPayment: (
    invoiceId: string,
    amount: number,
    method: 'Cash' | 'UzcardHumo' | 'Click' | 'Payme'
  ) => void;
  onAddPatient: (p: Patient) => void;
  onTriggerSignalR: (
    title: string,
    message: string,
    severity: 'info' | 'success' | 'warning' | 'danger'
  ) => void;
}

type WorkstationSubTab = 'queue' | 'billing' | 'patients';
type PaymentMethod = 'Cash' | 'UzcardHumo' | 'Click' | 'Payme';

const STATUS_META: Record<
  AppointmentStatus,
  { label: string; badge: string }
> = {
  Pending: {
    label: 'Kutilmoqda',
    badge: 'bg-amber-100/90 text-amber-800 border border-amber-200',
  },
  Confirmed: {
    label: 'Keldi (Tasdiqlangan)',
    badge: 'bg-sky-100/90 text-sky-800 border border-sky-200',
  },
  InProgress: {
    label: 'Shifokor qabulida',
    badge: 'bg-emerald-100/90 text-emerald-800 border border-emerald-200',
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

const PAYMENT_METHODS: Array<{
  id: PaymentMethod;
  label: string;
  icon: React.ReactNode;
}> = [
  { id: 'Cash', label: 'Naqd Pul', icon: <Banknote className="w-3.5 h-3.5" /> },
  {
    id: 'UzcardHumo',
    label: 'Uzcard / Humo',
    icon: <CreditCard className="w-3.5 h-3.5" />,
  },
  { id: 'Click', label: 'Click', icon: <Smartphone className="w-3.5 h-3.5" /> },
  { id: 'Payme', label: 'Payme', icon: <Smartphone className="w-3.5 h-3.5" /> },
];

function normalizePhoneDigits(phone: string): string {
  return phone.replace(/\D/g, '');
}

export const ReceptionWorkstation: React.FC<ReceptionWorkstationProps> = ({
  doctors,
  appointments,
  services,
  patients,
  invoices,
  onStatusChange,
  onAddPayment,
  onAddPatient,
  onTriggerSignalR,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<WorkstationSubTab>('queue');
  const [queueFilter, setQueueFilter] = useState<'active' | 'all'>('active');

  // Billing state
  const [billingFilter, setBillingFilter] = useState<'all' | 'unpaid'>('all');
  const [billingSearch, setBillingSearch] = useState<string>('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('Cash');
  const [payError, setPayError] = useState<string | null>(null);

  // Walk-in patient form state
  const [walkinName, setWalkinName] = useState('');
  const [walkinPhone, setWalkinPhone] = useState('+998');
  const [walkinGender, setWalkinGender] = useState<'Erkak' | 'Ayol'>('Erkak');
  const [walkinNotes, setWalkinNotes] = useState('');
  const [walkinError, setWalkinError] = useState<string | null>(null);

  // Close payment sheet on Escape
  useEffect(() => {
    if (!selectedInvoice) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedInvoice(null);
        setPayError(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedInvoice]);

  const unpaidInvoicesCount = useMemo(
    () => invoices.filter((inv) => inv.debtAmount > 0).length,
    [invoices]
  );

  const totalPendingDebt = useMemo(
    () => invoices.reduce((sum, inv) => sum + Math.max(0, inv.debtAmount), 0),
    [invoices]
  );

  const filteredInvoices = useMemo(() => {
    const q = billingSearch.trim().toLowerCase();
    return invoices.filter((inv) => {
      if (billingFilter === 'unpaid' && inv.debtAmount <= 0) return false;
      if (!q) return true;
      const inName = inv.patientName.toLowerCase().includes(q);
      const inItems = inv.items.some((i) =>
        i.serviceName.toLowerCase().includes(q)
      );
      return inName || inItems;
    });
  }, [invoices, billingFilter, billingSearch]);

  const tabs = [
    {
      id: 'queue',
      label: 'Jonli Navbat (Queue Dispatcher)',
      icon: <CalendarDays className="w-3.5 h-3.5" />,
      badge: `${appointments.length}`,
    },
    {
      id: 'billing',
      label: 'Kassa & Toʻlovlar (Avans/Qarz)',
      icon: <Receipt className="w-3.5 h-3.5" />,
      badge: unpaidInvoicesCount > 0 ? `${unpaidInvoicesCount}` : undefined,
    },
    {
      id: 'patients',
      label: 'Bemor Roʻyxatga Olish (Walk-in)',
      icon: <UserPlus className="w-3.5 h-3.5" />,
    },
  ];

  const handleOpenPayModal = (inv: Invoice) => {
    setSelectedInvoice(inv);
    setPayAmount(inv.debtAmount);
    setPayMethod('Cash');
    setPayError(null);
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    if (!Number.isFinite(payAmount) || payAmount <= 0) {
      setPayError('Toʻlov summasi 0 soʻmdan katta boʻlishi kerak.');
      return;
    }

    if (payAmount > selectedInvoice.debtAmount) {
      setPayError(
        `Toʻlov summasi mavjud qoldiq qarzdan (${formatMoneyUzs(
          selectedInvoice.debtAmount
        )}) oshmasligi kerak.`
      );
      return;
    }

    onAddPayment(selectedInvoice.id, payAmount, payMethod);
    onTriggerSignalR(
      'Kassa: Toʻlov Qabul Qilindi',
      `${selectedInvoice.patientName} dan ${formatMoneyUzs(
        payAmount
      )} qabul qilindi (${payMethod})`,
      'success'
    );
    setSelectedInvoice(null);
    setPayError(null);
  };

  const handleWalkinPhoneChange = (val: string) => {
    let cleaned = val.replace(/[^\d+]/g, '');
    if (!cleaned.startsWith('+998')) {
      const digits = cleaned.replace(/\D/g, '');
      cleaned = digits.startsWith('998') ? `+${digits}` : `+998${digits}`;
    }
    if (cleaned.length > 13) {
      cleaned = cleaned.substring(0, 13);
    }
    setWalkinPhone(cleaned);
    if (walkinError) setWalkinError(null);
  };

  const handleRegisterWalkin = (e: React.FormEvent) => {
    e.preventDefault();
    setWalkinError(null);

    const trimmedName = walkinName.trim();
    if (trimmedName.length < 3) {
      setWalkinError(
        'Iltimos, bemorning ism va familiyasini toʻliq kiriting (kamida 3 ta belgi).'
      );
      return;
    }

    const phoneDigits = normalizePhoneDigits(walkinPhone);
    if (!phoneDigits.startsWith('998') || phoneDigits.length !== 12) {
      setWalkinError(
        'Telefon raqami +998 bilan boshlanib, jami 12 ta raqamdan iborat boʻlishi kerak (masalan: +998901234567).'
      );
      return;
    }

    if (
      patients.some((p) => normalizePhoneDigits(p.phoneNumber) === phoneDigits)
    ) {
      setWalkinError(
        'Bu telefon raqam bilan bemor allaqachon roʻyxatdan oʻtgan (Idempotent Bemor)!'
      );
      return;
    }

    const normalizedPhone = `+${phoneDigits}`;
    const newPat: Patient = {
      id: `pat-${Date.now()}`,
      fullName: trimmedName,
      phoneNumber: normalizedPhone,
      gender: walkinGender,
      totalDebt: 0,
      notes: walkinNotes.trim() || 'Registraturada walk-in ochilgan',
      createdAt: new Date().toISOString().substring(0, 10),
    };

    onAddPatient(newPat);
    setWalkinName('');
    setWalkinPhone('+998');
    setWalkinNotes('');
    setWalkinError(null);

    onTriggerSignalR(
      'Yangi Bemor Roʻyxatga Olindi',
      `${newPat.fullName} qabulga tayyor`,
      'success'
    );
    setActiveSubTab('queue');
  };

  return (
    <div className="mac-glass relative rounded-3xl border border-white/80 bg-white/80 backdrop-blur-2xl shadow-2xl shadow-slate-900/10 overflow-hidden">
      <MacWindowHeader
        title="Registratura & Qabul Boʻlimi (Reception Desk)"
        subtitle="Jonli navbat boshqaruvi, bemorlarni qabul qilish va kassa toʻlovlari"
        role="Receptionist"
        tabs={tabs}
        activeTab={activeSubTab}
        onTabChange={(id) => setActiveSubTab(id as WorkstationSubTab)}
      />

      <div className="p-5 sm:p-6 md:p-8 space-y-6">
        {/* SUB-TAB 1: LIVE QUEUE DISPATCHER */}
        {activeSubTab === 'queue' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
                  Multi-Shifokor Jonli Navbat Gridi
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Kelgan bemorlarni tasdiqlash va shifokor xonasiga yoʻnaltirish
                </p>
              </div>

              <div className="inline-flex p-1 rounded-xl bg-slate-200/70 text-[11px] font-bold self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setQueueFilter('active')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    queueFilter === 'active'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Faol navbat
                </button>
                <button
                  type="button"
                  onClick={() => setQueueFilter('all')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    queueFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Barchasi ({appointments.length})
                </button>
              </div>
            </div>

            {doctors.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 p-10 text-center text-xs text-slate-500">
                Faol shifokorlar roʻyxati topilmadi.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {doctors.map((doc) => {
                  const docApps = appointments
                    .filter((a) => {
                      if (a.doctorId !== doc.id) return false;
                      if (queueFilter === 'active') {
                        return (
                          a.status !== 'Completed' &&
                          a.status !== 'Cancelled' &&
                          a.status !== 'NoShow'
                        );
                      }
                      return true;
                    })
                    .sort(
                      (a, b) =>
                        a.date.localeCompare(b.date) ||
                        a.startTime.localeCompare(b.startTime)
                    );

                  return (
                    <div
                      key={doc.id}
                      className="bg-white/75 backdrop-blur-xl rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col"
                    >
                      <div className="p-4 border-b border-slate-200/70 flex items-center justify-between bg-gradient-to-r from-white/90 to-teal-50/40">
                        <div className="min-w-0 pr-2">
                          <h4 className="text-xs font-extrabold text-slate-900 truncate">
                            {doc.fullName}
                          </h4>
                          <p className="text-[11px] text-teal-700 font-semibold truncate">
                            {doc.specialty}
                          </p>
                        </div>
                        <span className="text-[10px] font-mono font-bold bg-teal-500/12 text-teal-800 px-2.5 py-1 rounded-full border border-teal-500/20 shrink-0">
                          {docApps.length} ta navbat
                        </span>
                      </div>

                      <div className="p-3.5 space-y-2.5 flex-1 min-h-[280px] max-h-[460px] overflow-y-auto">
                        {docApps.length === 0 ? (
                          <div className="h-44 flex flex-col items-center justify-center text-center px-4 text-xs text-slate-400">
                            <Clock className="w-6 h-6 text-slate-300 mb-1.5" />
                            <span>Hozircha navbatda bemor yoʻq</span>
                          </div>
                        ) : (
                          docApps.map((app) => {
                            const statusMeta = STATUS_META[app.status] || {
                              label: app.status,
                              badge: 'bg-slate-100 text-slate-700',
                            };
                            return (
                              <div
                                key={app.id}
                                className="p-3.5 rounded-2xl bg-white/95 border border-slate-200/80 shadow-2xs hover:shadow-sm transition-all space-y-2.5"
                              >
                                <div className="flex items-center justify-between gap-2 text-xs font-mono">
                                  <span className="font-bold text-slate-800 inline-flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-teal-600" />
                                    {app.startTime}
                                    {app.bookingCode && (
                                      <span className="text-[10px] text-slate-400">
                                        · #{app.bookingCode}
                                      </span>
                                    )}
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-sans font-bold ${statusMeta.badge}`}
                                  >
                                    {statusMeta.label}
                                  </span>
                                </div>

                                <div>
                                  <div className="text-xs font-extrabold text-slate-900">
                                    {app.patientName}
                                  </div>
                                  <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                                    <Phone className="w-3 h-3 text-slate-400" />
                                    {app.patientPhone}
                                  </div>
                                  <div className="text-[11px] text-teal-700 font-semibold mt-1">
                                    {app.serviceName}
                                  </div>
                                </div>

                                {(app.status === 'Pending' ||
                                  app.status === 'Confirmed') && (
                                  <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[10px]">
                                    {app.status === 'Pending' && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          onStatusChange(app.id, 'Confirmed')
                                        }
                                        className="flex-1 py-1.5 px-2 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-bold shadow-2xs cursor-pointer transition-all"
                                      >
                                        Keldi (Tasdiqlash)
                                      </button>
                                    )}
                                    {app.status === 'Confirmed' && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          onStatusChange(app.id, 'InProgress')
                                        }
                                        className="flex-1 py-1.5 px-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold shadow-2xs inline-flex items-center justify-center gap-1 cursor-pointer transition-all"
                                      >
                                        <ArrowRightCircle className="w-3 h-3" />
                                        <span>Xonaga kiritish</span>
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() =>
                                        onStatusChange(app.id, 'Cancelled')
                                      }
                                      className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/70 font-bold cursor-pointer transition-colors"
                                    >
                                      Bekor
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* SUB-TAB 2: BILLING & CASH DESK */}
        {activeSubTab === 'billing' && (
          <div className="space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Kassa & Toʻlovlar Boshqaruvi
                  </h3>
                  {totalPendingDebt > 0 && (
                    <span className="text-[10px] font-mono font-bold bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-0.5 rounded-full">
                      Jami kutilayotgan qarz: {formatMoneyUzs(totalPendingDebt)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Avans qabul qilish, hisob-fakturalar va qarz qoldigʻini soʻndirish
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex p-1 rounded-xl bg-slate-200/70 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setBillingFilter('all')}
                    className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                      billingFilter === 'all'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Barchasi ({invoices.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingFilter('unpaid')}
                    className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                      billingFilter === 'unpaid'
                        ? 'bg-white text-rose-700 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Qarzdorlar ({unpaidInvoicesCount})
                  </button>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Bemor yoki xizmat..."
                    value={billingSearch}
                    onChange={(e) => setBillingSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs w-48 focus:border-teal-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {filteredInvoices.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white/75 p-10 text-center space-y-1.5">
                <ShieldCheck className="w-7 h-7 text-emerald-600 mx-auto" />
                <p className="text-xs font-bold text-slate-800">
                  Mos keluvchi hisob-faktura topilmadi
                </p>
                <p className="text-[11px] text-slate-500">
                  Barcha toʻlovlar yopilgan yoki qidiruv soʻroviga mos chek yoʻq.
                </p>
              </div>
            ) : (
              <>
                {/* Mobile Billing Cards */}
                <div className="grid grid-cols-1 gap-3 md:hidden">
                  {filteredInvoices.map((inv) => (
                    <div
                      key={inv.id}
                      className="bg-white/90 rounded-2xl p-4 border border-slate-200/80 shadow-2xs space-y-2.5 text-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-extrabold text-slate-900">
                            {inv.patientName}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {inv.items.map((i) => i.serviceName).join(', ')}
                          </div>
                        </div>
                        {inv.debtAmount > 0 ? (
                          <span className="font-mono font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-lg shrink-0">
                            -{formatMoneyUzs(inv.debtAmount)}
                          </span>
                        ) : (
                          <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg font-bold text-[10px]">
                            Yopilgan
                          </span>
                        )}
                      </div>

                      <div className="flex justify-between text-[11px] font-mono pt-2 border-t border-slate-100">
                        <span className="text-slate-500">
                          Jami: <strong className="text-slate-900">{formatMoneyUzs(inv.totalAmount)}</strong>
                        </span>
                        <span className="text-emerald-700 font-semibold">
                          Toʻlangan: {formatMoneyUzs(inv.paidAmount)}
                        </span>
                      </div>

                      {inv.debtAmount > 0 && (
                        <button
                          type="button"
                          onClick={() => handleOpenPayModal(inv)}
                          className="w-full py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-bold text-xs shadow-xs cursor-pointer"
                        >
                          Avans / Toʻlov Qabul
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Desktop Billing Table */}
                <div className="hidden md:block bg-white/85 backdrop-blur-xl rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50/90 text-slate-600 uppercase text-[10px] tracking-wider font-bold border-b border-slate-200/70">
                        <tr>
                          <th className="py-3.5 px-4">Bemor</th>
                          <th className="py-3.5 px-4">Xizmatlar</th>
                          <th className="py-3.5 px-4 font-mono">Jami Narx</th>
                          <th className="py-3.5 px-4 font-mono">Toʻlangan</th>
                          <th className="py-3.5 px-4 font-mono">Qoldiq Qarz</th>
                          <th className="py-3.5 px-4 text-right">
                            Toʻlov Qabul Qilish
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/60">
                        {filteredInvoices.map((inv) => (
                          <tr
                            key={inv.id}
                            className="hover:bg-white transition-colors"
                          >
                            <td className="py-3.5 px-4 font-bold text-slate-900">
                              {inv.patientName}
                            </td>
                            <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                              {inv.items.map((i) => i.serviceName).join(', ')}
                            </td>
                            <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                              {formatMoneyUzs(inv.totalAmount)}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-emerald-700 font-semibold">
                              {formatMoneyUzs(inv.paidAmount)}
                            </td>
                            <td className="py-3.5 px-4 font-mono font-bold">
                              {inv.debtAmount > 0 ? (
                                <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200/80">
                                  {formatMoneyUzs(inv.debtAmount)}
                                </span>
                              ) : (
                                <span className="text-slate-400">0 soʻm</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              {inv.debtAmount > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => handleOpenPayModal(inv)}
                                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-xs shadow-xs cursor-pointer transition-all active:scale-[0.98]"
                                >
                                  Avans / Toʻlov Qabul
                                </button>
                              ) : (
                                <span className="text-emerald-700 font-bold text-xs inline-flex items-center justify-end gap-1 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/70">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Yopilgan
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* SUB-TAB 3: WALK-IN REGISTRATION */}
        {activeSubTab === 'patients' && (
          <div className="max-w-xl mx-auto bg-white/85 backdrop-blur-xl rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-5">
            <div>
              <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 border border-teal-200/80 px-2.5 py-0.5 rounded-full mb-1.5">
                <Sparkles className="w-3 h-3" />
                Walk-in EMR Registratsiya
              </div>
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-teal-600" />
                <span>Yangi Tashrif Buyurgan Bemorni Roʻyxatga Olish</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Oʻzbekiston raqami (+998) boʻyicha avtomatik unikal tekshiruv
                {services.length > 0 ? ` • ${services.length} ta xizmat faol` : ''}
              </p>
            </div>

            {walkinError && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                <span>{walkinError}</span>
              </div>
            )}

            <form onSubmit={handleRegisterWalkin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  F.I.SH (Toʻliq Ism-Sharif) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Masalan: Sardor Rahimov"
                  value={walkinName}
                  onChange={(e) => {
                    setWalkinName(e.target.value);
                    if (walkinError) setWalkinError(null);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-teal-500/25 focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Telefon Raqami (+998) *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-teal-600 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="tel"
                    required
                    placeholder="+998901234567"
                    value={walkinPhone}
                    onChange={(e) => handleWalkinPhoneChange(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-mono font-semibold text-slate-900 focus:ring-2 focus:ring-teal-500/25 focus:border-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Jinsi:
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {(['Erkak', 'Ayol'] as const).map((gender) => {
                    const active = walkinGender === gender;
                    return (
                      <button
                        key={gender}
                        type="button"
                        onClick={() => setWalkinGender(gender)}
                        className={`py-2 px-3 rounded-xl border font-bold transition-all cursor-pointer ${
                          active
                            ? 'bg-teal-50 border-teal-500 text-teal-800 shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {gender}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Birlamchi Shikoyat:
                </label>
                <textarea
                  rows={2}
                  placeholder="Masalan: Tish kariesi sabab kuchli ogʻriq..."
                  value={walkinNotes}
                  onChange={(e) => setWalkinNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:ring-2 focus:ring-teal-500/25 focus:border-teal-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-xs shadow-md shadow-teal-600/20 cursor-pointer transition-all active:scale-[0.99]"
              >
                Klinika Bazasiga Kiritish & Qabulga Yoʻnaltirish
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Payment Processing Sheet */}
      {selectedInvoice && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedInvoice(null);
              setPayError(null);
            }
          }}
          className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-md flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white/95 backdrop-blur-2xl rounded-3xl max-w-md w-full p-6 border border-white shadow-2xl space-y-4">
            {/* macOS Window Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/70">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center space-x-1.5 mr-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedInvoice(null);
                      setPayError(null);
                    }}
                    className="w-3 h-3 rounded-full bg-rose-500 hover:bg-rose-400 cursor-pointer"
                    aria-label="Yopish"
                  />
                  <span className="w-3 h-3 rounded-full bg-amber-400" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Kassa Toʻlovini Tasdiqlash
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Bemor: <strong className="text-slate-800">{selectedInvoice.patientName}</strong>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedInvoice(null);
                  setPayError(null);
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                aria-label="Yopish"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {payError && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{payError}</span>
              </div>
            )}

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div className="p-3.5 bg-slate-50/90 rounded-2xl border border-slate-200/80 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Umumiy hisob:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {formatMoneyUzs(selectedInvoice.totalAmount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Mavjud qoldiq qarz:</span>
                  <span className="font-mono font-extrabold text-rose-600">
                    {formatMoneyUzs(selectedInvoice.debtAmount)}
                  </span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Toʻlanayotgan Summa (UZS):
                  </label>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => {
                        setPayAmount(Math.round(selectedInvoice.debtAmount / 2));
                        setPayError(null);
                      }}
                      className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                    >
                      50% Avans
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPayAmount(selectedInvoice.debtAmount);
                        setPayError(null);
                      }}
                      className="px-2 py-0.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 cursor-pointer"
                    >
                      100% Toʻliq
                    </button>
                  </div>
                </div>

                <input
                  type="number"
                  min={1}
                  step="any"
                  max={selectedInvoice.debtAmount}
                  value={payAmount || ''}
                  onChange={(e) => {
                    setPayAmount(Number(e.target.value));
                    if (payError) setPayError(null);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-mono font-extrabold text-slate-900 focus:ring-2 focus:ring-teal-500/25 focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Toʻlov Usuli:
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {PAYMENT_METHODS.map((m) => {
                    const active = payMethod === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPayMethod(m.id)}
                        className={`p-2.5 rounded-xl border inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          active
                            ? 'bg-teal-50 border-teal-500 text-teal-800 font-bold shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {m.icon}
                        <span>{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200/70">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedInvoice(null);
                    setPayError(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-xs shadow-sm cursor-pointer inline-flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Chekni Tasdiqlash</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};