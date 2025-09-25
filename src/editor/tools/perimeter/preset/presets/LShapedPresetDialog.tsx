import { Cross2Icon } from '@radix-ui/react-icons'
import {
  Button,
  Dialog,
  Flex,
  Grid,
  Heading,
  IconButton,
  SegmentedControl,
  Select,
  Text,
  TextField
} from '@radix-ui/themes'
import { useCallback, useEffect, useState } from 'react'

import type { PerimeterConstructionMethodId, RingBeamConstructionMethodId } from '@/building/model/ids'
import {
  useConfigStore,
  usePerimeterConstructionMethods,
  useRingBeamConstructionMethods
} from '@/construction/config/store'
import { createLength, offsetPolygon } from '@/shared/geometry'
import type { Vec2 } from '@/shared/geometry'
import { useDebouncedNumericInput } from '@/shared/hooks/useDebouncedInput'
import { formatLength } from '@/shared/utils/formatLength'

import { LShape0Icon, LShape90Icon, LShape180Icon, LShape270Icon } from './Icons'
import { LShapedPreset } from './LShapedPreset'
import type { LShapedPresetConfig } from './types'

interface LShapedPresetDialogProps {
  onConfirm: (config: LShapedPresetConfig) => void
  initialConfig?: Partial<LShapedPresetConfig>
  trigger: React.ReactNode
}

/**
 * Preview component showing L-shape with outer walls and interior measurements
 * Matches the coordinate system used in the actual canvas
 */
function LShapedPreview({ config }: { config: LShapedPresetConfig }) {
  const preset = new LShapedPreset()

  // Get the polygon points (interior space) and side lengths
  const interiorPoints = preset.getPolygonPoints(config)
  const sideLengths = preset.getSideLengths(config)

  // Create outer wall polygon by offsetting outward
  const exteriorPoints = offsetPolygon(interiorPoints, config.thickness)

  // Calculate bounds for scaling (use exterior for proper sizing)
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  exteriorPoints.forEach(point => {
    minX = Math.min(minX, point[0])
    minY = Math.min(minY, point[1])
    maxX = Math.max(maxX, point[0])
    maxY = Math.max(maxY, point[1])
  })

  const width = maxX - minX
  const height = maxY - minY
  const maxDimension = Math.max(width, height)
  const scale = 200 / maxDimension
  const centerX = 100
  const centerY = 100

  // Transform points to screen coordinates (flip Y to match canvas)
  const transformPoint = (point: Vec2) => ({
    x: (point[0] - (minX + maxX) / 2) * scale + centerX,
    y: -(point[1] - (minY + maxY) / 2) * scale + centerY // Flip Y axis
  })

  const scaledInteriorPoints = interiorPoints.map(transformPoint)
  const scaledExteriorPoints = exteriorPoints.map(transformPoint)

  // Create SVG paths
  const interiorPath =
    scaledInteriorPoints.reduce((path, point, index) => {
      return path + (index === 0 ? `M ${point.x} ${point.y}` : ` L ${point.x} ${point.y}`)
    }, '') + ' Z'

  const exteriorPath =
    scaledExteriorPoints.reduce((path, point, index) => {
      return path + (index === 0 ? `M ${point.x} ${point.y}` : ` L ${point.x} ${point.y}`)
    }, '') + ' Z'

  // Calculate label positions and rotations (offset inward from each side's midpoint)
  const labelPositions = scaledInteriorPoints.map((point, index) => {
    const nextPoint = scaledInteriorPoints[(index + 1) % scaledInteriorPoints.length]
    const midX = (point.x + nextPoint.x) / 2
    const midY = (point.y + nextPoint.y) / 2

    // Calculate edge direction and normal vectors
    const dx = nextPoint.x - point.x
    const dy = nextPoint.y - point.y
    const edgeLength = Math.sqrt(dx * dx + dy * dy)
    const normalX = dy / edgeLength // Perpendicular (inward) - corrected direction
    const normalY = -dx / edgeLength // Perpendicular (inward) - corrected direction

    // Calculate text rotation angle along the edge
    let textAngle = (Math.atan2(dy, dx) * 180) / Math.PI

    // Keep text readable (same logic as SvgMeasurementIndicator)
    if (textAngle > 90) {
      textAngle -= 180
    } else if (textAngle < -90) {
      textAngle += 180
    }

    // Offset inward by 15 pixels
    const offsetDistance = 10

    return {
      x: midX + normalX * offsetDistance,
      y: midY + normalY * offsetDistance,
      length: sideLengths[index],
      rotation: textAngle
    }
  })

  return (
    <Flex direction="column" align="center">
      <svg width={200} height={200} viewBox="0 0 200 200" className="overflow-visible">
        {/* Outer walls (perimeter) */}
        <path d={exteriorPath} fill="var(--gray-3)" stroke="var(--gray-8)" strokeWidth="1" strokeDasharray="3,3" />

        {/* Interior space */}
        <path d={interiorPath} fill="var(--accent-3)" stroke="var(--accent-8)" strokeWidth="2" />

        {/* Side length labels (positioned inside the shape and rotated along edges) */}
        {labelPositions.map((label, index) => (
          <text
            key={index}
            x={label.x}
            y={label.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={12}
            fill="var(--gray-12)"
            className="font-mono"
            transform={label.rotation !== 0 ? `rotate(${label.rotation} ${label.x} ${label.y})` : undefined}
            style={{
              filter: 'drop-shadow(1px 1px 2px rgba(255, 255, 255, 0.8))'
            }}
          >
            {formatLength(createLength(label.length))}
          </text>
        ))}
      </svg>
    </Flex>
  )
}

function LShapedPresetDialogContent({
  onConfirm,
  initialConfig
}: Omit<LShapedPresetDialogProps, 'trigger'>): React.JSX.Element {
  // Get construction methods and defaults from config store
  const allRingBeamMethods = useRingBeamConstructionMethods()
  const allPerimeterMethods = usePerimeterConstructionMethods()
  const configStore = useConfigStore()

  // Form state with defaults from config store
  const [config, setConfig] = useState<LShapedPresetConfig>(() => ({
    width1: createLength(8000), // 8m main width
    length1: createLength(6000), // 6m main length
    width2: createLength(4000), // 4m extension width
    length2: createLength(3000), // 3m extension length
    rotation: 0,
    thickness: createLength(440), // 44cm default
    constructionMethodId: configStore.getDefaultPerimeterMethodId(),
    baseRingBeamMethodId: configStore.getDefaultBaseRingBeamMethodId(),
    topRingBeamMethodId: configStore.getDefaultTopRingBeamMethodId(),
    ...initialConfig
  }))

  // Update config when initial config changes
  useEffect(() => {
    if (initialConfig) {
      setConfig(prev => ({ ...prev, ...initialConfig }))
    }
  }, [initialConfig])

  // Debounced inputs (UI in meters for dimensions, mm for thickness)
  const width1Input = useDebouncedNumericInput(
    config.width1 / 1000,
    useCallback((value: number) => {
      setConfig(prev => ({ ...prev, width1: createLength(value * 1000) }))
    }, []),
    { debounceMs: 300, min: 2, max: 20, step: 0.1 }
  )

  const length1Input = useDebouncedNumericInput(
    config.length1 / 1000,
    useCallback((value: number) => {
      setConfig(prev => ({ ...prev, length1: createLength(value * 1000) }))
    }, []),
    { debounceMs: 300, min: 2, max: 20, step: 0.1 }
  )

  const width2Input = useDebouncedNumericInput(
    config.width2 / 1000,
    useCallback((value: number) => {
      setConfig(prev => ({ ...prev, width2: createLength(value * 1000) }))
    }, []),
    { debounceMs: 300, min: 1, max: 20, step: 0.1 }
  )

  const length2Input = useDebouncedNumericInput(
    config.length2 / 1000,
    useCallback((value: number) => {
      setConfig(prev => ({ ...prev, length2: createLength(value * 1000) }))
    }, []),
    { debounceMs: 300, min: 1, max: 20, step: 0.1 }
  )

  const thicknessInput = useDebouncedNumericInput(
    config.thickness,
    useCallback((value: number) => {
      setConfig(prev => ({ ...prev, thickness: createLength(value) }))
    }, []),
    { debounceMs: 300, min: 50, max: 1000, step: 10 }
  )

  const handleConfirm = useCallback(() => {
    const preset = new LShapedPreset()
    if (preset.validateConfig(config)) {
      onConfirm(config)
    }
  }, [config, onConfirm])

  const preset = new LShapedPreset()
  const isValid = preset.validateConfig(config)

  return (
    <Dialog.Content size="4" maxWidth="800px">
      <Flex direction="column" gap="4">
        <Dialog.Title>
          <Flex justify="between" align="center">
            L-Shaped Perimeter
            <Dialog.Close>
              <IconButton variant="ghost" size="1">
                <Cross2Icon />
              </IconButton>
            </Dialog.Close>
          </Flex>
        </Dialog.Title>

        <Grid columns="2" gap="4">
          {/* Left Column - Configuration */}
          <Flex direction="column" gap="3">
            <Heading size="2" weight="medium">
              Configuration
            </Heading>

            {/* Main Rectangle Dimensions */}
            <Flex direction="column" gap="2">
              <Text size="2" weight="medium" color="gray">
                Main Rectangle
              </Text>
              <Grid columns="2" gap="3">
                <Flex direction="column" gap="1">
                  <Text size="1" color="gray">
                    Width 1
                  </Text>
                  <TextField.Root
                    type="number"
                    value={width1Input.value.toString()}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => width1Input.handleChange(e.target.value)}
                    onBlur={width1Input.handleBlur}
                    onKeyDown={width1Input.handleKeyDown}
                    min="2"
                    max="20"
                    step="0.1"
                    placeholder="8.0"
                    size="1"
                    style={{ textAlign: 'right', width: '100%' }}
                  >
                    <TextField.Slot side="right" pl="1">
                      m
                    </TextField.Slot>
                  </TextField.Root>
                </Flex>

                <Flex direction="column" gap="1">
                  <Text size="1" color="gray">
                    Length 1
                  </Text>
                  <TextField.Root
                    type="number"
                    value={length1Input.value.toString()}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => length1Input.handleChange(e.target.value)}
                    onBlur={length1Input.handleBlur}
                    onKeyDown={length1Input.handleKeyDown}
                    min="2"
                    max="20"
                    step="0.1"
                    placeholder="6.0"
                    size="1"
                    style={{ textAlign: 'right', width: '100%' }}
                  >
                    <TextField.Slot side="right" pl="1">
                      m
                    </TextField.Slot>
                  </TextField.Root>
                </Flex>
              </Grid>
            </Flex>

            {/* Extension Rectangle Dimensions */}
            <Flex direction="column" gap="2">
              <Text size="2" weight="medium" color="gray">
                Extension Rectangle
              </Text>
              <Grid columns="2" gap="3">
                <Flex direction="column" gap="1">
                  <Text size="1" color="gray">
                    Width 2
                  </Text>
                  <TextField.Root
                    type="number"
                    value={width2Input.value.toString()}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => width2Input.handleChange(e.target.value)}
                    onBlur={width2Input.handleBlur}
                    onKeyDown={width2Input.handleKeyDown}
                    min="1"
                    max="20"
                    step="0.1"
                    placeholder="4.0"
                    size="1"
                    style={{ textAlign: 'right', width: '100%' }}
                  >
                    <TextField.Slot side="right" pl="1">
                      m
                    </TextField.Slot>
                  </TextField.Root>
                </Flex>

                <Flex direction="column" gap="1">
                  <Text size="1" color="gray">
                    Length 2
                  </Text>
                  <TextField.Root
                    type="number"
                    value={length2Input.value.toString()}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => length2Input.handleChange(e.target.value)}
                    onBlur={length2Input.handleBlur}
                    onKeyDown={length2Input.handleKeyDown}
                    min="1"
                    max="20"
                    step="0.1"
                    placeholder="3.0"
                    size="1"
                    style={{ textAlign: 'right', width: '100%' }}
                  >
                    <TextField.Slot side="right" pl="1">
                      m
                    </TextField.Slot>
                  </TextField.Root>
                </Flex>
              </Grid>
            </Flex>

            {/* Rotation */}
            <Flex direction="column" gap="2">
              <Text size="1" color="gray">
                Rotation
              </Text>
              <SegmentedControl.Root
                value={config.rotation.toString()}
                onValueChange={value =>
                  setConfig(prev => ({ ...prev, rotation: parseInt(value) as 0 | 90 | 180 | 270 }))
                }
                size="1"
              >
                <SegmentedControl.Item value="0">
                  <LShape0Icon />
                </SegmentedControl.Item>
                <SegmentedControl.Item value="90">
                  <LShape90Icon />
                </SegmentedControl.Item>
                <SegmentedControl.Item value="180">
                  <LShape180Icon />
                </SegmentedControl.Item>
                <SegmentedControl.Item value="270">
                  <LShape270Icon />
                </SegmentedControl.Item>
              </SegmentedControl.Root>
            </Flex>

            {/* Construction Settings */}
            <Grid columns="2" gap="3">
              {/* Wall Thickness */}
              <Flex direction="column" gap="1">
                <Text size="1" color="gray">
                  Wall Thickness
                </Text>
                <TextField.Root
                  type="number"
                  value={thicknessInput.value.toString()}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => thicknessInput.handleChange(e.target.value)}
                  onBlur={thicknessInput.handleBlur}
                  onKeyDown={thicknessInput.handleKeyDown}
                  min="50"
                  max="1000"
                  step="10"
                  placeholder="440"
                  size="1"
                  style={{ textAlign: 'right', width: '100%' }}
                >
                  <TextField.Slot side="right" pl="1">
                    mm
                  </TextField.Slot>
                </TextField.Root>
              </Flex>

              {/* Construction Method */}
              <Flex direction="column" gap="1">
                <Text size="1" color="gray">
                  Construction Method
                </Text>
                <Select.Root
                  value={config.constructionMethodId || ''}
                  onValueChange={(value: PerimeterConstructionMethodId) => {
                    setConfig(prev => ({ ...prev, constructionMethodId: value }))
                  }}
                  size="1"
                >
                  <Select.Trigger style={{ width: '100%' }} />
                  <Select.Content>
                    {allPerimeterMethods.map(method => (
                      <Select.Item key={method.id} value={method.id}>
                        {method.name}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </Flex>

              {/* Base Plate */}
              <Flex direction="column" gap="1">
                <Text size="1" color="gray">
                  Base Plate
                </Text>
                <Select.Root
                  value={config.baseRingBeamMethodId || 'none'}
                  onValueChange={value => {
                    const methodId = value === 'none' ? undefined : (value as RingBeamConstructionMethodId)
                    setConfig(prev => ({ ...prev, baseRingBeamMethodId: methodId }))
                  }}
                  size="1"
                >
                  <Select.Trigger style={{ width: '100%' }} />
                  <Select.Content>
                    <Select.Item value="none">None</Select.Item>
                    {allRingBeamMethods.map(method => (
                      <Select.Item key={method.id} value={method.id}>
                        {method.name}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </Flex>

              {/* Top Plate */}
              <Flex direction="column" gap="1">
                <Text size="1" color="gray">
                  Top Plate
                </Text>
                <Select.Root
                  value={config.topRingBeamMethodId || 'none'}
                  onValueChange={value => {
                    const methodId = value === 'none' ? undefined : (value as RingBeamConstructionMethodId)
                    setConfig(prev => ({ ...prev, topRingBeamMethodId: methodId }))
                  }}
                  size="1"
                >
                  <Select.Trigger style={{ width: '100%' }} />
                  <Select.Content>
                    <Select.Item value="none">None</Select.Item>
                    {allRingBeamMethods.map(method => (
                      <Select.Item key={method.id} value={method.id}>
                        {method.name}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </Flex>
            </Grid>
          </Flex>

          {/* Right Column - Preview */}
          <Flex direction="column" gap="2">
            <Heading align="center" size="2" weight="medium">
              Preview
            </Heading>
            {isValid ? (
              <LShapedPreview config={config} />
            ) : (
              <Flex align="center" justify="center" style={{ height: '240px' }}>
                <Text size="1" color="red">
                  Invalid configuration
                </Text>
              </Flex>
            )}
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
    </Dialog.Content>
  )
}

export function LShapedPresetDialog({
  onConfirm,
  initialConfig,
  trigger
}: LShapedPresetDialogProps): React.JSX.Element {
  return (
    <Dialog.Root>
      <Dialog.Trigger>{trigger}</Dialog.Trigger>
      <LShapedPresetDialogContent onConfirm={onConfirm} initialConfig={initialConfig} />
    </Dialog.Root>
  )
}
