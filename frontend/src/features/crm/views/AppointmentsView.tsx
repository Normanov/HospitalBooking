import React, { useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Search,
  Filter,
  User,
  Stethoscope,
  ChevronRight,
  Receipt,
  Phone,
  Tag,
  ArrowUpRight,
} from 'lucide-react';
import { AppointmentStatus } from '../../../types/dentacore';
import { AppleKpiCard } from '../../../components/ui/AppleKpiCard';
import { AppleSegmentedControl } from '../../../components/ui/AppleSegmentedControl';
import { AppleModal } from '../../../components/ui/AppleModal';
import { AppleSelect, SelectOption } from '../../../components/ui/AppleSelect';

export interface Doctor {
  id: string;
  fullName: string;
  specialty: string;
}

export interface Service {
  id: string;
  name: string;
  category: string;
  price: number;
  durationMinutes: number;
}

export interface Patient {
  id: string;
  fullName: string;
  phoneNumber: string | null;
  birthDate: string | null;
  gender: string;
  totalDebt: number;
}

export interface Appointment {
  id: string;
  doctorId: string;
  doctorName: string;
  patientId: string;
  patientName: string;
  patientPhone: string | null;
  serviceId: string | null;
  serviceName: string | null;
  date: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  bookingCode: string;
}

interface AppointmentsViewProps {
  appointments: Appointment[];
  doctors: Doctor[];
  patients: Patient[];
  services: Service[];
  selectedDate: string;
  onDateChange: (date: string) => void;
  canEdit: boolean;
  canCreateInvoice: boolean;
  onStatusChange: (appointment: Appointment, status: AppointmentStatus) => void;
  onCreateAppointment: (booking: {
    doctorId: string;
    patientId: string;
    serviceId: string;
    date: string;
    startTime: string;
    notes?: string;
  }) => Promise<boolean>;
  onCreateInvoice: (appointmentId: string) => Promise<boolean>;
  onNavigateToPatient?: (patientId: string) => void;
  saving?: boolean;
}

const STATUS_NAMES: Record<AppointmentStatus, string> = {
  Pending: 'Kutmoqda',
  Confirmed: 'Tasdiqlangan',
  InProgress: 'Qabulda',
  Completed: 'Yakunlandi',
  Cancelled: 'Bekor qilindi',
  NoShow: 'Kelmadi',
};

const STATUS_PILLS: Record<AppointmentStatus, { bg: string; text: string; dot: string }> = {
  Pending: { bg: 'bg-amber-500/10 border-amber-200/70', text: 'text-amber-700', dot: 'bg-amber-500' },
  Confirmed: { bg: 'bg-sky-500/10 border-sky-200/70', text: 'text-sky-700', dot: 'bg-sky-500' },
  InProgress: { bg: 'bg-teal-500/10 border-teal-200/70', text: 'text-teal-700', dot: 'bg-teal-500 animate-pulse' },
  Completed: { bg: 'bg-emerald-500/10 border-emerald-200/70', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  Cancelled: { bg: 'bg-rose-500/10 border-rose-200/70', text: 'text-rose-700', dot: 'bg-rose-500' },
  NoShow: { bg: 'bg-slate-500/10 border-slate-200/70', text: 'text-slate-600', dot: 'bg-slate-400' },
};

function formatMoney(amount: number): string {
  return `${new Intl.NumberFormat('uz-UZ').format(amount)} so‘m`;
}

export const AppointmentsView: React.FC<AppointmentsViewProps> = ({
  appointments,
  doctors,
  patients,
  services,
  selectedDate,
  onDateChange,
  canEdit,
  canCreateInvoice,
  onStatusChange,
  onCreateAppointment,
  onCreateInvoice,
  onNavigateToPatient,
  saving = false,
}) => {
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);

  // New Appointment Form State
  const [newBooking, setNewBooking] = useState({
    doctorId: '',
    patientId: '',
    serviceId: '',
    date: selectedDate,
    startTime: '09:00',
    notes: '',
  });

  // Calculate Metrics
  const completed = appointments.filter((a) => a.status === 'Completed').length;
  const inProgress = appointments.filter((a) => a.status === 'InProgress').length;
  const pending = appointments.filter((a) => a.status === 'Pending' || a.status === 'Confirmed').length;

  // Filtered Appointments
  const filteredAppointments = appointments.filter((app) => {
    if (filterStatus === 'pending' && !(app.status === 'Pending' || app.status === 'Confirmed')) return false;
    if (filterStatus === 'in_progress' && app.status !== 'InProgress') return false;
    if (filterStatus === 'completed' && app.status !== 'Completed') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const patientMatch = app.patientName.toLowerCase().includes(q);
      const doctorMatch = app.doctorName.toLowerCase().includes(q);
      const codeMatch = app.bookingCode.toLowerCase().includes(q);
      const serviceMatch = app.serviceName?.toLowerCase().includes(q);
      if (!patientMatch && !doctorMatch && !codeMatch && !serviceMatch) return false;
    }

    return true;
  });

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBooking.doctorId || !newBooking.patientId) return;
    const ok = await onCreateAppointment(newBooking);
    if (ok) {
      setIsAddDrawerOpen(false);
      setNewBooking({
        doctorId: '',
        patientId: '',
        serviceId: '',
        date: selectedDate,
        startTime: '09:00',
        notes: '',
      });
    }
  };

  // Convert for AppleSelect
  const doctorOptions: SelectOption[] = doctors.map((doc) => ({
    value: doc.id,
    label: doc.fullName,
    sublabel: doc.specialty,
    icon: <Stethoscope className="w-4 h-4 text-teal-600" />,
  }));

  const patientOptions: SelectOption[] = patients.map((pat) => ({
    value: pat.id,
    label: pat.fullName,
    sublabel: pat.phoneNumber || 'Telefon raqami ko‘rsatilmagan',
    badge: pat.totalDebt > 0 ? `Qarz: ${formatMoney(pat.totalDebt)}` : undefined,
    icon: <User className="w-4 h-4 text-slate-500" />,
  }));

  const serviceOptions: SelectOption[] = services.map((srv) => ({
    value: srv.id,
    label: srv.name,
    sublabel: `${srv.durationMinutes} daqiqa · ${formatMoney(srv.price)}`,
    icon: <Tag className="w-4 h-4 text-teal-500" />,
  }));

  return (
    <div className="space-y-6">
      {/* 1. Bento KPI Overview Cards (2x2 on mobile, 4-col on desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <AppleKpiCard
          label="Bugungi qabullar"
          value={appointments.length}
          subtext="Jadvaldagi jami qabullar"
          icon={<CalendarDays className="h-4 w-4" />}
          theme="teal"
        />
        <AppleKpiCard
          label="Qabulda"
          value={inProgress}
          subtext="Muolaja jarayonida"
          icon={<Clock className="h-4 w-4" />}
          theme="amber"
        />
        <AppleKpiCard
          label="Yakunlangan"
          value={completed}
          subtext="Muvaffaqiyatli yakunlandi"
          icon={<CheckCircle2 className="h-4 w-4" />}
          theme="emerald"
        />
        <AppleKpiCard
          label="Kutilmoqda"
          value={pending}
          subtext="Kutish zalida / Tasdiqlangan"
          icon={<AlertCircle className="h-4 w-4" />}
          theme="violet"
        />
      </div>

      {/* 2. Control Bar: Date Selector, Status Filter, Search & Primary Add Button */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 rounded-3xl border border-white/60 bg-white/70 p-3 sm:p-4 backdrop-blur-2xl shadow-2xs">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Apple-style Date Pill */}
          <div className="inline-flex items-center gap-2 rounded-2xl bg-white/90 border border-slate-200/80 px-3.5 py-1.5 shadow-2xs">
            <CalendarDays className="h-4 w-4 text-teal-600 shrink-0" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                onDateChange(e.target.value);
                setNewBooking((prev) => ({ ...prev, date: e.target.value }));
              }}
              className="text-xs font-bold text-slate-800 focus:outline-none bg-transparent cursor-pointer"
            />
          </div>

          {/* Segmented Filter Control */}
          <div className="w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <AppleSegmentedControl
              size="sm"
              value={filterStatus}
              onChange={(v) => setFilterStatus(v as typeof filterStatus)}
              options={[
                { id: 'all', label: 'Barchasi', badge: appointments.length },
                { id: 'pending', label: 'Kutilmoqda', badge: pending },
                { id: 'in_progress', label: 'Qabulda', badge: inProgress },
                { id: 'completed', label: 'Yakunlandi', badge: completed },
              ]}
            />
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1 sm:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Bemor yoki shifokor..."
              className="w-full rounded-2xl border border-slate-200/80 bg-white/80 pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-teal-500 focus:outline-none shadow-2xs"
            />
          </div>

          {/* Primary + Yangi Qabul Button */}
          {canEdit && (
            <button
              type="button"
              onClick={() => setIsAddDrawerOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-teal-600 via-teal-500 to-cyan-500 px-4 py-2 text-xs font-bold text-white shadow-md shadow-teal-700/20 hover:from-teal-500 hover:to-cyan-400 active:scale-95 transition-all duration-200 cursor-pointer shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span>Yangi qabul</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Appointments Presentation (Sleek Apple Glass Cards / Table) */}
      <div className="overflow-hidden rounded-3xl border border-white/60 bg-white/70 backdrop-blur-2xl shadow-2xs">
        {filteredAppointments.length === 0 ? (
          <div className="py-16 text-center space-y-3 px-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100/80 text-slate-400">
              <CalendarDays className="h-7 w-7" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              Qabullar mavjud emas
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Tanlangan sana yoki parametrlar bo‘yicha qabullar topilmadi. Yangi qabul qo‘shish uchun yuqoridagi tugmadan foydalaning.
            </p>
            {canEdit && (
              <button
                type="button"
                onClick={() => setIsAddDrawerOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-3.5 py-1.5 text-xs font-bold text-teal-700 hover:bg-teal-100 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Qabul qo‘shish</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/70 bg-slate-50/50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-4 sm:px-5">Vaqt & Kod</th>
                  <th className="py-3.5 px-4">Bemor</th>
                  <th className="py-3.5 px-4">Shifokor</th>
                  <th className="py-3.5 px-4">Xizmat</th>
                  <th className="py-3.5 px-4">Holat</th>
                  <th className="py-3.5 px-4 text-right">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredAppointments.map((app) => {
                  const pill = STATUS_PILLS[app.status] ?? STATUS_PILLS.Pending;
                  return (
                    <tr
                      key={app.id}
                      className="group transition-colors duration-150 hover:bg-white/80"
                    >
                      {/* Vaqt & Kod */}
                      <td className="py-3.5 px-4 sm:px-5">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900 tabular-nums text-sm">
                            {app.startTime.slice(0, 5)}
                          </span>
                          <span className="text-[10px] text-slate-400 tabular-nums">
                            – {app.endTime.slice(0, 5)}
                          </span>
                        </div>
                        <span className="inline-block mt-0.5 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-slate-500">
                          #{app.bookingCode}
                        </span>
                      </td>

                      {/* Bemor */}
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => onNavigateToPatient?.(app.patientId)}
                          className="text-left group/patient cursor-pointer"
                        >
                          <span className="font-bold text-slate-900 group-hover/patient:text-teal-700 transition-colors block">
                            {app.patientName}
                          </span>
                          {app.patientPhone ? (
                            <span className="text-[11px] text-slate-500 flex items-center gap-1">
                              <Phone className="h-3 w-3 text-slate-400" />
                              {app.patientPhone}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Telefon kiritilmagan</span>
                          )}
                        </button>
                      </td>

                      {/* Shifokor */}
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800 block">
                          {app.doctorName}
                        </span>
                      </td>

                      {/* Xizmat */}
                      <td className="py-3.5 px-4">
                        <span className="text-slate-700 font-medium block">
                          {app.serviceName || 'Umumiy konsultatsiya'}
                        </span>
                      </td>

                      {/* Holat */}
                      <td className="py-3.5 px-4">
                        <div className="relative inline-block">
                          {canEdit ? (
                            <select
                              value={app.status}
                              onChange={(e) =>
                                onStatusChange(app, e.target.value as AppointmentStatus)
                              }
                              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500/20 ${pill.bg} ${pill.text}`}
                            >
                              <option value="Pending">Kutmoqda</option>
                              <option value="Confirmed">Tasdiqlangan</option>
                              <option value="InProgress">Qabulda</option>
                              <option value="Completed">Yakunlandi</option>
                              <option value="Cancelled">Bekor qilindi</option>
                              <option value="NoShow">Kelmadi</option>
                            </select>
                          ) : (
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold ${pill.bg} ${pill.text}`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${pill.dot}`} />
                              <span>{STATUS_NAMES[app.status]}</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Amallar */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {canCreateInvoice && (
                            <button
                              type="button"
                              onClick={() => onCreateInvoice(app.id)}
                              disabled={saving}
                              title="Hisob ochish"
                              className="inline-flex items-center gap-1 rounded-xl border border-teal-200/80 bg-teal-50/70 hover:bg-teal-100 px-2.5 py-1 text-[11px] font-bold text-teal-800 transition-colors cursor-pointer active:scale-95"
                            >
                              <Receipt className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Hisob</span>
                            </button>
                          )}

                          {onNavigateToPatient && (
                            <button
                              type="button"
                              onClick={() => onNavigateToPatient(app.patientId)}
                              title="Bemor kartasini ochish"
                              className="rounded-xl p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          )}
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

      {/* 4. Slide-Over Apple Drawer: Yangi Qabul Qo‘shish */}
      <AppleModal
        isOpen={isAddDrawerOpen}
        onClose={() => setIsAddDrawerOpen(false)}
        title="Yangi qabul rejalashtirish"
        subtitle="Shifokor va bemor uchun yangi vaqt ajratish"
        type="slide-over"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <AppleSelect
            label="Shifokor"
            required
            searchable
            placeholder="Shifokorni tanlang..."
            value={newBooking.doctorId}
            onChange={(v) => setNewBooking({ ...newBooking, doctorId: v })}
            options={doctorOptions}
          />

          <AppleSelect
            label="Bemor"
            required
            searchable
            placeholder="Bemorni tanlang..."
            value={newBooking.patientId}
            onChange={(v) => setNewBooking({ ...newBooking, patientId: v })}
            options={patientOptions}
          />

          <AppleSelect
            label="Xizmat turi"
            searchable
            placeholder="Xizmatni tanlang..."
            value={newBooking.serviceId}
            onChange={(v) => setNewBooking({ ...newBooking, serviceId: v })}
            options={serviceOptions}
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Sana <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={newBooking.date}
                onChange={(e) => setNewBooking({ ...newBooking, date: e.target.value })}
                className="w-full rounded-2xl border border-slate-200/90 bg-white/80 px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:border-teal-500 focus:bg-white focus:outline-none shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Boshlanish vaqti <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="time"
                  required
                  step="1800"
                  value={newBooking.startTime}
                  onChange={(e) => setNewBooking({ ...newBooking, startTime: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200/90 bg-white/80 px-3.5 py-2.5 tabular-nums text-xs font-bold text-slate-900 focus:border-teal-500 focus:bg-white focus:outline-none shadow-2xs"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Qo‘shimcha izoh
            </label>
            <textarea
              rows={3}
              value={newBooking.notes}
              onChange={(e) => setNewBooking({ ...newBooking, notes: e.target.value })}
              placeholder="Shikoyat, oldingi davolash yoki maxsus ko‘rsatmalar..."
              className="w-full rounded-2xl border border-slate-200/90 bg-white/80 p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none shadow-2xs"
            />
          </div>

          <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddDrawerOpen(false)}
              className="rounded-2xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              disabled={saving || !newBooking.doctorId || !newBooking.patientId}
              className="rounded-2xl bg-gradient-to-r from-teal-600 to-cyan-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-teal-700/20 hover:from-teal-500 hover:to-cyan-500 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
            >
              {saving ? 'Saqlanmoqda...' : 'Qabulni saqlash'}
            </button>
          </div>
        </form>
      </AppleModal>
    </div>
  );
};
