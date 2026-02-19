import {
  BufferAttribute,
  BufferGeometry,
  Color,
  InterleavedBufferAttribute,
  Line,
  LineSegments,
  Matrix4,
  Mesh,
  Object3D,
  Points
} from 'three'

interface SupportedMaterial {
  uuid: string
  color?: Color
  opacity?: number
  transparent?: boolean
}

interface ColladaMaterialEntry {
  id: string
  effectId: string
  materialXml: string
  effectXml: string
}

interface MaterialSignature {
  key: string
  color: Color
  opacity: number
  transparent: boolean
}

interface GeometryData {
  positionValues: number[]
  normalValues: number[]
  vertexCount: number
}

const matrixHelper = new Matrix4()
const interleavedGetters = ['getX', 'getY', 'getZ', 'getW'] as const

function formatFloat(value: number): string {
  const rounded = Number.parseFloat(value.toFixed(6))
  return Number.isFinite(rounded) ? rounded.toString() : '0'
}

function attributeToArray(attribute: BufferAttribute | InterleavedBufferAttribute): number[] {
  if (attribute instanceof InterleavedBufferAttribute) {
    const { itemSize, count } = attribute
    const values = new Array<number>(count * itemSize)

    for (let index = 0; index < count; index += 1) {
      for (let component = 0; component < itemSize; component += 1) {
        const getter = attribute[interleavedGetters[component]]
        values[index * itemSize + component] = getter.call(attribute, index)
      }
    }

    return values
  }

  return Array.from(attribute.array as ArrayLike<unknown>, element => Number(element))
}

function extractGeometryData(geometry: BufferGeometry): GeometryData | null {
  const cloned = geometry.clone()
  const processed = cloned.index ? cloned.toNonIndexed() : cloned

  if (cloned !== processed) {
    cloned.dispose()
  }

  if (!processed.hasAttribute('normal')) {
    processed.computeVertexNormals()
  }

  const positionAttribute = processed.getAttribute('position')
  const normalAttribute = processed.getAttribute('normal')

  const positionValues = attributeToArray(positionAttribute)
  const normalValues = attributeToArray(normalAttribute)
  const vertexCount = positionAttribute.count

  processed.dispose()

  if (positionValues.length === 0 || vertexCount === 0 || positionValues.length !== normalValues.length) {
    return null
  }

  return { positionValues, normalValues, vertexCount }
}

function numberArrayToString(values: number[]): string {
  return values.map(formatFloat).join(' ')
}

function buildTrianglesIndexString(vertexCount: number): string {
  const indices = new Array<string>(vertexCount)

  for (let index = 0; index < vertexCount; index += 1) {
    indices[index] = `${index} ${index}`
  }

  return indices.join(' ')
}

function sanitizeName(name: string, fallback: string): string {
  const trimmed = name.trim()
  if (trimmed.length === 0) {
    return fallback
  }

  return trimmed.replace(/[^A-Za-z0-9_-]+/g, '_')
}

function createMaterialEntry(signature: MaterialSignature, counter: number): ColladaMaterialEntry {
  const materialId = `material-${counter}`
  const effectId = `effect-${counter}`

  const diffuseColor = `${formatFloat(signature.color.r)} ${formatFloat(signature.color.g)} ${formatFloat(signature.color.b)} ${formatFloat(signature.opacity)}`
  const transparencyBlock =
    signature.transparent && signature.opacity < 1
      ? `<transparent><color>${diffuseColor}</color></transparent><transparency><float>${formatFloat(
          signature.opacity
        )}</float></transparency>`
      : ''

  const effectXml = `<effect id="${effectId}"><profile_COMMON><technique sid="common"><lambert><diffuse><color>${diffuseColor}</color></diffuse>${transparencyBlock}</lambert></technique></profile_COMMON></effect>`
  const materialXml = `<material id="${materialId}"><instance_effect url="#${effectId}" /></material>`

  return { id: materialId, effectId, materialXml, effectXml }
}

function getMaterialSignature(material: SupportedMaterial | SupportedMaterial[] | null | undefined): MaterialSignature {
  const baseMaterial = Array.isArray(material) ? material[0] : material
  const color = baseMaterial?.color ? baseMaterial.color.clone() : new Color(0xdddddd)
  const opacity = baseMaterial?.opacity ?? 1
  const transparent = baseMaterial?.transparent === true || opacity < 1

  const colorKey = `${formatFloat(color.r)}:${formatFloat(color.g)}:${formatFloat(color.b)}`
  const opacityKey = formatFloat(opacity)
  const transparentKey = transparent ? 'T' : 'F'
  const key = `color:${colorKey}|opacity:${opacityKey}|transparent:${transparentKey}`

  return { key, color, opacity, transparent }
}

function createGeometryXml(mesh: Mesh, geometryId: string, geometryData: GeometryData): string {
  const { positionValues, normalValues, vertexCount } = geometryData
  const floatCount = positionValues.length
  const triangleCount = vertexCount / 3
  const nodeName = sanitizeName(mesh.name, geometryId)
  const positionsSourceId = `${geometryId}-positions`
  const normalsSourceId = `${geometryId}-normals`
  const verticesId = `${geometryId}-vertices`
  const indicesString = buildTrianglesIndexString(vertexCount)

  const materialSymbol = 'material'

  return `<geometry id="${geometryId}" name="${nodeName}"><mesh><source id="${positionsSourceId}"><float_array id="${positionsSourceId}-array" count="${floatCount}">${numberArrayToString(
    positionValues
  )}</float_array><technique_common><accessor source="#${positionsSourceId}-array" count="${vertexCount}" stride="3"><param name="X" type="float" /><param name="Y" type="float" /><param name="Z" type="float" /></accessor></technique_common></source><source id="${normalsSourceId}"><float_array id="${normalsSourceId}-array" count="${normalValues.length}">${numberArrayToString(
    normalValues
  )}</float_array><technique_common><accessor source="#${normalsSourceId}-array" count="${vertexCount}" stride="3"><param name="X" type="float" /><param name="Y" type="float" /><param name="Z" type="float" /></accessor></technique_common></source><vertices id="${verticesId}"><input semantic="POSITION" source="#${positionsSourceId}" /></vertices><triangles material="${materialSymbol}" count="${triangleCount}"><input semantic="VERTEX" source="#${verticesId}" offset="0" /><input semantic="NORMAL" source="#${normalsSourceId}" offset="1" /><p>${indicesString}</p></triangles></mesh></geometry>`
}

function createNodeXml(mesh: Mesh, nodeId: string, geometryId: string, materialId: string): string {
  matrixHelper.copy(mesh.matrixWorld)
  matrixHelper.transpose()

  const matrixValues = matrixHelper.elements.map(formatFloat).join(' ')
  const nodeName = sanitizeName(mesh.name, nodeId)

  return `<node id="${nodeId}" name="${nodeName}"><matrix>${matrixValues}</matrix><instance_geometry url="#${geometryId}"><bind_material><technique_common><instance_material symbol="material" target="#${materialId}" /></technique_common></bind_material></instance_geometry></node>`
}

function collectRenderableMeshes(objects: Object3D[]): Mesh[] {
  const meshes: Mesh[] = []

  const collect = (object: Object3D): void => {
    if (!object.visible) {
      return
    }

    if (isThreeMesh(object)) {
      if (
        object.geometry instanceof BufferGeometry &&
        !(object instanceof Line) &&
        !(object instanceof LineSegments) &&
        !(object instanceof Points)
      ) {
        meshes.push(object)
      }
    }

    object.children.forEach(child => {
      collect(child)
    })
  }

  objects.forEach(object => {
    object.updateMatrixWorld(true)
    collect(object)
  })

  return meshes
}

export function generateCollada(objects: Object3D[]): string | null {
  const meshes = collectRenderableMeshes(objects)

  if (meshes.length === 0) {
    return null
  }

  const nodes: string[] = []

  const materials: ColladaMaterialEntry[] = []
  const materialKeyMap = new Map<string, ColladaMaterialEntry>()
  const geometryMap = new Map<string, { id: string; xml: string }>()

  let geometryCounter = 0

  meshes.forEach(mesh => {
    const geometry = mesh.geometry
    if (!(geometry instanceof BufferGeometry)) {
      return
    }

    const geometryKey = typeof mesh.userData.geometryKey === 'string' ? mesh.userData.geometryKey : mesh.uuid

    let geometryId: string | undefined
    const existingGeometry = geometryMap.get(geometryKey)

    if (existingGeometry) {
      geometryId = existingGeometry.id
    } else {
      const geometryData = extractGeometryData(geometry)
      if (!geometryData) {
        return
      }

      geometryCounter += 1
      geometryId = `geometry-${geometryCounter}`
      const geometryXml = createGeometryXml(mesh, geometryId, geometryData)
      geometryMap.set(geometryKey, { id: geometryId, xml: geometryXml })
    }

    if (!geometryId) {
      return
    }

    const materialSignature = getMaterialSignature(mesh.material as SupportedMaterial | SupportedMaterial[] | undefined)

    let materialEntry = materialKeyMap.get(materialSignature.key)
    if (!materialEntry) {
      materialEntry = createMaterialEntry(materialSignature, materials.length + 1)
      materialKeyMap.set(materialSignature.key, materialEntry)
      materials.push(materialEntry)
    }

    const nodeId = `node-${nodes.length + 1}`

    nodes.push(createNodeXml(mesh, nodeId, geometryId, materialEntry.id))
  })

  if (geometryMap.size === 0) {
    return null
  }

  const now = new Date().toISOString()

  const effectsXml = materials.map(material => material.effectXml).join('')
  const materialsXml = materials.map(material => material.materialXml).join('')
  const geometriesXml = Array.from(geometryMap.values())
    .map(entry => entry.xml)
    .join('')
  const nodesXml = nodes.join('')

  return `<?xml version="1.0" encoding="UTF-8" standalone="no" ?><COLLADA xmlns="http://www.collada.org/2005/11/COLLADASchema" version="1.4.1"><asset><contributor><authoring_tool>StrawBuild Studio</authoring_tool></contributor><created>${now}</created><modified>${now}</modified><up_axis>Y_UP</up_axis></asset><library_effects>${effectsXml}</library_effects><library_materials>${materialsXml}</library_materials><library_geometries>${geometriesXml}</library_geometries><library_visual_scenes><visual_scene id="Scene" name="Scene">${nodesXml}</visual_scene></library_visual_scenes><scene><instance_visual_scene url="#Scene" /></scene></COLLADA>`
}

const isThreeMesh = (x: unknown): x is Mesh => x instanceof Mesh
