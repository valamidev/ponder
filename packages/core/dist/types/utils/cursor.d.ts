import { BaseError, type Hex } from "viem";
export type Cursor = {
    data: Hex;
    position: number;
    positionReadCount: Map<number, number>;
    recursiveReadCount: number;
    recursiveReadLimit: number;
};
type CursorConfig = {
    recursiveReadLimit?: number | undefined;
};
export declare const createCursor: (data: Hex, { recursiveReadLimit }?: CursorConfig) => Cursor;
export type PositionOutOfBoundsErrorType = PositionOutOfBoundsError & {
    name: "PositionOutOfBoundsError";
};
export declare class PositionOutOfBoundsError extends BaseError {
    constructor({ length, position }: {
        length: number;
        position: number;
    });
}
export type RecursiveReadLimitExceededErrorType = RecursiveReadLimitExceededError & {
    name: "RecursiveReadLimitExceededError";
};
export declare class RecursiveReadLimitExceededError extends BaseError {
    constructor({ count, limit }: {
        count: number;
        limit: number;
    });
}
export declare function setPosition(cursor: Cursor, position: number): () => number;
export declare function readBytes(cursor: Cursor, length: number, size?: number): Hex;
export {};
//# sourceMappingURL=cursor.d.ts.map