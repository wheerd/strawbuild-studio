import { Box, Card, Flex } from '@radix-ui/themes'
import { OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useCallback, useRef } from 'react'

import type { ConstructionModel } from '@/construction/model'

import ConstructionElement3D from './components/ConstructionElement3D'
import ConstructionGroup3D from './components/ConstructionGroup3D'
import ExportGLTFButton from './components/ExportGLTFButton'
import OpacityControlButton from './components/OpacityControlButton'
import SceneExporter from './components/SceneExporter'

interface ConstructionViewer3DProps {
  model: ConstructionModel
  containerSize: { width: number; height: number }
}

function ConstructionViewer3D({ model, containerSize }: ConstructionViewer3DProps): React.JSX.Element {
  const exportFnRef = useRef<(() => void) | null>(null)

  const centerX = (model.bounds.min[0] + model.bounds.max[0]) / 2
  const centerY = (model.bounds.min[1] + model.bounds.max[1]) / 2
  const centerZ = (model.bounds.min[2] + model.bounds.max[2]) / 2

  const sizeX = model.bounds.max[0] - model.bounds.min[0]
  const sizeY = model.bounds.max[1] - model.bounds.min[1]
  const sizeZ = model.bounds.max[2] - model.bounds.min[2]
  const maxSize = Math.max(sizeX, sizeY, sizeZ)

  const cameraDistance = maxSize * 1.5

  const cameraThreeX = centerX - cameraDistance * 0.7
  const cameraThreeY = centerZ + cameraDistance * 0.8
  const cameraThreeZ = -centerY + cameraDistance * 0.7

  const gridSize = Math.max(maxSize * 3, 10000)

  const handleExportReady = useCallback((fn: () => void) => {
    exportFnRef.current = fn
  }, [])

  const handleExport = (): void => {
    if (exportFnRef.current) {
      exportFnRef.current()
    }
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Canvas
        camera={{
          position: [cameraThreeX, cameraThreeY, cameraThreeZ],
          fov: 50,
          near: 1,
          far: maxSize * 10
        }}
        style={{
          width: `${containerSize.width}px`,
          height: `${containerSize.height}px`,
          background: '#f0f0f0'
        }}
      >
        <ambientLight intensity={1.3} />

        <gridHelper args={[gridSize, 50]} position={[centerX, 0, -centerY]} />

        {model.elements.map(element =>
          'children' in element ? (
            <ConstructionGroup3D key={element.id} group={element} />
          ) : (
            <ConstructionElement3D key={element.id} element={element} />
          )
        )}

        <OrbitControls target={[centerX, centerZ, -centerY]} makeDefault />
        <SceneExporter onExportReady={handleExportReady} />
      </Canvas>

      <Box position="absolute" top="3" left="3" style={{ zIndex: 10 }}>
        <Card size="1" variant="surface" className="shadow-md">
          <Flex direction="column" gap="2" m="-2">
            <OpacityControlButton />
            <ExportGLTFButton onExport={handleExport} />
          </Flex>
        </Card>
      </Box>
    </div>
  )
}

export default ConstructionViewer3D
