import { CardId, GameEvent, PlayerActionType } from "../domain/types"
import { GameRoom } from "../room/gameRoom"
import { SettlementResult } from "../rules/settlementRule"

export const MESSAGE_TYPES = {
  JOIN_ROOM: "JOIN_ROOM",
  PLAYER_ACTION: "PLAYER_ACTION",
  RECONNECT: "RECONNECT",
  PING: "PING",
  READY: "READY",
  START_GAME: "START_GAME",
  START_NEXT_HAND: "START_NEXT_HAND",
  PLAYER_ACTION_RESULT: "PLAYER_ACTION_RESULT",
  PONG: "PONG",
  GAME_EVENTS: "GAME_EVENTS",
  ROOM_SNAPSHOT: "ROOM_SNAPSHOT",
  CHAT: "CHAT",
  VOICE_CHAT: "VOICE_CHAT",
  ERROR: "ERROR",
} as const

export type ClientMessage =
  | JoinRoomMessage
  | PlayerActionMessage
  | ReconnectMessage
  | ReadyMessage
  | StartGameMessage
  | StartNextHandMessage
  | PingMessage
  | ChatMessage
  | VoiceChatMessage

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

export interface StartNextHandMessage {
  type: typeof MESSAGE_TYPES.START_NEXT_HAND
  roomId: string
}

export interface PlayerActionResultPayload {
  accepted: boolean
  action: {
    type: PlayerActionType
  }
  settlement?: SettlementResult
}

export interface PlayerActionResultMessage {
  type: typeof MESSAGE_TYPES.PLAYER_ACTION_RESULT
  roomId: string
  playerId: string
  payload: PlayerActionResultPayload
}

export interface PingMessage {
  type: typeof MESSAGE_TYPES.PING
}

export interface ChatMessage {
  type: typeof MESSAGE_TYPES.CHAT
  roomId: string
  text: string
}

export interface VoiceChatMessage {
  type: typeof MESSAGE_TYPES.VOICE_CHAT
  roomId: string
  audio: string
  mimeType: string
  durationMs: number
}

export interface PongMessage {
  type: typeof MESSAGE_TYPES.PONG
}

export type ServerMessage =
  | GameEventsMessage
  | RoomSnapshotMessage
  | ErrorMessage
  | PongMessage
  | PlayerActionResultMessage
  | ChatBroadcastMessage
  | VoiceChatBroadcastMessage

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

export interface ChatBroadcastMessage {
  type: typeof MESSAGE_TYPES.CHAT
  roomId: string
  playerId: string
  text: string
  timestamp: number
}

export interface VoiceChatBroadcastMessage {
  type: typeof MESSAGE_TYPES.VOICE_CHAT
  roomId: string
  playerId: string
  audio: string
  mimeType: string
  durationMs: number
  timestamp: number
}
