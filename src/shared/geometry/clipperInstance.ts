import Clipper2Z, { type MainModule as ClipperModule, type PathD, type PathsD, type PointD } from 'clipper2-wasm'
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

export function createPointD(point: Vec2): PointD {
  return new (getClipperModule().PointD)(point[0], point[1], 0)
}

export function createPathD(points: Vec2[]): PathD {
  const module = getClipperModule()
  const path = new module.PathD()
  for (const [x, y] of points) {
    path.push_back(new module.PointD(x, y, 0))
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
    result.push([point.x, point.y])
  }
  return result
}
