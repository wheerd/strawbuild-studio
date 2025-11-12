import type { Cuboid } from '@/construction/shapes'
import { getCuboidGeometry } from '@/construction/viewer3d/utils/geometryCache'

interface Cuboid3DProps {
  shape: Cuboid
  color: string
  opacity?: number
  partId?: string
}

function Cuboid3D({ shape, color, opacity = 1.0, partId }: Cuboid3DProps): React.JSX.Element | null {
  if (opacity === 0) return null

  const [x, y, z] = shape.offset
  const [w, h, d] = shape.size

  const centerThreeX = x + w / 2
  const centerThreeY = z + d / 2
  const centerThreeZ = -(y + h / 2)

  const { geometry, edgesGeometry, cacheKey } = getCuboidGeometry(shape, partId)

  return (
    <mesh
      geometry={geometry}
      position={[centerThreeX, centerThreeY, centerThreeZ]}
      userData={{ partId, geometryKey: cacheKey }}
      dispose={null}
    >
      <meshStandardMaterial color={color} opacity={opacity} transparent depthWrite={opacity === 1.0} />
      <lineSegments geometry={edgesGeometry} dispose={null}>
        <lineBasicMaterial color="#000000" opacity={0.4} transparent linewidth={1} />
      </lineSegments>
    </mesh>
  )
}

export default Cuboid3D
