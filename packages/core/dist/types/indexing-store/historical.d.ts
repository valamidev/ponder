import type { Common } from '../internal/common.js';
import type { SchemaBuild } from '../internal/types.js';
import type { IndexingCache } from "./cache.js";
import { type IndexingStore } from "./index.js";
export declare const createHistoricalIndexingStore: ({ common, schemaBuild: { schema }, indexingCache, }: {
    common: Common;
    schemaBuild: Pick<SchemaBuild, "schema">;
    indexingCache: IndexingCache;
}) => IndexingStore;
//# sourceMappingURL=historical.d.ts.map