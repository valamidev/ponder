import { type AbiParameter, type DecodeAbiParametersReturnType, type Hex } from "viem";
export declare function decodeAbiParameters<const params extends readonly AbiParameter[]>(params: params, data: Hex): DecodeAbiParametersReturnType<params>;
export declare function getArrayComponents(type: string): [length: number | null, innerType: string] | undefined;
//# sourceMappingURL=decodeAbiParameters.d.ts.map