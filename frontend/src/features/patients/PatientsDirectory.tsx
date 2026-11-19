import React, { useEffect, useMemo, useState } from 'react';
import { Patient, Appointment } from '../../types/dentacore';
import { formatMoneyUzs } from '../../data/mockData';
import {
  Users,
  Search,
  Phone,
  Calendar,
  AlertCircle,
  UserPlus,
  History,
  CheckCircle2,
  X,
  Sparkles,
  Stethoscope,
  FileText,
} from 'lucide-react';

interface PatientsDirectoryProps {
  patients: Patient[];
  appointments: Appointment[];
  onAddPatient: (p: Patient) => void;
  onSelectForOdontogram: (patientId: string) => void;
  onTriggerSignalR: (
    title: string,
    message: string,
    severity: 'info' | 'success' | 'warning' | 'danger'
  ) => void;
}

const STATUS_META: Record<string, { label: string; badge: string }> = {
  Pending: {
    label: 'Tasdiq kutilmoqda',
    badge: 'bg-amber-100/90 text-amber-800 border border-amber-200',
  },
  Confirmed: {
    label: 'Tasdiqlangan',
    badge: 'bg-sky-100/90 text-sky-800 border border-sky-200',
  },
  InProgress: {
    label: 'Qabulda',
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

function normalizeDigits(phone: string): string {
  return phone.replace(/\D/g, '');
}

function formatUzPhone(raw: string): string {
  const digits = normalizeDigits(raw);
  if (digits.startsWith('998') && digits.length === 12) {
    return `+998 (${digits.slice(3, 5)}) ${digits.slice(5, 8)}-${digits.slice(8, 10)}-${digits.slice(10, 12)}`;
  }
  return raw;
}

export const PatientsDirectory: React.FC<PatientsDirectoryProps> = ({
  patients,
  appointments,
  onAddPatient,
  onSelectForOdontogram,
  onTriggerSignalR,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debtFilter, setDebtFilter] = useState<'all' | 'debtors'>('all');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [selectedPatientHistory, setSelectedPatientHistory] = useState<Patient | null>(null);

  // New Patient State
  const [newName, setNewName] = useState<string>('');
  const [newPhone, setNewPhone] = useState<string>('+998');
  const [newGender, setNewGender] = useState<'Erkak' | 'Ayol'>('Erkak');
  const [newNotes, setNewNotes] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  // Close active modals on Escape key
  useEffect(() => {
    if (!showAddModal && !selectedPatientHistory) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowAddModal(false);
        setSelectedPatientHistory(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAddModal, selectedPatientHistory]);

  const { debtorsCount, totalClinicDebt } = useMemo(() => {
    let count = 0;
    let debt = 0;
    for (const p of patients) {
      if (p.totalDebt > 0) {
        count += 1;
        debt += p.totalDebt;
      }
    }
    return { debtorsCount: count, totalClinicDebt: debt };
  }, [patients]);

  const filteredPatients = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const queryDigits = normalizeDigits(searchTerm);

    return patients.filter((p) => {
      if (debtFilter === 'debtors' && p.totalDebt <= 0) return false;
      if (!query) return true;

      const nameMatch = p.fullName.toLowerCase().includes(query);
      const phoneMatch =
        p.phoneNumber.toLowerCase().includes(query) ||
        (queryDigits.length > 0 && normalizeDigits(p.phoneNumber).includes(queryDigits));
      const notesMatch = p.notes?.toLowerCase().includes(query) ?? false;

      return nameMatch || phoneMatch || notesMatch;
    });
  }, [patients, searchTerm, debtFilter]);

  const selectedHistoryAppointments = useMemo(() => {
    if (!selectedPatientHistory) return [];
    return appointments
      .filter((a) => a.patientId === selectedPatientHistory.id)
      .sort(
        (a, b) =>
          b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime)
      );
  }, [appointments, selectedPatientHistory]);

  const openAddModalWithPrefill = () => {
    setFormError(null);
    const trimmed = searchTerm.trim();
    if (trimmed && /^\+?\d[\d\s()-]*$/.test(trimmed)) {
      const digits = normalizeDigits(trimmed);
      setNewPhone(digits.startsWith('998') ? `+${digits}` : `+998${digits}`);
      setNewName('');
    } else if (trimmed) {
      setNewName(trimmed);
      setNewPhone('+998');
    } else {
      setNewName('');
      setNewPhone('+998');
    }
    setNewGender('Erkak');
    setNewNotes('');
    setShowAddModal(true);
  };

  const handleCreatePatient = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedName = newName.trim();
    if (trimmedName.length < 3) {
      setFormError('Iltimos, bemorning ism va familiyasini toʻliq kiriting (kamida 3 ta belgi).');
      return;
    }

    const phoneDigits = normalizeDigits(newPhone);
    if (!phoneDigits.startsWith('998') || phoneDigits.length !== 12) {
      setFormError('Telefon raqami +998 bilan boshlanib, jami 12 ta raqamdan iborat boʻlishi kerak.');
      return;
    }

    if (patients.some((p) => normalizeDigits(p.phoneNumber) === phoneDigits)) {
      setFormError('Ushbu telefon raqami bilan bemor bazada allaqachon mavjud (Unikal Indeks)!');
      return;
    }

    const normalizedPhone = `+${phoneDigits}`;
    const created: Patient = {
      id: `pat-${Date.now()}`,
      fullName: trimmedName,
      phoneNumber: normalizedPhone,
      gender: newGender,
      totalDebt: 0,
      notes: newNotes.trim(),
      createdAt: new Date().toISOString().substring(0, 10),
    };

    onAddPatient(created);
    setShowAddModal(false);
    setNewName('');
    setNewPhone('+998');
    setNewNotes('');
    setFormError(null);

    onTriggerSignalR(
      'Yangi Bemor Qoʻshildi',
      `${created.fullName} (${formatUzPhone(created.phoneNumber)}) EMR kartasi ochildi`,
      'success'
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Frosted Glass Header & Controls */}
      <div className="relative overflow-hidden bg-white/80 backdrop-blur-2xl rounded-3xl p-5 sm:p-6 border border-white/85 shadow-lg shadow-slate-900/5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="pointer-events-none absolute -left-10 -top-12 w-40 h-40 rounded-full bg-teal-400/15 blur-2xl" />

        <div className="flex items-start sm:items-center space-x-3.5 relative">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-teal-500/15 to-emerald-500/15 border border-teal-500/20 text-teal-600 flex items-center justify-center shrink-0 shadow-inner">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                Bemorlar Bazasi & Elektron Tibbiy Karta (EMR)
              </h2>
              <span className="text-[10px] font-mono bg-teal-500/15 text-teal-800 border border-teal-500/20 font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" />
                {patients.length} ta bemor
              </span>
              {debtorsCount > 0 && (
                <span className="text-[10px] font-mono bg-rose-500/10 text-rose-700 border border-rose-200 font-bold px-2.5 py-0.5 rounded-full">
                  Qarzdorlar: {debtorsCount} ({formatMoneyUzs(totalClinicDebt)})
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Unikal telefon indeksi (+998) orqali avtomatik deduplikatsiya va tezkor qidiruv
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 relative">
          {/* Segmented Filter */}
          <div className="inline-flex p-1 rounded-xl bg-slate-200/65 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setDebtFilter('all')}
              className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                debtFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Barchasi ({patients.length})
            </button>
            <button
              type="button"
              onClick={() => setDebtFilter('debtors')}
              className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                debtFilter === 'debtors'
                  ? 'bg-white text-rose-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Qarzdorlar ({debtorsCount})
            </button>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 sm:flex-initial">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Ism yoki telefon boʻyicha qidirish..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-8 py-2 rounded-xl bg-white/90 border border-slate-200/90 text-xs w-full sm:w-64 focus:ring-2 focus:ring-teal-500/25 focus:border-teal-500 focus:outline-none"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                aria-label="Qidiruvni tozalash"
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={openAddModalWithPrefill}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition-all active:scale-[0.98] cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Yangi Bemor</span>
          </button>
        </div>
      </div>

      {/* Empty State */}
      {filteredPatients.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-2xl rounded-3xl border border-dashed border-slate-300/90 p-10 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 mx-auto flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-extrabold text-slate-900">
              Mos keluvchi bemor topilmadi
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Qidiruv soʻrovini oʻzgartiring yoki yangi bemor uchun elektron tibbiy karta (EMR)
              oching.
            </p>
          </div>
          <div className="pt-1 flex justify-center gap-2">
            {(searchTerm || debtFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setDebtFilter('all');
                }}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Filtrni tozalash
              </button>
            )}
            <button
              type="button"
              onClick={openAddModalWithPrefill}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Yangi Bemor Qoʻshish</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Mobile Cards (<= md) */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filteredPatients.map((patient) => {
              const visitCount = appointments.filter((a) => a.patientId === patient.id).length;
              return (
                <div
                  key={patient.id}
                  className="bg-white/85 backdrop-blur-xl rounded-2xl p-4 border border-white/90 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900">
                        {patient.fullName}
                      </h3>
                      <p className="text-xs font-mono text-slate-600 flex items-center gap-1.5 mt-0.5">
                        <Phone className="w-3 h-3 text-teal-600" />
                        {formatUzPhone(patient.phoneNumber)}
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        patient.gender === 'Ayol'
                          ? 'bg-pink-50 text-pink-700 border border-pink-200/80'
                          : 'bg-sky-50 text-sky-700 border border-sky-200/80'
                      }`}
                    >
                      {patient.gender}
                    </span>
                  </div>

                  {patient.notes && (
                    <p className="text-[11px] text-slate-500 italic bg-slate-50/90 px-2.5 py-1.5 rounded-xl border border-slate-100">
                      {patient.notes}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs pt-1">
                    {patient.totalDebt > 0 ? (
                      <span className="font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-xl border border-rose-200 inline-flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {formatMoneyUzs(patient.totalDebt)}
                      </span>
                    ) : (
                      <span className="font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200/80 inline-flex items-center gap-1 text-[11px]">
                        <CheckCircle2 className="w-3 h-3" />
                        Qarzi yoʻq
                      </span>
                    )}
                    <span className="text-[11px] font-mono text-slate-400">
                      {patient.lastVisit || patient.createdAt}
                    </span>
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setSelectedPatientHistory(patient)}
                      className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-bold cursor-pointer"
                    >
                      Tarix ({visitCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectForOdontogram(patient.id)}
                      className="flex-1 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold cursor-pointer"
                    >
                      Tish Formulasi 🦷
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Frosted Glass Table (>= md) */}
          <div className="hidden md:block bg-white/80 backdrop-blur-2xl rounded-3xl border border-white/85 shadow-lg shadow-slate-900/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/85 text-slate-500 font-bold border-b border-slate-200/80 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3.5 px-5">Bemor Ismi</th>
                    <th className="py-3.5 px-4">Telefon</th>
                    <th className="py-3.5 px-4">Jinsi</th>
                    <th className="py-3.5 px-4">Qarzdorlik Balansi</th>
                    <th className="py-3.5 px-4">Oxirgi Tashrif</th>
                    <th className="py-3.5 px-5 text-right">Amallar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60">
                  {filteredPatients.map((patient) => {
                    const patientAppointments = appointments.filter(
                      (a) => a.patientId === patient.id
                    );
                    const initials = patient.fullName
                      .trim()
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((part) => part[0]?.toUpperCase())
                      .join('');

                    return (
                      <tr
                        key={patient.id}
                        className="hover:bg-white/95 transition-colors group"
                      >
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-500/15 to-cyan-500/15 border border-teal-500/20 text-teal-800 font-bold text-[11px] flex items-center justify-center shrink-0">
                              {initials || 'BM'}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900">
                                {patient.fullName}
                              </div>
                              {patient.notes && (
                                <div className="text-[11px] text-slate-500 italic truncate max-w-xs">
                                  {patient.notes}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-700">
                          <span className="inline-flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-teal-600/80" />
                            {formatUzPhone(patient.phoneNumber)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              patient.gender === 'Ayol'
                                ? 'bg-pink-50 text-pink-700 border border-pink-200/70'
                                : 'bg-sky-50 text-sky-700 border border-sky-200/70'
                            }`}
                          >
                            {patient.gender}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {patient.totalDebt > 0 ? (
                            <span className="font-mono font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-xl border border-rose-200 text-xs inline-flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              {formatMoneyUzs(patient.totalDebt)}
                            </span>
                          ) : (
                            <span className="font-semibold text-emerald-700 bg-emerald-50/90 px-2.5 py-1 rounded-xl border border-emerald-200/70 text-[11px] inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Qarzi yoʻq (0 soʻm)
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                          <span className="inline-flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {patient.lastVisit || patient.createdAt}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-right space-x-2">
                          <button
                            type="button"
                            onClick={() => setSelectedPatientHistory(patient)}
                            className="px-3 py-1.5 rounded-xl bg-slate-100/90 hover:bg-slate-200/80 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                          >
                            Tarix ({patientAppointments.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => onSelectForOdontogram(patient.id)}
                            className="px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold transition-colors cursor-pointer"
                          >
                            Tish Formulasi 🦷
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Patient Visit History Modal */}
      {selectedPatientHistory && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedPatientHistory(null);
          }}
          className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-md flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white/95 backdrop-blur-2xl rounded-3xl max-w-lg w-full p-6 border border-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200/70">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center space-x-1.5 mr-1">
                  <button
                    type="button"
                    onClick={() => setSelectedPatientHistory(null)}
                    className="w-3 h-3 rounded-full bg-rose-500 hover:bg-rose-400 cursor-pointer"
                    aria-label="Yopish"
                  />
                  <span className="w-3 h-3 rounded-full bg-amber-400" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    {selectedPatientHistory.fullName}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {formatUzPhone(selectedPatientHistory.phoneNumber)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPatientHistory(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                aria-label="Yopish"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {selectedPatientHistory.notes && (
              <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-900 flex items-start gap-2">
                <FileText className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Anamnez / Eslatma: </span>
                  <span>{selectedPatientHistory.notes}</span>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-teal-600" />
                <span>
                  Qabullar va Tashriflar Xronologiyasi ({selectedHistoryAppointments.length})
                </span>
              </h4>

              {selectedHistoryAppointments.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-6 text-center bg-slate-50/80 rounded-2xl border border-dashed border-slate-200">
                  Tashriflar tarixi hozircha boʻsh
                </p>
              ) : (
                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  {selectedHistoryAppointments.map((app) => {
                    const statusInfo = STATUS_META[app.status] ?? {
                      label: app.status,
                      badge: 'bg-slate-100 text-slate-700',
                    };
                    return (
                      <div
                        key={app.id}
                        className="p-3.5 rounded-2xl bg-slate-50/90 border border-slate-200/80 text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-slate-900">{app.serviceName}</span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusInfo.badge}`}
                          >
                            {statusInfo.label}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <Stethoscope className="w-3 h-3 text-teal-600" />
                            {app.doctorName}
                          </span>
                          <span className="font-mono font-semibold text-teal-800">
                            {app.date} ({app.startTime})
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Manba: {app.source}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-between items-center border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  const patientId = selectedPatientHistory.id;
                  setSelectedPatientHistory(null);
                  onSelectForOdontogram(patientId);
                }}
                className="px-3.5 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold cursor-pointer"
              >
                Tish Formulasini Ochish 🦷
              </button>
              <button
                type="button"
                onClick={() => setSelectedPatientHistory(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Patient Modal */}
      {showAddModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddModal(false);
          }}
          className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-md flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white/95 backdrop-blur-2xl rounded-3xl max-w-md w-full p-6 border border-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200/70">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center space-x-1.5 mr-1">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="w-3 h-3 rounded-full bg-rose-500 hover:bg-rose-400 cursor-pointer"
                    aria-label="Yopish"
                  />
                  <span className="w-3 h-3 rounded-full bg-amber-400" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500" />
                </div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Yangi Bemor Roʻyxatga Olish
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                aria-label="Yopish"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreatePatient} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Toʻliq Ism-Sharif *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Masalan: Jamshid Karimov"
                  value={newName}
                  onChange={(e) => {
                    setNewName(e.target.value);
                    if (formError) setFormError(null);
                  }}
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500/25 focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Telefon Raqami (+998) *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+998901234567"
                  value={newPhone}
                  onChange={(e) => {
                    setNewPhone(e.target.value);
                    if (formError) setFormError(null);
                  }}
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-teal-500/25 focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Jinsi:</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {(['Erkak', 'Ayol'] as const).map((genderOption) => {
                    const active = newGender === genderOption;
                    return (
                      <button
                        key={genderOption}
                        type="button"
                        onClick={() => setNewGender(genderOption)}
                        className={`py-2 px-3 rounded-xl border font-bold transition-all cursor-pointer ${
                          active
                            ? 'bg-teal-50 border-teal-500 text-teal-800 shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {genderOption}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Anamnez / Allergiyalar:
                </label>
                <textarea
                  rows={2}
                  placeholder="Masalan: Penitsillinga allergiyasi bor..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500/25 focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200/70">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-xs shadow-sm cursor-pointer"
                >
                  Bemor Kartasini Ochish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};