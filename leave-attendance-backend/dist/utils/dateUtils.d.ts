export declare const parseIsoDate: (value: string) => Date;
export declare const normalizeDateOnly: (value: string) => string;
export declare const calculateLeaveDays: (startDate: string, endDate: string, halfDay: boolean) => number;
export declare const calculateDurationMinutes: (clockInIso: string, clockOutIso: string) => number;
export declare const isWithinGeoFence: (latitude: number, longitude: number, permittedCenterLat: number, permittedCenterLong: number, radiusMeters: number) => boolean;
