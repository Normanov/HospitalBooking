import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Doctor,
  ServiceItem,
  Invoice,
  Patient,
  AuditLogItem,
  Permission,
  RolePermissionMapping,
  UserRole,
} from '../../types/dentacore';
import {
  formatMoneyUzs,
  INITIAL_AUDIT_LOGS,
  INITIAL_PERMISSIONS,
  INITIAL_ROLE_PERMISSIONS,
} from '../../data/mockData';
import { MacWindowHeader } from '../../components/MacWindowHeader';
import {
  BarChart3,
  Users,
  Tag,
  ShieldAlert,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Plus,
  Lock,
  ShieldCheck,
  ShieldQuestion,
  Settings,
  Search,
  X,
  Sparkles,
  Clock,
  Activity,
} from 'lucide-react';

interface SuperAdminDashboardProps {
  doctors: Doctor[];
  services: ServiceItem[];
  invoices: Invoice[];
  patients: Patient[];
  onTriggerSignalR: (
    title: string,
    message: string,
    severity: 'info' | 'success' | 'warning' | 'danger'
  ) => void;
  onAddService?: (newService: ServiceItem) => void;
}

type AdminSubTab = 'overview' | 'staff' | 'services' | 'audit' | 'permissions';
type ServiceCategory =
  | 'Terapiya'
  | 'Ortodontiya'
  | 'Xirurgiya'
  | 'Implantatsiya'
  | 'Gigiyena';

const SERVICE_CATEGORIES: ServiceCategory[] = [
  'Terapiya',
  'Ortodontiya',
  'Xirurgiya',
  'Implantatsiya',
  'Gigiyena',
];

/**
 * Hardware-accelerated 3D Perspective Glass Card (zero React re-renders on pointer move)
 */
interface Glass3DCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
}

const Glass3DCard: React.FC<Glass3DCardProps> = ({
  children,
  className = '',
  glowColor = 'rgba(20, 184, 166, 0.16)',
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const rotateY = (px - 0.5) * 9;
    const rotateX = (0.5 - py) * 9;

    el.style.setProperty('--rx', `${rotateX.toFixed(2)}deg`);
    el.style.setProperty('--ry', `${rotateY.toFixed(2)}deg`);
    el.style.setProperty('--gx', `${(px * 100).toFixed(1)}%`);
    el.style.setProperty('--gy', `${(py * 100).toFixed(1)}%`);
  };

  const handleMouseLeave = () => {
    const el = cardRef.current;
    if (!el) return;
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
  };

  return (
    <div style={{ perspective: '1100px' }} className="h-full">
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={
          {
            '--rx': '0deg',
            '--ry': '0deg',
            '--gx': '50%',
            '--gy': '0%',
            transform:
              'rotateX(var(--rx)) rotateY(var(--ry)) translateZ(0)',
            transformStyle: 'preserve-3d',
          } as React.CSSProperties
        }
        className={`group relative h-full rounded-3xl border border-white/85 bg-white/75 backdrop-blur-2xl shadow-[0_10px_30px_-10px_rgba(15,23,42,0.08),inset_0_1px_0_0_rgba(255,255,255,0.95)] transition-transform duration-300 ease-out hover:shadow-[0_20px_40px_-12px_rgba(15,23,42,0.14),inset_0_1px_0_0_rgba(255,255,255,1)] overflow-hidden ${className}`}
      >
        {/* Cursor-tracking specular light reflection */}
        <div
          aria-hidden="true"
          style={{
            background: `radial-gradient(280px circle at var(--gx) var(--gy), ${glowColor}, transparent 70%)`,
          }}
          className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        />
        <div className="relative z-10 h-full">{children}</div>
      </div>
    </div>
  );
};

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({
  doctors,
  services,
  invoices,
  patients,
  onTriggerSignalR,
  onAddService,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<AdminSubTab>('overview');
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(
    () => INITIAL_AUDIT_LOGS as AuditLogItem[]
  );

  // Immutable local mirror of services so additions immediately re-render
  const [serviceList, setServiceList] = useState<ServiceItem[]>(services);
  useEffect(() => {
    setServiceList(services);
  }, [services]);

  // Add Service Modal state
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState<number>(250000);
  const [newServiceDuration, setNewServiceDuration] = useState<number>(30);
  const [newServiceCategory, setNewServiceCategory] =
    useState<ServiceCategory>('Terapiya');
  const [newServiceDescription, setNewServiceDescription] = useState('');
  const [serviceModalError, setServiceModalError] = useState<string | null>(
    null
  );

  // Filters
  const [serviceSearch, setServiceSearch] = useState('');
  const [serviceCategoryFilter, setServiceCategoryFilter] = useState<
    'ALL' | ServiceCategory
  >('ALL');
  const [auditSearch, setAuditSearch] = useState('');
  const [auditStatusFilter, setAuditStatusFilter] = useState<
    'ALL' | 'Success' | 'Blocked'
  >('ALL');

  // RBAC State
  const [rolePermissions, setRolePermissions] = useState<
    RolePermissionMapping[]
  >(INITIAL_ROLE_PERMISSIONS);
  const permissions: Permission[] = INITIAL_PERMISSIONS;

  // Close Add Service modal with Escape
  useEffect(() => {
    if (!showAddServiceModal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowAddServiceModal(false);
        setServiceModalError(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showAddServiceModal]);

  // Financial aggregates
  const { totalRevenue, totalDebt, totalBilled, collectionRate } = useMemo(() => {
    const revenue = invoices.reduce((acc, inv) => acc + inv.paidAmount, 0);
    const debt = invoices.reduce((acc, inv) => acc + inv.debtAmount, 0);
    const billed = invoices.reduce((acc, inv) => acc + inv.totalAmount, 0);
    const rate = billed > 0 ? Math.round((revenue / billed) * 100) : 100;
    return {
      totalRevenue: revenue,
      totalDebt: debt,
      totalBilled: billed,
      collectionRate: rate,
    };
  }, [invoices]);

  const filteredServices = useMemo(() => {
    const q = serviceSearch.trim().toLowerCase();
    return serviceList.filter((srv) => {
      if (
        serviceCategoryFilter !== 'ALL' &&
        srv.category !== serviceCategoryFilter
      ) {
        return false;
      }
      if (!q) return true;
      return (
        srv.name.toLowerCase().includes(q) ||
        srv.description.toLowerCase().includes(q)
      );
    });
  }, [serviceList, serviceSearch, serviceCategoryFilter]);

  const filteredAuditLogs = useMemo(() => {
    const q = auditSearch.trim().toLowerCase();
    return auditLogs.filter((log) => {
      if (auditStatusFilter !== 'ALL' && log.status !== auditStatusFilter) {
        return false;
      }
      if (!q) return true;
      return (
        log.actor.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.resource.toLowerCase().includes(q) ||
        log.ipAddress.toLowerCase().includes(q)
      );
    });
  }, [auditLogs, auditSearch, auditStatusFilter]);

  const tabs = [
    {
      id: 'overview',
      label: 'Moliya & KPI',
      icon: <BarChart3 className="w-3.5 h-3.5" />,
    },
    {
      id: 'staff',
      label: 'Shifokorlar',
      icon: <Users className="w-3.5 h-3.5" />,
      badge: `${doctors.length}`,
    },
    {
      id: 'services',
      label: 'Preyskurant',
      icon: <Tag className="w-3.5 h-3.5" />,
      badge: `${serviceList.length}`,
    },
    {
      id: 'permissions',
      label: 'Rollar & Huquqlar',
      icon: <Lock className="w-3.5 h-3.5" />,
    },
    {
      id: 'audit',
      label: 'Xavfsizlik Auditi',
      icon: <ShieldAlert className="w-3.5 h-3.5" />,
      badge: `${auditLogs.length}`,
    },
  ];

  const appendAuditEntry = (action: string, resource: string) => {
    const now = new Date();
    const formattedTime = now.toLocaleTimeString('uz-UZ', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const newEntry: AuditLogItem = {
      id: `aud-${Date.now()}`,
      timestamp: formattedTime,
      actor: 'Klinika Direktori',
      actorRole: 'SuperAdmin',
      action,
      resource,
      ipAddress: '192.168.1.10',
      status: 'Success',
    };
    setAuditLogs((prev) => [newEntry, ...prev]);
  };

  const handleTogglePermission = (role: UserRole, permCode: string) => {
    // Hard guard against SuperAdmin self-lockout
    if (role === 'SuperAdmin') {
      onTriggerSignalR(
        'Tizim Himoyasi (RBAC Guard)',
        'SuperAdmin roli uchun tizim huquqlarini oʻchirish taqiqlangan.',
        'danger'
      );
      return;
    }

    let granted = false;
    setRolePermissions((prev) =>
      prev.map((rp) => {
        if (rp.role === role) {
          const hasPerm = rp.permissions.includes(permCode);
          granted = !hasPerm;
          return {
            ...rp,
            permissions: hasPerm
              ? rp.permissions.filter((p) => p !== permCode)
              : [...rp.permissions, permCode],
          };
        }
        return rp;
      })
    );

    appendAuditEntry(
      granted ? 'RBAC_GRANT_PERMISSION' : 'RBAC_REVOKE_PERMISSION',
      `${role} → ${permCode}`
    );

    onTriggerSignalR(
      'Huquqlar Yangilandi',
      `${role} roli uchun ${permCode} huquqi ${
        granted ? 'berildi' : 'bekor qilindi'
      }.`,
      'warning'
    );
  };

  const handleAddService = (e: React.FormEvent) => {
    e.preventDefault();
    setServiceModalError(null);

    const trimmedName = newServiceName.trim();
    if (trimmedName.length < 3) {
      setServiceModalError(
        'Xizmat nomi kamida 3 ta belgidan iborat boʻlishi kerak.'
      );
      return;
    }

    if (!Number.isFinite(newServicePrice) || newServicePrice <= 0) {
      setServiceModalError('Xizmat narxi 0 soʻmdan katta boʻlishi kerak.');
      return;
    }

    const createdService: ServiceItem = {
      id: `srv-${Date.now()}`,
      name: trimmedName,
      category: newServiceCategory,
      price: newServicePrice,
      durationMinutes: newServiceDuration,
      description:
        newServiceDescription.trim() || 'Yangi tasdiqlangan klinik xizmat',
    };

    setServiceList((prev) => [createdService, ...prev]);
    onAddService?.(createdService);

    appendAuditEntry(
      'SERVICE_PRICE_CREATED',
      `${createdService.name} (${formatMoneyUzs(createdService.price)})`
    );

    setShowAddServiceModal(false);
    setNewServiceName('');
    setNewServiceDescription('');
    setNewServicePrice(250000);
    setNewServiceDuration(30);

    onTriggerSignalR(
      'Yangi Xizmat Qoʻshildi',
      `${createdService.name} - ${formatMoneyUzs(
        createdService.price
      )} (SuperAdmin tasdiqladi)`,
      'success'
    );
  };

  // SVG radial ring parameters for collection rate
  const ringRadius = 18;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset =
    ringCircumference -
    (Math.min(100, Math.max(0, collectionRate)) / 100) * ringCircumference;

  return (
    <div className="mac-glass relative rounded-[28px] sm:rounded-[32px] border border-white/85 bg-gradient-to-br from-white/85 via-slate-50/75 to-white/80 backdrop-blur-3xl shadow-[0_24px_64px_-16px_rgba(15,23,42,0.16),inset_0_1px_0_0_rgba(255,255,255,0.95)] overflow-hidden">
      {/* Scoped Keyframes for macOS Spring Transitions & Ambient Depth */}
      <style>{`
        @keyframes dcPanelFadeUp {
          0% {
            opacity: 0;
            transform: translateY(10px) scale(0.992);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes dcModalSpring {
          0% {
            opacity: 0;
            transform: translateY(18px) scale(0.94);
          }
          70% {
            opacity: 1;
            transform: translateY(-2px) scale(1.008);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes dcOrbFloat {
          0%, 100% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          50% {
            transform: translate3d(18px, -14px, 0) scale(1.06);
          }
        }
        .dc-panel-enter {
          animation: dcPanelFadeUp 0.34s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .dc-modal-enter {
          animation: dcModalSpring 0.36s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .dc-orb-float {
          animation: dcOrbFloat 14s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .dc-panel-enter,
          .dc-modal-enter,
          .dc-orb-float {
            animation: none !important;
          }
        }
      `}</style>

      {/* Ambient Glass Refraction Orbs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-24 w-80 h-80 rounded-full bg-teal-400/15 blur-3xl dc-orb-float"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 -left-24 w-72 h-72 rounded-full bg-emerald-400/12 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 right-1/4 w-80 h-80 rounded-full bg-indigo-400/12 blur-3xl"
      />

      {/* macOS Window Header */}
      <div className="relative z-10">
        <MacWindowHeader
          title="Klinika Boshqaruv Markazi (SuperAdmin Executive)"
          subtitle="Moliya, xodimlar shtati, preyskurant va butun tizim xavfsizlik auditi"
          role="SuperAdmin"
          tabs={tabs}
          activeTab={activeSubTab}
          onTabChange={(id) => setActiveSubTab(id as AdminSubTab)}
        />
      </div>

      {/* Main Body */}
      <div className="relative z-10 p-4 sm:p-6 md:p-8 space-y-6">
        {/* SUB-TAB 1: FINANCIAL OVERVIEW & KPI */}
        {activeSubTab === 'overview' && (
          <div key="overview" className="dc-panel-enter space-y-6">
            {/* Top 3D KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
              {/* Card 1: Total Revenue + Radial Collection Ring */}
              <Glass3DCard glowColor="rgba(16, 185, 129, 0.22)">
                <div className="p-5 sm:p-6 flex flex-col justify-between h-full">
                  <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
                    <span>Klinikaning Jami Sof Tushumi</span>
                    <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-400/30 text-emerald-600 flex items-center justify-center shrink-0 shadow-xs">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="mt-3 text-2xl md:text-3xl font-black text-slate-900 font-mono tracking-tight">
                    {formatMoneyUzs(totalRevenue)}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between gap-3">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-emerald-700 font-semibold inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Yigʻilish koʻrsatkichi
                        </span>
                        <span className="font-mono font-bold text-emerald-800">
                          {collectionRate}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-200/70 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-700"
                          style={{ width: `${Math.min(100, collectionRate)}%` }}
                        />
                      </div>
                    </div>

                    {/* Mini Radial Ring */}
                    <svg
                      className="w-11 h-11 -rotate-90 shrink-0"
                      viewBox="0 0 44 44"
                      aria-hidden="true"
                    >
                      <circle
                        cx="22"
                        cy="22"
                        r={ringRadius}
                        fill="none"
                        stroke="rgba(148, 163, 184, 0.25)"
                        strokeWidth="4"
                      />
                      <circle
                        cx="22"
                        cy="22"
                        r={ringRadius}
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray={ringCircumference}
                        strokeDashoffset={ringOffset}
                        className="transition-all duration-700"
                      />
                    </svg>
                  </div>
                </div>
              </Glass3DCard>

              {/* Card 2: Total Debt */}
              <Glass3DCard glowColor="rgba(244, 63, 94, 0.18)">
                <div className="p-5 sm:p-6 flex flex-col justify-between h-full">
                  <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
                    <span>Bemorlarning Umumiy Qarzdorligi</span>
                    <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-rose-500/20 to-amber-500/10 border border-rose-400/30 text-rose-600 flex items-center justify-center shrink-0 shadow-xs">
                      <AlertCircle className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="mt-3 text-2xl md:text-3xl font-black text-rose-600 font-mono tracking-tight">
                    {formatMoneyUzs(totalDebt)}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Toʻliq yopilmagan cheklar</span>
                    <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200/80 font-bold">
                      Nazoratda
                    </span>
                  </div>
                </div>
              </Glass3DCard>

              {/* Card 3: Active Patients */}
              <Glass3DCard glowColor="rgba(20, 184, 166, 0.22)">
                <div className="p-5 sm:p-6 flex flex-col justify-between h-full">
                  <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
                    <span>Roʻyxatdagi Jami Bemorlar</span>
                    <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-teal-500/20 to-cyan-500/10 border border-teal-400/30 text-teal-600 flex items-center justify-center shrink-0 shadow-xs">
                      <Users className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="mt-3 text-2xl md:text-3xl font-black text-slate-900 font-mono tracking-tight">
                    {patients.length} nafar
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                    <span>EMR kartasi ochilgan baza</span>
                    <span className="inline-flex items-center gap-1 text-teal-700 font-bold">
                      <Activity className="w-3 h-3" />
                      Faol
                    </span>
                  </div>
                </div>
              </Glass3DCard>
            </div>

            {/* Financial Ledger & Breakdown */}
            <div className="rounded-3xl border border-white/85 bg-white/75 backdrop-blur-2xl overflow-hidden shadow-[0_12px_32px_-12px_rgba(15,23,42,0.08),inset_0_1px_0_0_rgba(255,255,255,0.9)]">
              <div className="p-4 sm:p-5 border-b border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white/50">
                <div>
                  <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                    Moliyaviy Hisob-Fakturalar Xulosasi
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    SuperAdmin darajasidagi konsolidatsiyalangan kassa hisoboti
                  </p>
                </div>
                <span className="text-xs font-mono font-extrabold text-teal-800 bg-teal-500/10 px-3.5 py-1.5 rounded-xl border border-teal-300/60 self-start sm:self-auto shadow-2xs">
                  Jami: {formatMoneyUzs(totalBilled)}
                </span>
              </div>

              {/* Mobile Invoice Cards */}
              <div className="p-4 grid grid-cols-1 gap-3 md:hidden">
                {invoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-4 rounded-2xl bg-white/90 border border-slate-200/75 shadow-2xs space-y-2.5 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-bold text-teal-800">
                        {inv.id}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          inv.debtAmount === 0
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {inv.debtAmount === 0
                          ? 'Toʻliq Yopilgan'
                          : 'Qisman Toʻlangan'}
                      </span>
                    </div>
                    <div className="font-extrabold text-slate-900">
                      {inv.patientName}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {inv.items.map((i) => i.serviceName).join(', ')}
                    </div>
                    <div className="flex justify-between pt-2.5 border-t border-slate-100 font-mono text-[11px]">
                      <span>Jami: {formatMoneyUzs(inv.totalAmount)}</span>
                      <span className="text-rose-600 font-bold">
                        Qarz:{' '}
                        {inv.debtAmount > 0
                          ? formatMoneyUzs(inv.debtAmount)
                          : '0 soʻm'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Invoice Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/70 text-slate-600 uppercase text-[10px] tracking-wider font-bold border-b border-slate-200/60">
                    <tr>
                      <th className="py-3.5 px-4">Hisob ID</th>
                      <th className="py-3.5 px-4">Bemor</th>
                      <th className="py-3.5 px-4">Xizmatlar</th>
                      <th className="py-3.5 px-4">Jami Narx</th>
                      <th className="py-3.5 px-4">Toʻlangan</th>
                      <th className="py-3.5 px-4">Qoldiq Qarz</th>
                      <th className="py-3.5 px-4">Holat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/50">
                    {invoices.map((inv) => (
                      <tr
                        key={inv.id}
                        className="hover:bg-white/90 transition-colors"
                      >
                        <td className="py-3.5 px-4 font-mono font-bold text-teal-800">
                          {inv.id}
                        </td>
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
                        <td className="py-3.5 px-4 font-mono font-bold text-rose-600">
                          {inv.debtAmount > 0
                            ? formatMoneyUzs(inv.debtAmount)
                            : '0 soʻm'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              inv.debtAmount === 0
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}
                          >
                            {inv.debtAmount === 0
                              ? 'Toʻliq Yopilgan'
                              : 'Qisman Toʻlangan'}
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

        {/* SUB-TAB 2: STAFF & DOCTORS */}
        {activeSubTab === 'staff' && (
          <div key="staff" className="dc-panel-enter space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Klinika Shifokorlar Shtati
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ish jadvali, smena soatlari va qabul yuklamasi
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {doctors.map((doc) => (
                <Glass3DCard
                  key={doc.id}
                  glowColor="rgba(13, 148, 136, 0.2)"
                >
                  <div className="p-5 flex flex-col justify-between h-full space-y-4">
                    <div className="flex items-center space-x-3.5">
                      <div className="relative shrink-0">
                        <img
                          src={doc.avatarUrl}
                          alt={doc.fullName}
                          className="w-14 h-14 rounded-2xl object-cover ring-2 ring-white shadow-md"
                        />
                        <span
                          title="Onlayn / Smenada"
                          className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-white"
                        />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-extrabold text-slate-900 leading-tight truncate">
                          {doc.fullName}
                        </h4>
                        <p className="text-xs text-teal-700 font-semibold mt-0.5 truncate">
                          {doc.specialty}
                        </p>
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {doc.phoneNumber}
                        </p>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white/75 border border-slate-200/70 space-y-2 text-xs shadow-2xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Smena vaqti:</span>
                        <span className="font-mono font-bold text-slate-800">
                          {doc.startHour} – {doc.endHour}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">
                          Tushlik tanaffusi:
                        </span>
                        <span className="font-mono text-slate-600">
                          {doc.lunchStart} – {doc.lunchEnd}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">
                          Reyting & Tajriba:
                        </span>
                        <span className="text-amber-600 font-bold">
                          ⭐ {doc.rating} ({doc.experienceYears} yil)
                        </span>
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-slate-200/60 flex justify-between items-center text-[11px]">
                      <span className="text-emerald-700 font-bold inline-flex items-center gap-1.5 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-300/60">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Faol Shifokor
                      </span>
                      <span className="text-slate-400 font-mono">
                        ID: {doc.id}
                      </span>
                    </div>
                  </div>
                </Glass3DCard>
              ))}
            </div>
          </div>
        )}

        {/* SUB-TAB 3: SERVICES PRICE LIST */}
        {activeSubTab === 'services' && (
          <div key="services" className="dc-panel-enter space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Xizmatlar Preyskuranti (Narxnoma)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Bemorlar va kassa hisob-kitoblarida qoʻllaniladigan rasmiy
                  narxlar
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setServiceModalError(null);
                  setShowAddServiceModal(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-xs shadow-md shadow-teal-600/20 inline-flex items-center gap-1.5 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Yangi Xizmat Qoʻshish</span>
              </button>
            </div>

            {/* Category & Search Toolbar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex flex-wrap gap-1.5">
                {(['ALL', ...SERVICE_CATEGORIES] as const).map((cat) => {
                  const active = serviceCategoryFilter === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setServiceCategoryFilter(cat)}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                        active
                          ? 'bg-teal-600 text-white shadow-sm shadow-teal-600/25'
                          : 'bg-white/80 text-slate-600 border border-white/90 shadow-2xs hover:bg-white'
                      }`}
                    >
                      {cat === 'ALL' ? 'Barchasi' : cat}
                    </button>
                  );
                })}
              </div>

              <div className="relative w-full sm:w-60">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Xizmat qidirish..."
                  value={serviceSearch}
                  onChange={(e) => setServiceSearch(e.target.value)}
                  className="pl-8 pr-7 py-1.5 rounded-xl bg-white/85 backdrop-blur-md border border-slate-200/80 text-xs w-full focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15 focus:outline-none"
                />
                {serviceSearch && (
                  <button
                    type="button"
                    onClick={() => setServiceSearch('')}
                    className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    aria-label="Tozalash"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-white/85 bg-white/75 backdrop-blur-2xl overflow-hidden shadow-[0_12px_32px_-12px_rgba(15,23,42,0.08),inset_0_1px_0_0_rgba(255,255,255,0.9)]">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/70 text-slate-600 uppercase text-[10px] tracking-wider font-bold border-b border-slate-200/60">
                    <tr>
                      <th className="py-3.5 px-4">Kategoriya</th>
                      <th className="py-3.5 px-4">Xizmat Nomi</th>
                      <th className="py-3.5 px-4">Davomiyligi</th>
                      <th className="py-3.5 px-4 font-mono">
                        Belgilangan Narx
                      </th>
                      <th className="py-3.5 px-4">Holat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/50">
                    {filteredServices.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="py-8 text-center text-xs text-slate-400"
                        >
                          Tanlangan filtr boʻyicha xizmat topilmadi.
                        </td>
                      </tr>
                    ) : (
                      filteredServices.map((srv) => (
                        <tr
                          key={srv.id}
                          className="hover:bg-white/90 transition-colors"
                        >
                          <td className="py-3.5 px-4">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200/80">
                              {srv.category}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900">
                              {srv.name}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {srv.description}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-600 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />~
                              {srv.durationMinutes} daqiqa
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-extrabold text-teal-800 text-xs whitespace-nowrap">
                            {formatMoneyUzs(srv.price)}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="text-emerald-700 font-bold text-[11px] inline-flex items-center gap-1 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/70">
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                              Faol
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* SUB-TAB 4: RBAC (Roles & Permissions) */}
        {activeSubTab === 'permissions' && (
          <div key="permissions" className="dc-panel-enter space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <ShieldQuestion className="w-4 h-4 text-indigo-600" />
                  <span>Dinamik Huquqlar Boshqaruvi (RBAC)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Har bir rol uchun tizim modullariga kirish huquqlarini
                  cheklash yoki ruxsat berish
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-white/85 bg-white/75 backdrop-blur-2xl overflow-hidden shadow-[0_12px_32px_-12px_rgba(15,23,42,0.08),inset_0_1px_0_0_rgba(255,255,255,0.9)]">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/70 text-slate-600 uppercase text-[10px] tracking-wider font-bold border-b border-slate-200/60">
                    <tr>
                      <th className="py-3.5 px-4 min-w-[200px] sticky left-0 bg-slate-100/95 backdrop-blur-md z-10">
                        Huquq Nomi (Module)
                      </th>
                      {rolePermissions.map((rp) => (
                        <th
                          key={rp.role}
                          className="py-3.5 px-4 text-center border-l border-slate-200/50 whitespace-nowrap"
                        >
                          <div className="inline-flex items-center justify-center gap-1">
                            <span>{rp.role}</span>
                            {rp.role === 'SuperAdmin' && (
                              <Lock className="w-3 h-3 text-indigo-500" />
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/50">
                    {permissions.map((perm) => (
                      <tr
                        key={perm.id}
                        className="hover:bg-white/90 transition-colors"
                      >
                        <td className="py-3.5 px-4 sticky left-0 bg-white/90 backdrop-blur-md z-10">
                          <div className="font-bold text-slate-900">
                            {perm.name}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {perm.code}
                          </div>
                        </td>
                        {rolePermissions.map((rp) => {
                          const isProtectedSuperAdmin =
                            rp.role === 'SuperAdmin';
                          const isEnabled = rp.permissions.includes(perm.code);

                          return (
                            <td
                              key={`${rp.role}-${perm.id}`}
                              className="py-3.5 px-4 text-center border-l border-slate-200/50"
                            >
                              {/* Tactile macOS Spring Toggle Switch */}
                              <button
                                type="button"
                                role="switch"
                                aria-checked={isEnabled}
                                disabled={isProtectedSuperAdmin}
                                title={
                                  isProtectedSuperAdmin
                                    ? 'SuperAdmin huquqlari tizim tomonidan himoyalangan'
                                    : `${rp.role}: ${perm.name}`
                                }
                                onClick={() =>
                                  handleTogglePermission(rp.role, perm.code)
                                }
                                className={`relative inline-flex h-6 w-10 shrink-0 items-center rounded-full border transition-colors duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
                                  isEnabled
                                    ? isProtectedSuperAdmin
                                      ? 'bg-indigo-500/80 border-indigo-400/50'
                                      : 'bg-gradient-to-r from-teal-500 to-emerald-500 border-emerald-400/50 shadow-inner'
                                    : 'bg-slate-200/90 border-slate-300/70'
                                } ${
                                  isProtectedSuperAdmin
                                    ? 'opacity-70 cursor-not-allowed'
                                    : 'cursor-pointer'
                                }`}
                              >
                                <span
                                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                                    isEnabled
                                      ? 'translate-x-5'
                                      : 'translate-x-1'
                                  }`}
                                />
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 bg-indigo-500/8 backdrop-blur-xl border border-indigo-300/50 rounded-2xl flex items-start gap-3 shadow-2xs">
              <Settings className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0" />
              <div className="text-xs text-indigo-950 space-y-0.5">
                <p className="font-extrabold">Eslatma (Zero-Trust RBAC):</p>
                <p className="text-indigo-900/85">
                  Oʻzgartirishlar darhol (Real-time SignalR orqali) barcha faol
                  sessiyalarga taʻsir qiladi va Audit jurnaliga yoziladi.
                  SuperAdmin oʻz huquqlarini oʻzi oʻchira olmaydi (Tizim
                  himoyasi).
                </p>
              </div>
            </div>
          </div>
        )}

        {/* SUB-TAB 5: SECURITY & AUDIT LOGS */}
        {activeSubTab === 'audit' && (
          <div key="audit" className="dc-panel-enter space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-teal-600" />
                  <span>Tizim Xavfsizlik va Audit Jurnali (DevSecOps)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Har bir amaliyot, autentifikatsiya, rate-limiting va
                  ruxsatsiz urinishlar real vaqtda qayd etiladi
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex p-1 rounded-xl bg-slate-200/75 backdrop-blur-md text-[11px] font-bold">
                  {(
                    [
                      { id: 'ALL', label: 'Barchasi' },
                      { id: 'Success', label: 'Success' },
                      { id: 'Blocked', label: 'Blocked' },
                    ] as const
                  ).map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setAuditStatusFilter(st.id)}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        auditStatusFilter === st.id
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Aktyor, amal yoki IP..."
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    className="pl-8 pr-7 py-1.5 rounded-xl bg-white/85 border border-slate-200/80 text-xs w-48 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15 focus:outline-none"
                  />
                  {auditSearch && (
                    <button
                      type="button"
                      onClick={() => setAuditSearch('')}
                      className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      aria-label="Tozalash"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <span className="text-[10px] font-mono font-bold bg-slate-900/5 text-slate-700 px-2.5 py-1.5 rounded-xl border border-slate-200/80 inline-flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Zero-Trust Logging
                </span>
              </div>
            </div>

            <div className="rounded-3xl border border-white/85 bg-white/75 backdrop-blur-2xl overflow-hidden shadow-[0_12px_32px_-12px_rgba(15,23,42,0.08),inset_0_1px_0_0_rgba(255,255,255,0.9)]">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-100/70 text-slate-600 uppercase text-[10px] tracking-wider font-bold border-b border-slate-200/60">
                    <tr>
                      <th className="py-3.5 px-4">Vaqt (UTC+5)</th>
                      <th className="py-3.5 px-4">Foydalanuvchi / Rol</th>
                      <th className="py-3.5 px-4">Amal (Action)</th>
                      <th className="py-3.5 px-4">Resurs & Tafsilot</th>
                      <th className="py-3.5 px-4">IP Manzil</th>
                      <th className="py-3.5 px-4">Holat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/50 text-[11px]">
                    {filteredAuditLogs.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="py-8 text-center font-sans text-xs text-slate-400"
                        >
                          Mos keluvchi audit yozuvlari topilmadi.
                        </td>
                      </tr>
                    ) : (
                      filteredAuditLogs.map((log) => (
                        <tr
                          key={log.id}
                          className="hover:bg-white/90 transition-colors"
                        >
                          <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                            {log.timestamp}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-slate-900 font-sans">
                              {log.actor}
                            </span>
                            <span className="block text-[10px] text-teal-700 font-sans font-semibold">
                              {log.actorRole}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-800">
                            {log.action}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                            {log.resource}
                          </td>
                          <td className="py-3.5 px-4 text-slate-500">
                            {log.ipAddress}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-sans ${
                                log.status === 'Success'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : log.status === 'Blocked'
                                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                  : 'bg-amber-100 text-amber-800 border border-amber-200'
                              }`}
                            >
                              {log.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Service Modal */}
      {showAddServiceModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAddServiceModal(false);
              setServiceModalError(null);
            }
          }}
          className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-md flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="dc-modal-enter bg-white/90 backdrop-blur-3xl rounded-3xl max-w-md w-full p-6 border border-white/95 shadow-[0_30px_70px_-15px_rgba(15,23,42,0.35),inset_0_1px_0_0_rgba(255,255,255,1)] space-y-4">
            {/* macOS Window Bar */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/70">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center space-x-1.5 mr-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddServiceModal(false);
                      setServiceModalError(null);
                    }}
                    className="w-3 h-3 rounded-full bg-rose-500 hover:bg-rose-400 cursor-pointer transition-transform hover:scale-110"
                    aria-label="Yopish"
                  />
                  <span className="w-3 h-3 rounded-full bg-amber-400" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-700 uppercase tracking-wider">
                    <Sparkles className="w-3 h-3" />
                    Preyskurant Boshqaruvi
                  </div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Yangi Xizmat Narxini Tasdiqlash
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowAddServiceModal(false);
                  setServiceModalError(null);
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100/80 cursor-pointer transition-colors"
                aria-label="Yopish"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {serviceModalError && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{serviceModalError}</span>
              </div>
            )}

            <form onSubmit={handleAddService} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Xizmat Nomi *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Masalan: Tishlarni Lazerli Oqartirish"
                  value={newServiceName}
                  onChange={(e) => {
                    setNewServiceName(e.target.value);
                    if (serviceModalError) setServiceModalError(null);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/90 border border-slate-200 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-teal-500/25 focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kategoriya
                  </label>
                  <select
                    value={newServiceCategory}
                    onChange={(e) =>
                      setNewServiceCategory(e.target.value as ServiceCategory)
                    }
                    className="w-full px-3 py-2.5 rounded-xl bg-white/90 border border-slate-200 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-teal-500/25 focus:border-teal-500 focus:outline-none"
                  >
                    {SERVICE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Davomiyligi
                  </label>
                  <select
                    value={newServiceDuration}
                    onChange={(e) =>
                      setNewServiceDuration(Number(e.target.value))
                    }
                    className="w-full px-3 py-2.5 rounded-xl bg-white/90 border border-slate-200 text-xs font-mono font-semibold text-slate-800 focus:ring-2 focus:ring-teal-500/25 focus:border-teal-500 focus:outline-none"
                  >
                    {[15, 30, 45, 60, 90].map((mins) => (
                      <option key={mins} value={mins}>
                        {mins} daqiqa
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Narxi (UZS) *
                </label>
                <input
                  type="number"
                  min={1}
                  step="any"
                  required
                  value={newServicePrice || ''}
                  onChange={(e) => {
                    setNewServicePrice(Number(e.target.value));
                    if (serviceModalError) setServiceModalError(null);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/90 border border-slate-200 text-xs font-mono font-extrabold text-slate-900 focus:ring-2 focus:ring-teal-500/25 focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Qisqacha Tavsif (Ixtiyoriy)
                </label>
                <input
                  type="text"
                  placeholder="Masalan: LED lampa va himoya geli bilan"
                  value={newServiceDescription}
                  onChange={(e) => setNewServiceDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white/90 border border-slate-200 text-xs text-slate-800 focus:ring-2 focus:ring-teal-500/25 focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200/70">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddServiceModal(false);
                    setServiceModalError(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-semibold cursor-pointer transition-colors"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-xs shadow-md shadow-teal-600/20 cursor-pointer inline-flex items-center gap-1.5 transition-all hover:-translate-y-0.5 active:translate-y-0"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Preyskurantga Kiritish</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};