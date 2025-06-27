import type { Config } from '../config/index.js';
import type { Common } from '../internal/common.js';
import { BuildError } from '../internal/errors.js';
import type { Chain, IndexingFunctions, LightBlock, RawIndexingFunctions, Source } from '../internal/types.js';
import { type Rpc } from '../rpc/index.js';
export declare function buildConfigAndIndexingFunctions({ common, config, rawIndexingFunctions, }: {
    common: Common;
    config: Config;
    rawIndexingFunctions: RawIndexingFunctions;
}): Promise<{
    chains: Chain[];
    rpcs: Rpc[];
    finalizedBlocks: LightBlock[];
    sources: Source[];
    indexingFunctions: IndexingFunctions;
    logs: {
        level: "warn" | "info" | "debug";
        msg: string;
    }[];
}>;
export declare function safeBuildConfigAndIndexingFunctions({ common, config, rawIndexingFunctions, }: {
    common: Common;
    config: Config;
    rawIndexingFunctions: RawIndexingFunctions;
}): Promise<{
    readonly status: "success";
    readonly sources: Source[];
    readonly chains: Chain[];
    readonly rpcs: Rpc[];
    readonly finalizedBlocks: LightBlock[];
    readonly indexingFunctions: IndexingFunctions;
    readonly logs: {
        level: "warn" | "info" | "debug";
        msg: string;
    }[];
    readonly error?: undefined;
} | {
    readonly status: "error";
    readonly error: BuildError;
    readonly sources?: undefined;
    readonly chains?: undefined;
    readonly rpcs?: undefined;
    readonly finalizedBlocks?: undefined;
    readonly indexingFunctions?: undefined;
    readonly logs?: undefined;
}>;
//# sourceMappingURL=config.d.ts.map