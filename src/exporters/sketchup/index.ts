import type { Resources } from 'i18next'
import type { Manifold } from 'manifold-3d'

import type { ConstructionElement, ConstructionGroup, GroupOrElement } from '@/construction/elements'
import { getFacesFromManifoldIndexed } from '@/construction/manifold/faces'
import type { MaterialId } from '@/construction/materials/material'
import { getMaterialById } from '@/construction/materials/store'
import type { ConstructionModel } from '@/construction/model'
import { IDENTITY, type Transform } from '@/shared/geometry'
import { downloadFile } from '@/shared/utils/downloadFile'

import type {
  Color,
  ComponentDefinitionDto,
  ComponentInstanceDto,
  FaceDto,
  GenerateRequest,
  GroupDto,
  MaterialDto,
  Transform as TransformDto,
  Vector3
} from './api'

export const SKETCHUP_ENABLED = !!import.meta.env.VITE_SKETCHUP_API_URL

export type SketchUpErrorCode = Exclude<
  keyof Resources['viewer']['export']['exportError'],
  'close' | 'details' | 'title'
>

export class SketchUpExportError extends Error {
  readonly code: SketchUpErrorCode
  readonly details?: string

  constructor(code: SketchUpErrorCode, message: string, details?: string) {
    super(message)
    this.name = 'SketchUpExportError'
    this.code = code
    this.details = details
  }
}

export async function exportToSketchUp(model: ConstructionModel): Promise<void> {
  const request = convertModelToDto(model)

  let response: Response
  try {
    response = await fetch(`${import.meta.env.VITE_SKETCHUP_API_URL}/api/SketchUp/generate`, {
      method: 'post',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request) + 'XD'
    })
  } catch (error) {
    throw new SketchUpExportError(
      'network_error',
      'Failed to connect to SketchUp export service',
      error instanceof Error ? error.message : undefined
    )
  }

  if (!response.ok) {
    const errorDetails = await getErrorDetails(response)

    switch (response.status) {
      case 429:
        throw new SketchUpExportError('rate_limited', 'Too many requests. Please try again later.', errorDetails)
      case 413:
        throw new SketchUpExportError('payload_too_large', 'Model is too large to export.', errorDetails)
      case 400:
        throw new SketchUpExportError('validation_error', 'Invalid model data.', errorDetails)
      case 500:
      case 502:
      case 503:
        throw new SketchUpExportError('server_error', 'SketchUp export service error.', errorDetails)
      default:
        throw new SketchUpExportError('unknown_error', `Export failed (HTTP ${response.status}).`, errorDetails)
    }
  }

  downloadFile(await response.bytes(), 'model.skp', 'application/octet-stream')
}

async function getErrorDetails(response: Response): Promise<string | undefined> {
  try {
    const text = await response.text()
    // Try to parse as JSON and extract message
    const json = JSON.parse(text) as { message?: string; title?: string; detail?: string }
    return json.message ?? json.title ?? json.detail ?? text
  } catch {
    return undefined
  }
}

// Context for collecting unique materials and components during traversal
interface ConversionContext {
  materials: Map<MaterialId, MaterialDto>
  components: Map<Manifold, Map<MaterialId, string>> // Manifold + Material -> component name
  componentDefinitions: ComponentDefinitionDto[]
  componentCounter: number
}

function convertModelToDto(model: ConstructionModel): GenerateRequest {
  const context: ConversionContext = {
    materials: new Map(),
    components: new Map(),
    componentDefinitions: [],
    componentCounter: 0
  }

  // Build the root group from all elements
  const rootGroup = convertElementsToGroup(model.elements, 'Root', context)

  return {
    materials: Object.fromEntries(context.materials),
    components: context.componentDefinitions,
    rootGroup
  }
}

// Convert a list of elements to a GroupDto
function convertElementsToGroup(elements: GroupOrElement[], name: string, context: ConversionContext): GroupDto {
  const instances: ComponentInstanceDto[] = []
  const childGroups: GroupDto[] = []

  for (const element of elements) {
    if (isGroup(element)) {
      // Recursively convert groups
      const childGroup = convertGroupToDto(element, context)
      childGroups.push(childGroup)
    } else {
      // Convert leaf elements to component instances
      const instance = convertElementToInstance(element, context)
      instances.push(instance)
    }
  }

  return {
    name,
    instances,
    childGroups,
    transform: convertTransform(IDENTITY)
  }
}

// Convert a ConstructionGroup to GroupDto
function convertGroupToDto(group: ConstructionGroup, context: ConversionContext): GroupDto {
  const instances: ComponentInstanceDto[] = []
  const childGroups: GroupDto[] = []

  for (const child of group.children) {
    if (isGroup(child)) {
      childGroups.push(convertGroupToDto(child, context))
    } else {
      instances.push(convertElementToInstance(child, context))
    }
  }

  // Determine group name from tags or ID
  const groupName = getGroupName(group)

  return {
    name: groupName,
    instances,
    childGroups,
    layer: getLayerFromTags(group.tags),
    transform: convertTransform(group.transform)
  }
}

// Convert a ConstructionElement to ComponentInstanceDto
function convertElementToInstance(element: ConstructionElement, context: ConversionContext): ComponentInstanceDto {
  // Ensure material is registered
  ensureMaterial(element.material, context)

  // Get or create component for this shape
  const componentName = getOrCreateComponent(element.shape, element.material, context)

  return {
    componentName,
    transform: convertTransform(element.transform),
    layer: getLayerFromTags(element.tags)
  }
}

// Ensure a material is registered in the context
function ensureMaterial(materialId: MaterialId, context: ConversionContext): void {
  if (context.materials.has(materialId)) return

  const material = getMaterialById(materialId)
  if (!material) {
    // Fallback for unknown materials
    context.materials.set(materialId, {
      name: materialId,
      color: { r: 128, g: 128, b: 128 }
    })
    return
  }

  context.materials.set(materialId, {
    name: material.name,
    color: hexToColor(material.color)
  })
}

// Get or create a component definition for a shape
function getOrCreateComponent(
  shape: { manifold: Manifold },
  materialId: MaterialId,
  context: ConversionContext
): string {
  const manifold = shape.manifold

  // Check if we already have a component for this manifold + material
  let materialMap = context.components.get(manifold)
  if (!materialMap) {
    materialMap = new Map()
    context.components.set(manifold, materialMap)
  }

  const existing = materialMap.get(materialId)
  if (existing) return existing

  // Create new component
  const componentName = `Component_${context.componentCounter++}`
  materialMap.set(materialId, componentName)

  // Extract geometry using proper n-gon face extraction
  const { vertices: verts, faces: indexedFaces } = getFacesFromManifoldIndexed(manifold)

  // Convert vertices from Vec3 arrays to Vector3 objects
  const vertices: Vector3[] = verts.map(v => ({ x: v[0], y: v[1], z: v[2] }))

  // Convert faces to DTO format (using outer loop only, holes not supported by FaceDto)
  const faces = indexedFaces.map<FaceDto>(f => ({
    outerLoop: { vertexIndices: f.outer },
    innerLoops: f.holes.map(h => ({ vertexIndices: h }))
  }))

  context.componentDefinitions.push({
    name: componentName,
    vertices,
    faces,
    materialId
  })

  return componentName
}

// Convert internal Transform (gl-matrix 4x4) to API Transform
function convertTransform(t: Transform): TransformDto {
  // Both are 4x4 column-major matrices, so we can copy directly
  return {
    matrix: Array.from(t)
  }
}

// Type guard for checking if element is a group
function isGroup(element: GroupOrElement): element is ConstructionGroup {
  return 'children' in element
}

// Get a display name for a group
function getGroupName(group: ConstructionGroup): string {
  // Try to get name from tags
  if (group.tags && group.tags.length > 0) {
    const nameTag = group.tags.find(t => 'label' in t)
    if (nameTag && 'label' in nameTag) {
      return nameTag.label
    }
    // Fall back to first tag ID
    return group.tags[0].id
  }
  return group.id
}

// Get layer name from tags
function getLayerFromTags(tags?: import('@/construction/tags').Tag[]): string | undefined {
  if (!tags || tags.length === 0) return undefined

  // Use the first tag's category as layer
  return tags[0].category
}

// Convert hex color string to Color object
function hexToColor(hex: string): Color {
  // Remove # if present
  hex = hex.replace(/^#/, '')

  let r: number, g: number, b: number

  if (hex.length === 6) {
    r = parseInt(hex.substring(0, 2), 16)
    g = parseInt(hex.substring(2, 4), 16)
    b = parseInt(hex.substring(4, 6), 16)
  } else if (hex.length === 3) {
    r = parseInt(hex[0] + hex[0], 16)
    g = parseInt(hex[1] + hex[1], 16)
    b = parseInt(hex[2] + hex[2], 16)
  } else {
    // Fallback to gray
    r = g = b = 128
  }

  return { r, g, b }
}
