import { DownloadIcon } from '@radix-ui/react-icons'
import { IconButton } from '@radix-ui/themes'

interface ExportGLTFButtonProps {
  onExport: () => void
}

function ExportGLTFButton({ onExport }: ExportGLTFButtonProps): React.JSX.Element {
  return (
    <IconButton size="2" variant="soft" onClick={onExport} title="Export as GLTF">
      <DownloadIcon />
    </IconButton>
  )
}

export default ExportGLTFButton
