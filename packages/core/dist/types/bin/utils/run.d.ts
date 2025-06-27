import { type Database } from '../../database/index.js';
import type { Common } from '../../internal/common.js';
import type { CrashRecoveryCheckpoint, IndexingBuild, NamespaceBuild, PreBuild, SchemaBuild } from '../../internal/types.js';
/** Starts the sync and indexing services for the specified build. */
export declare function run({ common, preBuild, namespaceBuild, schemaBuild, indexingBuild, crashRecoveryCheckpoint, database, onFatalError, onReloadableError, }: {
    common: Common;
    preBuild: PreBuild;
    namespaceBuild: NamespaceBuild;
    schemaBuild: SchemaBuild;
    indexingBuild: IndexingBuild;
    crashRecoveryCheckpoint: CrashRecoveryCheckpoint;
    database: Database;
    onFatalError: (error: Error) => void;
    onReloadableError: (error: Error) => void;
}): Promise<void>;
//# sourceMappingURL=run.d.ts.map