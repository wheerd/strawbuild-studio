import { useRef, useState, useCallback, useEffect } from 'react'
import { Stage } from 'react-konva'
import type Konva from 'konva'
import {
  useEditorStore,
  useViewport,
  useActiveTool,
  useIsDrawing,
  useActiveFloorId,
  useWallDrawingStart,
  useCurrentSnapFromPointId
} from '@/components/FloorPlanEditor/hooks/useEditorStore'
import { useModelStore } from '@/model/store'
import { defaultSnappingService } from '@/model/store/services/snapping/SnappingService'
import { useSnappingContext } from '@/components/FloorPlanEditor/hooks/useSnappingContext'
import { createPoint2D, type Point2D, distanceSquared, createLength, direction } from '@/types/geometry'
import { GridLayer } from './GridLayer'
import { WallLayer } from './WallLayer'
import { WallPreviewLayer } from './WallPreviewLayer'
import { PointLayer } from './PointLayer'
import { RoomLayer } from './RoomLayer'
import { CornerLayer } from './CornerLayer'
import type { SnapResult } from '@/model/store/services/snapping'
import type { PointId, WallId } from '@/model'

interface FloorPlanStageProps {
  width: number
  height: number
}

export function FloorPlanStage({ width, height }: FloorPlanStageProps): React.JSX.Element {
  const stageRef = useRef<Konva.Stage>(null)
  const viewport = useViewport()
  const activeTool = useActiveTool()
  const isDrawing = useIsDrawing()
  const activeFloorId = useActiveFloorId()
  const wallDrawingStart = useWallDrawingStart()
  const [dragStart, setDragStart] = useState<{ pos: { x: number; y: number }; viewport: typeof viewport } | null>(null)
  const [dragStartPos, setDragStartPos] = useState<Point2D | null>(null)

  // Use individual selectors instead of useEditorActions() to avoid object creation
  const startDrag = useEditorStore(state => state.startDrag)
  const endDrag = useEditorStore(state => state.endDrag)
  const setViewport = useEditorStore(state => state.setViewport)
  const setStageDimensions = useEditorStore(state => state.setStageDimensions)
  const setIsDrawing = useEditorStore(state => state.setIsDrawing)
  const setWallDrawingStart = useEditorStore(state => state.setWallDrawingStart)
  const updateSnapReference = useEditorStore(state => state.updateSnapReference)
  const updateSnapResult = useEditorStore(state => state.updateSnapResult)
  const updateSnapTarget = useEditorStore(state => state.updateSnapTarget)
  const clearSnapState = useEditorStore(state => state.clearSnapState)
  const dragState = useEditorStore(state => state.dragState)
  const snappingContext = useSnappingContext()

  // Model store actions
  const modelState = useModelStore()
  const addPoint = useModelStore(state => state.addPoint)
  const addWall = useModelStore(state => state.addStructuralWall)
  const moveWall = useModelStore(state => state.moveWall)
  const movePoint = useModelStore(state => state.movePoint)
  const mergePoints = useModelStore(state => state.mergePoints)
  const findNearestPoint = useModelStore(state => state.findNearestPoint)

  // Update stage dimensions in the store when they change
  useEffect(() => {
    setStageDimensions(width, height)
  }, [width, height, setStageDimensions])

  // Helper function to get stage coordinates from pointer
  const getStageCoordinates = useCallback(
    (pointer: { x: number; y: number }): Point2D => {
      return createPoint2D((pointer.x - viewport.panX) / viewport.zoom, (pointer.y - viewport.panY) / viewport.zoom)
    },
    [viewport]
  )

  const currentSnapFromPointId = useCurrentSnapFromPointId()

  // Helper function to find snap point and update unified snap state
  // Now much more efficient with memoized context and point ID tracking
  const findSnapPoint = useCallback(
    (point: Point2D): SnapResult | null => {
      updateSnapTarget(point)
      const snapResult = defaultSnappingService.findSnapResult(point, snappingContext)
      updateSnapResult(snapResult)
      return snapResult
    },
    [
      snappingContext,
      wallDrawingStart,
      currentSnapFromPointId,
      updateSnapTarget,
      modelState,
      updateSnapResult,
      viewport.zoom
    ]
  )

  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault()

      const stage = e.target.getStage()
      if (stage == null) return

      const pointer = stage.getPointerPosition()
      if (pointer == null) return

      const scaleBy = 1.1
      const zoomFactor = e.evt.deltaY > 0 ? 1 / scaleBy : scaleBy
      const newZoom = Math.max(0.1, Math.min(10, viewport.zoom * zoomFactor))

      const zoomRatio = newZoom / viewport.zoom
      const newPanX = pointer.x - (pointer.x - viewport.panX) * zoomRatio
      const newPanY = pointer.y - (pointer.y - viewport.panY) * zoomRatio

      setViewport({
        zoom: newZoom,
        panX: newPanX,
        panY: newPanY
      })
    },
    [viewport, setViewport]
  )

  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const stage = e.target.getStage()
      if (stage == null) return

      const pointer = stage.getPointerPosition()
      if (pointer == null) return

      // Handle panning (middle mouse or shift+left click)
      if (e.evt.button === 1 || (e.evt.button === 0 && e.evt.shiftKey)) {
        setDragStart({ pos: pointer, viewport: { ...viewport } })
        startDrag('pan', pointer as Point2D)
        return
      }

      // Handle wall tool
      if (activeTool === 'wall') {
        const stageCoords = getStageCoordinates(pointer)
        const snapResult = findSnapPoint(stageCoords)
        const snapCoords = snapResult?.position ?? stageCoords

        if (!isDrawing) {
          // Start drawing wall - use snapped coordinates which might be an existing point
          setWallDrawingStart(snapCoords)
          updateSnapReference(snapCoords, snapResult?.pointId ?? null)
          setIsDrawing(true)
        } else if (wallDrawingStart != null) {
          const wallLength = distanceSquared(wallDrawingStart, snapCoords)
          if (wallLength >= 50 ** 2) {
            const startPoint =
              snappingContext.referencePointId != null
                ? modelState.points.get(snappingContext.referencePointId)
                : addPoint(activeFloorId, wallDrawingStart)
            const endPoint =
              snapResult?.pointId != null
                ? modelState.points.get(snapResult.pointId)
                : addPoint(activeFloorId, snapCoords)

            if (startPoint != null && endPoint != null) {
              addWall(activeFloorId, startPoint.id, endPoint.id)
            }

            setWallDrawingStart(undefined)
            setIsDrawing(false)
            clearSnapState()
          }
          // If wall is too short, just ignore the click (don't create wall)
        }
        return
      }

      // Only start selection drag when clicking on empty space (Stage or Grid)
      if (e.target === stage || e.target.getClassName() === 'Stage' || e.target.getClassName() === 'Line') {
        startDrag('selection', pointer as Point2D)
      }
    },
    [
      viewport,
      startDrag,
      activeTool,
      isDrawing,
      wallDrawingStart,
      getStageCoordinates,
      findSnapPoint,
      setWallDrawingStart,
      setIsDrawing,
      addWall,
      activeFloorId,
      updateSnapReference
    ]
  )

  // Handle drag initiation from wall shapes
  useEffect(() => {
    if (dragState.isDragging && dragState.dragType === 'wall' && dragStartPos == null) {
      const stageCoords = getStageCoordinates(dragState.startPos)
      setDragStartPos(stageCoords)
    }
  }, [dragState, dragStartPos, getStageCoordinates])

  const handleMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const stage = e.target.getStage()
      if (stage == null) return

      const pointer = stage.getPointerPosition()
      if (pointer == null) return

      // Handle panning
      if (dragStart != null && (e.evt.buttons === 4 || (e.evt.buttons === 1 && e.evt.shiftKey))) {
        const deltaX = pointer.x - dragStart.pos.x
        const deltaY = pointer.y - dragStart.pos.y

        setViewport({
          zoom: dragStart.viewport.zoom,
          panX: dragStart.viewport.panX + deltaX,
          panY: dragStart.viewport.panY + deltaY
        })
        return
      }

      // Handle wall dragging
      if (
        dragState.isDragging &&
        dragState.dragType === 'wall' &&
        dragState.dragEntityId != null &&
        dragStartPos != null
      ) {
        const currentPos = getStageCoordinates(pointer)
        const delta = direction(dragStartPos, currentPos)

        moveWall(dragState.dragEntityId as WallId, delta.x, delta.y)
        setDragStartPos(currentPos)
        return
      }

      // Handle connection point dragging
      if (dragState.isDragging && dragState.dragType === 'point' && dragState.dragEntityId != null) {
        const currentPos = getStageCoordinates(pointer)
        const snapPos = findSnapPoint(currentPos)

        movePoint(dragState.dragEntityId as PointId, snapPos?.position ?? currentPos)
        return
      }

      // Handle wall tool preview with architectural snapping
      if (activeTool === 'wall') {
        const stageCoords = getStageCoordinates(pointer)
        // findSnapPoint will automatically update unified snap state for preview
        findSnapPoint(stageCoords)
      }
    },
    [
      dragStart,
      setViewport,
      activeTool,
      getStageCoordinates,
      findSnapPoint,
      dragState,
      dragStartPos,
      moveWall,
      movePoint
    ]
  )

  const handleMouseUp = useCallback((): void => {
    // Check for point merging when finishing point drag (only in select mode)
    if (
      dragState.isDragging &&
      dragState.dragType === 'point' &&
      dragState.dragEntityId != null &&
      activeTool === 'select'
    ) {
      const stage = stageRef.current
      const pointer = stage?.getPointerPosition()

      if (pointer != null) {
        const currentPos = getStageCoordinates(pointer)
        const draggedPointId = dragState.dragEntityId as PointId

        const nearestPoint = findNearestPoint(activeFloorId, currentPos, createLength(200), draggedPointId)

        if (nearestPoint != null) {
          // Merge the dragged point into the nearest point
          mergePoints(nearestPoint.id, draggedPointId)
        }
      }
    }

    setDragStart(null)
    setDragStartPos(null)
    endDrag()
  }, [endDrag, dragState, getStageCoordinates, modelState, mergePoints, activeFloorId, findNearestPoint, activeTool])

  // Handle escape key to cancel wall drawing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && activeTool === 'wall' && isDrawing) {
        setWallDrawingStart(undefined)
        setIsDrawing(false)
        clearSnapState()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [activeTool, isDrawing, setWallDrawingStart, setIsDrawing])

  return (
    <Stage
      ref={stageRef}
      width={width}
      height={height}
      x={viewport.panX}
      y={viewport.panY}
      scaleX={viewport.zoom}
      scaleY={viewport.zoom}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      draggable={false}
    >
      <GridLayer
        width={width}
        height={height}
        viewport={{ zoom: viewport.zoom, panX: viewport.panX, panY: viewport.panY }}
      />
      <RoomLayer />
      <WallLayer />
      <CornerLayer />
      <PointLayer />
      <WallPreviewLayer wallDrawingStart={wallDrawingStart ?? null} stageWidth={width} stageHeight={height} />
    </Stage>
  )
}
