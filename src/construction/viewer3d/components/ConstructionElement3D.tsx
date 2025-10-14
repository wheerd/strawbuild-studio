import type { ConstructionElement } from '@/construction/elements'
import { getMaterialById } from '@/construction/materials/store'
import type { TagCategoryId } from '@/construction/tags'
import ExtrudedPolygon3D from '@/construction/viewer3d/components/ExtrudedPolygon3D'
import { useOpacityControl } from '@/construction/viewer3d/context/OpacityControlContext'

import Cuboid3D from './Cuboid3D'
import CutCuboid3D from './CutCuboid3D'

interface ConstructionElement3DProps {
  element: ConstructionElement
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

function ConstructionElement3D({ element }: ConstructionElement3DProps): React.JSX.Element | null {
  const material = getMaterialById(element.material)
  const { getOpacityForCategory } = useOpacityControl()

  if (!material) return null

  const color = stripAlphaFromHex(material.color)
  const categories = getTagCategories(element)
  const opacity = calculateEffectiveOpacity(categories, getOpacityForCategory)

  const position = element.transform.position
  const rotation = element.transform.rotation

  const threePosition: [number, number, number] = [position[0], position[2], -position[1]]
  const threeRotation: [number, number, number] = [rotation[0], rotation[2], rotation[1]]

  return (
    <group position={threePosition} rotation={threeRotation}>
      {element.shape.type === 'cuboid' ? (
        <Cuboid3D shape={element.shape} color={color} opacity={opacity} />
      ) : element.shape.type === 'cut-cuboid' ? (
        <CutCuboid3D shape={element.shape} color={color} opacity={opacity} />
      ) : element.shape.type === 'polygon' ? (
        <ExtrudedPolygon3D shape={element.shape} color={color} opacity={opacity} />
      ) : null}
    </group>
  )
}

export default ConstructionElement3D
