import type { mat4 } from 'gl-matrix'

/**
 * Manifold's Mat4 type - a tuple of exactly 16 numbers
 */
export type ManifoldMat4 = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number
]

/**
 * Converts gl-matrix mat4 to Manifold's Mat4 format (tuple of 16 numbers).
 *
 * gl-matrix stores matrices in column-major order (WebGL standard), which is the
 * same format that Manifold expects.
 *
 * @param m - The gl-matrix mat4 matrix
 * @returns A tuple of 16 numbers in column-major order
 */
export function mat4ToManifoldMat4(m: mat4): ManifoldMat4 {
  // gl-matrix mat4 is already a Float32Array/Array of 16 elements
  // We can destructure it directly
  const [m0, m1, m2, m3, m4, m5, m6, m7, m8, m9, m10, m11, m12, m13, m14, m15] = m
  return [m0, m1, m2, m3, m4, m5, m6, m7, m8, m9, m10, m11, m12, m13, m14, m15]
}
