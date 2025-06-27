import { type BuildColumns, type ColumnBuilderBase, type Writable } from "drizzle-orm";
import { type AnyPgColumn, type PrimaryKeyBuilder as DrizzlePrimaryKeyBuilder, type ExtraConfigColumn, type PgColumnBuilderBase, type PgEnumColumnBuilderInitial, PgTable, type PgTableExtraConfig, type PgTextConfig, type TableConfig } from "drizzle-orm/pg-core";
import { type PgColumnsBuilders as _PgColumnsBuilders } from "drizzle-orm/pg-core/columns/all";
import { type PgBigintBuilderInitial } from "./bigint.js";
import { type PgBytesBuilderInitial } from "./bytes.js";
import { type PgHexBuilderInitial } from "./hex.js";
import { type PgJsonBuilderInitial, type PgJsonbBuilderInitial } from "./json.js";
import { type PgTextBuilderInitial } from "./text.js";
export declare function hex(): PgHexBuilderInitial<"">;
export declare function hex<name extends string>(columnName: name): PgHexBuilderInitial<name>;
export declare function bigint(): PgBigintBuilderInitial<"">;
export declare function bigint<name extends string>(columnName: name): PgBigintBuilderInitial<name>;
export declare function json(): PgJsonBuilderInitial<"">;
export declare function json<name extends string>(name: name): PgJsonBuilderInitial<name>;
export declare function jsonb(): PgJsonbBuilderInitial<"">;
export declare function jsonb<name extends string>(name: name): PgJsonbBuilderInitial<name>;
export declare function bytes(): PgBytesBuilderInitial<"">;
export declare function bytes<name extends string>(columnName: name): PgBytesBuilderInitial<name>;
export declare function text(): PgTextBuilderInitial<"", [string, ...string[]]>;
export declare function text<U extends string, T extends Readonly<[U, ...U[]]>>(config?: PgTextConfig<T | Writable<T>>): PgTextBuilderInitial<"", Writable<T>>;
export declare function text<TName extends string, U extends string, T extends Readonly<[U, ...U[]]>>(name: TName, config?: PgTextConfig<T | Writable<T>>): PgTextBuilderInitial<TName, Writable<T>>;
export declare const onchain: unique symbol;
export type PrimaryKeyBuilder<columnNames extends string = string> = DrizzlePrimaryKeyBuilder & {
    columnNames: columnNames;
};
export declare const primaryKey: <tableName extends string, column extends AnyPgColumn<{
    tableName: tableName;
}> & {
    " name": string;
}, columns extends (AnyPgColumn<{
    tableName: tableName;
}> & {
    " name": string;
})[]>({ name, columns, }: {
    name?: string | undefined;
    columns: [column, ...columns];
}) => PrimaryKeyBuilder<column[" name"] | columns[number][" name"]>;
export type OnchainTable<T extends TableConfig & {
    extra: PgTableExtraConfig | undefined;
} = TableConfig & {
    extra: PgTableExtraConfig | undefined;
}> = PgTable<T> & {
    [Key in keyof T["columns"]]: T["columns"][Key];
} & {
    [onchain]: true;
} & {
    enableRLS: () => Omit<OnchainTable<T>, "enableRLS">;
};
export type BuildExtraConfigColumns<columns extends Record<string, ColumnBuilderBase>> = {
    [key in keyof columns]: ExtraConfigColumn & {
        " name": key;
    };
};
export type PgColumnsBuilders = Omit<_PgColumnsBuilders, "bigint" | "serial" | "smallserial" | "bigserial" | "json" | "jsonb"> & {
    /**
     * Create an 8 byte number column.
     */
    int8: _PgColumnsBuilders["bigint"];
    /**
     * Create a column for hex strings.
     *
     * - Docs: https://ponder.sh/docs/api-reference/ponder/schema#onchaintable
     *
     * @example
     * import { hex, onchainTable } from "ponder";
     *
     * export const account = onchainTable("account", (p) => ({
     *   address: p.hex(),
     * }));
     */
    hex: typeof hex;
    /**
     * Create a column for Ethereum integers
     *
     * - Docs: https://ponder.sh/docs/api-reference/ponder/schema#onchaintable
     *
     * @example
     * import { bigint, onchainTable } from "ponder";
     *
     * export const account = onchainTable("account", (p) => ({
     *   balance: p.bigint(),
     * }));
     */
    bigint: typeof bigint;
    /**
     * Create a column for Ethereum bytes
     *
     * - Docs: https://ponder.sh/docs/api-reference/ponder/schema#onchaintable
     *
     * @example
     * import { bytes, onchainTable } from "ponder";
     *
     * export const account = onchainTable("account", (p) => ({
     *   calldata: p.bytes(),
     * }));
     */
    bytes: typeof bytes;
    json: typeof json;
    jsonb: typeof jsonb;
};
/**
 * Create an onchain table.
 *
 * - Docs: https://ponder.sh/docs/api-reference/ponder/schema#onchaintable
 *
 * @example
 * import { onchainTable } from "ponder";
 *
 * export const account = onchainTable("account", (p) => ({
 *   address: p.hex().primaryKey(),
 *   balance: p.bigint().notNull(),
 * }));
 *
 * @param name - The table name in the database.
 * @param columns - The table columns.
 * @param extra - Config such as indexes or composite primary keys.
 * @returns The onchain table.
 */
export declare const onchainTable: <name extends string, columns extends Record<string, PgColumnBuilderBase<import("drizzle-orm").ColumnBuilderBaseConfig<import("drizzle-orm").ColumnDataType, string>, object>>, extra extends PgTableExtraConfig | undefined = undefined>(name: name, columns: columns | ((columnTypes: PgColumnsBuilders) => columns), extraConfig?: ((self: BuildExtraConfigColumns<columns>) => extra) | undefined) => OnchainTable<{
    name: name;
    schema: undefined;
    columns: { [Key in keyof columns]: import("drizzle-orm/pg-core").PgColumn<{
        name: (Omit<columns[Key]["_"], "name"> & {
            name: columns[Key]["_"]["name"] extends "" ? import("drizzle-orm").Assume<Key, string> : columns[Key]["_"]["name"];
        })["name"];
        tableName: name;
        dataType: (Omit<columns[Key]["_"], "name"> & {
            name: columns[Key]["_"]["name"] extends "" ? import("drizzle-orm").Assume<Key, string> : columns[Key]["_"]["name"];
        })["dataType"];
        columnType: (Omit<columns[Key]["_"], "name"> & {
            name: columns[Key]["_"]["name"] extends "" ? import("drizzle-orm").Assume<Key, string> : columns[Key]["_"]["name"];
        })["columnType"];
        data: Omit<columns[Key]["_"], "name"> & {
            name: columns[Key]["_"]["name"] extends "" ? import("drizzle-orm").Assume<Key, string> : columns[Key]["_"]["name"];
        } extends infer T ? T extends Omit<columns[Key]["_"], "name"> & {
            name: columns[Key]["_"]["name"] extends "" ? import("drizzle-orm").Assume<Key, string> : columns[Key]["_"]["name"];
        } ? T extends {
            $type: infer U;
        } ? U : T["data"] : never : never;
        driverParam: (Omit<columns[Key]["_"], "name"> & {
            name: columns[Key]["_"]["name"] extends "" ? import("drizzle-orm").Assume<Key, string> : columns[Key]["_"]["name"];
        })["driverParam"];
        notNull: Omit<columns[Key]["_"], "name"> & {
            name: columns[Key]["_"]["name"] extends "" ? import("drizzle-orm").Assume<Key, string> : columns[Key]["_"]["name"];
        } extends infer T_1 ? T_1 extends Omit<columns[Key]["_"], "name"> & {
            name: columns[Key]["_"]["name"] extends "" ? import("drizzle-orm").Assume<Key, string> : columns[Key]["_"]["name"];
        } ? T_1 extends {
            notNull: true;
        } ? true : false : never : never;
        hasDefault: Omit<columns[Key]["_"], "name"> & {
            name: columns[Key]["_"]["name"] extends "" ? import("drizzle-orm").Assume<Key, string> : columns[Key]["_"]["name"];
        } extends infer T_2 ? T_2 extends Omit<columns[Key]["_"], "name"> & {
            name: columns[Key]["_"]["name"] extends "" ? import("drizzle-orm").Assume<Key, string> : columns[Key]["_"]["name"];
        } ? T_2 extends {
            hasDefault: true;
        } ? true : false : never : never;
        isPrimaryKey: Omit<columns[Key]["_"], "name"> & {
            name: columns[Key]["_"]["name"] extends "" ? import("drizzle-orm").Assume<Key, string> : columns[Key]["_"]["name"];
        } extends infer T_3 ? T_3 extends Omit<columns[Key]["_"], "name"> & {
            name: columns[Key]["_"]["name"] extends "" ? import("drizzle-orm").Assume<Key, string> : columns[Key]["_"]["name"];
        } ? T_3 extends {
            isPrimaryKey: true;
        } ? true : false : never : never;
        isAutoincrement: Omit<columns[Key]["_"], "name"> & {
            name: columns[Key]["_"]["name"] extends "" ? import("drizzle-orm").Assume<Key, string> : columns[Key]["_"]["name"];
        } extends infer T_4 ? T_4 extends Omit<columns[Key]["_"], "name"> & {
            name: columns[Key]["_"]["name"] extends "" ? import("drizzle-orm").Assume<Key, string> : columns[Key]["_"]["name"];
        } ? T_4 extends {
            isAutoincrement: true;
        } ? true : false : never : never;
        hasRuntimeDefault: Omit<columns[Key]["_"], "name"> & {
            name: columns[Key]["_"]["name"] extends "" ? import("drizzle-orm").Assume<Key, string> : columns[Key]["_"]["name"];
        } extends infer T_5 ? T_5 extends Omit<columns[Key]["_"], "name"> & {
            name: columns[Key]["_"]["name"] extends "" ? import("drizzle-orm").Assume<Key, string> : columns[Key]["_"]["name"];
        } ? T_5 extends {
            hasRuntimeDefault: true;
        } ? true : false : never : never;
        enumValues: (Omit<columns[Key]["_"], "name"> & {
            name: columns[Key]["_"]["name"] extends "" ? import("drizzle-orm").Assume<Key, string> : columns[Key]["_"]["name"];
        })["enumValues"];
        baseColumn: Omit<columns[Key]["_"], "name"> & {
            name: columns[Key]["_"]["name"] extends "" ? import("drizzle-orm").Assume<Key, string> : columns[Key]["_"]["name"];
        } extends infer T_6 ? T_6 extends Omit<columns[Key]["_"], "name"> & {
            name: columns[Key]["_"]["name"] extends "" ? import("drizzle-orm").Assume<Key, string> : columns[Key]["_"]["name"];
        } ? T_6 extends {
            baseBuilder: infer U_1 extends ColumnBuilderBase<import("drizzle-orm").ColumnBuilderBaseConfig<import("drizzle-orm").ColumnDataType, string>, object>;
        } ? import("drizzle-orm").Column<{
            name: U_1["_"]["name"];
            tableName: name;
            dataType: U_1["_"]["dataType"];
            columnType: U_1["_"]["columnType"];
            data: U_1["_"] extends infer T_7 ? T_7 extends U_1["_"] ? T_7 extends {
                $type: infer U;
            } ? U : T_7["data"] : never : never;
            driverParam: U_1["_"]["driverParam"];
            notNull: U_1["_"] extends infer T_8 ? T_8 extends U_1["_"] ? T_8 extends {
                notNull: true;
            } ? true : false : never : never;
            hasDefault: U_1["_"] extends infer T_9 ? T_9 extends U_1["_"] ? T_9 extends {
                hasDefault: true;
            } ? true : false : never : never;
            isPrimaryKey: U_1["_"] extends infer T_10 ? T_10 extends U_1["_"] ? T_10 extends {
                isPrimaryKey: true;
            } ? true : false : never : never;
            isAutoincrement: U_1["_"] extends infer T_11 ? T_11 extends U_1["_"] ? T_11 extends {
                isAutoincrement: true;
            } ? true : false : never : never;
            hasRuntimeDefault: U_1["_"] extends infer T_12 ? T_12 extends U_1["_"] ? T_12 extends {
                hasRuntimeDefault: true;
            } ? true : false : never : never;
            enumValues: U_1["_"]["enumValues"];
            baseColumn: U_1["_"] extends infer T_13 ? T_13 extends U_1["_"] ? T_13 extends {
                baseBuilder: infer U_1 extends ColumnBuilderBase<import("drizzle-orm").ColumnBuilderBaseConfig<import("drizzle-orm").ColumnDataType, string>, object>;
            } ? import("drizzle-orm").Column<any, {}, Omit<U_1["_"], "name" | "tableName" | "data" | "driverParam" | "notNull" | "hasDefault" | "isPrimaryKey" | "isAutoincrement" | "hasRuntimeDefault" | "dataType" | "columnType" | "enumValues" | "identity" | "brand" | "generated" | "dialect" | "baseColumn"> extends infer T_14 ? { [K in keyof T_14]: Omit<U_1["_"], "name" | "tableName" | "data" | "driverParam" | "notNull" | "hasDefault" | "isPrimaryKey" | "isAutoincrement" | "hasRuntimeDefault" | "dataType" | "columnType" | "enumValues" | "identity" | "brand" | "generated" | "dialect" | "baseColumn">[K]; } : never> : never : never : never;
            identity: U_1["_"] extends infer T_15 ? T_15 extends U_1["_"] ? T_15 extends {
                identity: "always";
            } ? "always" : T_15 extends {
                identity: "byDefault";
            } ? "byDefault" : undefined : never : never;
            generated: U_1["_"] extends infer T_16 ? T_16 extends U_1["_"] ? T_16 extends {
                generated: infer G;
            } ? unknown extends G ? undefined : G extends undefined ? undefined : G : undefined : never : never;
        }, {}, Omit<U_1["_"], "name" | "tableName" | "data" | "driverParam" | "notNull" | "hasDefault" | "isPrimaryKey" | "isAutoincrement" | "hasRuntimeDefault" | "dataType" | "columnType" | "enumValues" | "identity" | "brand" | "generated" | "dialect" | "baseColumn"> extends infer T_17 ? { [K in keyof T_17]: Omit<U_1["_"], "name" | "tableName" | "data" | "driverParam" | "notNull" | "hasDefault" | "isPrimaryKey" | "isAutoincrement" | "hasRuntimeDefault" | "dataType" | "columnType" | "enumValues" | "identity" | "brand" | "generated" | "dialect" | "baseColumn">[K]; } : never> : never : never : never;
        identity: Omit<columns[Key]["_"], "name"> & {
            name: columns[Key]["_"]["name"] extends "" ? import("drizzle-orm").Assume<Key, string> : columns[Key]["_"]["name"];
        } extends infer T_18 ? T_18 extends Omit<columns[Key]["_"], "name"> & {
            name: columns[Key]["_"]["name"] extends "" ? import("drizzle-orm").Assume<Key, string> : columns[Key]["_"]["name"];
        } ? T_18 extends {
            identity: "always";
        } ? "always" : T_18 extends {
            identity: "byDefault";
        } ? "byDefault" : undefined : never : never;
        generated: Omit<columns[Key]["_"], "name"> & {
            name: columns[Key]["_"]["name"] extends "" ? import("drizzle-orm").Assume<Key, string> : columns[Key]["_"]["name"];
        } extends infer T_19 ? T_19 extends Omit<columns[Key]["_"], "name"> & {
            name: columns[Key]["_"]["name"] extends "" ? import("drizzle-orm").Assume<Key, string> : columns[Key]["_"]["name"];
        } ? T_19 extends {
            generated: infer G;
        } ? unknown extends G ? undefined : G extends undefined ? undefined : G : undefined : never : never;
    }, {}, Omit<Omit<columns[Key]["_"], "name"> & {
        name: columns[Key]["_"]["name"] extends "" ? import("drizzle-orm").Assume<Key, string> : columns[Key]["_"]["name"];
    }, "name" | "tableName" | "data" | "driverParam" | "notNull" | "hasDefault" | "isPrimaryKey" | "isAutoincrement" | "hasRuntimeDefault" | "dataType" | "columnType" | "enumValues" | "identity" | "brand" | "generated" | "dialect" | "baseColumn"> extends infer T_20 ? { [K_1 in keyof T_20]: Omit<Omit<columns[Key]["_"], "name"> & {
        name: columns[Key]["_"]["name"] extends "" ? import("drizzle-orm").Assume<Key, string> : columns[Key]["_"]["name"];
    }, "name" | "tableName" | "data" | "driverParam" | "notNull" | "hasDefault" | "isPrimaryKey" | "isAutoincrement" | "hasRuntimeDefault" | "dataType" | "columnType" | "enumValues" | "identity" | "brand" | "generated" | "dialect" | "baseColumn">[K_1]; } : never>; };
    extra: extra;
    dialect: "pg";
}>;
export declare const isPgEnumSym: unique symbol;
export type OnchainEnum<TValues extends [string, ...string[]]> = {
    (): PgEnumColumnBuilderInitial<"", TValues>;
    <TName extends string>(name: TName): PgEnumColumnBuilderInitial<TName, TValues>;
    <TName extends string>(name?: TName): PgEnumColumnBuilderInitial<TName, TValues>;
    readonly enumName: string;
    readonly enumValues: TValues;
    readonly schema: string | undefined;
    /** @internal */
    [isPgEnumSym]: true;
} & {
    [onchain]: true;
};
export declare const onchainEnum: <U extends string, T extends readonly [U, ...U[]]>(enumName: string, values: T | Writable<T>) => OnchainEnum<Writable<T>>;
//# sourceMappingURL=onchain.d.ts.map