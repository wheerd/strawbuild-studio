import { mat4 } from 'gl-matrix'

export function createIdentityMatrix(): mat4 {
  const matrix = mat4.create()
  return mat4.identity(matrix)
}
