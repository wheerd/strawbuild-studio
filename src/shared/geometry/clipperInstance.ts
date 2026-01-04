import Clipper2Z, { type MainModule as ClipperModule, type PathD, type PathsD, type PointD } from 'clipper2-wasm'
import clipperWasmUrl from 'clipper2-wasm/dist/es/clipper2z.wasm?url'

import { type Vec2, newVec2 } from '@/shared/geometry/2d'

let clipperModuleInstance: ClipperModule | null = null
let clipperModulePromise: Promise<ClipperModule> | null = null

interface LoadClipperOptions {
  wasmBinary?: ArrayBuffer | Uint8Array<ArrayBuffer>
}

const normalizeBinary = (binary?: ArrayBuffer | Uint8Array<ArrayBuffer>): ArrayBuffer | undefined => {
  if (binary == null) return undefined
  if (binary instanceof ArrayBuffer) return binary
  // Convert Uint8Array to ArrayBuffer for Emscripten
  return binary.buffer.slice(binary.byteOffset, binary.byteOffset + binary.byteLength)
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

export function createPointD(point: Vec2): PointD {
  return new (getClipperModule().PointD)(point[0], point[1], 0)
}

export function createPathD(points: Vec2[], positive?: boolean): PathD {
  const module = getClipperModule()
  const path = new module.PathD()
  for (const point of points) {
    path.push_back(new module.PointD(point[0], point[1], 0))
  }
  if (positive !== undefined && module.IsPositiveD(path) !== positive) {
    module.ReversePathD(path)
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

export function pathDToPoints(path: PathD): Vec2[] {
  const result: Vec2[] = []
  const size = path.size()
  for (let i = 0; i < size; i++) {
    const point = path.get(i)
    result.push(newVec2(point.x, point.y))
  }
  return result
}
