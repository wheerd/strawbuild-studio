import type { ExtrudedPolygon } from '@/construction/shapes'
import { getExtrudedPolygonGeometry } from '@/construction/viewer3d/utils/geometryCache'

interface ExtrudedPolygon3DProps {
  shape: ExtrudedPolygon
  color: string
  opacity?: number
  partId?: string
}

function ExtrudedPolygon3D({ shape, color, opacity = 1.0, partId }: ExtrudedPolygon3DProps): React.JSX.Element | null {
  if (opacity === 0) return null

  const { geometry, edgesGeometry, matrix, cacheKey } = getExtrudedPolygonGeometry(shape, partId)

  return (
    <mesh
      geometry={geometry}
      matrix={matrix}
      matrixAutoUpdate={false}
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

export default ExtrudedPolygon3D
