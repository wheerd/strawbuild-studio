import { type ReadonlyVec2, vec2, vec3 } from 'gl-matrix'

export type Vec2 = ReadonlyVec2 & { readonly brand: unique symbol }

export const ZERO_VEC2 = vec2.create() as Vec2

export const newVec2 = (x: number, y: number): Vec2 => vec2.fromValues(x, y) as Vec2
export const copyVec2 = (v: Vec2): Vec2 => vec2.clone(v) as Vec2
export const roundVec2 = (v: Vec2): Vec2 => vec2.round(vec2.create(), v) as Vec2
export const eqVec2 = (a: Vec2, b: Vec2): boolean => vec2.equals(a, b)

export const normVec2 = (v: Vec2): Vec2 => vec2.normalize(vec2.create(), v) as Vec2
export const negVec2 = (v: Vec2): Vec2 => vec2.negate(vec2.create(), v) as Vec2
export const subVec2 = (a: Vec2, b: Vec2): Vec2 => vec2.sub(vec2.create(), a, b) as Vec2
export const addVec2 = (a: Vec2, b: Vec2): Vec2 => vec2.add(vec2.create(), a, b) as Vec2
export const scaleAddVec2 = (a: Vec2, b: Vec2, c: number): Vec2 => vec2.scaleAndAdd(vec2.create(), a, b, c) as Vec2
export const scaleVec2 = (a: Vec2, b: number): Vec2 => vec2.scale(vec2.create(), a, b) as Vec2
export const lerpVec2 = (a: Vec2, b: Vec2, c: number): Vec2 => vec2.lerp(vec2.create(), a, b, c) as Vec2

export const lenVec2 = (a: Vec2): Length => vec2.len(a) as Length
export const lenSqrVec2 = (a: Vec2): Length => vec2.sqrLen(a) as Length
export const distVec2 = (a: Vec2, b: Vec2): Length => vec2.dist(a, b) as Length
export const distSqrVec2 = (a: Vec2, b: Vec2): number => vec2.sqrDist(a, b) as number
export const dotVec2 = (a: Vec2, b: Vec2): number => vec2.dot(a, b)

export const vec2To3 = (a: Vec2): vec3 => vec3.fromValues(a[0], a[1], 0)
export const vec3To2 = (a: vec3): Vec2 => vec2.copy(vec2.create(), a) as Vec2

// s

export type Length = number
export type Area = number
export type Volume = number

// Helper functions to create branded types
export const millimeters = (value: number): Length => value
export const meters = (value: number): Length => value * 1000
export const centimeters = (value: number): Length => value * 100
export const squareMeters = (value: number): Area => value * 1000 * 1000
export const cubicMeters = (value: number): Volume => value * 1000 * 1000 * 1000

export class Bounds2D {
  static readonly EMPTY = new Bounds2D(ZERO_VEC2, ZERO_VEC2)

  static fromPoints(points: readonly Vec2[]): Bounds2D {
    if (points.length === 0) {
      return Bounds2D.EMPTY
    }

    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    for (const point of points) {
      if (point[0] < minX) minX = point[0]
      if (point[1] < minY) minY = point[1]
      if (point[0] > maxX) maxX = point[0]
      if (point[1] > maxY) maxY = point[1]
    }

    return new Bounds2D(newVec2(minX, minY), newVec2(maxX, maxY))
  }

  static fromMinMax(min: Vec2, max: Vec2): Bounds2D {
    if (min[0] >= max[0] && min[1] >= max[1]) {
      return Bounds2D.EMPTY
    }

    return new Bounds2D(copyVec2(min), copyVec2(max))
  }

  static merge(...bounds: readonly Bounds2D[]): Bounds2D {
    const nonEmptyBound = bounds.filter(b => !b.isEmpty)
    if (nonEmptyBound.length === 0) {
      return Bounds2D.EMPTY
    }

    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    for (const bound of nonEmptyBound) {
      if (bound.min[0] < minX) minX = bound.min[0]
      if (bound.min[1] < minY) minY = bound.min[1]
      if (bound.max[0] > maxX) maxX = bound.max[0]
      if (bound.max[1] > maxY) maxY = bound.max[1]
    }

    return new Bounds2D(newVec2(minX, minY), newVec2(maxX, maxY))
  }

  readonly min: Vec2
  readonly max: Vec2

  private constructor(min: Vec2, max: Vec2) {
    this.min = min
    this.max = max
  }

  get width(): number {
    return this.max[0] - this.min[0]
  }

  get height(): number {
    return this.max[1] - this.min[1]
  }

  get size(): Vec2 {
    return newVec2(this.width, this.height)
  }

  get center(): Vec2 {
    return newVec2((this.min[0] + this.max[0]) / 2, (this.min[1] + this.max[1]) / 2)
  }

  get isEmpty(): boolean {
    return this.width === 0 || this.height === 0
  }

  toBounds3D(plane: Plane3D, minNormal: number, maxNormal: number): Bounds3D {
    if (this.isEmpty || minNormal >= maxNormal) {
      return Bounds3D.EMPTY
    }

    switch (plane) {
      case 'xy':
        return Bounds3D.fromMinMax(
          vec3.fromValues(this.min[0], this.min[1], minNormal),
          vec3.fromValues(this.max[0], this.max[1], maxNormal)
        )
      case 'xz':
        return Bounds3D.fromMinMax(
          vec3.fromValues(this.min[0], minNormal, this.min[1]),
          vec3.fromValues(this.max[0], maxNormal, this.max[1])
        )
      case 'yz':
        return Bounds3D.fromMinMax(
          vec3.fromValues(minNormal, this.min[0], this.min[1]),
          vec3.fromValues(maxNormal, this.max[0], this.max[1])
        )
    }
  }

  pad(amount: number | Vec2): Bounds2D {
    const padX = typeof amount === 'number' ? amount : amount[0]
    const padY = typeof amount === 'number' ? amount : amount[1]

    const min = newVec2(this.min[0] - padX, this.min[1] - padY)
    const max = newVec2(this.max[0] + padX, this.max[1] + padY)
    return new Bounds2D(min, max)
  }

  contains(point: Vec2): boolean {
    return point[0] >= this.min[0] && point[0] <= this.max[0] && point[1] >= this.min[1] && point[1] <= this.max[1]
  }
}

export function midpoint(p1: Vec2, p2: Vec2): Vec2 {
  return lerpVec2(p1, p2, 0.5) as Vec2
}

export function angle(from: Vec2, to: Vec2): number {
  const direction = subVec2(to, from)
  return Math.atan2(direction[1], direction[0])
}

export function direction(source: Vec2, target: Vec2): Vec2 {
  return normVec2(subVec2(target, source)) as Vec2
}

export function perpendicular(vector: Vec2): Vec2 {
  return perpendicularCCW(vector) // Default to counter-clockwise
}

export function perpendicularCCW(vector: Vec2): Vec2 {
  return newVec2(-vector[1], vector[0]) // Rotate 90° counterclockwise
}

export function perpendicularCW(vector: Vec2): Vec2 {
  return newVec2(vector[1], -vector[0]) // Rotate 90° clockwise
}

export type Plane3D = 'xy' | 'xz' | 'yz'
export type Axis3D = 'x' | 'y' | 'z'

export const complementaryAxis = (plane: Plane3D): Axis3D => (plane === 'xy' ? 'z' : plane === 'xz' ? 'y' : 'x')

export const point2DTo3D = (point: Vec2, plane: Plane3D, offset: Length): vec3 =>
  plane === 'xy'
    ? vec3.fromValues(point[0], point[1], offset)
    : plane === 'xz'
      ? vec3.fromValues(point[0], offset, point[1])
      : vec3.fromValues(offset, point[0], point[1])

export class Bounds3D {
  static readonly EMPTY = new Bounds3D(vec3.create(), vec3.create())

  static fromPoints(points: readonly vec3[]): Bounds3D {
    if (points.length === 0) {
      return Bounds3D.EMPTY
    }

    let minX = Infinity
    let minY = Infinity
    let minZ = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    let maxZ = -Infinity

    for (const point of points) {
      if (point[0] < minX) minX = point[0]
      if (point[1] < minY) minY = point[1]
      if (point[2] < minZ) minZ = point[2]
      if (point[0] > maxX) maxX = point[0]
      if (point[1] > maxY) maxY = point[1]
      if (point[2] > maxZ) maxZ = point[2]
    }

    return new Bounds3D(vec3.fromValues(minX, minY, minZ), vec3.fromValues(maxX, maxY, maxZ))
  }

  static fromMinMax(min: vec3, max: vec3): Bounds3D {
    if (min[0] >= max[0] && min[1] >= max[1] && min[2] >= max[2]) {
      return Bounds3D.EMPTY
    }

    return new Bounds3D(vec3.clone(min), vec3.clone(max))
  }

  static fromCuboid(position: vec3, size: vec3): Bounds3D {
    return Bounds3D.fromMinMax(position, vec3.add(vec3.create(), position, size))
  }

  static merge(...bounds: readonly Bounds3D[]): Bounds3D {
    const filtered = bounds.filter(b => !b.isEmpty)
    if (filtered.length === 0) {
      return Bounds3D.EMPTY
    }

    let minX = Infinity
    let minY = Infinity
    let minZ = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    let maxZ = -Infinity

    for (const bound of filtered) {
      if (bound.min[0] < minX) minX = bound.min[0]
      if (bound.min[1] < minY) minY = bound.min[1]
      if (bound.min[2] < minZ) minZ = bound.min[2]
      if (bound.max[0] > maxX) maxX = bound.max[0]
      if (bound.max[1] > maxY) maxY = bound.max[1]
      if (bound.max[2] > maxZ) maxZ = bound.max[2]
    }

    return new Bounds3D(vec3.fromValues(minX, minY, minZ), vec3.fromValues(maxX, maxY, maxZ))
  }

  readonly min: vec3
  readonly max: vec3

  private constructor(min: vec3, max: vec3) {
    this.min = min
    this.max = max
  }

  get width(): number {
    return this.max[0] - this.min[0]
  }

  get depth(): number {
    return this.max[1] - this.min[1]
  }

  get height(): number {
    return this.max[2] - this.min[2]
  }

  get size(): vec3 {
    return vec3.fromValues(this.width, this.depth, this.height)
  }

  get center(): vec3 {
    return vec3.fromValues(
      (this.min[0] + this.max[0]) / 2,
      (this.min[1] + this.max[1]) / 2,
      (this.min[2] + this.max[2]) / 2
    )
  }

  get isEmpty(): boolean {
    return this.width === 0 || this.depth === 0 || this.height === 0
  }

  project(plane: Plane3D): Bounds2D {
    if (this.isEmpty) {
      return Bounds2D.EMPTY
    }

    switch (plane) {
      case 'xy':
        return Bounds2D.fromMinMax(newVec2(this.min[0], this.min[1]), newVec2(this.max[0], this.max[1]))
      case 'xz':
        return Bounds2D.fromMinMax(newVec2(this.min[0], this.min[2]), newVec2(this.max[0], this.max[2]))
      case 'yz':
        return Bounds2D.fromMinMax(newVec2(this.min[1], this.min[2]), newVec2(this.max[1], this.max[2]))
    }
  }

  pad(amount: number | vec3): Bounds3D {
    const padX = typeof amount === 'number' ? amount : amount[0]
    const padY = typeof amount === 'number' ? amount : amount[1]
    const padZ = typeof amount === 'number' ? amount : amount[2]

    return Bounds3D.fromMinMax(
      vec3.fromValues(this.min[0] - padX, this.min[1] - padY, this.min[2] - padZ),
      vec3.fromValues(this.max[0] + padX, this.max[1] + padY, this.max[2] + padZ)
    )
  }

  contains(point: vec3): boolean {
    return (
      point[0] >= this.min[0] &&
      point[0] <= this.max[0] &&
      point[1] >= this.min[1] &&
      point[1] <= this.max[1] &&
      point[2] >= this.min[2] &&
      point[2] <= this.max[2]
    )
  }
}

export function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

export function radiansToDegrees(radians: number): number {
  return (radians * 180) / Math.PI
}
