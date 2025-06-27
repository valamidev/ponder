import type { Database } from '../database/index.js';
import type { Common } from '../internal/common.js';
import type { BlockFilter, Factory, Filter, FilterWithoutBlocks, Fragment, InternalBlock, InternalLog, InternalTrace, InternalTransaction, InternalTransactionReceipt, LightBlock, LogFilter, SyncBlock, SyncBlockHeader, SyncLog, SyncTrace, SyncTransaction, SyncTransactionReceipt, TraceFilter, TransactionFilter, TransferFilter } from '../internal/types.js';
import type { Interval } from '../utils/interval.js';
import { type SQL } from "drizzle-orm";
import { type Address, type EIP1193Parameters } from "viem";
export type SyncStore = {
    insertIntervals(args: {
        intervals: {
            filter: FilterWithoutBlocks;
            interval: Interval;
        }[];
        chainId: number;
    }): Promise<void>;
    getIntervals(args: {
        filters: Filter[];
    }): Promise<Map<Filter, {
        fragment: Fragment;
        intervals: Interval[];
    }[]>>;
    insertChildAddresses(args: {
        factory: Factory;
        childAddresses: Map<Address, number>;
        chainId: number;
    }): Promise<void>;
    getChildAddresses(args: {
        factory: Factory;
    }): Promise<Map<Address, number>>;
    getSafeCrashRecoveryBlock(args: {
        chainId: number;
        timestamp: number;
    }): Promise<{
        number: bigint;
        timestamp: bigint;
    } | undefined>;
    insertLogs(args: {
        logs: SyncLog[];
        chainId: number;
    }): Promise<void>;
    insertBlocks(args: {
        blocks: (SyncBlock | SyncBlockHeader)[];
        chainId: number;
    }): Promise<void>;
    insertTransactions(args: {
        transactions: SyncTransaction[];
        chainId: number;
    }): Promise<void>;
    insertTransactionReceipts(args: {
        transactionReceipts: SyncTransactionReceipt[];
        chainId: number;
    }): Promise<void>;
    insertTraces(args: {
        traces: {
            trace: SyncTrace;
            block: SyncBlock;
            transaction: SyncTransaction;
        }[];
        chainId: number;
    }): Promise<void>;
    getEventBlockData(args: {
        filters: Filter[];
        fromBlock: number;
        toBlock: number;
        chainId: number;
        limit: number;
    }): Promise<{
        blockData: {
            block: InternalBlock;
            logs: InternalLog[];
            transactions: InternalTransaction[];
            transactionReceipts: InternalTransactionReceipt[];
            traces: InternalTrace[];
        }[];
        cursor: number;
    }>;
    insertRpcRequestResults(args: {
        requests: {
            request: EIP1193Parameters;
            blockNumber: number | undefined;
            result: string;
        }[];
        chainId: number;
    }): Promise<void>;
    getRpcRequestResults(args: {
        requests: EIP1193Parameters[];
        chainId: number;
    }): Promise<(string | undefined)[]>;
    pruneRpcRequestResults(args: {
        blocks: Pick<LightBlock, "number">[];
        chainId: number;
    }): Promise<void>;
    pruneByChain(args: {
        chainId: number;
    }): Promise<void>;
};
export declare const createSyncStore: ({ common, database, }: {
    common: Common;
    database: Database;
}) => SyncStore;
export declare const logFilter: (filter: LogFilter) => SQL;
export declare const blockFilter: (filter: BlockFilter) => SQL;
export declare const transactionFilter: (filter: TransactionFilter) => SQL;
export declare const transferFilter: (filter: TransferFilter) => SQL;
export declare const traceFilter: (filter: TraceFilter) => SQL;
//# sourceMappingURL=index.d.ts.map