import { DownloadIcon } from '@radix-ui/react-icons'
import { DropdownMenu, IconButton } from '@radix-ui/themes'
import { useTranslation } from 'react-i18next'

export type ExportFormat = 'collada' | 'gltf' | 'obj' | 'stl' | 'ifc'

interface ExportButtonProps {
  onExport: (format: ExportFormat) => void
}

function ExportButton({ onExport }: ExportButtonProps): React.JSX.Element {
  const { t } = useTranslation('viewer')

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <IconButton size="2" title={t($ => $.export.title)}>
          <DownloadIcon />
        </IconButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <DropdownMenu.Item onClick={() => onExport('collada')}>{t($ => $.export.collada)}</DropdownMenu.Item>
        <DropdownMenu.Item onClick={() => onExport('gltf')}>{t($ => $.export.gltf)}</DropdownMenu.Item>
        <DropdownMenu.Item onClick={() => onExport('obj')}>{t($ => $.export.obj)}</DropdownMenu.Item>
        <DropdownMenu.Item onClick={() => onExport('stl')}>{t($ => $.export.stl)}</DropdownMenu.Item>
        <DropdownMenu.Item onClick={() => onExport('ifc')}>{t($ => $.export.ifc)}</DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  )
}

export default ExportButton
