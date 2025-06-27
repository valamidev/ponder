import type { Common } from '../internal/common.js';
import type { Schema } from '../internal/types.js';
import type { Drizzle } from '../types/db.js';
import type { PGlite } from "@electric-sql/pglite";
import { type PgDatabase, type PgQueryResultHKT, type PgTransactionConfig } from "drizzle-orm/pg-core";
import pg from "pg";
/**
 * Query builder with built-in retry logic, logging, and metrics.
 */
export type QB<TSchema extends Schema = Schema, TClient extends PGlite | pg.Pool | pg.PoolClient = PGlite | pg.Pool | pg.PoolClient> = ((label?: string) => Omit<Drizzle<TSchema>, "transaction"> & {
    transaction<T>(transaction: (tx: QB<TSchema, TClient>) => Promise<T>, config?: PgTransactionConfig): Promise<T>;
}) & ({
    $dialect: "pglite";
    $client: PGlite;
} | {
    $dialect: "postgres";
    $client: pg.Pool | pg.PoolClient;
});
export declare const parseSqlError: (e: any) => Error;
/**
 * Create a query builder.
 *
 * @example
 * ```ts
 * const qb = createQB(common, drizzle(pool, { casing: "snake_case" }));
 * const result = await qb.label("test").select().from(accounts);
 * ```
 */
export declare const createQB: <TSchema extends Schema = {
    [name: string]: never;
}, TClient extends pg.Pool | pg.PoolClient | PGlite = pg.Pool | pg.PoolClient | PGlite>(createDb: () => PgDatabase<PgQueryResultHKT, TSchema, import("drizzle-orm").ExtractTablesWithRelations<TSchema>> & {
    $client: TClient;
}, { common, isAdmin }: {
    common: Common;
    isAdmin?: boolean | undefined;
}) => QB<TSchema, TClient>;
//# sourceMappingURL=queryBuilder.d.ts.map