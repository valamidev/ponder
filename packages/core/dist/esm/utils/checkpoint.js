// 10 digits for unix timestamp gets us to the year 2277.
const BLOCK_TIMESTAMP_DIGITS = 10;
// Chain IDs are uint256. As of writing the largest Chain ID on https://chainlist.org
// is 13 digits. 16 digits should be enough (JavaScript's max safe integer).
const CHAIN_ID_DIGITS = 16;
// Same logic as chain ID.
const BLOCK_NUMBER_DIGITS = 16;
// Same logic as chain ID.
const TRANSACTION_INDEX_DIGITS = 16;
// At time of writing, we only have 2 event types planned, so one digit (10 types) is enough.
const EVENT_TYPE_DIGITS = 1;
// This could contain log index, trace index, etc. 16 digits should be enough.
const EVENT_INDEX_DIGITS = 16;
const CHECKPOINT_LENGTH = BLOCK_TIMESTAMP_DIGITS +
    CHAIN_ID_DIGITS +
    BLOCK_NUMBER_DIGITS +
    TRANSACTION_INDEX_DIGITS +
    EVENT_TYPE_DIGITS +
    EVENT_INDEX_DIGITS;
export const EVENT_TYPES = {
    transactions: 2,
    blocks: 5,
    logs: 5,
    traces: 7,
};
export const encodeCheckpoint = (checkpoint) => {
    const { blockTimestamp, chainId, blockNumber, transactionIndex, eventType, eventIndex, } = checkpoint;
    if (eventType < 0 || eventType > 9)
        throw new Error(`Got invalid event type ${eventType}, expected a number from 0 to 9`);
    const result = blockTimestamp.toString().padStart(BLOCK_TIMESTAMP_DIGITS, "0") +
        chainId.toString().padStart(CHAIN_ID_DIGITS, "0") +
        blockNumber.toString().padStart(BLOCK_NUMBER_DIGITS, "0") +
        transactionIndex.toString().padStart(TRANSACTION_INDEX_DIGITS, "0") +
        eventType.toString() +
        eventIndex.toString().padStart(EVENT_INDEX_DIGITS, "0");
    if (result.length !== CHECKPOINT_LENGTH)
        throw new Error(`Invalid stringified checkpoint: ${result}`);
    return result;
};
export const decodeCheckpoint = (checkpoint) => {
    let offset = 0;
    const blockTimestamp = BigInt(checkpoint.slice(offset, offset + BLOCK_TIMESTAMP_DIGITS));
    offset += BLOCK_TIMESTAMP_DIGITS;
    const chainId = BigInt(checkpoint.slice(offset, offset + CHAIN_ID_DIGITS));
    offset += CHAIN_ID_DIGITS;
    const blockNumber = BigInt(checkpoint.slice(offset, offset + BLOCK_NUMBER_DIGITS));
    offset += BLOCK_NUMBER_DIGITS;
    const transactionIndex = BigInt(checkpoint.slice(offset, offset + TRANSACTION_INDEX_DIGITS));
    offset += TRANSACTION_INDEX_DIGITS;
    const eventType = +checkpoint.slice(offset, offset + EVENT_TYPE_DIGITS);
    offset += EVENT_TYPE_DIGITS;
    const eventIndex = BigInt(checkpoint.slice(offset, offset + EVENT_INDEX_DIGITS));
    offset += EVENT_INDEX_DIGITS;
    return {
        blockTimestamp,
        chainId,
        blockNumber,
        transactionIndex,
        eventType,
        eventIndex,
    };
};
export const ZERO_CHECKPOINT = {
    blockTimestamp: 0n,
    chainId: 0n,
    blockNumber: 0n,
    transactionIndex: 0n,
    eventType: 0,
    eventIndex: 0n,
};
export const MAX_CHECKPOINT = {
    blockTimestamp: 9999999999n,
    chainId: 9999999999999999n,
    blockNumber: 9999999999999999n,
    transactionIndex: 9999999999999999n,
    eventType: 9,
    eventIndex: 9999999999999999n,
};
export const ZERO_CHECKPOINT_STRING = encodeCheckpoint(ZERO_CHECKPOINT);
export const MAX_CHECKPOINT_STRING = encodeCheckpoint(MAX_CHECKPOINT);
/**
/**
 * Returns true if two checkpoints are equal.
 */
export const isCheckpointEqual = (a, b) => encodeCheckpoint(a) === encodeCheckpoint(b);
/**
 * Returns true if checkpoint a is greater than checkpoint b.
 * Returns false if the checkpoints are equal.
 */
export const isCheckpointGreaterThan = (a, b) => encodeCheckpoint(a) > encodeCheckpoint(b);
/**
 * Returns true if checkpoint a is greater than or equal to checkpoint b.|
 */
export const isCheckpointGreaterThanOrEqualTo = (a, b) => encodeCheckpoint(a) >= encodeCheckpoint(b);
export const checkpointMax = (...checkpoints) => checkpoints.reduce((max, checkpoint) => {
    return isCheckpointGreaterThan(checkpoint, max) ? checkpoint : max;
});
export const checkpointMin = (...checkpoints) => checkpoints.reduce((min, checkpoint) => {
    return isCheckpointGreaterThan(min, checkpoint) ? checkpoint : min;
});
export const LATEST = MAX_CHECKPOINT_STRING;
/** Compute the minimum checkpoint, filtering out undefined. */
export const min = (...checkpoints) => {
    return checkpoints.reduce((acc, cur) => {
        if (cur === undefined)
            return acc;
        if (acc === undefined)
            return cur;
        if (acc < cur)
            return acc;
        return cur;
    });
};
/** Compute the maximum checkpoint, filtering out undefined. */
export const max = (...checkpoints) => {
    return checkpoints.reduce((acc, cur) => {
        if (cur === undefined)
            return acc;
        if (acc === undefined)
            return cur;
        if (acc > cur)
            return acc;
        return cur;
    });
};
//# sourceMappingURL=checkpoint.js.map