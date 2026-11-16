import type { PathsD, PolyPathD } from 'clipper2-wasm'

import { polygonIsClockwise } from './basic'
import { createPathD, createPathsD, getClipperModule, pathDToPoints } from './clipperInstance'
import type { Polygon2D, PolygonWithHoles2D } from './types'

export function intersectPolygon(polygon1: PolygonWithHoles2D, polygon2: PolygonWithHoles2D): PolygonWithHoles2D[] {
  const module = getClipperModule()
  const pathsA = polygonToPathsD(polygon1)
  const pathsB = polygonToPathsD(polygon2)

  const clipper = new module.ClipperD(4)
  const polyTree = new module.PolyPathD()

  try {
    clipper.AddSubject(pathsA)
    clipper.AddClip(pathsB)
    clipper.ExecutePoly(module.ClipType.Intersection, module.FillRule.NonZero, polyTree)
    return collectPolygonsWithHolesFromPolyTree(polyTree)
  } finally {
    clipper.delete()
    polyTree.delete()
    for (let i = 0; i < pathsA.size(); i++) {
      pathsA.get(i).delete()
    }
    pathsA.delete()
    for (let i = 0; i < pathsB.size(); i++) {
      pathsB.get(i).delete()
    }
    pathsB.delete()
  }
}

export function intersectPolygons(subjects: Polygon2D[], clips: Polygon2D[]): Polygon2D[] {
  const module = getClipperModule()
  const subjectPaths = createPathsD(subjects.map(s => createPathD(s.points)))
  const clipPaths = createPathsD(clips.map(c => createPathD(c.points)))

  try {
    const intersectResult = module.IntersectD(subjectPaths, clipPaths, module.FillRule.NonZero, 2)
    try {
      const result: Polygon2D[] = []
      for (let i = 0; i < intersectResult.size(); i++) {
        const path = intersectResult.get(i)
        result.push({ points: pathDToPoints(path) })
      }
      return result
    } finally {
      intersectResult.delete()
    }
  } finally {
    for (let i = 0; i < subjectPaths.size(); i++) {
      subjectPaths.get(i).delete()
    }
    subjectPaths.delete()
    for (let i = 0; i < clipPaths.size(); i++) {
      clipPaths.get(i).delete()
    }
    clipPaths.delete()
  }
}

export function unionPolygons(polygons: Polygon2D[]): Polygon2D[] {
  if (polygons.length === 0) return []
  if (polygons.length === 1) return polygons

  const module = getClipperModule()
  const paths = polygons.map(p => createPathD(p.points))
  const pathsD = createPathsD(paths)

  try {
    const unionResult = module.UnionSelfD(pathsD, module.FillRule.NonZero, 2)
    try {
      const result: Polygon2D[] = []
      for (let i = 0; i < unionResult.size(); i++) {
        const path = unionResult.get(i)
        result.push({ points: pathDToPoints(path) })
      }
      return result
    } finally {
      unionResult.delete()
    }
  } finally {
    pathsD.delete()
    for (const path of paths) {
      path.delete()
    }
  }
}

const pathDToPolygon = (path: ReturnType<typeof createPathD>): Polygon2D => {
  const points = pathDToPoints(path)
  path.delete()
  return { points }
}

const polygonToPathsD = (polygon: PolygonWithHoles2D): PathsD => {
  return createPathsD([
    createPathD(polygon.outer.points, true),
    ...polygon.holes.map(hole => createPathD(hole.points, false))
  ])
}

const normaliseOrientation = (polygon: Polygon2D, clockwise: boolean): Polygon2D => {
  const isClockwise = polygonIsClockwise(polygon)
  if (clockwise === isClockwise) {
    return polygon
  }
  return {
    points: [...polygon.points].reverse()
  }
}

export const collectPolygonsWithHolesFromPolyTree = (root: PolyPathD): PolygonWithHoles2D[] => {
  const result: PolygonWithHoles2D[] = []

  const processNode = (node: PolyPathD, depth: number, currentOuter: PolygonWithHoles2D | null) => {
    const polygon = pathDToPolygon(node.polygon())
    if (depth % 2 === 1) {
      const outer = normaliseOrientation(polygon, true)
      const entry: PolygonWithHoles2D = { outer, holes: [] }
      result.push(entry)
      const childCount = node.count()
      for (let i = 0; i < childCount; i += 1) {
        processNode(node.child(i), depth + 1, entry)
      }
      return
    }

    if (currentOuter) {
      const hole = normaliseOrientation(polygon, false)
      currentOuter.holes.push(hole)
    }

    const childCount = node.count()
    for (let i = 0; i < childCount; i += 1) {
      processNode(node.child(i), depth + 1, null)
    }
  }

  processNode(root, 0, null)

  return result
}

export function subtractPolygons(subject: readonly Polygon2D[], clips: readonly Polygon2D[]): PolygonWithHoles2D[] {
  if (subject.length === 0) {
    return []
  }

  const module = getClipperModule()
  const subjectPaths = subject.map(polygon => createPathD(polygon.points))
  const clipPaths = clips.map(polygon => createPathD(polygon.points))
  const subjectPathsD = createPathsD(subjectPaths)
  const clipPathsD = createPathsD(clipPaths)
  const clipper = new module.ClipperD(4)
  const polyTree = new module.PolyPathD()

  try {
    clipper.AddSubject(subjectPathsD)
    clipper.AddClip(clipPathsD)
    clipper.ExecutePoly(module.ClipType.Difference, module.FillRule.NonZero, polyTree)
    return collectPolygonsWithHolesFromPolyTree(polyTree)
  } finally {
    clipper.delete()
    polyTree.delete()
    subjectPathsD.delete()
    clipPathsD.delete()
    subjectPaths.forEach(path => {
      path.delete()
    })
    clipPaths.forEach(path => {
      path.delete()
    })
  }
}

export function unionPolygonsWithHoles(polygons: Polygon2D[]): PolygonWithHoles2D[] {
  if (polygons.length === 0) {
    return []
  }

  const module = getClipperModule()
  const paths = polygons.map(polygon => createPathD(polygon.points))
  const pathsD = createPathsD(paths)
  const clipper = new module.ClipperD(4)
  const polyTree = new module.PolyPathD()

  try {
    clipper.AddSubject(pathsD)
    clipper.ExecutePoly(module.ClipType.Union, module.FillRule.NonZero, polyTree)
    return collectPolygonsWithHolesFromPolyTree(polyTree)
  } finally {
    clipper.delete()
    polyTree.delete()
    pathsD.delete()
    paths.forEach(path => {
      path.delete()
    })
  }
}
