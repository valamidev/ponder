import type { QB } from '../database/queryBuilder.js';
import type { Schema } from '../internal/types.js';
import type { Db } from '../types/db.js';
import type { Table } from "drizzle-orm";
export type IndexingStore = Db<Schema> & {
    qb: QB;
};
export declare const validateUpdateSet: (table: Table, set: Object) => Object;
/** Throw an error if `table` is not an `onchainTable`. */
export declare const checkOnchainTable: (table: Table, method: "find" | "insert" | "update" | "delete") => void;
//# sourceMappingURL=index.d.ts.map