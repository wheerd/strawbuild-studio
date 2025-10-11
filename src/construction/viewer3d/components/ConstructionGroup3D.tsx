import type { ConstructionGroup, GroupOrElement } from '@/construction/elements'

import ConstructionElement3D from './ConstructionElement3D'

interface ConstructionGroup3DProps {
  group: ConstructionGroup
}

function ConstructionGroup3D({ group }: ConstructionGroup3DProps): React.JSX.Element {
  const position = group.transform.position
  const rotation = group.transform.rotation

  const threePosition: [number, number, number] = [position[0], position[2], -position[1]]
  const threeRotation: [number, number, number] = [rotation[0], rotation[2], rotation[1]]

  return (
    <group position={threePosition} rotation={threeRotation}>
      {group.children.map(child => (
        <GroupOrElement3D key={child.id} element={child} />
      ))}
    </group>
  )
}

function GroupOrElement3D({ element }: { element: GroupOrElement }): React.JSX.Element | null {
  if ('children' in element) {
    return <ConstructionGroup3D group={element} />
  }
  return <ConstructionElement3D element={element} />
}

export default ConstructionGroup3D
