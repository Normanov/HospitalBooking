import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { motion, AnimatePresence } from 'motion/react';
import {
  CalendarDays,
  Users,
  Smile,
  CircleDollarSign,
  ShieldCheck,
  Stethoscope,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  LogOut,
  AlertCircle,
  X,
  LoaderCircle,
  Sparkles,
} from 'lucide-react';
import { MagnificationDock } from '../../components/ui/MagnificationDock';
import {
  apiRequest,
  getFreshAccessTokenForSignalR,
  getApiUrl,
} from '../../lib/api';
import { AppointmentStatus, UserRole } from '../../types/dentacore';

import {
  AppointmentsView,
  Appointment,
  Doctor,
  Service,
  Patient,
} from './views/AppointmentsView';
import { PatientsView } from './views/PatientsView';
import {
  ClinicalOdontogramView,
  ToothRecord,
} from './views/ClinicalOdontogramView';
import { BillingView, Invoice } from './views/BillingView';
import {
  DoctorCompensationView,
  DoctorCompensation,
} from './views/DoctorCompensationView';
import {
  AdminView,
  AdminStaff,
  StaffMember,
  AuditEntry,
  RevenueReport,
} from './views/AdminView';

interface LiveStaffCRMProps {
  role: Exclude<UserRole, 'Patient'>;
  fullName: string;
  onNotify: (
    title: string,
    message: string,
    severity: 'info' | 'success' | 'warning' | 'danger'
  ) => void;
  onLogout?: () => void;
}

const ROLE_LABELS: Record<Exclude<UserRole, 'Patient'>, string> = {
  SuperAdmin: 'Super Admin',
  Doctor: 'Shifokor',
  Receptionist: 'Administrator',
};

function localDate(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}

function dateString(date: Date): string {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}

export const LiveStaffCRM: React.FC<LiveStaffCRMProps> = ({
  role,
  fullName,
  onNotify,
  onLogout,
}) => {
  // Backend State
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [adminStaff, setAdminStaff] = useState<AdminStaff[]>([]);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [myPermissions, setMyPermissions] = useState<Record<string, boolean>>({});
  const [compensation, setCompensation] = useState<DoctorCompensation | null>(null);
  const [report, setReport] = useState<RevenueReport | null>(null);

  // Active View Tab
  const [activeTab, setActiveTab] = useState('calendar');

  // Clinical Odontogram State
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [teeth, setTeeth] = useState<ToothRecord[]>([]);
  const [selectedTooth, setSelectedTooth] = useState(11);

  // UI State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Filters & Search
  const [selectedDate, setSelectedDate] = useState(localDate());
  const [patientSearch, setPatientSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(patientSearch), 300);
    return () => window.clearTimeout(timer);
  }, [patientSearch]);

  const can = useCallback(
    (module: string, action: string) => {
      if (role === 'SuperAdmin') return true;
      return Boolean(myPermissions[`${module}.${action}`]);
    },
    [myPermissions, role]
  );

  // Load All CRM Data
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const today = localDate();
    const anchor = new Date(`${selectedDate || today}T12:00:00`);
    const start = new Date(anchor);
    start.setDate(start.getDate() - 30);
    const end = new Date(anchor);
    end.setDate(end.getDate() + 60);

    try {
      const currentPermissions = await apiRequest<Record<string, boolean>>(
        '/api/v1/crm/me/permissions'
      );
      setMyPermissions(currentPermissions);

      const [doctorRows, serviceRows, appointmentRows, patientRows, invoiceRows] =
        await Promise.all([
          apiRequest<Doctor[]>('/api/v1/public/doctors'),
          apiRequest<Service[]>('/api/v1/public/services'),
          currentPermissions['Calendar.View'] || role === 'SuperAdmin'
            ? apiRequest<Appointment[]>(
                `/api/v1/crm/appointments?from=${dateString(start)}&to=${dateString(end)}`
              )
            : Promise.resolve([] as Appointment[]),
          currentPermissions['PatientsDb.View'] || role === 'SuperAdmin'
            ? apiRequest<Patient[]>(
                `/api/v1/crm/patients?search=${encodeURIComponent(debouncedSearch)}`
              )
            : Promise.resolve([] as Patient[]),
          (currentPermissions['Billing.View'] || role === 'SuperAdmin') && role !== 'Doctor'
            ? apiRequest<Invoice[]>('/api/v1/crm/invoices')
            : Promise.resolve([] as Invoice[]),
        ]);

      setDoctors(doctorRows);
      setServices(serviceRows);
      setAppointments(appointmentRows);
      setPatients(patientRows);
      setInvoices(invoiceRows);

      if (role === 'Doctor' && currentPermissions['Billing.View']) {
        setCompensation(
          await apiRequest<DoctorCompensation>('/api/v1/crm/me/compensation')
        );
      } else {
        setCompensation(null);
      }

      if (role === 'SuperAdmin') {
        const [staffRows, revenue, people, audit] = await Promise.all([
          apiRequest<StaffMember[]>('/api/v1/admin/permissions'),
          apiRequest<RevenueReport>(`/api/v1/admin/reports/revenue?date=${today}`),
          apiRequest<AdminStaff[]>('/api/v1/admin/staff'),
          apiRequest<AuditEntry[]>('/api/v1/admin/audit'),
        ]);
        setStaff(staffRows);
        setReport(revenue);
        setAdminStaff(people);
        setAuditEntries(audit);
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Ma’lumotlarni yuklab bo‘lmadi.'
      );
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, role, selectedDate]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Load Patient Odontogram on patient change
  useEffect(() => {
    if (!selectedPatientId) {
      setTeeth([]);
      return;
    }
    apiRequest<ToothRecord[]>(`/api/v1/crm/patients/${selectedPatientId}/odontogram`)
      .then((records) => setTeeth(records))
      .catch(() => setTeeth([]));
  }, [selectedPatientId]);

  // Real-Time SignalR Hub Connection
  const onNotifyRef = useRef(onNotify);
  onNotifyRef.current = onNotify;

  useEffect(() => {
    let isDisposed = false;
    const connection = new HubConnectionBuilder()
      .withUrl(getApiUrl('/hubs/clinic'), {
        accessTokenFactory: getFreshAccessTokenForSignalR,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 20000])
      .configureLogging(LogLevel.None)
      .build();

    connection.on('AppointmentChanged', (event: { appointmentId: string; status: string }) => {
      onNotifyRef.current(
        'Qabul yangilandi',
        `Qabul holati yangilandi (${event.status}).`,
        'info'
      );
      void loadData();
    });

    connection.on('BillingChanged', () => {
      onNotifyRef.current(
        'Kassa yangilandi',
        'Yangi to‘lov qayd etildi.',
        'success'
      );
      void loadData();
    });

    connection
      .start()
      .then(() => {
        if (!isDisposed) setIsLiveConnected(true);
      })
      .catch(() => {
        if (!isDisposed) setIsLiveConnected(false);
      });

    connection.onreconnected(() => {
      if (!isDisposed) {
        setIsLiveConnected(true);
        void loadData();
      }
    });

    connection.onclose(() => {
      if (!isDisposed) setIsLiveConnected(false);
    });

    return () => {
      isDisposed = true;
      void connection.stop();
    };
  }, [loadData]);

  // Generic Submit Wrapper
  const submit = async (action: () => Promise<unknown>, successMsg: string) => {
    setSaving(true);
    setError(null);
    try {
      await action();
      onNotify('Muvaffaqiyatli', successMsg, 'success');
      await loadData();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Amalni bajarib bo‘lmadi.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Backend Action Handlers
  const handleAppointmentStatusChange = (
    item: Appointment,
    status: AppointmentStatus
  ) => {
    return submit(
      () =>
        apiRequest(`/api/v1/crm/appointments/${item.id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        }),
      'Qabul holati o‘zgartirildi.'
    );
  };

  const handleCreateAppointment = (booking: {
    doctorId: string;
    patientId: string;
    serviceId: string;
    date: string;
    startTime: string;
    notes?: string;
  }) => {
    return submit(
      () =>
        apiRequest('/api/v1/crm/appointments', {
          method: 'POST',
          body: JSON.stringify(booking),
        }),
      'Yangi qabul muvaffaqiyatli yaratildi.'
    );
  };

  const handleCreateInvoice = (appointmentId: string) => {
    return submit(
      () =>
        apiRequest(`/api/v1/crm/appointments/${appointmentId}/invoice`, {
          method: 'POST',
        }),
      'Hisob-faktura yaratildi.'
    );
  };

  const handleCreatePatient = (newPatient: {
    fullName: string;
    phoneNumber: string;
    gender: 'Erkak' | 'Ayol';
    birthDate?: string;
    notes?: string;
  }) => {
    return submit(
      () =>
        apiRequest('/api/v1/crm/patients', {
          method: 'POST',
          body: JSON.stringify(newPatient),
        }),
      'Yangi bemor ro‘yxatga olindi.'
    );
  };

  const handleSaveTooth = async (toothData: {
    toothNumber: number;
    condition: string;
    surfaces: string[];
    diagnosis?: string;
    treatmentPlan?: string;
    cost: number;
  }) => {
    const ok = await submit(
      () =>
        apiRequest(`/api/v1/crm/patients/${selectedPatientId}/odontogram`, {
          method: 'PUT',
          body: JSON.stringify({ teeth: [toothData] }),
        }),
      `FDI #${toothData.toothNumber} tish saqlandi.`
    );
    if (ok) {
      setTeeth((prev) => [
        ...prev.filter((t) => t.toothNumber !== toothData.toothNumber),
        {
          ...toothData,
          diagnosis: toothData.diagnosis || null,
          treatmentPlan: toothData.treatmentPlan || null,
          surfacesJson: JSON.stringify(toothData.surfaces),
        },
      ]);
    }
    return ok;
  };

  const handleCreatePrescription = (prescription: {
    appointmentId: string;
    medicineName: string;
    dosage: string;
    duration: string;
    instructions?: string;
  }) => {
    return submit(
      () =>
        apiRequest(
          `/api/v1/crm/appointments/${prescription.appointmentId}/prescriptions`,
          {
            method: 'POST',
            body: JSON.stringify({
              items: [
                {
                  medicineName: prescription.medicineName,
                  dosage: prescription.dosage,
                  duration: prescription.duration,
                  instructions: prescription.instructions || '',
                },
              ],
            }),
          }
        ),
      'Retsept yozildi.'
    );
  };

  const handleRecordPayment = (payment: {
    invoiceId: string;
    amount: number;
    method: string;
    referenceCode?: string;
  }) => {
    return submit(
      () =>
        apiRequest(`/api/v1/crm/invoices/${payment.invoiceId}/payments`, {
          method: 'POST',
          body: JSON.stringify(payment),
        }),
      'To‘lov muvaffaqiyatli qabul qilindi.'
    );
  };

  const handleCreateStaff = (staffData: {
    fullName: string;
    email: string;
    password: string;
    phoneNumber: string;
    role: 'Doctor' | 'Receptionist';
  }) => {
    return submit(
      () =>
        apiRequest('/api/v1/admin/staff', {
          method: 'POST',
          body: JSON.stringify(staffData),
        }),
      'Xodim yaratildi.'
    );
  };

  const handleCreateService = (serviceData: {
    name: string;
    category: string;
    price: number;
    durationMinutes: number;
    description?: string;
  }) => {
    return submit(
      () =>
        apiRequest('/api/v1/admin/services', {
          method: 'POST',
          body: JSON.stringify(serviceData),
        }),
      'Yangi xizmat qo‘shildi.'
    );
  };

  const handleUpdatePermissions = (member: StaffMember) => {
    return submit(
      () =>
        apiRequest(`/api/v1/admin/permissions/${member.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            grants: member.grants.map((g) => ({
              module: g.module,
              action: g.action,
              isGranted: g.userOverride ?? g.roleGrant,
            })),
          }),
        }),
      'Ruxsatlar yangilandi.'
    );
  };

  // Nav Tabs Config
  const unpaidInvoicesCount = useMemo(
    () => invoices.filter((i) => i.debtAmount > 0).length,
    [invoices]
  );

  const navTabs = useMemo(() => {
    const list: Array<{
      id: string;
      label: string;
      icon: React.ComponentType<{ className?: string }>;
      badge?: number | string;
      alert?: boolean;
    }> = [];

    if (can('Calendar', 'View')) {
      list.push({
        id: 'calendar',
        label: 'Qabullar',
        icon: CalendarDays,
        badge: appointments.length || undefined,
      });
    }

    if (can('PatientsDb', 'View')) {
      list.push({
        id: 'patients',
        label: 'Bemorlar',
        icon: Users,
        badge: patients.length || undefined,
      });
    }

    if (
      role !== 'Receptionist' &&
      (can('Odontogram', 'View') ||
        can('Odontogram', 'Edit') ||
        can('Prescriptions', 'Edit'))
    ) {
      list.push({
        id: 'clinical',
        label: 'Tibbiy karta',
        icon: Smile,
      });
    }

    if (role === 'Doctor' && can('Billing', 'View')) {
      list.push({
        id: 'compensation',
        label: 'Oylik daromad',
        icon: CircleDollarSign,
      });
    }

    if (role !== 'Doctor' && can('Billing', 'View')) {
      list.push({
        id: 'billing',
        label: 'Kassa',
        icon: CircleDollarSign,
        badge: unpaidInvoicesCount > 0 ? unpaidInvoicesCount : undefined,
        alert: unpaidInvoicesCount > 0,
      });
    }

    if (role === 'SuperAdmin') {
      list.push({
        id: 'admin',
        label: 'Boshqaruv',
        icon: ShieldCheck,
      });
    }

    return list;
  }, [appointments.length, can, invoices, patients.length, role, unpaidInvoicesCount]);

  useEffect(() => {
    if (navTabs.length && !navTabs.some((t) => t.id === activeTab)) {
      setActiveTab(navTabs[0].id);
    }
  }, [activeTab, navTabs]);

  const activeMeta = navTabs.find((t) => t.id === activeTab);

  if (loading && !doctors.length) {
    return (
      <div
        className="flex min-h-[450px] flex-col items-center justify-center gap-3 rounded-3xl border border-white/60 bg-white/70 backdrop-blur-2xl p-16 text-sm text-slate-600 shadow-2xs"
        role="status"
      >
        <LoaderCircle className="h-8 w-8 animate-spin text-teal-600" />
        <span className="font-extrabold text-slate-800 text-base">
          Klinika ma’lumotlari yuklanmoqda...
        </span>
        <span className="text-xs text-slate-500 font-medium">Iltimos, kuting</span>
      </div>
    );
  }

  return (
    <div className="relative w-full flex flex-col lg:flex-row gap-5 items-start">
      {/* =========================================================================
          1. DESKTOP SINGLE COLLAPSIBLE FROSTED-GLASS SIDEBAR (hidden on mobile)
          ========================================================================= */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 rounded-3xl border border-white/60 bg-white/70 backdrop-blur-2xl p-4 sm:p-5 shadow-[0_8px_32px_rgba(0,0,0,0.04)] sticky top-20 self-start transition-all duration-300 ${
          isSidebarCollapsed ? 'w-20' : 'w-64 xl:w-72'
        }`}
        aria-label="Asosiy menyu"
      >
        {/* Brand & Collapse Header */}
        <div className="flex items-center justify-between border-b border-slate-200/60 pb-4">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-teal-600 via-teal-500 to-cyan-500 text-white shadow-md shadow-teal-700/20">
              <Stethoscope className="h-5 w-5" />
            </div>
            {!isSidebarCollapsed && (
              <div className="overflow-hidden">
                <span className="text-base font-extrabold tracking-tight text-slate-900 block truncate">
                  Denta<span className="text-teal-600">Core</span>
                </span>
                <span className="text-[11px] font-semibold text-slate-500 block truncate">
                  {ROLE_LABELS[role]}
                </span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="rounded-xl p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100/80 transition-colors cursor-pointer"
            title={isSidebarCollapsed ? 'Kengaytirish' : 'Yig‘ish'}
            aria-label="Menyu holatini o‘zgartirish"
          >
            {isSidebarCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* User Card */}
        {!isSidebarCollapsed ? (
          <div className="mt-4 rounded-2xl bg-white/70 border border-slate-200/70 p-3 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-teal-500 to-cyan-500 text-white font-extrabold text-xs shadow-sm">
                {fullName.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-xs font-bold text-slate-900">{fullName}</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isLiveConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                    }`}
                  />
                  <span className="text-[10px] font-semibold text-slate-500">
                    {isLiveConnected ? 'Tizim faol' : 'Ulanmagan'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex justify-center">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-teal-500 to-cyan-500 text-white font-black text-xs shadow-sm"
              title={`${fullName} · ${ROLE_LABELS[role]}`}
            >
              {fullName.slice(0, 2).toUpperCase()}
            </div>
          </div>
        )}

        {/* Navigation Items -- spring-animated macOS dock style */}
        <nav className="mt-5 space-y-1 flex-1" aria-label="Sections">
          {navTabs.map(({ id, label, icon: Icon, badge, alert: tabAlert }) => {
            const isActive = activeTab === id;
            return (
              <motion.button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                title={isSidebarCollapsed ? label : undefined}
                whileHover={{ scale: 1.03, x: isSidebarCollapsed ? 0 : 3 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 380, damping: 22 }}
                className={`w-full flex items-center rounded-2xl py-2.5 text-xs font-bold cursor-pointer ${
                  isSidebarCollapsed ? 'justify-center px-2' : 'justify-between px-3.5'
                } ${
                  isActive
                    ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-md shadow-teal-700/20'
                    : 'text-slate-700 hover:bg-white/80 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <motion.span
                    animate={{ scale: isActive ? 1.12 : 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    className="inline-flex shrink-0"
                  >
                    <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  </motion.span>
                  {!isSidebarCollapsed && <span className="truncate">{label}</span>}
                </div>

                {!isSidebarCollapsed && badge !== undefined && (
                  <motion.span
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    className={`rounded-full px-2 py-0.5 text-[10px] font-mono font-bold tabular-nums ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : tabAlert
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-slate-200/80 text-slate-700'
                    }`}
                  >
                    {badge}
                  </motion.span>
                )}
              </motion.button>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div className="mt-6 border-t border-slate-200/60 pt-4 space-y-2">
          {!isSidebarCollapsed ? (
            <div className="flex items-center justify-between px-2 text-xs">
              <span className="flex items-center gap-1.5 font-semibold text-slate-500 text-[11px]">
                <span
                  className={`h-2 w-2 rounded-full ${
                    isLiveConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                  }`}
                />
                <span>{isLiveConnected ? 'Tizim faol' : 'Oflayn'}</span>
              </span>

              <button
                type="button"
                onClick={() => void loadData()}
                disabled={loading}
                className="rounded-xl p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100/80 transition-colors cursor-pointer"
                title="Ma’lumotlarni yangilash"
                aria-label="Ma’lumotlarni yangilash"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-teal-600' : ''}`}
                />
              </button>
            </div>
          ) : (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => void loadData()}
                disabled={loading}
                className="rounded-xl p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100/80 cursor-pointer"
                title="Yangilash"
                aria-label="Yangilash"
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? 'animate-spin text-teal-600' : ''}`}
                />
              </button>
            </div>
          )}

          {onLogout && !isSidebarCollapsed && (
            <button
              type="button"
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 rounded-2xl border border-rose-200/80 bg-rose-50/60 px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100/80 hover:border-rose-300 transition-colors cursor-pointer active:scale-95"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Chiqish</span>
            </button>
          )}
        </div>
      </aside>

      {/* =========================================================================
          2. MAIN WORKSPACE CONTAINER
          ========================================================================= */}
      <main className="flex-1 w-full min-w-0 space-y-6 pb-24 lg:pb-8">
        {/* Clean Apple-style Workspace Header Bar (No Duplicate Tabs, No Dev Jargon, No Fake Dots!) */}
        <header className="rounded-3xl border border-white/60 bg-white/70 backdrop-blur-2xl p-4 sm:p-5 shadow-[0_8px_32px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-teal-700 uppercase tracking-wider">
                  {ROLE_LABELS[role]}
                </span>
              </div>
              <h1 className="mt-1 text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                {activeMeta?.label || fullName}
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Klinika boshqaruvi va bemorlar xizmati
              </p>
            </div>

            {/* Quick Actions Header Pill */}
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50/70 px-3 py-1 text-xs font-bold text-emerald-800">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Jonli</span>
              </span>

              <button
                type="button"
                onClick={() => void loadData()}
                disabled={loading}
                aria-label="Ma’lumotlarni yangilash"
                title="Ma’lumotlarni yangilash"
                className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200/80 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-teal-600' : ''}`}
                />
                <span className="hidden sm:inline">Yangilash</span>
              </button>
            </div>
          </div>
        </header>

        {/* Global Error Banner */}
        {error && (
          <div
            className="flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50/95 px-4 py-3 text-xs font-semibold text-rose-800 shadow-2xs"
            role="alert"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="rounded-lg p-1 text-rose-500 hover:bg-rose-100 cursor-pointer"
              aria-label="Xabarni yopish"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Active Tab View */}
        <div className="transition-all duration-300">
          {activeTab === 'calendar' && (
            <AppointmentsView
              appointments={appointments}
              doctors={doctors}
              patients={patients}
              services={services}
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              canEdit={can('Calendar', 'Edit')}
              canCreateInvoice={can('Billing', 'Edit')}
              onStatusChange={handleAppointmentStatusChange}
              onCreateAppointment={handleCreateAppointment}
              onCreateInvoice={handleCreateInvoice}
              onNavigateToPatient={(pId) => {
                setSelectedPatientId(pId);
                setActiveTab('clinical');
              }}
              saving={saving}
            />
          )}

          {activeTab === 'patients' && (
            <PatientsView
              patients={patients}
              search={patientSearch}
              onSearchChange={setPatientSearch}
              canEdit={can('PatientsDb', 'Edit')}
              onCreatePatient={handleCreatePatient}
              onSelectForOdontogram={(pId) => {
                setSelectedPatientId(pId);
                setActiveTab('clinical');
              }}
              onBookForPatient={(pId) => {
                setActiveTab('calendar');
              }}
              saving={saving}
            />
          )}

          {activeTab === 'clinical' && role !== 'Receptionist' && (
            <ClinicalOdontogramView
              patients={patients}
              selectedPatientId={selectedPatientId}
              onSelectPatient={setSelectedPatientId}
              teeth={teeth}
              selectedTooth={selectedTooth}
              onSelectTooth={setSelectedTooth}
              onSaveTooth={handleSaveTooth}
              appointments={appointments}
              onCreatePrescription={handleCreatePrescription}
              canEdit={can('Odontogram', 'Edit')}
              canPrescribe={can('Prescriptions', 'Edit')}
              saving={saving}
            />
          )}

          {activeTab === 'billing' && role !== 'Doctor' && (
            <BillingView
              invoices={invoices}
              canEdit={can('Billing', 'Edit')}
              onRecordPayment={handleRecordPayment}
              saving={saving}
            />
          )}

          {activeTab === 'compensation' && role === 'Doctor' && compensation && (
            <DoctorCompensationView compensation={compensation} />
          )}

          {activeTab === 'admin' && role === 'SuperAdmin' && (
            <AdminView
              report={report}
              adminStaff={adminStaff}
              staffPermissions={staff}
              services={services}
              auditEntries={auditEntries}
              onCreateStaff={handleCreateStaff}
              onCreateService={handleCreateService}
              onUpdatePermissions={handleUpdatePermissions}
              saving={saving}
            />
          )}
        </div>
      </main>

      {/* =========================================================================
          3. MAGNIFICATION DOCK -- MOBILE BOTTOM NAV (macOS-inspired, spring physics)
          ========================================================================= */}
      <nav
        className="fixed bottom-4 inset-x-3 sm:inset-x-4 z-40 lg:hidden flex justify-center pointer-events-none"
        aria-label="Mobil pastki menyu"
      >
        <div className="pointer-events-auto w-full max-w-sm">
          <MagnificationDock
            panelHeight={64}
            baseItemSize={44}
            magnification={68}
            distance={160}
            items={navTabs.slice(0, 5).map(({ id, label, icon: Icon, badge, alert: tabAlert }) => ({
              icon: <Icon className="w-5 h-5" />,
              label: label,
              isActive: activeTab === id,
              badge: badge !== undefined ? String(badge) : undefined,
              onClick: () => setActiveTab(id),
            }))}
          />
        </div>
      </nav>
    </div>
  );
};