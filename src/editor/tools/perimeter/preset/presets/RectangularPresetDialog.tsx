import { Button, Dialog, Flex, Grid, Heading, SegmentedControl, Text } from '@radix-ui/themes'
import type { vec2 } from 'gl-matrix'
import { useCallback, useEffect, useState } from 'react'

import type { WallAssemblyId } from '@/building/model/ids'
import type { PerimeterReferenceSide } from '@/building/model/model'
import { RingBeamAssemblySelectWithEdit } from '@/construction/config/components/RingBeamAssemblySelectWithEdit'
import { WallAssemblySelectWithEdit } from '@/construction/config/components/WallAssemblySelectWithEdit'
import {
  useDefaultBaseRingBeamAssemblyId,
  useDefaultTopRingBeamAssemblyId,
  useDefaultWallAssemblyId
} from '@/construction/config/store'
import { MeasurementInfo } from '@/editor/components/MeasurementInfo'
import { BaseModal } from '@/shared/components/BaseModal'
import { LengthField } from '@/shared/components/LengthField'
import { Bounds2D, offsetPolygon } from '@/shared/geometry'
import { formatLength } from '@/shared/utils/formatting'

import { RectangularPreset } from './RectangularPreset'
import type { RectangularPresetConfig } from './types'

interface RectangularPresetDialogProps {
  onConfirm: (config: RectangularPresetConfig) => void
  trigger: React.ReactNode
}

/**
 * Preview component showing nested rectangles to visualize thickness
 * Shows inside dimensions (interior space) vs outside perimeter
 */
function RectangularPreview({ config }: { config: RectangularPresetConfig }) {
  const preset = new RectangularPreset()
  const referencePolygon = { points: preset.getPolygonPoints(config) }

  let derivedPolygon = referencePolygon
  try {
    const offset = offsetPolygon(
      referencePolygon,
      config.referenceSide === 'inside' ? config.thickness : -config.thickness
    )
    if (offset.points.length > 0) {
      derivedPolygon = offset
    }
  } catch (error) {
    console.warn('Failed to compute rectangular preset preview offset:', error)
  }

  const interiorPolygon = config.referenceSide === 'inside' ? referencePolygon : derivedPolygon
  const exteriorPolygon = config.referenceSide === 'inside' ? derivedPolygon : referencePolygon

  const innerBounds = Bounds2D.fromPoints(interiorPolygon.points)
  const bounds = Bounds2D.fromPoints(exteriorPolygon.points)
  const center = bounds.center
  const maxDimension = Math.max(...bounds.size)
  const scale = maxDimension > 0 ? 200 / maxDimension : 1
  const centerX = 100
  const centerY = 100

  const transformPoint = (point: vec2) => ({
    x: (point[0] - center[0]) * scale + centerX,
    y: -(point[1] - center[1]) * scale + centerY
  })

  const exteriorPath =
    exteriorPolygon.points
      .map(transformPoint)
      .reduce((path, point, index) => `${path}${index === 0 ? 'M' : 'L'} ${point.x} ${point.y} `, '') + 'Z'

  const interiorPath =
    interiorPolygon.points
      .map(transformPoint)
      .reduce((path, point, index) => `${path}${index === 0 ? 'M' : 'L'} ${point.x} ${point.y} `, '') + 'Z'

  return (
    <Flex direction="column" align="center">
      <svg width={200} height={200} viewBox="0 0 200 200" className="overflow-visible">
        {config.referenceSide === 'inside' ? (
          <path d={exteriorPath} fill="var(--gray-3)" stroke="var(--gray-8)" strokeWidth="1" strokeDasharray="3,3" />
        ) : (
          <path d={exteriorPath} fill="var(--accent-3)" stroke="var(--accent-8)" strokeWidth="2" />
        )}
        {config.referenceSide !== 'inside' ? (
          <path d={interiorPath} fill="var(--gray-2)" stroke="var(--gray-8)" strokeWidth="1" strokeDasharray="3,3" />
        ) : (
          <path d={interiorPath} fill="var(--accent-3)" stroke="var(--accent-8)" strokeWidth="2" />
        )}

        <g transform={`translate(${centerX} ${-(bounds.max[1] - center[1]) * scale + centerY})`}>
          <text
            fill="var(--gray-12)"
            className="font-mono"
            x={0}
            y={0}
            textAnchor="middle"
            dominantBaseline="text-after-edge"
            fontSize={12}
            style={{ filter: 'drop-shadow(1px 1px 2px var(--gray-1))' }}
          >
            {formatLength(bounds.width)}
          </text>
        </g>
        <g transform={`translate(${centerX} ${-(innerBounds.max[1] - center[1]) * scale + centerY})`}>
          <text
            fill="var(--gray-12)"
            className="font-mono"
            x={0}
            y={0}
            textAnchor="middle"
            dominantBaseline="text-before-edge"
            fontSize={12}
            style={{ filter: 'drop-shadow(1px 1px 2px var(--gray-1))' }}
          >
            {formatLength(innerBounds.width)}
          </text>
        </g>
        <g transform={`translate(${(innerBounds.min[0] - center[0]) * scale + centerX} ${centerY})`}>
          <text
            fill="var(--gray-12)"
            className="font-mono"
            x={0}
            y={0}
            fontSize={12}
            textAnchor="middle"
            dominantBaseline="text-before-edge"
            transform="rotate(-90)"
            style={{ filter: 'drop-shadow(1px 1px 2px var(--gray-1))' }}
          >
            {formatLength(innerBounds.height)}
          </text>
        </g>
        <g transform={`translate(${(bounds.min[0] - center[0]) * scale + centerX} ${centerY})`}>
          <text
            fill="var(--gray-12)"
            className="font-mono"
            x={0}
            y={0}
            fontSize={12}
            textAnchor="middle"
            dominantBaseline="text-after-edge"
            transform="rotate(-90)"
            style={{ filter: 'drop-shadow(1px 1px 2px var(--gray-1))' }}
          >
            {formatLength(bounds.height)}
          </text>
        </g>
      </svg>
    </Flex>
  )
}

export function RectangularPresetDialog({ onConfirm, trigger }: RectangularPresetDialogProps): React.JSX.Element {
  const defaultWallAssemblyId = useDefaultWallAssemblyId()
  const defaultBaseRingBeamAssemblyId = useDefaultBaseRingBeamAssemblyId()
  const defaultTopRingBeamAssemblyId = useDefaultTopRingBeamAssemblyId()

  // Form state with defaults from config store
  const [config, setConfig] = useState<RectangularPresetConfig>(() => ({
    width: 10000, // 10m default inside width
    length: 7000, // 7m default inside length
    thickness: 420, // 42cm default
    wallAssemblyId: defaultWallAssemblyId,
    baseRingBeamAssemblyId: defaultBaseRingBeamAssemblyId,
    topRingBeamAssemblyId: defaultTopRingBeamAssemblyId,
    referenceSide: 'inside'
  }))

  // Update config when default config changes
  useEffect(() => setConfig(prev => ({ ...prev, wallAssemblyId: defaultWallAssemblyId })), [defaultWallAssemblyId])
  useEffect(
    () => setConfig(prev => ({ ...prev, baseRingBeamAssemblyId: defaultBaseRingBeamAssemblyId })),
    [defaultBaseRingBeamAssemblyId]
  )
  useEffect(
    () => setConfig(prev => ({ ...prev, topRingBeamAssemblyId: defaultTopRingBeamAssemblyId })),
    [defaultTopRingBeamAssemblyId]
  )

  const effectiveInteriorWidth = config.referenceSide === 'inside' ? config.width : config.width - 2 * config.thickness
  const effectiveInteriorLength =
    config.referenceSide === 'inside' ? config.length : config.length - 2 * config.thickness

  const isValid =
    effectiveInteriorWidth > 0 &&
    effectiveInteriorLength > 0 &&
    config.thickness > 0 &&
    (config.wallAssemblyId?.length ?? 0) > 0

  const handleConfirm = useCallback(() => {
    if (isValid) {
      onConfirm(config)
    }
  }, [config, isValid, onConfirm])

  return (
    <BaseModal title="Rectangular Perimeter" trigger={trigger} size="3" maxWidth="700px">
      <Flex direction="column" gap="4">
        <Grid columns="1fr auto" gap="5">
          {/* Left Column - Properties in 2x3 Grid */}
          <Flex direction="column" gap="3">
            <Heading size="2" weight="medium">
              Configuration
            </Heading>

            <Grid columns="2" gapY="3" gapX="2">
              {/* Width */}
              <Flex direction="column" gap="1">
                <Text size="1" color="gray">
                  Width
                </Text>
                <LengthField
                  value={config.width}
                  onChange={value => setConfig(prev => ({ ...prev, width: value }))}
                  min={1000}
                  step={100}
                  unit="m"
                  precision={3}
                  size="1"
                  style={{ width: '100%' }}
                />
              </Flex>

              {/* Length */}
              <Flex direction="column" gap="1">
                <Text size="1" color="gray">
                  Length
                </Text>
                <LengthField
                  value={config.length}
                  onChange={value => setConfig(prev => ({ ...prev, length: value }))}
                  min={1000}
                  step={100}
                  unit="m"
                  precision={3}
                  size="1"
                  style={{ width: '100%' }}
                />
              </Flex>

              {/* Wall Thickness */}
              <Flex direction="column" gap="1">
                <Flex align="center" gap="1">
                  <Text size="1" color="gray">
                    Wall Thickness
                  </Text>
                  <MeasurementInfo highlightedMeasurement="totalWallThickness" showFinishedSides />
                </Flex>
                <LengthField
                  value={config.thickness}
                  onChange={value => setConfig(prev => ({ ...prev, thickness: value }))}
                  min={50}
                  max={1500}
                  step={10}
                  unit="cm"
                  size="1"
                  style={{ width: '100%' }}
                />
              </Flex>

              {/* Wall Assembly */}
              <Flex direction="column" gap="1">
                <Flex align="center" gap="1">
                  <Text size="1" color="gray">
                    Wall Assembly
                  </Text>
                  {config.wallAssemblyId && <MeasurementInfo highlightedAssembly="wallAssembly" />}
                </Flex>
                <WallAssemblySelectWithEdit
                  value={config.wallAssemblyId ?? undefined}
                  onValueChange={(value: WallAssemblyId) => {
                    setConfig(prev => ({ ...prev, wallAssemblyId: value }))
                  }}
                  placeholder="Select assembly"
                  size="1"
                />
              </Flex>

              {/* Base Plate */}
              <Flex direction="column" gap="1">
                <Flex align="center" gap="1">
                  <Text size="1" color="gray">
                    Base Plate
                  </Text>
                  <MeasurementInfo highlightedPart="basePlate" />
                </Flex>
                <RingBeamAssemblySelectWithEdit
                  value={config.baseRingBeamAssemblyId}
                  onValueChange={value => {
                    setConfig(prev => ({ ...prev, baseRingBeamAssemblyId: value }))
                  }}
                  placeholder="None"
                  size="1"
                  allowNone
                />
              </Flex>

              {/* Top Plate */}
              <Flex direction="column" gap="1">
                <Flex align="center" gap="1">
                  <Text size="1" color="gray">
                    Top Plate
                  </Text>
                  <MeasurementInfo highlightedPart="topPlate" />
                </Flex>
                <RingBeamAssemblySelectWithEdit
                  value={config.topRingBeamAssemblyId}
                  onValueChange={value => {
                    setConfig(prev => ({ ...prev, topRingBeamAssemblyId: value }))
                  }}
                  placeholder="None"
                  size="1"
                  allowNone
                />
              </Flex>
            </Grid>
          </Flex>

          {/* Right Column - Preview */}
          <Flex direction="column" gap="3">
            <Heading align="center" size="2" weight="medium">
              Preview
            </Heading>

            {/* Reference Side */}
            <Flex direction="column" gap="1">
              <Text size="1" color="gray">
                Reference Side
              </Text>
              <SegmentedControl.Root
                size="1"
                value={config.referenceSide}
                onValueChange={value =>
                  setConfig(prev => ({ ...prev, referenceSide: value as PerimeterReferenceSide }))
                }
              >
                <SegmentedControl.Item value="inside">Inside</SegmentedControl.Item>
                <SegmentedControl.Item value="outside">Outside</SegmentedControl.Item>
              </SegmentedControl.Root>
            </Flex>

            <RectangularPreview config={config} />
          </Flex>
        </Grid>

        {/* Actions */}
        <Flex justify="end" gap="3" mt="4">
          <Dialog.Close>
            <Button variant="soft" color="gray">
              Cancel
            </Button>
          </Dialog.Close>
          <Dialog.Close>
            <Button onClick={handleConfirm} disabled={!isValid}>
              Confirm
            </Button>
          </Dialog.Close>
        </Flex>
      </Flex>
    </BaseModal>
  )
}
