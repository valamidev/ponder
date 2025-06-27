import type { Common } from '../internal/common.js';
import type { Chain, IndexingBuild, SetupEvent } from '../internal/types.js';
import type { Event } from '../internal/types.js';
import type { Rpc } from '../rpc/index.js';
import type { SyncStore } from '../sync-store/index.js';
import { type Abi, type Address, type Client, type ContractFunctionArgs, type ContractFunctionName, type EIP1193Parameters, type GetBlockReturnType, type GetBlockTransactionCountReturnType, type GetTransactionCountReturnType, type Hash, type MulticallParameters, type MulticallReturnType, type Prettify, type PublicActions, type PublicRpcSchema, type ReadContractParameters, type ReadContractReturnType, type SimulateContractParameters, type SimulateContractReturnType, type Transport, type Chain as ViemChain, publicActions } from "viem";
export type CachedViemClient = {
    getClient: (chain: Chain) => ReadonlyClient;
    prefetch: (params: {
        events: Event[];
    }) => Promise<void>;
    clear: () => void;
    event: Event | SetupEvent | undefined;
};
/** Viem actions where the `block` property is optional and implicit. */
declare const blockDependentActions: readonly ["getBalance", "call", "estimateGas", "getFeeHistory", "getProof", "getCode", "getStorageAt", "getEnsAddress", "getEnsAvatar", "getEnsName", "getEnsResolver", "getEnsText"];
/** Viem actions where the `block` property is non-existent. */
declare const nonBlockDependentActions: readonly ["getTransaction", "getTransactionReceipt", "getTransactionConfirmations"];
type BlockOptions = {
    cache?: undefined;
    blockNumber?: undefined;
} | {
    cache: "immutable";
    blockNumber?: undefined;
} | {
    cache?: undefined;
    blockNumber: bigint;
};
type RequiredBlockOptions = {
    /** Hash of the block. */
    blockHash: Hash;
    blockNumber?: undefined;
} | {
    blockHash?: undefined;
    /** The block number. */
    blockNumber: bigint;
};
type BlockDependentAction<fn extends (client: any, args: any) => unknown, params = Parameters<fn>[0], returnType = ReturnType<fn>> = (args: Omit<params, "blockTag" | "blockNumber"> & BlockOptions) => returnType;
export type PonderActions = {
    [action in (typeof blockDependentActions)[number]]: BlockDependentAction<ReturnType<typeof publicActions>[action]>;
} & {
    multicall: <const contracts extends readonly unknown[], allowFailure extends boolean = true>(args: Omit<MulticallParameters<contracts, allowFailure>, "blockTag" | "blockNumber"> & BlockOptions) => Promise<MulticallReturnType<contracts, allowFailure>>;
    readContract: <const abi extends Abi | readonly unknown[], functionName extends ContractFunctionName<abi, "pure" | "view">, const args extends ContractFunctionArgs<abi, "pure" | "view", functionName>>(args: Omit<ReadContractParameters<abi, functionName, args>, "blockTag" | "blockNumber"> & BlockOptions) => Promise<ReadContractReturnType<abi, functionName, args>>;
    simulateContract: <const abi extends Abi | readonly unknown[], functionName extends ContractFunctionName<abi, "nonpayable" | "payable">, const args extends ContractFunctionArgs<abi, "nonpayable" | "payable", functionName>>(args: Omit<SimulateContractParameters<abi, functionName, args>, "blockTag" | "blockNumber"> & BlockOptions) => Promise<SimulateContractReturnType<abi, functionName, args>>;
    getBlock: <includeTransactions extends boolean = false>(args: {
        /** Whether or not to include transaction data in the response. */
        includeTransactions?: includeTransactions | undefined;
    } & RequiredBlockOptions) => Promise<GetBlockReturnType<ViemChain | undefined, includeTransactions>>;
    getTransactionCount: (args: {
        /** The account address. */
        address: Address;
    } & RequiredBlockOptions) => Promise<GetTransactionCountReturnType>;
    getBlockTransactionCount: (args: RequiredBlockOptions) => Promise<GetBlockTransactionCountReturnType>;
} & Pick<PublicActions, (typeof nonBlockDependentActions)[number]>;
export type ReadonlyClient<transport extends Transport = Transport, chain extends ViemChain | undefined = ViemChain | undefined> = Prettify<Omit<Client<transport, chain, undefined, PublicRpcSchema, PonderActions>, "extend" | "key" | "batch" | "cacheTime" | "account" | "type" | "uid" | "chain" | "name" | "pollingInterval" | "transport" | "ccipRead">>;
/**
 * RPC request.
 */
export type Request = Pick<ReadContractParameters, "abi" | "address" | "functionName" | "args"> & {
    blockNumber: bigint;
    chainId: number;
};
/**
 * Serialized RPC request for uniquely identifying a request.
 *
 * @dev Encoded from {@link Request} using `abi`.
 *
 * @example
 * "{
 *   "method": "eth_call",
 *   "params": [{"data": "0x123", "to": "0x456"}, "0x789"]
 * }"
 */
type CacheKey = string;
/**
 * Response of an RPC request.
 *
 * @example
 * "0x123"
 *
 * @example
 * ""0x123456789""
 */
type Response = string;
/**
 * Recorded RPC request pattern.
 *
 * @example
 * {
 *   "address": ["args", "from"],
 *   "abi": [...],
 *   "functionName": "balanceOf",
 *   "args": ["log", "address"],
 * }
 */
export type ProfilePattern = Pick<ReadContractParameters, "abi" | "functionName"> & {
    address: {
        type: "constant";
        value: unknown;
    } | {
        type: "derived";
        value: string[];
    };
    args?: ({
        type: "constant";
        value: unknown;
    } | {
        type: "derived";
        value: string[];
    })[];
};
/**
 * Cache of RPC responses.
 */
type Cache = Map<number, Map<CacheKey, Promise<Response | Error> | Response>>;
export declare const getCacheKey: (request: EIP1193Parameters) => Lowercase<string>;
export declare const encodeRequest: (request: Request) => {
    method: string;
    params: (`0x${string}` | {
        to: `0x${string}` | undefined;
        data: `0x${string}`;
    })[];
};
export declare const decodeResponse: (response: Response) => any;
export declare const createCachedViemClient: ({ common, indexingBuild, syncStore, eventCount, }: {
    common: Common;
    indexingBuild: Pick<IndexingBuild, "chains" | "rpcs">;
    syncStore: SyncStore;
    eventCount: {
        [eventName: string]: number;
    };
}) => CachedViemClient;
export declare const cachedTransport: ({ common, chain, rpc, syncStore, cache, }: {
    common: Common;
    chain: Chain;
    rpc: Rpc;
    syncStore: SyncStore;
    cache: Cache;
}) => Transport;
export {};
//# sourceMappingURL=client.d.ts.map