"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isWithinGeoFence = exports.calculateDurationMinutes = exports.calculateLeaveDays = exports.normalizeDateOnly = exports.parseIsoDate = void 0;
const WEEKEND_DAYS = new Set([0, 6]); // Sunday = 0, Saturday = 6
const parseIsoDate = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        throw new Error(`Invalid date: ${value}`);
    }
    return date;
};
exports.parseIsoDate = parseIsoDate;
const normalizeDateOnly = (value) => {
    const date = (0, exports.parseIsoDate)(value);
    return date.toISOString().slice(0, 10);
};
exports.normalizeDateOnly = normalizeDateOnly;
const getHolidaySet = () => {
    const holidays = (process.env.HOLIDAY_DATES || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    return new Set(holidays);
};
const isWeekend = (date) => WEEKEND_DAYS.has(date.getUTCDay());
const isHoliday = (date, holidaySet) => holidaySet.has(date.toISOString().slice(0, 10));
const calculateLeaveDays = (startDate, endDate, halfDay) => {
    const holidaySet = getHolidaySet();
    const start = (0, exports.parseIsoDate)(startDate);
    const end = (0, exports.parseIsoDate)(endDate);
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
exports.calculateLeaveDays = calculateLeaveDays;
const calculateDurationMinutes = (clockInIso, clockOutIso) => {
    const clockIn = (0, exports.parseIsoDate)(clockInIso);
    const clockOut = (0, exports.parseIsoDate)(clockOutIso);
    if (clockOut < clockIn) {
        throw new Error('Clock-out must be after clock-in');
    }
    return Math.round((clockOut.getTime() - clockIn.getTime()) / 60000);
};
exports.calculateDurationMinutes = calculateDurationMinutes;
const isWithinGeoFence = (latitude, longitude, permittedCenterLat, permittedCenterLong, radiusMeters) => {
    const earthRadius = 6371e3; // meters
    const lat1Rad = (latitude * Math.PI) / 180;
    const lat2Rad = (permittedCenterLat * Math.PI) / 180;
    const deltaLat = ((permittedCenterLat - latitude) * Math.PI) / 180;
    const deltaLong = ((permittedCenterLong - longitude) * Math.PI) / 180;
    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
        Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(deltaLong / 2) * Math.sin(deltaLong / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = earthRadius * c;
    return distance <= radiusMeters;
};
exports.isWithinGeoFence = isWithinGeoFence;
//# sourceMappingURL=dateUtils.js.map