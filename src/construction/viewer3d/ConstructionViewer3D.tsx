import { Box, Card, Flex } from '@radix-ui/themes'
import { OrbitControls } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { useCallback, useEffect, useMemo, useRef } from 'react'

import type { ConstructionModel } from '@/construction/model'
import { useCanvasTheme } from '@/shared/theme/CanvasThemeContext'

import ConstructionElement3D from './components/ConstructionElement3D'
import ConstructionGroup3D from './components/ConstructionGroup3D'
import ExportButton, { type ExportFormat } from './components/ExportButton'
import OpacityControlButton from './components/OpacityControlButton'
import SceneExporter from './components/SceneExporter'

interface ConstructionViewer3DProps {
  model: ConstructionModel
  containerSize: { width: number; height: number }
}

function ConstructionViewer3D({ model, containerSize }: ConstructionViewer3DProps): React.JSX.Element {
  const theme = useCanvasTheme()
  const exportFnRef = useRef<((format: ExportFormat) => void) | null>(null)

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

  const gridHelperArgs = useMemo<[number, number, string, string]>(
    () => [gridSize, 50, theme.grid, theme.grid],
    [gridSize, theme.grid]
  )

  const handleExportReady = useCallback((fn: (format: ExportFormat) => void) => {
    exportFnRef.current = fn
  }, [])

  const handleExport = (format: ExportFormat): void => {
    const fn = exportFnRef.current
    if (fn) {
      fn(format)
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
          background: theme.bgCanvas
        }}
      >
        <CanvasBackground color={theme.bgCanvas} />
        <ambientLight intensity={theme.isDarkTheme ? 0.8 : 1.3} />

        <gridHelper args={gridHelperArgs} position={[centerX, 0, -centerY]} />

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
          <Flex direction="row" gap="2" m="-2">
            <OpacityControlButton />
            <ExportButton onExport={handleExport} />
          </Flex>
        </Card>
      </Box>
    </div>
  )
}

function CanvasBackground({ color }: { color: string }): null {
  const { gl } = useThree()

  useEffect(() => {
    gl.setClearColor(color)
  }, [color, gl])

  return null
}

export default ConstructionViewer3D
