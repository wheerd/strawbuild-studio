import { getModelActions } from '@/building/store'
import { generatePresetConstraints } from '@/editor/gcs/constraintGenerator'
import { getGcsActions } from '@/editor/gcs/store'
import { replaceSelection } from '@/editor/hooks/useSelectionStore'
import { getViewModeActions } from '@/editor/hooks/useViewMode'
import { viewportActions } from '@/editor/hooks/useViewportStore'
import { getToolActions } from '@/editor/tools/system'
import { BaseTool } from '@/editor/tools/system/BaseTool'
import type { CursorStyle, ToolImplementation } from '@/editor/tools/system/types'
import { Bounds2D, ensurePolygonIsClockwise, subVec2 } from '@/shared/geometry'

import { PerimeterPresetToolInspector } from './PerimeterPresetToolInspector'
import type { BasePresetConfig, PerimeterPreset } from './presets'
import { LShapedPreset, RectangularPreset } from './presets'

export class PerimeterPresetTool extends BaseTool implements ToolImplementation {
  readonly id = 'perimeter.preset'
  readonly inspectorComponent = PerimeterPresetToolInspector

  public readonly availablePresets: readonly PerimeterPreset[] = [new RectangularPreset(), new LShapedPreset()]

  public placePerimeter(preset: PerimeterPreset, config: BasePresetConfig): boolean {
    try {
      // Place polygon so that first point is on origin
      const points = preset.getPolygonPoints(config)
      const translatedPoints = points.map(point => subVec2(point, points[0]))
      const polygon = ensurePolygonIsClockwise({ points: translatedPoints })

      const { getActiveStoreyId, addPerimeter, getPerimeterCornersById, getPerimeterWallsById } = getModelActions()
      const perimeter = addPerimeter(
        getActiveStoreyId(),
        polygon,
        config.wallAssemblyId,
        config.thickness,
        config.baseRingBeamAssemblyId,
        config.topRingBeamAssemblyId,
        config.referenceSide
      )

      // Generate and add preset constraints
      const corners = getPerimeterCornersById(perimeter.id)
      const walls = getPerimeterWallsById(perimeter.id)
      const constraints = generatePresetConstraints(corners, walls, config.referenceSide)
      const gcsActions = getGcsActions()
      for (const constraint of constraints) {
        try {
          gcsActions.addBuildingConstraint(constraint)
        } catch (e) {
          console.warn('Could not add constraint', constraint, e)
        }
      }

      // Select the newly created perimeter
      replaceSelection([perimeter.id])

      // And put it into view
      viewportActions().fitToView(Bounds2D.fromPoints(perimeter.outerPolygon.points))
    } catch (error) {
      console.error('Failed to create perimeter from preset:', error)
    } finally {
      getToolActions().popTool()
    }

    return true
  }

  onActivate(): void {
    getViewModeActions().ensureMode('walls')
    this.triggerRender()
  }

  public getCursor(): CursorStyle {
    return 'not-allowed'
  }
}
