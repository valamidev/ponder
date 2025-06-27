import type { Common } from '../internal/common.js';
import type { Chain, SyncBlock, SyncBlockHeader } from '../internal/types.js';
import type { RealtimeSync } from '../sync-realtime/index.js';
import { type EIP1193Parameters, type PublicRpcSchema } from "viem";
import type { DebugRpcSchema } from "../utils/debug.js";
type Schema = [...PublicRpcSchema, ...DebugRpcSchema];
type RequestReturnType<method extends EIP1193Parameters<Schema>["method"]> = Extract<Schema[number], {
    Method: method;
}>["ReturnType"];
export type Rpc = {
    request: <TParameters extends EIP1193Parameters<Schema>>(parameters: TParameters) => Promise<RequestReturnType<TParameters["method"]>>;
    subscribe: (params: {
        onBlock: (block: SyncBlock | SyncBlockHeader) => ReturnType<RealtimeSync["sync"]>;
        onError: (error: Error) => void;
        polling?: boolean;
    }) => void;
    unsubscribe: () => Promise<void>;
};
export declare const createRpc: ({ common, chain, concurrency, }: {
    common: Common;
    chain: Chain;
    concurrency?: number | undefined;
}) => Rpc;
export {};
//# sourceMappingURL=index.d.ts.map