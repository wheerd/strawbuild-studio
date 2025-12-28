import { ExclamationTriangleIcon, EyeOpenIcon, Pencil1Icon, PinBottomIcon, PinTopIcon } from '@radix-ui/react-icons'
import { Badge, Card, Flex, Heading, IconButton, Table, Text, Tooltip } from '@radix-ui/themes'
import React, { useCallback, useMemo, useRef } from 'react'

import { PartCutModal } from '@/construction/components/parts/PartCutModal'
import { SheetPartModal } from '@/construction/components/parts/SheetPartModal'
import { useConfigurationModal } from '@/construction/config/context/ConfigurationModalContext'
import { getMaterialTypeIcon, getMaterialTypeName } from '@/construction/materials/components/MaterialSelect'
import type {
  DimensionalMaterial,
  Material,
  MaterialType,
  SheetMaterial,
  StrawbaleMaterial,
  VolumeMaterial
} from '@/construction/materials/material'
import { useMaterialsMap } from '@/construction/materials/store'
import type { MaterialPartItem, MaterialParts, MaterialPartsList, PartId } from '@/construction/parts'
import { SawIcon } from '@/shared/components/Icons'
import { Bounds2D, type Polygon2D, type Vec3, type Volume, isZeroVec3 } from '@/shared/geometry'
import i18n from '@/shared/i18n/config'
import * as i18nFormatters from '@/shared/i18n/formatters'

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
const STRAW_CATEGORY_LABELS: Record<StrawCategory, string> = {
  full: 'Full bales',
  partial: 'Partial bales',
  flakes: 'Flakes',
  stuffed: 'Stuffed fill'
}

// Helper functions that use locale-aware formatting
// These use the current i18n locale to ensure consistency throughout the component
const getLocale = () => i18n.language || 'en'

const formatLength = (mm: number) => i18nFormatters.formatLength(mm, getLocale())
const formatLengthInMeters = (mm: number) => i18nFormatters.formatLengthInMeters(mm, getLocale())
const formatArea = (mm2: number) => i18nFormatters.formatArea(mm2, getLocale())
const formatVolume = (mm3: number) => i18nFormatters.formatVolume(mm3, getLocale())

const formatCrossSection = ([first, second]: [number, number]) =>
  `${formatLengthInMeters(first)} × ${formatLengthInMeters(second)}`

const formatDimensions = (size: Vec3) =>
  `${formatLengthInMeters(size[0])} × ${formatLengthInMeters(size[1])} × ${formatLengthInMeters(size[2])}`

const formatSheetDimensions = (size: Vec3, thickness?: number) => {
  if (thickness === undefined) {
    return formatDimensions(size)
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
    return `${formatLengthInMeters(dimensions[0])} × ${formatLengthInMeters(dimensions[1])}`
  }

  // Fallback to full 3D format if something unexpected happened
  return formatDimensions(size)
}

const formatWeight = (weight: number | undefined): string => {
  if (weight === undefined) return '—'
  return i18nFormatters.formatWeight(weight, getLocale())
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

const UNKNOWN_CROSS_SECTION_LABEL = 'Other cross sections'
const UNKNOWN_THICKNESS_LABEL = 'Other thicknesses'
const UNKNOWN_CROSS_SECTION_MESSAGE = 'Cross section does not match available options for this material'
const UNKNOWN_THICKNESS_MESSAGE = 'Thickness does not match available options for this material'

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

const createMaterialGroups = (material: Material, materialParts: MaterialParts): MaterialGroup[] => {
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
        label: 'Strawbales',
        hasIssue: false,
        material,
        parts
      })
    ]
  }

  return [
    createGroup({
      key: `${material.id}-all`,
      label: 'All parts',
      hasIssue: false,
      material,
      parts
    })
  ]
}

const groupDimensionalParts = (parts: MaterialPartItem[], material: DimensionalMaterial): MaterialGroup[] => {
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
      ? formatCrossSection([displayCrossSection.smallerLength, displayCrossSection.biggerLength])
      : UNKNOWN_CROSS_SECTION_LABEL
    const sortValue = displayCrossSection
      ? displayCrossSection.smallerLength * displayCrossSection.biggerLength
      : Number.MAX_SAFE_INTEGER

    const isKnown = material.crossSections.some(
      cs =>
        cs.smallerLength === displayCrossSection?.smallerLength && cs.biggerLength === displayCrossSection?.biggerLength
    )
    const badgeColor: BadgeColor = displayCrossSection != null ? (isKnown ? 'green' : 'red') : 'gray'

    const entry = groups.get(key)
    if (entry) {
      entry.parts.push(part)
      continue
    }

    groups.set(key, {
      label,
      badgeLabel: label,
      parts: [part],
      sortValue,
      badgeColor,
      hasIssue: displayCrossSection !== undefined && !isKnown,
      issueMessage: isKnown ? undefined : UNKNOWN_CROSS_SECTION_MESSAGE
    })
  }

  return Array.from(groups.entries())
    .sort((a, b) => a[1].sortValue - b[1].sortValue || a[0].localeCompare(b[0]))
    .map(([key, entry]) =>
      createGroup({
        key,
        label: entry.label,
        badgeLabel: entry.badgeLabel,
        badgeColor: entry.badgeColor,
        hasIssue: entry.hasIssue,
        issueMessage: entry.issueMessage,
        material,
        parts: entry.parts
      })
    )
}

const groupSheetParts = (parts: MaterialPartItem[], material: SheetMaterial): MaterialGroup[] => {
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
    const key = thickness != null ? `sheet:${thickness}` : 'sheet:other'
    const label = thickness != null ? formatLength(thickness) : UNKNOWN_THICKNESS_LABEL
    const sortValue = thickness ?? Number.MAX_SAFE_INTEGER
    const isKnown = thickness != null && material.thicknesses.includes(thickness)
    const badgeColor: BadgeColor = thickness != null ? (isKnown ? 'green' : 'red') : 'gray'

    const entry = groups.get(key)
    if (entry) {
      entry.parts.push(part)
      continue
    }

    groups.set(key, {
      label,
      badgeLabel: label,
      parts: [part],
      sortValue,
      badgeColor,
      hasIssue: thickness != null && !isKnown,
      issueMessage: isKnown ? undefined : UNKNOWN_THICKNESS_MESSAGE
    })
  }

  return Array.from(groups.entries())
    .sort((a, b) => a[1].sortValue - b[1].sortValue || a[0].localeCompare(b[0]))
    .map(([key, entry]) =>
      createGroup({
        key,
        label: entry.label,
        badgeLabel: entry.badgeLabel,
        badgeColor: entry.badgeColor,
        hasIssue: entry.hasIssue,
        issueMessage: entry.issueMessage,
        material,
        parts: entry.parts
      })
    )
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
  const Icon = getMaterialTypeIcon(material.type)
  if (!Icon) return null
  const iconSize = Math.max(size - 6, 8)
  return (
    <div
      title={getMaterialTypeName(material.type)}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: material.color,
        borderRadius: '4px',
        border: '1px solid var(--gray-7)',
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
    <Flex direction="column" gap="2">
      <Text>This part requires a special cut</Text>
      <Text>The given length is the raw length</Text>
      <svg
        width={preview.svgWidth}
        height={preview.svgHeight}
        viewBox={`0 0 ${preview.svgWidth} ${preview.svgHeight}`}
        role="img"
        aria-label="Special cut polygon preview"
      >
        <rect
          x={SPECIAL_CUT_PREVIEW_PADDING}
          y={SPECIAL_CUT_PREVIEW_PADDING}
          width={preview.rectWidth}
          height={preview.rectHeight}
          fill="none"
          stroke="var(--gray-10)"
          strokeDasharray="3 1"
          strokeWidth="1"
        />
        <polygon
          points={preview.pointsAttribute}
          stroke="var(--accent-9)"
          strokeWidth="2"
          fill="var(--accent-9)"
          fillOpacity="0.2"
          strokeLinejoin="miter"
        />
      </svg>
      <Text>Click the "saw" button to see more detailed measurements</Text>
    </Flex>
  )
}

function MaterialSummaryRow({
  material,
  metrics,
  onNavigate
}: {
  material: Material
  metrics: RowMetrics & { partCount: number }
  onNavigate: () => void
}) {
  return (
    <Table.Row>
      <Table.RowHeaderCell justify="center">
        <MaterialTypeIndicator material={material} />
      </Table.RowHeaderCell>
      <Table.RowHeaderCell>
        <Flex align="center" gap="2" justify="between">
          <Text weight="medium">{material.name}</Text>
          <IconButton title="Jump to details" size="1" variant="ghost" onClick={onNavigate}>
            <PinBottomIcon />
          </IconButton>
        </Flex>
      </Table.RowHeaderCell>
      <Table.Cell justify="center">{metrics.totalQuantity}</Table.Cell>
      <Table.Cell justify="center">{metrics.partCount}</Table.Cell>
      <Table.Cell justify="end">
        {metrics.totalLength !== undefined ? formatLengthInMeters(metrics.totalLength) : '—'}
      </Table.Cell>
      <Table.Cell justify="end">{metrics.totalArea !== undefined ? formatArea(metrics.totalArea) : '—'}</Table.Cell>
      <Table.Cell justify="end">{formatVolume(metrics.totalVolume)}</Table.Cell>
      <Table.Cell justify="end">{formatWeight(metrics.totalWeight)}</Table.Cell>
    </Table.Row>
  )
}

function MaterialGroupSummaryRow({ group, onNavigate }: { group: MaterialGroup; onNavigate: () => void }) {
  const { metrics } = group
  return (
    <Table.Row>
      <Table.Cell width="6em" justify="center">
        <Text color="gray">↳</Text>
      </Table.Cell>
      <Table.Cell>
        <Flex align="center" gap="2" justify="between">
          <Badge color={group.badgeColor}>{group.badgeLabel}</Badge>
          <IconButton title="Jump to details" size="1" variant="ghost" onClick={onNavigate}>
            <PinBottomIcon />
          </IconButton>
        </Flex>
      </Table.Cell>
      <Table.Cell justify="center">{metrics.totalQuantity}</Table.Cell>
      <Table.Cell justify="center">{metrics.partCount}</Table.Cell>
      <Table.Cell justify="end">
        {metrics.totalLength !== undefined ? formatLengthInMeters(metrics.totalLength) : '—'}
      </Table.Cell>
      <Table.Cell justify="end">{metrics.totalArea !== undefined ? formatArea(metrics.totalArea) : '—'}</Table.Cell>
      <Table.Cell justify="end">{formatVolume(metrics.totalVolume)}</Table.Cell>
      <Table.Cell justify="end">{formatWeight(metrics.totalWeight)}</Table.Cell>
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
  const { openConfiguration } = useConfigurationModal()

  return (
    <Card variant="surface" size="2">
      <Flex direction="column" gap="3">
        <Flex align="center" justify="between" gap="3">
          <Flex align="center" gap="3">
            <MaterialTypeIndicator material={material} size={24} />
            <Heading size="4">{material.name}</Heading>
            <IconButton
              title="Configure Material"
              variant="ghost"
              size="1"
              onClick={() => openConfiguration('materials', material.id)}
            >
              <Pencil1Icon />
            </IconButton>
            <Flex align="center" gap="2">
              {group.badgeLabel && (
                <Badge variant="soft" color={group.badgeColor ?? 'gray'}>
                  {group.badgeLabel}
                </Badge>
              )}
              {group.hasIssue && (
                <Tooltip content={group.issueMessage ?? 'This group does not match the defined material options'}>
                  <ExclamationTriangleIcon style={{ color: 'var(--red-9)' }} />
                </Tooltip>
              )}
            </Flex>
          </Flex>
          <IconButton title="Back to summary" size="1" variant="ghost" onClick={onBackToTop}>
            <PinTopIcon />
          </IconButton>
        </Flex>

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
      </Flex>
    </Card>
  )
}

function DimensionalPartsTable({
  parts,
  material,
  onViewInPlan
}: {
  parts: MaterialPartItem[]
  material: DimensionalMaterial
  onViewInPlan?: (partId: PartId) => void
}) {
  return (
    <Table.Root variant="surface" size="2" className="min-w-full">
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeaderCell width="5em" justify="center">
            Label
          </Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="10em">Type</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Description</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="5em" justify="center">
            Quantity
          </Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="5em" justify="end">
            Length
          </Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="8em" justify="end">
            Total Length
          </Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="9em" justify="end">
            Total Volume
          </Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="9em" justify="end">
            Total Weight
          </Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="3em" justify="center">
            View
          </Table.ColumnHeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {parts.map(part => {
          const partWeight = calculateWeight(part.totalVolume, material)
          const severity = getIssueSeverity(part)
          return (
            <Table.Row key={part.partId} style={{ background: severity === 'error' ? 'var(--red-3)' : undefined }}>
              <Table.RowHeaderCell justify="center">
                <Text weight="medium">{part.label}</Text>
              </Table.RowHeaderCell>
              <Table.Cell>{part.type}</Table.Cell>
              <Table.Cell>
                <Flex align="center" gap="2">
                  <Text>{part.description}</Text>
                  {part.sideFaces?.length && part.sideFaces[0].polygon.outer.points.length >= 3 && (
                    <>
                      <Tooltip
                        key="special-cut"
                        content={<SpecialCutTooltip polygon={part.sideFaces[0].polygon.outer} />}
                      >
                        <ExclamationTriangleIcon aria-hidden style={{ color: 'var(--amber-9)' }} />
                      </Tooltip>
                      <PartCutModal
                        trigger={
                          <IconButton size="1" variant="outline" radius="full">
                            <SawIcon />
                          </IconButton>
                        }
                        polygon={part.sideFaces[0].polygon}
                      />
                    </>
                  )}
                </Flex>
              </Table.Cell>
              <Table.Cell justify="center">{part.quantity}</Table.Cell>
              <Table.Cell justify="end">
                <Flex align="center" gap="2" justify="end">
                  {part.issue === 'LengthExceedsAvailable' && material.lengths.length > 0 && (
                    <Tooltip
                      key="length-exceeds-available"
                      content={
                        part.requiresSinglePiece
                          ? `Part length ${
                              part.length !== undefined ? formatLengthInMeters(part.length) : 'Unknown'
                            } exceeds material maximum available length ${formatLengthInMeters(Math.max(...material.lengths))}`
                          : `Part length ${
                              part.length !== undefined ? formatLengthInMeters(part.length) : 'Unknown'
                            } exceeds material maximum available length ${formatLengthInMeters(Math.max(...material.lengths))}. This part will require multiple pieces.`
                      }
                    >
                      <ExclamationTriangleIcon
                        style={{ color: part.requiresSinglePiece ? 'var(--red-9)' : 'var(--amber-9)' }}
                      />
                    </Tooltip>
                  )}
                  <Text>{part.length !== undefined ? formatLengthInMeters(part.length) : '—'}</Text>
                </Flex>
              </Table.Cell>
              <Table.Cell justify="end">
                {part.totalLength !== undefined ? formatLengthInMeters(part.totalLength) : '—'}
              </Table.Cell>
              <Table.Cell justify="end">{formatVolume(part.totalVolume)}</Table.Cell>
              <Table.Cell justify="end">{formatWeight(partWeight)}</Table.Cell>
              <Table.Cell justify="center">
                {canHighlightPart(part.partId) && onViewInPlan && (
                  <IconButton size="1" variant="ghost" onClick={() => onViewInPlan(part.partId)} title="View in plan">
                    <EyeOpenIcon />
                  </IconButton>
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
  onViewInPlan
}: {
  parts: MaterialPartItem[]
  material: SheetMaterial
  onViewInPlan?: (partId: PartId) => void
}) {
  return (
    <Table.Root variant="surface" size="2" className="min-w-full">
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeaderCell width="5em" justify="center">
            Label
          </Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="10em">Type</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Description</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="20em" justify="end">
            Dimensions
          </Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="5em" justify="center">
            Quantity
          </Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="5em" justify="end">
            Area
          </Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="8em" justify="end">
            Total Area
          </Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="9em" justify="end">
            Total Volume
          </Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="9em" justify="end">
            Total Weight
          </Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="3em" justify="center">
            View
          </Table.ColumnHeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {parts.map(part => {
          const partWeight = calculateWeight(part.totalVolume, material)
          const severity = getIssueSeverity(part)
          return (
            <Table.Row key={part.partId} style={{ background: severity === 'error' ? 'var(--red-3)' : undefined }}>
              <Table.RowHeaderCell justify="center">
                <Text weight="medium">{part.label}</Text>
              </Table.RowHeaderCell>
              <Table.Cell>{part.type}</Table.Cell>
              <Table.Cell>
                <Flex align="center" gap="2">
                  <Text>{part.description}</Text>
                  {part.sideFaces?.length && part.sideFaces[0].polygon.outer.points.length >= 3 && (
                    <SheetPartModal
                      trigger={
                        <IconButton size="1" variant="outline" radius="full">
                          <SawIcon />
                        </IconButton>
                      }
                      polygon={part.sideFaces[0].polygon}
                    />
                  )}
                </Flex>
              </Table.Cell>
              <Table.Cell justify="end">
                <Flex align="center" gap="2" justify="end">
                  {part.issue === 'ThicknessMismatch' && (
                    <Tooltip
                      key="thickness-missmatch"
                      content={`Dimensions ${formatDimensions(part.size)} do not match available thicknesses (${material.thicknesses
                        .map(value => formatLengthInMeters(value))
                        .join(', ')})`}
                    >
                      <ExclamationTriangleIcon style={{ color: 'var(--red-9)' }} />
                    </Tooltip>
                  )}
                  {part.issue === 'SheetSizeExceeded' && (
                    <Tooltip
                      key="sheet-size-exceeded"
                      content={
                        part.requiresSinglePiece
                          ? `Dimensions ${formatDimensions(part.size)} exceed available sheet sizes (${material.sizes
                              .map(size => formatCrossSection([size.smallerLength, size.biggerLength]))
                              .join(', ')})`
                          : `Dimensions ${formatDimensions(part.size)} exceed available sheet sizes (${material.sizes
                              .map(size => formatCrossSection([size.smallerLength, size.biggerLength]))
                              .join(', ')}). This part will require multiple sheets.`
                      }
                    >
                      <ExclamationTriangleIcon
                        aria-hidden
                        style={{ color: part.requiresSinglePiece ? 'var(--red-9)' : 'var(--amber-9)' }}
                      />
                    </Tooltip>
                  )}
                  <Text>{isZeroVec3(part.size) ? '' : formatSheetDimensions(part.size, part.thickness)}</Text>
                </Flex>
              </Table.Cell>
              <Table.Cell justify="center">{part.quantity}</Table.Cell>
              <Table.Cell justify="end"> {part.area !== undefined ? formatArea(part.area) : '—'}</Table.Cell>
              <Table.Cell justify="end">{part.totalArea !== undefined ? formatArea(part.totalArea) : '—'}</Table.Cell>
              <Table.Cell justify="end">{formatVolume(part.totalVolume)}</Table.Cell>
              <Table.Cell justify="end">{formatWeight(partWeight)}</Table.Cell>
              <Table.Cell justify="center">
                {canHighlightPart(part.partId) && onViewInPlan && (
                  <IconButton size="1" variant="ghost" onClick={() => onViewInPlan(part.partId)} title="View in plan">
                    <EyeOpenIcon />
                  </IconButton>
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
  onViewInPlan
}: {
  parts: MaterialPartItem[]
  material: VolumeMaterial
  onViewInPlan?: (partId: PartId) => void
}) {
  return (
    <Table.Root variant="surface" size="2" className="min-w-full">
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeaderCell width="5em" justify="center">
            Label
          </Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="10em">Type</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Description</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="5em" justify="center">
            Quantity
          </Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="5em" justify="end">
            Thickness
          </Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="8em" justify="end">
            Total Area
          </Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="9em" justify="end">
            Total Volume
          </Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="9em" justify="end">
            Total Weight
          </Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="3em" justify="center">
            View
          </Table.ColumnHeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {parts.map(part => {
          const partWeight = calculateWeight(part.totalVolume, material)
          const severity = getIssueSeverity(part)
          return (
            <Table.Row key={part.partId} style={{ background: severity === 'error' ? 'var(--red-3)' : undefined }}>
              <Table.RowHeaderCell justify="center">
                <Text weight="medium">{part.label}</Text>
              </Table.RowHeaderCell>
              <Table.Cell>{part.type}</Table.Cell>
              <Table.Cell>{part.description}</Table.Cell>
              <Table.Cell justify="center">{part.quantity}</Table.Cell>
              <Table.Cell justify="end">{part.thickness !== undefined ? formatLength(part.thickness) : '—'}</Table.Cell>
              <Table.Cell justify="end">{part.totalArea !== undefined ? formatArea(part.totalArea) : '—'}</Table.Cell>
              <Table.Cell justify="end">{formatVolume(part.totalVolume)}</Table.Cell>
              <Table.Cell justify="end">{formatWeight(partWeight)}</Table.Cell>
              <Table.Cell justify="center">
                {canHighlightPart(part.partId) && onViewInPlan && (
                  <IconButton size="1" variant="ghost" onClick={() => onViewInPlan(part.partId)} title="View in plan">
                    <EyeOpenIcon />
                  </IconButton>
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
  return (
    <Table.Root variant="surface" size="2" className="min-w-full">
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeaderCell width="5em" justify="center">
            Label
          </Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="10em">Type</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Description</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="5em" justify="center">
            Quantity
          </Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="3em" justify="center">
            View
          </Table.ColumnHeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {parts.map(part => (
          <Table.Row key={part.partId}>
            <Table.RowHeaderCell justify="center">
              <Text weight="medium">{part.label}</Text>
            </Table.RowHeaderCell>
            <Table.Cell>{part.type}</Table.Cell>
            <Table.Cell>{part.description}</Table.Cell>
            <Table.Cell justify="center">{part.quantity}</Table.Cell>
            <Table.Cell justify="center">
              {canHighlightPart(part.partId) && onViewInPlan && (
                <IconButton size="1" variant="ghost" onClick={() => onViewInPlan(part.partId)} title="View in plan">
                  <EyeOpenIcon />
                </IconButton>
              )}
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  )
}

function StrawbalePartsTable({ parts, material }: { parts: MaterialPartItem[]; material: StrawbaleMaterial }) {
  const summary = summarizeStrawbaleParts(parts, material)
  const numberFormatter = useMemo(() => new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }), [])

  interface StrawTableRow {
    key: StrawCategory | 'remaining'
    label: string
    volume: number
    maxQuantity: number
    minQuantity: number
  }

  const rows: StrawTableRow[] = STRAW_CATEGORY_ORDER.map(category => {
    const bucket = summary.buckets[category]
    const label = STRAW_CATEGORY_LABELS[category]
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
    label: 'Leftover from partial bales',
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
    <Table.Root variant="surface" size="2" className="min-w-full">
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeaderCell>Category</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="12em" justify="center">
            Bale Count
          </Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="12em" justify="end">
            Total Volume
          </Table.ColumnHeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {rows.map(row => (
          <Table.Row key={row.key}>
            <Table.RowHeaderCell>
              <Text weight="medium" color={row.key === 'remaining' ? 'gray' : undefined}>
                {row.label}
              </Text>
            </Table.RowHeaderCell>
            <Table.Cell justify="center">
              <Text color={row.key === 'remaining' ? 'gray' : undefined}>
                {formatRange(row.minQuantity, row.maxQuantity)}
              </Text>
            </Table.Cell>
            <Table.Cell justify="end">
              <Text color={row.key === 'remaining' ? 'gray' : undefined}>{formatVolume(row.volume)}</Text>
            </Table.Cell>
          </Table.Row>
        ))}
        <Table.Row>
          <Table.RowHeaderCell>
            <Text weight="medium">Total</Text>
          </Table.RowHeaderCell>
          <Table.Cell justify="center">
            <Text weight="medium">{formatRange(totalMinQuantity, totalMaxQuantity)}</Text>
          </Table.Cell>
          <Table.Cell justify="end">
            <Text weight="medium">{formatVolume(summary.totalVolume)}</Text>
          </Table.Cell>
        </Table.Row>
      </Table.Body>
    </Table.Root>
  )
}

export function ConstructionPartsList({ partsList, onViewInPlan }: ConstructionPartsListProps): React.JSX.Element {
  const materialsMap = useMaterialsMap()
  const topRef = useRef<HTMLDivElement | null>(null)
  const detailRefs = useRef<Record<string, HTMLDivElement | null>>({})

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
      .map(id => ({ id, material: materialsMap[id] }))
      .filter((item): item is { id: Material['id']; material: Material } => item.material !== undefined)
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
      <Card variant="ghost" size="2">
        <Text size="2" color="gray">
          No parts available.
        </Text>
      </Card>
    )
  }

  const summaryRows = materialIds
    .map(materialId => {
      const materialParts = partsList[materialId]
      const material = materialsMap[materialId]
      if (!material) return null
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
    <Flex direction="column" gap="4">
      <Card ref={topRef} variant="surface" size="2">
        <Flex direction="column" gap="3">
          <Heading size="4">Summary</Heading>
          <Table.Root variant="surface" size="2" className="min-w-full">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell width="4em" justify="center">
                  Type
                </Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Material</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell width="10em" justify="center">
                  Total Quantity
                </Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell width="10em" justify="center">
                  Different Parts
                </Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell width="10em" justify="end">
                  Total Length
                </Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell width="10em" justify="end">
                  Total Area
                </Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell width="10em" justify="end">
                  Total Volume
                </Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell width="10em" justify="end">
                  Total Weight
                </Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {summaryRows.map(row => (
                <React.Fragment key={row.material.id}>
                  <MaterialSummaryRow
                    material={row.material}
                    metrics={row.metrics}
                    onNavigate={() => scrollToGroup(row.groups[0]?.key)}
                  />
                  {row.groups.length > 1 &&
                    row.groups.map(group => (
                      <MaterialGroupSummaryRow
                        key={group.key}
                        group={group}
                        onNavigate={() => scrollToGroup(group.key)}
                      />
                    ))}
                </React.Fragment>
              ))}
            </Table.Body>
          </Table.Root>
        </Flex>
      </Card>

      <Flex direction="column" gap="4">
        {materialIds.map(materialId => {
          const material = materialsMap[materialId]
          const materialParts = partsList[materialId]
          if (!material || !materialParts) return null
          const groups = createMaterialGroups(material, materialParts)
          if (groups.length === 0) return null
          return (
            <Flex key={materialId} direction="column" gap="4">
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
            </Flex>
          )
        })}
      </Flex>
    </Flex>
  )
}
