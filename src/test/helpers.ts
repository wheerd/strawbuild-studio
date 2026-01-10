import type { Mocked } from 'vitest'

type Procedure = (...args: any[]) => any

type PartialDeep<T> = T extends string | number | bigint | boolean | null | undefined | symbol | Date | Procedure
  ? T | undefined
  : T extends (infer ArrayType)[]
    ? PartialDeep<ArrayType>[]
    : T extends readonly (infer ArrayType)[]
      ? readonly ArrayType[]
      : T extends Set<infer SetType>
        ? Set<PartialDeep<SetType>>
        : T extends ReadonlySet<infer SetType>
          ? ReadonlySet<PartialDeep<SetType>>
          : T extends Map<infer KeyType, infer ValueType>
            ? Map<PartialDeep<KeyType>, PartialDeep<ValueType>>
            : T extends ReadonlyMap<infer KeyType, infer ValueType>
              ? ReadonlyMap<PartialDeep<KeyType>, PartialDeep<ValueType>>
              : {
                  [K in keyof T]?: PartialDeep<T[K]>
                }

export function partial<T>(partial: PartialDeep<T>): T {
  return partial as T
}
export function partialMock<T>(partial: PartialDeep<T>): Mocked<T> {
  return partial as Mocked<T>
}
