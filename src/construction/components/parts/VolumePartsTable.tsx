import { Eye } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Table } from '@/components/ui/table'
import type { VolumeMaterial } from '@/construction/materials/material'
import type { AggregatedPartItem, PartId } from '@/construction/parts/types'
import { useFormatters } from '@/shared/i18n/useFormatters'
import { useTranslatableString } from '@/shared/i18n/useTranslatableString'

import { calculateWeight, canHighlightPart, getIssueSeverity } from './utils'

export default function VolumePartsTable({
  parts,
  material,
  onViewInPlan
}: {
  parts: AggregatedPartItem[]
  material: VolumeMaterial
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
          <Table.ColumnHeaderCell width="5em" className="text-center">
            {t($ => $.partsList.tableHeaders.quantity)}
          </Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="5em" className="text-end">
            {t($ => $.partsList.tableHeaders.thickness)}
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
          <VolumePartsTableRow key={part.partId} part={part} material={material} onViewInPlan={onViewInPlan} />
        ))}
      </Table.Body>
    </Table.Root>
  )
}

function VolumePartsTableRow({
  part,
  material,
  onViewInPlan
}: {
  part: AggregatedPartItem
  material: VolumeMaterial
  onViewInPlan?: (partId: PartId) => void
}) {
  const { t } = useTranslation('construction')
  const { formatWeight, formatArea, formatVolume, formatLength } = useFormatters()
  const description = useTranslatableString(part.description)

  const partWeight = calculateWeight(part.totalVolume, material)
  const severity = getIssueSeverity(part)

  return (
    <Table.Row className={severity === 'error' ? 'bg-red-100 hover:bg-red-200' : undefined}>
      <Table.RowHeaderCell className="text-center">
        <span className="font-medium">{part.label}</span>
      </Table.RowHeaderCell>
      <Table.Cell>{part.type}</Table.Cell>
      <Table.Cell>{description}</Table.Cell>
      <Table.Cell className="text-center">{part.quantity}</Table.Cell>
      <Table.Cell className="text-end">{part.thickness ? formatLength(part.thickness) : '—'}</Table.Cell>
      <Table.Cell className="text-end">{part.totalArea ? formatArea(part.totalArea) : '—'}</Table.Cell>
      <Table.Cell className="text-end">{formatVolume(part.totalVolume)}</Table.Cell>
      <Table.Cell className="text-end">{partWeight ? formatWeight(partWeight) : '-'}</Table.Cell>
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
