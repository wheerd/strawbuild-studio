import { useCallback, useMemo } from 'react'
import { Box, Flex, Text, Button, Heading, Callout, DataList, Separator } from '@radix-ui/themes'
import { useModelActions, usePerimeterById } from '@/model/store'
import type { PerimeterCornerId, PerimeterId } from '@/types/ids'
import { useConfigStore } from '@/config/store'

interface PerimeterCornerInspectorProps {
  perimeterId: PerimeterId
  cornerId: PerimeterCornerId
}

export function PerimeterCornerInspector({ perimeterId, cornerId }: PerimeterCornerInspectorProps): React.JSX.Element {
  // Get model store functions - use specific selectors for stable references
  const { updatePerimeterCornerConstructedByWall: updateCornerConstructedByWall } = useModelActions()
  const configStore = useConfigStore()

  // Get perimeter from store
  const outerWall = usePerimeterById(perimeterId)

  // Use useMemo to find corner and its index within the wall object
  const cornerIndex = useMemo(() => {
    return outerWall?.corners.findIndex(c => c.id === cornerId) ?? -1
  }, [outerWall, cornerId])

  const corner = useMemo(() => {
    return cornerIndex !== -1 ? outerWall?.corners[cornerIndex] : null
  }, [outerWall, cornerIndex])

  // If corner not found, show error
  if (!corner || !outerWall || cornerIndex === -1) {
    return (
      <Box p="2">
        <Callout.Root color="red">
          <Callout.Text>
            <Text weight="bold">Corner Not Found</Text>
            <br />
            Corner with ID {cornerId} could not be found.
          </Callout.Text>
        </Callout.Root>
      </Box>
    )
  }

  // Get adjacent walls
  const { previousWall, nextWall } = useMemo(() => {
    const prevIndex = (cornerIndex - 1 + outerWall.walls.length) % outerWall.walls.length
    const nextIndex = cornerIndex % outerWall.walls.length

    return {
      previousWall: outerWall.walls[prevIndex],
      nextWall: outerWall.walls[nextIndex]
    }
  }, [outerWall.walls, cornerIndex])

  // Event handlers with stable references
  const handleToggleConstructedByWall = useCallback(() => {
    const newConstructedByWall = corner.constuctedByWall === 'previous' ? 'next' : 'previous'
    updateCornerConstructedByWall(perimeterId, cornerId, newConstructedByWall)
  }, [updateCornerConstructedByWall, perimeterId, cornerId, corner.constuctedByWall])

  // Calculate angle between walls (simplified)
  const cornerAngle = useMemo(() => {
    if (!previousWall || !nextWall) return null

    // Calculate angle between the two walls
    const prevDir = previousWall.direction
    const nextDir = nextWall.direction

    // Dot product to get angle
    const dot = prevDir[0] * nextDir[0] + prevDir[1] * nextDir[1]
    const angle = Math.acos(Math.max(-1, Math.min(1, dot))) * (180 / Math.PI)

    return angle
  }, [previousWall, nextWall])

  // Check if there are construction notes to display
  const hasConstructionNotes = useMemo(() => {
    if (!previousWall || !nextWall) return false

    const prevMethod = configStore.perimeterConstructionMethods.get(previousWall.constructionMethodId)
    const nextMethod = configStore.perimeterConstructionMethods.get(nextWall.constructionMethodId)
    const hasMixedConstruction = prevMethod?.config.type !== nextMethod?.config.type
    const hasThicknessDifference = Math.abs(previousWall.thickness - nextWall.thickness) > 5

    return hasMixedConstruction || hasThicknessDifference
  }, [previousWall, nextWall, configStore])

  return (
    <Flex direction="column" gap="4">
      {/* Geometry Information */}
      <Flex direction="column" gap="2">
        <Heading size="2">Geometry</Heading>
        {cornerAngle && (
          <DataList.Root>
            <DataList.Item>
              <DataList.Label minWidth="88px">Interior Angle</DataList.Label>
              <DataList.Value>{cornerAngle.toFixed(1)}°</DataList.Value>
            </DataList.Item>
          </DataList.Root>
        )}
      </Flex>

      <Separator size="4" />

      {/* Actions */}
      <Flex direction="column" gap="2">
        <Button size="1" onClick={handleToggleConstructedByWall}>
          Switch main wall
        </Button>
      </Flex>

      <Separator size="4" />

      {/* Construction Notes */}
      {hasConstructionNotes && (
        <Flex direction="column" gap="2">
          <Heading size="2">Construction Notes</Heading>

          {(() => {
            const prevMethod = configStore.perimeterConstructionMethods.get(previousWall.constructionMethodId)
            const nextMethod = configStore.perimeterConstructionMethods.get(nextWall.constructionMethodId)
            return prevMethod?.config.type !== nextMethod?.config.type
          })() && (
            <Callout.Root color="amber">
              <Callout.Text>
                <Text weight="bold">Mixed Construction:</Text>
                <br />
                Adjacent walls use different construction types. Special attention may be needed at this corner.
              </Callout.Text>
            </Callout.Root>
          )}

          {Math.abs(previousWall.thickness - nextWall.thickness) > 5 && (
            <Callout.Root color="amber">
              <Callout.Text>
                <Text weight="bold">Thickness Difference:</Text>
                <br />
                Adjacent walls have different thicknesses ({Math.abs(previousWall.thickness - nextWall.thickness)}mm
                difference).
              </Callout.Text>
            </Callout.Root>
          )}
        </Flex>
      )}
    </Flex>
  )
}
