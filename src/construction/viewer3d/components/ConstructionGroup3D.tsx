import type { ConstructionGroup, GroupOrElement } from '@/construction/elements'
import { useTagOpacity } from '@/construction/viewer3d/context/TagOpacityContext'
import { toThreeTransform } from '@/construction/viewer3d/utils/geometry'

import ConstructionElement3D from './ConstructionElement3D'

interface ConstructionGroup3DProps {
  group: ConstructionGroup
  parentOpacity?: number
}

function ConstructionGroup3D({ group, parentOpacity = 1 }: ConstructionGroup3DProps): React.JSX.Element | null {
  const { getEffectiveOpacity } = useTagOpacity()

  const { position, rotation, scale } = toThreeTransform(group.transform)

  const groupOpacity = getEffectiveOpacity(group.tags ?? [])
  const opacity = Math.min(parentOpacity, groupOpacity)

  if (opacity === 0) return null

  return (
    <group position={position} rotation={rotation} scale={scale}>
      {group.children.map(child => (
        <GroupOrElement3D key={child.id} element={child} parentOpacity={opacity} />
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
