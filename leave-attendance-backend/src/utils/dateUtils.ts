const WEEKEND_DAYS = new Set([0, 6]); // Sunday = 0, Saturday = 6

export const parseIsoDate = (value: string): Date => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${value}`);
  }
  return date;
};

export const normalizeDateOnly = (value: string): string => {
  const date = parseIsoDate(value);
  return date.toISOString().slice(0, 10);
};

const getHolidaySet = (): Set<string> => {
  const holidays = (process.env.HOLIDAY_DATES || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return new Set(holidays);
};

const isWeekend = (date: Date): boolean => WEEKEND_DAYS.has(date.getUTCDay());

const isHoliday = (date: Date, holidaySet: Set<string>): boolean => holidaySet.has(date.toISOString().slice(0, 10));

export const calculateLeaveDays = (startDate: string, endDate: string, halfDay: boolean): number => {
  const holidaySet = getHolidaySet();

  const start = parseIsoDate(startDate);
  const end = parseIsoDate(endDate);

  if (end < start) {
    throw new Error('End date must be greater than or equal to start date');
  }

  if (halfDay) {
    return 0.5;
  }

  let days = 0;
  const current = new Date(start);

  while (current <= end) {
    if (!isWeekend(current) && !isHoliday(current, holidaySet)) {
      days += 1;
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return days;
};

export const calculateDurationMinutes = (clockInIso: string, clockOutIso: string): number => {
  const clockIn = parseIsoDate(clockInIso);
  const clockOut = parseIsoDate(clockOutIso);

  if (clockOut < clockIn) {
    throw new Error('Clock-out must be after clock-in');
  }

  return Math.round((clockOut.getTime() - clockIn.getTime()) / 60000);
};

export const isWithinGeoFence = (
  latitude: number,
  longitude: number,
  permittedCenterLat: number,
  permittedCenterLong: number,
  radiusMeters: number,
): boolean => {
  const earthRadius = 6371e3; // meters

  const lat1Rad = (latitude * Math.PI) / 180;
  const lat2Rad = (permittedCenterLat * Math.PI) / 180;
  const deltaLat = ((permittedCenterLat - latitude) * Math.PI) / 180;
  const deltaLong = ((permittedCenterLong - longitude) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(deltaLong / 2) * Math.sin(deltaLong / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = earthRadius * c;
  return distance <= radiusMeters;
};

