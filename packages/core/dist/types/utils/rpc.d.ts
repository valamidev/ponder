import type { SyncBlock, SyncBlockHeader, SyncLog, SyncTrace, SyncTransaction, SyncTransactionReceipt } from '../internal/types.js';
import type { Rpc } from '../rpc/index.js';
import { type Address, type Hash, type Hex, type LogTopic } from "viem";
/**
 * Helper function for "eth_getBlockByNumber" request.
 */
export declare const _eth_getBlockByNumber: (rpc: Rpc, { blockNumber, blockTag, }: {
    blockNumber: Hex | number;
    blockTag?: undefined;
} | {
    blockNumber?: undefined;
    blockTag: "latest";
}) => Promise<SyncBlock>;
/**
 * Helper function for "eth_getBlockByNumber" request.
 */
export declare const _eth_getBlockByHash: (rpc: Rpc, { hash }: {
    hash: Hex;
}) => Promise<SyncBlock>;
/**
 * Helper function for "eth_getLogs" rpc request.
 * Handles different error types and retries the request if applicable.
 */
export declare const _eth_getLogs: (rpc: Rpc, params: {
    address?: Address | Address[];
    topics?: LogTopic[];
} & ({
    fromBlock: Hex | number;
    toBlock: Hex | number;
} | {
    blockHash: Hash;
})) => Promise<SyncLog[]>;
/**
 * Helper function for "eth_getTransactionReceipt" request.
 */
export declare const _eth_getTransactionReceipt: (rpc: Rpc, { hash }: {
    hash: Hex;
}) => Promise<SyncTransactionReceipt>;
/**
 * Helper function for "eth_getBlockReceipts" request.
 */
export declare const _eth_getBlockReceipts: (rpc: Rpc, { blockHash }: {
    blockHash: Hash;
}) => Promise<SyncTransactionReceipt[]>;
/**
 * Helper function for "debug_traceBlockByNumber" request.
 */
export declare const _debug_traceBlockByNumber: (rpc: Rpc, { blockNumber, }: {
    blockNumber: Hex | number;
}) => Promise<SyncTrace[]>;
/**
 * Helper function for "debug_traceBlockByHash" request.
 */
export declare const _debug_traceBlockByHash: (rpc: Rpc, { hash, }: {
    hash: Hash;
}) => Promise<SyncTrace[]>;
/**
 * Validate that the transactions are consistent with the block.
 */
export declare const validateTransactionsAndBlock: (block: SyncBlock) => void;
/**
 * Validate that the logs are consistent with the block.
 *
 * @dev Allows `log.transactionHash` to be `zeroHash`.
 * @dev Allows `block.logsBloom` to be `zeroLogsBloom`.
 */
export declare const validateLogsAndBlock: (logs: SyncLog[], block: SyncBlock) => void;
/**
 * Validate that the traces are consistent with the block.
 */
export declare const validateTracesAndBlock: (traces: SyncTrace[], block: SyncBlock) => void;
/**
 * Validate that the receipts are consistent with the block.
 */
export declare const validateReceiptsAndBlock: (receipts: SyncTransactionReceipt[], block: SyncBlock, method: "eth_getBlockReceipts" | "eth_getTransactionReceipt") => void;
/**
 * Validate required block properties and set non-required properties.
 *
 * Required properties:
 * - hash
 * - number
 * - timestamp
 * - logsBloom
 * - parentHash
 * - transactions
 *
 * Non-required properties:
 * - miner
 * - gasUsed
 * - gasLimit
 * - baseFeePerGas
 * - nonce
 * - mixHash
 * - stateRoot
 * - transactionsRoot
 * - sha3Uncles
 * - size
 * - difficulty
 * - totalDifficulty
 * - extraData
 */
export declare const standardizeBlock: <block extends {
    baseFeePerGas: `0x${string}` | null;
    blobGasUsed: `0x${string}`;
    difficulty: `0x${string}`;
    excessBlobGas: `0x${string}`;
    extraData: `0x${string}`;
    gasLimit: `0x${string}`;
    gasUsed: `0x${string}`;
    hash: `0x${string}`;
    logsBloom: `0x${string}`;
    miner: `0x${string}`;
    mixHash: `0x${string}`;
    nonce: `0x${string}`;
    number: `0x${string}`;
    parentBeaconBlockRoot?: `0x${string}` | undefined;
    parentHash: `0x${string}`;
    receiptsRoot: `0x${string}`;
    sealFields: `0x${string}`[];
    sha3Uncles: `0x${string}`;
    size: `0x${string}`;
    stateRoot: `0x${string}`;
    timestamp: `0x${string}`;
    totalDifficulty: `0x${string}` | null;
    transactions: import("viem").RpcTransaction<false>[];
    transactionsRoot: `0x${string}`;
    uncles: `0x${string}`[];
    withdrawals?: import("viem").Withdrawal[] | undefined;
    withdrawalsRoot?: `0x${string}` | undefined;
} | (Omit<{
    baseFeePerGas: `0x${string}` | null;
    blobGasUsed: `0x${string}`;
    difficulty: `0x${string}`;
    excessBlobGas: `0x${string}`;
    extraData: `0x${string}`;
    gasLimit: `0x${string}`;
    gasUsed: `0x${string}`;
    hash: `0x${string}`;
    logsBloom: `0x${string}`;
    miner: `0x${string}`;
    mixHash: `0x${string}`;
    nonce: `0x${string}`;
    number: `0x${string}`;
    parentBeaconBlockRoot?: `0x${string}` | undefined;
    parentHash: `0x${string}`;
    receiptsRoot: `0x${string}`;
    sealFields: `0x${string}`[];
    sha3Uncles: `0x${string}`;
    size: `0x${string}`;
    stateRoot: `0x${string}`;
    timestamp: `0x${string}`;
    totalDifficulty: `0x${string}` | null;
    transactions: import("viem").RpcTransaction<false>[];
    transactionsRoot: `0x${string}`;
    uncles: `0x${string}`[];
    withdrawals?: import("viem").Withdrawal[] | undefined;
    withdrawalsRoot?: `0x${string}` | undefined;
}, "transactions"> & {
    transactions: string[] | undefined;
})>(block: block, isBlockHeader?: boolean) => block extends {
    baseFeePerGas: `0x${string}` | null;
    blobGasUsed: `0x${string}`;
    difficulty: `0x${string}`;
    excessBlobGas: `0x${string}`;
    extraData: `0x${string}`;
    gasLimit: `0x${string}`;
    gasUsed: `0x${string}`;
    hash: `0x${string}`;
    logsBloom: `0x${string}`;
    miner: `0x${string}`;
    mixHash: `0x${string}`;
    nonce: `0x${string}`;
    number: `0x${string}`;
    parentBeaconBlockRoot?: `0x${string}` | undefined;
    parentHash: `0x${string}`;
    receiptsRoot: `0x${string}`;
    sealFields: `0x${string}`[];
    sha3Uncles: `0x${string}`;
    size: `0x${string}`;
    stateRoot: `0x${string}`;
    timestamp: `0x${string}`;
    totalDifficulty: `0x${string}` | null;
    transactions: import("viem").RpcTransaction<false>[];
    transactionsRoot: `0x${string}`;
    uncles: `0x${string}`[];
    withdrawals?: import("viem").Withdrawal[] | undefined;
    withdrawalsRoot?: `0x${string}` | undefined;
} ? {
    baseFeePerGas: `0x${string}` | null;
    blobGasUsed: `0x${string}`;
    difficulty: `0x${string}`;
    excessBlobGas: `0x${string}`;
    extraData: `0x${string}`;
    gasLimit: `0x${string}`;
    gasUsed: `0x${string}`;
    hash: `0x${string}`;
    logsBloom: `0x${string}`;
    miner: `0x${string}`;
    mixHash: `0x${string}`;
    nonce: `0x${string}`;
    number: `0x${string}`;
    parentBeaconBlockRoot?: `0x${string}` | undefined;
    parentHash: `0x${string}`;
    receiptsRoot: `0x${string}`;
    sealFields: `0x${string}`[];
    sha3Uncles: `0x${string}`;
    size: `0x${string}`;
    stateRoot: `0x${string}`;
    timestamp: `0x${string}`;
    totalDifficulty: `0x${string}` | null;
    transactions: import("viem").RpcTransaction<false>[];
    transactionsRoot: `0x${string}`;
    uncles: `0x${string}`[];
    withdrawals?: import("viem").Withdrawal[] | undefined;
    withdrawalsRoot?: `0x${string}` | undefined;
} : SyncBlockHeader;
/**
 * Validate required transaction properties and set non-required properties.
 *
 * Required properties:
 * - hash
 * - transactionIndex
 * - blockNumber
 * - blockHash
 * - from
 * - to
 *
 * Non-required properties:
 * - input
 * - value
 * - nonce
 * - r
 * - s
 * - v
 * - type
 * - gas
 */
export declare const standardizeTransaction: (transaction: SyncTransaction) => SyncTransaction;
/**
 * Validate required log properties and set properties.
 *
 * Required properties:
 * - blockNumber
 * - logIndex
 * - blockHash
 * - address
 * - topics
 * - data
 * - transactionHash
 * - transactionIndex
 *
 * Non-required properties:
 * - removed
 */
export declare const standardizeLog: (log: SyncLog) => SyncLog;
/**
 * Validate required trace properties and set non-required properties.
 *
 * Required properties:
 * - transactionHash
 * - type
 * - from
 * - input
 *
 * Non-required properties:
 * - gas
 * - gasUsed
 */
export declare const standardizeTrace: (trace: SyncTrace) => SyncTrace;
/**
 * Validate required transaction receipt properties and set non-required properties.
 *
 * Required properties:
 * - blockHash
 * - blockNumber
 * - transactionHash
 * - transactionIndex
 * - from
 * - to
 * - status
 *
 * Non-required properties:
 * - logs
 * - logsBloom
 * - gasUsed
 * - cumulativeGasUsed
 * - effectiveGasPrice
 * - root
 * - type
 */
export declare const standardizeTransactionReceipt: (receipt: SyncTransactionReceipt) => SyncTransactionReceipt;
//# sourceMappingURL=rpc.d.ts.map