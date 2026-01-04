declare module 'clipper2-wasm' {
  import type {
    Clipper2ZFactoryFunction,
    ClipperD as OriginalClipperD,
    MainModule as OriginalMainModule
  } from 'clipper2-wasm/dist/clipper2z'

  export type { Clipper2ZFactoryFunction } from 'clipper2-wasm/dist/clipper2z'
  export type * from 'clipper2-wasm/dist/clipper2z'

  // Override MainModule to fix ClipperD constructor signature
  // The constructor now requires a precision argument (integer)
  // See: https://github.com/ErikSom/Clipper2-WASM/commit/5a8cc470a656e7909846f0c1370e0aecd0b3070f
  export interface MainModule extends Omit<OriginalMainModule, 'ClipperD'> {
    ClipperD: new (precision: number) => OriginalClipperD
  }

  const factory: Clipper2ZFactoryFunction
  export default factory
}
