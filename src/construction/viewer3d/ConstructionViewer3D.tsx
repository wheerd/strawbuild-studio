import { ExclamationTriangleIcon } from '@radix-ui/react-icons'
import { AlertDialog, Box, Button, Card, Code, Flex, Text } from '@radix-ui/themes'
import { OrbitControls } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { useTheme } from 'next-themes'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { ConstructionModel } from '@/construction/model'
import { matAppToThree, toThreeTransform } from '@/construction/viewer3d/utils/geometry'
import { type SketchUpErrorCode, SketchUpExportError } from '@/exporters/sketchup'

import ConstructionElement3D from './components/ConstructionElement3D'
import ConstructionGroup3D from './components/ConstructionGroup3D'
import ExportButton, { type ExportFormat } from './components/ExportButton'
import { GridToggleButton } from './components/GridToggleButton'
import SceneExporter from './components/SceneExporter'
import { TagOpacityMenu } from './components/TagOpacityMenu'
import { useCustomTransparentSorting } from './hooks/useCustomSorting'
import { useShowGrid3D } from './hooks/useGrid3D'

interface ConstructionViewer3DProps {
  model: ConstructionModel
  containerSize: { width: number; height: number }
}

interface ExportError {
  code: SketchUpErrorCode
  message: string
  details?: string
}

function ConstructionViewer3D({ model, containerSize }: ConstructionViewer3DProps): React.JSX.Element {
  const { t } = useTranslation('viewer')
  const { resolvedTheme } = useTheme()
  const isDarkTheme = resolvedTheme === 'dark'
  const showGrid = useShowGrid3D()
  const exportFnRef = useRef<((format: ExportFormat) => void) | null>(null)
  const [exportError, setExportError] = useState<ExportError | null>(null)

  const [centerX, centerY, centerZ] = model.bounds.center
  const maxSize = Math.max(...model.bounds.size)

  const cameraDistance = maxSize * 1.5

  const cameraThreeX = centerX - cameraDistance * 0.7
  const cameraThreeY = centerZ + cameraDistance * 0.8
  const cameraThreeZ = -centerY + cameraDistance * 0.7

  const gridSize = Math.max(maxSize * 3, 10000)
  const gridColor = isDarkTheme ? '#EEEEEE' : '#111111'
  const gridHelperArgs = useMemo<[number, number, string, string]>(
    () => [gridSize, 50, gridColor, gridColor],
    [gridSize, gridColor]
  )

  const handleExportReady = useCallback((fn: (format: ExportFormat) => void) => {
    exportFnRef.current = fn
  }, [])

  const handleExport = async (format: ExportFormat): Promise<void> => {
    try {
      if (format === 'ifc') {
        const { exportConstructionGeometryToIfc } = await import('@/exporters/ifc')
        await exportConstructionGeometryToIfc(model)
      }

      if (format === 'sketchup') {
        const { exportToSketchUp } = await import('@/exporters/sketchup')
        await exportToSketchUp(model)
      }

      const fn = exportFnRef.current
      if (fn) {
        fn(format)
      }
    } catch (error) {
      if (error instanceof SketchUpExportError) {
        setExportError({
          code: error.code,
          message: error.message,
          details: error.details
        })
      } else {
        setExportError({
          code: 'unknown_error',
          message: error instanceof Error ? error.message : 'Unknown error',
          details: undefined
        })
      }
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
        frameloop="always"
        camera={{
          position: [cameraThreeX, cameraThreeY, cameraThreeZ],
          fov: 50,
          near: 1,
          far: maxSize * 10
        }}
        dpr={[1, maxDevicePixelRatio]}
        gl={{ powerPreference: 'low-power', logarithmicDepthBuffer: true }}
        style={{
          width: `${containerSize.width}px`,
          height: `${containerSize.height}px`,
          background: isDarkTheme ? '#111111' : '#EEEEEE'
        }}
      >
        <CustomSorting />
        <CanvasBackground color={isDarkTheme ? '#111111' : '#EEEEEE'} />
        <ambientLight intensity={isDarkTheme ? 0.8 : 1.3} />

        {showGrid && <gridHelper args={gridHelperArgs} position={[centerX, 0, -centerY]} />}

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
          <Flex direction="row" align="center" gap="1" m="-2" p="0">
            <TagOpacityMenu model={model} />
            <GridToggleButton />
          </Flex>
        </Card>
      </Box>

      <Box position="absolute" top="3" right="3" style={{ zIndex: 10 }}>
        <Card size="1" variant="surface" className="shadow-md">
          <Flex direction="column" align="center" gap="2" m="-2" p="0">
            <ExportButton
              onExport={format => {
                void handleExport(format)
              }}
            />
          </Flex>
        </Card>
      </Box>

      <AlertDialog.Root
        open={exportError !== null}
        onOpenChange={open => {
          if (!open) setExportError(null)
        }}
      >
        <AlertDialog.Content maxWidth="450px">
          <AlertDialog.Title>
            <Flex align="center" gap="2">
              <ExclamationTriangleIcon color="var(--red-9)" />
              <Text color="red">{t($ => $.export.exportError.title)}</Text>
            </Flex>
          </AlertDialog.Title>
          <AlertDialog.Description>
            <Flex direction="column" gap="3">
              <Text>{exportError && t($ => $.export.exportError[exportError.code])}</Text>
              {exportError?.details && (
                <Flex direction="column" gap="1">
                  <Text size="2" weight="bold">
                    {t($ => $.export.exportError.details)}
                  </Text>
                  <Code size="1" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {exportError.details}
                  </Code>
                </Flex>
              )}
            </Flex>
          </AlertDialog.Description>
          <Flex gap="3" mt="4" justify="end">
            <AlertDialog.Cancel>
              <Button variant="solid">{t($ => $.export.exportError.close)}</Button>
            </AlertDialog.Cancel>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>
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

function CustomSorting(): null {
  useCustomTransparentSorting()
  return null
}

export default ConstructionViewer3D
