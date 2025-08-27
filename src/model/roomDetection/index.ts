// Main exports for the room detection system
export { RoomDetectionEngine } from './RoomDetectionEngine'
export {
  RoomDetectionService,
  type IRoomDetectionService,
  defaultRoomDetectionService
} from './RoomDetectionService'
export {
  type RoomDetectionResult,
  type RoomDefinition,
  type RoomDetectionContext,
  type RoomDetectionConfig,
  type RoomValidationResult,
  type WallRoomAssignment,
  type PointRoomAssignment,
  type WallLoopTrace,
  type LoopDirection,
  type RoomSide,
  DEFAULT_ROOM_DETECTION_CONFIG
} from './types'
