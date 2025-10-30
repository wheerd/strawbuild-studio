import Clipper2Z, { type MainModule as ClipperModule, type PathD, type PathsD, type PointD } from 'clipper2-wasm'
import clipperWasmUrl from 'clipper2-wasm/dist/es/clipper2z.wasm?url'
import { vec2 } from 'gl-matrix'

import type {} from '@/shared/geometry/basic'

let clipperModuleInstance: ClipperModule | null = null
let clipperModulePromise: Promise<ClipperModule> | null = null

interface LoadClipperOptions {
  wasmBinary?: ArrayBuffer | Uint8Array
}

const normalizeBinary = (binary?: ArrayBuffer | Uint8Array): Uint8Array | undefined => {
  if (binary == null) return undefined
  return binary instanceof Uint8Array ? binary : new Uint8Array(binary)
}

export function loadClipperModule(options?: LoadClipperOptions): Promise<ClipperModule> {
  if (clipperModuleInstance) {
    return Promise.resolve(clipperModuleInstance)
  }

  let modulePromise: Promise<ClipperModule>

  if (!clipperModulePromise) {
    const wasmBinary = normalizeBinary(options?.wasmBinary)

    modulePromise = Clipper2Z({
      locateFile: (file: string) => (file.endsWith('.wasm') ? clipperWasmUrl : file),
      wasmBinary
    }).then((instance: ClipperModule) => {
      clipperModuleInstance = instance
      return instance
    })

    clipperModulePromise = modulePromise
  } else {
    modulePromise = clipperModulePromise
  }

  return modulePromise
}

export async function ensureClipperModule(options?: LoadClipperOptions): Promise<void> {
  await loadClipperModule(options)
}

export function getClipperModule(): ClipperModule {
  if (clipperModuleInstance) {
    return clipperModuleInstance
  }
  throw new Error(
    'Clipper geometry module has not been loaded yet. Call ensureClipperModule() before accessing geometry helpers.'
  )
}

export function createPointD(point: vec2): PointD {
  return new (getClipperModule().PointD)(point[0], point[1], 0)
}

export function createPathD(points: vec2[]): PathD {
  const module = getClipperModule()
  const path = new module.PathD()
  for (const point of points) {
    path.push_back(new module.PointD(point[0], point[1], 0))
  }
  return path
}

export function createPathsD(paths: PathD[]): PathsD {
  const module = getClipperModule()
  const pathsD = new module.PathsD()
  for (const path of paths) {
    pathsD.push_back(path)
  }
  return pathsD
}

export function pathDToPoints(path: PathD): vec2[] {
  const result: vec2[] = []
  const size = path.size()
  for (let i = 0; i < size; i++) {
    const point = path.get(i)
    result.push([point.x, point.y])
  }
  return result
}
