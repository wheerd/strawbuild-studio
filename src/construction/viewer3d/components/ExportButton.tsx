import { Download } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { SKETCHUP_ENABLED } from '@/exporters/sketchup'

export type ExportFormat = 'collada' | 'gltf' | 'obj' | 'stl' | 'ifc' | 'sketchup'

interface ExportButtonProps {
  onExport: (format: ExportFormat) => void
}

function ExportButton({ onExport }: ExportButtonProps): React.JSX.Element {
  const { t } = useTranslation('viewer')

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon-sm" title={t($ => $.export.title)}>
          <Download />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem
          onClick={() => {
            onExport('collada')
          }}
        >
          {t($ => $.export.collada)}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            onExport('gltf')
          }}
        >
          {t($ => $.export.gltf)}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            onExport('obj')
          }}
        >
          {t($ => $.export.obj)}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            onExport('stl')
          }}
        >
          {t($ => $.export.stl)}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            onExport('ifc')
          }}
        >
          {t($ => $.export.ifc)}
        </DropdownMenuItem>
        {SKETCHUP_ENABLED && (
          <DropdownMenuItem
            onClick={() => {
              onExport('sketchup')
            }}
          >
            {t($ => $.export.sketchup)}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default ExportButton
