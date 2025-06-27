import { dedupe } from '../utils/dedupe.js';
import { toLowerCase } from '../utils/lowercase.js';
import { orderObject } from '../utils/order.js';
import { startClock } from '../utils/timer.js';
import { createClient, custom, decodeFunctionData, decodeFunctionResult, encodeFunctionData, encodeFunctionResult, getAbiItem, hexToNumber, multicall3Abi, publicActions, toFunctionSelector, toHex, } from "viem";
import { getProfilePatternKey, recordProfilePattern, recoverProfilePattern, } from "./profile.js";
const MULTICALL_SELECTOR = toFunctionSelector(getAbiItem({ abi: multicall3Abi, name: "aggregate3" }));
const SAMPLING_RATE = 10;
const DB_PREDICTION_THRESHOLD = 0.2;
const RPC_PREDICTION_THRESHOLD = 0.8;
const MAX_CONSTANT_PATTERN_COUNT = 10;
/** RPC methods that reference a block number. */
const blockDependentMethods = new Set([
    "eth_getBalance",
    "eth_getTransactionCount",
    "eth_getBlockByNumber",
    "eth_getBlockTransactionCountByNumber",
    "eth_getTransactionByBlockNumberAndIndex",
    "eth_call",
    "eth_estimateGas",
    "eth_feeHistory",
    "eth_getProof",
    "eth_getCode",
    "eth_getStorageAt",
    "eth_getUncleByBlockNumberAndIndex",
    "debug_traceBlockByNumber",
]);
/** RPC methods that don't reference a block number. */
const nonBlockDependentMethods = new Set([
    "eth_getBlockByHash",
    "eth_getTransactionByHash",
    "eth_getBlockTransactionCountByHash",
    "eth_getTransactionByBlockHashAndIndex",
    "eth_getTransactionConfirmations",
    "eth_getTransactionReceipt",
    "eth_getUncleByBlockHashAndIndex",
    "eth_getUncleCountByBlockHash",
    "debug_traceBlockByHash",
    "debug_traceTransaction",
    "debug_traceCall",
]);
/** Viem actions where the `block` property is optional and implicit. */
const blockDependentActions = [
    "getBalance",
    "call",
    "estimateGas",
    "getFeeHistory",
    "getProof",
    "getCode",
    "getStorageAt",
    "getEnsAddress",
    "getEnsAvatar",
    "getEnsName",
    "getEnsResolver",
    "getEnsText",
];
/** Viem actions where the `block` property is non-existent. */
const nonBlockDependentActions = [
    "getTransaction",
    "getTransactionReceipt",
    "getTransactionConfirmations",
];
export const getCacheKey = (request) => {
    return toLowerCase(JSON.stringify(orderObject(request)));
};
export const encodeRequest = (request) => ({
    method: "eth_call",
    params: [
        {
            to: request.address,
            data: encodeFunctionData({
                abi: request.abi,
                functionName: request.functionName,
                args: request.args,
            }),
        },
        toHex(request.blockNumber),
    ],
});
export const decodeResponse = (response) => {
    // Note: I don't actually remember why we had to add the try catch.
    try {
        return JSON.parse(response);
    }
    catch (error) {
        return response;
    }
};
export const createCachedViemClient = ({ common, indexingBuild, syncStore, eventCount, }) => {
    let event = undefined;
    const cache = new Map();
    const profile = new Map();
    const profileConstantLRU = new Map();
    for (const chain of indexingBuild.chains) {
        cache.set(chain.id, new Map());
    }
    const ponderActions = (client) => {
        const actions = {};
        const _publicActions = publicActions(client);
        const addProfilePattern = ({ pattern, hasConstant, }) => {
            const profilePatternKey = getProfilePatternKey(pattern);
            if (profile.get(event.name).has(profilePatternKey)) {
                profile.get(event.name).get(profilePatternKey).count++;
                if (hasConstant) {
                    profileConstantLRU.get(event.name).delete(profilePatternKey);
                    profileConstantLRU.get(event.name).add(profilePatternKey);
                }
            }
            else {
                profile
                    .get(event.name)
                    .set(profilePatternKey, { pattern, hasConstant, count: 1 });
                if (hasConstant) {
                    profileConstantLRU.get(event.name).add(profilePatternKey);
                    if (profileConstantLRU.get(event.name).size >
                        MAX_CONSTANT_PATTERN_COUNT) {
                        const firstKey = profileConstantLRU
                            .get(event.name)
                            .keys()
                            .next().value;
                        if (firstKey) {
                            profile.get(event.name).delete(firstKey);
                            profileConstantLRU.get(event.name).delete(firstKey);
                        }
                    }
                }
            }
        };
        const getPonderAction = (action) => {
            return ({ cache, blockNumber: userBlockNumber, ...args }) => {
                // Note: prediction only possible when block number is managed by Ponder.
                if (event.type !== "setup" &&
                    userBlockNumber === undefined &&
                    eventCount[event.name] % SAMPLING_RATE === 1) {
                    if (profile.has(event.name) === false) {
                        profile.set(event.name, new Map());
                        profileConstantLRU.set(event.name, new Set());
                    }
                    // profile "readContract" and "multicall" actions
                    if (action === "readContract") {
                        const recordPatternResult = recordProfilePattern({
                            event: event,
                            args: args,
                            hints: Array.from(profile.get(event.name).values()),
                        });
                        if (recordPatternResult) {
                            addProfilePattern(recordPatternResult);
                        }
                    }
                    else if (action === "multicall") {
                        const contracts = args.contracts;
                        if (contracts.length < 10) {
                            for (const contract of contracts) {
                                const recordPatternResult = recordProfilePattern({
                                    event: event,
                                    args: contract,
                                    hints: Array.from(profile.get(event.name).values()),
                                });
                                if (recordPatternResult) {
                                    addProfilePattern(recordPatternResult);
                                }
                            }
                        }
                    }
                }
                const blockNumber = event.type === "setup" ? event.block : event.event.block.number;
                // @ts-expect-error
                return _publicActions[action]({
                    ...args,
                    ...(cache === "immutable"
                        ? { blockTag: "latest" }
                        : { blockNumber: userBlockNumber ?? blockNumber }),
                });
            };
        };
        const getRetryAction = (action) => {
            return async (...args) => {
                const RETRY_COUNT = 3;
                for (let i = 0; i <= RETRY_COUNT; i++) {
                    try {
                        // @ts-ignore
                        return await action(...args);
                    }
                    catch (error) {
                        if (error?.message?.includes("returned no data") ===
                            false ||
                            i === RETRY_COUNT) {
                            throw error;
                        }
                    }
                }
            };
        };
        for (const action of blockDependentActions) {
            actions[action] = getPonderAction(action);
        }
        // @ts-ignore
        actions.multicall = getRetryAction(getPonderAction("multicall"));
        // @ts-ignore
        actions.readContract = getRetryAction(getPonderAction("readContract"));
        actions.simulateContract = getRetryAction(
        // @ts-ignore
        getPonderAction("simulateContract"));
        for (const action of nonBlockDependentActions) {
            // @ts-ignore
            actions[action] = _publicActions[action];
        }
        // required block actions
        for (const action of [
            "getBlock",
            "getBlockTransactionCount",
            "getTransactionCount",
        ]) {
            // @ts-ignore
            actions[action] = _publicActions[action];
        }
        const actionsWithMetrics = {};
        for (const [action, actionFn] of Object.entries(actions)) {
            // @ts-ignore
            actionsWithMetrics[action] = async (...args) => {
                const endClock = startClock();
                try {
                    // @ts-ignore
                    return await actionFn(...args);
                }
                finally {
                    common.metrics.ponder_indexing_rpc_action_duration.observe({ action }, endClock());
                }
            };
        }
        return actionsWithMetrics;
    };
    return {
        getClient(chain) {
            const rpc = indexingBuild.rpcs[indexingBuild.chains.findIndex((n) => n === chain)];
            return createClient({
                transport: cachedTransport({
                    common,
                    chain,
                    rpc,
                    syncStore,
                    cache,
                }),
                chain: chain.viemChain,
                // @ts-expect-error overriding `readContract` is not supported by viem
            }).extend(ponderActions);
        },
        async prefetch({ events }) {
            // Use profiling metadata + next event batch to determine which
            // rpc requests are going to be made, and preload them into the cache.
            const prediction = [];
            for (const event of events) {
                if (profile.has(event.name)) {
                    for (const [, { pattern, count }] of profile.get(event.name)) {
                        // Expected value of times the prediction will be used.
                        const ev = (count * SAMPLING_RATE) / eventCount[event.name];
                        prediction.push({
                            ev,
                            request: recoverProfilePattern(pattern, event),
                        });
                    }
                }
            }
            const chainRequests = new Map();
            for (const chain of indexingBuild.chains) {
                chainRequests.set(chain.id, []);
            }
            for (const { ev, request } of dedupe(prediction, ({ request }) => getCacheKey(encodeRequest(request)))) {
                chainRequests.get(request.chainId).push({
                    ev,
                    request: encodeRequest(request),
                });
            }
            await Promise.all(Array.from(chainRequests.entries()).map(async ([chainId, requests]) => {
                const i = indexingBuild.chains.findIndex((n) => n.id === chainId);
                const chain = indexingBuild.chains[i];
                const rpc = indexingBuild.rpcs[i];
                const dbRequests = requests.filter(({ ev }) => ev > DB_PREDICTION_THRESHOLD);
                common.metrics.ponder_indexing_rpc_prefetch_total.inc({
                    chain: chain.name,
                    method: "eth_call",
                    type: "database",
                }, dbRequests.length);
                const cachedResults = await syncStore.getRpcRequestResults({
                    requests: dbRequests.map(({ request }) => request),
                    chainId,
                });
                for (let i = 0; i < dbRequests.length; i++) {
                    const request = dbRequests[i];
                    const cachedResult = cachedResults[i];
                    if (cachedResult !== undefined) {
                        cache
                            .get(chainId)
                            .set(getCacheKey(request.request), cachedResult);
                    }
                    else if (request.ev > RPC_PREDICTION_THRESHOLD) {
                        const resultPromise = rpc
                            .request(request.request)
                            .then((result) => JSON.stringify(result))
                            .catch((error) => error);
                        common.metrics.ponder_indexing_rpc_prefetch_total.inc({
                            chain: chain.name,
                            method: "eth_call",
                            type: "rpc",
                        });
                        // Note: Unawaited request added to cache
                        cache
                            .get(chainId)
                            .set(getCacheKey(request.request), resultPromise);
                    }
                }
                if (dbRequests.length > 0) {
                    common.logger.debug({
                        service: "rpc",
                        msg: `Pre-fetched ${dbRequests.length} ${chain.name} RPC requests`,
                    });
                }
            }));
        },
        clear() {
            for (const chain of indexingBuild.chains) {
                cache.get(chain.id).clear();
            }
        },
        set event(_event) {
            event = _event;
        },
    };
};
export const cachedTransport = ({ common, chain, rpc, syncStore, cache, }) => ({ chain: viemChain }) => custom({
    async request({ method, params }) {
        const body = { method, params };
        // multicall
        if (method === "eth_call" &&
            params[0]?.data?.startsWith(MULTICALL_SELECTOR)) {
            let blockNumber = undefined;
            [, blockNumber] = params;
            const multicallRequests = decodeFunctionData({
                abi: multicall3Abi,
                data: params[0].data,
            }).args[0];
            if (multicallRequests.length === 0) {
                // empty multicall result
                return "0x00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000";
            }
            const requests = multicallRequests.map((call) => ({
                method: "eth_call",
                params: [
                    {
                        to: call.target,
                        data: call.callData,
                    },
                    blockNumber,
                ],
            }));
            const results = new Map();
            const requestsToInsert = new Set();
            for (const request of requests) {
                const cacheKey = getCacheKey(request);
                if (cache.get(chain.id).has(cacheKey)) {
                    const cachedResult = cache.get(chain.id).get(cacheKey);
                    if (cachedResult instanceof Promise) {
                        common.metrics.ponder_indexing_rpc_requests_total.inc({
                            chain: chain.name,
                            method,
                            type: "prefetch_rpc",
                        });
                        const result = await cachedResult;
                        // Note: we don't attempt to cache or prefetch errors, instead relying on the eventual RPC request.
                        if (result instanceof Error)
                            continue;
                        if (result !== "0x") {
                            requestsToInsert.add(request);
                        }
                        results.set(request, {
                            success: true,
                            returnData: decodeResponse(result),
                        });
                    }
                    else {
                        common.metrics.ponder_indexing_rpc_requests_total.inc({
                            chain: chain.name,
                            method,
                            type: "prefetch_database",
                        });
                        results.set(request, {
                            success: true,
                            returnData: decodeResponse(cachedResult),
                        });
                    }
                }
            }
            const dbRequests = requests.filter((request) => results.has(request) === false);
            const dbResults = await syncStore.getRpcRequestResults({
                requests: dbRequests,
                chainId: chain.id,
            });
            for (let i = 0; i < dbRequests.length; i++) {
                const request = dbRequests[i];
                const result = dbResults[i];
                if (result !== undefined) {
                    common.metrics.ponder_indexing_rpc_requests_total.inc({
                        chain: chain.name,
                        method,
                        type: "database",
                    });
                    results.set(request, {
                        success: true,
                        returnData: decodeResponse(result),
                    });
                }
            }
            if (results.size < requests.length) {
                const _requests = requests.filter((request) => results.has(request) === false);
                const multicallResult = await rpc
                    .request({
                    method: "eth_call",
                    params: [
                        {
                            to: params[0].to,
                            data: encodeFunctionData({
                                abi: multicall3Abi,
                                functionName: "aggregate3",
                                args: [
                                    multicallRequests.filter((_, i) => results.has(requests[i]) === false),
                                ],
                            }),
                        },
                        blockNumber,
                    ],
                })
                    .then((result) => decodeFunctionResult({
                    abi: multicall3Abi,
                    functionName: "aggregate3",
                    data: result,
                }));
                for (let i = 0; i < _requests.length; i++) {
                    const request = _requests[i];
                    const result = multicallResult[i];
                    if (result.success && result.returnData !== "0x") {
                        requestsToInsert.add(request);
                    }
                    common.metrics.ponder_indexing_rpc_requests_total.inc({
                        chain: chain.name,
                        method,
                        type: "rpc",
                    });
                    results.set(request, result);
                }
            }
            const encodedBlockNumber = blockNumber === undefined
                ? undefined
                : blockNumber === "latest"
                    ? 0
                    : hexToNumber(blockNumber);
            // Note: insertRpcRequestResults errors can be ignored and not awaited, since
            // the response is already fetched.
            syncStore
                .insertRpcRequestResults({
                requests: Array.from(requestsToInsert).map((request) => ({
                    request,
                    blockNumber: encodedBlockNumber,
                    result: JSON.stringify(results.get(request).returnData),
                })),
                chainId: chain.id,
            })
                .catch(() => { });
            // Note: at this point, it is an invariant that either `allowFailure` is true or
            // there are no failed requests.
            // Note: viem <= 2.23.6 had a bug with `encodeFunctionResult` which can be worked around by adding
            // another layer of array nesting.
            // Fixed by this commit https://github.com/wevm/viem/commit/9c442de0ff38ac1f654b5c751d292e9a9f8d574c
            const resultsToEncode = requests.map((request) => results.get(request));
            try {
                return encodeFunctionResult({
                    abi: multicall3Abi,
                    functionName: "aggregate3",
                    result: resultsToEncode,
                });
            }
            catch (e) {
                return encodeFunctionResult({
                    abi: multicall3Abi,
                    functionName: "aggregate3",
                    result: [
                        // @ts-expect-error known issue in viem <= 2.23.6
                        resultsToEncode,
                    ],
                });
            }
        }
        else if (blockDependentMethods.has(method) ||
            nonBlockDependentMethods.has(method)) {
            let blockNumber = undefined;
            switch (method) {
                case "eth_getBlockByNumber":
                case "eth_getBlockTransactionCountByNumber":
                case "eth_getTransactionByBlockNumberAndIndex":
                case "eth_getUncleByBlockNumberAndIndex":
                case "debug_traceBlockByNumber":
                    [blockNumber] = params;
                    break;
                case "eth_getBalance":
                case "eth_call":
                case "eth_getCode":
                case "eth_estimateGas":
                case "eth_feeHistory":
                case "eth_getTransactionCount":
                    [, blockNumber] = params;
                    break;
                case "eth_getProof":
                case "eth_getStorageAt":
                    [, , blockNumber] = params;
                    break;
            }
            const encodedBlockNumber = blockNumber === undefined
                ? undefined
                : blockNumber === "latest"
                    ? 0
                    : hexToNumber(blockNumber);
            const cacheKey = getCacheKey(body);
            if (cache.get(chain.id).has(cacheKey)) {
                const cachedResult = cache.get(chain.id).get(cacheKey);
                // `cachedResult` is a Promise if the request had to be fetched from the RPC.
                if (cachedResult instanceof Promise) {
                    common.metrics.ponder_indexing_rpc_requests_total.inc({
                        chain: chain.name,
                        method,
                        type: "prefetch_rpc",
                    });
                    const result = await cachedResult;
                    if (result instanceof Error)
                        throw result;
                    // Note: "0x" is a valid response for some requests, but is sometimes erroneously returned by the RPC.
                    // Because the frequency of these valid requests with no return data is very low, we don't cache it.
                    if (result !== "0x") {
                        // Note: insertRpcRequestResults errors can be ignored and not awaited, since
                        // the response is already fetched.
                        syncStore
                            .insertRpcRequestResults({
                            requests: [
                                {
                                    request: body,
                                    blockNumber: encodedBlockNumber,
                                    result,
                                },
                            ],
                            chainId: chain.id,
                        })
                            .catch(() => { });
                    }
                    return decodeResponse(result);
                }
                else {
                    common.metrics.ponder_indexing_rpc_requests_total.inc({
                        chain: chain.name,
                        method,
                        type: "prefetch_database",
                    });
                }
                return decodeResponse(cachedResult);
            }
            const [cachedResult] = await syncStore.getRpcRequestResults({
                requests: [body],
                chainId: chain.id,
            });
            if (cachedResult !== undefined) {
                common.metrics.ponder_indexing_rpc_requests_total.inc({
                    chain: chain.name,
                    method,
                    type: "database",
                });
                return decodeResponse(cachedResult);
            }
            common.metrics.ponder_indexing_rpc_requests_total.inc({
                chain: chain.name,
                method,
                type: "rpc",
            });
            const response = await rpc.request(body);
            // Note: "0x" is a valid response for some requests, but is sometimes erroneously returned by the RPC.
            // Because the frequency of these valid requests with no return data is very low, we don't cache it.
            if (response !== "0x") {
                // Note: insertRpcRequestResults errors can be ignored and not awaited, since
                // the response is already fetched.
                syncStore
                    .insertRpcRequestResults({
                    requests: [
                        {
                            request: body,
                            blockNumber: encodedBlockNumber,
                            result: JSON.stringify(response),
                        },
                    ],
                    chainId: chain.id,
                })
                    .catch(() => { });
            }
            return response;
        }
        else {
            return rpc.request(body);
        }
    },
})({ chain: viemChain, retryCount: 0 });
//# sourceMappingURL=client.js.map