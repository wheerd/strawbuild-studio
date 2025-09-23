import { useState, useCallback, useEffect } from 'react'
import { Dialog, Button, TextField, Flex, Text, Grid, Select, IconButton, Heading } from '@radix-ui/themes'
import { Cross2Icon } from '@radix-ui/react-icons'
import { createLength } from '@/types/geometry'
import { useDebouncedNumericInput } from '@/components/FloorPlanEditor/hooks/useDebouncedInput'
import { useRingBeamConstructionMethods, usePerimeterConstructionMethods, useConfigStore } from '@/config/store'
import type { RectangularPresetConfig } from './types'
import type { RingBeamConstructionMethodId, PerimeterConstructionMethodId } from '@/types/ids'
import { formatLength } from '@/utils/formatLength'

interface RectangularPresetDialogProps {
  onConfirm: (config: RectangularPresetConfig) => void
  initialConfig?: Partial<RectangularPresetConfig>
  trigger: React.ReactNode
}

/**
 * Preview component showing nested rectangles to visualize thickness
 * Shows inside dimensions (interior space) vs outside perimeter
 */
function RectangularPreview({ config }: { config: RectangularPresetConfig }) {
  const insideWidth = config.width
  const insideLength = config.length
  const outsideWidth = insideWidth + 2 * config.thickness
  const outsideLength = insideLength + 2 * config.thickness

  // Scale for display (fit in preview area)
  const maxDimension = Math.max(outsideWidth, outsideLength)
  const scale = 200 / maxDimension

  const displayOutsideWidth = outsideWidth * scale
  const displayOutsideLength = outsideLength * scale
  const displayInsideWidth = insideWidth * scale
  const displayInsideLength = insideLength * scale
  const scaledThickness = config.thickness * scale

  return (
    <Flex direction="column" align="center">
      <svg
        width={displayOutsideWidth}
        height={displayOutsideLength}
        viewBox={`0 0 ${displayOutsideWidth} ${displayOutsideLength}`}
        className="overflow-visible"
      >
        {/* Outer rectangle (perimeter walls) */}
        <rect
          width={displayOutsideWidth}
          height={displayOutsideLength}
          fill="var(--gray-3)"
          stroke="var(--gray-8)"
          strokeWidth="1"
          strokeDasharray="3,3"
        />

        {/* Inner rectangle (interior space) */}
        <rect
          x={scaledThickness}
          y={scaledThickness}
          width={displayInsideWidth}
          height={displayInsideLength}
          fill="var(--accent-3)"
          stroke="var(--accent-8)"
          strokeWidth="2"
        />

        {/* Dimension labels */}
        <text
          color="var(--gray-12)"
          x={displayOutsideWidth / 2}
          y={12 + scaledThickness}
          textAnchor="middle"
          fontSize={12}
        >
          {formatLength(insideWidth)}
        </text>
        <text
          color="var(--gray-12)"
          x={10 + scaledThickness}
          y={displayOutsideLength / 2}
          textAnchor="middle"
          fontSize={12}
          transform={`rotate(-90, ${12 + scaledThickness}, ${displayOutsideLength / 2})`}
        >
          {formatLength(insideLength)}
        </text>
      </svg>
    </Flex>
  )
}

function RectangularPresetDialogContent({
  onConfirm,
  initialConfig
}: Omit<RectangularPresetDialogProps, 'isOpen' | 'trigger'>): React.JSX.Element {
  // Get construction methods and defaults from config store
  const allRingBeamMethods = useRingBeamConstructionMethods()
  const allPerimeterMethods = usePerimeterConstructionMethods()
  const configStore = useConfigStore()

  // Form state with defaults from config store
  const [config, setConfig] = useState<RectangularPresetConfig>(() => ({
    width: createLength(10000), // 10m default inside width
    length: createLength(7000), // 7m default inside length
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

  // Debounced inputs (UI in meters for width/length, mm for thickness)
  const widthInput = useDebouncedNumericInput(
    config.width / 1000, // Convert mm to meters for UI
    useCallback((value: number) => {
      setConfig(prev => ({ ...prev, width: createLength(value * 1000) })) // Convert meters to mm for store
    }, []),
    { debounceMs: 300, min: 1, max: 20, step: 0.1 } // 1m to 20m in 0.1m increments
  )

  const lengthInput = useDebouncedNumericInput(
    config.length / 1000, // Convert mm to meters for UI
    useCallback((value: number) => {
      setConfig(prev => ({ ...prev, length: createLength(value * 1000) })) // Convert meters to mm for store
    }, []),
    { debounceMs: 300, min: 1, max: 20, step: 0.1 } // 1m to 20m in 0.1m increments
  )

  const thicknessInput = useDebouncedNumericInput(
    config.thickness, // Keep thickness in mm
    useCallback((value: number) => {
      setConfig(prev => ({ ...prev, thickness: createLength(value) }))
    }, []),
    { debounceMs: 300, min: 50, max: 1000, step: 10 } // 50mm to 1000mm in 10mm increments
  )

  const handleConfirm = useCallback(() => {
    if (config.width > 0 && config.length > 0 && config.thickness > 0 && config.constructionMethodId) {
      onConfirm(config)
    }
  }, [config, onConfirm])

  const isValid = config.width > 0 && config.length > 0 && config.thickness > 0 && config.constructionMethodId

  return (
    <Dialog.Content size="3" maxWidth="600px">
      <Flex direction="column" gap="4">
        <Dialog.Title>
          <Flex justify="between" align="center">
            Rectangular Perimeter
            <Dialog.Close>
              <IconButton variant="ghost" size="1">
                <Cross2Icon />
              </IconButton>
            </Dialog.Close>
          </Flex>
        </Dialog.Title>

        <Grid columns="2" gap="4">
          {/* Left Column - Properties in 2x3 Grid */}
          <Flex direction="column" gap="3">
            <Heading size="2" weight="medium">
              Configuration
            </Heading>

            <Grid columns="2" gap="3">
              {/* Width */}
              <Flex direction="column" gap="1">
                <Text size="1" color="gray">
                  Width
                </Text>
                <TextField.Root
                  type="number"
                  value={widthInput.value.toString()}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => widthInput.handleChange(e.target.value)}
                  onBlur={widthInput.handleBlur}
                  onKeyDown={widthInput.handleKeyDown}
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

              {/* Length */}
              <Flex direction="column" gap="1">
                <Text size="1" color="gray">
                  Length
                </Text>
                <TextField.Root
                  type="number"
                  value={lengthInput.value.toString()}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => lengthInput.handleChange(e.target.value)}
                  onBlur={lengthInput.handleBlur}
                  onKeyDown={lengthInput.handleKeyDown}
                  min="1"
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
    </Dialog.Content>
  )
}

export function RectangularPresetDialog({
  onConfirm,
  initialConfig,
  trigger
}: RectangularPresetDialogProps): React.JSX.Element {
  return (
    <Dialog.Root>
      <Dialog.Trigger>{trigger}</Dialog.Trigger>
      <RectangularPresetDialogContent onConfirm={onConfirm} initialConfig={initialConfig} />
    </Dialog.Root>
  )
}
