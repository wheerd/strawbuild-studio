import { ExclamationTriangleIcon, Pencil1Icon, PinBottomIcon, PinTopIcon } from '@radix-ui/react-icons'
import React, { useCallback, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Table } from '@/components/ui/table'
import { Tooltip } from '@/components/ui/tooltip'
import DimensionalPartsTable from '@/construction/components/parts/DimensionalPartsTable'
import GenericPartsTable from '@/construction/components/parts/GenericPartsTable'
import SheetPartsTable from '@/construction/components/parts/SheetPartsTable'
import StrawbalePartsTable, { summarizeStrawbaleParts } from '@/construction/components/parts/StrawbalePartsTable'
import VolumePartsTable from '@/construction/components/parts/VolumePartsTable'
import { useConfigurationModal } from '@/construction/config/context/ConfigurationModalContext'
import { getMaterialTypeIcon, useGetMaterialTypeName } from '@/construction/materials/components/MaterialSelect'
import type { DimensionalMaterial, Material, MaterialType, SheetMaterial } from '@/construction/materials/material'
import { useMaterialsMap } from '@/construction/materials/store'
import { useMaterialName } from '@/construction/materials/useMaterialName'
import type { MaterialPartItem, MaterialParts, MaterialPartsList, PartId } from '@/construction/parts'
import { useFormatters } from '@/shared/i18n/useFormatters'

import { calculateWeight } from './utils'

type BadgeColor = React.ComponentProps<typeof Badge>['color']

interface ConstructionPartsListProps {
  partsList: MaterialPartsList
  onViewInPlan?: (partId: PartId) => void
}

interface RowMetrics {
  totalQuantity: number
  totalVolume: number
  totalLength?: number
  totalArea?: number
  totalWeight?: number
}

interface MaterialGroup {
  key: string
  label: string
  badgeLabel?: string
  badgeColor?: BadgeColor
  hasIssue: boolean
  issueMessage?: string
  parts: MaterialPartItem[]
  metrics: RowMetrics & { partCount: number }
}

interface Formatters {
  formatLength: (mm: number) => string
  formatLengthInMeters: (mm: number) => string
  formatArea: (mm2: number) => string
  formatVolume: (mm3: number) => string
  formatDimensions2D: (dimensions: [number, number]) => string
  formatDimensions3D: (dimensions: [number, number, number]) => string
  formatWeight: (kg: number) => string
}

const createGroup = ({
  key,
  label,
  badgeLabel,
  badgeColor,
  hasIssue,
  issueMessage,
  material,
  parts
}: {
  key: string
  label: string
  badgeLabel?: string
  badgeColor?: BadgeColor
  hasIssue: boolean
  issueMessage?: string
  material: Material
  parts: MaterialPartItem[]
}): MaterialGroup => {
  return {
    key,
    label,
    badgeLabel,
    badgeColor,
    hasIssue,
    issueMessage,
    parts,
    metrics: computeGroupMetrics(parts, material)
  }
}

const computeGroupMetrics = (parts: MaterialPartItem[], material: Material): RowMetrics & { partCount: number } => {
  if (material.type === 'strawbale') {
    const summary = summarizeStrawbaleParts(parts, material)
    return {
      totalQuantity: summary.totalEstimatedBalesMax,
      totalVolume: summary.totalVolume,
      totalLength: undefined,
      totalArea: undefined,
      totalWeight: calculateWeight(summary.totalVolume, material),
      partCount: parts.length
    }
  }

  let totalQuantity = 0
  let totalVolume = 0
  let totalLength: number | undefined
  let totalArea: number | undefined

  for (const part of parts) {
    totalQuantity += part.quantity
    totalVolume += part.totalVolume

    if (part.totalLength !== undefined) {
      totalLength = (totalLength ?? 0) + part.totalLength
    }

    if (part.totalArea !== undefined) {
      totalArea = (totalArea ?? 0) + part.totalArea
    }
  }

  return {
    totalQuantity,
    totalVolume,
    totalLength,
    totalArea,
    totalWeight: calculateWeight(totalVolume, material),
    partCount: parts.length
  }
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

function MaterialSummaryRow({
  material,
  metrics,
  onNavigate,
  formatters
}: {
  material: Material
  metrics: RowMetrics & { partCount: number }
  onNavigate: () => void
  formatters: Formatters
}) {
  const { t } = useTranslation('construction')
  const formatWeight = (weight: number | undefined): string => {
    if (weight === undefined) return '—'
    return formatters.formatWeight(weight)
  }
  const materialName = useMaterialName(material)

  return (
    <Table.Row>
      <Table.RowHeaderCell className="text-center">
        <MaterialTypeIndicator material={material} />
      </Table.RowHeaderCell>
      <Table.RowHeaderCell>
        <div className="text-foreground flex items-center justify-between gap-2">
          <span className="font-medium">{materialName}</span>
          <Button size="icon-xs" title={t($ => $.partsList.actions.jumpToDetails)} variant="ghost" onClick={onNavigate}>
            <PinBottomIcon />
          </Button>
        </div>
      </Table.RowHeaderCell>
      <Table.Cell className="text-center">{metrics.totalQuantity}</Table.Cell>
      <Table.Cell className="text-center">{metrics.partCount}</Table.Cell>
      <Table.Cell className="text-end">
        {metrics.totalLength !== undefined ? formatters.formatLengthInMeters(metrics.totalLength) : '—'}
      </Table.Cell>
      <Table.Cell className="text-end">
        {metrics.totalArea !== undefined ? formatters.formatArea(metrics.totalArea) : '—'}
      </Table.Cell>
      <Table.Cell className="text-end">{formatters.formatVolume(metrics.totalVolume)}</Table.Cell>
      <Table.Cell className="text-end">{formatWeight(metrics.totalWeight)}</Table.Cell>
    </Table.Row>
  )
}

function MaterialGroupSummaryRow({
  group,
  onNavigate,
  formatters
}: {
  group: MaterialGroup
  onNavigate: () => void
  formatters: Formatters
}) {
  const { t } = useTranslation('construction')
  const { metrics } = group
  const formatWeight = (weight: number | undefined): string => {
    if (weight === undefined) return '—'
    return formatters.formatWeight(weight)
  }

  return (
    <Table.Row>
      <Table.Cell width="6em" className="text-center">
        <span className="text-muted-foreground/60">↳</span>
      </Table.Cell>
      <Table.Cell>
        <div className="flex items-center justify-between gap-2">
          <Badge variant="surface" color={group.badgeColor ?? 'blue'}>
            {group.badgeLabel}
          </Badge>
          <Button size="icon-xs" title={t($ => $.partsList.actions.jumpToDetails)} variant="ghost" onClick={onNavigate}>
            <PinBottomIcon />
          </Button>
        </div>
      </Table.Cell>
      <Table.Cell className="text-center">{metrics.totalQuantity}</Table.Cell>
      <Table.Cell className="text-center">{metrics.partCount}</Table.Cell>
      <Table.Cell className="text-end">
        {metrics.totalLength !== undefined ? formatters.formatLengthInMeters(metrics.totalLength) : '—'}
      </Table.Cell>
      <Table.Cell className="text-end">
        {metrics.totalArea !== undefined ? formatters.formatArea(metrics.totalArea) : '—'}
      </Table.Cell>
      <Table.Cell className="text-end">{formatters.formatVolume(metrics.totalVolume)}</Table.Cell>
      <Table.Cell className="text-end">{formatWeight(metrics.totalWeight)}</Table.Cell>
    </Table.Row>
  )
}

interface MaterialGroupCardProps {
  material: Material
  group: MaterialGroup
  onBackToTop: () => void
  onViewInPlan?: (partId: PartId) => void
}

function MaterialGroupCard({ material, group, onBackToTop, onViewInPlan }: MaterialGroupCardProps) {
  const { t } = useTranslation('construction')
  const { openConfiguration } = useConfigurationModal()
  const materialName = useMaterialName(material)

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
                <Badge variant="surface" color={group.badgeColor ?? 'gray'}>
                  {group.badgeLabel}
                </Badge>
              )}
              {group.hasIssue && (
                <Tooltip content={group.issueMessage ?? t($ => $.partsList.issues.groupMismatch)}>
                  <ExclamationTriangleIcon className="text-red-600" />
                </Tooltip>
              )}
            </div>
          </div>
          <Button size="icon" title={t($ => $.partsList.actions.backToSummary)} variant="ghost" onClick={onBackToTop}>
            <PinTopIcon />
          </Button>
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

export function ConstructionPartsList({ partsList, onViewInPlan }: ConstructionPartsListProps): React.JSX.Element {
  const { t } = useTranslation('construction')
  const materialsMap = useMaterialsMap()
  const formatters = useFormatters()
  const topRef = useRef<HTMLDivElement | null>(null)
  const detailRefs = useRef<Record<string, HTMLDivElement | null>>({})

  // Helper functions for grouping parts - defined inside component to access t()
  const groupDimensionalParts = useCallback(
    (parts: MaterialPartItem[], material: DimensionalMaterial): MaterialGroup[] => {
      const groups = new Map<
        string,
        {
          label: string
          badgeLabel: string
          badgeColor: BadgeColor
          parts: MaterialPartItem[]
          sortValue: number
          hasIssue: boolean
          issueMessage?: string
        }
      >()

      for (const part of parts) {
        const displayCrossSection = part.crossSection
        const groupKey = displayCrossSection
          ? `dimensional:${displayCrossSection.smallerLength}x${displayCrossSection.biggerLength}`
          : 'dimensional:other'
        const key = `${material.id}|${groupKey}`
        const label = displayCrossSection
          ? formatters.formatDimensions2D([displayCrossSection.smallerLength, displayCrossSection.biggerLength])
          : t($ => $.partsList.other.crossSections)
        const sortValue = displayCrossSection
          ? displayCrossSection.smallerLength * displayCrossSection.biggerLength
          : Number.MAX_SAFE_INTEGER

        const isKnown = material.crossSections.some(
          cs =>
            cs.smallerLength === displayCrossSection?.smallerLength &&
            cs.biggerLength === displayCrossSection.biggerLength
        )

        let group = groups.get(key)
        if (group == null) {
          group = {
            label,
            badgeLabel: label,
            badgeColor: isKnown ? undefined : 'red',
            parts: [],
            sortValue,
            hasIssue: !isKnown,
            issueMessage: isKnown ? undefined : t($ => $.partsList.other.crossSectionMismatch)
          }
          groups.set(key, group)
        }

        group.parts.push(part)
      }

      return Array.from(groups.entries())
        .sort(([, a], [, b]) => a.sortValue - b.sortValue)
        .map(([key, group]) => createGroup({ key, ...group, material, parts: group.parts }))
    },
    [formatters, t]
  )

  const groupSheetParts = useCallback(
    (parts: MaterialPartItem[], material: SheetMaterial): MaterialGroup[] => {
      const groups = new Map<
        string,
        {
          label: string
          badgeLabel: string
          badgeColor: BadgeColor
          parts: MaterialPartItem[]
          sortValue: number
          hasIssue: boolean
          issueMessage?: string
        }
      >()

      for (const part of parts) {
        const thickness = part.thickness
        const groupKey = thickness != null ? `sheet:${thickness}` : 'sheet:other'
        const key = `${material.id}|${groupKey}`
        const label = thickness != null ? formatters.formatLength(thickness) : t($ => $.partsList.other.thicknesses)
        const sortValue = thickness ?? Number.MAX_SAFE_INTEGER

        const isKnown = material.thicknesses.includes(thickness ?? -1)

        let group = groups.get(key)
        if (group == null) {
          group = {
            label,
            badgeLabel: label,
            badgeColor: isKnown ? undefined : 'red',
            parts: [],
            sortValue,
            hasIssue: !isKnown,
            issueMessage: isKnown ? undefined : t($ => $.partsList.other.thicknessMismatch)
          }
          groups.set(key, group)
        }

        group.parts.push(part)
      }

      return Array.from(groups.entries())
        .sort(([, a], [, b]) => a.sortValue - b.sortValue)
        .map(([key, group]) => createGroup({ key, ...group, material, parts: group.parts }))
    },
    [formatters, t]
  )

  const createMaterialGroups = useCallback(
    (material: Material, materialParts: MaterialParts): MaterialGroup[] => {
      const parts = Object.values(materialParts.parts)
      if (parts.length === 0) return []

      if (material.type === 'dimensional') {
        return groupDimensionalParts(parts, material)
      }

      if (material.type === 'sheet') {
        return groupSheetParts(parts, material)
      }

      if (material.type === 'strawbale') {
        return [
          createGroup({
            key: `${material.id}-straw`,
            label: t($ => $.partsList.groups.strawbales),
            hasIssue: false,
            material,
            parts
          })
        ]
      }

      return [
        createGroup({
          key: `${material.id}-all`,
          label: t($ => $.partsList.groups.allParts),
          hasIssue: false,
          material,
          parts
        })
      ]
    },
    [groupDimensionalParts, groupSheetParts]
  )

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

  const materialIds = useMemo(() => {
    const MATERIAL_TYPE_ORDER: MaterialType[] = ['strawbale', 'dimensional', 'sheet', 'volume', 'generic']

    return (Object.keys(partsList) as Material['id'][])
      .filter(id => id in materialsMap)
      .map(id => ({ id, material: materialsMap[id] }))
      .sort((a, b) => {
        // Sort by type first
        const typeA = a.material.type
        const typeB = b.material.type
        if (typeA !== typeB) {
          const orderA = MATERIAL_TYPE_ORDER.indexOf(typeA)
          const orderB = MATERIAL_TYPE_ORDER.indexOf(typeB)
          return orderA - orderB
        }
        // Then sort by name
        return a.material.name.localeCompare(b.material.name)
      })
      .map(({ id }) => id)
  }, [partsList, materialsMap])

  if (materialIds.length === 0) {
    return (
      <Card variant="ghost">
        <span className="text-base">{t($ => $.partsList.noPartsAvailable)}</span>
      </Card>
    )
  }

  const summaryRows = materialIds
    .map(materialId => {
      if (!(materialId in partsList) || !(materialId in materialsMap)) return null
      const materialParts = partsList[materialId]
      const material = materialsMap[materialId]
      const totalWeight = calculateWeight(materialParts.totalVolume, material)
      const parts = Object.values(materialParts.parts)
      const metrics: RowMetrics & { partCount: number } = {
        totalQuantity: materialParts.totalQuantity,
        totalVolume: materialParts.totalVolume,
        totalLength: materialParts.totalLength,
        totalArea: materialParts.totalArea,
        totalWeight,
        partCount: parts.length
      }
      if (material.type === 'strawbale') {
        const strawSummary = summarizeStrawbaleParts(parts, material)
        metrics.totalQuantity = strawSummary.totalEstimatedBalesMax
      }
      const groups = createMaterialGroups(material, materialParts)
      return { material, metrics, groups }
    })
    .filter(
      (row): row is { material: Material; metrics: RowMetrics & { partCount: number }; groups: MaterialGroup[] } =>
        row !== null
    )

  return (
    <div className="flex w-full flex-col gap-4">
      <Card ref={topRef} variant="surface" className="p-2">
        <CardHeader className="p-3">
          <h2 className="text-xl font-bold">{t($ => $.partsList.summary)}</h2>
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
              {summaryRows.map(row => (
                <React.Fragment key={row.material.id}>
                  <MaterialSummaryRow
                    material={row.material}
                    metrics={row.metrics}
                    onNavigate={() => {
                      scrollToGroup(row.groups[0]?.key)
                    }}
                    formatters={formatters}
                  />
                  {row.groups.length > 1 &&
                    row.groups.map(group => (
                      <MaterialGroupSummaryRow
                        key={group.key}
                        group={group}
                        onNavigate={() => {
                          scrollToGroup(group.key)
                        }}
                        formatters={formatters}
                      />
                    ))}
                </React.Fragment>
              ))}
            </Table.Body>
          </Table.Root>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        {materialIds.map(materialId => {
          if (!(materialId in materialsMap) || !(materialId in partsList)) return null
          const material = materialsMap[materialId]
          const materialParts = partsList[materialId]
          const groups = createMaterialGroups(material, materialParts)
          if (groups.length === 0) return null
          return (
            <div key={materialId} className="flex flex-col gap-4">
              {groups.map(group => (
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
          )
        })}
      </div>
    </div>
  )
}
