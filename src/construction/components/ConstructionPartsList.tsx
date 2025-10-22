import { ExclamationTriangleIcon } from '@radix-ui/react-icons'
import { Badge, Card, Flex, Heading, Table, Text, Tooltip } from '@radix-ui/themes'
import type { vec3 } from 'gl-matrix'
import React, { useMemo } from 'react'

import { getMaterialTypeIcon, getMaterialTypeName } from '@/construction/materials/components/MaterialSelect'
import type { Material } from '@/construction/materials/material'
import { useMaterialsMap } from '@/construction/materials/store'
import type { PartItem, PartsList } from '@/construction/parts'
import type { Length } from '@/shared/geometry'

interface ConstructionPartsListProps {
  partsList: PartsList
}

type RowMetrics = {
  totalQuantity: number
  totalVolume: number
  totalLength?: number
}

const formatLengthInMeters = (length: Length): string => {
  return `${(length / 1000).toFixed(3)}m`
}

const formatVolume = (volume: number): string => {
  if (volume === 0) return '0m³'
  const cubicMeters = volume / 1_000_000_000
  return `${cubicMeters.toFixed(2)}m³`
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

function MaterialSummaryRow({
  material,
  metrics
}: {
  material: Material
  metrics: RowMetrics & { partCount: number }
}) {
  return (
    <Table.Row>
      <Table.RowHeaderCell width="48px" justify="center">
        <Flex justify="center">
          <MaterialTypeIndicator material={material} />
        </Flex>
      </Table.RowHeaderCell>
      <Table.RowHeaderCell>
        <Text weight="medium">{material.name}</Text>
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
        {formatVolume(metrics.totalVolume)}
      </Table.Cell>
    </Table.Row>
  )
}

function PartsTable({ material, parts }: { material: Material; parts: PartItem[] }) {
  const crossSection =
    material.type === 'dimensional'
      ? `${formatLengthInMeters(material.width)} × ${formatLengthInMeters(material.thickness)}`
      : null

  return (
    <Card variant="surface" size="2">
      <Flex direction="column" gap="3">
        <Flex align="center" gap="3">
          <MaterialTypeIndicator material={material} size={24} />
          <Heading size="4">{material.name}</Heading>
          {crossSection ? (
            <Badge variant="soft" color="gray">
              {crossSection}
            </Badge>
          ) : null}
        </Flex>

        <Table.Root variant="surface" size="2" className="min-w-full">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell width="5em" justify="center">
                Label
              </Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Type</Table.ColumnHeaderCell>
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
                  <Table.Cell>
                    <Flex align="center" gap="2">
                      <Text>{part.type}</Text>

                      {part.issue === 'CrossSectionMismatch' && material.type === 'dimensional' && (
                        <Tooltip
                          key="cross-section-mismatch"
                          content={`Part dimensions ${formatDimensions(part.size)} do not match material cross section ${formatCrossSection([material.thickness, material.width])}`}
                        >
                          <ExclamationTriangleIcon style={{ color: 'var(--red-9)' }} />
                        </Tooltip>
                      )}
                    </Flex>
                  </Table.Cell>
                  <Table.Cell justify="center">{part.quantity}</Table.Cell>
                  <Table.Cell justify="end">
                    <Flex align="center" gap="2" justify="end">
                      <Text>{part.length !== undefined ? formatLengthInMeters(part.length) : '—'}</Text>
                      {part.issue === 'LengthExceedsAvailable' && material.type === 'dimensional' && (
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
      </Flex>
    </Card>
  )
}

export function ConstructionPartsList({ partsList }: ConstructionPartsListProps): React.JSX.Element {
  const materialsMap = useMaterialsMap()

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
        partCount: parts.length
      }
      return { material, metrics }
    })
    .filter((row): row is { material: Material; metrics: RowMetrics & { partCount: number } } => row !== null)

  return (
    <Flex direction="column" gap="4">
      <Card variant="surface" size="2">
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
                <Table.ColumnHeaderCell justify="end">Total Volume</Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {summaryRows.map(row => (
                <MaterialSummaryRow key={row.material.id} material={row.material} metrics={row.metrics} />
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
          return <PartsTable key={materialId} material={material} parts={parts} />
        })}
      </Flex>
    </Flex>
  )
}
