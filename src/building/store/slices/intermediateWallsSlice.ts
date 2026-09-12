import type { StateCreator } from 'zustand'

import type {
  InnerWallNodeGeometry,
  InnerWallNodeWithGeometry,
  IntermediateWall,
  IntermediateWallGeometry,
  IntermediateWallWithGeometry,
  PerimeterWallNodeGeometry,
  PerimeterWallNodeWithGeometry,
  WallAttachment,
  WallAxis,
  WallNode,
  WallNodeGeometry,
  WallNodeWithGeometry
} from '@/building/model'
import type {
  InteriorWallAssemblyId,
  IntermediateWallId,
  PerimeterId,
  PerimeterWallId,
  WallEntityId,
  WallNodeId
} from '@/building/model/ids'
import { createIntermediateWallId, createWallNodeId, isOpeningId } from '@/building/model/ids'
import { getInnerWallConstructionOptions, isInnerWallConstructionOption } from '@/building/model/wallNodeConstruction'
import { InvalidOperationError, NotFoundError } from '@/building/store/errors'
import { cleanUpOrphaned } from '@/building/store/slices/cleanup'
import {
  handleIntermediateWallMergeConstraintsDraft,
  handleIntermediateWallSplitConstraintsDraft,
  removeConstraintsForEntityDraft
} from '@/building/store/slices/constraintsSlice'
import { removeTimestampDraft, updateTimestampDraft } from '@/building/store/slices/timestampsSlice'
import type { StoreState } from '@/building/store/types'
import type { Length, Line2D, Vec2 } from '@/shared/geometry'
import {
  copyVec2,
  distanceToInfiniteLine,
  dotVec2,
  lineFromSegment,
  lineIntersection,
  projectPointOntoLine,
  projectVec2,
  scaleAddVec2
} from '@/shared/geometry'

import { updateAllWallNodeGeometry } from './intermediateWallGeometry'

export interface IntermediateWallsState {
  intermediateWalls: Record<IntermediateWallId, IntermediateWall>
  _intermediateWallGeometry: Record<IntermediateWallId, IntermediateWallGeometry>

  wallNodes: Record<WallNodeId, WallNode>
  _wallNodeGeometry: Record<WallNodeId, WallNodeGeometry>
}

export interface IntermediateWallsActions {
  addIntermediateWall: (
    perimeterId: PerimeterId,
    start: WallAttachment,
    end: WallAttachment,
    thickness: Length,
    wallAssemblyId: InteriorWallAssemblyId
  ) => IntermediateWallWithGeometry
  removeIntermediateWall: (wallId: IntermediateWallId) => void
  updateIntermediateWallThickness: (wallId: IntermediateWallId, thickness: Length) => void
  updateIntermediateWallAssembly: (wallId: IntermediateWallId, assemblyId: InteriorWallAssemblyId) => void
  updateInnerWallNodeConstruction: (
    nodeId: WallNodeId,
    constructedBy: IntermediateWallId,
    constructedWithColinear?: IntermediateWallId
  ) => void
  updateIntermediateWallAlignment: (wallId: IntermediateWallId, start: WallAxis, end: WallAxis) => void
  updateIntermediateWallAttachmentAxis: (wallId: IntermediateWallId, endpoint: 'start' | 'end', axis: WallAxis) => void
  updateIntermediateWallAlignmentPreservingGeometry: (wallId: IntermediateWallId, axis: WallAxis) => void
  mergeIntermediateWalls: (nodeId: WallNodeId) => IntermediateWallId | null

  addPerimeterWallNode: (
    perimeterId: PerimeterId,
    wallId: PerimeterWallId,
    offsetFromCornerStart: Length
  ) => PerimeterWallNodeWithGeometry
  addInnerWallNode: (perimeterId: PerimeterId, position: Vec2) => InnerWallNodeWithGeometry
  splitIntermediateWallAtPoint: (wallId: IntermediateWallId, point: Vec2) => WallNodeId
  removeWallNode: (nodeId: WallNodeId) => void
  updateInnerWallNodePosition: (nodeId: WallNodeId, position: Vec2) => void
  updatePerimeterWallNodeOffset: (nodeId: WallNodeId, offsetFromCornerStart: Length) => void
  applyGcsWallNodePositions: (perimeterId: PerimeterId, positions: Record<WallNodeId, Vec2>) => void

  getIntermediateWallById: (wallId: IntermediateWallId) => IntermediateWallWithGeometry
  getIntermediateWallsByPerimeter: (perimeterId: PerimeterId) => IntermediateWallWithGeometry[]
  getAllIntermediateWalls: () => IntermediateWallWithGeometry[]
  getWallNodeById: (nodeId: WallNodeId) => WallNodeWithGeometry
  getWallNodesByPerimeter: (perimeterId: PerimeterId) => WallNodeWithGeometry[]
  getAllWallNodes: () => WallNodeWithGeometry[]
}

export type IntermediateWallsSlice = IntermediateWallsState & { actions: IntermediateWallsActions }

export const createIntermediateWallsSlice: StateCreator<
  IntermediateWallsSlice & StoreState,
  [['zustand/immer', never]],
  [],
  IntermediateWallsSlice
> = (set, get) => ({
  intermediateWalls: {},
  _intermediateWallGeometry: {},
  wallNodes: {},
  _wallNodeGeometry: {},

  actions: {
    addIntermediateWall: (
      perimeterId: PerimeterId,
      start: WallAttachment,
      end: WallAttachment,
      thickness: Length,
      wallAssemblyId: InteriorWallAssemblyId
    ) => {
      if (thickness <= 0) {
        throw new Error('Wall thickness must be greater than 0')
      }

      let result!: IntermediateWallWithGeometry
      set(state => {
        if (!(perimeterId in state.perimeters)) {
          throw new NotFoundError('Perimeter', perimeterId)
        }

        const perimeter = state.perimeters[perimeterId]

        const wallId = createIntermediateWallId()
        const wall: IntermediateWall = {
          id: wallId,
          perimeterId,
          entityIds: [],
          start,
          end,
          thickness,
          wallAssemblyId
        }

        state.intermediateWalls[wallId] = wall
        perimeter.intermediateWallIds.push(wallId)

        if (!(start.nodeId in state.wallNodes) || state.wallNodes[start.nodeId].perimeterId !== perimeterId) {
          throw new NotFoundError('Wall node', start.nodeId)
        }
        const startNode = state.wallNodes[start.nodeId]
        startNode.connectedWallIds.push(wallId)
        if (startNode.type === 'inner' && !startNode.constructedBy) startNode.constructedBy = wallId
        if (!(end.nodeId in state.wallNodes) || state.wallNodes[end.nodeId].perimeterId !== perimeterId) {
          throw new NotFoundError('Wall node', end.nodeId)
        }
        const endNode = state.wallNodes[end.nodeId]
        endNode.connectedWallIds.push(wallId)
        if (endNode.type === 'inner' && !endNode.constructedBy) endNode.constructedBy = wallId

        updateAllWallNodeGeometry(state, perimeterId)

        updateTimestampDraft(state, wallId)
        result = { ...wall, ...state._intermediateWallGeometry[wallId] }
      })

      return result
    },

    removeIntermediateWall: (wallId: IntermediateWallId) => {
      set(state => {
        if (!(wallId in state.intermediateWalls)) return

        const wall = state.intermediateWalls[wallId]
        const perimeter = state.perimeters[wall.perimeterId]

        perimeter.intermediateWallIds = perimeter.intermediateWallIds.filter(id => id !== wallId)

        removeConstraintsForEntityDraft(state, wallId)
        delete state.intermediateWalls[wallId]
        delete state._intermediateWallGeometry[wallId]

        removeTimestampDraft(state, wallId)
        cleanUpOrphaned(state)

        updateAllWallNodeGeometry(state, wall.perimeterId)

        for (const nodeId of state.perimeters[wall.perimeterId].wallNodeIds) {
          const node = state.wallNodes[nodeId]
          if (node.type !== 'inner') continue

          const options = getInnerWallConstructionOptions({ ...node, ...state._wallNodeGeometry[nodeId] })
          const currentOption = { constructedBy: node.constructedBy, constructedWithColinear: node.constructedWithColinear }
          if (isInnerWallConstructionOption(currentOption, options)) continue

          if (options.length > 0) {
            const nextOption = options[0]
            node.constructedBy = nextOption.constructedBy
            node.constructedWithColinear = nextOption.constructedWithColinear
          } else {
            node.constructedBy = undefined
            node.constructedWithColinear = undefined
          }
          updateTimestampDraft(state, nodeId)
        }
      })
    },

    updateIntermediateWallThickness: (wallId: IntermediateWallId, thickness: Length) => {
      if (thickness <= 0) {
        throw new Error('Wall thickness must be greater than 0')
      }

      set(state => {
        if (!(wallId in state.intermediateWalls)) {
          throw new NotFoundError('Intermediate wall', wallId)
        }
        const wall = state.intermediateWalls[wallId]

        wall.thickness = thickness
        updateAllWallNodeGeometry(state, wall.perimeterId)
        updateTimestampDraft(state, wallId)
      })
    },

    updateIntermediateWallAssembly: (wallId: IntermediateWallId, assemblyId: InteriorWallAssemblyId) => {
      set(state => {
        if (!(wallId in state.intermediateWalls)) {
          throw new NotFoundError('Intermediate wall', wallId)
        }
        state.intermediateWalls[wallId].wallAssemblyId = assemblyId
        updateTimestampDraft(state, wallId)
      })
    },

    updateInnerWallNodeConstruction: (nodeId, constructedBy, constructedWithColinear) => {
      set(state => {
        if (!(nodeId in state.wallNodes)) {
          throw new NotFoundError('Wall node', nodeId)
        }

        const node = state.wallNodes[nodeId]
        if (node.type !== 'inner') {
          throw new InvalidOperationError('Only inner wall nodes have construction choices')
        }

        const geometry = state._wallNodeGeometry[nodeId]
        const option = { constructedBy, constructedWithColinear }
        const options = getInnerWallConstructionOptions({ ...node, ...geometry })
        if (!isInnerWallConstructionOption(option, options)) {
          throw new InvalidOperationError('Invalid inner wall node construction choice')
        }

        node.constructedBy = constructedBy
        node.constructedWithColinear = constructedWithColinear
        updateTimestampDraft(state, nodeId)
      })
    },

    updateIntermediateWallAlignment: (wallId: IntermediateWallId, start: WallAxis, end: WallAxis) => {
      set(state => {
        if (!(wallId in state.intermediateWalls)) {
          throw new NotFoundError('Intermediate wall', wallId)
        }
        const wall = state.intermediateWalls[wallId]

        wall.start.axis = start
        wall.end.axis = end

        updateAllWallNodeGeometry(state, wall.perimeterId)
        updateTimestampDraft(state, wallId)
      })
    },

    updateIntermediateWallAttachmentAxis: (wallId, endpoint, axis) => {
      set(state => {
        if (!(wallId in state.intermediateWalls)) throw new NotFoundError('Intermediate wall', wallId)
        const wall = state.intermediateWalls[wallId]

        const nodeId = endpoint === 'start' ? wall.start.nodeId : wall.end.nodeId
        if (!(nodeId in state.wallNodes)) throw new NotFoundError('Wall node', nodeId)
        const node = state.wallNodes[nodeId]

        const currentPosition: Vec2 =
          node.type === 'perimeter'
            ? scaleAddVec2(
                state._perimeterWallGeometry[node.wallId].insideLine.start,
                state._perimeterWallGeometry[node.wallId].direction,
                node.offsetFromCornerStart
              )
            : node.position

        const incidentLines: Line2D[] = []
        if (node.type === 'perimeter') {
          const perimeterGeometry = state._perimeterWallGeometry[node.wallId]
          incidentLines.push(lineFromSegment(perimeterGeometry.insideLine))
        }

        for (const incidentWallId of node.connectedWallIds) {
          const incidentWall = state.intermediateWalls[incidentWallId]
          const geometry = state._intermediateWallGeometry[incidentWallId]

          const incidentEndpoint = incidentWall.start.nodeId === nodeId ? 'start' : 'end'
          const incidentAxis =
            incidentWallId === wallId && incidentEndpoint === endpoint
              ? axis
              : incidentEndpoint === 'start'
                ? incidentWall.start.axis
                : incidentWall.end.axis
          const segment = incidentAxis === 'left' ? geometry.leftLine : geometry.rightLine
          incidentLines.push(lineFromSegment(segment))
        }

        const tolerance = 0.5
        const isOnAllLines = (position: Vec2) =>
          incidentLines.every(line => distanceToInfiniteLine(position, line) <= tolerance)

        let nextPosition: Vec2 | undefined
        if (isOnAllLines(currentPosition)) {
          nextPosition = copyVec2(currentPosition)
        } else if (incidentLines.length === 1) {
          nextPosition = projectPointOntoLine(currentPosition, incidentLines[0])
        } else {
          const candidates: Vec2[] = []
          for (let i = 0; i < incidentLines.length; i++) {
            for (let j = i + 1; j < incidentLines.length; j++) {
              const intersection = lineIntersection(incidentLines[i], incidentLines[j])
              if (intersection && isOnAllLines(intersection)) candidates.push(intersection)
            }
          }
          candidates.sort(
            (a, b) =>
              (a[0] - currentPosition[0]) ** 2 +
              (a[1] - currentPosition[1]) ** 2 -
              ((b[0] - currentPosition[0]) ** 2 + (b[1] - currentPosition[1]) ** 2)
          )
          if (candidates.length === 0) {
            throw new InvalidOperationError('Cannot change the wall attachment axis without changing its geometry')
          }
          nextPosition = candidates[0]
        }

        if (!isOnAllLines(nextPosition)) {
          throw new InvalidOperationError('Cannot change the wall attachment axis without changing its geometry')
        }

        const oldGeometry = new Map<IntermediateWallId, IntermediateWallGeometry>()
        for (const incidentWallId of node.connectedWallIds) {
          const geometry = state._intermediateWallGeometry[incidentWallId]
          oldGeometry.set(incidentWallId, {
            ...geometry,
            leftLine: { start: copyVec2(geometry.leftLine.start), end: copyVec2(geometry.leftLine.end) },
            rightLine: { start: copyVec2(geometry.rightLine.start), end: copyVec2(geometry.rightLine.end) },
            entityReferenceLine: {
              start: copyVec2(geometry.entityReferenceLine.start),
              end: copyVec2(geometry.entityReferenceLine.end)
            }
          })
        }

        if (node.type === 'inner') {
          node.position = copyVec2(nextPosition)
        } else {
          const perimeterGeometry = state._perimeterWallGeometry[node.wallId]
          node.offsetFromCornerStart = projectVec2(
            perimeterGeometry.insideLine.start,
            nextPosition,
            perimeterGeometry.direction
          )
        }
        if (endpoint === 'start') wall.start.axis = axis
        else wall.end.axis = axis

        updateAllWallNodeGeometry(state, wall.perimeterId)

        for (const [incidentWallId, previous] of oldGeometry) {
          const next = state._intermediateWallGeometry[incidentWallId]
          const points = [
            previous.leftLine.start,
            previous.leftLine.end,
            previous.rightLine.start,
            previous.rightLine.end,
            previous.entityReferenceLine.start,
            previous.entityReferenceLine.end
          ]
          const nextPoints = [
            next.leftLine.start,
            next.leftLine.end,
            next.rightLine.start,
            next.rightLine.end,
            next.entityReferenceLine.start,
            next.entityReferenceLine.end
          ]
          if (
            points.some(
              (point, index) => Math.hypot(point[0] - nextPoints[index][0], point[1] - nextPoints[index][1]) > tolerance
            )
          ) {
            throw new InvalidOperationError('Cannot change the wall attachment axis without changing its geometry')
          }
          updateTimestampDraft(state, incidentWallId)
        }
        updateTimestampDraft(state, nodeId)
      })
    },

    updateIntermediateWallAlignmentPreservingGeometry: (wallId, axis) => {
      const actions = get().actions
      const wall = actions.getIntermediateWallById(wallId)
      const previousStart = wall.start.axis
      const previousEnd = wall.end.axis

      try {
        actions.updateIntermediateWallAttachmentAxis(wallId, 'start', axis)
        actions.updateIntermediateWallAttachmentAxis(wallId, 'end', axis)
      } catch (error) {
        try {
          actions.updateIntermediateWallAttachmentAxis(wallId, 'start', previousStart)
          actions.updateIntermediateWallAttachmentAxis(wallId, 'end', previousEnd)
        } catch {
          // Preserve the original failure. The normal restoration path is
          // expected to succeed because it restores the captured geometry.
        }
        throw error
      }
    },

    addPerimeterWallNode: (perimeterId: PerimeterId, wallId: PerimeterWallId, offsetFromCornerStart: Length) => {
      let result!: PerimeterWallNodeWithGeometry
      set(state => {
        if (!(perimeterId in state.perimeters)) {
          throw new NotFoundError('Perimeter', perimeterId)
        }

        if (!(wallId in state.perimeterWalls)) {
          throw new NotFoundError('Perimeter wall', wallId)
        }

        const perimeter = state.perimeters[perimeterId]

        const nodeId = createWallNodeId()
        const node: WallNode = {
          id: nodeId,
          perimeterId,
          type: 'perimeter',
          wallId,
          offsetFromCornerStart,
          connectedWallIds: []
        }

        state.wallNodes[nodeId] = node
        perimeter.wallNodeIds.push(nodeId)
        state.perimeterWalls[wallId].wallNodeIds.push(nodeId)

        updateAllWallNodeGeometry(state, perimeterId)

        updateTimestampDraft(state, nodeId)
        const geometry = state._wallNodeGeometry[nodeId] as PerimeterWallNodeGeometry
        result = { ...node, ...geometry }
      })

      return result
    },

    addInnerWallNode: (perimeterId: PerimeterId, position: Vec2) => {
      let result!: InnerWallNodeWithGeometry
      set(state => {
        if (!(perimeterId in state.perimeters)) {
          throw new NotFoundError('Perimeter', perimeterId)
        }

        const perimeter = state.perimeters[perimeterId]

        const nodeId = createWallNodeId()
        const node: WallNode = {
          id: nodeId,
          perimeterId,
          type: 'inner',
          position: copyVec2(position),
          connectedWallIds: []
        }

        state.wallNodes[nodeId] = node
        perimeter.wallNodeIds.push(nodeId)

        updateAllWallNodeGeometry(state, perimeterId)

        updateTimestampDraft(state, nodeId)
        const geometry = state._wallNodeGeometry[nodeId] as InnerWallNodeGeometry
        result = { ...node, ...geometry }
      })

      return result
    },

    splitIntermediateWallAtPoint: (wallId: IntermediateWallId, point: Vec2) => {
      let newNodeId!: WallNodeId
      set(state => {
        if (!(wallId in state.intermediateWalls)) {
          throw new NotFoundError('Intermediate wall', wallId)
        }

        const originalWall = state.intermediateWalls[wallId]
        const originalGeometry = state._intermediateWallGeometry[wallId]
        const perimeter = state.perimeters[originalWall.perimeterId]

        const splitAxis = originalWall.start.axis === originalWall.end.axis ? originalWall.start.axis : 'left'
        const splitLine = splitAxis === 'left' ? originalGeometry.leftLine : originalGeometry.rightLine
        const projectedPoint = projectPointOntoLine(point, lineFromSegment(splitLine))
        const splitPosition = projectVec2(
          originalGeometry.entityReferenceLine.start,
          projectedPoint,
          originalGeometry.direction
        )

        if (splitPosition <= 0 || splitPosition >= originalGeometry.wallLength) {
          throw new InvalidOperationError('Intermediate wall split point must be inside the wall')
        }

        const wallAId = createIntermediateWallId()
        const wallBId = createIntermediateWallId()
        const firstWallEntities: WallEntityId[] = []
        const secondWallEntities: WallEntityId[] = []
        const entityWall = new Map<WallEntityId, IntermediateWallId>()
        for (const entityId of originalWall.entityIds) {
          let entity
          if (isOpeningId(entityId)) {
            if (!(entityId in state.openings)) {
              throw new NotFoundError('Wall entity', entityId)
            }
            entity = state.openings[entityId]
          } else {
            if (!(entityId in state.wallPosts)) {
              throw new NotFoundError('Wall entity', entityId)
            }
            entity = state.wallPosts[entityId]
          }
          const entityStart = entity.centerOffsetFromWallStart - entity.width / 2
          const entityEnd = entity.centerOffsetFromWallStart + entity.width / 2
          if (entityStart < splitPosition && entityEnd > splitPosition) {
            throw new InvalidOperationError('Cannot split intermediate wall through a wall entity')
          }
          if (entityEnd <= splitPosition) {
            firstWallEntities.push(entityId)
            entity.wallId = wallAId
            entityWall.set(entityId, wallAId)
          } else {
            secondWallEntities.push(entityId)
            entity.wallId = wallBId
            entity.centerOffsetFromWallStart -= splitPosition
            entityWall.set(entityId, wallBId)
          }
        }

        const newNodeIdInner = createWallNodeId()
        const newNode: WallNode = {
          id: newNodeIdInner,
          perimeterId: originalWall.perimeterId,
          type: 'inner',
          position: projectedPoint,
          constructedBy: wallAId,
          constructedWithColinear: wallBId,
          connectedWallIds: [wallAId, wallBId]
        }
        state.wallNodes[newNodeIdInner] = newNode
        perimeter.wallNodeIds.push(newNodeIdInner)

        const wallA: IntermediateWall = {
          id: wallAId,
          perimeterId: originalWall.perimeterId,
          entityIds: firstWallEntities,
          start: originalWall.start,
          end: { nodeId: newNodeIdInner, axis: splitAxis },
          thickness: originalWall.thickness,
          wallAssemblyId: originalWall.wallAssemblyId
        }

        const wallB: IntermediateWall = {
          id: wallBId,
          perimeterId: originalWall.perimeterId,
          entityIds: secondWallEntities,
          start: { nodeId: newNodeIdInner, axis: splitAxis },
          end: originalWall.end,
          thickness: originalWall.thickness,
          wallAssemblyId: originalWall.wallAssemblyId
        }

        state.intermediateWalls[wallAId] = wallA
        state.intermediateWalls[wallBId] = wallB

        perimeter.intermediateWallIds.push(wallAId)
        perimeter.intermediateWallIds.push(wallBId)
        perimeter.intermediateWallIds = perimeter.intermediateWallIds.filter(id => id !== wallId)

        const originalStartNode = state.wallNodes[originalWall.start.nodeId]
        originalStartNode.connectedWallIds = originalStartNode.connectedWallIds
          .filter(id => id !== wallId)
          .concat(wallAId)

        const originalEndNode = state.wallNodes[originalWall.end.nodeId]
        originalEndNode.connectedWallIds = originalEndNode.connectedWallIds.filter(id => id !== wallId).concat(wallBId)

        delete state.intermediateWalls[wallId]
        delete state._intermediateWallGeometry[wallId]
        removeTimestampDraft(state, wallId)

        updateTimestampDraft(state, wallAId)
        updateTimestampDraft(state, wallBId)
        updateTimestampDraft(state, newNodeIdInner)

        updateAllWallNodeGeometry(state, originalWall.perimeterId)

        const firstGeometry = state._intermediateWallGeometry[wallAId]
        const secondGeometry = state._intermediateWallGeometry[wallBId]
        handleIntermediateWallSplitConstraintsDraft(state, {
          originalWallId: wallId,
          firstWallId: wallAId,
          secondWallId: wallBId,
          splitNodeId: newNodeIdInner,
          originalStartNodeId: originalWall.start.nodeId,
          originalEndNodeId: originalWall.end.nodeId,
          firstLengths: { left: firstGeometry.leftLength, right: firstGeometry.rightLength },
          secondLengths: { left: secondGeometry.leftLength, right: secondGeometry.rightLength },
          entityWall
        })

        newNodeId = newNodeIdInner
      })

      return newNodeId
    },

    mergeIntermediateWalls: (nodeId: WallNodeId): IntermediateWallId | null => {
      let mergedWallId: IntermediateWallId | null = null
      set(state => {
        if (!(nodeId in state.wallNodes)) {
          throw new NotFoundError('Wall node', nodeId)
        }

        const node = state.wallNodes[nodeId]
        if (node.type !== 'inner') return
        if (node.connectedWallIds.length !== 2) return

        const wallA = state.intermediateWalls[node.connectedWallIds[0]]
        const wallB = state.intermediateWalls[node.connectedWallIds[1]]

        if (!wallA || !wallB) return // eslint-disable-line @typescript-eslint/no-unnecessary-condition

        const geomA = state._intermediateWallGeometry[wallA.id]
        const geomB = state._intermediateWallGeometry[wallB.id]

        if (Math.abs(dotVec2(geomA.direction, geomB.direction)) < 0.999) return

        const reverseA = wallA.end.nodeId !== nodeId
        const reverseB = wallB.start.nodeId !== nodeId
        const mergedThickness = Math.max(wallA.thickness, wallB.thickness)

        const newId = createIntermediateWallId()
        for (const entityId of wallA.entityIds) {
          const entity = isOpeningId(entityId) ? state.openings[entityId] : state.wallPosts[entityId]
          if (!(entityId in (isOpeningId(entityId) ? state.openings : state.wallPosts))) {
            throw new NotFoundError('Wall entity', entityId)
          }
          const offset = reverseA
            ? geomA.wallLength - entity.centerOffsetFromWallStart
            : entity.centerOffsetFromWallStart
          entity.wallId = newId
          entity.centerOffsetFromWallStart = offset
          updateTimestampDraft(state, entityId)
        }
        for (const entityId of wallB.entityIds) {
          const entity = isOpeningId(entityId) ? state.openings[entityId] : state.wallPosts[entityId]
          if (!(entityId in (isOpeningId(entityId) ? state.openings : state.wallPosts))) {
            throw new NotFoundError('Wall entity', entityId)
          }
          const offset =
            geomA.wallLength +
            (reverseB ? geomB.wallLength - entity.centerOffsetFromWallStart : entity.centerOffsetFromWallStart)
          entity.wallId = newId
          entity.centerOffsetFromWallStart = offset
          updateTimestampDraft(state, entityId)
        }

        const startAttachment = reverseA ? wallA.end : wallA.start
        const endAttachment = reverseB ? wallB.start : wallB.end
        const mergedWall: IntermediateWall = {
          id: newId,
          perimeterId: wallA.perimeterId,
          entityIds: [...wallA.entityIds, ...wallB.entityIds],
          start: startAttachment,
          end: endAttachment,
          thickness: mergedThickness,
          wallAssemblyId: wallA.wallAssemblyId
        }

        const perimeter = state.perimeters[wallA.perimeterId]

        perimeter.intermediateWallIds = perimeter.intermediateWallIds
          .filter(id => id !== wallA.id && id !== wallB.id)
          .concat(newId)

        const startNode = state.wallNodes[startAttachment.nodeId]
        startNode.connectedWallIds = startNode.connectedWallIds
          .filter(id => id !== wallA.id && id !== wallB.id)
          .concat(newId)

        const endNode = state.wallNodes[endAttachment.nodeId]
        endNode.connectedWallIds = endNode.connectedWallIds
          .filter(id => id !== wallA.id && id !== wallB.id)
          .concat(newId)

        state.intermediateWalls[newId] = mergedWall

        delete state.intermediateWalls[wallA.id]
        delete state._intermediateWallGeometry[wallA.id]
        delete state.intermediateWalls[wallB.id]
        delete state._intermediateWallGeometry[wallB.id]
        delete state.wallNodes[nodeId]
        delete state._wallNodeGeometry[nodeId]

        perimeter.wallNodeIds = perimeter.wallNodeIds.filter(id => id !== nodeId)

        removeTimestampDraft(state, wallA.id, wallB.id, nodeId)
        updateTimestampDraft(state, newId)

        updateAllWallNodeGeometry(state, wallA.perimeterId)

        const mergedGeometry = state._intermediateWallGeometry[newId]
        handleIntermediateWallMergeConstraintsDraft(state, {
          firstWallId: wallA.id,
          secondWallId: wallB.id,
          mergedWallId: newId,
          removedNodeId: nodeId,
          mergedLengths: { left: mergedGeometry.leftLength, right: mergedGeometry.rightLength }
        })

        mergedWallId = newId
      })

      return mergedWallId
    },

    removeWallNode: (nodeId: WallNodeId) => {
      set(state => {
        if (!(nodeId in state.wallNodes)) return

        const node = state.wallNodes[nodeId]

        delete state.wallNodes[nodeId]
        delete state._wallNodeGeometry[nodeId]

        cleanUpOrphaned(state)
        removeTimestampDraft(state, nodeId)
        removeConstraintsForEntityDraft(state, nodeId)

        updateAllWallNodeGeometry(state, node.perimeterId)
      })
    },

    updateInnerWallNodePosition: (nodeId: WallNodeId, position: Vec2) => {
      set(state => {
        if (!(nodeId in state.wallNodes)) {
          throw new NotFoundError('Wall node', nodeId)
        }

        const node = state.wallNodes[nodeId]
        if (node.type !== 'inner') {
          throw new Error('Cannot update position of perimeter wall node')
        }

        node.position = copyVec2(position)

        const connectedWalls = Object.values(state.intermediateWalls).filter(
          wall => wall.start.nodeId === nodeId || wall.end.nodeId === nodeId
        )

        for (const wall of connectedWalls) {
          updateTimestampDraft(state, wall.id)
        }

        updateAllWallNodeGeometry(state, node.perimeterId)
        updateTimestampDraft(state, nodeId)
      })
    },

    updatePerimeterWallNodeOffset: (nodeId: WallNodeId, offsetFromCornerStart: Length) => {
      set(state => {
        if (!(nodeId in state.wallNodes)) {
          throw new NotFoundError('Wall node', nodeId)
        }

        const node = state.wallNodes[nodeId]
        if (node.type !== 'perimeter') {
          throw new Error('Cannot update offset of inner wall node')
        }

        node.offsetFromCornerStart = offsetFromCornerStart

        const connectedWalls = Object.values(state.intermediateWalls).filter(
          wall => wall.start.nodeId === nodeId || wall.end.nodeId === nodeId
        )

        for (const wall of connectedWalls) {
          updateTimestampDraft(state, wall.id)
        }

        updateAllWallNodeGeometry(state, node.perimeterId)
        updateTimestampDraft(state, nodeId)
      })
    },

    applyGcsWallNodePositions: (perimeterId, positions) => {
      set(state => {
        if (!(perimeterId in state.perimeters)) {
          throw new NotFoundError('Perimeter', perimeterId)
        }

        for (const [nodeId, position] of Object.entries(positions) as [WallNodeId, Vec2][]) {
          if (!(nodeId in state.wallNodes)) throw new NotFoundError('Wall node', nodeId)
          const node = state.wallNodes[nodeId]
          if (node.perimeterId !== perimeterId) {
            throw new Error(`Wall node "${nodeId}" does not belong to perimeter "${perimeterId}"`)
          }
          if (!Number.isFinite(position[0]) || !Number.isFinite(position[1])) {
            throw new Error(`Invalid GCS position for wall node "${nodeId}"`)
          }

          if (node.type === 'inner') {
            node.position = copyVec2(position)
          } else {
            const wallGeometry = state._perimeterWallGeometry[node.wallId]
            node.offsetFromCornerStart = projectVec2(wallGeometry.insideLine.start, position, wallGeometry.direction)
          }

          const connectedWalls = Object.values(state.intermediateWalls).filter(
            wall => wall.start.nodeId === nodeId || wall.end.nodeId === nodeId
          )
          for (const wall of connectedWalls) updateTimestampDraft(state, wall.id)
          updateTimestampDraft(state, nodeId)
        }

        updateAllWallNodeGeometry(state, perimeterId)
      })
    },

    getIntermediateWallById: (wallId: IntermediateWallId) => {
      const state = get()
      if (!(wallId in state.intermediateWalls)) {
        throw new NotFoundError('Intermediate wall', wallId)
      }
      const wall = state.intermediateWalls[wallId]
      const geometry = state._intermediateWallGeometry[wallId]
      return { ...wall, ...geometry }
    },

    getIntermediateWallsByPerimeter: (perimeterId: PerimeterId) => {
      const state = get()
      if (!(perimeterId in state.perimeters)) {
        throw new NotFoundError('Perimeter', perimeterId)
      }
      const perimeter = state.perimeters[perimeterId]
      return perimeter.intermediateWallIds.map(wallId => {
        if (!(wallId in state.intermediateWalls)) {
          throw new NotFoundError('Intermediate wall', wallId)
        }
        const wall = state.intermediateWalls[wallId]
        const geometry = state._intermediateWallGeometry[wallId]
        return { ...wall, ...geometry }
      })
    },

    getAllIntermediateWalls: () => {
      const state = get()
      return Object.values(state.intermediateWalls).map(wall => ({
        ...wall,
        ...state._intermediateWallGeometry[wall.id]
      }))
    },

    getWallNodeById: (nodeId: WallNodeId) => {
      const state = get()
      if (!(nodeId in state.wallNodes)) {
        throw new NotFoundError('Wall node', nodeId)
      }
      const node = state.wallNodes[nodeId]
      const geometry = state._wallNodeGeometry[nodeId]

      return node.type === 'inner'
        ? { ...node, ...(geometry as InnerWallNodeGeometry) }
        : { ...node, ...(geometry as PerimeterWallNodeGeometry) }
    },

    getWallNodesByPerimeter: (perimeterId: PerimeterId) => {
      const state = get()
      if (!(perimeterId in state.perimeters)) {
        throw new NotFoundError('Perimeter', perimeterId)
      }
      const perimeter = state.perimeters[perimeterId]
      return perimeter.wallNodeIds.map(nodeId => {
        if (!(nodeId in state.wallNodes)) {
          throw new NotFoundError('Wall node', nodeId)
        }
        const node = state.wallNodes[nodeId]
        const geometry = state._wallNodeGeometry[nodeId]
        return node.type === 'inner'
          ? { ...node, ...(geometry as InnerWallNodeGeometry) }
          : { ...node, ...(geometry as PerimeterWallNodeGeometry) }
      })
    },

    getAllWallNodes: () => {
      const state = get()
      return Object.values(state.wallNodes).map(node => {
        const geometry = state._wallNodeGeometry[node.id]
        return node.type === 'inner'
          ? { ...node, ...(geometry as InnerWallNodeGeometry) }
          : { ...node, ...(geometry as PerimeterWallNodeGeometry) }
      })
    }
  }
})
