import { useMemo } from 'react'
import * as THREE from 'three'

import type { Cuboid } from '@/construction/shapes'

interface Cuboid3DProps {
  shape: Cuboid
  color: string
}

function Cuboid3D({ shape, color }: Cuboid3DProps): React.JSX.Element {
  const [x, y, z] = shape.offset
  const [w, h, d] = shape.size

  const centerThreeX = -(x + w / 2)
  const centerThreeY = z + d / 2
  const centerThreeZ = -(y + h / 2)

  const edgesGeometry = useMemo(() => {
    return new THREE.EdgesGeometry(new THREE.BoxGeometry(w, d, h), 1)
  }, [w, d, h])

  return (
    <mesh position={[centerThreeX, centerThreeY, centerThreeZ]}>
      <boxGeometry args={[w, d, h]} />
      <meshStandardMaterial color={color} />
      <lineSegments geometry={edgesGeometry}>
        <lineBasicMaterial color="#000000" opacity={0.4} transparent linewidth={1} />
      </lineSegments>
    </mesh>
  )
}

export default Cuboid3D
