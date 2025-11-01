import type { ConstructionGroup, GroupOrElement } from '@/construction/elements'
import type { TagCategoryId } from '@/construction/tags'
import { useOpacityControl } from '@/construction/viewer3d/context/OpacityControlContext'

import ConstructionElement3D from './ConstructionElement3D'

interface ConstructionGroup3DProps {
  group: ConstructionGroup
  parentOpacity?: number
}

function ConstructionGroup3D({ group, parentOpacity = 1 }: ConstructionGroup3DProps): React.JSX.Element {
  const { getOpacityForCategory } = useOpacityControl()
  const position = group.transform.position
  const rotation = group.transform.rotation

  const threePosition: [number, number, number] = [position[0], position[2], -position[1]]
  const threeRotation: [number, number, number] = [rotation[0], rotation[2], rotation[1]]

  const categories = new Set<TagCategoryId>()
  group.tags?.forEach(tag => categories.add(tag.category))
  let groupOpacity = parentOpacity
  if (categories.size > 0) {
    let minOpacity = parentOpacity
    categories.forEach(category => {
      const opacity = getOpacityForCategory(category)
      minOpacity = Math.min(minOpacity, opacity)
    })
    groupOpacity = minOpacity
  }

  return (
    <group position={threePosition} rotation={threeRotation}>
      {group.children.map(child => (
        <GroupOrElement3D key={child.id} element={child} parentOpacity={groupOpacity} />
      ))}
    </group>
  )
}

function GroupOrElement3D({
  element,
  parentOpacity
}: {
  element: GroupOrElement
  parentOpacity?: number
}): React.JSX.Element | null {
  if ('children' in element) {
    return <ConstructionGroup3D group={element} parentOpacity={parentOpacity} />
  }
  return <ConstructionElement3D element={element} parentOpacity={parentOpacity} />
}

export default ConstructionGroup3D
