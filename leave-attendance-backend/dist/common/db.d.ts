import { Pool, PoolClient, QueryConfig, QueryResult, QueryResultRow } from 'pg';
type QueryParams = unknown[] | undefined;
export declare const getPool: () => Promise<Pool>;
export declare const query: <T extends QueryResultRow = QueryResultRow>(sql: string | QueryConfig, params?: QueryParams) => Promise<QueryResult<T>>;
export declare const withTransaction: <T>(callback: (client: PoolClient) => Promise<T>) => Promise<T>;
export {};
