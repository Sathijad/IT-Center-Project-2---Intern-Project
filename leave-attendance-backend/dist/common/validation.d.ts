import { ZodSchema } from 'zod';
export declare const parseBody: <T>(schema: ZodSchema<T>, body: string | null | undefined) => T;
export declare const parseQuery: <T>(schema: ZodSchema<T>, queryParams: Record<string, string | undefined> | undefined) => T;
export declare const parsePathParameters: <T>(schema: ZodSchema<T>, params: Record<string, string | undefined> | undefined) => T;
