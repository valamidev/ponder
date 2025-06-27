import type { Common } from '../internal/common.js';
import type { Chain, Factory, LightBlock, Source, SyncBlock, SyncBlockHeader, SyncLog, SyncTrace, SyncTransaction, SyncTransactionReceipt } from '../internal/types.js';
import type { Rpc } from '../rpc/index.js';
import { type SyncProgress } from '../sync/index.js';
import { type Address } from "viem";
export type RealtimeSync = {
    /**
     * Fetch block event data and reconcile it into the local chain.
     *
     * @param block - The block to reconcile.
     */
    sync(block: SyncBlock | SyncBlockHeader): Promise<SyncResult>;
    onError(error: Error): void;
    /**
     * Local chain of blocks that have not been finalized.
     */
    unfinalizedBlocks: LightBlock[];
    childAddresses: Map<Factory, Map<Address, number>>;
};
/**
 * @dev Each "promise" property resolves when the corresponding
 * event is fully processed.
 */
type SyncResult = {
    type: "rejected";
} | {
    type: "reorg";
    reorgPromise: Promise<void>;
} | {
    type: "accepted";
    blockPromise: Promise<void>;
    finalizePromise?: Promise<void>;
};
export type BlockWithEventData = {
    block: SyncBlock | SyncBlockHeader;
    transactions: SyncTransaction[];
    transactionReceipts: SyncTransactionReceipt[];
    logs: SyncLog[];
    traces: SyncTrace[];
    childAddresses: Map<Factory, Set<Address>>;
};
export type RealtimeSyncEvent = ({
    type: "block";
    hasMatchedFilter: boolean;
} & BlockWithEventData) | {
    type: "finalize";
    block: LightBlock;
} | {
    type: "reorg";
    block: LightBlock;
    reorgedBlocks: LightBlock[];
};
type CreateRealtimeSyncParameters = {
    common: Common;
    chain: Chain;
    rpc: Rpc;
    sources: Source[];
    syncProgress: Pick<SyncProgress, "finalized">;
    initialChildAddresses: Map<Factory, Map<Address, number>>;
    /**
     * Handle a realtime sync event.
     *
     * @returns An unchained promise that resolves when the event is fully processed.
     */
    onEvent: (event: RealtimeSyncEvent) => Promise<{
        promise: Promise<void>;
    }>;
    onFatalError: (error: Error) => void;
};
export declare const createRealtimeSync: (args: CreateRealtimeSyncParameters) => RealtimeSync;
export {};
//# sourceMappingURL=index.d.ts.map