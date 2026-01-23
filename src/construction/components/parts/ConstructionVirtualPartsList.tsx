import { EyeOpenIcon, PinBottomIcon, PinTopIcon } from '@radix-ui/react-icons'
import React, { useCallback, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Table } from '@/components/ui/table'
import type { PartId, PartItem, VirtualPartsList } from '@/construction/parts'
import type { TranslatableString } from '@/shared/i18n/TranslatableString'
import { useFormatters } from '@/shared/i18n/useFormatters'
import { useTranslatableString } from '@/shared/i18n/useTranslatableString'

interface Formatters {
  formatDimensions3D: (dimensions: readonly [number, number, number]) => string
  formatArea: (mm2: number) => string
}

interface ModuleGroup {
  key: string
  type: string
  subtype?: string
  description?: TranslatableString
  parts: PartItem[]
  metrics: {
    totalQuantity: number
    partCount: number
    totalArea?: number
  }
}

interface ModuleSummaryRow {
  key: string
  type: string
  description?: TranslatableString
  metrics: ModuleGroup['metrics']
}

interface ModulePartsTableProps {
  parts: PartItem[]
  onViewInPlan?: (partId: PartId) => void
  formatters: Formatters
}

interface ModuleGroupCardProps {
  group: ModuleGroup
  onBackToTop: () => void
  onViewInPlan?: (partId: PartId) => void
  formatters: Formatters
}

interface ModuleSummaryRowProps {
  row: ModuleSummaryRow
  onNavigate: () => void
  formatters: Formatters
}

// Helper to check if part can be highlighted (not auto-generated)
const canHighlightPart = (partId: PartId): boolean => !partId.startsWith('auto_')

const computeModuleGroupMetrics = (parts: PartItem[]) => ({
  totalQuantity: parts.reduce((sum, p) => sum + p.quantity, 0),
  partCount: parts.length,
  totalArea: parts.reduce((sum, p) => sum + (p.totalArea ?? 0), 0)
})

const groupModules = (parts: PartItem[]): ModuleGroup[] => {
  const groups = new Map<
    string,
    {
      type: string
      subtype?: string
      description?: TranslatableString
      parts: PartItem[]
    }
  >()

  for (const part of parts) {
    const description = part.description
    const groupKey = part.subtype ? `${part.type}|${part.subtype}` : part.type

    let group = groups.get(groupKey)
    if (!group) {
      group = {
        type: part.type,
        subtype: part.subtype,
        description,
        parts: []
      }
      groups.set(groupKey, group)
    }
    group.parts.push(part)
  }

  return Array.from(groups.entries()).map(([key, group]) => ({
    key,
    type: group.type,
    subtype: group.subtype,
    description: group.description,
    parts: group.parts,
    metrics: computeModuleGroupMetrics(group.parts)
  }))
}

function ModuleSummaryTableRow({ row, onNavigate, formatters }: ModuleSummaryRowProps) {
  const { t } = useTranslation('construction')

  return (
    <Table.Row>
      <Table.RowHeaderCell>{row.type}</Table.RowHeaderCell>
      <Table.Cell>{row.description ? useTranslatableString(row.description) : '—'}</Table.Cell>
      <Table.Cell className="text-center">{row.metrics.totalQuantity}</Table.Cell>
      <Table.Cell className="text-center">{row.metrics.partCount}</Table.Cell>
      <Table.Cell className="text-end">
        {row.metrics.totalArea !== undefined ? formatters.formatArea(row.metrics.totalArea) : '—'}
      </Table.Cell>
      <Table.Cell className="text-center">
        <Button size="icon-xs" title={t($ => $.modulesList.actions.jumpToDetails)} variant="ghost" onClick={onNavigate}>
          <PinBottomIcon />
        </Button>
      </Table.Cell>
    </Table.Row>
  )
}

function ModulePartsTable({ parts, onViewInPlan, formatters }: ModulePartsTableProps) {
  const { t } = useTranslation('construction')

  return (
    <Table.Root variant="surface" className="min-w-full">
      <Table.Header className="bg-muted">
        <Table.Row>
          <Table.ColumnHeaderCell width="5em" className="text-center">
            {t($ => $.modulesList.tableHeaders.label)}
          </Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="20em">{t($ => $.modulesList.tableHeaders.dimensions)}</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="5em" className="text-end">
            {t($ => $.modulesList.tableHeaders.area)}
          </Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="8em" className="text-end">
            {t($ => $.modulesList.tableHeaders.totalArea)}
          </Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="6em" className="text-center">
            {t($ => $.modulesList.tableHeaders.quantity)}
          </Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="3em" className="text-center">
            {t($ => $.modulesList.tableHeaders.view)}
          </Table.ColumnHeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {parts.map(part => (
          <Table.Row key={part.partId}>
            <Table.RowHeaderCell className="text-center">
              <span className="font-medium">{part.label}</span>
            </Table.RowHeaderCell>
            <Table.Cell>
              <span>{formatters.formatDimensions3D([part.size[0], part.size[1], part.size[2]])}</span>
            </Table.Cell>
            <Table.Cell className="text-end">
              <span>{part.area !== undefined ? formatters.formatArea(part.area) : '—'}</span>
            </Table.Cell>
            <Table.Cell className="text-end">
              <span>{part.totalArea !== undefined ? formatters.formatArea(part.totalArea) : '—'}</span>
            </Table.Cell>
            <Table.Cell className="text-center">
              <span>{part.quantity}</span>
            </Table.Cell>
            <Table.Cell className="text-center">
              {canHighlightPart(part.partId) && onViewInPlan && (
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => {
                    onViewInPlan(part.partId)
                  }}
                  title={t($ => $.modulesList.actions.viewInPlan)}
                  className="-my-2"
                >
                  <EyeOpenIcon />
                </Button>
              )}
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  )
}

function ModuleGroupCard({ group, onBackToTop, onViewInPlan, formatters }: ModuleGroupCardProps) {
  const { t } = useTranslation('construction')

  return (
    <Card variant="surface" className="p-2">
      <CardHeader className="p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold">
              {group.description ? useTranslatableString(group.description) : group.type}
            </h3>
          </div>
          <Button size="icon" title={t($ => $.modulesList.actions.backToSummary)} variant="ghost" onClick={onBackToTop}>
            <PinTopIcon />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-3">
        <ModulePartsTable parts={group.parts} onViewInPlan={onViewInPlan} formatters={formatters} />
      </CardContent>
    </Card>
  )
}

export function ConstructionVirtualPartsList({
  partsList,
  onViewInPlan
}: {
  partsList: VirtualPartsList
  onViewInPlan?: (partId: PartId) => void
}): React.JSX.Element {
  const { t } = useTranslation('construction')
  const formatters = useFormatters()
  const topRef = useRef<HTMLDivElement | null>(null)
  const detailRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const parts = useMemo(() => Object.values(partsList), [partsList])

  const groups = useMemo(() => groupModules(parts), [parts])

  const summaryRows: ModuleSummaryRow[] = useMemo(
    () =>
      groups.map(group => ({
        key: group.key,
        type: group.type,
        description: group.description,
        metrics: group.metrics
      })),
    [groups]
  )

  if (parts.length === 0) {
    return (
      <Card variant="surface" className="w-full">
        <CardContent className="flex justify-center">
          <span className="text-muted-foreground text-lg">{t($ => $.modulesList.noModules)}</span>
        </CardContent>
      </Card>
    )
  }

  const scrollToGroup = useCallback((groupKey?: string) => {
    if (!groupKey) return
    const target = detailRefs.current[groupKey]
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const scrollToTop = useCallback(() => {
    if (topRef.current) {
      topRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  const setDetailRef = useCallback((groupKey: string) => {
    return (element: HTMLDivElement | null) => {
      detailRefs.current[groupKey] = element
    }
  }, [])

  return (
    <div className="flex w-full flex-col gap-4">
      <Card ref={topRef} variant="surface" className="p-2">
        <CardHeader className="p-3">
          <h2 className="text-xl font-bold">{t($ => $.modulesList.summary)}</h2>
        </CardHeader>
        <CardContent className="px-3">
          <Table.Root variant="surface" className="min-w-full">
            <Table.Header className="bg-muted">
              <Table.Row>
                <Table.ColumnHeaderCell>{t($ => $.modulesList.tableHeaders.type)}</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>{t($ => $.modulesList.tableHeaders.specificType)}</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell width="10em" className="text-center">
                  {t($ => $.modulesList.tableHeaders.totalQuantity)}
                </Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell width="10em" className="text-center">
                  {t($ => $.modulesList.tableHeaders.differentParts)}
                </Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell width="10em" className="text-end">
                  {t($ => $.modulesList.tableHeaders.totalArea)}
                </Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell width="4em" className="text-center" />
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {summaryRows.map(row => (
                <ModuleSummaryTableRow
                  key={row.key}
                  row={row}
                  onNavigate={() => {
                    scrollToGroup(row.key)
                  }}
                  formatters={formatters}
                />
              ))}
            </Table.Body>
          </Table.Root>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        {groups.map(group => (
          <div key={group.key} ref={setDetailRef(group.key)}>
            <ModuleGroupCard
              group={group}
              onBackToTop={scrollToTop}
              onViewInPlan={onViewInPlan}
              formatters={formatters}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
