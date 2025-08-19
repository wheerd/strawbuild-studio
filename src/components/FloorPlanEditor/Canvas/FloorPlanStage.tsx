import { useRef, useState, useCallback, useEffect } from 'react'
import { Stage } from 'react-konva'
import type Konva from 'konva'
import { useEditorStore, useViewport, useActiveTool, useIsDrawing, useActiveFloorId, useWallDrawingStart } from '../hooks/useEditorStore'
import { useModelStore } from '../../../model/store'
import { findNearestConnectionPoint } from '../../../model/operations'
import type { Point2D } from '../../../types/model'
import { GridLayer } from './GridLayer'
import { WallLayer } from './WallLayer'
import { WallPreviewLayer } from './WallPreviewLayer'
import { ConnectionPointLayer } from './ConnectionPointLayer'
import { RoomLayer } from './RoomLayer'
import { SelectionLayer } from './SelectionLayer'

interface FloorPlanStageProps {
  width: number
  height: number
}

export function FloorPlanStage ({ width, height }: FloorPlanStageProps): React.JSX.Element {
  const stageRef = useRef<Konva.Stage>(null)
  const viewport = useViewport()
  const activeTool = useActiveTool()
  const isDrawing = useIsDrawing()
  const activeFloorId = useActiveFloorId()
  const wallDrawingStart = useWallDrawingStart()
  const [dragStart, setDragStart] = useState<{ pos: { x: number, y: number }, viewport: typeof viewport } | null>(null)
  const [dragStartPos, setDragStartPos] = useState<Point2D | null>(null)
  
  // Use individual selectors instead of useEditorActions() to avoid object creation
  const startDrag = useEditorStore(state => state.startDrag)
  const endDrag = useEditorStore(state => state.endDrag)
  const setViewport = useEditorStore(state => state.setViewport)
  const setStageDimensions = useEditorStore(state => state.setStageDimensions)
  const setIsDrawing = useEditorStore(state => state.setIsDrawing)
  const setWallDrawingStart = useEditorStore(state => state.setWallDrawingStart)
  const setSnapPreview = useEditorStore(state => state.setSnapPreview)
  const snapDistance = useEditorStore(state => state.snapDistance)
  const dragState = useEditorStore(state => state.dragState)
  
  // Model store actions
  const modelState = useModelStore()
  const addConnectionPoint = useModelStore(state => state.addConnectionPoint)
  const addWall = useModelStore(state => state.addWall)
  const moveWallAction = useModelStore(state => state.moveWall)
  const moveConnectionPointAction = useModelStore(state => state.moveConnectionPoint)

  // Update stage dimensions in the store when they change
  useEffect(() => {
    setStageDimensions(width, height)
  }, [width, height, setStageDimensions])

  // Helper function to get stage coordinates from pointer
  const getStageCoordinates = useCallback((pointer: { x: number, y: number }): Point2D => {
    return {
      x: (pointer.x - viewport.panX) / viewport.zoom,
      y: (pointer.y - viewport.panY) / viewport.zoom
    }
  }, [viewport])

  // Helper function to find snap point
  const findSnapPoint = useCallback((point: Point2D): Point2D => {
    const nearest = findNearestConnectionPoint(modelState, point, snapDistance / viewport.zoom)
    return nearest ? nearest.position : point
  }, [modelState, snapDistance, viewport.zoom])

  // Helper function to create or find connection point at position
  const getOrCreateConnectionPoint = useCallback((position: Point2D) => {
    const nearest = findNearestConnectionPoint(modelState, position, snapDistance / viewport.zoom)
    if (nearest) {
      return nearest
    }
    return addConnectionPoint(position, activeFloorId)
  }, [modelState, snapDistance, viewport.zoom, addConnectionPoint, activeFloorId])

  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
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
  }, [viewport, setViewport])

  const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage()
    if (stage == null) return

    const pointer = stage.getPointerPosition()
    if (pointer == null) return



    // Handle panning (middle mouse or shift+left click)
    if (e.evt.button === 1 || (e.evt.button === 0 && e.evt.shiftKey)) {
      setDragStart({ pos: pointer, viewport: { ...viewport } })
      startDrag('pan', pointer)
      return
    }

    // Handle wall tool 
    if (activeTool === 'wall') {
      const stageCoords = getStageCoordinates(pointer)
      
      if (!isDrawing) {
        // Start drawing wall - use snapped coordinates which might be an existing point
        const snapCoords = findSnapPoint(stageCoords)
        setWallDrawingStart(snapCoords)
        setIsDrawing(true)
        setSnapPreview(snapCoords)
      } else if (wallDrawingStart != null) {
        // Finish drawing wall - use existing connection points where possible
        const snapCoords = findSnapPoint(stageCoords)
        const startPoint = getOrCreateConnectionPoint(wallDrawingStart)
        const endPoint = getOrCreateConnectionPoint(snapCoords)
        
        addWall(startPoint.id, endPoint.id, activeFloorId)
        
        setWallDrawingStart(undefined)
        setIsDrawing(false)
        setSnapPreview(undefined)
      }
      return
    }

    // Only start selection drag when clicking on empty space (Stage or Grid)
    if (e.target === stage || e.target.getClassName() === 'Stage' || e.target.getClassName() === 'Line') {
      startDrag('selection', pointer)
    }
  }, [viewport, startDrag, activeTool, isDrawing, wallDrawingStart, getStageCoordinates, findSnapPoint, 
      getOrCreateConnectionPoint, setWallDrawingStart, setIsDrawing, addWall, activeFloorId, setSnapPreview])

  // Handle drag initiation from wall shapes
  useEffect(() => {
    if (dragState.isDragging && dragState.dragType === 'wall' && !dragStartPos) {
      const stageCoords = getStageCoordinates(dragState.startPos)
      setDragStartPos(stageCoords)
    }
  }, [dragState, dragStartPos, getStageCoordinates])

  const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage()
    if (stage == null) return

    const pointer = stage.getPointerPosition()
    if (pointer == null) return

    // Handle panning
    if (dragStart != null && ((e.evt.buttons === 4) || (e.evt.buttons === 1 && e.evt.shiftKey))) {
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
    if (dragState.isDragging && dragState.dragType === 'wall' && dragState.dragEntityId && dragStartPos) {
      const currentPos = getStageCoordinates(pointer)
      const deltaX = currentPos.x - dragStartPos.x
      const deltaY = currentPos.y - dragStartPos.y
      
      moveWallAction(dragState.dragEntityId as import('../../../types/ids').WallId, deltaX, deltaY)
      setDragStartPos(currentPos)
      return
    }

    // Handle connection point dragging
    if (dragState.isDragging && dragState.dragType === 'point' && dragState.dragEntityId) {
      const currentPos = getStageCoordinates(pointer)
      const snapPos = findSnapPoint(currentPos)
      
      moveConnectionPointAction(dragState.dragEntityId as import('../../../types/ids').ConnectionPointId, snapPos)
      return
    }

    // Handle wall tool preview
    if (activeTool === 'wall') {
      const stageCoords = getStageCoordinates(pointer)
      const snapCoords = findSnapPoint(stageCoords)
      setSnapPreview(snapCoords)
    }
  }, [dragStart, setViewport, activeTool, getStageCoordinates, findSnapPoint, setSnapPreview, 
      dragState, dragStartPos, moveWallAction, moveConnectionPointAction])

  const handleMouseUp = useCallback(() => {
    setDragStart(null)
    setDragStartPos(null)
    endDrag()
  }, [endDrag])

  // Handle escape key to cancel wall drawing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeTool === 'wall' && isDrawing) {
        setWallDrawingStart(undefined)
        setIsDrawing(false)
        setSnapPreview(undefined)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [activeTool, isDrawing, setWallDrawingStart, setIsDrawing, setSnapPreview])

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
      <GridLayer width={width} height={height} viewport={{ zoom: viewport.zoom, panX: viewport.panX, panY: viewport.panY }} />
      <RoomLayer />
      <WallLayer />
      <ConnectionPointLayer />
      <WallPreviewLayer wallDrawingStart={wallDrawingStart ?? null} />
      <SelectionLayer />
    </Stage>
  )
}