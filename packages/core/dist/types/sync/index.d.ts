import type { Common } from '../internal/common.js';
import type { Chain, CrashRecoveryCheckpoint, Event, Filter, IndexingBuild, LightBlock, RawEvent, Seconds, Source, SyncBlock, SyncBlockHeader } from '../internal/types.js';
import type { Rpc } from '../rpc/index.js';
import { type HistoricalSync } from '../sync-historical/index.js';
import { type RealtimeSyncEvent } from '../sync-realtime/index.js';
import type { SyncStore } from '../sync-store/index.js';
import { type Checkpoint } from '../utils/checkpoint.js';
export type Sync = {
    getEvents(): EventGenerator;
    startRealtime(): Promise<void>;
    getStartCheckpoint(chain: Chain): string;
    seconds: Seconds;
};
export type RealtimeEvent = {
    type: "block";
    chain: Chain;
    events: Event[];
    /**
     * Closest-to-tip checkpoint for each chain,
     * excluding chains that were not updated with this event.
     */
    checkpoints: {
        chainId: number;
        checkpoint: string;
    }[];
} | {
    type: "reorg";
    chain: Chain;
    checkpoint: string;
} | {
    type: "finalize";
    chain: Chain;
    checkpoint: string;
};
type EventGenerator = AsyncGenerator<{
    events: Event[];
    /**
     * Closest-to-tip checkpoint for each chain,
     * excluding chains that were not updated with this batch of events.
     */
    checkpoints: {
        chainId: number;
        checkpoint: string;
    }[];
}>;
export type SyncProgress = {
    start: SyncBlock | LightBlock;
    end: SyncBlock | LightBlock | undefined;
    current: SyncBlock | LightBlock | undefined;
    finalized: SyncBlock | LightBlock;
};
export declare const syncBlockToLightBlock: ({ hash, parentHash, number, timestamp, }: SyncBlock | SyncBlockHeader) => LightBlock;
/** Convert `block` to a `Checkpoint`. */
export declare const blockToCheckpoint: (block: LightBlock | SyncBlock, chainId: number, rounding: "up" | "down") => Checkpoint;
export declare const splitEvents: (events: Event[]) => {
    events: Event[];
    chainId: number;
    checkpoint: string;
}[];
/**
 * Returns the checkpoint for a given block tag.
 */
export declare const getChainCheckpoint: <tag extends "finalized" | "end" | "start" | "current">({ syncProgress, chain, tag, }: {
    syncProgress: SyncProgress;
    chain: Chain;
    tag: tag;
}) => tag extends "end" ? string | undefined : string;
export declare const createSync: (params: {
    common: Common;
    indexingBuild: Pick<IndexingBuild, "sources" | "chains" | "rpcs" | "finalizedBlocks">;
    syncStore: SyncStore;
    onRealtimeEvent(event: RealtimeEvent): Promise<void>;
    onFatalError(error: Error): void;
    crashRecoveryCheckpoint: CrashRecoveryCheckpoint;
    ordering: "omnichain" | "multichain";
}) => Promise<Sync>;
export declare const getPerChainOnRealtimeSyncEvent: ({ common, chain, sources, syncStore, syncProgress, }: {
    common: Common;
    chain: Chain;
    sources: Source[];
    syncStore: SyncStore;
    syncProgress: SyncProgress;
}) => (event: RealtimeSyncEvent) => Promise<void>;
export declare function getLocalEventGenerator(params: {
    common: Common;
    chain: Chain;
    syncStore: SyncStore;
    sources: Source[];
    localSyncGenerator: AsyncGenerator<number>;
    from: string;
    to: string;
    limit: number;
}): AsyncGenerator<{
    events: RawEvent[];
    checkpoint: string;
}>;
export declare function getLocalSyncGenerator({ common, chain, syncProgress, historicalSync, }: {
    common: Common;
    chain: Chain;
    syncProgress: SyncProgress;
    historicalSync: HistoricalSync;
}): AsyncGenerator<number>;
export declare const getLocalSyncProgress: ({ common, sources, chain, rpc, finalizedBlock, intervalsCache, }: {
    common: Common;
    sources: Source[];
    chain: Chain;
    rpc: Rpc;
    finalizedBlock: LightBlock;
    intervalsCache: HistoricalSync["intervalsCache"];
}) => Promise<SyncProgress>;
/** Returns the closest-to-tip block that has been synced for all `sources`. */
export declare const getCachedBlock: ({ filters, intervalsCache, }: {
    filters: Filter[];
    intervalsCache: HistoricalSync["intervalsCache"];
}) => number | undefined;
/**
 * Merges multiple event generators into a single generator while preserving
 * the order of events.
 *
 * @param generators - Generators to merge.
 * @returns A single generator that yields events from all generators.
 */
export declare function mergeAsyncGeneratorsWithEventOrder(generators: AsyncGenerator<{
    events: Event[];
    checkpoint: string;
}>[]): EventGenerator;
export {};
//# sourceMappingURL=index.d.ts.map