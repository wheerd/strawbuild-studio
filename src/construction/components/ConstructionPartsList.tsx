import { ExclamationTriangleIcon, PinBottomIcon, PinTopIcon } from '@radix-ui/react-icons'
import { Badge, Card, Flex, Heading, IconButton, Table, Text, Tooltip } from '@radix-ui/themes'
import { vec3 } from 'gl-matrix'
import React, { useCallback, useMemo, useRef } from 'react'

import { getMaterialTypeIcon, getMaterialTypeName } from '@/construction/materials/components/MaterialSelect'
import type { DimensionalMaterial, Material, SheetMaterial, VolumeMaterial } from '@/construction/materials/material'
import { useMaterialsMap } from '@/construction/materials/store'
import type { MaterialPartItem, MaterialPartsList } from '@/construction/parts'
import { Bounds2D, type Polygon2D } from '@/shared/geometry'
import { formatArea, formatLengthInMeters, formatVolume } from '@/shared/utils/formatting'

interface ConstructionPartsListProps {
  partsList: MaterialPartsList
}

interface RowMetrics {
  totalQuantity: number
  totalVolume: number
  totalLength?: number
  totalArea?: number
}

const formatCrossSection = ([first, second]: [number, number]) =>
  `${formatLengthInMeters(first)} × ${formatLengthInMeters(second)}`

const formatDimensions = (size: vec3) =>
  `${formatLengthInMeters(size[0])} × ${formatLengthInMeters(size[1])} × ${formatLengthInMeters(size[2])}`

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
        flexShrink: 0
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
      <Table.RowHeaderCell width="6em" justify="center">
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
      <Table.Cell width="10em" justify="center">
        {metrics.totalQuantity}
      </Table.Cell>
      <Table.Cell width="10em" justify="center">
        {metrics.partCount}
      </Table.Cell>
      <Table.Cell width="10em" justify="end">
        {metrics.totalLength !== undefined ? formatLengthInMeters(metrics.totalLength) : '—'}
      </Table.Cell>
      <Table.Cell width="10em" justify="end">
        {metrics.totalArea !== undefined ? formatArea(metrics.totalArea) : '—'}
      </Table.Cell>
      <Table.Cell width="10em" justify="end">
        {formatVolume(metrics.totalVolume)}
      </Table.Cell>
    </Table.Row>
  )
}

interface PartsTableProps {
  material: Material
  parts: MaterialPartItem[]
  onBackToTop: () => void
}

const PartsTable = React.forwardRef<HTMLDivElement, PartsTableProps>(function PartsTable(
  { material, parts, onBackToTop },
  ref
) {
  const crossSection =
    material.type === 'dimensional'
      ? `${formatLengthInMeters(material.width)} × ${formatLengthInMeters(material.thickness)}`
      : null

  return (
    <Card ref={ref} variant="surface" size="2">
      <Flex direction="column" gap="3">
        <Flex align="center" justify="between" gap="3">
          <Flex align="center" gap="3">
            <MaterialTypeIndicator material={material} size={24} />
            <Heading size="4">{material.name}</Heading>
            {crossSection ? (
              <Badge variant="soft" color="gray">
                {crossSection}
              </Badge>
            ) : null}
          </Flex>
          <IconButton title="Back to summary" size="1" variant="ghost" onClick={onBackToTop}>
            <PinTopIcon />
          </IconButton>
        </Flex>

        {material.type === 'dimensional' && <DimensionalPartsTable parts={parts} material={material} />}
        {material.type === 'sheet' && <SheetPartsTable parts={parts} material={material} />}
        {material.type === 'volume' && <VolumePartsTable parts={parts} material={material} />}
      </Flex>
    </Card>
  )
})

function DimensionalPartsTable({ parts, material }: { parts: MaterialPartItem[]; material: DimensionalMaterial }) {
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
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {parts.map(part => {
          return (
            <Table.Row key={part.partId} style={{ background: part.issue ? 'var(--red-3)' : undefined }}>
              <Table.RowHeaderCell justify="center">
                <Text weight="medium">{part.label}</Text>
              </Table.RowHeaderCell>
              <Table.Cell>{part.type}</Table.Cell>
              <Table.Cell>
                <Flex align="center" gap="2">
                  <Text>{part.description}</Text>
                  {part.issue === 'CrossSectionMismatch' && (
                    <Tooltip
                      key="cross-section-mismatch"
                      content={`Part dimensions ${formatDimensions(part.size)} do not match material cross section ${formatCrossSection([material.thickness, material.width])}`}
                    >
                      <ExclamationTriangleIcon aria-hidden style={{ color: 'var(--red-9)' }} />
                    </Tooltip>
                  )}
                  {part.polygon && part.polygon.points.length >= 3 && (
                    <Tooltip key="special-cut" content={<SpecialCutTooltip polygon={part.polygon} />}>
                      <ExclamationTriangleIcon aria-hidden style={{ color: 'var(--amber-9)' }} />
                    </Tooltip>
                  )}
                </Flex>
              </Table.Cell>
              <Table.Cell justify="center">{part.quantity}</Table.Cell>
              <Table.Cell justify="end">
                <Flex align="center" gap="2" justify="end">
                  <Text>{part.length !== undefined ? formatLengthInMeters(part.length) : '—'}</Text>
                  {part.issue === 'LengthExceedsAvailable' && (
                    <Tooltip
                      key="length-exceeds-available"
                      content={`Part length ${
                        part.length !== undefined ? formatLengthInMeters(part.length) : 'Unknown'
                      } exceeds material maximum available length ${formatLengthInMeters(Math.max(...material.availableLengths))}`}
                    >
                      <ExclamationTriangleIcon style={{ color: 'var(--red-9)' }} />
                    </Tooltip>
                  )}
                </Flex>
              </Table.Cell>
              <Table.Cell justify="end">
                {part.totalLength !== undefined ? formatLengthInMeters(part.totalLength) : '—'}
              </Table.Cell>
              <Table.Cell justify="end">{formatVolume(part.totalVolume)}</Table.Cell>
            </Table.Row>
          )
        })}
      </Table.Body>
    </Table.Root>
  )
}

function SheetPartsTable({ parts, material }: { parts: MaterialPartItem[]; material: SheetMaterial }) {
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
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {parts.map(part => {
          return (
            <Table.Row key={part.partId} style={{ background: part.issue ? 'var(--red-3)' : undefined }}>
              <Table.RowHeaderCell justify="center">
                <Text weight="medium">{part.label}</Text>
              </Table.RowHeaderCell>
              <Table.Cell>{part.type}</Table.Cell>
              <Table.Cell>{part.description}</Table.Cell>
              <Table.Cell justify="end">
                <Flex align="center" gap="2" justify="end">
                  {part.issue === 'ThicknessMismatch' && (
                    <Tooltip
                      key="thickness-missmatch"
                      content={`Dimensions ${formatDimensions(part.size)} do not match thickness ${formatLengthInMeters(material.thickness)}`}
                    >
                      <ExclamationTriangleIcon style={{ color: 'var(--red-9)' }} />
                    </Tooltip>
                  )}
                  {part.issue === 'SheetSizeExceeded' && (
                    <Tooltip
                      key="sheet-size-exceeded"
                      content={`Dimensions ${formatDimensions(part.size)} are bigger than material size ${formatCrossSection([material.width, material.length])}`}
                    >
                      <ExclamationTriangleIcon aria-hidden style={{ color: 'var(--red-9)' }} />
                    </Tooltip>
                  )}
                  {part.polygon && part.polygon.points.length >= 3 && (
                    <Tooltip key="special-cut" content="This might have a non-regular shape">
                      <ExclamationTriangleIcon aria-hidden style={{ color: 'var(--amber-9)' }} />
                    </Tooltip>
                  )}
                  <Text>{vec3.equals(part.size, [0, 0, 0]) ? '' : formatDimensions(part.size)}</Text>
                </Flex>
              </Table.Cell>
              <Table.Cell justify="center">{part.quantity}</Table.Cell>
              <Table.Cell justify="end"> {part.area !== undefined ? formatArea(part.area) : '—'}</Table.Cell>
              <Table.Cell justify="end">{part.totalArea !== undefined ? formatArea(part.totalArea) : '—'}</Table.Cell>
              <Table.Cell justify="end">{formatVolume(part.totalVolume)}</Table.Cell>
            </Table.Row>
          )
        })}
      </Table.Body>
    </Table.Root>
  )
}

function VolumePartsTable({ parts }: { parts: MaterialPartItem[]; material: VolumeMaterial }) {
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
            Area
          </Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="8em" justify="end">
            Total Area
          </Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="9em" justify="end">
            Total Volume
          </Table.ColumnHeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {parts.map(part => {
          return (
            <Table.Row key={part.partId} style={{ background: part.issue ? 'var(--red-3)' : undefined }}>
              <Table.RowHeaderCell justify="center">
                <Text weight="medium">{part.label}</Text>
              </Table.RowHeaderCell>
              <Table.Cell>{part.type}</Table.Cell>
              <Table.Cell>{part.description}</Table.Cell>
              <Table.Cell justify="center">{part.quantity}</Table.Cell>
              <Table.Cell justify="end"> {part.area !== undefined ? formatArea(part.area) : '—'}</Table.Cell>
              <Table.Cell justify="end">{part.totalArea !== undefined ? formatArea(part.totalArea) : '—'}</Table.Cell>
              <Table.Cell justify="end">{formatVolume(part.totalVolume)}</Table.Cell>
            </Table.Row>
          )
        })}
      </Table.Body>
    </Table.Root>
  )
}

export function ConstructionPartsList({ partsList }: ConstructionPartsListProps): React.JSX.Element {
  const materialsMap = useMaterialsMap()
  const topRef = useRef<HTMLDivElement | null>(null)
  const detailRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const setDetailRef = useCallback((materialId: Material['id']) => {
    return (element: HTMLDivElement | null) => {
      detailRefs.current[materialId] = element
    }
  }, [])

  const scrollToDetail = useCallback((materialId: Material['id']) => {
    const target = detailRefs.current[materialId]
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const scrollToTop = useCallback(() => {
    if (topRef.current) {
      topRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  const materialIds = useMemo(() => Object.keys(partsList) as Material['id'][], [partsList])

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
      const parts = Object.values(materialParts.parts)
      const material = materialsMap[materialId]
      if (!material) return null
      const metrics: RowMetrics & { partCount: number } = {
        totalQuantity: materialParts.totalQuantity,
        totalVolume: materialParts.totalVolume,
        totalLength: materialParts.totalLength,
        totalArea: materialParts.totalArea,
        partCount: parts.length
      }
      return { material, metrics }
    })
    .filter((row): row is { material: Material; metrics: RowMetrics & { partCount: number } } => row !== null)

  return (
    <Flex direction="column" gap="4">
      <Card ref={topRef} variant="surface" size="2">
        <Flex direction="column" gap="3">
          <Heading size="4">Summary</Heading>
          <Table.Root variant="surface" size="2" className="min-w-full">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell justify="center">Type</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Material</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell justify="center">Total Quantity</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell justify="center">Different Parts</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell justify="end">Total Length</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell justify="end">Total Area</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell justify="end">Total Volume</Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {summaryRows.map(row => (
                <MaterialSummaryRow
                  key={row.material.id}
                  material={row.material}
                  metrics={row.metrics}
                  onNavigate={() => scrollToDetail(row.material.id)}
                />
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
          const parts = Object.values(materialParts.parts)
          return (
            <PartsTable
              key={materialId}
              ref={setDetailRef(materialId)}
              material={material}
              parts={parts}
              onBackToTop={scrollToTop}
            />
          )
        })}
      </Flex>
    </Flex>
  )
}
