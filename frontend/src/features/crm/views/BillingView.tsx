import React, { useState } from 'react';
import {
  CircleDollarSign,
  CreditCard,
  Banknote,
  Receipt,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  ArrowUpRight,
  TrendingUp,
  X,
  Wallet,
} from 'lucide-react';
import { AppleKpiCard } from '../../../components/ui/AppleKpiCard';
import { AppleSegmentedControl } from '../../../components/ui/AppleSegmentedControl';
import { AppleModal } from '../../../components/ui/AppleModal';

export interface Invoice {
  id: string;
  appointmentId: string | null;
  patientId: string;
  patientName: string;
  receiptNumber: string;
  totalAmount: number;
  paidAmount: number;
  debtAmount: number;
  status: string;
  items: Array<{ serviceName: string; quantity: number; unitPrice: number }>;
  payments?: Array<{ amount: number; method: string; createdAt: string; referenceCode: string }>;
}

interface BillingViewProps {
  invoices: Invoice[];
  canEdit: boolean;
  onRecordPayment: (payment: {
    invoiceId: string;
    amount: number;
    method: string;
    referenceCode?: string;
  }) => Promise<boolean>;
  saving?: boolean;
}

const PAYMENT_METHODS = [
  { id: 'Naqd', label: 'Naqd pul', icon: Banknote },
  { id: 'Karta', label: 'Bank kartasi (Uzcard / Humo)', icon: CreditCard },
  { id: 'Click', label: 'Click', icon: Wallet },
  { id: 'Payme', label: 'Payme', icon: Wallet },
  { id: 'Uzum', label: 'Uzum Bank', icon: Wallet },
  { id: 'Bank o‘tkazmasi', label: 'Bank o‘tkazmasi', icon: Receipt },
];

function formatMoney(amount: number): string {
  return `${new Intl.NumberFormat('uz-UZ').format(amount)} so‘m`;
}

export const BillingView: React.FC<BillingViewProps> = ({
  invoices,
  canEdit,
  onRecordPayment,
  saving = false,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'unpaid' | 'paid'>('all');
  const [search, setSearch] = useState('');
  const [activePaymentModal, setActivePaymentModal] = useState<Invoice | null>(null);

  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Naqd');
  const [referenceCode, setReferenceCode] = useState('');

  // Financial Metrics
  const totalBilled = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
  const totalDebt = invoices.reduce((sum, inv) => sum + inv.debtAmount, 0);

  const unpaidInvoices = invoices.filter((inv) => inv.debtAmount > 0);
  const paidInvoices = invoices.filter((inv) => inv.debtAmount === 0);

  // Filtered invoices
  const displayedInvoices = invoices.filter((inv) => {
    if (filterMode === 'unpaid' && inv.debtAmount <= 0) return false;
    if (filterMode === 'paid' && inv.debtAmount > 0) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const patientMatch = inv.patientName.toLowerCase().includes(q);
      const receiptMatch = inv.receiptNumber.toLowerCase().includes(q);
      if (!patientMatch && !receiptMatch) return false;
    }

    return true;
  });

  const handleOpenPayment = (inv: Invoice) => {
    setActivePaymentModal(inv);
    setPaymentAmount(String(inv.debtAmount));
    setPaymentMethod('Naqd');
    setReferenceCode('');
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePaymentModal) return;

    const numAmount = Number(paymentAmount);
    if (numAmount <= 0 || numAmount > activePaymentModal.debtAmount) return;

    const ok = await onRecordPayment({
      invoiceId: activePaymentModal.id,
      amount: numAmount,
      method: paymentMethod,
      referenceCode: referenceCode.trim() || undefined,
    });

    if (ok) {
      setActivePaymentModal(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Bento Financial Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
        <AppleKpiCard
          label="Jami hisob-kitob"
          value={formatMoney(totalBilled)}
          subtext={`${invoices.length} ta umumiy hisob-faktura`}
          icon={<Receipt className="h-4 w-4" />}
          theme="teal"
        />
        <AppleKpiCard
          label="Qabul qilingan to‘lov"
          value={formatMoney(totalPaid)}
          subtext="Undirilgan jami mablag‘"
          icon={<CheckCircle2 className="h-4 w-4" />}
          theme="emerald"
        />
        <AppleKpiCard
          label="Qoldiq qarz summasi"
          value={formatMoney(totalDebt)}
          subtext={`${unpaidInvoices.length} ta to‘lanmagan hisob`}
          icon={<AlertCircle className="h-4 w-4" />}
          theme="rose"
        />
      </div>

      {/* 2. Controls & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 rounded-3xl border border-white/60 bg-white/70 p-3 sm:p-4 backdrop-blur-2xl shadow-2xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <AppleSegmentedControl
            size="sm"
            value={filterMode}
            onChange={(v) => setFilterMode(v as typeof filterMode)}
            options={[
              { id: 'all', label: 'Barchasi', badge: invoices.length },
              { id: 'unpaid', label: 'Qarzdorlik bor', badge: unpaidInvoices.length },
              { id: 'paid', label: 'To‘liq to‘langan', badge: paidInvoices.length },
            ]}
          />
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Chek yoki bemor bo‘yicha..."
            className="w-full rounded-2xl border border-slate-200/80 bg-white/80 pl-9 pr-8 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-teal-500 focus:outline-none shadow-2xs"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* 3. Invoices Table */}
      <div className="overflow-hidden rounded-3xl border border-white/60 bg-white/70 backdrop-blur-2xl shadow-2xs">
        {displayedInvoices.length === 0 ? (
          <div className="py-16 text-center space-y-3 px-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100/80 text-slate-400">
              <Receipt className="h-7 w-7" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              Hisob-fakturalar topilmadi
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Tanlangan filtr holatiga mos keladigan kassa hisoblari mavjud emas.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/70 bg-slate-50/50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-4 sm:px-5">Chek raqami</th>
                  <th className="py-3.5 px-4">Bemor</th>
                  <th className="py-3.5 px-4">Umumiy summa</th>
                  <th className="py-3.5 px-4">To‘langan</th>
                  <th className="py-3.5 px-4">Qoldiq qarz</th>
                  <th className="py-3.5 px-4">Holat</th>
                  <th className="py-3.5 px-4 text-right">Amal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {displayedInvoices.map((inv) => {
                  const isPaid = inv.debtAmount === 0;
                  const percentPaid =
                    inv.totalAmount > 0
                      ? Math.min(100, Math.round((inv.paidAmount / inv.totalAmount) * 100))
                      : 100;

                  return (
                    <tr
                      key={inv.id}
                      className="group transition-colors duration-150 hover:bg-white/80"
                    >
                      {/* Chek raqami */}
                      <td className="py-3.5 px-4 sm:px-5">
                        <span className="font-mono font-bold text-slate-900 block">
                          #{inv.receiptNumber}
                        </span>
                        {inv.items?.length > 0 && (
                          <span className="text-[10px] text-slate-400 block truncate max-w-[180px]">
                            {inv.items.map((i) => i.serviceName).join(', ')}
                          </span>
                        )}
                      </td>

                      {/* Bemor */}
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 block truncate">
                          {inv.patientName}
                        </span>
                      </td>

                      {/* Jami */}
                      <td className="py-3.5 px-4 font-bold text-slate-900 tabular-nums">
                        {formatMoney(inv.totalAmount)}
                      </td>

                      {/* To‘langan + Progress */}
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-emerald-700 tabular-nums block">
                          {formatMoney(inv.paidAmount)}
                        </span>
                        <div className="w-24 bg-slate-200/80 rounded-full h-1 mt-1 overflow-hidden">
                          <div
                            className="bg-emerald-500 h-1 rounded-full transition-all duration-300"
                            style={{ width: `${percentPaid}%` }}
                          />
                        </div>
                      </td>

                      {/* Qarz */}
                      <td className="py-3.5 px-4">
                        {inv.debtAmount > 0 ? (
                          <span className="font-extrabold text-rose-700 tabular-nums">
                            {formatMoney(inv.debtAmount)}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-semibold">–</span>
                        )}
                      </td>

                      {/* Holat */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                            isPaid
                              ? 'bg-emerald-500/10 text-emerald-800 border-emerald-200/80'
                              : inv.paidAmount > 0
                              ? 'bg-amber-500/10 text-amber-800 border-amber-200/80'
                              : 'bg-rose-500/10 text-rose-800 border-rose-200/80'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isPaid ? 'bg-emerald-500' : inv.paidAmount > 0 ? 'bg-amber-500' : 'bg-rose-500'
                            }`}
                          />
                          <span>
                            {isPaid ? 'To‘langan' : inv.paidAmount > 0 ? 'Qisman' : 'To‘lanmagan'}
                          </span>
                        </span>
                      </td>

                      {/* Amal */}
                      <td className="py-3.5 px-4 text-right">
                        {canEdit && inv.debtAmount > 0 ? (
                          <button
                            type="button"
                            onClick={() => handleOpenPayment(inv)}
                            className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white px-3 py-1 text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
                          >
                            <Banknote className="h-3.5 w-3.5" />
                            <span>To‘lov</span>
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-400 text-xs">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. Slide-Over Payment Modal */}
      <AppleModal
        isOpen={Boolean(activePaymentModal)}
        onClose={() => setActivePaymentModal(null)}
        title="To‘lov qabul qilish"
        subtitle={`Chek #${activePaymentModal?.receiptNumber} · ${activePaymentModal?.patientName}`}
        type="slide-over"
        maxWidth="md"
      >
        {activePaymentModal && (
          <form onSubmit={handlePaymentSubmit} className="space-y-4">
            {/* Debt Banner */}
            <div className="rounded-2xl border border-teal-200/80 bg-teal-50/70 p-4 space-y-1">
              <span className="text-[11px] font-bold text-teal-800 uppercase tracking-wider block">
                To‘lanishi kerak bo‘lgan qoldiq
              </span>
              <span className="text-2xl font-black text-slate-900 tabular-nums">
                {formatMoney(activePaymentModal.debtAmount)}
              </span>
            </div>

            {/* Quick Presets */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Tezkor summa tanlash
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentAmount(String(activePaymentModal.debtAmount))}
                  className="rounded-xl border border-slate-200 bg-white py-2 text-xs font-bold text-slate-800 hover:bg-slate-50 transition-colors"
                >
                  100% (To‘liq)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPaymentAmount(String(Math.round(activePaymentModal.debtAmount / 2)))
                  }
                  className="rounded-xl border border-slate-200 bg-white py-2 text-xs font-bold text-slate-800 hover:bg-slate-50 transition-colors"
                >
                  50%
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPaymentAmount(String(Math.round(activePaymentModal.debtAmount / 4)))
                  }
                  className="rounded-xl border border-slate-200 bg-white py-2 text-xs font-bold text-slate-800 hover:bg-slate-50 transition-colors"
                >
                  25%
                </button>
              </div>
            </div>

            {/* Custom Amount */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                To‘lov summasi (UZS) <span className="text-rose-500">*</span>
              </label>
              <input
                required
                type="number"
                min="1"
                max={activePaymentModal.debtAmount}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="w-full rounded-2xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm font-bold tabular-nums text-slate-900 focus:border-teal-500 focus:outline-none shadow-2xs"
              />
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                To‘lov usuli <span className="text-rose-500">*</span>
              </label>
              <div className="space-y-1.5">
                {PAYMENT_METHODS.map((m) => {
                  const Icon = m.icon;
                  const isSelected = paymentMethod === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id)}
                      className={`w-full flex items-center justify-between rounded-2xl border px-3.5 py-2.5 text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? 'border-teal-600 bg-teal-50/80 text-teal-900 shadow-2xs ring-1 ring-teal-600'
                          : 'border-slate-200/90 bg-white/80 hover:bg-white text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="h-4 w-4 text-slate-500" />
                        <span>{m.label}</span>
                      </div>
                      {isSelected && <CheckCircle2 className="h-4 w-4 text-teal-600" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Reference Code */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Tranzaksiya / Kvitansiya kodi (ixtiyoriy)
              </label>
              <input
                type="text"
                value={referenceCode}
                onChange={(e) => setReferenceCode(e.target.value)}
                placeholder="Terminal kodi yoki chek raqami"
                className="w-full rounded-2xl border border-slate-200/90 bg-white px-3.5 py-2 text-xs font-mono text-slate-900 focus:border-teal-500 focus:outline-none shadow-2xs"
              />
            </div>

            {/* Actions */}
            <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActivePaymentModal(null)}
                className="rounded-2xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Bekor qilish
              </button>
              <button
                type="submit"
                disabled={saving || !paymentAmount || Number(paymentAmount) <= 0}
                className="rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-700/20 hover:from-emerald-500 hover:to-teal-500 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
              >
                {saving ? 'Qayd etilmoqda...' : 'To‘lovni tasdiqlash'}
              </button>
            </div>
          </form>
        )}
      </AppleModal>
    </div>
  );
};
