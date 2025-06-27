import type { IndexingCache } from '../indexing-store/cache.js';
import type { IndexingStore } from '../indexing-store/index.js';
import type { CachedViemClient } from './client.js';
import type { Common } from '../internal/common.js';
import type { Event, IndexingBuild, Schema, SetupEvent } from '../internal/types.js';
import type { Db } from '../types/db.js';
import type { DeepPartial } from '../types/utils.js';
import type { Abi, Address } from "viem";
import type { ReadonlyClient } from "./client.js";
export type Context = {
    chain: {
        id: number;
        name: string;
    };
    client: ReadonlyClient;
    db: Db<Schema>;
    contracts: Record<string, {
        abi: Abi;
        address?: Address | readonly Address[];
        startBlock?: number;
        endBlock?: number;
    }>;
};
export type Indexing = {
    processSetupEvents: (params: {
        db: IndexingStore;
    }) => Promise<{
        status: "error";
        error: Error;
    } | {
        status: "success";
    }>;
    processEvents: (params: {
        events: Event[];
        db: IndexingStore;
        cache?: IndexingCache;
    }) => Promise<{
        status: "error";
        error: Error;
    } | {
        status: "success";
    }>;
};
export declare const createIndexing: ({ common, indexingBuild: { sources, chains, indexingFunctions }, client, eventCount, }: {
    common: Common;
    indexingBuild: Pick<IndexingBuild, "sources" | "chains" | "indexingFunctions">;
    client: CachedViemClient;
    eventCount: {
        [eventName: string]: number;
    };
}) => Indexing;
export declare const toErrorMeta: (event: DeepPartial<Event> | DeepPartial<SetupEvent>) => string | undefined;
export declare const addErrorMeta: (error: unknown, meta: string | undefined) => void;
//# sourceMappingURL=index.d.ts.map