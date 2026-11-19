import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Phone,
  Calendar,
  AlertCircle,
  Smile,
  ChevronRight,
  Plus,
  CreditCard,
  UserCheck,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import { AppleKpiCard } from '../../../components/ui/AppleKpiCard';
import { AppleSegmentedControl } from '../../../components/ui/AppleSegmentedControl';
import { AppleModal } from '../../../components/ui/AppleModal';

export interface Patient {
  id: string;
  fullName: string;
  phoneNumber: string | null;
  birthDate: string | null;
  gender: string;
  totalDebt: number;
}

interface PatientsViewProps {
  patients: Patient[];
  search: string;
  onSearchChange: (search: string) => void;
  canEdit: boolean;
  onCreatePatient: (patient: {
    fullName: string;
    phoneNumber: string;
    gender: 'Erkak' | 'Ayol';
    birthDate?: string;
    notes?: string;
  }) => Promise<boolean>;
  onSelectForOdontogram: (patientId: string) => void;
  onBookForPatient: (patientId: string) => void;
  saving?: boolean;
}

function formatMoney(amount: number): string {
  return `${new Intl.NumberFormat('uz-UZ').format(amount)} so‘m`;
}

export const PatientsView: React.FC<PatientsViewProps> = ({
  patients,
  search,
  onSearchChange,
  canEdit,
  onCreatePatient,
  onSelectForOdontogram,
  onBookForPatient,
  saving = false,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'with_debt'>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [newPatient, setNewPatient] = useState({
    fullName: '',
    phoneNumber: '+998',
    gender: 'Erkak' as 'Erkak' | 'Ayol',
    birthDate: '',
    notes: '',
  });

  const patientsWithDebt = patients.filter((p) => p.totalDebt > 0);
  const totalDebtSum = patientsWithDebt.reduce((sum, p) => sum + p.totalDebt, 0);

  const displayedPatients = patients.filter((p) => {
    if (filterMode === 'with_debt' && p.totalDebt <= 0) return false;
    return true;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatient.fullName.trim() || !newPatient.phoneNumber.trim()) return;

    const ok = await onCreatePatient(newPatient);
    if (ok) {
      setIsAddModalOpen(false);
      setNewPatient({
        fullName: '',
        phoneNumber: '+998',
        gender: 'Erkak',
        birthDate: '',
        notes: '',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Bento KPI Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
        <AppleKpiCard
          label="Jami bemorlar"
          value={patients.length}
          subtext="Ro‘yxatdan o‘tgan bemorlar"
          icon={<Users className="h-4 w-4" />}
          theme="teal"
        />
        <AppleKpiCard
          label="Qarzdor bemorlar"
          value={patientsWithDebt.length}
          subtext="To‘lanmagan xizmatlar"
          icon={<AlertCircle className="h-4 w-4" />}
          theme="rose"
        />
        <AppleKpiCard
          label="Umumiy qarz summasi"
          value={formatMoney(totalDebtSum)}
          subtext="Undirilishi kutilayotgan"
          icon={<CreditCard className="h-4 w-4" />}
          theme="amber"
          className="col-span-2 lg:col-span-1"
        />
      </div>

      {/* 2. Controls & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 rounded-3xl border border-white/60 bg-white/70 p-3 sm:p-4 backdrop-blur-2xl shadow-2xs">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Ism yoki telefon raqami bo‘yicha..."
              className="w-full rounded-2xl border border-slate-200/80 bg-white/80 pl-9 pr-8 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-teal-500 focus:outline-none shadow-2xs"
            />
            {search && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Segmented Filter */}
          <AppleSegmentedControl
            size="sm"
            value={filterMode}
            onChange={(v) => setFilterMode(v as typeof filterMode)}
            options={[
              { id: 'all', label: 'Barchasi', badge: patients.length },
              { id: 'with_debt', label: 'Qarzdorlar', badge: patientsWithDebt.length },
            ]}
          />
        </div>

        {/* Primary + Bemor Qo‘shish */}
        {canEdit && (
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-r from-teal-600 via-teal-500 to-cyan-500 px-4 py-2 text-xs font-bold text-white shadow-md shadow-teal-700/20 hover:from-teal-500 hover:to-cyan-400 active:scale-95 transition-all duration-200 cursor-pointer shrink-0"
          >
            <UserPlus className="h-4 w-4" />
            <span>Yangi bemor</span>
          </button>
        )}
      </div>

      {/* 3. Patients Table */}
      <div className="overflow-hidden rounded-3xl border border-white/60 bg-white/70 backdrop-blur-2xl shadow-2xs">
        {displayedPatients.length === 0 ? (
          <div className="py-16 text-center space-y-3 px-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100/80 text-slate-400">
              <Users className="h-7 w-7" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              Bemorlar topilmadi
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Qidiruv so‘rovingiz yoki filtrlarga mos keluvchi bemorlar bazada mavjud emas.
            </p>
            {canEdit && (
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-3.5 py-1.5 text-xs font-bold text-teal-700 hover:bg-teal-100 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Yangi bemor qo‘shish</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/70 bg-slate-50/50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-4 sm:px-5">Bemor</th>
                  <th className="py-3.5 px-4">Telefon</th>
                  <th className="py-3.5 px-4">Jinsi</th>
                  <th className="py-3.5 px-4">Qarz holati</th>
                  <th className="py-3.5 px-4 text-right">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {displayedPatients.map((patient) => {
                  const hasDebt = patient.totalDebt > 0;
                  const initials = patient.fullName
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();

                  return (
                    <tr
                      key={patient.id}
                      className="group transition-colors duration-150 hover:bg-white/80"
                    >
                      {/* Bemor Avatar + Ism */}
                      <td className="py-3.5 px-4 sm:px-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-teal-500/15 to-cyan-500/15 border border-teal-200/60 text-teal-800 font-extrabold text-xs shadow-2xs">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900 block truncate">
                              {patient.fullName}
                            </span>
                            {patient.birthDate && (
                              <span className="text-[11px] text-slate-400">
                                {patient.birthDate}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Telefon */}
                      <td className="py-3.5 px-4">
                        {patient.phoneNumber ? (
                          <span className="font-mono text-slate-700 flex items-center gap-1.5 font-medium">
                            <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                            {patient.phoneNumber}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">Yashiringan</span>
                        )}
                      </td>

                      {/* Jinsi */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${
                            patient.gender === 'Ayol'
                              ? 'bg-pink-500/10 text-pink-700 border-pink-200/60'
                              : 'bg-sky-500/10 text-sky-700 border-sky-200/60'
                          }`}
                        >
                          {patient.gender}
                        </span>
                      </td>

                      {/* Qarz holati */}
                      <td className="py-3.5 px-4">
                        {hasDebt ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 border border-rose-200/70 px-2.5 py-0.5 text-xs font-bold text-rose-700 tabular-nums">
                            <AlertCircle className="h-3 w-3 shrink-0" />
                            <span>{formatMoney(patient.totalDebt)}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                            <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                            <span>Qarz yo‘q</span>
                          </span>
                        )}
                      </td>

                      {/* Amallar */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onSelectForOdontogram(patient.id)}
                            title="Tibbiy karta & Odontogramma"
                            className="inline-flex items-center gap-1 rounded-xl border border-teal-200/80 bg-teal-50/70 hover:bg-teal-100 px-2.5 py-1 text-[11px] font-bold text-teal-800 transition-colors cursor-pointer active:scale-95"
                          >
                            <Smile className="h-3.5 w-3.5 text-teal-600" />
                            <span className="hidden sm:inline">Tibbiy karta</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onBookForPatient(patient.id)}
                            title="Qabulga yozish"
                            className="inline-flex items-center gap-1 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-700 transition-colors cursor-pointer active:scale-95"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Qabul</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. Slide-Over Modal: Yangi Bemor Ro‘yxatga Olish */}
      <AppleModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Yangi bemor ro‘yxatga olish"
        subtitle="Bemorning asosiy shaxsiy ma’lumotlarini kiritish"
        type="slide-over"
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              To‘liq F.I.Sh. <span className="text-rose-500">*</span>
            </label>
            <input
              required
              maxLength={160}
              value={newPatient.fullName}
              onChange={(e) => setNewPatient({ ...newPatient, fullName: e.target.value })}
              placeholder="Masalan, Aliyev Vali Karim o‘g‘li"
              className="w-full rounded-2xl border border-slate-200/90 bg-white/80 px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none shadow-2xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Telefon raqami <span className="text-rose-500">*</span>
            </label>
            <input
              required
              type="tel"
              maxLength={32}
              value={newPatient.phoneNumber}
              onChange={(e) => setNewPatient({ ...newPatient, phoneNumber: e.target.value })}
              placeholder="+998 90 123 45 67"
              className="w-full rounded-2xl border border-slate-200/90 bg-white/80 px-3.5 py-2.5 text-xs font-mono text-slate-900 focus:border-teal-500 focus:bg-white focus:outline-none shadow-2xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Jinsi
            </label>
            <AppleSegmentedControl
              value={newPatient.gender}
              onChange={(v) => setNewPatient({ ...newPatient, gender: v as 'Erkak' | 'Ayol' })}
              options={[
                { id: 'Erkak', label: 'Erkak' },
                { id: 'Ayol', label: 'Ayol' },
              ]}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Tug‘ilgan sana
            </label>
            <input
              type="date"
              value={newPatient.birthDate}
              onChange={(e) => setNewPatient({ ...newPatient, birthDate: e.target.value })}
              className="w-full rounded-2xl border border-slate-200/90 bg-white/80 px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:border-teal-500 focus:bg-white focus:outline-none shadow-2xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Qo‘shimcha eslatma
            </label>
            <textarea
              rows={3}
              maxLength={2000}
              value={newPatient.notes}
              onChange={(e) => setNewPatient({ ...newPatient, notes: e.target.value })}
              placeholder="Allergiya, surunkali kasalliklar yoki boshqa ma’lumotlar..."
              className="w-full rounded-2xl border border-slate-200/90 bg-white/80 p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none shadow-2xs"
            />
          </div>

          <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="rounded-2xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              disabled={saving || !newPatient.fullName.trim() || !newPatient.phoneNumber.trim()}
              className="rounded-2xl bg-gradient-to-r from-teal-600 to-cyan-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-teal-700/20 hover:from-teal-500 hover:to-cyan-500 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
            >
              {saving ? 'Saqlanmoqda...' : 'Bemorni ro‘yxatga olish'}
            </button>
          </div>
        </form>
      </AppleModal>
    </div>
  );
};
