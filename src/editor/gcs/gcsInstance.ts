import { GcsWrapper, init_planegcs_module as gcsModule } from '@salusoft89/planegcs'
import gcsWasmUrl from '@salusoft89/planegcs/dist/planegcs_dist/planegcs.wasm?url'

let gcsModuleInstance: Awaited<ReturnType<typeof gcsModule>> | null = null
let gcsModulePromise: Promise<Awaited<ReturnType<typeof gcsModule>>> | null = null

export interface LoadGcsOptions {
  wasmUrl?: string
}

export async function loadGcsModule(options?: LoadGcsOptions): Promise<Awaited<ReturnType<typeof gcsModule>>> {
  if (gcsModuleInstance) {
    return Promise.resolve(gcsModuleInstance)
  }

  gcsModulePromise ??= gcsModule({ locateFile: () => options?.wasmUrl ?? gcsWasmUrl }).then(instance => {
    gcsModuleInstance = instance
    return instance
  })

  return gcsModulePromise
}

export async function ensureGcsModule(options?: LoadGcsOptions): Promise<void> {
  await loadGcsModule(options)
}

export function getGcsModule(): Awaited<ReturnType<typeof gcsModule>> {
  if (gcsModuleInstance) {
    return gcsModuleInstance
  }
  throw new Error('GCS module has not been loaded yet. Call ensureGcsModule() before accessing construction geometry.')
}

export function createGcs(): GcsWrapper {
  const module = getGcsModule()
  return new GcsWrapper(new module.GcsSystem())
}
