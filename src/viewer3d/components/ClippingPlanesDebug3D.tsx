import { useMemo } from 'react'
import { BufferGeometry, DoubleSide, Float32BufferAttribute } from 'three'

import type { ConstructionModel, DebugClippingPlane } from '@/construction/model/model'

interface ClippingPlanesDebug3DProps {
  model: ConstructionModel
}

interface DebugPlaneGeometry {
  fill: BufferGeometry
  outline: BufferGeometry
}

function createPlaneGeometry(
  plane: DebugClippingPlane,
  boundsCenter: readonly [number, number, number],
  boundsSize: readonly [number, number, number],
  minZ: number,
  maxZ: number
): DebugPlaneGeometry {
  const normalLengthSquared = plane.normal[0] ** 2 + plane.normal[1] ** 2 + plane.normal[2] ** 2
  const centerDistance =
    plane.normal[0] * boundsCenter[0] +
    plane.normal[1] * boundsCenter[1] +
    plane.normal[2] * boundsCenter[2] -
    plane.originOffset
  const point: [number, number, number] = [
    boundsCenter[0] - (plane.normal[0] * centerDistance) / normalLengthSquared,
    boundsCenter[1] - (plane.normal[1] * centerDistance) / normalLengthSquared,
    boundsCenter[2] - (plane.normal[2] * centerDistance) / normalLengthSquared
  ]
  const normalLength = Math.sqrt(normalLengthSquared)
  const horizontalTangent: [number, number, number] = [
    plane.normal[1] / normalLength,
    -plane.normal[0] / normalLength,
    0
  ]
  const verticalTangent: [number, number, number] = [0, 0, 1]
  const width = Math.max(
    (Math.abs(horizontalTangent[0]) * boundsSize[0] + Math.abs(horizontalTangent[1]) * boundsSize[1]) * 1.2,
    1000
  )
  const height = Math.max((maxZ - minZ) * 1.2, 1000)
  point[2] = (minZ + maxZ) / 2
  const corners: [number, number, number][] = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1]
  ].map(
    ([horizontal, vertical]) =>
      [
        point[0] + (horizontalTangent[0] * horizontal * width) / 2 + (verticalTangent[0] * vertical * height) / 2,
        point[1] + (horizontalTangent[1] * horizontal * width) / 2 + (verticalTangent[1] * vertical * height) / 2,
        point[2] + (horizontalTangent[2] * horizontal * width) / 2 + (verticalTangent[2] * vertical * height) / 2
      ] as [number, number, number]
  )

  const fill = new BufferGeometry()
  fill.setAttribute(
    'position',
    new Float32BufferAttribute(
      [...corners[0], ...corners[1], ...corners[2], ...corners[0], ...corners[2], ...corners[3]],
      3
    )
  )
  fill.computeVertexNormals()

  const outline = new BufferGeometry()
  outline.setAttribute(
    'position',
    new Float32BufferAttribute(
      corners.flatMap((corner, index) => [...corner, ...corners[(index + 1) % corners.length]]),
      3
    )
  )

  return { fill, outline }
}

export function ClippingPlanesDebug3D({ model }: ClippingPlanesDebug3DProps): React.JSX.Element {
  const planes = model.debugClippingPlanes ?? []
  const boundsCenter = model.bounds.center as readonly [number, number, number]
  const boundsSize = model.bounds.size as readonly [number, number, number]
  const geometries = useMemo(
    () =>
      planes.map(plane =>
        createPlaneGeometry(plane, boundsCenter, boundsSize, model.bounds.min[2], model.bounds.max[2])
      ),
    [planes, boundsCenter, boundsSize, model.bounds.min, model.bounds.max]
  )

  return (
    <group>
      {geometries.map((geometry, index) => (
        <group key={planes[index].id}>
          <mesh geometry={geometry.fill}>
            <meshBasicMaterial color="#00FFFF" transparent opacity={0.2} side={DoubleSide} depthWrite={false} />
          </mesh>
          <lineSegments geometry={geometry.outline}>
            <lineBasicMaterial color="#00FFFF" transparent opacity={0.9} depthWrite={false} />
          </lineSegments>
        </group>
      ))}
    </group>
  )
}
