import React from 'react';
import {
  CircleDollarSign,
  TrendingUp,
  Wallet,
  Sparkles,
  Calendar,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { AppleKpiCard } from '../../../components/ui/AppleKpiCard';

export interface DoctorCompensation {
  doctor: string;
  month: string;
  baseSalary: number;
  paidRevenue: number;
  revenueShare: number;
}

interface DoctorCompensationViewProps {
  compensation: DoctorCompensation;
}

function formatMoney(amount: number): string {
  return `${new Intl.NumberFormat('uz-UZ').format(amount)} so‘m`;
}

export const DoctorCompensationView: React.FC<DoctorCompensationViewProps> = ({
  compensation,
}) => {
  const totalEarnings = compensation.baseSalary + compensation.revenueShare;

  return (
    <div className="space-y-6">
      {/* 1. Apple Wallet Style Hero Card */}
      <div className="relative overflow-hidden rounded-3xl border border-white/60 bg-gradient-to-br from-teal-600 via-teal-700 to-cyan-800 p-6 sm:p-8 text-white shadow-xl shadow-teal-900/15">
        {/* Specular Glint & Mesh Blur */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-cyan-400/25 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl"
        />

        <div className="relative z-10 flex flex-col justify-between min-h-[200px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 text-white">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-teal-200">
                  Oylik Hisob-Kitob
                </span>
                <h2 className="text-base font-extrabold tracking-tight">
                  {compensation.doctor}
                </h2>
              </div>
            </div>

            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-mono font-bold backdrop-blur-md border border-white/25">
              {compensation.month}
            </span>
          </div>

          <div className="my-6">
            <span className="text-xs font-semibold text-teal-200 block">
              Hisoblangan umumiy daromad
            </span>
            <span className="text-3xl sm:text-4xl font-black tracking-tight tabular-nums block mt-1">
              {formatMoney(totalEarnings)}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 border-t border-white/15 pt-4 text-xs">
            <div>
              <span className="text-teal-200 text-[11px] block">Asosiy maosh</span>
              <span className="font-bold tabular-nums text-sm">
                {formatMoney(compensation.baseSalary)}
              </span>
            </div>

            <div>
              <span className="text-teal-200 text-[11px] block">Klinika tushumi</span>
              <span className="font-bold tabular-nums text-sm">
                {formatMoney(compensation.paidRevenue)}
              </span>
            </div>

            <div>
              <span className="text-teal-200 text-[11px] block">Shifokor ulushi</span>
              <span className="font-bold tabular-nums text-sm text-cyan-200">
                +{formatMoney(compensation.revenueShare)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Detailed Breakdown Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <AppleKpiCard
          label="Kafolatlangan oylik"
          value={formatMoney(compensation.baseSalary)}
          subtext="Oylik shartnoma asosidagi maosh"
          icon={<ShieldCheck className="h-4 w-4" />}
          theme="slate"
        />
        <AppleKpiCard
          label="Ko‘rsatilgan xizmatlar"
          value={formatMoney(compensation.paidRevenue)}
          subtext="Joriy oyda bemorlar to‘lagan tushum"
          icon={<TrendingUp className="h-4 w-4" />}
          theme="teal"
        />
        <AppleKpiCard
          label="Ulushdan qo‘shimcha daromad"
          value={formatMoney(compensation.revenueShare)}
          subtext="Muolajalar bo‘yicha foiz daromadi"
          icon={<Sparkles className="h-4 w-4" />}
          theme="emerald"
        />
      </div>
    </div>
  );
};
