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

type SupportedMaterial = {
  uuid: string
  color?: Color
  opacity?: number
  transparent?: boolean
}

interface ColladaMaterialEntry {
  id: string
  symbol: string
  effectId: string
  materialXml: string
  effectXml: string
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
    const values: number[] = new Array(count * itemSize)

    for (let index = 0; index < count; index += 1) {
      for (let component = 0; component < itemSize; component += 1) {
        const getter = attribute[interleavedGetters[component]]
        values[index * itemSize + component] = getter.call(attribute, index)
      }
    }

    return values
  }

  return Array.from(attribute.array as ArrayLike<number>, element => Number(element))
}

function extractGeometryData(geometry: BufferGeometry): GeometryData | null {
  const cloned = geometry.clone()
  const processed = cloned.index ? cloned.toNonIndexed() : cloned

  if (cloned !== processed) {
    cloned.dispose()
  }

  if (!processed.getAttribute('normal')) {
    processed.computeVertexNormals()
  }

  const positionAttribute = processed.getAttribute('position')
  const normalAttribute = processed.getAttribute('normal')

  if (positionAttribute == null || normalAttribute == null) {
    processed.dispose()
    return null
  }

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
  const indices: string[] = new Array(vertexCount)

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

  return trimmed.replace(/[^A-Za-z0-9_\-]+/g, '_')
}

function createMaterialEntry(
  material: SupportedMaterial | SupportedMaterial[] | null | undefined,
  counter: number
): ColladaMaterialEntry {
  const baseMaterial = Array.isArray(material) ? material[0] : material
  const color = baseMaterial?.color ? baseMaterial.color.clone() : new Color(0xdddddd)
  const opacity = baseMaterial?.opacity ?? 1
  const isTransparent = baseMaterial?.transparent === true && opacity < 1

  const materialId = `material-${counter}`
  const effectId = `effect-${counter}`
  const symbol = materialId

  const diffuseColor = `${formatFloat(color.r)} ${formatFloat(color.g)} ${formatFloat(color.b)} ${formatFloat(opacity)}`
  const transparencyBlock =
    isTransparent
      ? `<transparent><float>${formatFloat(opacity)}</float></transparent><transparency><float>${formatFloat(
          opacity
        )}</float></transparency>`
      : ''

  const effectXml = `<effect id="${effectId}"><profile_COMMON><technique sid="common"><lambert><diffuse><color>${diffuseColor}</color></diffuse>${transparencyBlock}</lambert></technique></profile_COMMON></effect>`
  const materialXml = `<material id="${materialId}"><instance_effect url="#${effectId}" /></material>`

  return { id: materialId, symbol, effectId, materialXml, effectXml }
}

function createGeometryXml(
  mesh: Mesh,
  geometryId: string,
  materialSymbol: string,
  geometryData: GeometryData
): string {
  const { positionValues, normalValues, vertexCount } = geometryData
  const floatCount = positionValues.length
  const triangleCount = vertexCount / 3
  const nodeName = sanitizeName(mesh.name, geometryId)
  const positionsSourceId = `${geometryId}-positions`
  const normalsSourceId = `${geometryId}-normals`
  const verticesId = `${geometryId}-vertices`
  const indicesString = buildTrianglesIndexString(vertexCount)

  return `<geometry id="${geometryId}" name="${nodeName}"><mesh><source id="${positionsSourceId}"><float_array id="${positionsSourceId}-array" count="${floatCount}">${numberArrayToString(
      positionValues
    )}</float_array><technique_common><accessor source="#${positionsSourceId}-array" count="${vertexCount}" stride="3"><param name="X" type="float" /><param name="Y" type="float" /><param name="Z" type="float" /></accessor></technique_common></source><source id="${normalsSourceId}"><float_array id="${normalsSourceId}-array" count="${normalValues.length}">${numberArrayToString(
      normalValues
    )}</float_array><technique_common><accessor source="#${normalsSourceId}-array" count="${vertexCount}" stride="3"><param name="X" type="float" /><param name="Y" type="float" /><param name="Z" type="float" /></accessor></technique_common></source><vertices id="${verticesId}"><input semantic="POSITION" source="#${positionsSourceId}" /></vertices><triangles material="${materialSymbol}" count="${triangleCount}"><input semantic="VERTEX" source="#${verticesId}" offset="0" /><input semantic="NORMAL" source="#${normalsSourceId}" offset="1" /><p>${indicesString}</p></triangles></mesh></geometry>`
}

function createNodeXml(
  mesh: Mesh,
  nodeId: string,
  geometryId: string,
  materialId: string,
  materialSymbol: string
): string {
  matrixHelper.copy(mesh.matrixWorld)
  matrixHelper.transpose()

  const matrixValues = matrixHelper.elements.map(formatFloat).join(' ')
  const nodeName = sanitizeName(mesh.name, nodeId)

  return `<node id="${nodeId}" name="${nodeName}"><matrix>${matrixValues}</matrix><instance_geometry url="#${geometryId}"><bind_material><technique_common><instance_material symbol="${materialSymbol}" target="#${materialId}" /></technique_common></bind_material></instance_geometry></node>`
}

function collectRenderableMeshes(objects: Object3D[]): Mesh[] {
  const meshes: Mesh[] = []

  const collect = (object: Object3D): void => {
    if (!object.visible) {
      return
    }

    if (object instanceof Mesh) {
      if (
        object.geometry instanceof BufferGeometry &&
        !(object instanceof Line) &&
        !(object instanceof LineSegments) &&
        !(object instanceof Points)
      ) {
        meshes.push(object)
      }
    }

    object.children.forEach(child => collect(child))
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

  const geometries: string[] = []
  const nodes: string[] = []

  const materials: ColladaMaterialEntry[] = []
  const materialKeyMap = new Map<string, ColladaMaterialEntry>()

  meshes.forEach((mesh, index) => {
    const geometry = mesh.geometry
    if (!(geometry instanceof BufferGeometry)) {
      return
    }

    const geometryData = extractGeometryData(geometry)
    if (!geometryData) {
      return
    }

    const materialKey = Array.isArray(mesh.material)
      ? mesh.material.map(item => item?.uuid ?? 'material').join(',')
      : mesh.material?.uuid ?? 'material'

    let materialEntry = materialKeyMap.get(materialKey)
    if (!materialEntry) {
      materialEntry = createMaterialEntry(mesh.material as SupportedMaterial | SupportedMaterial[] | undefined, materials.length + 1)
      materialKeyMap.set(materialKey, materialEntry)
      materials.push(materialEntry)
    }

    const geometryId = `geometry-${index + 1}`
    const nodeId = `node-${index + 1}`

    geometries.push(createGeometryXml(mesh, geometryId, materialEntry.symbol, geometryData))
    nodes.push(createNodeXml(mesh, nodeId, geometryId, materialEntry.id, materialEntry.symbol))
  })

  if (geometries.length === 0) {
    return null
  }

  const now = new Date().toISOString()

  const effectsXml = materials.map(material => material.effectXml).join('')
  const materialsXml = materials.map(material => material.materialXml).join('')
  const geometriesXml = geometries.join('')
  const nodesXml = nodes.join('')

  return `<?xml version="1.0" encoding="UTF-8" standalone="no" ?><COLLADA xmlns="http://www.collada.org/2005/11/COLLADASchema" version="1.4.1"><asset><contributor><authoring_tool>Strawbaler Online Collada Exporter</authoring_tool></contributor><created>${now}</created><modified>${now}</modified><up_axis>Y_UP</up_axis></asset><library_effects>${effectsXml}</library_effects><library_materials>${materialsXml}</library_materials><library_geometries>${geometriesXml}</library_geometries><library_visual_scenes><visual_scene id="Scene" name="Scene">${nodesXml}</visual_scene></library_visual_scenes><scene><instance_visual_scene url="#Scene" /></scene></COLLADA>`
}
