export const createId = <T extends string>(prefix: T): `${typeof prefix}${string}` =>
  `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`
