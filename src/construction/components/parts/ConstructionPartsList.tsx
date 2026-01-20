import { ExclamationTriangleIcon, EyeOpenIcon, Pencil1Icon, PinBottomIcon, PinTopIcon } from '@radix-ui/react-icons'
import React, { useCallback, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Table } from '@/components/ui/table'
import { Tooltip } from '@/components/ui/tooltip'
import { PartCutModal } from '@/construction/components/parts/PartCutModal'
import { SheetPartModal } from '@/construction/components/parts/SheetPartModal'
import { useConfigurationModal } from '@/construction/config/context/ConfigurationModalContext'
import { getMaterialTypeIcon, useGetMaterialTypeName } from '@/construction/materials/components/MaterialSelect'
import type {
  DimensionalMaterial,
  Material,
  MaterialType,
  SheetMaterial,
  StrawbaleMaterial,
  VolumeMaterial
} from '@/construction/materials/material'
import { useMaterialsMap } from '@/construction/materials/store'
import { useMaterialName } from '@/construction/materials/useMaterialName'
import type { MaterialPartItem, MaterialParts, MaterialPartsList, PartId } from '@/construction/parts'
import { SawIcon } from '@/shared/components/Icons'
import { Bounds2D, type Polygon2D, type Vec3, type Volume, isZeroVec3 } from '@/shared/geometry'
import { useFormatters } from '@/shared/i18n/useFormatters'

type BadgeColor = React.ComponentProps<typeof Badge>['color']

interface ConstructionPartsListProps {
  partsList: MaterialPartsList
  onViewInPlan?: (partId: PartId) => void
}

// Helper to check if part can be highlighted (not auto-generated)
const canHighlightPart = (partId: PartId): boolean => !partId.startsWith('auto_')

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

type StrawCategory = NonNullable<MaterialPartItem['strawCategory']>

const STRAW_CATEGORY_ORDER: StrawCategory[] = ['full', 'partial', 'flakes', 'stuffed']

// Helper functions that accept formatters and use locale-aware formatting
interface Formatters {
  formatLength: (mm: number) => string
  formatLengthInMeters: (mm: number) => string
  formatArea: (mm2: number) => string
  formatVolume: (mm3: number) => string
  formatDimensions2D: (dimensions: [number, number]) => string
  formatDimensions3D: (dimensions: [number, number, number]) => string
  formatWeight: (kg: number) => string
}

const formatSheetDimensions = (size: Vec3, thickness: number | undefined, formatters: Formatters): string => {
  if (thickness === undefined) {
    return formatters.formatDimensions3D([size[0], size[1], size[2]])
  }

  // Find which dimension matches the thickness and filter it out
  const dimensions: number[] = []
  for (let i = 0; i < 3; i++) {
    if (Math.round(size[i]) !== Math.round(thickness)) {
      dimensions.push(size[i])
    }
  }

  // If we successfully filtered out exactly one dimension, show 2D format
  if (dimensions.length === 2) {
    return formatters.formatDimensions2D([dimensions[0], dimensions[1]])
  }

  // Fallback to full 3D format if something unexpected happened
  return formatters.formatDimensions3D([size[0], size[1], size[2]])
}

const getIssueSeverity = (part: MaterialPartItem): 'error' | 'warning' | undefined => {
  if (!part.issue) return undefined

  // Size-related issues can be warnings if multiple pieces are allowed
  if (part.issue === 'LengthExceedsAvailable' || part.issue === 'SheetSizeExceeded') {
    return part.requiresSinglePiece ? 'error' : 'warning'
  }

  // Other issues (CrossSectionMismatch, ThicknessMismatch) are always errors
  return 'error'
}

const calculateWeight = (volume: Volume, material: Material): number | undefined => {
  if (material.density == null) return undefined
  return (volume * material.density) / 1_000_000_000
}

interface StrawSummary {
  buckets: Record<StrawCategory, { volume: number; count: number }>
  nominalMaxVolume: number
  nominalMinVolume: number
  minRemainingBaleCount: number
  maxRemainingBaleCount: number
  remainingVolumeMin: number
  remainingVolumeMax: number
  totalEstimatedBalesMax: number
  totalVolume: number
}

const ceilDiv = (value: number, divisor: number) => {
  if (value <= 0 || divisor <= 0) return 0
  return Math.ceil(value / divisor)
}

const floorDiv = (value: number, divisor: number) => {
  if (value <= 0 || divisor <= 0) return 0
  return Math.floor(value / divisor)
}

const summarizeStrawbaleParts = (parts: MaterialPartItem[], material: StrawbaleMaterial): StrawSummary => {
  const buckets: Record<StrawCategory, { volume: number; count: number }> = {
    full: { volume: 0, count: 0 },
    partial: { volume: 0, count: 0 },
    flakes: { volume: 0, count: 0 },
    stuffed: { volume: 0, count: 0 }
  }

  for (const part of parts) {
    const category: StrawCategory = part.strawCategory ?? 'stuffed'
    buckets[category].volume += part.totalVolume
    buckets[category].count += part.quantity
  }

  const nominalMaxVolume = material.baleHeight * material.baleWidth * material.baleMaxLength
  const nominalMinVolume = Math.max(material.baleHeight * material.baleWidth * material.baleMinLength, 1)
  const totalVolume = STRAW_CATEGORY_ORDER.reduce((sum, category) => sum + buckets[category].volume, 0)

  const partialBucket = buckets.partial
  const expectedPartialVolumeMin = partialBucket.count * nominalMinVolume
  const expectedPartialVolumeMax = partialBucket.count * nominalMaxVolume
  const remainingVolumeMin = Math.max(expectedPartialVolumeMin - partialBucket.volume, 0)
  const remainingVolumeMax = Math.max(expectedPartialVolumeMax - partialBucket.volume, 0)

  const remainingBaleCount1 = floorDiv(remainingVolumeMin, nominalMinVolume)
  const remainingBaleCount2 = floorDiv(remainingVolumeMax, nominalMaxVolume)

  const minRemainingBaleCount = Math.min(remainingBaleCount1, remainingBaleCount2)
  const maxRemainingBaleCount = Math.max(remainingBaleCount1, remainingBaleCount2)

  const totalEstimatedBalesMax =
    buckets.full.count +
    buckets.partial.count -
    minRemainingBaleCount +
    ceilDiv(buckets.flakes.volume, nominalMaxVolume) +
    ceilDiv(buckets.stuffed.volume, nominalMaxVolume)

  return {
    buckets,
    nominalMaxVolume,
    nominalMinVolume,
    minRemainingBaleCount,
    maxRemainingBaleCount,
    remainingVolumeMin,
    remainingVolumeMax,
    totalEstimatedBalesMax,
    totalVolume
  }
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
        backgroundColor: material.color,
        borderRadius: '4px',
        border: '1px solid var(--color-gray-700)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        margin: '0 auto'
      }}
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

const SPECIAL_CUT_PREVIEW_TARGET = 300
const SPECIAL_CUT_PREVIEW_PADDING = 6

function SpecialCutTooltip({ polygon }: { polygon: Polygon2D }): React.JSX.Element {
  const { t } = useTranslation('construction')
  const preview = useMemo(() => {
    const bounds = Bounds2D.fromPoints(polygon.points)
    const width = Math.max(bounds.width, 1)
    const height = Math.max(bounds.height, 1)
    const scale = SPECIAL_CUT_PREVIEW_TARGET / Math.max(width, height)
    const scaledWidth = height * scale
    const scaledHeight = width * scale
    const svgWidth = scaledWidth + SPECIAL_CUT_PREVIEW_PADDING * 2
    const svgHeight = scaledHeight + SPECIAL_CUT_PREVIEW_PADDING * 2

    const pointsAttribute = polygon.points
      .map(point => {
        const x = (point[1] - bounds.min[1]) * scale + SPECIAL_CUT_PREVIEW_PADDING
        const y = svgHeight - ((point[0] - bounds.min[0]) * scale + SPECIAL_CUT_PREVIEW_PADDING)
        return `${x.toFixed(2)},${y.toFixed(2)}`
      })
      .join(' ')

    return {
      svgWidth,
      svgHeight,
      pointsAttribute,
      rectWidth: scaledWidth,
      rectHeight: scaledHeight
    }
  }, [polygon])

  return (
    <div className="flex flex-col gap-2">
      <span>{t($ => $.partsList.straw.specialCutNote)}</span>
      <span>{t($ => $.partsList.straw.rawLengthNote)}</span>
      <svg
        width={preview.svgWidth}
        height={preview.svgHeight}
        viewBox={`0 0 ${preview.svgWidth} ${preview.svgHeight}`}
        role="img"
        aria-label={t($ => $.partsList.actions.specialCutPreview)}
      >
        <rect
          x={SPECIAL_CUT_PREVIEW_PADDING}
          y={SPECIAL_CUT_PREVIEW_PADDING}
          width={preview.rectWidth}
          height={preview.rectHeight}
          fill="none"
          stroke="var(--color-gray-1000)"
          strokeDasharray="3 1"
          strokeWidth="1"
        />
        <polygon
          points={preview.pointsAttribute}
          stroke="var(--color-primary)"
          strokeWidth="2"
          fill="var(--color-primary)"
          fillOpacity="0.2"
          strokeLinejoin="miter"
        />
      </svg>
      <span>{t($ => $.partsList.straw.sawButtonHint)}</span>
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
  formatters: Formatters
}

function MaterialGroupCard({ material, group, onBackToTop, onViewInPlan, formatters }: MaterialGroupCardProps) {
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
          <DimensionalPartsTable
            parts={group.parts}
            material={material}
            onViewInPlan={onViewInPlan}
            formatters={formatters}
          />
        )}
        {material.type === 'sheet' && (
          <SheetPartsTable
            parts={group.parts}
            material={material}
            onViewInPlan={onViewInPlan}
            formatters={formatters}
          />
        )}
        {material.type === 'volume' && (
          <VolumePartsTable
            parts={group.parts}
            material={material}
            onViewInPlan={onViewInPlan}
            formatters={formatters}
          />
        )}
        {material.type === 'generic' && <GenericPartsTable parts={group.parts} onViewInPlan={onViewInPlan} />}
        {material.type === 'strawbale' && (
          <StrawbalePartsTable parts={group.parts} material={material} formatters={formatters} />
        )}
      </CardContent>
    </Card>
  )
}

function DimensionalPartsTable({
  parts,
  material,
  onViewInPlan,
  formatters
}: {
  parts: MaterialPartItem[]
  material: DimensionalMaterial
  onViewInPlan?: (partId: PartId) => void
  formatters: Formatters
}) {
  const { t } = useTranslation('construction')
  const formatWeight = (weight: number | undefined): string => {
    if (weight === undefined) return '—'
    return formatters.formatWeight(weight)
  }
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
            {t($ => $.partsList.tableHeaders.length)}
          </Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="8em" className="text-end">
            {t($ => $.partsList.tableHeaders.totalLength)}
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
        {parts.map(part => {
          const partWeight = calculateWeight(part.totalVolume, material)
          const severity = getIssueSeverity(part)
          return (
            <Table.Row key={part.partId} className={severity === 'error' ? 'bg-red-100 hover:bg-red-200' : undefined}>
              <Table.RowHeaderCell className="text-center">
                <span className="font-medium">{part.label}</span>
              </Table.RowHeaderCell>
              <Table.Cell>{part.type}</Table.Cell>
              <Table.Cell>
                <div className="flex items-center gap-2">
                  <span>{part.description}</span>
                  {part.sideFaces?.length && part.sideFaces[0].polygon.outer.points.length >= 3 && (
                    <>
                      <Tooltip
                        key="special-cut"
                        content={<SpecialCutTooltip polygon={part.sideFaces[0].polygon.outer} />}
                      >
                        <ExclamationTriangleIcon aria-hidden className="text-orange-500" />
                      </Tooltip>
                      <PartCutModal
                        trigger={
                          <Button size="icon" variant="outline" className="rounded-full">
                            <SawIcon />
                          </Button>
                        }
                        polygon={part.sideFaces[0].polygon}
                      />
                    </>
                  )}
                </div>
              </Table.Cell>
              <Table.Cell className="text-center">{part.quantity}</Table.Cell>
              <Table.Cell className="text-end">
                <div className="flex items-center justify-end gap-2 text-end">
                  {part.issue === 'LengthExceedsAvailable' && material.lengths.length > 0 && (
                    <Tooltip
                      key="length-exceeds-available"
                      content={
                        part.requiresSinglePiece
                          ? t($ => $.partsList.issues.lengthExceedsSingle)
                          : t($ => $.partsList.issues.lengthExceedsMultiple)
                      }
                    >
                      <ExclamationTriangleIcon
                        className={part.requiresSinglePiece ? 'text-red-600' : 'text-orange-500'}
                      />
                    </Tooltip>
                  )}
                  <span>{part.length !== undefined ? formatters.formatLengthInMeters(part.length) : '—'}</span>
                </div>
              </Table.Cell>
              <Table.Cell className="text-end">
                {part.totalLength !== undefined ? formatters.formatLengthInMeters(part.totalLength) : '—'}
              </Table.Cell>
              <Table.Cell className="text-end">{formatters.formatVolume(part.totalVolume)}</Table.Cell>
              <Table.Cell className="text-end">{formatWeight(partWeight)}</Table.Cell>
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
                    <EyeOpenIcon />
                  </Button>
                )}
              </Table.Cell>
            </Table.Row>
          )
        })}
      </Table.Body>
    </Table.Root>
  )
}

function SheetPartsTable({
  parts,
  material,
  onViewInPlan,
  formatters
}: {
  parts: MaterialPartItem[]
  material: SheetMaterial
  onViewInPlan?: (partId: PartId) => void
  formatters: Formatters
}) {
  const { t } = useTranslation('construction')
  const formatWeight = (weight: number | undefined): string => {
    if (weight === undefined) return '—'
    return formatters.formatWeight(weight)
  }
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
        {parts.map(part => {
          const partWeight = calculateWeight(part.totalVolume, material)
          const severity = getIssueSeverity(part)
          return (
            <Table.Row key={part.partId} className={severity === 'error' ? 'bg-red-100 hover:bg-red-200' : undefined}>
              <Table.RowHeaderCell className="text-center">
                <span className="font-medium">{part.label}</span>
              </Table.RowHeaderCell>
              <Table.Cell>{part.type}</Table.Cell>
              <Table.Cell>
                <div className="flex items-center gap-2">
                  <span>{part.description}</span>
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
                      <ExclamationTriangleIcon className="text-red-600" />
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
                      <ExclamationTriangleIcon
                        aria-hidden
                        className={part.requiresSinglePiece ? 'text-red-600' : 'text-orange-500'}
                      />
                    </Tooltip>
                  )}
                  <span>
                    {isZeroVec3(part.size) ? '' : formatSheetDimensions(part.size, part.thickness, formatters)}
                  </span>
                </div>
              </Table.Cell>
              <Table.Cell className="text-center">{part.quantity}</Table.Cell>
              <Table.Cell className="text-end">
                {part.area !== undefined ? formatters.formatArea(part.area) : '—'}
              </Table.Cell>
              <Table.Cell className="text-end">
                {part.totalArea !== undefined ? formatters.formatArea(part.totalArea) : '—'}
              </Table.Cell>
              <Table.Cell className="text-end">{formatters.formatVolume(part.totalVolume)}</Table.Cell>
              <Table.Cell className="text-end">{formatWeight(partWeight)}</Table.Cell>
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
                    <EyeOpenIcon />
                  </Button>
                )}
              </Table.Cell>
            </Table.Row>
          )
        })}
      </Table.Body>
    </Table.Root>
  )
}

function VolumePartsTable({
  parts,
  material,
  onViewInPlan,
  formatters
}: {
  parts: MaterialPartItem[]
  material: VolumeMaterial
  onViewInPlan?: (partId: PartId) => void
  formatters: Formatters
}) {
  const { t } = useTranslation('construction')
  const formatWeight = (weight: number | undefined): string => {
    if (weight === undefined) return '—'
    return formatters.formatWeight(weight)
  }
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
        {parts.map(part => {
          const partWeight = calculateWeight(part.totalVolume, material)
          const severity = getIssueSeverity(part)
          return (
            <Table.Row key={part.partId} className={severity === 'error' ? 'bg-red-100 hover:bg-red-200' : undefined}>
              <Table.RowHeaderCell className="text-center">
                <span className="font-medium">{part.label}</span>
              </Table.RowHeaderCell>
              <Table.Cell>{part.type}</Table.Cell>
              <Table.Cell>{part.description}</Table.Cell>
              <Table.Cell className="text-center">{part.quantity}</Table.Cell>
              <Table.Cell className="text-end">
                {part.thickness !== undefined ? formatters.formatLength(part.thickness) : '—'}
              </Table.Cell>
              <Table.Cell className="text-end">
                {part.totalArea !== undefined ? formatters.formatArea(part.totalArea) : '—'}
              </Table.Cell>
              <Table.Cell className="text-end">{formatters.formatVolume(part.totalVolume)}</Table.Cell>
              <Table.Cell className="text-end">{formatWeight(partWeight)}</Table.Cell>
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
                    <EyeOpenIcon />
                  </Button>
                )}
              </Table.Cell>
            </Table.Row>
          )
        })}
      </Table.Body>
    </Table.Root>
  )
}

function GenericPartsTable({
  parts,
  onViewInPlan
}: {
  parts: MaterialPartItem[]
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
          <Table.ColumnHeaderCell width="3em" className="text-center">
            {t($ => $.partsList.tableHeaders.view)}
          </Table.ColumnHeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {parts.map(part => (
          <Table.Row key={part.partId}>
            <Table.RowHeaderCell className="text-center">
              <span className="font-medium">{part.label}</span>
            </Table.RowHeaderCell>
            <Table.Cell>{part.type}</Table.Cell>
            <Table.Cell>{part.description}</Table.Cell>
            <Table.Cell className="text-center">{part.quantity}</Table.Cell>
            <Table.Cell className="text-center">
              {canHighlightPart(part.partId) && onViewInPlan && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    onViewInPlan(part.partId)
                  }}
                  title={t($ => $.partsList.actions.viewInPlan)}
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

function StrawbalePartsTable({
  parts,
  material,
  formatters
}: {
  parts: MaterialPartItem[]
  material: StrawbaleMaterial
  formatters: Formatters
}) {
  const { t } = useTranslation('construction')
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

  interface StrawTableRow {
    key: StrawCategory | 'remaining'
    label: string
    volume: number
    maxQuantity: number
    minQuantity: number
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
                {formatters.formatVolume(row.volume)}
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
            <span className="font-medium">{formatters.formatVolume(summary.totalVolume)}</span>
          </Table.Cell>
        </Table.Row>
      </Table.Footer>
    </Table.Root>
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
                    formatters={formatters}
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
