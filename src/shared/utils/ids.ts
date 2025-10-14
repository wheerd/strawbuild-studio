export const createId = <T extends string>(prefix: string): T =>
  `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2)}` as T
