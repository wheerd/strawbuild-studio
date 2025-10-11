import { useThree } from '@react-three/fiber'
import { useCallback, useEffect } from 'react'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'

interface SceneExporterProps {
  onExportReady: (exportFn: () => void) => void
}

function SceneExporter({ onExportReady }: SceneExporterProps): null {
  const { scene } = useThree()

  const exportScene = useCallback((): void => {
    const exporter = new GLTFExporter()

    exporter.parse(
      scene,
      gltf => {
        const blob = new Blob([JSON.stringify(gltf, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `construction-${new Date().toISOString().split('T')[0]}.gltf`
        link.click()
        URL.revokeObjectURL(url)
      },
      error => {
        console.error('Error exporting GLTF:', error)
      },
      { binary: false }
    )
  }, [scene])

  useEffect(() => {
    onExportReady(exportScene)
  }, [exportScene, onExportReady])

  return null
}

export default SceneExporter
