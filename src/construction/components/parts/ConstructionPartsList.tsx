import { ExclamationTriangleIcon, Pencil1Icon, PinBottomIcon, PinTopIcon } from '@radix-ui/react-icons'
import * as d3 from 'd3-array'
import React, { Suspense, useCallback, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Table } from '@/components/ui/table'
import { Tooltip } from '@/components/ui/tooltip'
import DimensionalPartsTable from '@/construction/components/parts/DimensionalPartsTable'
import GenericPartsTable from '@/construction/components/parts/GenericPartsTable'
import { RegenerateLabelsButton } from '@/construction/components/parts/RegenerateLabelsButton'
import SheetPartsTable from '@/construction/components/parts/SheetPartsTable'
import StrawbalePartsTable from '@/construction/components/parts/StrawbalePartsTable'
import VolumePartsTable from '@/construction/components/parts/VolumePartsTable'
import {
  type MaterialGroup,
  type PartSubGroup,
  groupKey,
  groupSortCmp,
  subGroupKey,
  toMaterialGroup
} from '@/construction/components/parts/utils/aggregation'
import { useConfigurationModal } from '@/construction/config/context/ConfigurationModalContext'
import { getMaterialTypeIcon, useGetMaterialTypeName } from '@/construction/materials/components/MaterialSelect'
import type { Material } from '@/construction/materials/material'
import { useMaterialName } from '@/construction/materials/useMaterialName'
import { type ConstructionModelId, type PartId, getLabelGroupId, useMaterialParts } from '@/construction/parts'
import { useFormatters } from '@/shared/i18n/useFormatters'
import { useTranslatableString } from '@/shared/i18n/useTranslatableString'

interface ConstructionPartsListProps {
  modelId?: ConstructionModelId
  onViewInPlan?: (partId: PartId) => void
}

function MaterialTypeIndicator({ material, size = 18 }: { material: Material; size?: number }) {
  const getMaterialTypeName = useGetMaterialTypeName()
  const Icon = getMaterialTypeIcon(material.type)
  const iconSize = Math.max(size - 6, 8)
  return (
    <div
      title={getMaterialTypeName(material.type)}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: material.color
      }}
      className="mx-auto flex shrink-0 items-center justify-center rounded-[4px] border border-gray-700"
      aria-hidden
    >
      <Icon
        width={String(iconSize)}
        height={String(iconSize)}
        style={{ color: 'white', filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.5))' }}
      />
    </div>
  )
}

function MaterialSummaryRow({ group, onNavigate }: { group: MaterialGroup; onNavigate: () => void }) {
  const { t } = useTranslation('construction')
  const { formatWeight, formatLengthInMeters, formatArea, formatVolume } = useFormatters()
  const materialName = useMaterialName(group.material)

  return (
    <Table.Row>
      <Table.RowHeaderCell className="text-center">
        <MaterialTypeIndicator material={group.material} />
      </Table.RowHeaderCell>
      <Table.RowHeaderCell>
        <div className="text-foreground flex items-center justify-between gap-2">
          <span className="font-medium">{materialName}</span>
          <Button size="icon-xs" title={t($ => $.partsList.actions.jumpToDetails)} variant="ghost" onClick={onNavigate}>
            <PinBottomIcon />
          </Button>
        </div>
      </Table.RowHeaderCell>
      <Table.Cell className="text-center">{group.totalQuantity}</Table.Cell>
      <Table.Cell className="text-center">{group.distinctCount}</Table.Cell>
      <Table.Cell className="text-end">{group.totalLength ? formatLengthInMeters(group.totalLength) : '—'}</Table.Cell>
      <Table.Cell className="text-end">{group.totalArea ? formatArea(group.totalArea) : '—'}</Table.Cell>
      <Table.Cell className="text-end">{formatVolume(group.totalVolume)}</Table.Cell>
      <Table.Cell className="text-end">{group.totalWeight ? formatWeight(group.totalWeight) : '—'}</Table.Cell>
    </Table.Row>
  )
}

function MaterialGroupSummaryRow({ group, onNavigate }: { group: PartSubGroup; onNavigate: () => void }) {
  const { t } = useTranslation('construction')
  const { formatWeight, formatLengthInMeters, formatArea, formatVolume } = useFormatters()
  const badgeLabel = useTranslatableString(group.badgeLabel)
  return (
    <Table.Row>
      <Table.Cell width="6em" className="text-center">
        <span className="text-muted-foreground/60">↳</span>
      </Table.Cell>
      <Table.Cell>
        <div className="flex items-center justify-between gap-2">
          <Badge variant="surface" color={group.issueMessage ? 'red' : 'blue'}>
            {badgeLabel}
          </Badge>
          <Button size="icon-xs" title={t($ => $.partsList.actions.jumpToDetails)} variant="ghost" onClick={onNavigate}>
            <PinBottomIcon />
          </Button>
        </div>
      </Table.Cell>
      <Table.Cell className="text-center">{group.totalQuantity}</Table.Cell>
      <Table.Cell className="text-center">{group.distinctCount}</Table.Cell>
      <Table.Cell className="text-end">{group.totalLength ? formatLengthInMeters(group.totalLength) : '—'}</Table.Cell>
      <Table.Cell className="text-end">{group.totalArea ? formatArea(group.totalArea) : '—'}</Table.Cell>
      <Table.Cell className="text-end">{formatVolume(group.totalVolume)}</Table.Cell>
      <Table.Cell className="text-end">{group.totalWeight ? formatWeight(group.totalWeight) : '—'}</Table.Cell>
    </Table.Row>
  )
}

interface MaterialGroupCardProps {
  material: Material
  group: PartSubGroup
  onBackToTop: () => void
  onViewInPlan?: (partId: PartId) => void
}

function MaterialGroupCard({ material, group, onBackToTop, onViewInPlan }: MaterialGroupCardProps) {
  const { t } = useTranslation('construction')
  const { openConfiguration } = useConfigurationModal()
  const materialName = useMaterialName(material)
  const badgeLabel = useTranslatableString(group.badgeLabel)
  const issueMessage = useTranslatableString(group.issueMessage)
  const groupId = getLabelGroupId({ source: 'element', materialId: material.id })
  return (
    <Card variant="surface" className="p-2">
      <CardHeader className="p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <MaterialTypeIndicator material={material} size={24} />
            <h3 className="text-lg font-bold">{materialName}</h3>
            <Button
              size="icon-xs"
              title={t($ => $.partsList.actions.configureMaterial)}
              variant="ghost"
              onClick={() => {
                openConfiguration('materials', material.id)
              }}
            >
              <Pencil1Icon />
            </Button>
            <div className="flex items-center gap-2">
              {group.badgeLabel && (
                <Badge variant="surface" color={group.issueMessage ? 'red' : 'gray'}>
                  {badgeLabel}
                </Badge>
              )}
              {group.issueMessage && (
                <Tooltip content={issueMessage}>
                  <ExclamationTriangleIcon className="text-red-600" />
                </Tooltip>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <RegenerateLabelsButton groupId={groupId} compact />
            <Button size="icon" title={t($ => $.partsList.actions.backToSummary)} variant="ghost" onClick={onBackToTop}>
              <PinTopIcon />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-3">
        {material.type === 'dimensional' && (
          <DimensionalPartsTable parts={group.parts} material={material} onViewInPlan={onViewInPlan} />
        )}
        {material.type === 'sheet' && (
          <SheetPartsTable parts={group.parts} material={material} onViewInPlan={onViewInPlan} />
        )}
        {material.type === 'volume' && (
          <VolumePartsTable parts={group.parts} material={material} onViewInPlan={onViewInPlan} />
        )}
        {material.type === 'generic' && <GenericPartsTable parts={group.parts} onViewInPlan={onViewInPlan} />}
        {material.type === 'strawbale' && <StrawbalePartsTable parts={group.parts} material={material} />}
      </CardContent>
    </Card>
  )
}

export function ConstructionPartsList({ modelId, onViewInPlan }: ConstructionPartsListProps): React.JSX.Element {
  const { t } = useTranslation('construction')
  const topRef = useRef<HTMLDivElement | null>(null)
  const detailRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const aggregatedParts = useMaterialParts(modelId)
  const grouped = d3.groups(aggregatedParts, groupKey, subGroupKey)
  const sorted = d3.sort(grouped, ([k, _]) => k).map(([, v]) => v)
  const groups = sorted.map(toMaterialGroup).filter(m => m != null)

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

  const sortedGroups = useMemo(() => d3.sort(groups, groupSortCmp(t)), [groups, t])

  if (sortedGroups.length === 0) {
    return (
      <Card variant="ghost">
        <span className="text-base">{t($ => $.partsList.noPartsAvailable)}</span>
      </Card>
    )
  }
  return (
    <Suspense fallback={<PartsSkeleton />}>
      <div className="flex w-full flex-col gap-4">
        <SummaryTable
          setTopRef={r => {
            topRef.current = r
          }}
          scrollToGroup={scrollToGroup}
          groups={sortedGroups}
        />

        <div className="flex flex-col gap-4">
          {sortedGroups
            .flatMap(g => g.subGroups.map(s => [g.material, s] as const))
            .map(([material, group]) => (
              <div key={group.key} ref={setDetailRef(group.key)}>
                <MaterialGroupCard
                  material={material}
                  group={group}
                  onBackToTop={scrollToTop}
                  onViewInPlan={onViewInPlan}
                />
              </div>
            ))}
        </div>
      </div>
    </Suspense>
  )
}

function SummaryTable({
  groups,
  setTopRef,
  scrollToGroup
}: {
  groups: MaterialGroup[]
  setTopRef: (ref: HTMLDivElement) => void
  scrollToGroup: (group: string) => void
}) {
  const { t } = useTranslation('construction')

  return (
    <Card ref={setTopRef} variant="surface" className="p-2">
      <CardHeader className="p-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold">{t($ => $.partsList.summary)}</h2>
          <RegenerateLabelsButton />
        </div>
      </CardHeader>
      <CardContent className="px-3">
        <Table.Root variant="surface" className="min-w-full">
          <Table.Header className="bg-muted">
            <Table.Row>
              <Table.ColumnHeaderCell width="4em" className="text-center">
                {t($ => $.partsList.tableHeaders.type)}
              </Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>{t($ => $.partsList.tableHeaders.material)}</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell width="10em" className="text-center">
                {t($ => $.partsList.tableHeaders.totalQuantity)}
              </Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell width="10em" className="text-center">
                {t($ => $.partsList.tableHeaders.differentParts)}
              </Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell width="10em" className="text-end">
                {t($ => $.partsList.tableHeaders.totalLength)}
              </Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell width="10em" className="text-end">
                {t($ => $.partsList.tableHeaders.totalArea)}
              </Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell width="10em" className="text-end">
                {t($ => $.partsList.tableHeaders.totalVolume)}
              </Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell width="10em" className="text-end">
                {t($ => $.partsList.tableHeaders.totalWeight)}
              </Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {groups.map(group => (
              <React.Fragment key={group.key}>
                <MaterialSummaryRow
                  group={group}
                  onNavigate={() => {
                    scrollToGroup(group.subGroups[0]?.key)
                  }}
                />
                {group.subGroups.length > 1 &&
                  group.subGroups.map(g => (
                    <MaterialGroupSummaryRow
                      group={g}
                      key={g.key}
                      onNavigate={() => {
                        scrollToGroup(g.key)
                      }}
                    />
                  ))}
              </React.Fragment>
            ))}
          </Table.Body>
        </Table.Root>
      </CardContent>
    </Card>
  )
}

function PartsSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <CardSkeleton />
      <CardSkeleton />
      <Spinner className="self-center" />
    </div>
  )
}

function CardSkeleton() {
  return <Skeleton className="h-[160px] rounded-lg" />
}
