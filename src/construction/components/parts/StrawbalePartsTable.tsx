import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Table } from '@/components/ui/table'
import { ceilDiv, summarizeStrawbaleParts } from '@/construction/components/parts/utils/aggregation'
import type { StrawbaleMaterial } from '@/construction/materials/material'
import type { AggregatedPartItem } from '@/construction/parts/types'
import { useFormatters } from '@/shared/i18n/useFormatters'

type StrawCategory = NonNullable<AggregatedPartItem['strawCategory']>

const STRAW_CATEGORY_ORDER: StrawCategory[] = ['full', 'partial', 'flakes', 'stuffed']

interface StrawTableRow {
  key: StrawCategory | 'remaining'
  label: string
  volume: number
  maxQuantity: number
  minQuantity: number
}

export default function StrawbalePartsTable({
  parts,
  material
}: {
  parts: AggregatedPartItem[]
  material: StrawbaleMaterial
}) {
  const { t } = useTranslation('construction')
  const { formatVolume } = useFormatters()
  const summary = summarizeStrawbaleParts(parts, material)
  const numberFormatter = useMemo(() => new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }), [])

  const getStrawCategoryLabel = (category: StrawCategory): string => {
    switch (category) {
      case 'full':
        return t($ => $.partsList.straw.fullBales)
      case 'partial':
        return t($ => $.partsList.straw.partialBales)
      case 'flakes':
        return t($ => $.partsList.straw.flakes)
      case 'stuffed':
        return t($ => $.partsList.straw.stuffedFill)
    }
  }

  const rows: StrawTableRow[] = STRAW_CATEGORY_ORDER.map(category => {
    const bucket = summary.buckets[category]
    const label = getStrawCategoryLabel(category)
    const volume = bucket.volume
    const maxQuantity =
      category === 'full' || category === 'partial' ? bucket.count : ceilDiv(volume, summary.nominalMinVolume)
    const minQuantity =
      category === 'full' || category === 'partial' ? bucket.count : ceilDiv(volume, summary.nominalMaxVolume)
    return {
      key: category,
      label,
      volume,
      maxQuantity,
      minQuantity
    }
  })

  rows.splice(2, 0, {
    key: 'remaining',
    label: t($ => $.partsList.straw.leftoverFromPartialBales),
    volume: summary.remainingVolumeMin,
    maxQuantity: summary.maxRemainingBaleCount,
    minQuantity: summary.minRemainingBaleCount
  })

  const formatCount = (value: number) => numberFormatter.format(value)
  const formatRange = (min: number, max: number) =>
    min === max ? formatCount(min) : `${formatCount(min)} – ${formatCount(max)}`

  const totalMinQuantity = rows.reduce(
    (sum, row) => sum + (row.key === 'remaining' ? -row.maxQuantity : row.minQuantity),
    0
  )
  const totalMaxQuantity = rows.reduce(
    (sum, row) => sum + (row.key === 'remaining' ? -row.minQuantity : row.maxQuantity),
    0
  )

  return (
    <Table.Root variant="surface" className="min-w-full">
      <Table.Header className="bg-muted">
        <Table.Row>
          <Table.ColumnHeaderCell>{t($ => $.partsList.tableHeaders.category)}</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="12em" className="text-center">
            {t($ => $.partsList.tableHeaders.baleCount)}
          </Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="12em" className="text-end">
            {t($ => $.partsList.tableHeaders.totalVolume)}
          </Table.ColumnHeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {rows.map(row => (
          <Table.Row key={row.key}>
            <Table.RowHeaderCell>
              <span className={`font-medium ${row.key === 'remaining' ? 'text-muted-foreground' : 'text-foreground'}`}>
                {row.label}
              </span>
            </Table.RowHeaderCell>
            <Table.Cell className="text-center">
              <span className={row.key === 'remaining' ? 'text-muted-foreground' : undefined}>
                {formatRange(row.minQuantity, row.maxQuantity)}
              </span>
            </Table.Cell>
            <Table.Cell className="text-end">
              <span className={row.key === 'remaining' ? 'text-muted-foreground' : undefined}>
                {formatVolume(row.volume)}
              </span>
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
      <Table.Footer className="bg-muted">
        <Table.Row>
          <Table.RowHeaderCell className="text-foreground">
            <span className="font-medium">{t($ => $.partsList.totalRow)}</span>
          </Table.RowHeaderCell>
          <Table.Cell className="text-center">
            <span className="font-medium">{formatRange(totalMinQuantity, totalMaxQuantity)}</span>
          </Table.Cell>
          <Table.Cell className="text-end">
            <span className="font-medium">{formatVolume(summary.totalVolume)}</span>
          </Table.Cell>
        </Table.Row>
      </Table.Footer>
    </Table.Root>
  )
}
