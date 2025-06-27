import type { SchemaBuild } from '../internal/types.js';
import { type PgTable } from "drizzle-orm/pg-core";
import type { QB } from "./queryBuilder.js";
export declare const createIndexes: (qb: QB, { statements }: {
    statements: SchemaBuild["statements"];
}) => Promise<void>;
export declare const createTrigger: (qb: QB, { table }: {
    table: PgTable;
}) => Promise<void>;
export declare const dropTrigger: (qb: QB, { table }: {
    table: PgTable;
}) => Promise<void>;
export declare const revert: (qb: QB, { checkpoint, table }: {
    checkpoint: string;
    table: PgTable;
}) => Promise<number>;
export declare const finalize: (qb: QB, { checkpoint, table }: {
    checkpoint: string;
    table: PgTable;
}) => Promise<void>;
export declare const commitBlock: (qb: QB, { checkpoint, table }: {
    checkpoint: string;
    table: PgTable;
}) => Promise<void>;
//# sourceMappingURL=utils.d.ts.map