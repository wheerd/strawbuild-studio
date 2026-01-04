import type { Resources } from 'i18next'

import type { RingBeamAssemblyId, WallAssemblyId } from '@/building/model/ids'
import type { PerimeterReferenceSide } from '@/building/model/model'
import { type Length, type Vec2 } from '@/shared/geometry'

/**
 * Base configuration interface for all perimeter presets
 */
export interface BasePresetConfig {
  thickness: Length
  wallAssemblyId: WallAssemblyId
  baseRingBeamAssemblyId?: RingBeamAssemblyId
  topRingBeamAssemblyId?: RingBeamAssemblyId
  referenceSide: PerimeterReferenceSide
}

/**
 * Configuration specific to rectangular presets
 */
export interface RectangularPresetConfig extends BasePresetConfig {
  width: Length
  length: Length
}

/**
 * Configuration specific to L-shaped presets
 */
export interface LShapedPresetConfig extends BasePresetConfig {
  width1: Length // Main rectangle width
  length1: Length // Main rectangle length
  width2: Length // Extension rectangle width
  length2: Length // Extension rectangle length
  rotation: 0 | 90 | 180 | 270 // Rotation in degrees
}

interface IconProps extends React.SVGAttributes<SVGElement> {
  children?: never
}
type IconComponent = React.ComponentType<IconProps>

export interface PresetDialogProps {
  onConfirm: (config: BasePresetConfig) => void
  trigger: React.ReactNode
}
type DialogComponent = React.ComponentType<PresetDialogProps>

/**
 * Abstract interface for perimeter presets
 * Each preset type provides polygon points for preview and creation
 */
export interface PerimeterPreset<TConfig extends BasePresetConfig = BasePresetConfig> {
  readonly type: keyof Resources['tool']['perimeterPreset']['types']
  readonly icon: IconComponent
  readonly dialog: DialogComponent

  /**
   * Get the polygon points for this preset configuration
   * Points should be in clockwise order for perimeters
   */
  getPolygonPoints(config: TConfig): Vec2[]

  /**
   * Get the bounds of the preset for positioning
   */
  getBounds(config: TConfig): { width: number; height: number }

  /**
   * Validate the configuration
   */
  validateConfig(config: TConfig): boolean
}
