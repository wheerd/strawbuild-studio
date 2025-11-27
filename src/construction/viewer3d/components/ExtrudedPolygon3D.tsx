import type { ExtrudedPolygon } from '@/construction/shapes'
import { getExtrudedPolygonGeometry } from '@/construction/viewer3d/utils/geometryCache'
import { getLineMaterial, getMeshMaterial } from '@/construction/viewer3d/utils/materialCache'

interface ExtrudedPolygon3DProps {
  shape: ExtrudedPolygon
  color: string
  opacity?: number
  partId?: string
}

function ExtrudedPolygon3D({ shape, color, opacity = 1.0, partId }: ExtrudedPolygon3DProps): React.JSX.Element | null {
  if (opacity === 0) return null

  const { geometry, edgesGeometry, cacheKey } = getExtrudedPolygonGeometry(shape, partId)
  const meshMaterial = getMeshMaterial(color, opacity)
  const lineMaterial = getLineMaterial('#000000', 0.4, 1)

  return (
    <mesh geometry={geometry} userData={{ partId, geometryKey: cacheKey }} dispose={null} material={meshMaterial}>
      <lineSegments geometry={edgesGeometry} dispose={null} material={lineMaterial} />
    </mesh>
  )
}

export default ExtrudedPolygon3D
