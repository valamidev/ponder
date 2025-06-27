import type { CliOptions } from '../bin/ponder.js';
import type { Config } from '../config/index.js';
import type { Database } from '../database/index.js';
import type { Common } from '../internal/common.js';
import type { ApiBuild, IndexingBuild, NamespaceBuild, PreBuild, RawIndexingFunctions, Schema, SchemaBuild } from '../internal/types.js';
import type { Result } from '../utils/result.js';
import { Hono } from "hono";
declare global {
    var PONDER_COMMON: Common;
    var PONDER_NAMESPACE_BUILD: NamespaceBuild;
    var PONDER_INDEXING_BUILD: IndexingBuild;
    var PONDER_DATABASE: Database;
}
type ConfigResult = Result<{
    config: Config;
    contentHash: string;
}>;
type SchemaResult = Result<{
    schema: Schema;
    contentHash: string;
}>;
type IndexingResult = Result<{
    indexingFunctions: RawIndexingFunctions;
    contentHash: string;
}>;
type ApiResult = Result<{
    app: Hono;
}>;
export type Build = {
    executeConfig: () => Promise<ConfigResult>;
    executeSchema: () => Promise<SchemaResult>;
    executeIndexingFunctions: () => Promise<IndexingResult>;
    executeApi: (params: {
        indexingBuild: IndexingBuild;
        database: Database;
    }) => Promise<ApiResult>;
    namespaceCompile: () => Result<NamespaceBuild>;
    preCompile: (params: {
        config: Config;
    }) => Promise<Result<PreBuild>>;
    compileSchema: (params: {
        schema: Schema;
    }) => Result<SchemaBuild>;
    compileIndexing: (params: {
        configResult: Extract<ConfigResult, {
            status: "success";
        }>["result"];
        schemaResult: Extract<SchemaResult, {
            status: "success";
        }>["result"];
        indexingResult: Extract<IndexingResult, {
            status: "success";
        }>["result"];
    }) => Promise<Result<IndexingBuild>>;
    compileApi: (params: {
        apiResult: Extract<ApiResult, {
            status: "success";
        }>["result"];
    }) => Promise<Result<ApiBuild>>;
    startDev: (params: {
        onReload: (kind: "indexing" | "api") => void;
    }) => void;
};
export declare const createBuild: ({ common, cliOptions, }: {
    common: Common;
    cliOptions: CliOptions;
}) => Promise<Build>;
export {};
//# sourceMappingURL=index.d.ts.map