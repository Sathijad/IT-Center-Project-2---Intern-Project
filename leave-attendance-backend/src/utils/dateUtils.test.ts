import { calculateDurationMinutes, calculateLeaveDays, isWithinGeoFence, normalizeDateOnly, parseIsoDate } from './dateUtils';

describe('dateUtils', () => {
  describe('parseIsoDate', () => {
    it('parses a valid ISO date string', () => {
      const date = parseIsoDate('2025-01-15T10:00:00.000Z');
      expect(date).toBeInstanceOf(Date);
      expect(date.toISOString()).toBe('2025-01-15T10:00:00.000Z');
    });

    it('throws for invalid date string', () => {
      expect(() => parseIsoDate('not-a-date')).toThrow('Invalid date: not-a-date');
    });
  });

  describe('normalizeDateOnly', () => {
    it('normalizes ISO string to YYYY-MM-DD', () => {
      const normalized = normalizeDateOnly('2025-03-10T23:59:59.000Z');
      expect(normalized).toBe('2025-03-10');
    });
  });

  describe('calculateLeaveDays', () => {
    const originalEnv = process.env.HOLIDAY_DATES;

    afterEach(() => {
      process.env.HOLIDAY_DATES = originalEnv;
    });

    it('calculates working days between two dates (inclusive) excluding weekends', () => {
      // 2025-03-10 (Mon) to 2025-03-14 (Fri) => 5 working days
      const days = calculateLeaveDays('2025-03-10', '2025-03-14', false);
      expect(days).toBe(5);
    });

    it('excludes configured holidays from working days', () => {
      // Set one of the days as a holiday
      process.env.HOLIDAY_DATES = '2025-03-12';
      const days = calculateLeaveDays('2025-03-10', '2025-03-14', false);
      expect(days).toBe(4);
    });

    it('returns 0.5 for half-day requests regardless of range size (validated elsewhere)', () => {
      const days = calculateLeaveDays('2025-03-10', '2025-03-10', true);
      expect(days).toBe(0.5);
    });

    it('throws when end date is before start date', () => {
      expect(() => calculateLeaveDays('2025-03-10', '2025-03-09', false)).toThrow(
        'End date must be greater than or equal to start date',
      );
    });
  });

  describe('calculateDurationMinutes', () => {
    it('calculates rounded difference in minutes', () => {
      const minutes = calculateDurationMinutes('2025-03-10T09:00:00.000Z', '2025-03-10T10:30:30.000Z');
      expect(minutes).toBe(91);
    });

    it('throws if clock-out is before clock-in', () => {
      expect(() => calculateDurationMinutes('2025-03-10T10:00:00.000Z', '2025-03-10T09:59:59.000Z')).toThrow(
        'Clock-out must be after clock-in',
      );
    });
  });

  describe('isWithinGeoFence', () => {
    it('returns true when point is within radius', () => {
      // Same coordinates -> distance 0
      const result = isWithinGeoFence(-37.8136, 144.9631, -37.8136, 144.9631, 100);
      expect(result).toBe(true);
    });

    it('returns false when point is outside radius', () => {
      const result = isWithinGeoFence(-37.8136, 144.9631, -37.8136, 145.0631, 1000);
      expect(result).toBe(false);
    });
  });
});


