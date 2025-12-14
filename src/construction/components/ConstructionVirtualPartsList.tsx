import { EyeOpenIcon } from '@radix-ui/react-icons'
import { Card, Flex, Heading, IconButton, Table, Text } from '@radix-ui/themes'
import type { vec3 } from 'gl-matrix'
import React, { useMemo } from 'react'

import type { PartId, VirtualPartsList } from '@/construction/parts'
import { formatLengthInMeters } from '@/shared/utils/formatting'

const formatDimensions = (size: vec3): string =>
  `${formatLengthInMeters(size[0])} × ${formatLengthInMeters(size[1])} × ${formatLengthInMeters(size[2])}`

// Helper to check if part can be highlighted (not auto-generated)
const canHighlightPart = (partId: PartId): boolean => !partId.startsWith('auto_')

export function ConstructionVirtualPartsList({
  partsList,
  onViewInPlan
}: {
  partsList: VirtualPartsList
  onViewInPlan?: (partId: PartId) => void
}): React.JSX.Element {
  const parts = useMemo(() => Object.values(partsList).sort((a, b) => a.label.localeCompare(b.label)), [partsList])

  if (parts.length === 0) {
    return (
      <Card variant="surface" size="2">
        <Flex justify="center">
          <Text size="3" color="gray">
            No modules
          </Text>
        </Flex>
      </Card>
    )
  }

  return (
    <Card variant="surface" size="2">
      <Flex direction="column" gap="3">
        <Heading size="4">Modules</Heading>
        <Table.Root variant="surface" size="2" className="min-w-full">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell width="5em" justify="center">
                Label
              </Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Type</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell width="20em">Dimensions</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell width="6em" justify="center">
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
                <Table.Cell>
                  <Text>{part.type}</Text>
                </Table.Cell>
                <Table.Cell>
                  <Text>{formatDimensions(part.size)}</Text>
                </Table.Cell>
                <Table.Cell justify="center">
                  <Text>{part.quantity}</Text>
                </Table.Cell>
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
      </Flex>
    </Card>
  )
}
