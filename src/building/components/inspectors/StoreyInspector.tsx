import { Box, Callout, Code, DataList, Flex, Heading, Text } from '@radix-ui/themes'
import React from 'react'

import type { StoreyId } from '@/building/model/ids'
import { usePerimeters, useStoreyById } from '@/building/store'
import { getPerimeterStats } from '@/construction/perimeter'
import { getLevelColor } from '@/editor/status-bar/StoreySelector'
import type { Area, Volume } from '@/shared/geometry'
import { formatLength } from '@/shared/utils/formatLength'

interface StoreyInspectorProps {
  selectedId: StoreyId
}

const MM2_PER_M2 = 1_000_000
const MM3_PER_M3 = 1_000_000_000

const formatArea = (area: Area) => `${(area / MM2_PER_M2).toFixed(2)} m²`
const formatVolume = (volume: Volume) => `${(volume / MM3_PER_M3).toFixed(2)} m³`

export function StoreyInspector({ selectedId }: StoreyInspectorProps): React.JSX.Element {
  // Get storey data from model store
  const storey = useStoreyById(selectedId)
  const perimeters = Object.values(usePerimeters()).filter(perimeter => perimeter.storeyId === selectedId)
  const perimeterStats = perimeters.map(perimeter => getPerimeterStats(perimeter))
  const combinedStats = perimeterStats.reduce(
    (acc, stats) => ({
      footprint: acc.footprint + stats.footprint,
      totalFloorArea: acc.totalFloorArea + stats.totalFloorArea,
      totalConstructionWallArea: acc.totalConstructionWallArea + stats.totalConstructionWallArea,
      totalFinishedWallArea: acc.totalFinishedWallArea + stats.totalFinishedWallArea,
      totalExteriorWallArea: acc.totalExteriorWallArea + stats.totalExteriorWallArea,
      totalWindowArea: acc.totalWindowArea + stats.totalWindowArea,
      totalDoorArea: acc.totalDoorArea + stats.totalDoorArea,
      totalVolume: acc.totalVolume + stats.totalVolume,
      storeyHeight: Math.max(acc.storeyHeight, stats.storeyHeight),
      ceilingHeight: Math.max(acc.ceilingHeight, stats.ceilingHeight)
    }),
    {
      footprint: 0,
      totalFloorArea: 0,
      totalConstructionWallArea: 0,
      totalFinishedWallArea: 0,
      totalExteriorWallArea: 0,
      totalWindowArea: 0,
      totalDoorArea: 0,
      totalVolume: 0,
      storeyHeight: 0,
      ceilingHeight: 0
    }
  )

  // If storey not found, show error
  if (!storey) {
    return (
      <Box p="2">
        <Callout.Root color="red">
          <Callout.Text>
            <Text weight="bold">Storey Not Found</Text>
            <br />
            Storey with ID {selectedId} could not be found.
          </Callout.Text>
        </Callout.Root>
      </Box>
    )
  }

  if (perimeterStats.length === 0) {
    return (
      <Box p="2">
        <Callout.Root color="amber">
          <Callout.Text>No perimeters have been added to this storey yet.</Callout.Text>
        </Callout.Root>
      </Box>
    )
  }

  return (
    <Box p="2">
      <Flex direction="column" gap="3">
        {/* Basic Information */}
        <Heading size="2">
          <Flex align="center" gap="2" as="span">
            <Code variant="ghost" size="2" weight="bold" color={getLevelColor(storey.level)}>
              L{storey.level}
            </Code>
            <Text>{storey.name}</Text>
          </Flex>
        </Heading>
        <DataList.Root size="1">
          <DataList.Item>
            <DataList.Label minWidth="100px">Footprint</DataList.Label>
            <DataList.Value>
              <Flex justify="end" width="100%">
                {formatArea(combinedStats.footprint)}
              </Flex>
            </DataList.Value>
          </DataList.Item>
          <DataList.Item>
            <DataList.Label>Usable Floor Area (GFA)</DataList.Label>
            <DataList.Value>
              <Flex justify="end" width="100%">
                {formatArea(combinedStats.totalFloorArea)}
              </Flex>
            </DataList.Value>
          </DataList.Item>
          <DataList.Item>
            <DataList.Label>Construction Wall Area</DataList.Label>
            <DataList.Value>
              <Flex justify="end" width="100%">
                {formatArea(combinedStats.totalConstructionWallArea)}
              </Flex>
            </DataList.Value>
          </DataList.Item>
          <DataList.Item>
            <DataList.Label>Finished Wall Area</DataList.Label>
            <DataList.Value>
              <Flex justify="end" width="100%">
                {formatArea(combinedStats.totalFinishedWallArea)}
              </Flex>
            </DataList.Value>
          </DataList.Item>
          <DataList.Item>
            <DataList.Label>Exterior Wall Area</DataList.Label>
            <DataList.Value>
              <Flex justify="end" width="100%">
                {formatArea(combinedStats.totalExteriorWallArea)}
              </Flex>
            </DataList.Value>
          </DataList.Item>
          <DataList.Item>
            <DataList.Label>Window Area</DataList.Label>
            <DataList.Value>
              <Flex justify="end" width="100%">
                {formatArea(combinedStats.totalWindowArea)}
              </Flex>
            </DataList.Value>
          </DataList.Item>
          <DataList.Item>
            <DataList.Label>Wall-to-window ratio (WWR)</DataList.Label>
            <DataList.Value>
              <Flex justify="end" width="100%">
                {((combinedStats.totalWindowArea / combinedStats.totalFinishedWallArea) * 100).toFixed(1)}%
              </Flex>
            </DataList.Value>
          </DataList.Item>
          <DataList.Item>
            <DataList.Label>Door Area</DataList.Label>
            <DataList.Value>
              <Flex justify="end" width="100%">
                {formatArea(combinedStats.totalDoorArea)}
              </Flex>
            </DataList.Value>
          </DataList.Item>
          <DataList.Item>
            <DataList.Label>Total Volume</DataList.Label>
            <DataList.Value>
              <Flex justify="end" width="100%">
                {formatVolume(combinedStats.totalVolume)}
              </Flex>
            </DataList.Value>
          </DataList.Item>
          <DataList.Item>
            <DataList.Label>Surface-area-to-volume ratio (SA:V)</DataList.Label>
            <DataList.Value>
              <Flex justify="end" width="100%">
                {((combinedStats.totalExteriorWallArea / combinedStats.totalVolume) * 1000).toFixed(2)}
              </Flex>
            </DataList.Value>
          </DataList.Item>

          <DataList.Item>
            <DataList.Label>Storey Height</DataList.Label>
            <DataList.Value>
              <Flex justify="end" width="100%">
                {formatLength(combinedStats.storeyHeight)}
              </Flex>
            </DataList.Value>
          </DataList.Item>
          <DataList.Item>
            <DataList.Label>Ceiling Height</DataList.Label>
            <DataList.Value>
              <Flex justify="end" width="100%">
                {formatLength(combinedStats.ceilingHeight)}
              </Flex>
            </DataList.Value>
          </DataList.Item>
        </DataList.Root>
      </Flex>
    </Box>
  )
}
