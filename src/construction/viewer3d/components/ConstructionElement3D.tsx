import type { ConstructionElement } from '@/construction/elements'
import { getMaterialById } from '@/construction/materials/store'

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

function ConstructionElement3D({ element }: ConstructionElement3DProps): React.JSX.Element | null {
  const material = getMaterialById(element.material)
  if (!material) return null

  const color = stripAlphaFromHex(material.color)

  const position = element.transform.position
  const rotation = element.transform.rotation

  const threePosition: [number, number, number] = [-position[0], position[2], -position[1]]
  const threeRotation: [number, number, number] = [-rotation[0], -rotation[2], -rotation[1]]

  return (
    <group position={threePosition} rotation={threeRotation}>
      {element.shape.type === 'cuboid' ? (
        <Cuboid3D shape={element.shape} color={color} />
      ) : element.shape.type === 'cut-cuboid' ? (
        <CutCuboid3D shape={element.shape} color={color} />
      ) : null}
    </group>
  )
}

export default ConstructionElement3D
