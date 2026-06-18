import { ArrivalColor, ArrivalTypeConfig, CommuteTime, WorkArrivalType } from '../types';
import { formatTime, parseTime } from './dateUtils';
import { isNonWorkingDay } from './japaneseHolidays';
import { isValidCommutePair, normalizeTimeString } from './workDuration';

export const ARRIVAL_COLOR_HEX: Record<ArrivalColor, string> = {
  green: '#A5D6A7',
  yellow: '#FFF176',
  blue: '#90CAF9',
  red: '#EF9A9A',
  orange: '#FFCC80',
};

export const ARRIVAL_COLOR_OPTIONS: ArrivalColor[] = [
  'green',
  'yellow',
  'blue',
  'red',
  'orange',
];

export const ARRIVAL_BORDER_HEX: Record<ArrivalColor, string> = {
  green: '#81C784',
  yellow: '#FDD835',
  blue: '#64B5F6',
  red: '#E57373',
  orange: '#FFB74D',
};

export const HOLIDAY_EMPTY_ROW_COLORS = {
  backgroundColor: '#EEEEEE',
  borderColor: '#BDBDBD',
};

export const DEFAULT_ARRIVAL_CONFIGS: Record<WorkArrivalType, ArrivalTypeConfig> = {
  normal: { color: 'green', clockIn: '08:40' },
  early: { color: 'yellow', clockIn: '06:00' },
  late: { color: 'blue', clockIn: '11:00' },
  remote: { color: 'blue', clockIn: '08:40' },
  vacation: { color: 'orange', clockIn: '00:00' },
};

export const WORK_HOURS_PER_DAY = 8;

export function getArrivalColorHex(color: ArrivalColor): string {
  return ARRIVAL_COLOR_HEX[color];
}

export function clockInToClockOut(clockIn: string, workHours = WORK_HOURS_PER_DAY): string {
  const { hour, minute } = parseTime(clockIn);
  const h = parseInt(hour, 10) || 0;
  const m = parseInt(minute, 10) || 0;
  const totalMinutes = h * 60 + m + workHours * 60;
  const outH = Math.floor(totalMinutes / 60) % 24;
  const outM = totalMinutes % 60;
  return formatTime(String(outH), String(outM));
}

export function configToCommuteTimes(config: ArrivalTypeConfig): {
  clockIn: string;
  clockOut: string;
} {
  const clockIn = config.clockIn || '00:00';
  return { clockIn, clockOut: clockInToClockOut(clockIn) };
}

export function parseClockInToDraft(clockIn: string): { hour: string; minute: string } {
  const parsed = parseTime(clockIn);
  const h = parseInt(parsed.hour, 10);
  const m = parseInt(parsed.minute, 10);
  if (isNaN(h) || isNaN(m)) return { hour: '', minute: '' };
  return { hour: String(h).padStart(2, '0'), minute: String(m).padStart(2, '0') };
}

export function getArrivalTypeForDate(
  dateKey: string,
  workDays: string[],
  workDayTypes: Record<string, WorkArrivalType>
): WorkArrivalType {
  if (!workDays.includes(dateKey)) return 'remote';
  return workDayTypes[dateKey] ?? 'normal';
}

export type DayTimeDraft = {
  clockInHour: string;
  clockInMinute: string;
  clockOutHour: string;
  clockOutMinute: string;
};

export function draftFromArrivalConfig(config: ArrivalTypeConfig): DayTimeDraft {
  const times = configToCommuteTimes(config);
  const clockIn = parseClockInToDraft(times.clockIn);
  const clockOut = parseClockInToDraft(times.clockOut);
  return {
    clockInHour: clockIn.hour,
    clockInMinute: clockIn.minute,
    clockOutHour: clockOut.hour,
    clockOutMinute: clockOut.minute,
  };
}

export function draftFromCommuteTime(times?: CommuteTime): DayTimeDraft {
  const clockIn = parseClockInToDraft(times?.clockIn ?? '');
  const clockOut = parseClockInToDraft(times?.clockOut ?? '');
  return {
    clockInHour: clockIn.hour,
    clockInMinute: clockIn.minute,
    clockOutHour: clockOut.hour,
    clockOutMinute: clockOut.minute,
  };
}

export function bulkDraftForArrivalType(
  arrivalType: WorkArrivalType,
  bulkDraft: DayTimeDraft,
  arrivalConfigs: Record<WorkArrivalType, ArrivalTypeConfig>
): DayTimeDraft | null {
  if (arrivalType === 'vacation') return null;
  if (arrivalType === 'early' || arrivalType === 'late') {
    return draftFromArrivalConfig(arrivalConfigs[arrivalType]);
  }
  return bulkDraft;
}

export function getEffectiveCommuteTimes(
  dateKey: string,
  commute: CommuteTime | undefined,
  workDays: string[],
  workDayTypes: Record<string, WorkArrivalType>,
  arrivalConfigs: Record<WorkArrivalType, ArrivalTypeConfig>
): CommuteTime | null {
  const arrivalType = getArrivalTypeForDate(dateKey, workDays, workDayTypes);
  const savedIn = commute?.clockIn?.trim() ?? '';
  const savedOut = commute?.clockOut?.trim() ?? '';

  if (isValidCommutePair(savedIn, savedOut)) {
    return {
      clockIn: normalizeTimeString(savedIn)!,
      clockOut: normalizeTimeString(savedOut)!,
    };
  }

  if (arrivalType === 'vacation') return null;

  if (savedIn && normalizeTimeString(savedIn)) {
    const derived = configToCommuteTimes({
      ...arrivalConfigs[arrivalType],
      clockIn: normalizeTimeString(savedIn)!,
    });
    if (isValidCommutePair(savedIn, derived.clockOut)) {
      return {
        clockIn: normalizeTimeString(savedIn)!,
        clockOut: derived.clockOut,
      };
    }
  }

  if (workDays.includes(dateKey) || savedIn || savedOut) {
    const fromConfig = configToCommuteTimes(arrivalConfigs[arrivalType]);
    if (isValidCommutePair(fromConfig.clockIn, fromConfig.clockOut)) {
      return fromConfig;
    }
  }

  return null;
}

export function getCommuteRowColors(
  dateKey: string,
  workDays: string[],
  workDayTypes: Record<string, WorkArrivalType>,
  configs: Record<WorkArrivalType, ArrivalTypeConfig>
): { backgroundColor: string; borderColor: string } {
  const isWorkDay = workDays.includes(dateKey);

  if (isNonWorkingDay(dateKey) && !isWorkDay) {
    return HOLIDAY_EMPTY_ROW_COLORS;
  }

  const arrivalType: WorkArrivalType = isWorkDay
    ? (workDayTypes[dateKey] ?? 'normal')
    : 'remote';
  const colorKey = configs[arrivalType].color;

  return {
    backgroundColor: getArrivalColorHex(colorKey),
    borderColor: ARRIVAL_BORDER_HEX[colorKey],
  };
}
