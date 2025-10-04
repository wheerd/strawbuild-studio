import type { PerimeterConstructionMethodId, RingBeamConstructionMethodId } from '@/building/model/ids'
import type { Storey } from '@/building/model/model'
import type { Polygon2D } from '@/shared/geometry'
import { createLength, createVec2 } from '@/shared/geometry'
import type {
  ExportError,
  ExportResult,
  ExportedStorey,
  ImportError,
  ImportResult
} from '@/shared/services/exportImport'
import { downloadFile, exportToJSON, importFromJSON } from '@/shared/services/exportImport'

export interface ProjectImportExportService {
  exportProject(): Promise<ExportResult | ExportError>
  importProject(content: string): Promise<ImportResult | ImportError>
}

class ProjectImportExportServiceImpl implements ProjectImportExportService {
  async exportProject(): Promise<ExportResult | ExportError> {
    try {
      // Dynamic imports to avoid circular dependencies
      const { getModelActions } = await import('@/building/store')
      const { getConfigState } = await import('@/construction/config/store')

      const modelActions = getModelActions()

      // Use store getters for proper encapsulation
      const storeys = modelActions.getStoreysOrderedByLevel()

      const exportedStoreys: ExportedStorey[] = storeys.map(storey => ({
        name: storey.name,
        level: storey.level,
        height: Number(storey.height),
        perimeters: modelActions.getPerimetersByStorey(storey.id).map(perimeter => ({
          corners: perimeter.corners.map(corner => ({
            insideX: corner.insidePoint[0],
            insideY: corner.insidePoint[1],
            constuctedByWall: corner.constuctedByWall
          })),
          walls: perimeter.walls.map(wall => ({
            thickness: Number(wall.thickness),
            constructionMethodId: wall.constructionMethodId,
            openings: wall.openings.map(opening => ({
              type: opening.type,
              offsetFromStart: Number(opening.offsetFromStart),
              width: Number(opening.width),
              height: Number(opening.height),
              sillHeight: opening.sillHeight ? Number(opening.sillHeight) : undefined
            }))
          })),
          baseRingBeamMethodId: perimeter.baseRingBeamMethodId,
          topRingBeamMethodId: perimeter.topRingBeamMethodId
        }))
      }))

      const result = exportToJSON(
        { storeys: exportedStoreys },
        getConfigState() // Keep config format as-is
      )

      if (result.success) {
        downloadFile(result.data, result.filename)
      }

      return result
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export project'
      }
    }
  }

  async importProject(content: string): Promise<ImportResult | ImportError> {
    try {
      const importResult = importFromJSON(content)
      if (!importResult.success) return importResult

      // Dynamic imports to avoid circular dependencies
      const { setConfigState } = await import('@/construction/config/store')
      const { getModelActions } = await import('@/building/store')

      const modelActions = getModelActions()

      // 1. Import config state (unchanged format)
      setConfigState(importResult.data.configStore)

      // 2. Reset model (creates default "Ground Floor" at level 0)
      modelActions.reset()

      // 3. Get existing default ground floor
      const existingStoreys = modelActions.getStoreysOrderedByLevel()
      const defaultGroundFloor = existingStoreys[0]

      // 4. Process imported storeys
      const exportedStoreys = importResult.data.modelStore.storeys

      exportedStoreys.forEach((exportedStorey, index) => {
        let targetStorey: Storey

        if (index === 0) {
          // Modify existing default ground floor
          targetStorey = defaultGroundFloor
          modelActions.updateStoreyName(targetStorey.id, exportedStorey.name)
          modelActions.updateStoreyHeight(targetStorey.id, createLength(exportedStorey.height))

          // Adjust level if needed
          if (exportedStorey.level !== 0) {
            modelActions.adjustAllLevels(exportedStorey.level)
          }
        } else {
          // Add additional storeys
          targetStorey = modelActions.addStorey(exportedStorey.name, createLength(exportedStorey.height))
        }

        // 5. Recreate perimeters - let store auto-compute all geometry
        exportedStorey.perimeters.forEach(exportedPerimeter => {
          const boundary: Polygon2D = {
            points: exportedPerimeter.corners.map(c => createVec2(c.insideX, c.insideY))
          }

          // Get construction method from first wall or use default
          const constructionMethodId = exportedPerimeter.walls[0]?.constructionMethodId as PerimeterConstructionMethodId
          const thickness = createLength(exportedPerimeter.walls[0]?.thickness || 200)

          if (!constructionMethodId) {
            throw new Error('No construction method found for perimeter')
          }

          // Basic perimeter creation - auto-computes geometry, outsidePoints, etc.
          const perimeter = modelActions.addPerimeter(
            targetStorey.id,
            boundary,
            constructionMethodId,
            thickness,
            exportedPerimeter.baseRingBeamMethodId as RingBeamConstructionMethodId | undefined,
            exportedPerimeter.topRingBeamMethodId as RingBeamConstructionMethodId | undefined
          )

          // 6. Update wall properties - auto-recomputes geometry
          exportedPerimeter.walls.forEach((exportedWall, wallIndex) => {
            const wallId = perimeter.walls[wallIndex].id

            // Basic wall updates - auto-computes all derived properties
            modelActions.updatePerimeterWallThickness(perimeter.id, wallId, createLength(exportedWall.thickness))
            modelActions.updatePerimeterWallConstructionMethod(
              perimeter.id,
              wallId,
              exportedWall.constructionMethodId as PerimeterConstructionMethodId
            )

            // Add openings
            exportedWall.openings.forEach(exportedOpening => {
              modelActions.addPerimeterWallOpening(perimeter.id, wallId, {
                type: exportedOpening.type,
                offsetFromStart: createLength(exportedOpening.offsetFromStart),
                width: createLength(exportedOpening.width),
                height: createLength(exportedOpening.height),
                sillHeight: exportedOpening.sillHeight ? createLength(exportedOpening.sillHeight) : undefined
              })
            })
          })

          // 7. Update corner properties - auto-recomputes outsidePoints
          exportedPerimeter.corners.forEach((exportedCorner, cornerIndex) => {
            const cornerId = perimeter.corners[cornerIndex].id
            modelActions.updatePerimeterCornerConstructedByWall(perimeter.id, cornerId, exportedCorner.constuctedByWall)
          })
        })
      })

      return { success: true, data: importResult.data }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to import project'
      }
    }
  }
}

export const ProjectImportExportService = new ProjectImportExportServiceImpl()
