export interface Vector3 {
  x: number
  y: number
  z: number
}

/** 4x4 transformation matrix in column-major order (16 elements). */
export interface Transform {
  matrix: number[]
}

export const IdentityTransform: Transform = {
  matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
}

export interface Color {
  r: number
  g: number
  b: number
  a?: number
}

export interface MaterialDto {
  name: string
  color: Color
  texturePath?: string
  textureScaleX?: number
  textureScaleY?: number
}

export interface FaceDto {
  outerLoop: LoopDto
  innerLoops?: LoopDto[]
}

export interface LoopDto {
  vertexIndices: number[]
}

export interface ComponentDefinitionDto {
  name: string
  vertices: Vector3[]
  faces: FaceDto[]
  materialName?: string
}

export interface ComponentInstanceDto {
  componentName: string
  transform: Transform
  materialOverride?: string
  layer?: string
}

export interface GroupDto {
  name: string
  instances: ComponentInstanceDto[]
  childGroups: GroupDto[]
  transform: Transform
  layer?: string
}

export interface GenerateRequest {
  materials: MaterialDto[]
  components: ComponentDefinitionDto[]
  rootGroup: GroupDto
  fileName?: string
}
