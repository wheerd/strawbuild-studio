import Clipper2Z, { type MainModule as ClipperModule, type PathD } from 'clipper2-wasm'
import clipperWasmUrl from 'clipper2-wasm/dist/es/clipper2z.wasm?url'

import type { Vec2 } from '@/shared/geometry/basic'

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

export type PathCallback<T> = (module: ClipperModule, path: PathD) => T
export function withClipperPath<T>(points: Vec2[], fallback: T, callback: PathCallback<T>): T {
  if (points.length < 1) return fallback
  const module = getClipperModule()
  const path = createPathD(module, points)
  if (!path) {
    return fallback
  }
  try {
    return callback(module, path)
  } finally {
    path.delete()
  }
}

function createPathD(module: ClipperModule, points: Vec2[]): PathD | null {
  const path = new module.PathD()
  for (const [x, y] of points) {
    path.push_back(new module.PointD(x, y, 0))
  }
  return path
}
