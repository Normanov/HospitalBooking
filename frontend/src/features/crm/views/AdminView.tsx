import React, { useState } from 'react';
import {
  ShieldCheck,
  Users,
  Tag,
  CircleDollarSign,
  History,
  Plus,
  UserPlus,
  Clock,
  Check,
  X,
  Lock,
  Calendar,
  Sparkles,
  TrendingUp,
  Receipt,
  FileText,
  Search,
} from 'lucide-react';
import { AppleKpiCard } from '../../../components/ui/AppleKpiCard';
import { AppleSegmentedControl } from '../../../components/ui/AppleSegmentedControl';
import { AppleModal } from '../../../components/ui/AppleModal';

export interface AdminStaff {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: 'Doctor' | 'Receptionist';
  doctorId: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface StaffPermission {
  module: string;
  action: string;
  roleGrant: boolean;
  userOverride: boolean | null;
}

export interface StaffMember {
  id: string;
  fullName: string;
  role: 'Doctor' | 'Receptionist';
  grants: StaffPermission[];
}

export interface Service {
  id: string;
  name: string;
  category: string;
  price: number;
  durationMinutes: number;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  actorRole: string;
  action: string;
  resource: string;
  status: string;
}

export interface RevenueReport {
  total: number;
  payments: Array<{ method: string; amount: number; count: number }>;
  doctorShares: Array<{ doctor: string; revenueShare: number }>;
}

interface AdminViewProps {
  report: RevenueReport | null;
  adminStaff: AdminStaff[];
  staffPermissions: StaffMember[];
  services: Service[];
  auditEntries: AuditEntry[];
  onCreateStaff: (staffData: {
    fullName: string;
    email: string;
    password: string;
    phoneNumber: string;
    role: 'Doctor' | 'Receptionist';
    doctor?: {
      specialty: string;
      startHour: string;
      endHour: string;
      lunchStart: string;
      lunchEnd: string;
      workingDays: number[];
      profitSharePercent: number;
    };
  }) => Promise<boolean>;
  onCreateService: (serviceData: {
    name: string;
    category: string;
    price: number;
    durationMinutes: number;
    description?: string;
  }) => Promise<boolean>;
  onUpdatePermissions: (member: StaffMember) => Promise<boolean>;
  saving?: boolean;
}

const MODULE_LABELS: Record<string, string> = {
  Calendar: 'Kalendar & Qabullar',
  Billing: 'Kassa & Moliya',
  PatientsDb: 'Bemorlar Bazasi',
  PatientContact: 'Bemor Kontaktlari',
  Odontogram: 'Odontogramma (32 tish)',
  Prescriptions: 'Retseptlar',
  Staff: 'Xodimlar Boshqaruvi',
  Services: 'Xizmatlar Preyskuranti',
  Reports: 'Moliyaviy Hisobotlar',
  Permissions: 'RBAC Ruxsatlar',
};

const ACTION_LABELS: Record<string, string> = {
  View: 'Ko‘rish',
  Edit: 'Tahrirlash',
  Delete: 'O‘chirish',
};

const DAYS_OF_WEEK = [
  { id: 1, label: 'Dush' },
  { id: 2, label: 'Sesh' },
  { id: 3, label: 'Chor' },
  { id: 4, label: 'Pay' },
  { id: 5, label: 'Juma' },
  { id: 6, label: 'Shan' },
  { id: 7, label: 'Yak' },
];

function formatMoney(amount: number): string {
  return `${new Intl.NumberFormat('uz-UZ').format(amount)} so‘m`;
}

export const AdminView: React.FC<AdminViewProps> = ({
  report,
  adminStaff,
  staffPermissions,
  services,
  auditEntries,
  onCreateStaff,
  onCreateService,
  onUpdatePermissions,
  saving = false,
}) => {
  const [subTab, setSubTab] = useState<'finance' | 'staff' | 'services' | 'rbac' | 'audit'>('finance');

  // Add Staff Modal State
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [staffForm, setStaffForm] = useState({
    fullName: '',
    email: '',
    password: '',
    phoneNumber: '+998',
    role: 'Doctor' as 'Doctor' | 'Receptionist',
    specialty: 'Terapiya',
    startHour: '09:00',
    endHour: '18:00',
    lunchStart: '13:00',
    lunchEnd: '14:00',
    workingDays: [1, 2, 3, 4, 5, 6],
    profitSharePercent: 30,
  });

  // Add Service Modal State
  const [isAddServiceOpen, setIsAddServiceOpen] = useState(false);
  const [serviceForm, setServiceForm] = useState({
    name: '',
    category: 'Terapiya',
    price: '200000',
    durationMinutes: '30',
    description: '',
  });

  // Local copy of permissions for instant UI toggling
  const [localStaffPermissions, setLocalStaffPermissions] = useState<StaffMember[]>(staffPermissions);

  React.useEffect(() => {
    setLocalStaffPermissions(staffPermissions);
  }, [staffPermissions]);

  const toggleDay = (day: number) => {
    setStaffForm((prev) => ({
      ...prev,
      workingDays: prev.workingDays.includes(day)
        ? prev.workingDays.filter((d) => d !== day)
        : [...prev.workingDays, day].sort(),
    }));
  };

  const handleCreateStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      fullName: staffForm.fullName.trim(),
      email: staffForm.email.trim(),
      password: staffForm.password,
      phoneNumber: staffForm.phoneNumber.trim(),
      role: staffForm.role,
      doctor:
        staffForm.role === 'Doctor'
          ? {
              specialty: staffForm.specialty.trim(),
              startHour: staffForm.startHour,
              endHour: staffForm.endHour,
              lunchStart: staffForm.lunchStart,
              lunchEnd: staffForm.lunchEnd,
              workingDays: staffForm.workingDays,
              profitSharePercent: Number(staffForm.profitSharePercent),
            }
          : undefined,
    };

    const ok = await onCreateStaff(payload);
    if (ok) {
      setIsAddStaffOpen(false);
      setStaffForm({
        fullName: '',
        email: '',
        password: '',
        phoneNumber: '+998',
        role: 'Doctor',
        specialty: 'Terapiya',
        startHour: '09:00',
        endHour: '18:00',
        lunchStart: '13:00',
        lunchEnd: '14:00',
        workingDays: [1, 2, 3, 4, 5, 6],
        profitSharePercent: 30,
      });
    }
  };

  const handleCreateServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await onCreateService({
      name: serviceForm.name.trim(),
      category: serviceForm.category.trim(),
      price: Number(serviceForm.price),
      durationMinutes: Number(serviceForm.durationMinutes),
      description: serviceForm.description.trim() || undefined,
    });
    if (ok) {
      setIsAddServiceOpen(false);
      setServiceForm({
        name: '',
        category: 'Terapiya',
        price: '200000',
        durationMinutes: '30',
        description: '',
      });
    }
  };

  const handlePermissionToggle = async (memberIndex: number, grantIndex: number) => {
    const nextMembers = [...localStaffPermissions];
    const member = { ...nextMembers[memberIndex] };
    const grants = [...member.grants];
    const grant = { ...grants[grantIndex] };

    const currentVal = grant.userOverride ?? grant.roleGrant;
    grant.userOverride = !currentVal;
    grants[grantIndex] = grant;
    member.grants = grants;
    nextMembers[memberIndex] = member;

    setLocalStaffPermissions(nextMembers);
    await onUpdatePermissions(member);
  };

  return (
    <div className="space-y-6">
      {/* 1. Sub-Tab Segmented Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-white/60 bg-white/70 p-3 sm:p-4 backdrop-blur-2xl shadow-2xs">
        <AppleSegmentedControl
          value={subTab}
          onChange={(v) => setSubTab(v as typeof subTab)}
          options={[
            { id: 'finance', label: 'Moliya hisoboti', icon: <CircleDollarSign className="w-4 h-4" /> },
            { id: 'staff', label: 'Xodimlar', icon: <Users className="w-4 h-4" />, badge: adminStaff.length },
            { id: 'services', label: 'Xizmatlar', icon: <Tag className="w-4 h-4" />, badge: services.length },
            { id: 'rbac', label: 'Ruxsatlar (RBAC)', icon: <ShieldCheck className="w-4 h-4" /> },
            { id: 'audit', label: 'Audit jurnali', icon: <History className="w-4 h-4" /> },
          ]}
        />
      </div>

      {/* 2. SUB-TAB: MOLIYA VA TUSHUM */}
      {subTab === 'finance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <AppleKpiCard
              label="Bugungi jami tushum"
              value={formatMoney(report?.total || 0)}
              subtext="Barcha to‘lov usullari bo‘yicha"
              icon={<TrendingUp className="h-4 w-4" />}
              theme="emerald"
            />
            <AppleKpiCard
              label="To‘lov tranzaksiyalari"
              value={report?.payments.reduce((s, p) => s + p.count, 0) || 0}
              subtext="Qabul qilingan cheklar"
              icon={<Receipt className="h-4 w-4" />}
              theme="teal"
            />
            <AppleKpiCard
              label="Shifokorlar ulushi"
              value={formatMoney(
                report?.doctorShares.reduce((s, d) => s + d.revenueShare, 0) || 0
              )}
              subtext="Hisoblangan daromad ulushlari"
              icon={<Sparkles className="h-4 w-4" />}
              theme="violet"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* To‘lov usullari bo‘yicha */}
            <div className="rounded-3xl border border-white/60 bg-white/75 p-6 backdrop-blur-2xl shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
                To‘lov usullari bo‘yicha taqsimot
              </h3>
              {!report || report.payments.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">
                  Bugun to‘lovlar qayd etilmagan
                </p>
              ) : (
                <div className="space-y-3">
                  {report.payments.map((p) => (
                    <div
                      key={p.method}
                      className="flex items-center justify-between rounded-2xl bg-white/80 border border-slate-200/70 p-3.5 text-xs shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold text-slate-900">{p.method}</span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-mono text-slate-500">
                          {p.count} ta to‘lov
                        </span>
                      </div>
                      <span className="font-extrabold text-slate-900 tabular-nums">
                        {formatMoney(p.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Shifokorlar daromad ulushlari */}
            <div className="rounded-3xl border border-white/60 bg-white/75 p-6 backdrop-blur-2xl shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
                Shifokorlar bo‘yicha hisoblangan ulush
              </h3>
              {!report || report.doctorShares.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">
                  Shifokorlar bo‘yicha tushum mavjud emas
                </p>
              ) : (
                <div className="space-y-3">
                  {report.doctorShares.map((d) => (
                    <div
                      key={d.doctor}
                      className="flex items-center justify-between rounded-2xl bg-white/80 border border-slate-200/70 p-3.5 text-xs shadow-2xs"
                    >
                      <span className="font-bold text-slate-900">{d.doctor}</span>
                      <span className="font-extrabold text-teal-800 tabular-nums">
                        {formatMoney(d.revenueShare)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. SUB-TAB: XODIMLAR */}
      {subTab === 'staff' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Klinika Xodimlari</h3>
              <p className="text-xs text-slate-500">Shifokorlar va ma’murlar tarkibi</p>
            </div>
            <button
              type="button"
              onClick={() => setIsAddStaffOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-teal-600 to-cyan-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-teal-700/20 active:scale-95 transition-all cursor-pointer"
            >
              <UserPlus className="h-4 w-4" />
              <span>Xodim qo‘shish</span>
            </button>
          </div>

          <div className="overflow-hidden rounded-3xl border border-white/60 bg-white/70 backdrop-blur-2xl shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/70 bg-slate-50/50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3.5 px-5">Xodim</th>
                    <th className="py-3.5 px-4">Lavozim</th>
                    <th className="py-3.5 px-4">Email / Login</th>
                    <th className="py-3.5 px-4">Telefon</th>
                    <th className="py-3.5 px-4">Holat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {adminStaff.map((person) => (
                    <tr key={person.id} className="hover:bg-white/80 transition-colors">
                      <td className="py-3.5 px-5 font-bold text-slate-900">
                        {person.fullName}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${
                            person.role === 'Doctor'
                              ? 'bg-sky-500/10 text-sky-800 border-sky-200/70'
                              : 'bg-emerald-500/10 text-emerald-800 border-emerald-200/70'
                          }`}
                        >
                          {person.role === 'Doctor' ? 'Shifokor' : 'Administrator'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">{person.email}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">{person.phoneNumber || '–'}</td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          <span>Faol</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. SUB-TAB: XIZMATLAR PREYSKURANTI */}
      {subTab === 'services' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Xizmatlar Preyskuranti</h3>
              <p className="text-xs text-slate-500">Muolajalar, davomiylik va narxlar</p>
            </div>
            <button
              type="button"
              onClick={() => setIsAddServiceOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-teal-600 to-cyan-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-teal-700/20 active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Xizmat qo‘shish</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((srv) => (
              <div
                key={srv.id}
                className="rounded-3xl border border-white/60 bg-white/75 p-5 backdrop-blur-2xl shadow-2xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-teal-50 border border-teal-200/70 px-2.5 py-0.5 text-[10px] font-bold text-teal-800">
                    {srv.category}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    {srv.durationMinutes} daqiqa
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-900">{srv.name}</h4>
                <p className="text-lg font-black text-slate-900 tabular-nums">
                  {formatMoney(srv.price)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. SUB-TAB: RBAC RUXSATLAR MATRITsASI */}
      {subTab === 'rbac' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Ruxsatlar Matritsasi (RBAC)
            </h3>
            <p className="text-xs text-slate-500">
              Har bir xodim uchun modullar va amallar bo‘yicha individual ruxsatlarni sozlash
            </p>
          </div>

          <div className="space-y-6">
            {localStaffPermissions.map((member, memberIdx) => (
              <div
                key={member.id}
                className="overflow-hidden rounded-3xl border border-white/60 bg-white/75 backdrop-blur-2xl shadow-2xs p-5 space-y-4"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm font-extrabold text-slate-900">
                      {member.fullName}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">
                      {member.role === 'Doctor' ? 'Shifokor' : 'Administrator'}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">
                    {member.grants.length} ta ruxsat moduli
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {member.grants.map((grant, grantIdx) => {
                    const isGranted = grant.userOverride ?? grant.roleGrant;
                    const isOverridden = grant.userOverride !== null;

                    return (
                      <div
                        key={`${grant.module}-${grant.action}`}
                        className={`flex items-center justify-between rounded-2xl border p-3 text-xs transition-all ${
                          isGranted
                            ? 'bg-teal-50/70 border-teal-200/80 text-teal-950'
                            : 'bg-white/80 border-slate-200 text-slate-600'
                        }`}
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <span className="font-bold block truncate">
                            {MODULE_LABELS[grant.module] || grant.module}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">
                            {ACTION_LABELS[grant.action] || grant.action}
                            {isOverridden && (
                              <span className="ml-1 text-teal-700 font-bold">(maxsus)</span>
                            )}
                          </span>
                        </div>

                        {/* Apple Switch Toggle */}
                        <button
                          type="button"
                          onClick={() => handlePermissionToggle(memberIdx, grantIdx)}
                          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 cursor-pointer ${
                            isGranted ? 'bg-teal-600' : 'bg-slate-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                              isGranted ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. SUB-TAB: AUDIT JURNALI */}
      {subTab === 'audit' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Xavfsizlik va Audit Jurnali</h3>
            <p className="text-xs text-slate-500">Tizimda bajarilgan oxirgi 100 ta muhim amal</p>
          </div>

          <div className="overflow-hidden rounded-3xl border border-white/60 bg-white/70 backdrop-blur-2xl shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200/70 bg-slate-50/50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3.5 px-5">Vaqt</th>
                    <th className="py-3.5 px-4">Foydalanuvchi</th>
                    <th className="py-3.5 px-4">Amal</th>
                    <th className="py-3.5 px-4">Resurs</th>
                    <th className="py-3.5 px-4">Natija</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditEntries.map((log) => (
                    <tr key={log.id} className="hover:bg-white/80 transition-colors">
                      <td className="py-3.5 px-5 font-mono text-slate-500">
                        {new Date(log.timestamp).toLocaleString('uz-UZ')}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900">{log.actor}</span>
                        <span className="ml-1.5 rounded-full bg-slate-100 px-2 py-0.2 text-[10px] text-slate-500 font-mono">
                          {log.actorRole}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-teal-800">
                        {log.action}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600 truncate max-w-xs">
                        {log.resource}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                          <Check className="h-3.5 w-3.5" />
                          <span>Muvaffaqiyatli</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Xodim qo‘shish */}
      <AppleModal
        isOpen={isAddStaffOpen}
        onClose={() => setIsAddStaffOpen(false)}
        title="Yangi xodim qo‘shish"
        subtitle="Shifokor yoki administrator profilini yaratish"
        type="slide-over"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateStaffSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              To‘liq F.I.Sh. <span className="text-rose-500">*</span>
            </label>
            <input
              required
              maxLength={160}
              value={staffForm.fullName}
              onChange={(e) => setStaffForm({ ...staffForm, fullName: e.target.value })}
              placeholder="Doktor Aliyev..."
              className="w-full rounded-2xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:border-teal-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email (Login) <span className="text-rose-500">*</span>
              </label>
              <input
                required
                type="email"
                maxLength={160}
                value={staffForm.email}
                onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                placeholder="doctor@dentacore.uz"
                className="w-full rounded-2xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:border-teal-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Parol (12+ belgi) <span className="text-rose-500">*</span>
              </label>
              <input
                required
                minLength={12}
                type="password"
                value={staffForm.password}
                onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                placeholder="Xavfsiz parol..."
                className="w-full rounded-2xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:border-teal-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Telefon raqami
              </label>
              <input
                type="tel"
                value={staffForm.phoneNumber}
                onChange={(e) => setStaffForm({ ...staffForm, phoneNumber: e.target.value })}
                className="w-full rounded-2xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-xs font-mono text-slate-900 focus:border-teal-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Lavozimi <span className="text-rose-500">*</span>
              </label>
              <AppleSegmentedControl
                value={staffForm.role}
                onChange={(v) => setStaffForm({ ...staffForm, role: v as 'Doctor' | 'Receptionist' })}
                options={[
                  { id: 'Doctor', label: 'Shifokor' },
                  { id: 'Receptionist', label: 'Administrator' },
                ]}
                className="w-full"
              />
            </div>
          </div>

          {staffForm.role === 'Doctor' && (
            <div className="rounded-2xl border border-teal-200/80 bg-teal-50/50 p-4 space-y-3">
              <span className="text-xs font-bold text-teal-800 uppercase tracking-wider block">
                Shifokor ish jadvali va daromad ulushi
              </span>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mutaxassisligi <span className="text-rose-500">*</span>
                  </label>
                  <input
                    required
                    value={staffForm.specialty}
                    onChange={(e) => setStaffForm({ ...staffForm, specialty: e.target.value })}
                    placeholder="Terapevt, Ortodont..."
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs focus:border-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Daromad ulushi (%) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    required
                    type="number"
                    min="0"
                    max="100"
                    value={staffForm.profitSharePercent}
                    onChange={(e) =>
                      setStaffForm({ ...staffForm, profitSharePercent: Number(e.target.value) })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold tabular-nums focus:border-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ish boshlanishi – Tugashi
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="time"
                      value={staffForm.startHour}
                      onChange={(e) => setStaffForm({ ...staffForm, startHour: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold"
                    />
                    <span>–</span>
                    <input
                      type="time"
                      value={staffForm.endHour}
                      onChange={(e) => setStaffForm({ ...staffForm, endHour: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tushlik vaqti
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="time"
                      value={staffForm.lunchStart}
                      onChange={(e) => setStaffForm({ ...staffForm, lunchStart: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold"
                    />
                    <span>–</span>
                    <input
                      type="time"
                      value={staffForm.lunchEnd}
                      onChange={(e) => setStaffForm({ ...staffForm, lunchEnd: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Ish kunlari
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {DAYS_OF_WEEK.map((d) => {
                    const isSelected = staffForm.workingDays.includes(d.id);
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => toggleDay(d.id)}
                        className={`rounded-xl px-2.5 py-1 text-xs font-bold transition-colors ${
                          isSelected
                            ? 'bg-teal-600 text-white shadow-2xs'
                            : 'bg-white text-slate-600 border border-slate-200'
                        }`}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddStaffOpen(false)}
              className="rounded-2xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-2xl bg-gradient-to-r from-teal-600 to-cyan-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-teal-700/20 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
            >
              {saving ? 'Saqlanmoqda...' : 'Xodimni saqlash'}
            </button>
          </div>
        </form>
      </AppleModal>

      {/* MODAL: Xizmat qo‘shish */}
      <AppleModal
        isOpen={isAddServiceOpen}
        onClose={() => setIsAddServiceOpen(false)}
        title="Yangi xizmat qo‘shish"
        subtitle="Klinika preyskurantiga yangi muolaja kiritish"
        type="slide-over"
        maxWidth="md"
      >
        <form onSubmit={handleCreateServiceSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Xizmat nomi <span className="text-rose-500">*</span>
            </label>
            <input
              required
              maxLength={200}
              value={serviceForm.name}
              onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
              placeholder="Masalan, Fotokompozit plomba (Premium)"
              className="w-full rounded-2xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:border-teal-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kategoriya <span className="text-rose-500">*</span>
              </label>
              <input
                required
                value={serviceForm.category}
                onChange={(e) => setServiceForm({ ...serviceForm, category: e.target.value })}
                placeholder="Terapiya, Jarrohlik..."
                className="w-full rounded-2xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:border-teal-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Davomiyligi (daq) <span className="text-rose-500">*</span>
              </label>
              <select
                value={serviceForm.durationMinutes}
                onChange={(e) => setServiceForm({ ...serviceForm, durationMinutes: e.target.value })}
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:border-teal-500 focus:outline-none"
              >
                <option value="30">30 daqiqa</option>
                <option value="60">60 daqiqa (1 soat)</option>
                <option value="90">90 daqiqa (1.5 soat)</option>
                <option value="120">120 daqiqa (2 soat)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Narxi (UZS) <span className="text-rose-500">*</span>
            </label>
            <input
              required
              type="number"
              min="0"
              value={serviceForm.price}
              onChange={(e) => setServiceForm({ ...serviceForm, price: e.target.value })}
              className="w-full rounded-2xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-xs font-bold tabular-nums text-slate-900 focus:border-teal-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tavsif (ixtiyoriy)
            </label>
            <textarea
              rows={3}
              value={serviceForm.description}
              onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
              placeholder="Xizmat haqida qo‘shimcha ma’lumot..."
              className="w-full rounded-2xl border border-slate-200/90 bg-white p-3 text-xs text-slate-900 focus:border-teal-500 focus:outline-none"
            />
          </div>

          <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddServiceOpen(false)}
              className="rounded-2xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-2xl bg-gradient-to-r from-teal-600 to-cyan-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-teal-700/20 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
            >
              {saving ? 'Saqlanmoqda...' : 'Xizmatni saqlash'}
            </button>
          </div>
        </form>
      </AppleModal>
    </div>
  );
};
