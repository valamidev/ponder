import { dedupe } from '../utils/dedupe.js';
import { isAddressFactory, shouldGetTransactionReceipt } from "./filter.js";
export const isFragmentAddressFactory = (fragmentAddress) => {
    if (fragmentAddress === null)
        return false;
    if (typeof fragmentAddress === "string")
        return false;
    return true;
};
export const getFragments = (filter) => {
    switch (filter.type) {
        case "block":
            return getBlockFilterFragment(filter);
        case "transaction":
            return getTransactionFilterFragments(filter);
        case "trace":
            return getTraceFilterFragments(filter);
        case "log":
            return getLogFilterFragments(filter);
        case "transfer":
            return getTransferFilterFragments(filter);
    }
};
export const getAddressFragments = (address) => {
    const fragments = [];
    if (isAddressFactory(address)) {
        for (const fragmentAddress of Array.isArray(address.address)
            ? address.address
            : [address.address]) {
            const fragment = {
                address: fragmentAddress,
                eventSelector: address.eventSelector,
                childAddressLocation: address.childAddressLocation,
            };
            fragments.push({
                fragment,
                adjacentIds: [
                    `${fragmentAddress}_${address.eventSelector}_${address.childAddressLocation}`,
                ],
            });
        }
    }
    else {
        for (const fragmentAddress of Array.isArray(address)
            ? address
            : [address ?? null]) {
            fragments.push({
                fragment: fragmentAddress,
                adjacentIds: fragmentAddress
                    ? [fragmentAddress, null]
                    : [fragmentAddress],
            });
        }
    }
    return fragments;
};
export const getBlockFilterFragment = ({ chainId, interval, offset, }) => {
    return [
        {
            fragment: {
                type: "block",
                chainId,
                interval,
                offset,
            },
            adjacentIds: [`block_${chainId}_${interval}_${offset}`],
        },
    ];
};
export const getTransactionFilterFragments = ({ chainId, fromAddress, toAddress, }) => {
    const fragments = [];
    const fromAddressFragments = getAddressFragments(fromAddress);
    const toAddressFragments = getAddressFragments(toAddress);
    for (const fromAddressFragment of fromAddressFragments) {
        for (const toAddressFragment of toAddressFragments) {
            const fragment = {
                type: "transaction",
                chainId,
                fromAddress: fromAddressFragment.fragment,
                toAddress: toAddressFragment.fragment,
            };
            const adjacentIds = [];
            for (const fromAddressAdjacentId of fromAddressFragment.adjacentIds) {
                for (const toAddressAdjacentId of toAddressFragment.adjacentIds) {
                    adjacentIds.push(`transaction_${chainId}_${fromAddressAdjacentId}_${toAddressAdjacentId}`);
                }
            }
            fragments.push({ fragment, adjacentIds });
        }
    }
    return fragments;
};
export const getTraceFilterFragments = ({ chainId, fromAddress, toAddress, callType, functionSelector, ...filter }) => {
    const fragments = [];
    const fromAddressFragments = getAddressFragments(fromAddress);
    const toAddressFragments = getAddressFragments(toAddress);
    const includeTransactionReceipts = shouldGetTransactionReceipt(filter);
    for (const fromAddressFragment of fromAddressFragments) {
        for (const toAddressFragment of toAddressFragments) {
            for (const fragmentFunctionSelector of Array.isArray(functionSelector)
                ? functionSelector
                : [functionSelector]) {
                const fragment = {
                    type: "trace",
                    chainId,
                    fromAddress: fromAddressFragment.fragment,
                    toAddress: toAddressFragment.fragment,
                    functionSelector: fragmentFunctionSelector ?? null,
                    includeTransactionReceipts,
                };
                const adjacentIds = [];
                for (const fromAddressAdjacentId of fromAddressFragment.adjacentIds) {
                    for (const toAddressAdjacentId of toAddressFragment.adjacentIds) {
                        for (const adjacentFunctionSelector of fragmentFunctionSelector
                            ? [fragmentFunctionSelector, null]
                            : [null]) {
                            for (const adjacentTxr of includeTransactionReceipts
                                ? [1]
                                : [0, 1]) {
                                adjacentIds.push(`trace_${chainId}_${fromAddressAdjacentId}_${toAddressAdjacentId}_${adjacentFunctionSelector}_${adjacentTxr}`);
                            }
                        }
                    }
                }
                fragments.push({ fragment, adjacentIds });
            }
        }
    }
    return fragments;
};
export const getLogFilterFragments = ({ chainId, address, topic0, topic1, topic2, topic3, ...filter }) => {
    const fragments = [];
    const addressFragments = getAddressFragments(address);
    const includeTransactionReceipts = shouldGetTransactionReceipt(filter);
    for (const addressFragment of addressFragments) {
        for (const fragmentTopic0 of Array.isArray(topic0) ? topic0 : [topic0]) {
            for (const fragmentTopic1 of Array.isArray(topic1) ? topic1 : [topic1]) {
                for (const fragmentTopic2 of Array.isArray(topic2)
                    ? topic2
                    : [topic2]) {
                    for (const fragmentTopic3 of Array.isArray(topic3)
                        ? topic3
                        : [topic3]) {
                        const fragment = {
                            type: "log",
                            chainId,
                            address: addressFragment.fragment,
                            topic0: fragmentTopic0 ?? null,
                            topic1: fragmentTopic1 ?? null,
                            topic2: fragmentTopic2 ?? null,
                            topic3: fragmentTopic3 ?? null,
                            includeTransactionReceipts,
                        };
                        const adjacentIds = [];
                        for (const addressAdjacentId of addressFragment.adjacentIds) {
                            for (const adjacentTopic0 of fragmentTopic0
                                ? [fragmentTopic0, null]
                                : [null]) {
                                for (const adjacentTopic1 of fragmentTopic1
                                    ? [fragmentTopic1, null]
                                    : [null]) {
                                    for (const adjacentTopic2 of fragmentTopic2
                                        ? [fragmentTopic2, null]
                                        : [null]) {
                                        for (const adjacentTopic3 of fragmentTopic3
                                            ? [fragmentTopic3, null]
                                            : [null]) {
                                            for (const adjacentTxr of includeTransactionReceipts
                                                ? [1]
                                                : [0, 1]) {
                                                adjacentIds.push(`log_${chainId}_${addressAdjacentId}_${adjacentTopic0}_${adjacentTopic1}_${adjacentTopic2}_${adjacentTopic3}_${adjacentTxr}`);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        fragments.push({ fragment, adjacentIds });
                    }
                }
            }
        }
    }
    return fragments;
};
export const getTransferFilterFragments = ({ chainId, fromAddress, toAddress, ...filter }) => {
    const fragments = [];
    const fromAddressFragments = getAddressFragments(fromAddress);
    const toAddressFragments = getAddressFragments(toAddress);
    const includeTransactionReceipts = shouldGetTransactionReceipt(filter);
    for (const fromAddressFragment of fromAddressFragments) {
        for (const toAddressFragment of toAddressFragments) {
            const fragment = {
                type: "transfer",
                chainId,
                fromAddress: fromAddressFragment.fragment,
                toAddress: toAddressFragment.fragment,
                includeTransactionReceipts,
            };
            const adjacentIds = [];
            for (const fromAddressAdjacentId of fromAddressFragment.adjacentIds) {
                for (const toAddressAdjacentId of toAddressFragment.adjacentIds) {
                    for (const adjacentTxr of includeTransactionReceipts ? [1] : [0, 1]) {
                        adjacentIds.push(`transfer_${chainId}_${fromAddressAdjacentId}_${toAddressAdjacentId}_${adjacentTxr}`);
                    }
                }
            }
            fragments.push({ fragment, adjacentIds });
        }
    }
    return fragments;
};
export const fragmentAddressToId = (fragmentAddress) => {
    if (fragmentAddress === null)
        return null;
    if (typeof fragmentAddress === "string")
        return fragmentAddress;
    return `${fragmentAddress.address}_${fragmentAddress.eventSelector}_${fragmentAddress.childAddressLocation}`;
};
export const encodeFragment = (fragment) => {
    switch (fragment.type) {
        case "block":
            return `block_${fragment.chainId}_${fragment.interval}_${fragment.offset}`;
        case "transaction":
            return `transaction_${fragment.chainId}_${fragmentAddressToId(fragment.fromAddress)}_${fragmentAddressToId(fragment.toAddress)}`;
        case "trace":
            return `trace_${fragment.chainId}_${fragmentAddressToId(fragment.fromAddress)}_${fragmentAddressToId(fragment.toAddress)}_${fragment.functionSelector}_${fragment.includeTransactionReceipts ? 1 : 0}`;
        case "log":
            return `log_${fragment.chainId}_${fragmentAddressToId(fragment.address)}_${fragment.topic0}_${fragment.topic1}_${fragment.topic2}_${fragment.topic3}_${fragment.includeTransactionReceipts ? 1 : 0}`;
        case "transfer":
            return `transfer_${fragment.chainId}_${fragmentAddressToId(fragment.fromAddress)}_${fragmentAddressToId(fragment.toAddress)}_${fragment.includeTransactionReceipts ? 1 : 0}`;
    }
};
export const decodeFragment = (fragmentId) => {
    const [type, chainId] = fragmentId.split("_");
    const decodeFragmentAddress = (offset) => {
        const fragmentAddressId = fragmentId.split("_").slice(offset);
        if (fragmentAddressId[0] === "null") {
            return null;
        }
        if (fragmentAddressId.length === 1) {
            return fragmentAddressId[0];
        }
        if (fragmentAddressId.length >= 3 &&
            (fragmentAddressId[2].startsWith("topic") ||
                fragmentAddressId[2].startsWith("offset"))) {
            return {
                address: fragmentAddressId[0],
                eventSelector: fragmentAddressId[1],
                childAddressLocation: fragmentAddressId[2],
            };
        }
        return fragmentAddressId[0];
    };
    switch (type) {
        case "block": {
            const [, chainId, interval, offset] = fragmentId.split("_");
            return {
                type: "block",
                chainId: Number(chainId),
                interval: Number(interval),
                offset: Number(offset),
            };
        }
        case "transaction": {
            const fragmentFromAddress = decodeFragmentAddress(2);
            if (isFragmentAddressFactory(fragmentFromAddress)) {
                const fragmentToAddress = decodeFragmentAddress(5);
                return {
                    type: "transaction",
                    chainId: Number(chainId),
                    fromAddress: fragmentFromAddress,
                    toAddress: fragmentToAddress,
                };
            }
            const fragmentToAddress = decodeFragmentAddress(3);
            return {
                type: "transaction",
                chainId: Number(chainId),
                fromAddress: fragmentFromAddress,
                toAddress: fragmentToAddress,
            };
        }
        case "trace": {
            const fragmentFromAddress = decodeFragmentAddress(2);
            if (isFragmentAddressFactory(fragmentFromAddress)) {
                const fragmentToAddress = decodeFragmentAddress(5);
                if (isFragmentAddressFactory(fragmentToAddress)) {
                    const [, , , , , , , , functionSelector, includeTxr] = fragmentId.split("_");
                    return {
                        type: "trace",
                        chainId: Number(chainId),
                        fromAddress: fragmentFromAddress,
                        toAddress: fragmentToAddress,
                        functionSelector: functionSelector,
                        includeTransactionReceipts: includeTxr === "1",
                    };
                }
                const [, , , , , , functionSelector, includeTxr] = fragmentId.split("_");
                return {
                    type: "trace",
                    chainId: Number(chainId),
                    fromAddress: fragmentFromAddress,
                    toAddress: fragmentToAddress,
                    functionSelector: functionSelector,
                    includeTransactionReceipts: includeTxr === "1",
                };
            }
            const fragmentToAddress = decodeFragmentAddress(3);
            if (isFragmentAddressFactory(fragmentToAddress)) {
                const [, , , , , , functionSelector, includeTxr] = fragmentId.split("_");
                return {
                    type: "trace",
                    chainId: Number(chainId),
                    fromAddress: fragmentFromAddress,
                    toAddress: fragmentToAddress,
                    functionSelector: functionSelector,
                    includeTransactionReceipts: includeTxr === "1",
                };
            }
            const [, , , , functionSelector, includeTxr] = fragmentId.split("_");
            return {
                type: "trace",
                chainId: Number(chainId),
                fromAddress: fragmentFromAddress,
                toAddress: fragmentToAddress,
                functionSelector: functionSelector,
                includeTransactionReceipts: includeTxr === "1",
            };
        }
        case "log": {
            const fragmentAddress = decodeFragmentAddress(2);
            if (isFragmentAddressFactory(fragmentAddress)) {
                const [, , , , , topic0, topic1, topic2, topic3, includeTxr] = fragmentId.split("_");
                return {
                    type: "log",
                    chainId: Number(chainId),
                    address: fragmentAddress,
                    topic0: topic0 === "null" ? null : topic0,
                    topic1: topic1 === "null" ? null : topic1,
                    topic2: topic2 === "null" ? null : topic2,
                    topic3: topic3 === "null" ? null : topic3,
                    includeTransactionReceipts: includeTxr === "1",
                };
            }
            const [, , , topic0, topic1, topic2, topic3, includeTxr] = fragmentId.split("_");
            return {
                type: "log",
                chainId: Number(chainId),
                address: fragmentAddress,
                topic0: topic0 === "null" ? null : topic0,
                topic1: topic1 === "null" ? null : topic1,
                topic2: topic2 === "null" ? null : topic2,
                topic3: topic3 === "null" ? null : topic3,
                includeTransactionReceipts: includeTxr === "1",
            };
        }
        case "transfer": {
            const fragmentFromAddress = decodeFragmentAddress(2);
            if (isFragmentAddressFactory(fragmentFromAddress)) {
                const fragmentToAddress = decodeFragmentAddress(5);
                if (isFragmentAddressFactory(fragmentToAddress)) {
                    const [, , , , , , , , includeTxr] = fragmentId.split("_");
                    return {
                        type: "transfer",
                        chainId: Number(chainId),
                        fromAddress: fragmentFromAddress,
                        toAddress: fragmentToAddress,
                        includeTransactionReceipts: includeTxr === "1",
                    };
                }
                const [, , , , , , includeTxr] = fragmentId.split("_");
                return {
                    type: "transfer",
                    chainId: Number(chainId),
                    fromAddress: fragmentFromAddress,
                    toAddress: fragmentToAddress,
                    includeTransactionReceipts: includeTxr === "1",
                };
            }
            const fragmentToAddress = decodeFragmentAddress(3);
            if (isFragmentAddressFactory(fragmentToAddress)) {
                const [, , , , , , includeTxr] = fragmentId.split("_");
                return {
                    type: "transfer",
                    chainId: Number(chainId),
                    fromAddress: fragmentFromAddress,
                    toAddress: fragmentToAddress,
                    includeTransactionReceipts: includeTxr === "1",
                };
            }
            const [, , , , includeTxr] = fragmentId.split("_");
            return {
                type: "transfer",
                chainId: Number(chainId),
                fromAddress: fragmentFromAddress,
                toAddress: fragmentToAddress,
                includeTransactionReceipts: includeTxr === "1",
            };
        }
    }
};
const recoverAddress = (baseAddress, fragmentAddresses) => {
    if (baseAddress === undefined)
        return undefined;
    if (typeof baseAddress === "string")
        return baseAddress;
    if (Array.isArray(baseAddress))
        return dedupe(fragmentAddresses);
    // Note: At this point, `baseAddress` is a factory. We explicitly don't try to recover the factory
    // address from the fragments because we want a `insertChildAddresses` and `getChildAddresses` to
    // use the factory as a stable key.
    return baseAddress;
};
const recoverSelector = (base, fragments) => {
    if (base === undefined)
        return undefined;
    if (typeof base === "string")
        return base;
    return dedupe(fragments);
};
const recoverTopic = (base, fragments) => {
    if (base === null)
        return null;
    if (typeof base === "string")
        return base;
    return dedupe(fragments);
};
export const recoverFilter = (baseFilter, fragments) => {
    switch (baseFilter.type) {
        case "block": {
            return baseFilter;
        }
        case "transaction": {
            return {
                ...baseFilter,
                fromAddress: recoverAddress(baseFilter.fromAddress, fragments.map((fragment) => fragment.fromAddress)),
                toAddress: recoverAddress(baseFilter.toAddress, fragments.map((fragment) => fragment.toAddress)),
            };
        }
        case "trace": {
            return {
                ...baseFilter,
                fromAddress: recoverAddress(baseFilter.fromAddress, fragments.map((fragment) => fragment.fromAddress)),
                toAddress: recoverAddress(baseFilter.toAddress, fragments.map((fragment) => fragment.toAddress)),
                functionSelector: recoverSelector(baseFilter.functionSelector, fragments.map((fragment) => fragment
                    .functionSelector)),
            };
        }
        case "log": {
            return {
                ...baseFilter,
                address: recoverAddress(baseFilter.address, fragments.map((fragment) => fragment.address)),
                topic0: recoverTopic(baseFilter.topic0, fragments.map((fragment) => fragment.topic0)),
                topic1: recoverTopic(baseFilter.topic1, fragments.map((fragment) => fragment.topic1)),
                topic2: recoverTopic(baseFilter.topic2, fragments.map((fragment) => fragment.topic2)),
                topic3: recoverTopic(baseFilter.topic3, fragments.map((fragment) => fragment.topic3)),
            };
        }
        case "transfer": {
            return {
                ...baseFilter,
                fromAddress: recoverAddress(baseFilter.fromAddress, fragments.map((fragment) => fragment.fromAddress)),
                toAddress: recoverAddress(baseFilter.toAddress, fragments.map((fragment) => fragment.toAddress)),
            };
        }
    }
};
//# sourceMappingURL=fragments.js.map