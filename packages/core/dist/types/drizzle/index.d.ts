import { type PgTable } from "drizzle-orm/pg-core";
export declare const getTableNames: (table: PgTable) => {
    reorg: string;
    trigger: string;
    triggerFn: string;
};
export declare const getPrimaryKeyColumns: (table: PgTable) => {
    sql: string;
    js: string;
}[];
//# sourceMappingURL=index.d.ts.map