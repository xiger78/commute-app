import { WorkArrivalType } from '../types';

export function normalizeTimeString(time: string): string | null {
  const trimmed = time?.trim() ?? '';
  if (!trimmed || trimmed === '--:--' || !trimmed.includes(':')) return null;
  const [h, m] = trimmed.split(':');
  const hi = parseInt(h, 10);
  const mi = parseInt(m, 10);
  if (isNaN(hi) || isNaN(mi) || hi < 0 || hi > 23 || mi < 0 || mi > 59) return null;
  return `${String(hi).padStart(2, '0')}:${String(mi).padStart(2, '0')}`;
}

export function timeToMinutes(time: string): number | null {
  const normalized = normalizeTimeString(time);
  if (!normalized) return null;
  const [h, m] = normalized.split(':').map(Number);
  return h * 60 + m;
}

export function isValidCommutePair(clockIn: string, clockOut: string): boolean {
  const inNorm = normalizeTimeString(clockIn);
  const outNorm = normalizeTimeString(clockOut);
  if (!inNorm || !outNorm) return false;
  if (inNorm === '00:00' && outNorm === '00:00') return false;
  const inMin = timeToMinutes(inNorm);
  const outMin = timeToMinutes(outNorm);
  return inMin !== null && outMin !== null && outMin > inMin;
}

export const MORNING_BREAK_CLOCK_IN_THRESHOLD_MINUTES = 8 * 60;

export type BreakSettings = {
  morningBreakMinutes: number;
  lunchBreakMinutes: number;
  eveningBreakMinutes: number;
};

export function calcBreakMinutesForEntry(
  clockIn: string,
  arrivalType: WorkArrivalType | undefined,
  settings: BreakSettings
): number {
  let total = settings.eveningBreakMinutes;

  const inMin = timeToMinutes(clockIn);
  if (inMin !== null && inMin < MORNING_BREAK_CLOCK_IN_THRESHOLD_MINUTES) {
    total += settings.morningBreakMinutes;
  }

  if (arrivalType !== 'vacation') {
    total += settings.lunchBreakMinutes;
  }

  return total;
}

export function calcWorkMinutes(
  clockIn: string,
  clockOut: string,
  breakMinutes = 0
): number | null {
  if (!isValidCommutePair(clockIn, clockOut)) return null;
  const inMin = timeToMinutes(clockIn);
  const outMin = timeToMinutes(clockOut);
  if (inMin === null || outMin === null) return null;
  return Math.max(0, outMin - inMin - breakMinutes);
}

/** 9시간 → "9.0", 9시간 30분 → "9.5" */
export function formatWorkHoursDecimal(workMinutes: number | null): string | null {
  if (workMinutes === null) return null;
  return (workMinutes / 60).toFixed(1);
}

export function getWorkHoursParenthetical(
  clockIn: string,
  clockOut: string,
  breakSettings: BreakSettings,
  arrivalType?: WorkArrivalType
): string {
  const breakMinutes = calcBreakMinutesForEntry(clockIn, arrivalType, breakSettings);
  const decimal = formatWorkHoursDecimal(calcWorkMinutes(clockIn, clockOut, breakMinutes));
  return decimal ? ` (${decimal})` : '';
}

export function sumWorkMinutes(
  entries: { clockIn: string; clockOut: string; arrivalType?: WorkArrivalType }[],
  breakSettings: BreakSettings
): number {
  return entries.reduce((sum, { clockIn, clockOut, arrivalType }) => {
    const breakMinutes = calcBreakMinutesForEntry(clockIn, arrivalType, breakSettings);
    const mins = calcWorkMinutes(clockIn, clockOut, breakMinutes);
    return sum + (mins ?? 0);
  }, 0);
}

export function formatTotalWorkHoursDecimal(totalMinutes: number): string {
  return (totalMinutes / 60).toFixed(1);
}
