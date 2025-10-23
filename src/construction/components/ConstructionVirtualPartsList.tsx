import { Card, Flex, Heading, Table, Text } from '@radix-ui/themes'
import type { vec3 } from 'gl-matrix'
import React, { useMemo } from 'react'

import type { VirtualPartsList } from '@/construction/parts'

const formatLengthInMeters = (length: number): string => `${(length / 1000).toFixed(3)}m`

const formatDimensions = (size: vec3): string =>
  `${formatLengthInMeters(size[0])} × ${formatLengthInMeters(size[1])} × ${formatLengthInMeters(size[2])}`

export function ConstructionVirtualPartsList({ partsList }: { partsList: VirtualPartsList }): React.JSX.Element {
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
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Flex>
    </Card>
  )
}
