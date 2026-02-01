import { ExclamationTriangleIcon } from '@radix-ui/react-icons'
import { OrbitControls } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { useTheme } from 'next-themes'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useActiveStoreyId } from '@/building/store'
import { AlertDialog } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Code } from '@/components/ui/code'
import { getRoofOffsetMapsDebug } from '@/construction/derived'
import type { ConstructionModel } from '@/construction/model'
import { matAppToThree, toThreeTransform } from '@/construction/viewer3d/utils/geometry'
import { type SketchUpErrorCode, SketchUpExportError } from '@/exporters/sketchup'

import ConstructionElement3D from './components/ConstructionElement3D'
import ConstructionGroup3D from './components/ConstructionGroup3D'
import ExportButton, { type ExportFormat } from './components/ExportButton'
import { GridToggleButton } from './components/GridToggleButton'
import { OffsetMapDebug3D } from './components/OffsetMapDebug3D'
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
  const activeStoreyId = useActiveStoreyId()
  const exportFnRef = useRef<((format: ExportFormat) => void) | null>(null)
  const [exportError, setExportError] = useState<ExportError | null>(null)

  const canDebug = process.env.NODE_ENV !== 'production'
  const params = new URLSearchParams(window.location.search)
  const debug = canDebug && params.has('debug')
  const offsetMap = useMemo(() => {
    return getRoofOffsetMapsDebug().get(activeStoreyId)?.map
  }, [activeStoreyId])

  const [centerX, centerY, centerZ] = model.bounds.center
  const maxSize = Math.max(...model.bounds.size)

  const cameraDistance = maxSize * 1.5

  const cameraThreeX = centerX - cameraDistance * 0.7
  const cameraThreeY = centerZ + cameraDistance * 0.8
  const cameraThreeZ = -centerY + cameraDistance * 0.7

  const gridSize = Math.max(maxSize * 3, 10000)
  const gridColor = isDarkTheme ? '#CCCCCC' : '#333333'
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
    <div className="relative h-full w-full">
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

          {debug && offsetMap && <OffsetMapDebug3D storeyId={activeStoreyId} map={offsetMap} />}
        </group>

        <OrbitControls target={[centerX, centerZ, -centerY]} makeDefault />
        <SceneExporter onExportReady={handleExportReady} />
      </Canvas>

      <Card size="sm" variant="surface" className="absolute top-3 left-3 z-10 shadow-md">
        <div className="-m-2 flex flex-row items-center gap-1 p-0.5">
          <TagOpacityMenu model={model} />
          <GridToggleButton />
        </div>
      </Card>

      <div className="absolute top-3 right-3 z-10 p-0 shadow-md">
        <ExportButton
          onExport={format => {
            void handleExport(format)
          }}
        />
      </div>

      <AlertDialog.Root
        open={exportError !== null}
        onOpenChange={open => {
          if (!open) setExportError(null)
        }}
      >
        <AlertDialog.Content maxWidth="450px">
          <AlertDialog.Title>
            <div className="flex items-center gap-2">
              <ExclamationTriangleIcon color="var(--color-red-600)" />
              <span className="text-red-800">{t($ => $.export.exportError.title)}</span>
            </div>
          </AlertDialog.Title>
          <AlertDialog.Description>
            <div className="flex flex-col gap-3">
              <span>{exportError && t($ => $.export.exportError[exportError.code])}</span>
              {exportError?.details && (
                <div className="flex flex-col gap-1">
                  <span className="text-base font-bold">{t($ => $.export.exportError.details)}</span>
                  <Code size="sm" className="break-words whitespace-pre-wrap">
                    {exportError.details}
                  </Code>
                </div>
              )}
            </div>
          </AlertDialog.Description>
          <div className="mt-4 flex justify-end gap-3">
            <AlertDialog.Cancel asChild>
              <Button variant="default">{t($ => $.export.exportError.close)}</Button>
            </AlertDialog.Cancel>
          </div>
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
