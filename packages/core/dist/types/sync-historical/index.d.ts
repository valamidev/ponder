import type { Common } from '../internal/common.js';
import type { Chain, Filter, Fragment, Source, SyncBlock } from '../internal/types.js';
import type { Rpc } from '../rpc/index.js';
import type { SyncStore } from '../sync-store/index.js';
import { type Interval } from '../utils/interval.js';
export type HistoricalSync = {
    intervalsCache: Map<Filter, {
        fragment: Fragment;
        intervals: Interval[];
    }[]>;
    /**
     * Extract raw data for `interval` and return the closest-to-tip block
     * that is synced.
     */
    sync(interval: Interval): Promise<SyncBlock | undefined>;
};
type CreateHistoricalSyncParameters = {
    common: Common;
    sources: Source[];
    syncStore: SyncStore;
    chain: Chain;
    rpc: Rpc;
    onFatalError: (error: Error) => void;
};
export declare const createHistoricalSync: (args: CreateHistoricalSyncParameters) => Promise<HistoricalSync>;
export {};
//# sourceMappingURL=index.d.ts.map