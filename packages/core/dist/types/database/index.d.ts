import type { Common } from '../internal/common.js';
import type { CrashRecoveryCheckpoint, IndexingBuild, NamespaceBuild, PreBuild, SchemaBuild } from '../internal/types.js';
import * as PONDER_SYNC from '../sync-store/schema.js';
import type { PGlite } from "@electric-sql/pglite";
import type { Pool, PoolClient } from "pg";
import { type QB } from "./queryBuilder.js";
export type Database = {
    driver: PostgresDriver | PGliteDriver;
    syncQB: QB<typeof PONDER_SYNC>;
    adminQB: QB;
    userQB: QB;
    readonlyQB: QB;
    /** Migrate the `ponder_sync` schema. */
    migrateSync(): Promise<void>;
    /**
     * Migrate the user schema.
     *
     * @returns The crash recovery checkpoint for each chain if there is a cache hit, else undefined.
     */
    migrate({ buildId, }: Pick<IndexingBuild, "buildId">): Promise<CrashRecoveryCheckpoint>;
};
export declare const SCHEMATA: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "schemata";
    schema: "information_schema";
    columns: {
        schemaName: import("drizzle-orm/pg-core").PgColumn<{
            name: "schemaName";
            tableName: "schemata";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: true;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
export declare const TABLES: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "tables";
    schema: "information_schema";
    columns: {
        table_name: import("drizzle-orm/pg-core").PgColumn<{
            name: "table_name";
            tableName: "tables";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        table_schema: import("drizzle-orm/pg-core").PgColumn<{
            name: "table_schema";
            tableName: "tables";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        table_type: import("drizzle-orm/pg-core").PgColumn<{
            name: "table_type";
            tableName: "tables";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
export declare const VIEWS: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "views";
    schema: "information_schema";
    columns: {
        table_name: import("drizzle-orm/pg-core").PgColumn<{
            name: "table_name";
            tableName: "views";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        table_schema: import("drizzle-orm/pg-core").PgColumn<{
            name: "table_schema";
            tableName: "views";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
export type PonderApp = {
    version: string;
    build_id: string;
    table_names: string[];
    is_locked: 0 | 1;
    is_dev: 0 | 1;
    is_ready: 0 | 1;
    heartbeat_at: number;
};
type PGliteDriver = {
    dialect: "pglite";
    instance: PGlite;
};
type PostgresDriver = {
    dialect: "postgres";
    sync: Pool;
    admin: Pool;
    user: Pool;
    readonly: Pool;
    listen: PoolClient | undefined;
};
export declare const getPonderMetaTable: (schema?: string) => import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "_ponder_meta";
    schema: undefined;
    columns: {
        key: import("drizzle-orm/pg-core").PgColumn<{
            name: "key";
            tableName: "_ponder_meta";
            dataType: "string";
            columnType: "PgText";
            data: "app";
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: true;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            $type: "app";
        }>;
        value: import("drizzle-orm/pg-core").PgColumn<{
            name: "value";
            tableName: "_ponder_meta";
            dataType: "json";
            columnType: "PgJsonb";
            data: PonderApp;
            driverParam: unknown;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            $type: PonderApp;
        }>;
    };
    dialect: "pg";
}> | import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "_ponder_meta";
    schema: string;
    columns: {
        key: import("drizzle-orm/pg-core").PgColumn<{
            name: "key";
            tableName: "_ponder_meta";
            dataType: "string";
            columnType: "PgText";
            data: "app";
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: true;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            $type: "app";
        }>;
        value: import("drizzle-orm/pg-core").PgColumn<{
            name: "value";
            tableName: "_ponder_meta";
            dataType: "json";
            columnType: "PgJsonb";
            data: PonderApp;
            driverParam: unknown;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            $type: PonderApp;
        }>;
    };
    dialect: "pg";
}>;
/**
 * - "safe" checkpoint: The closest-to-tip finalized and completed checkpoint.
 * - "latest" checkpoint: The closest-to-tip completed checkpoint.
 *
 * @dev It is an invariant that every "latest" checkpoint is specific to that chain.
 * In other words, `chainId === latestCheckpoint.chainId`.
 */
export declare const getPonderCheckpointTable: (schema?: string) => import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "_ponder_checkpoint";
    schema: undefined;
    columns: {
        chainName: import("drizzle-orm/pg-core").PgColumn<{
            name: "chainName";
            tableName: "_ponder_checkpoint";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: true;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        chainId: import("drizzle-orm/pg-core").PgColumn<{
            name: "chainId";
            tableName: "_ponder_checkpoint";
            dataType: "number";
            columnType: "PgBigInt53";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        safeCheckpoint: import("drizzle-orm/pg-core").PgColumn<{
            name: "safeCheckpoint";
            tableName: "_ponder_checkpoint";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: 75;
        }>;
        latestCheckpoint: import("drizzle-orm/pg-core").PgColumn<{
            name: "latestCheckpoint";
            tableName: "_ponder_checkpoint";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: 75;
        }>;
    };
    dialect: "pg";
}> | import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "_ponder_checkpoint";
    schema: string;
    columns: {
        chainName: import("drizzle-orm/pg-core").PgColumn<{
            name: "chainName";
            tableName: "_ponder_checkpoint";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: true;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        chainId: import("drizzle-orm/pg-core").PgColumn<{
            name: "chainId";
            tableName: "_ponder_checkpoint";
            dataType: "number";
            columnType: "PgBigInt53";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        safeCheckpoint: import("drizzle-orm/pg-core").PgColumn<{
            name: "safeCheckpoint";
            tableName: "_ponder_checkpoint";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: 75;
        }>;
        latestCheckpoint: import("drizzle-orm/pg-core").PgColumn<{
            name: "latestCheckpoint";
            tableName: "_ponder_checkpoint";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: 75;
        }>;
    };
    dialect: "pg";
}>;
export declare const createDatabase: ({ common, namespace, preBuild, schemaBuild, }: {
    common: Common;
    namespace: NamespaceBuild;
    preBuild: Pick<PreBuild, "databaseConfig">;
    schemaBuild: Omit<SchemaBuild, "graphqlSchema">;
}) => Promise<Database>;
export {};
//# sourceMappingURL=index.d.ts.map