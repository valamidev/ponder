import { ShutdownError } from '../internal/errors.js';
import { getChildAddress, isAddressFactory, isAddressMatched, isBlockFilterMatched, isLogFactoryMatched, isLogFilterMatched, isTraceFilterMatched, isTransactionFilterMatched, isTransferFilterMatched, shouldGetTransactionReceipt, } from '../sync/filter.js';
import { syncBlockToLightBlock } from '../sync/index.js';
import { mutex } from '../utils/mutex.js';
import { range } from '../utils/range.js';
import { _debug_traceBlockByHash, _eth_getBlockByHash, _eth_getBlockByNumber, _eth_getBlockReceipts, _eth_getLogs, _eth_getTransactionReceipt, validateLogsAndBlock, validateReceiptsAndBlock, validateTracesAndBlock, validateTransactionsAndBlock, } from '../utils/rpc.js';
import { wait } from '../utils/wait.js';
import { hexToNumber, zeroHash } from "viem";
import { isFilterInBloom, isInBloom, zeroLogsBloom } from "./bloom.js";
const MAX_LATEST_BLOCK_ATTEMPT_MS = 3 * 60 * 1000; // 3 minutes
const ERROR_TIMEOUT = [
    1, 2, 5, 10, 30, 60, 60, 60, 60, 60, 60, 60, 60, 60,
];
const MAX_QUEUED_BLOCKS = 25;
export const createRealtimeSync = (args) => {
    ////////
    // state
    ////////
    let isBlockReceipts = true;
    let finalizedBlock = args.syncProgress.finalized;
    const childAddresses = args.initialChildAddresses;
    /** Annotates `childAddresses` for efficient lookup by block number */
    const childAddressesPerBlock = new Map();
    /**
     * Blocks that have been ingested and are
     * waiting to be finalized. It is an invariant that
     * all blocks are linked to each other,
     * `parentHash` => `hash`.
     */
    let unfinalizedBlocks = [];
    let fetchAndReconcileLatestBlockErrorCount = 0;
    let reconcileBlockErrorCount = 0;
    const factories = [];
    const logFilters = [];
    const traceFilters = [];
    const transactionFilters = [];
    const transferFilters = [];
    const blockFilters = [];
    for (const source of args.sources) {
        // Collect filters from sources
        if (source.type === "contract") {
            if (source.filter.type === "log") {
                logFilters.push(source.filter);
            }
            else if (source.filter.type === "trace") {
                traceFilters.push(source.filter);
            }
        }
        else if (source.type === "account") {
            if (source.filter.type === "transaction") {
                transactionFilters.push(source.filter);
            }
            else if (source.filter.type === "transfer") {
                transferFilters.push(source.filter);
            }
        }
        else if (source.type === "block") {
            blockFilters.push(source.filter);
        }
        // Collect factories from sources
        switch (source.filter.type) {
            case "trace":
            case "transaction":
            case "transfer": {
                const { fromAddress, toAddress } = source.filter;
                if (isAddressFactory(fromAddress)) {
                    factories.push(fromAddress);
                }
                if (isAddressFactory(toAddress)) {
                    factories.push(toAddress);
                }
                break;
            }
            case "log": {
                const { address } = source.filter;
                if (isAddressFactory(address)) {
                    factories.push(address);
                }
                break;
            }
        }
    }
    const syncTransactionReceipts = async (block, transactionHashes) => {
        if (transactionHashes.size === 0) {
            return [];
        }
        if (isBlockReceipts === false) {
            const transactionReceipts = await Promise.all(Array.from(transactionHashes).map(async (hash) => _eth_getTransactionReceipt(args.rpc, { hash })));
            validateReceiptsAndBlock(transactionReceipts, block, "eth_getTransactionReceipt");
            return transactionReceipts;
        }
        let blockReceipts;
        try {
            blockReceipts = await _eth_getBlockReceipts(args.rpc, {
                blockHash: block.hash,
            });
        }
        catch (_error) {
            const error = _error;
            args.common.logger.warn({
                service: "realtime",
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
    const getLatestUnfinalizedBlock = () => {
        if (unfinalizedBlocks.length === 0) {
            return finalizedBlock;
        }
        else
            return unfinalizedBlocks[unfinalizedBlocks.length - 1];
    };
    /**
     * Fetch all data (logs, traces, receipts) for the specified block required by `args.sources`
     *
     * @dev The data returned by this function may include false positives. This
     * is due to the fact that factory addresses are unknown and are always
     * treated as "matched".
     */
    const fetchBlockEventData = async (maybeBlockHeader) => {
        let block;
        if (maybeBlockHeader.transactions !== undefined) {
            block = maybeBlockHeader;
        }
        ////////
        // Logs
        ////////
        // "eth_getLogs" calls can be skipped if no filters match `newHeadBlock.logsBloom`.
        const shouldRequestLogs = maybeBlockHeader.logsBloom === zeroLogsBloom ||
            logFilters.some((filter) => isFilterInBloom({ block: maybeBlockHeader, filter }));
        let logs = [];
        if (shouldRequestLogs) {
            if (block === undefined) {
                [block, logs] = await Promise.all([
                    _eth_getBlockByHash(args.rpc, { hash: maybeBlockHeader.hash }),
                    _eth_getLogs(args.rpc, { blockHash: maybeBlockHeader.hash }),
                ]);
            }
            else {
                logs = await _eth_getLogs(args.rpc, { blockHash: block.hash });
            }
            validateLogsAndBlock(logs, block);
            // Note: Exact `logsBloom` validations were considered too strict to add to `validateLogsAndBlock`.
            let isInvalidLogsBloom = false;
            for (const log of logs) {
                if (isInBloom(block.logsBloom, log.address) === false) {
                    isInvalidLogsBloom = true;
                }
                if (log.topics[0] &&
                    isInBloom(block.logsBloom, log.topics[0]) === false) {
                    isInvalidLogsBloom = true;
                }
                if (log.topics[1] &&
                    isInBloom(block.logsBloom, log.topics[1]) === false) {
                    isInvalidLogsBloom = true;
                }
                if (log.topics[2] &&
                    isInBloom(block.logsBloom, log.topics[2]) === false) {
                    isInvalidLogsBloom = true;
                }
                if (log.topics[3] &&
                    isInBloom(block.logsBloom, log.topics[3]) === false) {
                    isInvalidLogsBloom = true;
                }
                if (isInvalidLogsBloom) {
                    args.common.logger.warn({
                        service: "realtime",
                        msg: `Detected inconsistent RPC responses. Log at index ${log.logIndex} is not in 'block.logsBloom' for block ${block.hash}.`,
                    });
                    break;
                }
            }
            for (const log of logs) {
                if (log.transactionHash === zeroHash) {
                    args.common.logger.warn({
                        service: "realtime",
                        msg: `Detected '${args.chain.name}' log with empty transaction hash in block ${block.hash} at log index ${hexToNumber(log.logIndex)}. This is expected for some chains like ZKsync.`,
                    });
                }
            }
        }
        if (shouldRequestLogs === false &&
            args.sources.some((s) => s.filter.type === "log")) {
            args.common.logger.debug({
                service: "realtime",
                msg: `Skipped fetching '${args.chain.name}' logs for block ${hexToNumber(maybeBlockHeader.number)} due to bloom filter result`,
            });
        }
        ////////
        // Traces
        ////////
        const shouldRequestTraces = traceFilters.length > 0 || transferFilters.length > 0;
        let traces = [];
        if (shouldRequestTraces) {
            if (block === undefined) {
                [block, traces] = await Promise.all([
                    _eth_getBlockByHash(args.rpc, { hash: maybeBlockHeader.hash }),
                    _debug_traceBlockByHash(args.rpc, { hash: maybeBlockHeader.hash }),
                ]);
            }
            else {
                traces = await _debug_traceBlockByHash(args.rpc, { hash: block.hash });
            }
            validateTracesAndBlock(traces, block);
        }
        ////////
        // Get Matched
        ////////
        // Record `blockChildAddresses` that contain factory child addresses
        const blockChildAddresses = new Map();
        for (const factory of factories) {
            blockChildAddresses.set(factory, new Set());
            for (const log of logs) {
                if (isLogFactoryMatched({ factory, log })) {
                    const address = getChildAddress({ log, factory });
                    blockChildAddresses.get(factory).add(address);
                }
            }
        }
        const requiredTransactions = new Set();
        const requiredTransactionReceipts = new Set();
        // Remove logs that don't match a filter, recording required transactions
        logs = logs.filter((log) => {
            let isMatched = false;
            for (const filter of logFilters) {
                if (isLogFilterMatched({ filter, log })) {
                    isMatched = true;
                    if (log.transactionHash !== zeroHash) {
                        requiredTransactions.add(log.transactionHash);
                        if (shouldGetTransactionReceipt(filter)) {
                            requiredTransactionReceipts.add(log.transactionHash);
                            // skip to next log
                            break;
                        }
                    }
                }
            }
            return isMatched;
        });
        // Initial weak trace filtering before full filtering with factory addresses in handleBlock
        traces = traces.filter((trace) => {
            let isMatched = false;
            for (const filter of transferFilters) {
                if (isTransferFilterMatched({
                    filter,
                    trace: trace.trace,
                    block: maybeBlockHeader,
                })) {
                    requiredTransactions.add(trace.transactionHash);
                    isMatched = true;
                    if (shouldGetTransactionReceipt(filter)) {
                        requiredTransactionReceipts.add(trace.transactionHash);
                        // skip to next trace
                        break;
                    }
                }
            }
            for (const filter of traceFilters) {
                if (isTraceFilterMatched({
                    filter,
                    trace: trace.trace,
                    block: maybeBlockHeader,
                })) {
                    requiredTransactions.add(trace.transactionHash);
                    isMatched = true;
                    if (shouldGetTransactionReceipt(filter)) {
                        requiredTransactionReceipts.add(trace.transactionHash);
                        // skip to next trace
                        break;
                    }
                }
            }
            return isMatched;
        });
        ////////
        // Transactions
        ////////
        // exit early if no logs or traces were requested and no transactions are required
        if (block === undefined && transactionFilters.length === 0) {
            return {
                block: maybeBlockHeader,
                transactions: [],
                transactionReceipts: [],
                logs: [],
                traces: [],
                childAddresses: blockChildAddresses,
            };
        }
        if (block === undefined) {
            block = await _eth_getBlockByHash(args.rpc, {
                hash: maybeBlockHeader.hash,
            });
        }
        validateTransactionsAndBlock(block);
        const transactions = block.transactions.filter((transaction) => {
            let isMatched = requiredTransactions.has(transaction.hash);
            for (const filter of transactionFilters) {
                if (isTransactionFilterMatched({ filter, transaction })) {
                    requiredTransactions.add(transaction.hash);
                    requiredTransactionReceipts.add(transaction.hash);
                    isMatched = true;
                }
            }
            return isMatched;
        });
        ////////
        // Transaction Receipts
        ////////
        const transactionReceipts = await syncTransactionReceipts(block, requiredTransactionReceipts);
        return {
            block,
            transactions,
            transactionReceipts,
            logs,
            traces,
            childAddresses: blockChildAddresses,
        };
    };
    /**
     * Filter the block event data using the filters and child addresses.
     */
    const filterBlockEventData = ({ block, logs, traces, transactions, transactionReceipts, childAddresses: blockChildAddresses, }) => {
        // Update `childAddresses`
        for (const factory of factories) {
            for (const address of blockChildAddresses.get(factory)) {
                if (childAddresses.get(factory).has(address) === false) {
                    childAddresses.get(factory).set(address, hexToNumber(block.number));
                }
                else {
                    blockChildAddresses.get(factory).delete(address);
                }
            }
        }
        // Save per block child addresses so that they can be undone in the event of a reorg.
        childAddressesPerBlock.set(hexToNumber(block.number), blockChildAddresses);
        /**
         * `logs` and `callTraces` must be filtered again (already filtered in `extract`)
         *  because `extract` doesn't have factory address information.
         */
        const matchedFilters = new Set();
        // Remove logs that don't match a filter, accounting for factory addresses
        logs = logs.filter((log) => {
            let isMatched = false;
            for (const filter of logFilters) {
                if (isLogFilterMatched({ filter, log }) &&
                    (isAddressFactory(filter.address)
                        ? isAddressMatched({
                            address: log.address,
                            blockNumber: hexToNumber(block.number),
                            childAddresses: childAddresses.get(filter.address),
                        })
                        : true)) {
                    matchedFilters.add(filter);
                    isMatched = true;
                }
            }
            return isMatched;
        });
        traces = traces.filter((trace) => {
            let isMatched = false;
            for (const filter of transferFilters) {
                if (isTransferFilterMatched({
                    filter,
                    trace: trace.trace,
                    block,
                }) &&
                    (isAddressFactory(filter.fromAddress)
                        ? isAddressMatched({
                            address: trace.trace.from,
                            blockNumber: hexToNumber(block.number),
                            childAddresses: childAddresses.get(filter.fromAddress),
                        })
                        : true) &&
                    (isAddressFactory(filter.toAddress)
                        ? isAddressMatched({
                            address: trace.trace.to,
                            blockNumber: hexToNumber(block.number),
                            childAddresses: childAddresses.get(filter.toAddress),
                        })
                        : true)) {
                    matchedFilters.add(filter);
                    isMatched = true;
                }
            }
            for (const filter of traceFilters) {
                if (isTraceFilterMatched({
                    filter,
                    trace: trace.trace,
                    block,
                }) &&
                    (isAddressFactory(filter.fromAddress)
                        ? isAddressMatched({
                            address: trace.trace.from,
                            blockNumber: hexToNumber(block.number),
                            childAddresses: childAddresses.get(filter.fromAddress),
                        })
                        : true) &&
                    (isAddressFactory(filter.toAddress)
                        ? isAddressMatched({
                            address: trace.trace.to,
                            blockNumber: hexToNumber(block.number),
                            childAddresses: childAddresses.get(filter.toAddress),
                        })
                        : true)) {
                    matchedFilters.add(filter);
                    isMatched = true;
                }
            }
            return isMatched;
        });
        // Remove transactions and transaction receipts that may have been filtered out
        const transactionHashes = new Set();
        for (const log of logs) {
            transactionHashes.add(log.transactionHash);
        }
        for (const trace of traces) {
            transactionHashes.add(trace.transactionHash);
        }
        transactions = transactions.filter((transaction) => {
            let isMatched = transactionHashes.has(transaction.hash);
            for (const filter of transactionFilters) {
                if (isTransactionFilterMatched({
                    filter,
                    transaction,
                }) &&
                    (isAddressFactory(filter.fromAddress)
                        ? isAddressMatched({
                            address: transaction.from,
                            blockNumber: hexToNumber(block.number),
                            childAddresses: childAddresses.get(filter.fromAddress),
                        })
                        : true) &&
                    (isAddressFactory(filter.toAddress)
                        ? isAddressMatched({
                            address: transaction.to ?? undefined,
                            blockNumber: hexToNumber(block.number),
                            childAddresses: childAddresses.get(filter.toAddress),
                        })
                        : true)) {
                    matchedFilters.add(filter);
                    isMatched = true;
                }
            }
            return isMatched;
        });
        for (const transaction of transactions) {
            transactionHashes.add(transaction.hash);
        }
        transactionReceipts = transactionReceipts.filter((t) => transactionHashes.has(t.transactionHash));
        // Record matched block filters
        for (const filter of blockFilters) {
            if (isBlockFilterMatched({ filter, block })) {
                matchedFilters.add(filter);
            }
        }
        return {
            matchedFilters,
            block,
            logs,
            transactions,
            transactionReceipts,
            traces,
            childAddresses: blockChildAddresses,
        };
    };
    /**
     * Traverse the remote chain until we find a block that is
     * compatible with our local chain.
     *
     * @param block Block that caused reorg to be detected.
     * Must be at most 1 block ahead of the local chain.
     */
    const reconcileReorg = async (block) => {
        args.common.logger.warn({
            service: "realtime",
            msg: `Detected forked '${args.chain.name}' block at height ${hexToNumber(block.number)}`,
        });
        // Record blocks that have been removed from the local chain.
        const reorgedBlocks = unfinalizedBlocks.filter((lb) => hexToNumber(lb.number) >= hexToNumber(block.number));
        // Prune the local chain of blocks that have been reorged out
        unfinalizedBlocks = unfinalizedBlocks.filter((lb) => hexToNumber(lb.number) < hexToNumber(block.number));
        // Block we are attempting to fit into the local chain.
        let remoteBlock = block;
        while (true) {
            const parentBlock = getLatestUnfinalizedBlock();
            if (parentBlock.hash === remoteBlock.parentHash)
                break;
            if (unfinalizedBlocks.length === 0) {
                // No compatible block was found in the local chain, must be a deep reorg.
                // Note: reorgedBlocks aren't removed from `unfinalizedBlocks` because we are "bailing"
                // from this attempt to reconcile the reorg, we need to reset the local chain state back
                // to what it was before we started.
                unfinalizedBlocks = reorgedBlocks;
                const msg = `Encountered unrecoverable '${args.chain.name}' reorg beyond finalized block ${hexToNumber(finalizedBlock.number)}`;
                args.common.logger.warn({ service: "realtime", msg });
                throw new Error(msg);
            }
            else {
                remoteBlock = await _eth_getBlockByHash(args.rpc, {
                    hash: remoteBlock.parentHash,
                });
                // Add tip to `reorgedBlocks`
                reorgedBlocks.unshift(unfinalizedBlocks.pop());
            }
        }
        const commonAncestor = getLatestUnfinalizedBlock();
        const reorgPromise = args.onEvent({
            type: "reorg",
            block: commonAncestor,
            reorgedBlocks,
        });
        args.common.logger.warn({
            service: "realtime",
            msg: `Reconciled ${reorgedBlocks.length}-block '${args.chain.name}' reorg with common ancestor block ${hexToNumber(commonAncestor.number)}`,
        });
        // remove reorged blocks from `childAddresses`
        for (const block of reorgedBlocks) {
            for (const factory of factories) {
                const addresses = childAddressesPerBlock
                    .get(hexToNumber(block.number))
                    .get(factory);
                for (const address of addresses) {
                    childAddresses.get(factory).delete(address);
                }
            }
            childAddressesPerBlock.delete(hexToNumber(block.number));
        }
        return reorgPromise;
    };
    /**
     * Start syncing the latest block.
     */
    const fetchAndReconcileLatestBlock = async (block) => {
        try {
            args.common.logger.debug({
                service: "realtime",
                msg: `Received latest '${args.chain.name}' block ${hexToNumber(block.number)}`,
            });
            const latestBlock = getLatestUnfinalizedBlock();
            // We already saw and handled this block. No-op.
            if (latestBlock.hash === block.hash) {
                args.common.logger.trace({
                    service: "realtime",
                    msg: `Skipped processing '${args.chain.name}' block ${hexToNumber(block.number)}, already synced`,
                });
                return { type: "rejected" };
            }
            const blockWithEventData = await fetchBlockEventData(block);
            fetchAndReconcileLatestBlockErrorCount = 0;
            const result = await reconcileBlock(blockWithEventData);
            return resolvePending(result);
        }
        catch (_error) {
            onError(_error);
            return { type: "rejected" };
        }
    };
    const resolvePending = async (result) => {
        if (result.type === "pending") {
            return result.promise.then(resolvePending);
        }
        return result;
    };
    /**
     * Finish syncing a block.
     *
     * The four cases are:
     * 1) Block is the same as the one just processed, no-op.
     * 2) Block is behind the last processed. This is a sign that
     *    a reorg has occurred.
     * 3) Block is more than one ahead of the last processed,
     *    fetch all intermediate blocks and enqueue them again.
     * 4) Block is exactly one block ahead of the last processed,
     *    handle this new block (happy path).
     *
     * @dev This mutex only runs one at a time, every block is
     * processed serially.
     *
     * @returns
     * - `rejected` for case 1 and 2.
     * - `reorg` for case 2 with a promise that resolves once the reorg is applied.
     * - `pending` for case 3 with a promise that resolves once the block is
     *   settled as `rejected`, `accepted`, or `reorg`.
     * - `accepted` for case 4 with promises for the "block" and "finalize" events
     *   that resolve when each event is applied.
     */
    const reconcileBlock = mutex(async (blockWithEventData) => {
        const latestBlock = getLatestUnfinalizedBlock();
        const block = blockWithEventData.block;
        // We already saw and handled this block. No-op.
        if (latestBlock.hash === block.hash) {
            args.common.logger.trace({
                service: "realtime",
                msg: `Skipped processing '${args.chain.name}' block ${hexToNumber(block.number)}, already synced`,
            });
            return { type: "rejected" };
        }
        try {
            // Quickly check for a reorg by comparing block numbers. If the block
            // number has not increased, a reorg must have occurred.
            if (hexToNumber(latestBlock.number) >= hexToNumber(block.number)) {
                const reorgPromise = await reconcileReorg(block);
                return { type: "reorg", reorgPromise: reorgPromise.promise };
            }
            // Blocks are missing. They should be fetched and enqueued.
            if (hexToNumber(latestBlock.number) + 1 < hexToNumber(block.number)) {
                // Retrieve missing blocks, but only fetch a certain amount.
                const missingBlockRange = range(hexToNumber(latestBlock.number) + 1, Math.min(hexToNumber(block.number), hexToNumber(latestBlock.number) + MAX_QUEUED_BLOCKS));
                const pendingBlocks = await Promise.all(missingBlockRange.map((blockNumber) => _eth_getBlockByNumber(args.rpc, {
                    blockNumber,
                }).then((block) => fetchBlockEventData(block))));
                args.common.logger.info({
                    service: "realtime",
                    msg: `Fetched ${missingBlockRange.length} missing '${args.chain.name}' blocks [${hexToNumber(latestBlock.number) + 1}, ${Math.min(hexToNumber(block.number), hexToNumber(latestBlock.number) + MAX_QUEUED_BLOCKS)}]`,
                });
                reconcileBlock.clear(({ resolve }) => resolve({ type: "rejected" }));
                for (const pendingBlock of pendingBlocks) {
                    reconcileBlock(pendingBlock);
                }
                return {
                    type: "pending",
                    promise: reconcileBlock(blockWithEventData).then(resolvePending),
                };
            }
            // Check if a reorg occurred by validating the chain of block hashes.
            if (block.parentHash !== latestBlock.hash) {
                const reorgPromise = await reconcileReorg(block);
                return { type: "reorg", reorgPromise: reorgPromise.promise };
            }
            // New block is exactly one block ahead of the local chain.
            // Attempt to ingest it.
            const blockWithFilteredEventData = filterBlockEventData(blockWithEventData);
            if (blockWithFilteredEventData.logs.length > 0 ||
                blockWithFilteredEventData.traces.length > 0 ||
                blockWithFilteredEventData.transactions.length > 0) {
                const _text = [];
                if (blockWithFilteredEventData.logs.length === 1) {
                    _text.push("1 log");
                }
                else if (blockWithFilteredEventData.logs.length > 1) {
                    _text.push(`${blockWithFilteredEventData.logs.length} logs`);
                }
                if (blockWithFilteredEventData.traces.length === 1) {
                    _text.push("1 trace");
                }
                else if (blockWithFilteredEventData.traces.length > 1) {
                    _text.push(`${blockWithFilteredEventData.traces.length} traces`);
                }
                if (blockWithFilteredEventData.transactions.length === 1) {
                    _text.push("1 transaction");
                }
                else if (blockWithFilteredEventData.transactions.length > 1) {
                    _text.push(`${blockWithFilteredEventData.transactions.length} transactions`);
                }
                const text = _text.filter((t) => t !== undefined).join(" and ");
                args.common.logger.info({
                    service: "realtime",
                    msg: `Synced ${text} from '${args.chain.name}' block ${hexToNumber(block.number)}`,
                });
            }
            else {
                args.common.logger.info({
                    service: "realtime",
                    msg: `Synced block ${hexToNumber(block.number)} from '${args.chain.name}' `,
                });
            }
            unfinalizedBlocks.push(syncBlockToLightBlock(block));
            // Make sure `transactions` can be garbage collected
            blockWithEventData.block.transactions =
                blockWithFilteredEventData.block.transactions;
            const blockPromise = args.onEvent({
                type: "block",
                hasMatchedFilter: blockWithFilteredEventData.matchedFilters.size > 0,
                block: blockWithFilteredEventData.block,
                logs: blockWithFilteredEventData.logs,
                transactions: blockWithFilteredEventData.transactions,
                transactionReceipts: blockWithFilteredEventData.transactionReceipts,
                traces: blockWithFilteredEventData.traces,
                childAddresses: blockWithFilteredEventData.childAddresses,
            });
            // Determine if a new range has become finalized by evaluating if the
            // latest block number is 2 * finalityBlockCount >= finalized block number.
            // Essentially, there is a range the width of finalityBlockCount that is entirely
            // finalized.
            let finalizePromise;
            const blockMovesFinality = hexToNumber(block.number) >=
                hexToNumber(finalizedBlock.number) +
                    2 * args.chain.finalityBlockCount;
            if (blockMovesFinality) {
                const pendingFinalizedBlock = unfinalizedBlocks.find((lb) => hexToNumber(lb.number) ===
                    hexToNumber(block.number) - args.chain.finalityBlockCount);
                args.common.logger.debug({
                    service: "realtime",
                    msg: `Finalized ${hexToNumber(pendingFinalizedBlock.number) - hexToNumber(finalizedBlock.number) + 1} '${args.chain.name}' blocks [${hexToNumber(finalizedBlock.number) + 1}, ${hexToNumber(pendingFinalizedBlock.number)}]`,
                });
                const finalizedBlocks = unfinalizedBlocks.filter((lb) => hexToNumber(lb.number) <=
                    hexToNumber(pendingFinalizedBlock.number));
                unfinalizedBlocks = unfinalizedBlocks.filter((lb) => hexToNumber(lb.number) >
                    hexToNumber(pendingFinalizedBlock.number));
                for (const block of finalizedBlocks) {
                    childAddressesPerBlock.delete(hexToNumber(block.number));
                }
                finalizedBlock = pendingFinalizedBlock;
                finalizePromise = args.onEvent({
                    type: "finalize",
                    block: pendingFinalizedBlock,
                });
            }
            // Reset the error state after successfully completing the happy path.
            reconcileBlockErrorCount = 0;
            // Note: awaiting `indexedPromise` ensures that blocks are indexed immediately,
            // handling backpressure during the realtime "catchup" phase.
            const indexedPromise = blockPromise.then((result) => result.promise);
            await indexedPromise;
            return {
                type: "accepted",
                blockPromise: indexedPromise,
                finalizePromise: finalizePromise?.then((result) => result.promise),
            };
        }
        catch (_error) {
            const error = _error;
            if (args.common.shutdown.isKilled) {
                throw new ShutdownError();
            }
            args.common.logger.warn({
                service: "realtime",
                msg: `Failed to process '${args.chain.name}' block ${hexToNumber(block.number)}`,
                error,
            });
            const duration = ERROR_TIMEOUT[reconcileBlockErrorCount];
            args.common.logger.warn({
                service: "realtime",
                msg: `Retrying '${args.chain.name}' sync after ${duration} ${duration === 1 ? "second" : "seconds"}.`,
            });
            await wait(duration * 1000);
            // Remove all blocks from the queue. This protects against an
            // erroneous block causing a fatal error.
            reconcileBlock.clear(({ resolve }) => resolve({ type: "rejected" }));
            reconcileBlockErrorCount += 1;
            // After a certain number of attempts, emit a fatal error.
            if (reconcileBlockErrorCount === ERROR_TIMEOUT.length) {
                args.common.logger.error({
                    service: "realtime",
                    msg: `Fatal error: Unable to process '${args.chain.name}' block ${hexToNumber(block.number)} after ${ERROR_TIMEOUT.length} attempts.`,
                    error,
                });
                args.onFatalError(error);
            }
            return { type: "rejected" };
        }
    });
    const onError = (error) => {
        if (args.common.shutdown.isKilled) {
            throw new ShutdownError();
        }
        args.common.logger.warn({
            service: "realtime",
            msg: `Failed to fetch latest '${args.chain.name}' block`,
            error,
        });
        fetchAndReconcileLatestBlockErrorCount += 1;
        // After a certain number of attempts, emit a fatal error.
        if (fetchAndReconcileLatestBlockErrorCount * args.chain.pollingInterval >
            MAX_LATEST_BLOCK_ATTEMPT_MS) {
            args.common.logger.error({
                service: "realtime",
                msg: `Fatal error: Unable to fetch latest '${args.chain.name}' block after ${ERROR_TIMEOUT.length} attempts.`,
                error,
            });
            args.onFatalError(error);
        }
    };
    return {
        sync(block) {
            return fetchAndReconcileLatestBlock(block);
        },
        onError,
        get unfinalizedBlocks() {
            return unfinalizedBlocks;
        },
        get childAddresses() {
            return childAddresses;
        },
    };
};
//# sourceMappingURL=index.js.map