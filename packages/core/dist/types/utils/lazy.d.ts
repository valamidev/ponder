/**
 * Lazy checksum address.
 *
 * @example
 * ```ts
 * const object = { address: "0x1234567890123456789012345678901234567890" };
 * lazyChecksumAddress(object, "address");
 * ```
 */
export declare const lazyChecksumAddress: <const T extends object>(object: T, key: T extends unknown[] ? number : keyof T) => T;
//# sourceMappingURL=lazy.d.ts.map