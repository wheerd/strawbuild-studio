import { Box, Callout, Code, Flex, Grid, Heading, Text } from '@radix-ui/themes'
import React from 'react'
import { useTranslation } from 'react-i18next'

import { useStoreyName } from '@/building/hooks/useStoreyName'
import type { StoreyId } from '@/building/model/ids'
import { usePerimeters, useStoreyById } from '@/building/store'
import { getPerimeterStats } from '@/construction/perimeters/perimeter'
import { getLevelColor } from '@/editor/status-bar/StoreySelector'
import { useFormatters } from '@/shared/i18n/useFormatters'

interface StoreyInspectorProps {
  selectedId: StoreyId
}

export function StoreyInspector({ selectedId }: StoreyInspectorProps): React.JSX.Element {
  const { t } = useTranslation('inspector')
  // Get storey data from model store
  const storey = useStoreyById(selectedId)
  const storeyName = useStoreyName(storey)
  const perimeters = Object.values(usePerimeters()).filter(perimeter => perimeter.storeyId === selectedId)
  const perimeterStats = perimeters.map(perimeter => getPerimeterStats(perimeter))
  const { formatArea, formatLength, formatVolume, formatPercentage, formatNumber } = useFormatters()
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
            <Text weight="bold">{t($ => $.storey.notFound)}</Text>
            <br />
            {t($ => $.storey.notFoundMessage, {
              id: selectedId
            })}
          </Callout.Text>
        </Callout.Root>
      </Box>
    )
  }

  if (perimeterStats.length === 0) {
    return (
      <Box p="2">
        <Callout.Root color="amber">
          <Callout.Text>{t($ => $.storey.noPerimeters)}</Callout.Text>
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
            <Text>{storeyName}</Text>
          </Flex>
        </Heading>
        <Grid columns="auto 1fr" gapY="2" gapX="1">
          <Text size="1" weight="medium">
            {t($ => $.storey.footprint)}
          </Text>
          <Text size="1">{formatArea(combinedStats.footprint)}</Text>

          <Text size="1" weight="medium">
            {t($ => $.storey.usableFloorArea)}
          </Text>
          <Text size="1">
            <Flex justify="end" width="100%">
              {formatArea(combinedStats.totalFloorArea)}
            </Flex>
          </Text>

          <Text size="1" weight="medium">
            {t($ => $.storey.constructionWallArea)}
          </Text>
          <Text size="1">
            <Flex justify="end" width="100%">
              {formatArea(combinedStats.totalConstructionWallArea)}
            </Flex>
          </Text>

          <Text size="1" weight="medium">
            {t($ => $.storey.finishedWallArea)}
          </Text>
          <Text size="1">
            <Flex justify="end" width="100%">
              {formatArea(combinedStats.totalFinishedWallArea)}
            </Flex>
          </Text>

          <Text size="1" weight="medium">
            {t($ => $.storey.exteriorWallArea)}
          </Text>
          <Text size="1">
            <Flex justify="end" width="100%">
              {formatArea(combinedStats.totalExteriorWallArea)}
            </Flex>
          </Text>

          <Text size="1" weight="medium">
            {t($ => $.storey.windowArea)}
          </Text>
          <Text size="1">
            <Flex justify="end" width="100%">
              {formatArea(combinedStats.totalWindowArea)}
            </Flex>
          </Text>

          <Text size="1" weight="medium">
            {t($ => $.storey.wallToWindowRatio)}
          </Text>
          <Text size="1">
            <Flex justify="end" width="100%">
              {formatPercentage((combinedStats.totalWindowArea / combinedStats.totalFinishedWallArea) * 100)}
            </Flex>
          </Text>

          <Text size="1" weight="medium">
            {t($ => $.storey.doorArea)}
          </Text>
          <Text size="1">
            <Flex justify="end" width="100%">
              {formatArea(combinedStats.totalDoorArea)}
            </Flex>
          </Text>

          <Text size="1" weight="medium">
            {t($ => $.storey.totalVolume)}
          </Text>
          <Text size="1">
            <Flex justify="end" width="100%">
              {formatVolume(combinedStats.totalVolume)}
            </Flex>
          </Text>

          <Text size="1" weight="medium">
            {t($ => $.storey.surfaceAreaToVolumeRatio)}
          </Text>
          <Text size="1">
            <Flex justify="end" width="100%">
              {formatNumber((combinedStats.totalExteriorWallArea / combinedStats.totalVolume) * 1000, 2)}
            </Flex>
          </Text>

          <Text size="1" weight="medium">
            {t($ => $.storey.floorHeight)}
          </Text>
          <Text size="1">
            <Flex justify="end" width="100%">
              {formatLength(combinedStats.storeyHeight)}
            </Flex>
          </Text>

          <Text size="1" weight="medium">
            {t($ => $.storey.ceilingHeight)}
          </Text>
          <Text size="1">
            <Flex justify="end" width="100%">
              {formatLength(combinedStats.ceilingHeight)}
            </Flex>
          </Text>
        </Grid>
      </Flex>
    </Box>
  )
}
