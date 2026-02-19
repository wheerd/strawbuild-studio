import { TriangleAlert, Eye } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Table } from '@/components/ui/table'
import { Tooltip } from '@/components/ui/tooltip'
import { SheetPartModal } from '@/construction/components/parts/SheetPartModal'
import type { SheetMaterial } from '@/construction/materials/material'
import type { AggregatedPartItem, PartId } from '@/construction/parts/types'
import { SawIcon } from '@/shared/components/Icons'
import { type Vec3, isZeroVec3 } from '@/shared/geometry'
import { useFormatters } from '@/shared/i18n/useFormatters'
import { useTranslatableString } from '@/shared/i18n/useTranslatableString'

import { calculateWeight, canHighlightPart, getIssueSeverity } from './utils'

const formatSheetDimensions = (
  size: Vec3,
  thickness: number | undefined,
  formatters: {
    formatDimensions2D: (dimensions: [number, number]) => string
    formatDimensions3D: (dimensions: [number, number, number]) => string
  }
): string => {
  if (thickness === undefined) {
    return formatters.formatDimensions3D([size[0], size[1], size[2]])
  }

  const dimensions: number[] = []
  for (let i = 0; i < 3; i++) {
    if (Math.round(size[i]) !== Math.round(thickness)) {
      dimensions.push(size[i])
    }
  }

  if (dimensions.length === 2) {
    return formatters.formatDimensions2D([dimensions[0], dimensions[1]])
  }

  return formatters.formatDimensions3D([size[0], size[1], size[2]])
}

export default function SheetPartsTable({
  parts,
  material,
  onViewInPlan
}: {
  parts: AggregatedPartItem[]
  material: SheetMaterial
  onViewInPlan?: (partId: PartId) => void
}) {
  const { t } = useTranslation('construction')

  return (
    <Table.Root variant="surface" className="min-w-full">
      <Table.Header className="bg-muted">
        <Table.Row>
          <Table.ColumnHeaderCell width="5em" className="text-center">
            {t($ => $.partsList.tableHeaders.label)}
          </Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="10em">{t($ => $.partsList.tableHeaders.type)}</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>{t($ => $.partsList.tableHeaders.description)}</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="20em" className="text-end">
            {t($ => $.partsList.tableHeaders.dimensions)}
          </Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="5em" className="text-center">
            {t($ => $.partsList.tableHeaders.quantity)}
          </Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="5em" className="text-end">
            {t($ => $.partsList.tableHeaders.area)}
          </Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="8em" className="text-end">
            {t($ => $.partsList.tableHeaders.totalArea)}
          </Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="9em" className="text-end">
            {t($ => $.partsList.tableHeaders.totalVolume)}
          </Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="9em" className="text-end">
            {t($ => $.partsList.tableHeaders.totalWeight)}
          </Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="3em" className="text-center">
            {t($ => $.partsList.tableHeaders.view)}
          </Table.ColumnHeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {parts.map(part => (
          <SheetPartsTableRow key={part.partId} part={part} material={material} onViewInPlan={onViewInPlan} />
        ))}
      </Table.Body>
    </Table.Root>
  )
}

function SheetPartsTableRow({
  part,
  material,
  onViewInPlan
}: {
  part: AggregatedPartItem
  material: SheetMaterial
  onViewInPlan?: (partId: PartId) => void
}) {
  const { t } = useTranslation('construction')
  const { formatWeight, formatVolume, formatArea, formatDimensions2D, formatDimensions3D } = useFormatters()
  const description = useTranslatableString(part.description)

  const partWeight = calculateWeight(part.totalVolume, material)
  const severity = getIssueSeverity(part)

  return (
    <Table.Row className={severity === 'error' ? 'bg-red-100 hover:bg-red-200' : undefined}>
      <Table.RowHeaderCell className="text-center">
        <span className="font-medium">{part.label}</span>
      </Table.RowHeaderCell>
      <Table.Cell>{part.type}</Table.Cell>
      <Table.Cell>
        <div className="flex items-center gap-2">
          <span>{description}</span>
          {part.sideFaces?.length && part.sideFaces[0].polygon.outer.points.length >= 3 && (
            <SheetPartModal
              trigger={
                <Button size="icon-sm" variant="outline" className="-my-2 rounded-full">
                  <SawIcon />
                </Button>
              }
              polygon={part.sideFaces[0].polygon}
            />
          )}
        </div>
      </Table.Cell>
      <Table.Cell className="text-end">
        <div className="flex items-center justify-end gap-2">
          {part.issue === 'ThicknessMismatch' && (
            <Tooltip key="thickness-missmatch" content={t($ => $.partsList.issues.dimensionsMismatchThickness)}>
              <TriangleAlert className="text-red-600" />
            </Tooltip>
          )}
          {part.issue === 'SheetSizeExceeded' && (
            <Tooltip
              key="sheet-size-exceeded"
              content={
                part.requiresSinglePiece
                  ? t($ => $.partsList.issues.dimensionsExceedSizeSingle)
                  : t($ => $.partsList.issues.dimensionsExceedSizeMultiple)
              }
            >
              <TriangleAlert
                aria-hidden
                className={part.requiresSinglePiece ? 'text-red-600' : 'text-orange-500'}
              />
            </Tooltip>
          )}
          <span>
            {isZeroVec3(part.size)
              ? ''
              : formatSheetDimensions(part.size, part.thickness, { formatDimensions2D, formatDimensions3D })}
          </span>
        </div>
      </Table.Cell>
      <Table.Cell className="text-center">{part.quantity}</Table.Cell>
      <Table.Cell className="text-end">{part.area ? formatArea(part.area) : '—'}</Table.Cell>
      <Table.Cell className="text-end">{part.totalArea ? formatArea(part.totalArea) : '—'}</Table.Cell>
      <Table.Cell className="text-end">{formatVolume(part.totalVolume)}</Table.Cell>
      <Table.Cell className="text-end">{partWeight ? formatWeight(partWeight) : '—'}</Table.Cell>
      <Table.Cell className="text-center">
        {canHighlightPart(part.partId) && onViewInPlan && (
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => {
              onViewInPlan(part.partId)
            }}
            title={t($ => $.partsList.actions.viewInPlan)}
            className="-my-2"
          >
            <Eye />
          </Button>
        )}
      </Table.Cell>
    </Table.Row>
  )
}
