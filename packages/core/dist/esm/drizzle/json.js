var _a, _b, _c, _d;
import { BigIntSerializationError, getBaseError } from '../internal/errors.js';
import { entityKind } from "drizzle-orm";
import { PgColumn, PgColumnBuilder, } from "drizzle-orm/pg-core";
class PgJsonBuilder extends PgColumnBuilder {
    constructor(name) {
        super(name, "json", "PgJson");
    }
    /** @internal */
    // @ts-ignore
    build(table) {
        return new PgJson(table, this.config);
    }
}
_a = entityKind;
Object.defineProperty(PgJsonBuilder, _a, {
    enumerable: true,
    configurable: true,
    writable: true,
    value: "PgJsonBuilder"
});
export { PgJsonBuilder };
class PgJson extends PgColumn {
    getSQLType() {
        return "json";
    }
    mapToDriverValue(value) {
        try {
            return JSON.stringify(value);
        }
        catch (_error) {
            let error = getBaseError(_error);
            if (error?.message?.includes("Do not know how to serialize a BigInt")) {
                error = new BigIntSerializationError(error.message);
                error.meta.push("Hint:\n  The JSON column type does not support BigInt values. Use the replaceBigInts() helper function before inserting into the database. Docs: https://ponder.sh/docs/api-reference/ponder-utils#replacebigints");
            }
            throw error;
        }
    }
    mapFromDriverValue(value) {
        if (typeof value === "string") {
            try {
                return JSON.parse(value);
            }
            catch {
                return value;
            }
        }
        return value;
    }
}
_b = entityKind;
Object.defineProperty(PgJson, _b, {
    enumerable: true,
    configurable: true,
    writable: true,
    value: "PgJson"
});
export { PgJson };
class PgJsonbBuilder extends PgColumnBuilder {
    constructor(name) {
        super(name, "json", "PgJsonb");
    }
    /** @internal */
    // @ts-ignore
    build(table) {
        return new PgJsonb(table, this.config);
    }
}
_c = entityKind;
Object.defineProperty(PgJsonbBuilder, _c, {
    enumerable: true,
    configurable: true,
    writable: true,
    value: "PgJsonbBuilder"
});
export { PgJsonbBuilder };
class PgJsonb extends PgColumn {
    // biome-ignore lint/complexity/noUselessConstructor: <explanation>
    constructor(table, config) {
        super(table, config);
    }
    getSQLType() {
        return "jsonb";
    }
    mapToDriverValue(value) {
        try {
            return JSON.stringify(value);
        }
        catch (_error) {
            let error = getBaseError(_error);
            if (error?.message?.includes("Do not know how to serialize a BigInt")) {
                error = new BigIntSerializationError(error.message);
                error.meta.push("Hint:\n  The JSON column type does not support BigInt values. Use the replaceBigInts() helper function before inserting into the database. Docs: https://ponder.sh/docs/api-reference/ponder-utils#replacebigints");
            }
            throw error;
        }
    }
    mapFromDriverValue(value) {
        if (typeof value === "string") {
            try {
                return JSON.parse(value);
            }
            catch {
                return value;
            }
        }
        return value;
    }
}
_d = entityKind;
Object.defineProperty(PgJsonb, _d, {
    enumerable: true,
    configurable: true,
    writable: true,
    value: "PgJsonb"
});
export { PgJsonb };
//# sourceMappingURL=json.js.map