import { type ReadonlyMat3, type ReadonlyMat4, mat3, mat4, quat, vec3 } from 'gl-matrix'

import type { Vec3 } from './3d'

export type Transform = ReadonlyMat4 & { readonly brand: unique symbol }

export const IDENTITY: Transform = mat4.create() as Transform

export const copyTransform = (v: Transform): Transform => mat4.clone(v) as Transform
export const transformFromArray = (a: number[]): Transform => mat4.copy(mat4.create(), a) as Transform
export const transformFromValues = (
  m00: number,
  m01: number,
  m02: number,
  m03: number,
  m10: number,
  m11: number,
  m12: number,
  m13: number,
  m20: number,
  m21: number,
  m22: number,
  m23: number,
  m30: number,
  m31: number,
  m32: number,
  m33: number
) => mat4.fromValues(m00, m01, m02, m03, m10, m11, m12, m13, m20, m21, m22, m23, m30, m31, m32, m33) as Transform

export const transform = (v: Vec3, t: Transform): Vec3 => vec3.transformMat4(vec3.create(), v, t) as Vec3

export const composeTransform = (tOuter: Transform, tInner: Transform): Transform =>
  mat4.multiply(mat4.create(), tOuter, tInner) as Transform
export const invertTransform = (t: Transform): Transform | null => mat4.invert(mat4.create(), t) as Transform | null

export const getPosition = (t: Transform) => mat4.getTranslation(vec3.create(), t) as Vec3

/**
 * Extract the X-axis (right) direction from a transform matrix.
 * This is the first column of the rotation part of the matrix.
 */
export const getXAxis = (t: Transform): Vec3 => vec3.fromValues(t[0], t[1], t[2]) as Vec3

/**
 * Extract the Y-axis (up) direction from a transform matrix.
 * This is the second column of the rotation part of the matrix.
 */
export const getYAxis = (t: Transform): Vec3 => vec3.fromValues(t[4], t[5], t[6]) as Vec3

/**
 * Extract the Z-axis (forward) direction from a transform matrix.
 * This is the third column of the rotation part of the matrix.
 */
export const getZAxis = (t: Transform): Vec3 => vec3.fromValues(t[8], t[9], t[10]) as Vec3

export const fromTrans = (v: Vec3) => mat4.fromTranslation(mat4.create(), v) as Transform
export const fromRot = (angle: number, axis: Vec3) => mat4.fromRotation(mat4.create(), angle, axis) as Transform
export const fromRotTrans = (r: Transform3, t: Vec3) =>
  mat4.fromRotationTranslation(mat4.create(), quat.fromMat3(quat.create(), r), t) as Transform

export const translate = (t: Transform, off: Vec3) => mat4.translate(mat4.create(), t, off) as Transform
export const rotate = (t: Transform, angle: number, axis: Vec3) =>
  mat4.rotate(mat4.create(), t, angle, axis) as Transform
export const rotateX = (t: Transform, angle: number) => mat4.rotateX(mat4.create(), t, angle) as Transform
export const rotateY = (t: Transform, angle: number) => mat4.rotateY(mat4.create(), t, angle) as Transform
export const rotateZ = (t: Transform, angle: number) => mat4.rotateZ(mat4.create(), t, angle) as Transform

export type Transform3 = ReadonlyMat3 & { readonly brand: unique symbol }
export const transform3 = (v: Vec3, t: Transform3): Vec3 => vec3.transformMat3(vec3.create(), v, t) as Vec3
export const transpose3 = (t: Transform3): Transform3 => mat3.transpose(mat3.create(), t) as Transform3
