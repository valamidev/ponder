import { SQL, getTableName, is } from "drizzle-orm";
import { CasingCache, toCamelCase, toSnakeCase } from "drizzle-orm/casing";
import { PgDialect, PgEnumColumn, PgMaterializedView, PgSchema, PgTable, PgView, getTableConfig, index, integer, isPgEnum, isPgSequence, pgSchema, pgTable, serial, varchar, } from "drizzle-orm/pg-core";
export const sqlToReorgTableName = (tableName) => `_reorg__${tableName}`;
export const getReorgTable = (table) => {
    const schema = getTableConfig(table).schema;
    if (schema && schema !== "public") {
        return pgSchema(schema).table(sqlToReorgTableName(getTableName(table)), {
            operation_id: serial().notNull().primaryKey(),
            operation: integer().notNull().$type(),
            checkpoint: varchar({ length: 75 }).notNull(),
        }, (table) => [index().on(table.checkpoint)]);
    }
    return pgTable(sqlToReorgTableName(getTableName(table)), {
        operation_id: serial().notNull().primaryKey(),
        operation: integer().notNull().$type(),
        checkpoint: varchar({ length: 75 }).notNull(),
    }, (table) => [index().on(table.checkpoint)]);
};
export const getSql = (schema) => {
    const { tables, enums, schemas } = prepareFromExports(schema);
    const json = generatePgSnapshot(tables, enums, schemas, "snake_case");
    const squashed = squashPgScheme(json);
    const jsonCreateIndexesForCreatedTables = Object.values(squashed.tables).flatMap((it) => {
        // @ts-ignore
        return preparePgCreateIndexesJson(it.name, it.schema, it.indexes);
    });
    const jsonCreateEnums = Object.values(squashed.enums).map((it) => {
        // @ts-ignore
        return prepareCreateEnumJson(it.name, it.schema, it.values);
    }) ?? [];
    const jsonCreateTables = Object.values(squashed.tables).map((it) => {
        return preparePgCreateTableJson(it, json);
    });
    const fromJson = (statements) => statements
        .flatMap((statement) => {
        const filtered = convertors.filter((it) => {
            return it.can(statement, "postgresql");
        });
        const convertor = filtered.length === 1 ? filtered[0] : undefined;
        if (!convertor) {
            return "";
        }
        return convertor.convert(statement);
    })
        .filter((it) => it !== "");
    const combinedTables = jsonCreateTables.flatMap((statement) => [
        statement,
        createReorgTableStatement(statement),
    ]);
    return {
        tables: {
            sql: fromJson(combinedTables),
            json: combinedTables,
        },
        enums: { sql: fromJson(jsonCreateEnums), json: jsonCreateEnums },
        indexes: {
            sql: fromJson(jsonCreateIndexesForCreatedTables),
            json: jsonCreateIndexesForCreatedTables,
        },
    };
};
const createReorgTableStatement = (statement) => {
    const reorgStatement = structuredClone(statement);
    reorgStatement.compositePkName = undefined;
    reorgStatement.compositePKs = [];
    for (const column of reorgStatement.columns) {
        column.primaryKey = false;
    }
    const reorgColumns = Object.values(squashPgScheme(generatePgSnapshot([
        pgTable("", {
            operation_id: serial().notNull().primaryKey(),
            operation: integer().notNull(),
            checkpoint: varchar({
                length: 75,
            }).notNull(),
        }),
    ], [], [], "snake_case")).tables)[0].columns;
    reorgStatement.columns.push(...Object.values(reorgColumns));
    reorgStatement.tableName = sqlToReorgTableName(reorgStatement.tableName);
    return reorgStatement;
};
const PgSquasher = {
    squashIdx: (idx) => {
        return `${idx.name};${idx.columns
            .map((c) => `${c.expression}--${c.isExpression}--${c.asc}--${c.nulls}--${c.opclass && ""}`)
            .join(",,")};${idx.isUnique};${idx.concurrently};${idx.method};${idx.where};${JSON.stringify(idx.with)}`;
    },
    unsquashIdx: (input) => {
        const [name, columnsString, isUnique, concurrently, method, where, idxWith,] = input.split(";");
        const columnString = columnsString.split(",,");
        const columns = [];
        for (const column of columnString) {
            const [expression, isExpression, asc, nulls, opclass] = column.split("--");
            columns.push({
                nulls: nulls,
                isExpression: isExpression === "true",
                asc: asc === "true",
                expression: expression,
                opclass: opclass === "undefined" ? undefined : opclass,
            });
        }
        return {
            name,
            columns,
            isUnique: isUnique === "true",
            concurrently: concurrently === "true",
            method,
            where: where === "undefined" ? undefined : where,
            with: !idxWith || idxWith === "undefined" ? undefined : JSON.parse(idxWith),
        };
    },
    squashPK: (pk) => {
        return `${pk.columns.join(",")};${pk.name}`;
    },
    unsquashPK: (pk) => {
        const splitted = pk.split(";");
        return { name: splitted[1], columns: splitted[0].split(",") };
    },
};
////////
// Generator
////////
const parseType = (schemaPrefix, type) => {
    const pgNativeTypes = [
        "uuid",
        "smallint",
        "integer",
        "bigint",
        "boolean",
        "text",
        "varchar",
        "serial",
        "bigserial",
        "decimal",
        "numeric",
        "real",
        "json",
        "jsonb",
        "time",
        "time with time zone",
        "time without time zone",
        "time",
        "timestamp",
        "timestamp with time zone",
        "timestamp without time zone",
        "date",
        "interval",
        "bigint",
        "bigserial",
        "double precision",
        "interval year",
        "interval month",
        "interval day",
        "interval hour",
        "interval minute",
        "interval second",
        "interval year to month",
        "interval day to hour",
        "interval day to minute",
        "interval day to second",
        "interval hour to minute",
        "interval hour to second",
        "interval minute to second",
    ];
    const arrayDefinitionRegex = /\[\d*(?:\[\d*\])*\]/g;
    const arrayDefinition = (type.match(arrayDefinitionRegex) ?? []).join("");
    const withoutArrayDefinition = type.replace(arrayDefinitionRegex, "");
    return pgNativeTypes.some((it) => type.startsWith(it))
        ? `${withoutArrayDefinition}${arrayDefinition}`
        : `${schemaPrefix}"${withoutArrayDefinition}"${arrayDefinition}`;
};
class Convertor {
}
class PgCreateTableConvertor extends Convertor {
    can(statement, dialect) {
        return statement.type === "create_table" && dialect === "postgresql";
    }
    convert(st) {
        const { tableName, schema, columns, compositePKs } = st;
        let statement = "";
        const name = schema ? `"${schema}"."${tableName}"` : `"${tableName}"`;
        statement += `CREATE TABLE ${name} (\n`;
        for (let i = 0; i < columns.length; i++) {
            const column = columns[i];
            const primaryKeyStatement = column.primaryKey ? " PRIMARY KEY" : "";
            const notNullStatement = column.notNull && !column.identity ? " NOT NULL" : "";
            const defaultStatement = column.default !== undefined ? ` DEFAULT ${column.default}` : "";
            // const uniqueConstraint = column.isUnique
            //   ? ` CONSTRAINT "${column.uniqueName}" UNIQUE${column.nullsNotDistinct ? " NULLS NOT DISTINCT" : ""}`
            //   : "";
            const schemaPrefix = column.typeSchema && column.typeSchema !== "public"
                ? `"${column.typeSchema}".`
                : "";
            const type = parseType(schemaPrefix, column.type);
            // const generated = column.generated;
            // const generatedStatement = generated
            //   ? ` GENERATED ALWAYS AS (${generated?.as}) STORED`
            //   : "";
            // const unsquashedIdentity = column.identity
            //   ? PgSquasher.unsquashIdentity(column.identity)
            //   : undefined;
            // const identityWithSchema = schema
            //   ? `"${schema}"."${unsquashedIdentity?.name}"`
            //   : `"${unsquashedIdentity?.name}"`;
            // const identity = unsquashedIdentity
            //   ? ` GENERATED ${
            //       unsquashedIdentity.type === "always" ? "ALWAYS" : "BY DEFAULT"
            //     } AS IDENTITY (sequence name ${identityWithSchema}${
            //       unsquashedIdentity.increment
            //         ? ` INCREMENT BY ${unsquashedIdentity.increment}`
            //         : ""
            //     }${
            //       unsquashedIdentity.minValue
            //         ? ` MINVALUE ${unsquashedIdentity.minValue}`
            //         : ""
            //     }${
            //       unsquashedIdentity.maxValue
            //         ? ` MAXVALUE ${unsquashedIdentity.maxValue}`
            //         : ""
            //     }${
            //       unsquashedIdentity.startWith
            //         ? ` START WITH ${unsquashedIdentity.startWith}`
            //         : ""
            //     }${unsquashedIdentity.cache ? ` CACHE ${unsquashedIdentity.cache}` : ""}${
            //       unsquashedIdentity.cycle ? " CYCLE" : ""
            //     })`
            //   : "";
            statement += `\t"${column.name}" ${type}${primaryKeyStatement}${defaultStatement}${notNullStatement}`;
            statement += i === columns.length - 1 ? "" : ",\n";
        }
        if (typeof compositePKs !== "undefined" && compositePKs.length > 0) {
            statement += ",\n";
            const compositePK = PgSquasher.unsquashPK(compositePKs[0]);
            statement += `\tCONSTRAINT "${st.compositePkName}" PRIMARY KEY(\"${compositePK.columns.join(`","`)}\")`;
            // statement += `\n`;
        }
        // if (
        //   typeof uniqueConstraints !== "undefined" &&
        //   uniqueConstraints.length > 0
        // ) {
        //   for (const uniqueConstraint of uniqueConstraints) {
        //     statement += ",\n";
        //     const unsquashedUnique = PgSquasher.unsquashUnique(uniqueConstraint);
        //     statement += `\tCONSTRAINT "${unsquashedUnique.name}" UNIQUE${
        //       unsquashedUnique.nullsNotDistinct ? " NULLS NOT DISTINCT" : ""
        //     }(\"${unsquashedUnique.columns.join(`","`)}\")`;
        //     // statement += `\n`;
        //   }
        // }
        // if (
        //   typeof checkConstraints !== "undefined" &&
        //   checkConstraints.length > 0
        // ) {
        //   for (const checkConstraint of checkConstraints) {
        //     statement += ",\n";
        //     const unsquashedCheck = PgSquasher.unsquashCheck(checkConstraint);
        //     statement += `\tCONSTRAINT "${unsquashedCheck.name}" CHECK (${unsquashedCheck.value})`;
        //   }
        // }
        statement += "\n);";
        statement += "\n";
        return statement;
    }
}
class CreateTypeEnumConvertor extends Convertor {
    can(statement) {
        return statement.type === "create_type_enum";
    }
    convert(st) {
        const { name, values, schema } = st;
        const enumNameWithSchema = schema ? `"${schema}"."${name}"` : `"${name}"`;
        let valuesStatement = "(";
        valuesStatement += values.map((it) => `'${it}'`).join(", ");
        valuesStatement += ")";
        // TODO do we need this?
        // let statement = 'DO $$ BEGIN';
        // statement += '\n';
        const statement = `CREATE TYPE ${enumNameWithSchema} AS ENUM${valuesStatement};`;
        // statement += '\n';
        // statement += 'EXCEPTION';
        // statement += '\n';
        // statement += ' WHEN duplicate_object THEN null;';
        // statement += '\n';
        // statement += 'END $$;';
        // statement += '\n';
        return statement;
    }
}
class CreatePgIndexConvertor extends Convertor {
    can(statement, dialect) {
        return statement.type === "create_index_pg" && dialect === "postgresql";
    }
    convert(statement) {
        const { name, columns, isUnique, concurrently, with: withMap, method, where, } = statement.data;
        // // since postgresql 9.5
        const indexPart = isUnique ? "UNIQUE INDEX" : "INDEX";
        const value = columns
            .map((it) => `${it.isExpression ? it.expression : `"${it.expression}"`}${it.opclass ? ` ${it.opclass}` : it.asc ? "" : " DESC"}${(it.asc && it.nulls && it.nulls === "last") || it.opclass
            ? ""
            : ` NULLS ${it.nulls.toUpperCase()}`}`)
            .join(",");
        const tableNameWithSchema = statement.schema
            ? `"${statement.schema}"."${statement.tableName}"`
            : `"${statement.tableName}"`;
        function reverseLogic(mappedWith) {
            let reversedString = "";
            for (const key in mappedWith) {
                // biome-ignore lint/suspicious/noPrototypeBuiltins: <explanation>
                if (mappedWith.hasOwnProperty(key)) {
                    reversedString += `${key}=${mappedWith[key]},`;
                }
            }
            reversedString = reversedString.slice(0, -1);
            return reversedString;
        }
        return `CREATE ${indexPart}${concurrently ? " CONCURRENTLY" : ""} IF NOT EXISTS "${name}" ON ${tableNameWithSchema} USING ${method} (${value})${Object.keys(withMap).length !== 0
            ? ` WITH (${reverseLogic(withMap)})`
            : ""}${where ? ` WHERE ${where}` : ""};`;
    }
}
class PgCreateSchemaConvertor extends Convertor {
    can(statement, dialect) {
        return statement.type === "create_schema" && dialect === "postgresql";
    }
    convert(statement) {
        const { name } = statement;
        return `CREATE SCHEMA IF NOT EXISTS"${name}";\n`;
    }
}
const convertors = [];
convertors.push(new PgCreateTableConvertor());
convertors.push(new CreateTypeEnumConvertor());
convertors.push(new CreatePgIndexConvertor());
convertors.push(new PgCreateSchemaConvertor());
const preparePgCreateTableJson = (table, json) => {
    const { name, schema, columns, compositePrimaryKeys } = table;
    const tableKey = `${schema || "public"}.${name}`;
    // TODO: @AndriiSherman. We need this, will add test cases
    const compositePkName = Object.values(compositePrimaryKeys).length > 0
        ? json.tables[tableKey].compositePrimaryKeys[`${PgSquasher.unsquashPK(Object.values(compositePrimaryKeys)[0]).name}`].name
        : "";
    return {
        type: "create_table",
        tableName: name,
        schema,
        columns: Object.values(columns),
        compositePKs: Object.values(compositePrimaryKeys),
        compositePkName: compositePkName,
    };
};
const preparePgCreateIndexesJson = (tableName, schema, indexes) => {
    return Object.values(indexes).map((indexData) => {
        return {
            type: "create_index_pg",
            tableName,
            data: PgSquasher.unsquashIdx(indexData),
            schema,
        };
    });
};
const prepareCreateEnumJson = (name, schema, values) => {
    return {
        type: "create_type_enum",
        name: name,
        schema: schema,
        values,
    };
};
const prepareFromExports = (exports) => {
    const tables = [];
    const enums = [];
    const schemas = [];
    const sequences = [];
    const views = [];
    const matViews = [];
    const i0values = Object.values(exports);
    i0values.forEach((t) => {
        if (isPgEnum(t)) {
            enums.push(t);
            return;
        }
        if (is(t, PgTable)) {
            tables.push(t);
        }
        if (is(t, PgSchema)) {
            schemas.push(t);
        }
        if (is(t, PgView)) {
            views.push(t);
        }
        if (is(t, PgMaterializedView)) {
            matViews.push(t);
        }
        if (isPgSequence(t)) {
            sequences.push(t);
        }
    });
    return { tables, enums, schemas, sequences, views, matViews };
};
export function getColumnCasing(column, casing) {
    if (!column.name)
        return "";
    return !column.keyAsName || casing === undefined
        ? column.name
        : casing === "camelCase"
            ? toCamelCase(column.name)
            : toSnakeCase(column.name);
}
const sqlToStr = (sql, casing) => {
    return sql.toQuery({
        escapeName: () => {
            throw new Error("we don't support params for `sql` default values");
        },
        escapeParam: () => {
            throw new Error("we don't support params for `sql` default values");
        },
        escapeString: () => {
            throw new Error("we don't support params for `sql` default values");
        },
        casing: new CasingCache(casing),
    }).sql;
};
function isPgArrayType(sqlType) {
    return sqlType.match(/.*\[\d*\].*|.*\[\].*/g) !== null;
}
function buildArrayString(array, sqlType) {
    sqlType = sqlType.split("[")[0];
    const values = array
        .map((value) => {
        if (typeof value === "number" || typeof value === "bigint") {
            return value.toString();
        }
        else if (typeof value === "boolean") {
            return value ? "true" : "false";
        }
        else if (Array.isArray(value)) {
            return buildArrayString(value, sqlType);
        }
        else if (value instanceof Date) {
            if (sqlType === "date") {
                return `"${value.toISOString().split("T")[0]}"`;
            }
            else if (sqlType === "timestamp") {
                return `"${value.toISOString().replace("T", " ").slice(0, 23)}"`;
            }
            else {
                return `"${value.toISOString()}"`;
            }
        }
        else if (typeof value === "object") {
            return `"${JSON.stringify(value).replaceAll('"', '\\"')}"`;
        }
        return `"${value}"`;
    })
        .join(",");
    return `{${values}}`;
}
const indexName = (tableName, columns) => {
    return `${tableName}_${columns.join("_")}_index`;
};
const generatePgSnapshot = (tables, enums, schemas, casing) => {
    const dialect = new PgDialect({ casing });
    const result = {};
    // This object stores unique names for indexes and will be used to detect if you have the same names for indexes
    // within the same PostgreSQL schema
    const indexesInSchema = {};
    for (const table of tables) {
        const { name: tableName, columns, indexes, schema, primaryKeys, } = getTableConfig(table);
        const columnsObject = {};
        const indexesObject = {};
        const primaryKeysObject = {};
        columns.forEach((column) => {
            const name = getColumnCasing(column, casing);
            const notNull = column.notNull;
            const primaryKey = column.primary;
            const sqlTypeLowered = column.getSQLType().toLowerCase();
            const typeSchema = is(column, PgEnumColumn)
                ? column.enum.schema || "public"
                : undefined;
            const columnToSet = {
                name,
                type: column.getSQLType(),
                typeSchema: typeSchema,
                primaryKey,
                notNull,
            };
            if (column.default !== undefined) {
                if (is(column.default, SQL)) {
                    columnToSet.default = sqlToStr(column.default, casing);
                }
                else {
                    if (typeof column.default === "string") {
                        columnToSet.default = `'${column.default}'`;
                    }
                    else {
                        if (sqlTypeLowered === "jsonb" || sqlTypeLowered === "json") {
                            columnToSet.default = `'${JSON.stringify(column.default)}'::${sqlTypeLowered}`;
                        }
                        else if (column.default instanceof Date) {
                            if (sqlTypeLowered === "date") {
                                columnToSet.default = `'${column.default.toISOString().split("T")[0]}'`;
                            }
                            else if (sqlTypeLowered === "timestamp") {
                                columnToSet.default = `'${column.default.toISOString().replace("T", " ").slice(0, 23)}'`;
                            }
                            else {
                                columnToSet.default = `'${column.default.toISOString()}'`;
                            }
                        }
                        else if (isPgArrayType(sqlTypeLowered) &&
                            Array.isArray(column.default)) {
                            columnToSet.default = `'${buildArrayString(column.default, sqlTypeLowered)}'`;
                        }
                        else {
                            // Should do for all types
                            // columnToSet.default = `'${column.default}'::${sqlTypeLowered}`;
                            columnToSet.default = column.default;
                        }
                    }
                }
            }
            columnsObject[name] = columnToSet;
        });
        primaryKeys.map((pk) => {
            const originalColumnNames = pk.columns.map((c) => c.name);
            const columnNames = pk.columns.map((c) => getColumnCasing(c, casing));
            let name = pk.getName();
            if (casing !== undefined) {
                for (let i = 0; i < originalColumnNames.length; i++) {
                    name = name.replace(originalColumnNames[i], columnNames[i]);
                }
            }
            primaryKeysObject[name] = {
                name,
                columns: columnNames,
            };
        });
        indexes.forEach((value) => {
            const columns = value.config.columns;
            const indexColumnNames = [];
            columns.forEach((it) => {
                const name = getColumnCasing(it, casing);
                indexColumnNames.push(name);
            });
            const name = value.config.name
                ? value.config.name
                : indexName(tableName, indexColumnNames);
            const indexColumns = columns.map((it) => {
                if (is(it, SQL)) {
                    return {
                        expression: dialect.sqlToQuery(it, "indexes").sql,
                        asc: true,
                        isExpression: true,
                        nulls: "last",
                    };
                }
                else {
                    it = it;
                    return {
                        expression: getColumnCasing(it, casing),
                        isExpression: false,
                        // @ts-ignore
                        asc: it.indexConfig?.order === "asc",
                        // @ts-ignore
                        nulls: it.indexConfig?.nulls
                            ? // @ts-ignore
                                it.indexConfig?.nulls
                            : // @ts-ignore
                                it.indexConfig?.order === "desc"
                                    ? "first"
                                    : "last",
                        // @ts-ignore
                        opclass: it.indexConfig?.opClass,
                    };
                }
            });
            // check for index names duplicates
            if (typeof indexesInSchema[schema ?? "public"] !== "undefined") {
                indexesInSchema[schema ?? "public"].push(name);
            }
            else {
                indexesInSchema[schema ?? "public"] = [name];
            }
            indexesObject[name] = {
                name,
                columns: indexColumns,
                isUnique: value.config.unique ?? false,
                where: value.config.where
                    ? dialect.sqlToQuery(value.config.where).sql
                    : undefined,
                concurrently: value.config.concurrently ?? false,
                method: value.config.method ?? "btree",
                with: value.config.with ?? {},
            };
        });
        const tableKey = `${schema ?? "public"}.${tableName}`;
        result[tableKey] = {
            name: tableName,
            schema: schema ?? "",
            columns: columnsObject,
            indexes: indexesObject,
            compositePrimaryKeys: primaryKeysObject,
        };
    }
    const enumsToReturn = enums.reduce((map, obj) => {
        const enumSchema = obj.schema || "public";
        const key = `${enumSchema}.${obj.enumName}`;
        map[key] = {
            name: obj.enumName,
            schema: enumSchema,
            values: obj.enumValues,
        };
        return map;
    }, {});
    const schemasObject = Object.fromEntries(schemas
        .filter((it) => {
        return it.schemaName !== "public";
    })
        .map((it) => [it.schemaName, it.schemaName]));
    return {
        version: "7",
        dialect: "postgresql",
        tables: result,
        enums: enumsToReturn,
        schemas: schemasObject,
    };
};
const mapValues = (obj, map) => {
    const result = Object.keys(obj).reduce((result, key) => {
        result[key] = map(obj[key]);
        return result;
    }, {});
    return result;
};
const squashPgScheme = (json) => {
    const mappedTables = Object.fromEntries(Object.entries(json.tables).map((it) => {
        const squashedIndexes = mapValues(it[1].indexes, (index) => {
            return PgSquasher.squashIdx(index);
        });
        const squashedPKs = mapValues(it[1].compositePrimaryKeys, (pk) => {
            return PgSquasher.squashPK(pk);
        });
        const mappedColumns = Object.fromEntries(Object.entries(it[1].columns).map((it) => {
            return [
                it[0],
                {
                    ...it[1],
                    identity: undefined,
                },
            ];
        }));
        return [
            it[0],
            {
                name: it[1].name,
                schema: it[1].schema,
                columns: mappedColumns,
                indexes: squashedIndexes,
                compositePrimaryKeys: squashedPKs,
            },
        ];
    }));
    return {
        version: "7",
        dialect: json.dialect,
        tables: mappedTables,
        enums: json.enums,
        schemas: json.schemas,
        views: json.views,
    };
};
//# sourceMappingURL=index.js.map