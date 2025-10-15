import { vec2 } from 'gl-matrix'

import { getModelActions } from '@/building/store'
import { BaseTool } from '@/editor/tools/system/BaseTool'
import type { CanvasEvent, ToolImplementation } from '@/editor/tools/system/types'
import type { Polygon2D } from '@/shared/geometry'
import { polygonIsClockwise } from '@/shared/geometry'

import { PerimeterPresetToolInspector } from './PerimeterPresetToolInspector'
import { PerimeterPresetToolOverlay } from './PerimeterPresetToolOverlay'
import type { BasePresetConfig, PerimeterPreset } from './presets'
import { LShapedPreset, RectangularPreset } from './presets'

interface PerimeterPresetToolState {
  activePreset: PerimeterPreset | null
  presetConfig: BasePresetConfig | null
  previewPosition: vec2 | null
  previewPolygon: Polygon2D | null
}

export class PerimeterPresetTool extends BaseTool implements ToolImplementation {
  readonly id = 'perimeter.preset'
  readonly overlayComponent = PerimeterPresetToolOverlay
  readonly inspectorComponent = PerimeterPresetToolInspector

  public state: PerimeterPresetToolState = {
    activePreset: null,
    presetConfig: null,
    previewPosition: null,
    previewPolygon: null
  }

  // Available presets
  private availablePresets: PerimeterPreset[] = [new RectangularPreset(), new LShapedPreset()]

  /**
   * Get all available preset types
   */
  public getAvailablePresets(): PerimeterPreset[] {
    return this.availablePresets
  }

  /**
   * Set the active preset and configuration
   */
  public setActivePreset(preset: PerimeterPreset, config: BasePresetConfig): void {
    this.state.activePreset = preset
    this.state.presetConfig = config
    this.updatePreview()
    this.triggerRender()
  }

  /**
   * Clear the active preset
   */
  public clearActivePreset(): void {
    this.state.activePreset = null
    this.state.presetConfig = null
    this.state.previewPosition = null
    this.state.previewPolygon = null
    this.triggerRender()
  }

  /**
   * Update the preview polygon based on current position and preset
   */
  private updatePreview(): void {
    const previewPos = this.state.previewPosition
    if (!this.state.activePreset || !this.state.presetConfig || !previewPos) {
      this.state.previewPolygon = null
      return
    }

    try {
      // Get polygon points from preset (centered at origin)
      const points = this.state.activePreset.getPolygonPoints(this.state.presetConfig)

      // Translate points to preview position
      const translatedPoints = points.map(point => vec2.add(vec2.create(), point, previewPos))

      this.state.previewPolygon = { points: translatedPoints }
    } catch (error) {
      console.error('Failed to generate preview polygon:', error)
      this.state.previewPolygon = null
    }
  }

  handlePointerMove(event: CanvasEvent): boolean {
    if (!this.state.presetConfig) {
      return false
    }

    this.state.previewPosition = event.stageCoordinates
    this.updatePreview()
    this.triggerRender()
    return true
  }

  handlePointerDown(event: CanvasEvent): boolean {
    if (!this.state.activePreset || !this.state.presetConfig) {
      return false
    }

    try {
      // Get polygon points from preset
      const points = this.state.activePreset.getPolygonPoints(this.state.presetConfig)

      // Translate points to click position
      const translatedPoints = points.map(point => vec2.add(vec2.create(), point, event.stageCoordinates))

      // Create polygon and ensure clockwise order for perimeters
      let polygon: Polygon2D = { points: translatedPoints }

      // Check if polygon is clockwise, if not reverse it
      if (!polygonIsClockwise(polygon)) {
        polygon = { points: [...translatedPoints].reverse() }
      }

      // Create the perimeter using the model store
      const modelStore = getModelActions()
      const activeStoreyId = modelStore.getActiveStoreyId()

      modelStore.addPerimeter(
        activeStoreyId,
        polygon,
        this.state.presetConfig.wallAssemblyId,
        this.state.presetConfig.thickness,
        this.state.presetConfig.baseRingBeamAssemblyId,
        this.state.presetConfig.topRingBeamAssemblyId
      )

      // Reset the active preset after successful placement
      this.clearActivePreset()
    } catch (error) {
      console.error('Failed to create perimeter from preset:', error)
    }

    return true
  }

  handleKeyDown(event: KeyboardEvent): boolean {
    if (event.key === 'Escape') {
      if (this.state.presetConfig) {
        this.clearActivePreset()
        return true
      }
      return false // Bubble up to allow tool cancellation
    }

    return false
  }

  onActivate(): void {
    // Reset state when tool is activated
    this.state.previewPosition = null
    this.state.previewPolygon = null
    this.triggerRender()
  }

  onDeactivate(): void {
    // Clear all state when tool is deactivated
    this.clearActivePreset()
  }

  /**
   * Get the current preset configuration (for inspector display)
   */
  public getCurrentConfig(): BasePresetConfig | null {
    return this.state.presetConfig
  }

  /**
   * Check if a preset is currently being placed
   */
  public isPlacing(): boolean {
    return this.state.presetConfig !== null
  }

  /**
   * Get the current preview polygon for overlay rendering
   */
  public getPreviewPolygon(): Polygon2D | null {
    return this.state.previewPolygon
  }
}
