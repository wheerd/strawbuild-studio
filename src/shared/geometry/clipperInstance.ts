import Clipper2Z, { type MainModule as ClipperModule } from 'clipper2-wasm'
import clipperWasmUrl from 'clipper2-wasm/dist/es/clipper2z.wasm?url'

export { type MainModule as ClipperModule } from 'clipper2-wasm'

let clipperModuleInstance: ClipperModule | null = null
let clipperModulePromise: Promise<ClipperModule> | null = null

export function loadClipperModule(): Promise<ClipperModule> {
  if (clipperModuleInstance) {
    return Promise.resolve(clipperModuleInstance)
  }

  let modulePromise: Promise<ClipperModule>

  if (!clipperModulePromise) {
    modulePromise = Clipper2Z({
      locateFile: (file: string) => {
        if (file.endsWith('.wasm')) {
          return clipperWasmUrl
        }
        return file
      }
    }).then((instance: ClipperModule) => {
      clipperModuleInstance = instance
      return clipperModuleInstance
    })
    clipperModulePromise = modulePromise
  } else {
    modulePromise = clipperModulePromise
  }

  return modulePromise
}

export async function ensureClipperModule(): Promise<void> {
  await loadClipperModule()
}

export function getClipperModule(): ClipperModule {
  if (clipperModuleInstance) {
    return clipperModuleInstance
  }
  throw new Error(
    'Clipper geometry module has not been loaded yet. Call ensureClipperModule() before accessing geometry helpers.'
  )
}
