import manifoldModule from 'manifold-3d'
import manifoldWasmUrl from 'manifold-3d/manifold.wasm?url'

let manifoldModuleInstance: Awaited<ReturnType<typeof manifoldModule>> | null = null
let manifoldModulePromise: Promise<Awaited<ReturnType<typeof manifoldModule>>> | null = null

export interface LoadManifoldOptions {
  wasmUrl?: string
}

export async function loadManifoldModule(
  options?: LoadManifoldOptions
): Promise<Awaited<ReturnType<typeof manifoldModule>>> {
  if (manifoldModuleInstance) {
    return Promise.resolve(manifoldModuleInstance)
  }

  manifoldModulePromise ??= manifoldModule({ locateFile: () => options?.wasmUrl ?? manifoldWasmUrl }).then(instance => {
    instance.setup()
    manifoldModuleInstance = instance
    return instance
  })

  return manifoldModulePromise
}

export async function ensureManifoldModule(options?: LoadManifoldOptions): Promise<void> {
  await loadManifoldModule(options)
}

export function getManifoldModule(): Awaited<ReturnType<typeof manifoldModule>> {
  if (manifoldModuleInstance) {
    return manifoldModuleInstance
  }
  throw new Error(
    'Manifold geometry module has not been loaded yet. Call ensureManifoldModule() before accessing construction geometry.'
  )
}

// Type exports for convenience
export type { Manifold, CrossSection, Mesh, Polygons } from 'manifold-3d'
