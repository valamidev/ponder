import type { CliOptions } from '../bin/ponder.js';
import type { LevelWithSilent } from "pino";
import { type SemVer } from "semver";
export type Options = {
    command: "dev" | "start" | "serve" | "codegen" | "list" | "prune";
    version: SemVer | null;
    configFile: string;
    schemaFile: string;
    apiDir: string;
    apiFile: string;
    rootDir: string;
    indexingDir: string;
    generatedDir: string;
    ponderDir: string;
    logDir: string;
    port: number;
    hostname?: string;
    telemetryUrl: string;
    telemetryDisabled: boolean;
    telemetryConfigDir: string | undefined;
    logLevel: LevelWithSilent;
    logFormat: "json" | "pretty";
    databaseHeartbeatInterval: number;
    databaseHeartbeatTimeout: number;
    databaseMaxQueryParameters: number;
    factoryAddressCountThreshold: number;
    indexingCacheMaxBytes: number;
    rpcMaxConcurrency: number;
    syncEventsQuerySize: number;
};
export declare const buildOptions: ({ cliOptions }: {
    cliOptions: CliOptions;
}) => {
    command: "codegen" | "dev" | "start" | "serve";
    version: SemVer | null;
    rootDir: string;
    configFile: string;
    schemaFile: string;
    apiDir: string;
    apiFile: string;
    indexingDir: string;
    generatedDir: string;
    ponderDir: string;
    logDir: string;
    port: number;
    hostname: string | undefined;
    telemetryUrl: string;
    telemetryDisabled: boolean;
    telemetryConfigDir: undefined;
    logLevel: import("pino").default.LevelWithSilent;
    logFormat: "pretty" | "json";
    databaseHeartbeatInterval: number;
    databaseHeartbeatTimeout: number;
    databaseMaxQueryParameters: number;
    factoryAddressCountThreshold: number;
    rpcMaxConcurrency: number;
    indexingCacheMaxBytes: number;
    syncEventsQuerySize: number;
};
//# sourceMappingURL=options.d.ts.map