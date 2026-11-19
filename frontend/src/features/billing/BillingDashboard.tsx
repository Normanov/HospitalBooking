import React, { useState, useMemo } from 'react';
import { Invoice, Patient, Appointment } from '../../types/dentacore';
import { formatMoneyUzs } from '../../data/mockData';
import {
  Receipt,
  CreditCard,
  Banknote,
  Smartphone,
  AlertCircle,
  CheckCircle2,
  Plus,
  Printer,
  TrendingUp,
  FileText,
  Search,
  Sparkles,
  Tag,
  CalendarCheck2,
  X,
} from 'lucide-react';

type PaymentMethod = 'Cash' | 'UzcardHumo' | 'Click' | 'Payme';

interface BillingDashboardProps {
  invoices: Invoice[];
  patients: Patient[];
  appointments: Appointment[];
  onAddPayment: (invoiceId: string, amount: number, method: PaymentMethod) => void;
  onAddInvoice: (inv: Invoice) => void;
  onTriggerSignalR: (
    title: string,
    message: string,
    severity: 'info' | 'success' | 'warning' | 'danger'
  ) => void;
}

const PAYMENT_METHODS: { id: PaymentMethod; label: string; icon: React.ElementType }[] = [
  { id: 'Cash', label: 'Naqd Pul', icon: Banknote },
  { id: 'UzcardHumo', label: 'Uzcard / Humo', icon: CreditCard },
  { id: 'Click', label: 'Click Evolution', icon: Smartphone },
  { id: 'Payme', label: 'Payme', icon: Smartphone },
];

export const BillingDashboard: React.FC<BillingDashboardProps> = ({
  invoices,
  patients,
  appointments,
  onAddPayment,
  onAddInvoice,
  onTriggerSignalR,
}) => {
  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'debt' | 'paid'>('all');

  // Payment Modal State
  const [selectedInvoiceForPay, setSelectedInvoiceForPay] = useState<Invoice | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('Cash');
  const [payError, setPayError] = useState<string | null>(null);

  // Receipt Preview Modal State
  const [receiptInvoice, setReceiptInvoice] = useState<Invoice | null>(null);

  // New Invoice Modal State
  const [showNewInvoiceModal, setShowNewInvoiceModal] = useState<boolean>(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string>('');
  const [invPatientId, setInvPatientId] = useState<string>(patients[0]?.id || '');
  const [invServiceName, setInvServiceName] = useState<string>('Kompozit Plomba & Birlamchi Koʻrik');
  const [invTotalAmount, setInvTotalAmount] = useState<number>(450000);
  const [invDiscount, setInvDiscount] = useState<number>(0);
  const [invInitialPayment, setInvInitialPayment] = useState<number>(200000);
  const [invError, setInvError] = useState<string | null>(null);

  // Financial Stats
  const totalRevenueCollected = useMemo(
    () => invoices.reduce((acc, inv) => acc + inv.paidAmount, 0),
    [invoices]
  );
  const totalPendingDebt = useMemo(
    () => invoices.reduce((acc, inv) => acc + inv.debtAmount, 0),
    [invoices]
  );
  const totalBilled = useMemo(
    () => invoices.reduce((acc, inv) => acc + inv.totalAmount, 0),
    [invoices]
  );

  // SuperAdmin share calculation (40% clinic net share, 60% doctors)
  const clinicShareRate = 0.4;
  const clinicProfit = totalRevenueCollected * clinicShareRate;

  // Filtered Invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchesQuery =
        inv.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.items.some((item) =>
          item.serviceName.toLowerCase().includes(searchQuery.toLowerCase())
        );

      if (!matchesQuery) return false;
      if (statusFilter === 'debt') return inv.debtAmount > 0;
      if (statusFilter === 'paid') return inv.debtAmount === 0;
      return true;
    });
  }, [invoices, searchQuery, statusFilter]);

  const activeAppointments = useMemo(
    () => appointments.filter((a) => a.status !== 'Cancelled' && a.status !== 'NoShow'),
    [appointments]
  );

  const handleOpenPayment = (inv: Invoice) => {
    setPayError(null);
    setSelectedInvoiceForPay(inv);
    setPayAmount(inv.debtAmount);
    setPayMethod('Cash');
  };

  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setPayError(null);

    if (!selectedInvoiceForPay) return;
    if (payAmount <= 0) {
      setPayError('Toʻlov summasi 0 soʻmdan katta boʻlishi kerak.');
      return;
    }
    if (payAmount > selectedInvoiceForPay.debtAmount) {
      setPayError(
        `Toʻlov summasi mavjud qarzdan (${formatMoneyUzs(selectedInvoiceForPay.debtAmount)}) oshib ketishi mumkin emas.`
      );
      return;
    }

    onAddPayment(selectedInvoiceForPay.id, payAmount, payMethod);
    const methodLabel = PAYMENT_METHODS.find((m) => m.id === payMethod)?.label || payMethod;

    onTriggerSignalR(
      'Kassa: Toʻlov Qabul Qilindi',
      `${selectedInvoiceForPay.patientName} dan ${formatMoneyUzs(payAmount)} qabul qilindi (${methodLabel})`,
      'success'
    );
    setSelectedInvoiceForPay(null);
  };

  const handleOpenNewInvoice = () => {
    setInvError(null);
    setSelectedAppointmentId('');
    if (!invPatientId && patients[0]) setInvPatientId(patients[0].id);
    setShowNewInvoiceModal(true);
  };

  const handleSelectAppointmentForInvoice = (appId: string) => {
    setSelectedAppointmentId(appId);
    setInvError(null);
    if (!appId) return;

    const app = appointments.find((a) => a.id === appId);
    if (app) {
      setInvPatientId(app.patientId);
      setInvServiceName(app.serviceName ?? '');
    }
  };

  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    setInvError(null);

    const pat = patients.find((p) => p.id === invPatientId) || patients[0];
    if (!pat) {
      setInvError('Bemor tanlanmagan.');
      return;
    }
    if (invTotalAmount <= 0) {
      setInvError('Xizmat summasi 0 dan katta boʻlishi kerak.');
      return;
    }
    if (invDiscount < 0 || invDiscount > invTotalAmount) {
      setInvError('Chegirma summasi jami summadan oshmasligi kerak.');
      return;
    }

    const netPayable = invTotalAmount - invDiscount;
    if (invInitialPayment < 0 || invInitialPayment > netPayable) {
      setInvError(
        `Avans summasi toʻlanishi kerak boʻlgan summadan (${formatMoneyUzs(netPayable)}) katta boʻla olmaydi.`
      );
      return;
    }

    const debt = Math.max(0, netPayable - invInitialPayment);

    const newInv: Invoice = {
      id: `inv-${Date.now()}`,
      ...(selectedAppointmentId ? { appointmentId: selectedAppointmentId } : {}),
      patientId: pat.id,
      patientName: pat.fullName,
      totalAmount: invTotalAmount,
      discountAmount: invDiscount,
      paidAmount: invInitialPayment,
      debtAmount: debt,
      status: debt === 0 ? 'Paid' : invInitialPayment > 0 ? 'PartiallyPaid' : 'Unpaid',
      createdAt: new Date().toLocaleString('uz-UZ'),
      items: [{ serviceName: invServiceName.trim(), quantity: 1, unitPrice: invTotalAmount }],
    };

    onAddInvoice(newInv);
    setShowNewInvoiceModal(false);
    onTriggerSignalR(
      'Yangi Hisob-Faktura Chiqarildi',
      `${pat.fullName} ga ${formatMoneyUzs(netPayable)} hisob rasmiylashtirildi`,
      'info'
    );
  };

  const expectedDebt = Math.max(0, invTotalAmount - invDiscount - invInitialPayment);

  return (
    <div className="space-y-6">
      {/* macOS Frosted Glass Header */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-teal-500/15 to-emerald-500/15 border border-teal-500/20 text-teal-600 flex items-center justify-center shadow-inner">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-slate-900">
                Kassa & Moliyaviy Boshqaruv (Billing)
              </h2>
              <span className="text-[10px] font-mono bg-emerald-500/15 text-emerald-700 border border-emerald-500/25 font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Kassa: Ochiq
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Hisob-fakturalar, avans qabul qilish, chek chop etish va bemorlar qarzdorligi nazorati
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenNewInvoice}
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition-all active:scale-[0.98] cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Yangi Hisob-Faktura</span>
        </button>
      </div>

      {/* macOS Glassmorphic KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="relative overflow-hidden bg-white/80 backdrop-blur-xl p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div className="pointer-events-none absolute -right-6 -top-6 w-24 h-24 rounded-full bg-emerald-400/15 blur-2xl" />
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Klinika Sof Ulushi (40%)</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 text-2xl font-black text-slate-900 font-mono tracking-tight">
            {formatMoneyUzs(clinicProfit)}
          </div>
          <div className="mt-1.5 text-[11px] text-emerald-600 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Jami tushumdan ({formatMoneyUzs(totalRevenueCollected)})</span>
          </div>
        </div>

        <div className="relative overflow-hidden bg-white/80 backdrop-blur-xl p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div className="pointer-events-none absolute -right-6 -top-6 w-24 h-24 rounded-full bg-rose-400/15 blur-2xl" />
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Bemorlarning Umumiy Qarzi</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 text-2xl font-black text-rose-600 font-mono tracking-tight">
            {formatMoneyUzs(totalPendingDebt)}
          </div>
          <div className="mt-1.5 text-[11px] text-slate-500">
            Qisman toʻlangan muolajalar qoldigʻi
          </div>
        </div>

        <div className="relative overflow-hidden bg-white/80 backdrop-blur-xl p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div className="pointer-events-none absolute -right-6 -top-6 w-24 h-24 rounded-full bg-teal-400/15 blur-2xl" />
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Jami Koʻrsatilgan Xizmatlar</span>
            <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 text-2xl font-black text-slate-900 font-mono tracking-tight">
            {formatMoneyUzs(totalBilled)}
          </div>
          <div className="mt-1.5 text-[11px] text-slate-500">
            {invoices.length} ta hisob-faktura boʻyicha
          </div>
        </div>
      </div>

      {/* Invoices Glass Table */}
      <div className="bg-white/85 backdrop-blur-xl rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Hisob-Fakturalar Roʻyxati
            </h3>
            <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-mono">
              {filteredInvoices.length}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Bemor yoki hisob ID..."
                className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-100/80 border border-slate-200/80 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 focus:outline-none transition-all w-44 sm:w-52"
              />
            </div>

            {/* macOS Segmented Filter */}
            <div className="inline-flex p-1 rounded-xl bg-slate-200/70 text-[11px] font-bold">
              {[
                { id: 'all', label: 'Barchasi' },
                { id: 'debt', label: 'Qarzdorlar' },
                { id: 'paid', label: 'Toʻlangan' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id as 'all' | 'debt' | 'paid')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    statusFilter === tab.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 text-slate-500 font-semibold border-b border-slate-200/80 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Hisob ID</th>
                <th className="py-3 px-4">Bemor</th>
                <th className="py-3 px-4">Xizmatlar</th>
                <th className="py-3 px-4">Jami Narx</th>
                <th className="py-3 px-4">Toʻlangan</th>
                <th className="py-3 px-4">Qolgan Qarz</th>
                <th className="py-3 px-4">Holat</th>
                <th className="py-3 px-4 text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400 text-xs italic">
                    Qidiruv boʻyicha hisob-fakturalar topilmadi
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const isPaid = inv.debtAmount === 0;
                  return (
                    <tr key={inv.id} className="hover:bg-teal-50/30 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-teal-700">
                        {inv.id.toUpperCase().substring(0, 10)}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{inv.patientName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{inv.createdAt}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                        {inv.items.map((i) => i.serviceName).join(', ')}
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        <div className="font-bold text-slate-900">
                          {formatMoneyUzs(inv.totalAmount)}
                        </div>
                        {inv.discountAmount > 0 && (
                          <div className="text-[10px] text-amber-600 flex items-center gap-0.5">
                            <Tag className="w-2.5 h-2.5" /> -{formatMoneyUzs(inv.discountAmount)}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-emerald-600 font-semibold">
                        {formatMoneyUzs(inv.paidAmount)}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold">
                        {inv.debtAmount > 0 ? (
                          <span className="text-rose-600">{formatMoneyUzs(inv.debtAmount)}</span>
                        ) : (
                          <span className="text-slate-400 font-normal">0 soʻm</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isPaid
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : inv.paidAmount > 0
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {isPaid
                            ? 'Toʻliq toʻlangan'
                            : inv.paidAmount > 0
                            ? 'Qisman toʻlangan'
                            : 'Toʻlanmagan'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setReceiptInvoice(inv)}
                            title="Chekni koʻrish va chop etish"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {inv.debtAmount > 0 ? (
                            <button
                              type="button"
                              onClick={() => handleOpenPayment(inv)}
                              className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-xs transition-all active:scale-[0.97] cursor-pointer"
                            >
                              Toʻlov Qabul Qilish
                            </button>
                          ) : (
                            <span className="text-emerald-600 text-xs font-semibold flex items-center gap-1 pl-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Yopilgan
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* macOS Frosted Payment Accept Modal */}
      {selectedInvoiceForPay && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white/95 backdrop-blur-2xl rounded-3xl max-w-md w-full overflow-hidden border border-white/80 shadow-2xl">
            {/* macOS Window Titlebar */}
            <div className="px-5 py-3.5 bg-slate-100/80 border-b border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setSelectedInvoiceForPay(null)}
                  className="w-3 h-3 rounded-full bg-rose-500 hover:bg-rose-600 transition-colors cursor-pointer"
                  title="Yopish"
                />
                <span className="w-3 h-3 rounded-full bg-amber-400" />
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="ml-2 text-xs font-bold text-slate-800">
                  Kassa Toʻlovi Qabul Qilish
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInvoiceForPay(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitPayment} className="p-6 space-y-4">
              {payError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{payError}</span>
                </div>
              )}

              <div className="p-3.5 bg-slate-50/90 rounded-2xl border border-slate-200/80 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Bemor:</span>
                  <span className="font-bold text-slate-900">
                    {selectedInvoiceForPay.patientName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Jami hisob:</span>
                  <span className="font-mono font-semibold">
                    {formatMoneyUzs(selectedInvoiceForPay.totalAmount)}
                  </span>
                </div>
                {selectedInvoiceForPay.discountAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Chegirma:</span>
                    <span className="font-mono text-amber-600">
                      -{formatMoneyUzs(selectedInvoiceForPay.discountAmount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Ilgari toʻlangan:</span>
                  <span className="font-mono font-semibold text-emerald-600">
                    {formatMoneyUzs(selectedInvoiceForPay.paidAmount)}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-rose-600 pt-1.5 border-t border-slate-200">
                  <span>Hozirgi qarz:</span>
                  <span className="font-mono">
                    {formatMoneyUzs(selectedInvoiceForPay.debtAmount)}
                  </span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    Qabul Qilinayotgan Summa (UZS) *
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setPayAmount(Math.floor(selectedInvoiceForPay.debtAmount / 2));
                        setPayError(null);
                      }}
                      className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
                    >
                      50%
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPayAmount(selectedInvoiceForPay.debtAmount);
                        setPayError(null);
                      }}
                      className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-50 hover:bg-teal-100 text-teal-700 cursor-pointer"
                    >
                      100% Toʻliq
                    </button>
                  </div>
                </div>
                <input
                  type="number"
                  step="1000"
                  min="1000"
                  max={selectedInvoiceForPay.debtAmount}
                  value={payAmount}
                  onChange={(e) => {
                    setPayAmount(Number(e.target.value));
                    setPayError(null);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Toʻlov Usuli:
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {PAYMENT_METHODS.map((m) => {
                    const Icon = m.icon;
                    const isSelected = payMethod === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPayMethod(m.id)}
                        className={`p-2.5 rounded-xl border text-left flex items-center space-x-2 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-teal-500 bg-teal-50/90 text-teal-800 font-bold ring-1 ring-teal-500'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <Icon className="w-4 h-4 text-teal-600 shrink-0" />
                        <span className="truncate">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedInvoiceForPay(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-sm cursor-pointer"
                >
                  Chekni Tasdiqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* macOS Frosted New Invoice Modal */}
      {showNewInvoiceModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white/95 backdrop-blur-2xl rounded-3xl max-w-md w-full overflow-hidden border border-white/80 shadow-2xl">
            <div className="px-5 py-3.5 bg-slate-100/80 border-b border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowNewInvoiceModal(false)}
                  className="w-3 h-3 rounded-full bg-rose-500 hover:bg-rose-600 transition-colors cursor-pointer"
                />
                <span className="w-3 h-3 rounded-full bg-amber-400" />
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="ml-2 text-xs font-bold text-slate-800">
                  Yangi Hisob-Faktura Shakllantirish
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowNewInvoiceModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="p-6 space-y-3.5">
              {invError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{invError}</span>
                </div>
              )}

              {activeAppointments.length > 0 && (
                <div>
                  <label className="flex items-center gap-1 text-xs font-bold text-slate-700 mb-1">
                    <CalendarCheck2 className="w-3.5 h-3.5 text-teal-600" />
                    <span>Qabulga bogʻlash (ixtiyoriy):</span>
                  </label>
                  <select
                    value={selectedAppointmentId}
                    onChange={(e) => handleSelectAppointmentForInvoice(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50/70 text-xs focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 focus:outline-none"
                  >
                    <option value="">— Mustaqil hisob-faktura —</option>
                    {activeAppointments.map((app) => (
                      <option key={app.id} value={app.id}>
                        {app.patientName} — {app.serviceName} ({app.startTime})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Bemor:</label>
                <select
                  value={invPatientId}
                  onChange={(e) => setInvPatientId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 focus:outline-none"
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.fullName} ({p.phoneNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Xizmat yoki Muolaja Nomi:
                </label>
                <input
                  type="text"
                  required
                  value={invServiceName}
                  onChange={(e) => setInvServiceName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Jami (UZS):
                  </label>
                  <input
                    type="number"
                    step="10000"
                    min="0"
                    value={invTotalAmount}
                    onChange={(e) => {
                      setInvTotalAmount(Number(e.target.value));
                      setInvError(null);
                    }}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Chegirma:
                  </label>
                  <input
                    type="number"
                    step="10000"
                    min="0"
                    value={invDiscount}
                    onChange={(e) => {
                      setInvDiscount(Number(e.target.value));
                      setInvError(null);
                    }}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold text-amber-600 focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Avans (UZS):
                  </label>
                  <input
                    type="number"
                    step="10000"
                    min="0"
                    value={invInitialPayment}
                    onChange={(e) => {
                      setInvInitialPayment(Number(e.target.value));
                      setInvError(null);
                    }}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold text-emerald-600 focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="p-3 bg-amber-50/90 rounded-xl border border-amber-200/80 text-xs text-amber-950 flex items-center justify-between">
                <span className="font-semibold">Qarzdorlik qoldigʻi:</span>
                <span className="font-mono font-black text-amber-900">
                  {formatMoneyUzs(expectedDebt)}
                </span>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewInvoiceModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-sm cursor-pointer"
                >
                  Hisobni Rasmiylashtirish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Kassa Receipt Preview Modal */}
      {receiptInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 border border-slate-200 shadow-2xl space-y-4 font-mono text-xs">
            <div className="text-center border-b border-dashed border-slate-300 pb-3">
              <div className="inline-flex items-center gap-1 text-teal-600 font-sans font-extrabold text-sm">
                <Sparkles className="w-4 h-4" />
                <span>DentaCore Dental Clinic</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">Toshkent sh., Kassa Cheki</p>
              <p className="text-[10px] text-slate-400 mt-1">
                #{receiptInvoice.id.toUpperCase()} • {receiptInvoice.createdAt}
              </p>
            </div>

            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Bemor:</span>
                <span className="font-bold text-slate-900">{receiptInvoice.patientName}</span>
              </div>
            </div>

            <div className="border-y border-dashed border-slate-300 py-2.5 space-y-1.5">
              {receiptInvoice.items.map((item, idx) => (
                <div key={idx} className="flex justify-between gap-2 text-[11px]">
                  <span className="text-slate-700">
                    {item.serviceName} ×{item.quantity}
                  </span>
                  <span className="font-bold shrink-0">{formatMoneyUzs(item.unitPrice)}</span>
                </div>
              ))}
            </div>

            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Jami summa:</span>
                <span className="font-bold">{formatMoneyUzs(receiptInvoice.totalAmount)}</span>
              </div>
              {receiptInvoice.discountAmount > 0 && (
                <div className="flex justify-between text-amber-700">
                  <span>Chegirma:</span>
                  <span>-{formatMoneyUzs(receiptInvoice.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-emerald-700 font-bold">
                <span>Toʻlangan:</span>
                <span>{formatMoneyUzs(receiptInvoice.paidAmount)}</span>
              </div>
              <div className="flex justify-between text-rose-600 font-bold pt-1 border-t border-slate-200">
                <span>Qolgan qarz:</span>
                <span>{formatMoneyUzs(receiptInvoice.debtAmount)}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 font-sans">
              <button
                type="button"
                onClick={() => setReceiptInvoice(null)}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer"
              >
                Yopish
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Chop etish</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};