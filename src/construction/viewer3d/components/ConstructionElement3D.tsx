import type { ConstructionElement } from '@/construction/elements'
import { getMaterialById } from '@/construction/materials/store'
import type { TagCategoryId } from '@/construction/tags'
import { useOpacityControl } from '@/construction/viewer3d/context/OpacityControlContext'
import { toThreeTransform } from '@/construction/viewer3d/utils/geometry'
import { getShapeGeometry } from '@/construction/viewer3d/utils/geometryCache'
import { getLineMaterial, getMeshMaterial } from '@/construction/viewer3d/utils/materialCache'

interface ConstructionElement3DProps {
  element: ConstructionElement
  parentOpacity?: number
}

function stripAlphaFromHex(color: string): string {
  if (color.startsWith('#') && color.length === 9) {
    return color.slice(0, 7)
  }
  return color
}

function getTagCategories(element: ConstructionElement): Set<TagCategoryId> {
  const categories = new Set<TagCategoryId>()
  element.tags?.forEach(tag => categories.add(tag.category))
  return categories
}

function calculateEffectiveOpacity(
  categories: Set<TagCategoryId>,
  getOpacity: (category: TagCategoryId) => number
): number {
  if (categories.size === 0) return 1.0

  let minOpacity = 1.0
  categories.forEach(category => {
    const opacity = getOpacity(category)
    minOpacity = Math.min(minOpacity, opacity)
  })
  return minOpacity
}

function ConstructionElement3D({ element, parentOpacity = 1 }: ConstructionElement3DProps): React.JSX.Element | null {
  const material = getMaterialById(element.material)
  const { getOpacityForCategory } = useOpacityControl()

  if (!material) return null

  const color = stripAlphaFromHex(material.color)
  const elementCategories = getTagCategories(element)
  const elementOpacity = calculateEffectiveOpacity(elementCategories, getOpacityForCategory)
  const opacity = Math.min(parentOpacity, elementOpacity)

  const { position, rotation, scale } = toThreeTransform(element.transform)

  if (opacity === 0) return null

  const partId = element.partInfo?.partId

  // Get geometry (single path for all shapes)
  const { geometry, edgesGeometry, cacheKey } = getShapeGeometry(element.shape)

  const meshMaterial = getMeshMaterial(color, opacity)
  const lineMaterial = getLineMaterial('#000000', 0.4, 1)

  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh geometry={geometry} userData={{ partId, geometryKey: cacheKey }} dispose={null} material={meshMaterial}>
        <lineSegments geometry={edgesGeometry} dispose={null} material={lineMaterial} />
      </mesh>
    </group>
  )
}

export default ConstructionElement3D
