import React, { useState } from 'react';
import {
  Appointment,
  Doctor,
  ServiceItem,
  Patient,
  AppointmentStatus,
  UserRole,
} from '../../types/dentacore';
import { getTodayDateString, formatMoneyUzs } from '../../data/mockData';
import {
  Calendar,
  Clock,
  User,
  Plus,
  CheckCircle2,
  PlayCircle,
  XCircle,
  Filter,
  CalendarDays,
  Globe2,
  AlertCircle,
} from 'lucide-react';

interface CalendarGridProps {
  doctors: Doctor[];
  appointments: Appointment[];
  services: ServiceItem[];
  patients: Patient[];
  onStatusChange: (appointmentId: string, newStatus: AppointmentStatus) => void;
  onAddAppointment: (app: Appointment) => void;
  currentRole: UserRole;
  onTriggerSignalR: (
    title: string,
    message: string,
    severity: 'info' | 'success' | 'warning' | 'danger'
  ) => void;
}

const timeToMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const minutesToTime = (totalMinutes: number): string => {
  const h = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const m = String(totalMinutes % 60).padStart(2, '0');
  return `${h}:${m}`;
};

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  doctors,
  appointments,
  services,
  patients,
  onStatusChange,
  onAddAppointment,
  currentRole,
  onTriggerSignalR,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // New Appointment Modal State
  const [newDocId, setNewDocId] = useState<string>(doctors[0]?.id || '');
  const [newPatientId, setNewPatientId] = useState<string>(patients[0]?.id || '');
  const [newServiceId, setNewServiceId] = useState<string>(services[0]?.id || '');
  const [newStartTime, setNewStartTime] = useState<string>('12:00');
  const [newNotes, setNewNotes] = useState<string>('');

  const selectedService = services.find((s) => s.id === newServiceId) || services[0];

  const filteredDoctors =
    selectedDoctorFilter === 'all'
      ? doctors
      : doctors.filter((d) => d.id === selectedDoctorFilter);

  // Tanlangan sana haftaning qaysi kuni ekanligini aniqlash (0 = Yakshanba, 6 = Shanba)
  const [selYear, selMonth, selDay] = selectedDate.split('-').map(Number);
  const selectedDayOfWeek = new Date(selYear, selMonth - 1, selDay).getDay();

  const statusBadges: Record<
    AppointmentStatus,
    { label: string; bg: string; text: string; border: string }
  > = {
    Pending: { label: 'Kutmoqda', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    Confirmed: { label: 'Tasdiqlangan', bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
    InProgress: { label: 'Qabulda', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    Completed: { label: 'Yakunlandi', bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-300' },
    Cancelled: { label: 'Bekor qilindi', bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200' },
    NoShow: { label: 'Kelmadi', bg: 'bg-zinc-100', text: 'text-zinc-500', border: 'border-zinc-300' },
  };

  const handleOpenModal = () => {
    setFormError(null);
    setNewNotes('');
    if (!newDocId && doctors[0]) setNewDocId(doctors[0].id);
    if (!newPatientId && patients[0]) setNewPatientId(patients[0].id);
    if (!newServiceId && services[0]) setNewServiceId(services[0].id);
    setShowAddModal(true);
  };

  const handleCreateAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const doc = doctors.find((d) => d.id === newDocId) || doctors[0];
    const pat = patients.find((p) => p.id === newPatientId) || patients[0];
    const srv = services.find((s) => s.id === newServiceId) || services[0];

    if (!doc || !pat || !srv) {
      setFormError("Shifokor, bemor yoki xizmat ma'lumotlari topilmadi.");
      return;
    }

    // 1. Ish kunini tekshirish
    if (!doc.workingDays.includes(selectedDayOfWeek)) {
      setFormError(`${doc.fullName} tanlangan kunda ishlamaydi (Dam olish kuni).`);
      return;
    }

    // 2. Xizmat davomiyligi bo'yicha tugash vaqtini hisoblash
    const duration = srv.durationMinutes || 30;
    const newStartMin = timeToMinutes(newStartTime);
    const newEndMin = newStartMin + duration;
    const endTime = minutesToTime(newEndMin);

    const docStartMin = timeToMinutes(doc.startHour);
    const docEndMin = timeToMinutes(doc.endHour);
    const lunchStartMin = timeToMinutes(doc.lunchStart);
    const lunchEndMin = timeToMinutes(doc.lunchEnd);

    // 3. Ish soatlari chegarasini tekshirish
    if (newStartMin < docStartMin || newEndMin > docEndMin) {
      setFormError(
        `Qabul vaqti shifokor ish jadvalidan (${doc.startHour} - ${doc.endHour}) tashqarida.`
      );
      return;
    }

    // 4. Tushlik tanaffusi bilan kesishishni tekshirish
    if (newStartMin < lunchEndMin && newEndMin > lunchStartMin) {
      setFormError(
        `Tanlangan vaqt tushlik tanaffusiga (${doc.lunchStart} - ${doc.lunchEnd}) to'g'ri kelmoqda.`
      );
      return;
    }

    // 5. Mavjud qabullar bilan interval kesishishini tekshirish
    const conflictApp = appointments.find((a) => {
      if (
        a.doctorId !== doc.id ||
        a.date !== selectedDate ||
        a.status === 'Cancelled' ||
        a.status === 'NoShow'
      ) {
        return false;
      }
      const appStartMin = timeToMinutes(a.startTime);
      const appEndMin = timeToMinutes(a.endTime);
      return newStartMin < appEndMin && newEndMin > appStartMin;
    });

    if (conflictApp) {
      setFormError(
        `Vaqt band (409 Conflict): ${conflictApp.startTime}–${conflictApp.endTime} oralig'ida ${conflictApp.patientName} yozilgan.`
      );
      return;
    }

    const now = new Date();
    const formattedNow = `${getTodayDateString()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const created: Appointment = {
      id: `app-${Date.now()}`,
      doctorId: doc.id,
      doctorName: doc.fullName,
      patientId: pat.id,
      patientName: pat.fullName,
      patientPhone: pat.phoneNumber,
      serviceId: srv.id,
      serviceName: srv.name,
      date: selectedDate,
      startTime: newStartTime,
      endTime,
      status: 'Confirmed',
      source: 'CRM',
      notes: newNotes.trim(),
      bookingCode: `DC-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: formattedNow,
    };

    onAddAppointment(created);
    setNewNotes('');
    setShowAddModal(false);
    onTriggerSignalR(
      'Resepshn Qabul Yaratdi',
      `${pat.fullName} — ${doc.fullName} (${newStartTime} - ${endTime})`,
      'info'
    );
  };

  const canManageStatus = currentRole !== 'Patient';
  const canCreateAppointment = currentRole === 'SuperAdmin' || currentRole === 'Receptionist';

  return (
    <div className="space-y-6">
      {/* Control Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-slate-900">
                Shifokorlar Ish Jadvali & Navbat Grid
              </h2>
              <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Jonli Navbat (Live Queue)
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Shifokorlar boʻyicha ustunli kalendar va statuslarni 1-klik bilan oʻzgartirish
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Date Selector */}
          <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-slate-500">Sana:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
            />
          </div>

          {/* Doctor Filter */}
          <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={selectedDoctorFilter}
              onChange={(e) => setSelectedDoctorFilter(e.target.value)}
              className="bg-transparent font-medium text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="all">Barcha Shifokorlar</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.fullName}
                </option>
              ))}
            </select>
          </div>

          {canCreateAppointment && (
            <button
              onClick={handleOpenModal}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Yangi Qabul</span>
            </button>
          )}
        </div>
      </div>

      {/* Multi-Doctor Calendar Grid Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredDoctors.map((doc) => {
          const isWorkingToday = doc.workingDays.includes(selectedDayOfWeek);
          const docAppointments = appointments
            .filter((a) => a.doctorId === doc.id && a.date === selectedDate)
            .sort((a, b) => a.startTime.localeCompare(b.startTime));

          return (
            <div
              key={doc.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col"
            >
              {/* Doctor Header */}
              <div
                className="p-4 border-b border-slate-100 flex items-center justify-between"
                style={{ borderTop: `4px solid ${doc.colorCode}` }}
              >
                <div className="flex items-center space-x-3">
                  <img
                    src={doc.avatarUrl}
                    alt={doc.fullName}
                    className="w-10 h-10 rounded-full object-cover border border-slate-200"
                  />
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">{doc.fullName}</h3>
                    <p className="text-[11px] text-slate-500">{doc.specialty}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-mono text-slate-500 block">
                    {doc.startHour} - {doc.endHour}
                  </span>
                  {isWorkingToday ? (
                    <span className="text-[10px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">
                      {docAppointments.length} ta qabul
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">
                      Dam olish kuni
                    </span>
                  )}
                </div>
              </div>

              {/* Appointments List for Doctor */}
              <div className="p-3 space-y-2.5 flex-1 min-h-[350px] bg-slate-50/50">
                {docAppointments.length === 0 ? (
                  <div className="h-48 flex flex-col items-center justify-center text-slate-400 text-xs italic">
                    <span>
                      {isWorkingToday ? 'Ushbu kunga qabullar yoʻq' : 'Shifokor bugun ishlamaydi'}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1">
                      {isWorkingToday ? 'Barcha slotlar ochiq' : 'Jadval yopiq'}
                    </span>
                  </div>
                ) : (
                  docAppointments.map((app) => {
                    const badge = statusBadges[app.status];
                    return (
                      <div
                        key={app.id}
                        className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs hover:border-slate-300 transition-all space-y-2"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-1.5 font-mono font-bold text-slate-800">
                            <Clock className="w-3.5 h-3.5 text-teal-600" />
                            <span>
                              {app.startTime} - {app.endTime}
                            </span>
                          </div>

                          <div className="flex items-center space-x-1">
                            {app.source === 'Online' && (
                              <span
                                className="text-[9px] bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded font-semibold border border-teal-200 flex items-center gap-0.5"
                                title="Onlayn portaldan yozilgan"
                              >
                                <Globe2 className="w-2.5 h-2.5" /> Online
                              </span>
                            )}
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.bg} ${badge.text} ${badge.border}`}
                            >
                              {badge.label}
                            </span>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span>{app.patientName}</span>
                          </h4>
                          <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                            {app.patientPhone}
                          </p>
                          <p className="text-[11px] text-teal-700 font-medium mt-1 truncate">
                            {app.serviceName}
                          </p>
                          {app.notes && (
                            <p className="text-[10px] text-slate-500 italic mt-0.5 line-clamp-1">
                              "{app.notes}"
                            </p>
                          )}
                        </div>

                        {/* Status Action Buttons */}
                        {canManageStatus && (
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1 text-[10px]">
                            {app.status === 'Pending' && (
                              <button
                                onClick={() => onStatusChange(app.id, 'Confirmed')}
                                className="flex-1 py-1 rounded bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <CheckCircle2 className="w-3 h-3" /> Tasdiqlash
                              </button>
                            )}

                            {app.status === 'Confirmed' && (
                              <button
                                onClick={() => onStatusChange(app.id, 'InProgress')}
                                className="flex-1 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <PlayCircle className="w-3 h-3" /> Qabulga Kirdi
                              </button>
                            )}

                            {app.status === 'InProgress' && (
                              <button
                                onClick={() => onStatusChange(app.id, 'Completed')}
                                className="flex-1 py-1 rounded bg-teal-600 hover:bg-teal-700 text-white font-bold flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <CheckCircle2 className="w-3 h-3" /> Yakunlash & Kassa
                              </button>
                            )}

                            {app.status !== 'Completed' && app.status !== 'Cancelled' && (
                              <button
                                onClick={() => onStatusChange(app.id, 'Cancelled')}
                                className="px-2 py-1 rounded hover:bg-rose-50 text-rose-500 font-semibold cursor-pointer"
                                title="Bekor qilish"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            )}
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

      {/* Add Appointment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                Yangi Qabul Qoʻshish (Resepshn)
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs px-2 py-1 rounded cursor-pointer"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateAppointment} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Shifokor:</label>
                <select
                  value={newDocId}
                  onChange={(e) => {
                    setNewDocId(e.target.value);
                    setFormError(null);
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                >
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.fullName} ({d.specialty})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Bemor:</label>
                <select
                  value={newPatientId}
                  onChange={(e) => setNewPatientId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.fullName} ({p.phoneNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Xizmat:</label>
                <select
                  value={newServiceId}
                  onChange={(e) => {
                    setNewServiceId(e.target.value);
                    setFormError(null);
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.durationMinutes} daq) — {formatMoneyUzs(s.price)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Boshlanish Vaqti:
                  </label>
                  <input
                    type="time"
                    step="1800"
                    value={newStartTime}
                    onChange={(e) => {
                      setNewStartTime(e.target.value);
                      setFormError(null);
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Davomiyligi:
                  </label>
                  <input
                    type="text"
                    disabled
                    value={`${selectedService?.durationMinutes || 30} daqiqa`}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-100 text-xs text-slate-600 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Qoʻshimcha Izoh:
                </label>
                <textarea
                  rows={2}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Shikoyat yoki qabul maqsadi..."
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-xs cursor-pointer"
                >
                  Qabulni Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};