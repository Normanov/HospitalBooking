import { Doctor, Appointment, Permission, RolePermissionMapping, AuditLogItem } from '../types/dentacore';

export function formatMoneyUzs(amount: number): string {
  return `${new Intl.NumberFormat('uz-UZ').format(amount)} so‘m`;
}

export function getTodayDateString(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export const INITIAL_AUDIT_LOGS: AuditLogItem[] = [];
export const INITIAL_PERMISSIONS: Permission[] = [];
export const INITIAL_ROLE_PERMISSIONS: RolePermissionMapping[] = [];

export const calculateDynamicSlots = (
  doctor: Doctor,
  existingAppointments: Appointment[],
  selectedDate: string
): { startTime: string; endTime: string; isAvailable: boolean; conflictReason?: string }[] => {
  const [year, month, day] = selectedDate.split('-').map(Number);
  const dayOfWeek = new Date(year, month - 1, day).getDay();

  if (!doctor.workingDays.includes(dayOfWeek)) {
    return [];
  }

  const slots: { startTime: string; endTime: string; isAvailable: boolean; conflictReason?: string }[] = [];

  const [startH, startM] = doctor.startHour.split(':').map(Number);
  const [endH, endM] = doctor.endHour.split(':').map(Number);
  const [lunchStartH, lunchStartM] = doctor.lunchStart.split(':').map(Number);
  const [lunchEndH, lunchEndM] = doctor.lunchEnd.split(':').map(Number);

  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  const lunchStartTotal = lunchStartH * 60 + lunchStartM;
  const lunchEndTotal = lunchEndH * 60 + lunchEndM;

  const dayAppointments = existingAppointments.filter(
    (app) =>
      app.doctorId === doctor.id &&
      app.date === selectedDate &&
      app.status !== 'Cancelled' &&
      app.status !== 'NoShow'
  );

  let currentMin = startMinutes;
  while (currentMin + 30 <= endMinutes) {
    const slotStartMin = currentMin;
    const slotEndMin = currentMin + 30;

    const startStr = `${String(Math.floor(slotStartMin / 60)).padStart(2, '0')}:${String(slotStartMin % 60).padStart(2, '0')}`;
    const endStr = `${String(Math.floor(slotEndMin / 60)).padStart(2, '0')}:${String(slotEndMin % 60).padStart(2, '0')}`;

    const isLunch = slotStartMin < lunchEndTotal && slotEndMin > lunchStartTotal;

    const conflictingApp = dayAppointments.find((app) => {
      const [appSH, appSM] = app.startTime.split(':').map(Number);
      const [appEH, appEM] = app.endTime.split(':').map(Number);
      const appStartMin = appSH * 60 + appSM;
      const appEndMin = appEH * 60 + appEM;

      return slotStartMin < appEndMin && slotEndMin > appStartMin;
    });

    if (isLunch) {
      slots.push({
        startTime: startStr,
        endTime: endStr,
        isAvailable: false,
        conflictReason: 'Tushlik tanaffusi',
      });
    } else if (conflictingApp) {
      slots.push({
        startTime: startStr,
        endTime: endStr,
        isAvailable: false,
        conflictReason: `Band qilingan (${conflictingApp.patientName})`,
      });
    } else {
      slots.push({
        startTime: startStr,
        endTime: endStr,
        isAvailable: true,
      });
    }

    currentMin += 30;
  }

  return slots;
};
