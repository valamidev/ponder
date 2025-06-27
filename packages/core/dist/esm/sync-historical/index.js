import { ShutdownError } from '../internal/errors.js';
import { getChildAddress, isAddressFactory, isAddressMatched, isLogFactoryMatched, isTraceFilterMatched, isTransactionFilterMatched, isTransferFilterMatched, } from '../sync/filter.js';
import { shouldGetTransactionReceipt } from '../sync/filter.js';
import { getFragments, recoverFilter } from '../sync/fragments.js';
import { getChunks, intervalBounds, intervalDifference, intervalRange, intervalUnion, } from '../utils/interval.js';
import { _debug_traceBlockByNumber, _eth_getBlockByNumber, _eth_getBlockReceipts, _eth_getLogs, _eth_getTransactionReceipt, validateLogsAndBlock, validateReceiptsAndBlock, validateTracesAndBlock, validateTransactionsAndBlock, } from '../utils/rpc.js';
import { getLogsRetryHelper } from "@ponder/utils";
import { hexToBigInt, hexToNumber, toHex, zeroHash, } from "viem";
export const createHistoricalSync = async (args) => {
    /**
     * Flag to fetch transaction receipts through _eth_getBlockReceipts (true) or _eth_getTransactionReceipt (false)
     */
    let isBlockReceipts = true;
    /**
     * Blocks that have already been extracted.
     * Note: All entries are deleted at the end of each call to `sync()`.
     */
    const blockCache = new Map();
    /**
     * Traces that have already been fetched.
     * Note: All entries are deleted at the end of each call to `sync()`.
     */
    const traceCache = new Map();
    /**
     * Transactions that should be saved to the sync-store.
     * Note: All entries are deleted at the end of each call to `sync()`.
     */
    const transactionsCache = new Set();
    /**
     * Block transaction receipts that have already been fetched.
     * Note: All entries are deleted at the end of each call to `sync()`.
     */
    const blockReceiptsCache = new Map();
    /**
     * Transaction receipts that have already been fetched.
     * Note: All entries are deleted at the end of each call to `sync()`.
     */
    const transactionReceiptsCache = new Map();
    /**
     * Data about the range passed to "eth_getLogs" share among all log
     * filters and log factories.
     */
    let logsRequestMetadata = {
        estimatedRange: 500,
    };
    /**
     * Intervals that have been completed for all filters in `args.sources`.
     *
     * Note: `intervalsCache` is not updated after a new interval is synced.
     */
    let intervalsCache;
    if (args.chain.disableCache) {
        intervalsCache = new Map();
        for (const { filter } of args.sources) {
            intervalsCache.set(filter, []);
            for (const { fragment } of getFragments(filter)) {
                intervalsCache.get(filter).push({ fragment, intervals: [] });
            }
        }
    }
    else {
        intervalsCache = await args.syncStore.getIntervals({
            filters: args.sources.map(({ filter }) => filter),
        });
    }
    // Closest-to-tip block that has been synced.
    let latestBlock;
    ////////
    // Helper functions for sync tasks
    ////////
    /**
     * Split "eth_getLogs" requests into ranges inferred from errors
     * and batch requests.
     */
    const syncLogsDynamic = async ({ filter, address, interval, }) => {
        //  Use the recommended range if available, else don't chunk the interval at all.
        const intervals = getChunks({
            interval,
            maxChunkSize: logsRequestMetadata.confirmedRange ??
                logsRequestMetadata.estimatedRange,
        });
        const topics = "eventSelector" in filter
            ? [filter.eventSelector]
            : [
                filter.topic0 ?? null,
                filter.topic1 ?? null,
                filter.topic2 ?? null,
                filter.topic3 ?? null,
            ];
        // Note: the `topics` field is very fragile for many rpc providers, and
        // cannot handle extra "null" topics
        if (topics[3] === null) {
            topics.pop();
            if (topics[2] === null) {
                topics.pop();
                if (topics[1] === null) {
                    topics.pop();
                    if (topics[0] === null) {
                        topics.pop();
                    }
                }
            }
        }
        // Batch large arrays of addresses, handling arrays that are empty
        let addressBatches;
        if (address === undefined) {
            // no address (match all)
            addressBatches = [undefined];
        }
        else if (typeof address === "string") {
            // single address
            addressBatches = [address];
        }
        else if (address.length === 0) {
            // no address (factory with no children)
            return [];
        }
        else {
            // many addresses
            // Note: it is assumed that `address` is deduplicated
            addressBatches = [];
            for (let i = 0; i < address.length; i += 50) {
                addressBatches.push(address.slice(i, i + 50));
            }
        }
        const logs = await Promise.all(intervals.flatMap((interval) => addressBatches.map((address) => _eth_getLogs(args.rpc, {
            address,
            topics,
            fromBlock: interval[0],
            toBlock: interval[1],
        }).catch((error) => {
            const getLogsErrorResponse = getLogsRetryHelper({
                params: [
                    {
                        address,
                        topics,
                        fromBlock: toHex(interval[0]),
                        toBlock: toHex(interval[1]),
                    },
                ],
                error: error,
            });
            if (getLogsErrorResponse.shouldRetry === false)
                throw error;
            const range = hexToNumber(getLogsErrorResponse.ranges[0].toBlock) -
                hexToNumber(getLogsErrorResponse.ranges[0].fromBlock);
            args.common.logger.debug({
                service: "sync",
                msg: `Caught eth_getLogs error on '${args.chain.name}', updating recommended range to ${range}.`,
            });
            logsRequestMetadata = {
                estimatedRange: range,
                confirmedRange: getLogsErrorResponse.isSuggestedRange
                    ? range
                    : undefined,
            };
            return syncLogsDynamic({ address, interval, filter });
        })))).then((logs) => logs.flat());
        /**
         * Dynamically increase the range used in "eth_getLogs" if an
         * error has been received but the error didn't suggest a range.
         */
        if (logsRequestMetadata.confirmedRange === undefined) {
            logsRequestMetadata.estimatedRange = Math.round(logsRequestMetadata.estimatedRange * 1.05);
        }
        return logs;
    };
    /**
     * Extract block, using `blockCache` to avoid fetching
     * the same block twice. Also, update `latestBlock`.
     *
     * @param number Block to be extracted
     *
     * Note: This function could more accurately skip chain requests by taking
     * advantage of `syncStore.hasBlock` and `syncStore.hasTransaction`.
     */
    const syncBlock = async (number) => {
        let block;
        /**
         * `blockCache` contains all blocks that have been extracted during the
         * current call to `sync()`. If `number` is present in `blockCache` use it,
         * otherwise, request the block and add it to `blockCache` and the sync-store.
         */
        if (blockCache.has(number)) {
            block = await blockCache.get(number);
        }
        else {
            const _block = _eth_getBlockByNumber(args.rpc, {
                blockNumber: toHex(number),
            });
            blockCache.set(number, _block);
            block = await _block;
            // Update `latestBlock` if `block` is closer to tip.
            if (hexToBigInt(block.number) >= hexToBigInt(latestBlock?.number ?? "0x0")) {
                latestBlock = block;
            }
        }
        return block;
    };
    const syncTrace = async (block) => {
        if (traceCache.has(block)) {
            return await traceCache.get(block);
        }
        else {
            const traces = _debug_traceBlockByNumber(args.rpc, {
                blockNumber: block,
            });
            traceCache.set(block, traces);
            return await traces;
        }
    };
    const syncTransactionReceipts = async (block, transactionHashes) => {
        if (transactionHashes.size === 0) {
            return [];
        }
        if (isBlockReceipts === false) {
            const transactionReceipts = await Promise.all(Array.from(transactionHashes).map((hash) => syncTransactionReceipt(hash)));
            validateReceiptsAndBlock(transactionReceipts, block, "eth_getTransactionReceipt");
            return transactionReceipts;
        }
        let blockReceipts;
        try {
            blockReceipts = await syncBlockReceipts(block);
        }
        catch (_error) {
            const error = _error;
            args.common.logger.warn({
                service: "sync",
                msg: `Caught eth_getBlockReceipts error on '${args.chain.name}', switching to eth_getTransactionReceipt method.`,
                error,
            });
            isBlockReceipts = false;
            return syncTransactionReceipts(block, transactionHashes);
        }
        validateReceiptsAndBlock(blockReceipts, block, "eth_getBlockReceipts");
        const transactionReceipts = blockReceipts.filter((receipt) => transactionHashes.has(receipt.transactionHash));
        return transactionReceipts;
    };
    const syncTransactionReceipt = async (transaction) => {
        if (transactionReceiptsCache.has(transaction)) {
            return await transactionReceiptsCache.get(transaction);
        }
        else {
            const receipt = _eth_getTransactionReceipt(args.rpc, {
                hash: transaction,
            });
            transactionReceiptsCache.set(transaction, receipt);
            return await receipt;
        }
    };
    const syncBlockReceipts = async (block) => {
        if (blockReceiptsCache.has(block.hash)) {
            return await blockReceiptsCache.get(block.hash);
        }
        else {
            const blockReceipts = _eth_getBlockReceipts(args.rpc, {
                blockHash: block.hash,
            });
            blockReceiptsCache.set(block.hash, blockReceipts);
            return await blockReceipts;
        }
    };
    /** Extract and insert the log-based addresses that match `filter` + `interval`. */
    const syncLogFactory = async (factory, interval) => {
        const logs = await syncLogsDynamic({
            filter: factory,
            interval,
            address: factory.address,
        });
        const childAddresses = new Map();
        for (const log of logs) {
            if (isLogFactoryMatched({ factory, log })) {
                const address = getChildAddress({ log, factory });
                if (childAddresses.has(address) === false) {
                    childAddresses.set(address, hexToNumber(log.blockNumber));
                }
            }
        }
        // Note: `factory` must refer to the same original `factory` in `filter`
        // and not be a recovered factory from `recoverFilter`.
        await args.syncStore.insertChildAddresses({
            factory,
            childAddresses,
            chainId: args.chain.id,
        });
    };
    /**
     * Return all addresses that match `filter` after extracting addresses
     * that match `filter` and `interval`.
     */
    const syncAddressFactory = async (factory, interval) => {
        const factoryInterval = [
            Math.max(factory.fromBlock ?? 0, interval[0]),
            Math.min(factory.toBlock ?? Number.POSITIVE_INFINITY, interval[1]),
        ];
        if (factoryInterval[0] <= factoryInterval[1]) {
            await syncLogFactory(factory, factoryInterval);
        }
        // Note: `factory` must refer to the same original `factory` in `filter`
        // and not be a recovered factory from `recoverFilter`.
        return args.syncStore.getChildAddresses({ factory });
    };
    ////////
    // Helper function for filter types
    ////////
    const syncLogFilter = async (filter, interval) => {
        let logs;
        if (isAddressFactory(filter.address)) {
            const childAddresses = await syncAddressFactory(filter.address, interval);
            // Note: Exit early when only the factory needs to be synced
            if ((filter.fromBlock ?? 0) > interval[1])
                return;
            logs = await syncLogsDynamic({
                filter,
                interval,
                address: childAddresses.size >=
                    args.common.options.factoryAddressCountThreshold
                    ? undefined
                    : Array.from(childAddresses.keys()),
            });
            logs = logs.filter((log) => isAddressMatched({
                address: log.address,
                blockNumber: hexToNumber(log.blockNumber),
                childAddresses,
            }));
        }
        else {
            logs = await syncLogsDynamic({
                filter,
                interval,
                address: filter.address,
            });
        }
        await args.syncStore.insertLogs({ logs, chainId: args.chain.id });
        const logsPerBlock = new Map();
        for (const log of logs) {
            const blockNumber = hexToNumber(log.blockNumber);
            if (logsPerBlock.has(blockNumber) === false) {
                logsPerBlock.set(blockNumber, []);
            }
            logsPerBlock.get(blockNumber).push(log);
        }
        const blocks = await Promise.all(Array.from(logsPerBlock.keys()).map(syncBlock));
        // Validate that logs point to the valid transaction hash in the block
        for (const block of blocks) {
            const logs = logsPerBlock.get(hexToNumber(block.number));
            validateTransactionsAndBlock(block);
            validateLogsAndBlock(logs, block);
            for (const log of logs) {
                if (log.transactionHash === zeroHash) {
                    args.common.logger.warn({
                        service: "sync",
                        msg: `Detected '${args.chain.name}' log with empty transaction hash in block ${block.hash} at log index ${hexToNumber(log.logIndex)}. This is expected for some chains like ZKsync.`,
                    });
                }
            }
        }
        const transactionHashes = new Set(logs.map((l) => l.transactionHash));
        for (const hash of transactionHashes) {
            transactionsCache.add(hash);
        }
        if (shouldGetTransactionReceipt(filter)) {
            const transactionReceipts = await Promise.all(blocks.map((block) => {
                const blockTransactionHashes = new Set();
                for (const log of logsPerBlock.get(hexToNumber(block.number))) {
                    if (log.transactionHash !== zeroHash) {
                        blockTransactionHashes.add(log.transactionHash);
                    }
                }
                return syncTransactionReceipts(block, blockTransactionHashes);
            })).then((receipts) => receipts.flat());
            await args.syncStore.insertTransactionReceipts({
                transactionReceipts,
                chainId: args.chain.id,
            });
        }
    };
    const syncBlockFilter = async (filter, interval) => {
        const baseOffset = (interval[0] - filter.offset) % filter.interval;
        const offset = baseOffset === 0 ? 0 : filter.interval - baseOffset;
        // Determine which blocks are matched by the block filter.
        const requiredBlocks = [];
        for (let b = interval[0] + offset; b <= interval[1]; b += filter.interval) {
            requiredBlocks.push(b);
        }
        await Promise.all(requiredBlocks.map(async (number) => {
            const block = await syncBlock(number);
            validateTransactionsAndBlock(block);
            return block;
        }));
    };
    const syncTransactionFilter = async (filter, interval) => {
        const fromChildAddresses = isAddressFactory(filter.fromAddress)
            ? await syncAddressFactory(filter.fromAddress, interval)
            : undefined;
        const toChildAddresses = isAddressFactory(filter.toAddress)
            ? await syncAddressFactory(filter.toAddress, interval)
            : undefined;
        // Note: Exit early when only the factory needs to be synced
        if ((filter.fromBlock ?? 0) > interval[1])
            return;
        const blocks = await Promise.all(intervalRange(interval).map((number) => syncBlock(number)));
        const transactionHashes = new Set();
        const requiredBlocks = new Set();
        for (const block of blocks) {
            validateTransactionsAndBlock(block);
            for (const transaction of block.transactions) {
                if (isTransactionFilterMatched({ filter, transaction }) === false) {
                    continue;
                }
                if (isAddressFactory(filter.fromAddress) &&
                    isAddressMatched({
                        address: transaction.from,
                        blockNumber: Number(block.number),
                        childAddresses: fromChildAddresses,
                    }) === false) {
                    continue;
                }
                if (isAddressFactory(filter.toAddress) &&
                    isAddressMatched({
                        address: transaction.to ?? undefined,
                        blockNumber: Number(block.number),
                        childAddresses: toChildAddresses,
                    }) === false) {
                    continue;
                }
                transactionHashes.add(transaction.hash);
                requiredBlocks.add(block);
            }
        }
        for (const hash of transactionHashes) {
            transactionsCache.add(hash);
        }
        const transactionReceipts = await Promise.all(Array.from(requiredBlocks).map((block) => {
            const blockTransactionHashes = new Set(block.transactions
                .filter((t) => transactionHashes.has(t.hash))
                .map((t) => t.hash));
            return syncTransactionReceipts(block, blockTransactionHashes);
        })).then((receipts) => receipts.flat());
        await args.syncStore.insertTransactionReceipts({
            transactionReceipts,
            chainId: args.chain.id,
        });
    };
    const syncTraceOrTransferFilter = async (filter, interval) => {
        const fromChildAddresses = isAddressFactory(filter.fromAddress)
            ? await syncAddressFactory(filter.fromAddress, interval)
            : undefined;
        const toChildAddresses = isAddressFactory(filter.toAddress)
            ? await syncAddressFactory(filter.toAddress, interval)
            : undefined;
        // Note: Exit early when only the factory needs to be synced
        if ((filter.fromBlock ?? 0) > interval[1])
            return;
        const requiredBlocks = new Set();
        const traces = await Promise.all(intervalRange(interval).map(async (number) => {
            let traces = await syncTrace(number);
            // remove unmatched traces
            traces = traces.filter((trace) => {
                if (filter.type === "trace" &&
                    isTraceFilterMatched({
                        filter,
                        trace: trace.trace,
                        block: { number: BigInt(number) },
                    }) === false) {
                    return false;
                }
                if (filter.type === "transfer" &&
                    isTransferFilterMatched({
                        filter,
                        trace: trace.trace,
                        block: { number: BigInt(number) },
                    }) === false) {
                    return false;
                }
                if (isAddressFactory(filter.fromAddress) &&
                    isAddressMatched({
                        address: trace.trace.from,
                        blockNumber: number,
                        childAddresses: fromChildAddresses,
                    }) === false) {
                    return false;
                }
                if (isAddressFactory(filter.toAddress) &&
                    isAddressMatched({
                        address: trace.trace.to,
                        blockNumber: number,
                        childAddresses: toChildAddresses,
                    }) === false) {
                    return false;
                }
                return true;
            });
            if (traces.length === 0)
                return [];
            const block = await syncBlock(number);
            validateTransactionsAndBlock(block);
            validateTracesAndBlock(traces, block);
            requiredBlocks.add(block);
            const transactionsByHash = new Map();
            for (const transaction of block.transactions) {
                transactionsByHash.set(transaction.hash, transaction);
            }
            return traces.map((trace) => {
                const transaction = transactionsByHash.get(trace.transactionHash);
                transactionsCache.add(trace.transactionHash);
                return { trace, transaction, block };
            });
        })).then((traces) => traces.flat());
        await args.syncStore.insertTraces({
            traces,
            chainId: args.chain.id,
        });
        if (shouldGetTransactionReceipt(filter)) {
            const transactionReceipts = await Promise.all(Array.from(requiredBlocks).map((block) => {
                const blockTransactionHashes = new Set(traces
                    .filter((t) => t.block.hash === block.hash)
                    .map((t) => t.transaction.hash));
                return syncTransactionReceipts(block, blockTransactionHashes);
            })).then((receipts) => receipts.flat());
            await args.syncStore.insertTransactionReceipts({
                transactionReceipts,
                chainId: args.chain.id,
            });
        }
    };
    return {
        intervalsCache,
        async sync(_interval) {
            const intervalsToSync = [];
            // Determine the requests that need to be made, and which intervals need to be inserted.
            // Fragments are used to create a minimal filter, to avoid refetching data even if a filter
            // is only partially synced.
            for (const { filter } of args.sources) {
                let filterIntervals = [
                    [
                        Math.max(filter.fromBlock ?? 0, _interval[0]),
                        Math.min(filter.toBlock ?? Number.POSITIVE_INFINITY, _interval[1]),
                    ],
                ];
                switch (filter.type) {
                    case "log":
                        if (isAddressFactory(filter.address)) {
                            filterIntervals.push([
                                Math.max(filter.address.fromBlock ?? 0, _interval[0]),
                                Math.min(filter.address.toBlock ?? Number.POSITIVE_INFINITY, _interval[1]),
                            ]);
                        }
                        break;
                    case "trace":
                    case "transaction":
                    case "transfer":
                        if (isAddressFactory(filter.fromAddress)) {
                            filterIntervals.push([
                                Math.max(filter.fromAddress.fromBlock ?? 0, _interval[0]),
                                Math.min(filter.fromAddress.toBlock ?? Number.POSITIVE_INFINITY, _interval[1]),
                            ]);
                        }
                        if (isAddressFactory(filter.toAddress)) {
                            filterIntervals.push([
                                Math.max(filter.toAddress.fromBlock ?? 0, _interval[0]),
                                Math.min(filter.toAddress.toBlock ?? Number.POSITIVE_INFINITY, _interval[1]),
                            ]);
                        }
                }
                filterIntervals = filterIntervals.filter(([start, end]) => start <= end);
                if (filterIntervals.length === 0) {
                    continue;
                }
                filterIntervals = intervalUnion(filterIntervals);
                const completedIntervals = intervalsCache.get(filter);
                const requiredIntervals = [];
                for (const { fragment, intervals: fragmentIntervals, } of completedIntervals) {
                    const requiredFragmentIntervals = intervalDifference(filterIntervals, fragmentIntervals);
                    if (requiredFragmentIntervals.length > 0) {
                        requiredIntervals.push({
                            fragment,
                            intervals: requiredFragmentIntervals,
                        });
                    }
                }
                if (requiredIntervals.length > 0) {
                    const requiredInterval = intervalBounds(requiredIntervals.flatMap(({ intervals }) => intervals));
                    const requiredFilter = recoverFilter(filter, requiredIntervals.map(({ fragment }) => fragment));
                    intervalsToSync.push({
                        filter: requiredFilter,
                        interval: requiredInterval,
                    });
                }
            }
            await Promise.all(intervalsToSync.map(async ({ filter, interval }) => {
                // Request last block of interval
                const blockPromise = syncBlock(interval[1]);
                try {
                    switch (filter.type) {
                        case "log": {
                            await syncLogFilter(filter, interval);
                            break;
                        }
                        case "block": {
                            await syncBlockFilter(filter, interval);
                            break;
                        }
                        case "transaction": {
                            await syncTransactionFilter(filter, interval);
                            break;
                        }
                        case "trace":
                        case "transfer": {
                            await syncTraceOrTransferFilter(filter, interval);
                            break;
                        }
                    }
                }
                catch (_error) {
                    const error = _error;
                    if (args.common.shutdown.isKilled) {
                        throw new ShutdownError();
                    }
                    args.common.logger.error({
                        service: "sync",
                        msg: `Fatal error: Unable to sync '${args.chain.name}' from ${interval[0]} to ${interval[1]}.`,
                        error,
                    });
                    args.onFatalError(error);
                    return;
                }
                await blockPromise;
            }));
            const blocks = await Promise.all(blockCache.values());
            await Promise.all([
                args.syncStore.insertBlocks({ blocks, chainId: args.chain.id }),
                args.syncStore.insertTransactions({
                    transactions: blocks.flatMap((block) => block.transactions.filter(({ hash }) => transactionsCache.has(hash))),
                    chainId: args.chain.id,
                }),
            ]);
            // Add corresponding intervals to the sync-store
            // Note: this should happen after so the database doesn't become corrupted
            if (args.chain.disableCache === false) {
                await args.syncStore.insertIntervals({
                    intervals: intervalsToSync,
                    chainId: args.chain.id,
                });
            }
            blockCache.clear();
            traceCache.clear();
            transactionsCache.clear();
            blockReceiptsCache.clear();
            transactionReceiptsCache.clear();
            return latestBlock;
        },
    };
};
//# sourceMappingURL=index.js.map