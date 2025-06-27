/**
 * Validate a SQL query.
 *
 * @param sql - SQL query
 * @param shouldValidateInnerNode - `true` if the properties of each ast node should be validated, else only the allow list is checked
 */
export declare const validateQuery: (sql: string, shouldValidateInnerNode?: boolean) => Promise<void>;
/**
 * Find all table names in a SQL query.
 *
 * @param sql - SQL query
 */
export declare const findTableNames: (sql: string) => Promise<Set<string>>;
//# sourceMappingURL=parse.d.ts.map