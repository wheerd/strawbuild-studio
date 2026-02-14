import { EyeOpenIcon, PinBottomIcon, PinTopIcon } from '@radix-ui/react-icons'
import * as d3 from 'd3-array'
import React, { useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Table } from '@/components/ui/table'
import type { VirtualGroup } from '@/construction/components/parts/utils/aggregation'
import { toVirtualGroup, virtualGroupKey } from '@/construction/components/parts/utils/aggregation'
import type { PartId } from '@/construction/parts'
import { type ConstructionModelId, useVirtualParts } from '@/construction/parts/store'
import { useFormatters } from '@/shared/i18n/useFormatters'
import { useTranslatableString } from '@/shared/i18n/useTranslatableString'

interface ConstructionVirtualPartsListProps {
  modelId?: ConstructionModelId
  onViewInPlan?: (partId: PartId) => void
}

const canHighlightPart = (partId: PartId): boolean => !partId.startsWith('auto_')

function ModuleSummaryTableRow({ group, onNavigate }: { group: VirtualGroup; onNavigate: () => void }) {
  const { t } = useTranslation('construction')
  const { formatArea } = useFormatters()
  const description = useTranslatableString(group.description)

  return (
    <Table.Row>
      <Table.RowHeaderCell>{group.type}</Table.RowHeaderCell>
      <Table.Cell>{group.description ? description : '—'}</Table.Cell>
      <Table.Cell className="text-center">{group.totalQuantity}</Table.Cell>
      <Table.Cell className="text-center">{group.distinctCount}</Table.Cell>
      <Table.Cell className="text-end">{group.totalArea ? formatArea(group.totalArea) : '—'}</Table.Cell>
      <Table.Cell className="text-center">
        <Button size="icon-xs" title={t($ => $.modulesList.actions.jumpToDetails)} variant="ghost" onClick={onNavigate}>
          <PinBottomIcon />
        </Button>
      </Table.Cell>
    </Table.Row>
  )
}

function ModulePartsTable({
  parts,
  onViewInPlan
}: {
  parts: VirtualGroup['parts']
  onViewInPlan?: (partId: PartId) => void
}) {
  const { t } = useTranslation('construction')
  const { formatDimensions3D, formatArea } = useFormatters()

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
              <span>{formatDimensions3D([part.size[0], part.size[1], part.size[2]])}</span>
            </Table.Cell>
            <Table.Cell className="text-end">{part.area ? formatArea(part.area) : '—'}</Table.Cell>
            <Table.Cell className="text-end">{part.totalArea ? formatArea(part.totalArea) : '—'}</Table.Cell>
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

function ModuleGroupCard({
  group,
  onBackToTop,
  onViewInPlan
}: {
  group: VirtualGroup
  onBackToTop: () => void
  onViewInPlan?: (partId: PartId) => void
}) {
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
        <ModulePartsTable parts={group.parts} onViewInPlan={onViewInPlan} />
      </CardContent>
    </Card>
  )
}

export function ConstructionVirtualPartsList({
  modelId,
  onViewInPlan
}: ConstructionVirtualPartsListProps): React.JSX.Element {
  const { t } = useTranslation('construction')
  const topRef = useRef<HTMLDivElement | null>(null)
  const detailRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const aggregatedParts = useVirtualParts(modelId)
  const grouped = d3.groups(aggregatedParts, virtualGroupKey)
  const groups = grouped.map(([, parts]) => toVirtualGroup(parts))

  const setDetailRef = useCallback((groupKey: string) => {
    return (element: HTMLDivElement | null) => {
      detailRefs.current[groupKey] = element
    }
  }, [])

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

  if (groups.length === 0) {
    return (
      <Card variant="surface" className="w-full">
        <CardContent className="flex justify-center">
          <span className="text-muted-foreground text-lg">{t($ => $.modulesList.noModules)}</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <SummaryTable
        setTopRef={r => {
          topRef.current = r
        }}
        scrollToGroup={scrollToGroup}
        groups={groups}
      />

      <div className="flex flex-col gap-4">
        {groups.map(group => (
          <div key={group.key} ref={setDetailRef(group.key)}>
            <ModuleGroupCard group={group} onBackToTop={scrollToTop} onViewInPlan={onViewInPlan} />
          </div>
        ))}
      </div>
    </div>
  )
}

function SummaryTable({
  groups,
  setTopRef,
  scrollToGroup
}: {
  groups: VirtualGroup[]
  setTopRef: (ref: HTMLDivElement) => void
  scrollToGroup: (group: string) => void
}) {
  const { t } = useTranslation('construction')

  return (
    <Card ref={setTopRef} variant="surface" className="p-2">
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
            {groups.map(group => (
              <ModuleSummaryTableRow
                key={group.key}
                group={group}
                onNavigate={() => {
                  scrollToGroup(group.key)
                }}
              />
            ))}
          </Table.Body>
        </Table.Root>
      </CardContent>
    </Card>
  )
}
