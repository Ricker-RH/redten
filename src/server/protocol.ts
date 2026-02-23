import { CardId, GameEvent, PlayerActionType } from "../domain/types"
import { GameRoom } from "../room/gameRoom"

export const MESSAGE_TYPES = {
  JOIN_ROOM: "JOIN_ROOM",
  PLAYER_ACTION: "PLAYER_ACTION",
  RECONNECT: "RECONNECT",
  PING: "PING",
  READY: "READY",
  START_GAME: "START_GAME",
  PONG: "PONG",
  GAME_EVENTS: "GAME_EVENTS",
  ROOM_SNAPSHOT: "ROOM_SNAPSHOT",
  ERROR: "ERROR",
} as const

export type ClientMessage =
  | JoinRoomMessage
  | PlayerActionMessage
  | ReconnectMessage
  | ReadyMessage
  | StartGameMessage
  | PingMessage

export interface JoinRoomMessage {
  type: typeof MESSAGE_TYPES.JOIN_ROOM
  roomId: string
}

export interface PlayerActionPayload {
  type: PlayerActionType
  cardIds: CardId[]
}

export interface PlayerActionMessage {
  type: typeof MESSAGE_TYPES.PLAYER_ACTION
  roomId: string
  action: PlayerActionPayload
}

export interface ReconnectMessage {
  type: typeof MESSAGE_TYPES.RECONNECT
  roomId: string
  lastEventId?: number
}

export interface ReadyMessage {
  type: typeof MESSAGE_TYPES.READY
  roomId: string
  ready: boolean
}

export interface StartGameMessage {
  type: typeof MESSAGE_TYPES.START_GAME
  roomId: string
}

export interface PingMessage {
  type: typeof MESSAGE_TYPES.PING
}

export interface PongMessage {
  type: typeof MESSAGE_TYPES.PONG
}

export type ServerMessage =
  | GameEventsMessage
  | RoomSnapshotMessage
  | ErrorMessage
  | PongMessage

export interface GameEventsMessage {
  type: typeof MESSAGE_TYPES.GAME_EVENTS
  roomId: string
  events: GameEvent[]
}

export interface RoomSnapshotMessage {
  type: typeof MESSAGE_TYPES.ROOM_SNAPSHOT
  roomId: string
  room: GameRoom
}

export interface ErrorMessage {
  type: typeof MESSAGE_TYPES.ERROR
  code: string
  message: string
}
