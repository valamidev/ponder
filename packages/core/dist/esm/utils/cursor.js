import { BaseError, size } from "viem";
export const createCursor = (data, { recursiveReadLimit = 8192 } = {}) => {
    return {
        data,
        position: 0,
        recursiveReadCount: 0,
        positionReadCount: new Map(),
        recursiveReadLimit,
    };
};
export class PositionOutOfBoundsError extends BaseError {
    constructor({ length, position }) {
        super(`Position \`${position}\` is out of bounds (\`0 < position < ${length}\`).`, { name: "PositionOutOfBoundsError" });
    }
}
function assertPosition(cursor, position) {
    if (position < 0 || position > size(cursor.data) - 1)
        throw new PositionOutOfBoundsError({
            length: size(cursor.data),
            position,
        });
}
export class RecursiveReadLimitExceededError extends BaseError {
    constructor({ count, limit }) {
        super(`Recursive read limit of \`${limit}\` exceeded (recursive read count: \`${count}\`).`, { name: "RecursiveReadLimitExceededError" });
    }
}
function assertReadLimit(cursor) {
    if (cursor.recursiveReadCount >= cursor.recursiveReadLimit)
        throw new RecursiveReadLimitExceededError({
            count: cursor.recursiveReadCount + 1,
            limit: cursor.recursiveReadLimit,
        });
}
function _touch(cursor) {
    if (cursor.recursiveReadLimit === Number.POSITIVE_INFINITY)
        return;
    const count = getReadCount(cursor);
    cursor.positionReadCount.set(cursor.position, count + 1);
    if (count > 0)
        cursor.recursiveReadCount++;
}
function getReadCount(cursor, position) {
    return cursor.positionReadCount.get(position || cursor.position) || 0;
}
function convertPosition(position) {
    return position * 2 + 2;
}
export function setPosition(cursor, position) {
    const oldPosition = cursor.position;
    assertPosition(cursor, position);
    cursor.position = position;
    return () => (cursor.position = oldPosition);
}
export function readBytes(cursor, length, size) {
    assertReadLimit(cursor);
    _touch(cursor);
    const value = inspectBytes(cursor, length);
    cursor.position += size ?? length;
    return `0x${value}`;
}
function inspectBytes(cursor, length, position_) {
    const position = position_ ?? cursor.position;
    assertPosition(cursor, position + length - 1);
    return cursor.data.substring(convertPosition(position), convertPosition(position + length));
}
//# sourceMappingURL=cursor.js.map