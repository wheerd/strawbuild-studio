import { Box, Card, Flex } from '@radix-ui/themes'
import { OrbitControls } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { useCallback, useEffect, useMemo, useRef } from 'react'

import type { ConstructionModel } from '@/construction/model'
import { matAppToThree, toThreeTransform } from '@/construction/viewer3d/utils/geometry'
import { useCanvasTheme } from '@/shared/theme/CanvasThemeContext'

import ConstructionElement3D from './components/ConstructionElement3D'
import ConstructionGroup3D from './components/ConstructionGroup3D'
import ExportButton, { type ExportFormat } from './components/ExportButton'
import SceneExporter from './components/SceneExporter'
import { TagOpacityMenu } from './components/TagOpacityMenu'

interface ConstructionViewer3DProps {
  model: ConstructionModel
  containerSize: { width: number; height: number }
}

function ConstructionViewer3D({ model, containerSize }: ConstructionViewer3DProps): React.JSX.Element {
  const theme = useCanvasTheme()
  const exportFnRef = useRef<((format: ExportFormat) => void) | null>(null)

  const [centerX, centerY, centerZ] = model.bounds.center
  const maxSize = Math.max(...model.bounds.size)

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

  const maxDevicePixelRatio = useMemo(() => {
    if (typeof window === 'undefined') return 1
    const dpr = window.devicePixelRatio || 1
    return Math.min(dpr, 1.5)
  }, [])

  const { position, rotation, scale } = toThreeTransform(matAppToThree)

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Canvas
        camera={{
          position: [cameraThreeX, cameraThreeY, cameraThreeZ],
          fov: 50,
          near: 1,
          far: maxSize * 10
        }}
        dpr={[1, maxDevicePixelRatio]}
        gl={{ powerPreference: 'low-power' }}
        style={{
          width: `${containerSize.width}px`,
          height: `${containerSize.height}px`,
          background: theme.bgCanvas
        }}
      >
        <CanvasBackground color={theme.bgCanvas} />
        <ambientLight intensity={theme.isDarkTheme ? 0.8 : 1.3} />

        <gridHelper args={gridHelperArgs} position={[centerX, 0, -centerY]} />

        <group position={position} rotation={rotation} scale={scale}>
          {model.elements.map(element =>
            'children' in element ? (
              <ConstructionGroup3D key={element.id} group={element} />
            ) : (
              <ConstructionElement3D key={element.id} element={element} />
            )
          )}
        </group>

        <OrbitControls target={[centerX, centerZ, -centerY]} makeDefault />
        <SceneExporter onExportReady={handleExportReady} />
      </Canvas>

      <Box position="absolute" top="3" left="3" style={{ zIndex: 10 }}>
        <Card size="1" variant="surface" className="shadow-md">
          <Flex direction="column" align="center" gap="2" m="-2" p="0">
            <TagOpacityMenu model={model} />
          </Flex>
        </Card>
      </Box>

      <Box position="absolute" top="3" right="3" style={{ zIndex: 10 }}>
        <Card size="1" variant="surface" className="shadow-md">
          <Flex direction="column" align="center" gap="2" m="-2" p="0">
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
