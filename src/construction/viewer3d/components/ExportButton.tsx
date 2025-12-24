import { DownloadIcon } from '@radix-ui/react-icons'
import { DropdownMenu, IconButton } from '@radix-ui/themes'

export type ExportFormat = 'collada' | 'gltf' | 'obj' | 'stl' | 'ifc'

interface ExportButtonProps {
  onExport: (format: ExportFormat) => void
}

function ExportButton({ onExport }: ExportButtonProps): React.JSX.Element {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <IconButton size="2" title="Export">
          <DownloadIcon />
        </IconButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <DropdownMenu.Item onClick={() => onExport('collada')}>Collada (DAE)</DropdownMenu.Item>
        <DropdownMenu.Item onClick={() => onExport('gltf')}>GLTF</DropdownMenu.Item>
        <DropdownMenu.Item onClick={() => onExport('obj')}>OBJ</DropdownMenu.Item>
        <DropdownMenu.Item onClick={() => onExport('stl')}>STL</DropdownMenu.Item>
        <DropdownMenu.Item onClick={() => onExport('ifc')}>IFC</DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  )
}

export default ExportButton
