import { useThree } from '@react-three/fiber'
import { useCallback, useEffect } from 'react'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js'
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js'

import { downloadFile } from '@/shared/utils/downloadFile'

import type { ExportFormat } from './ExportButton'

interface SceneExporterProps {
  onExportReady: (exportFn: (format: ExportFormat) => void) => void
}

function SceneExporter({ onExportReady }: SceneExporterProps): null {
  const { scene } = useThree()

  const exportScene = useCallback(
    (format: ExportFormat): void => {
      const objectsToExport = scene.children.filter(child => child.type !== 'GridHelper')
      const timestamp = new Date().toISOString().split('T')[0]

      if (format === 'gltf') {
        const exporter = new GLTFExporter()
        exporter.parse(
          objectsToExport,
          gltf => {
            downloadFile(JSON.stringify(gltf, null, 2), `construction-${timestamp}.gltf`, 'application/json')
          },
          error => {
            console.error('Error exporting GLTF:', error)
          },
          {
            binary: false,
            onlyVisible: true
          }
        )
      } else if (format === 'obj') {
        const exporter = new OBJExporter()
        const result = exporter.parse(scene)
        downloadFile(result, `construction-${timestamp}.obj`, 'text/plain')
      } else if (format === 'stl') {
        const exporter = new STLExporter()
        const result = exporter.parse(scene, { binary: false })
        downloadFile(result as string, `construction-${timestamp}.stl`, 'text/plain')
      }
    },
    [scene]
  )

  useEffect(() => {
    onExportReady(exportScene)
  }, [exportScene, onExportReady])

  return null
}

export default SceneExporter
