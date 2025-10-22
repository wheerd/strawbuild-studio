import { Badge, Card, Flex, Heading, ScrollArea, Separator, Table, Text, Tooltip } from '@radix-ui/themes'
import { vec3 } from 'gl-matrix'
import React, { useMemo } from 'react'

import type { Material } from '@/construction/materials/material'
import { useMaterialsMap } from '@/construction/materials/store'
import type { PartItem, PartsList } from '@/construction/parts'
import { formatLength } from '@/shared/utils/formatLength'

interface ConstructionPartsListProps {
  partsList: PartsList
}

type RowMetrics = {
  totalQuantity: number
  totalVolume: number
  totalLength?: number
}

const formatVolume = (volume: number): string => {
  if (volume === 0) return '0m³'
  const cubicMeters = volume / 1_000_000_000
  return `${cubicMeters.toFixed(2)}m³`
}

const formatSize = (size: vec3): string =>
  `${formatLength(size[0])} × ${formatLength(size[1])} × ${formatLength(size[2])}`

function PartIssue({ issue }: { issue?: string }) {
  if (!issue) return null
  return (
    <Tooltip content={issue}>
      <Badge color="red" variant="soft">
        Issue
      </Badge>
    </Tooltip>
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
      <Table.Cell>
        <Flex align="center" gap="2">
          <Badge color="gray" variant="soft" style={{ backgroundColor: material.color }}>
            &nbsp;
          </Badge>
          <Text weight="medium">{material.name}</Text>
        </Flex>
      </Table.Cell>
      <Table.Cell>{metrics.totalQuantity}</Table.Cell>
      <Table.Cell>{metrics.partCount}</Table.Cell>
      <Table.Cell>{metrics.totalLength !== undefined ? formatLength(metrics.totalLength) : '—'}</Table.Cell>
      <Table.Cell>{formatVolume(metrics.totalVolume)}</Table.Cell>
    </Table.Row>
  )
}

function PartsTable({ material, parts }: { material: Material; parts: PartItem[] }) {
  return (
    <Card variant="surface" size="2">
      <Flex direction="column" gap="3">
        <Flex align="center" justify="between">
          <Heading size="4">{material.name}</Heading>
          <Flex align="center" gap="2">
            <Badge variant="soft" style={{ backgroundColor: material.color }}>
              &nbsp;
            </Badge>
            <Text size="2" color="gray">
              {parts.length} part{parts.length === 1 ? '' : 's'}
            </Text>
          </Flex>
        </Flex>

        <ScrollArea type="auto" scrollbars="vertical" style={{ maxHeight: '320px' }}>
          <Table.Root variant="surface" size="2" className="min-w-full">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>Label</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Type</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Dimensions</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Length</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Quantity</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Total Length</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Total Volume</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Elements</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {parts.map(part => (
                <Table.Row key={part.partId}>
                  <Table.Cell>
                    <Text weight="medium">{part.label}</Text>
                  </Table.Cell>
                  <Table.Cell>{part.type}</Table.Cell>
                  <Table.Cell>{formatSize(part.size)}</Table.Cell>
                  <Table.Cell>{part.length !== undefined ? formatLength(part.length) : '—'}</Table.Cell>
                  <Table.Cell>{part.quantity}</Table.Cell>
                  <Table.Cell>{part.totalLength !== undefined ? formatLength(part.totalLength) : '—'}</Table.Cell>
                  <Table.Cell>{formatVolume(part.totalVolume)}</Table.Cell>
                  <Table.Cell>{part.elements.length}</Table.Cell>
                  <Table.Cell>
                    <PartIssue issue={part.issue} />
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </ScrollArea>
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
    <Flex direction="column" gap="4" className="h-full w-full">
      <Card variant="surface" size="2">
        <Flex direction="column" gap="3">
          <Heading size="4">Summary</Heading>
          <ScrollArea type="auto" scrollbars="vertical" style={{ maxHeight: '220px' }}>
            <Table.Root variant="surface" size="2" className="min-w-full">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeaderCell>Material</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Total Quantity</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Different Parts</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Total Length</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Total Volume</Table.ColumnHeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {summaryRows.map(row => (
                  <MaterialSummaryRow key={row.material.id} material={row.material} metrics={row.metrics} />
                ))}
              </Table.Body>
            </Table.Root>
          </ScrollArea>
        </Flex>
      </Card>

      <Separator size="4" />

      <Flex direction="column" gap="4" className="flex-1 overflow-hidden">
        <ScrollArea type="auto" scrollbars="vertical" style={{ height: '100%' }}>
          <Flex direction="column" gap="4" pr="3">
            {materialIds.map(materialId => {
              const material = materialsMap[materialId]
              const materialParts = partsList[materialId]
              if (!material || !materialParts) return null
              const parts = Object.values(materialParts.parts)
              return <PartsTable key={materialId} material={material} parts={parts} />
            })}
          </Flex>
        </ScrollArea>
      </Flex>
    </Flex>
  )
}
