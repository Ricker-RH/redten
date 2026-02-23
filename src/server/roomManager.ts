import { GameEvent, PlayerAction, PlayerActionType, PlayerId } from "../domain/types"
import { SettlementResult } from "../rules/settlementRule"
import {
  GameRoom,
  RoomActionResult,
  applyPlayerAction,
  createRoom,
  joinRoom,
  startGameInRoom,
  startNextHand as startNextHandInRoom,
} from "../room/gameRoom"
import {
  ClientMessage,
  ErrorMessage,
  GameEventsMessage,
  JoinRoomMessage,
  MESSAGE_TYPES,
  PlayerActionMessage,
  ReadyMessage,
  ReconnectMessage,
  RoomSnapshotMessage,
  StartGameMessage,
  StartNextHandMessage,
} from "./protocol"
import { Logger } from "./logger"

export interface WebSocketLike {
  send(data: string): void
}

export interface ClientConnection {
  socket: WebSocketLike
  playerId: PlayerId
  roomId: string
}

class ConnectionRegistry {
  private connectionsByPlayer = new Map<PlayerId, ClientConnection>()

  private connectionsBySocket = new Map<WebSocketLike, PlayerId>()

  private roomConnections = new Map<string, Set<PlayerId>>()

  registerConnection(socket: WebSocketLike, playerId: PlayerId): void {
    const existing = this.connectionsByPlayer.get(playerId)
    const roomId = existing ? existing.roomId : ""
    const connection: ClientConnection = {
      socket,
      playerId,
      roomId,
    }
    this.connectionsByPlayer.set(playerId, connection)
    this.connectionsBySocket.set(socket, playerId)
  }

  bindPlayerToRoom(socket: WebSocketLike, playerId: PlayerId, roomId: string): void {
    const existing = this.connectionsByPlayer.get(playerId)
    if (existing && existing.roomId && existing.roomId !== roomId) {
      const prevSet = this.roomConnections.get(existing.roomId)
      if (prevSet) {
        prevSet.delete(playerId)
      }
    }
    const connection: ClientConnection = {
      socket,
      playerId,
      roomId,
    }
    this.connectionsByPlayer.set(playerId, connection)
    this.connectionsBySocket.set(socket, playerId)
    let set = this.roomConnections.get(roomId)
    if (!set) {
      set = new Set<PlayerId>()
      this.roomConnections.set(roomId, set)
    }
    set.add(playerId)
  }

  unbindSocket(socket: WebSocketLike): { playerId: PlayerId | null; roomId: string | null } {
    const playerId = this.connectionsBySocket.get(socket)
    if (!playerId) {
      return { playerId: null, roomId: null }
    }
    this.connectionsBySocket.delete(socket)
    const connection = this.connectionsByPlayer.get(playerId)
    this.connectionsByPlayer.delete(playerId)
    if (!connection || !connection.roomId) {
      return { playerId, roomId: null }
    }
    const roomId = connection.roomId
    const set = this.roomConnections.get(roomId)
    if (set) {
      set.delete(playerId)
    }
    return { playerId, roomId }
  }

  getPlayerIdForSocket(socket: WebSocketLike): PlayerId | null {
    const playerId = this.connectionsBySocket.get(socket)
    return playerId ?? null
  }

  getRoomPlayers(roomId: string): Iterable<PlayerId> {
    const set = this.roomConnections.get(roomId)
    if (!set) {
      return []
    }
    return set.values()
  }

  getConnection(playerId: PlayerId): ClientConnection | null {
    const connection = this.connectionsByPlayer.get(playerId)
    if (!connection) {
      return null
    }
    return connection
  }

  hasConnections(roomId: string): boolean {
    const set = this.roomConnections.get(roomId)
    if (!set) {
      return false
    }
    return set.size > 0
  }
}

class RoomRegistry {
  private rooms = new Map<string, GameRoom>()

  getOrCreateRoom(roomId: string): GameRoom {
    const existing = this.rooms.get(roomId)
    if (existing) {
      return existing
    }
    const room = createRoom(roomId)
    this.rooms.set(roomId, room)
    return room
  }

  getRoom(roomId: string): GameRoom | undefined {
    return this.rooms.get(roomId)
  }

  setRoom(roomId: string, room: GameRoom): void {
    this.rooms.set(roomId, room)
  }

  deleteRoom(roomId: string): void {
    this.rooms.delete(roomId)
  }

  entries(): Iterable<[string, GameRoom]> {
    return this.rooms.entries()
  }
}

class GameGateway {
  constructor(
    private rooms: RoomRegistry,
    private connections: ConnectionRegistry,
  ) {}

  joinRoom(socket: WebSocketLike, message: JoinRoomMessage): { room: GameRoom; roomId: string; playerId: PlayerId } | { errorCode: string; errorMessage: string } {
    const playerId = this.connections.getPlayerIdForSocket(socket)
    if (!playerId) {
      return {
        errorCode: "PLAYER_NOT_BOUND",
        errorMessage: "Player not bound to socket",
      }
    }
    const roomId = message.roomId
    this.connections.bindPlayerToRoom(socket, playerId, roomId)
    const room = this.rooms.getOrCreateRoom(roomId)
    let nextRoom = room
    if (!room.players.includes(playerId)) {
      nextRoom = joinRoom(room, playerId)
      this.rooms.setRoom(roomId, nextRoom)
    }
    return {
      room: nextRoom,
      roomId,
      playerId,
    }
  }

  toggleReady(socket: WebSocketLike, message: ReadyMessage): { room: GameRoom; roomId: string; playerId: PlayerId } | { errorCode: string; errorMessage: string } {
    const playerId = this.connections.getPlayerIdForSocket(socket)
    if (!playerId) {
      return {
        errorCode: "PLAYER_NOT_BOUND",
        errorMessage: "Player not bound to socket",
      }
    }
    const roomId = message.roomId
    const room = this.rooms.getRoom(roomId)
    if (!room) {
      return {
        errorCode: "ROOM_NOT_FOUND",
        errorMessage: "Room not found",
      }
    }
    if (!room.players.includes(playerId)) {
      return {
        errorCode: "PLAYER_NOT_IN_ROOM",
        errorMessage: "Player not in room",
      }
    }
    const set = new Set<PlayerId>(room.readyPlayerIds)
    if (message.ready) {
      set.add(playerId)
    } else {
      set.delete(playerId)
    }
    const nextRoom: GameRoom = {
      ...room,
      readyPlayerIds: Array.from(set),
    }
    this.rooms.setRoom(roomId, nextRoom)
    return {
      room: nextRoom,
      roomId,
      playerId,
    }
  }

  startGame(socket: WebSocketLike, message: StartGameMessage): { room: GameRoom; roomId: string; playerId: PlayerId } | { errorCode: string; errorMessage: string } {
    const playerId = this.connections.getPlayerIdForSocket(socket)
    if (!playerId) {
      return {
        errorCode: "PLAYER_NOT_BOUND",
        errorMessage: "Player not bound to socket",
      }
    }
    const roomId = message.roomId
    const room = this.rooms.getRoom(roomId)
    if (!room) {
      return {
        errorCode: "ROOM_NOT_FOUND",
        errorMessage: "Room not found",
      }
    }
    if (room.hostId !== playerId) {
      return {
        errorCode: "NOT_HOST",
        errorMessage: "Only host can start game",
      }
    }
    if (room.players.length !== room.maxPlayers) {
      return {
        errorCode: "PLAYER_COUNT_NOT_MATCH",
        errorMessage: "Player count does not match maxPlayers",
      }
    }
    const readySet = new Set<PlayerId>(room.readyPlayerIds)
    const allReady = room.players.every(id => readySet.has(id))
    if (!allReady) {
      return {
        errorCode: "PLAYERS_NOT_READY",
        errorMessage: "Not all players are ready",
      }
    }
    if (room.status !== "FULL") {
      return {
        errorCode: "ROOM_NOT_READY",
        errorMessage: "Room is not ready to start",
      }
    }
    if (room.gameState) {
      return {
        errorCode: "GAME_ALREADY_STARTED",
        errorMessage: "Game already started",
      }
    }
    const nextRoom = startGameInRoom(room)
    this.rooms.setRoom(roomId, nextRoom)
    return {
      room: nextRoom,
      roomId,
      playerId,
    }
  }

  startNextHand(socket: WebSocketLike, message: StartNextHandMessage): { room: GameRoom; roomId: string; playerId: PlayerId } | { errorCode: string; errorMessage: string } {
    const playerId = this.connections.getPlayerIdForSocket(socket)
    if (!playerId) {
      return {
        errorCode: "PLAYER_NOT_BOUND",
        errorMessage: "Player not bound to socket",
      }
    }
    const roomId = message.roomId
    const room = this.rooms.getRoom(roomId)
    if (!room) {
      return {
        errorCode: "ROOM_NOT_FOUND",
        errorMessage: "Room not found",
      }
    }
    if (room.hostId !== playerId) {
      return {
        errorCode: "NOT_HOST",
        errorMessage: "Only host can start next hand",
      }
    }
    if (!room.gameState || room.gameState.phase !== "WAITING") {
      return {
        errorCode: "GAME_NOT_FINISHED",
        errorMessage: "Game is not finished yet",
      }
    }
    const nextRoom = startNextHandInRoom(room)
    this.rooms.setRoom(roomId, nextRoom)
    return {
      room: nextRoom,
      roomId,
      playerId,
    }
  }

  applyPlayerAction(
    socket: WebSocketLike,
    message: PlayerActionMessage,
  ): {
    roomId: string
    events: GameEvent[]
    playerId: PlayerId
    accepted: boolean
    actionType: PlayerActionType
    settlement: SettlementResult | null
  } | null {
    const playerId = this.connections.getPlayerIdForSocket(socket)
    if (!playerId) {
      return null
    }
    const roomId = message.roomId
    const room = this.rooms.getRoom(roomId)
    if (!room || !room.gameState) {
      return null
    }
    const seat = room.gameState.seats.find(s => s.playerId === playerId)
    if (!seat) {
      return null
    }
    const playerAction: PlayerAction = {
      playerId,
      seatId: seat.seatId,
      type: message.action.type,
      cardIds: message.action.cardIds,
      timestamp: Date.now(),
    }
    const result: RoomActionResult = applyPlayerAction(room, playerAction)
    this.rooms.setRoom(roomId, result.room)
    return {
      roomId,
      events: result.events,
      playerId,
      accepted: result.accepted,
      actionType: playerAction.type,
      settlement: result.settlement,
    }
  }

  prepareReconnect(socket: WebSocketLike, message: ReconnectMessage): { room: GameRoom; roomId: string; playerId: PlayerId } | { errorCode: string; errorMessage: string } {
    const playerId = this.connections.getPlayerIdForSocket(socket)
    if (!playerId) {
      return {
        errorCode: "PLAYER_NOT_BOUND",
        errorMessage: "Player not bound to socket",
      }
    }
    const roomId = message.roomId
    const room = this.rooms.getRoom(roomId)
    if (!room) {
      return {
        errorCode: "ROOM_NOT_FOUND",
        errorMessage: "Room not found",
      }
    }
    if (!room.players.includes(playerId)) {
      return {
        errorCode: "PLAYER_NOT_IN_ROOM",
        errorMessage: "Player not in room",
      }
    }
    this.connections.bindPlayerToRoom(socket, playerId, roomId)
    return {
      room,
      roomId,
      playerId,
    }
  }

}

export class RoomManager {
  private readonly connections: ConnectionRegistry

  private readonly rooms: RoomRegistry

  private readonly gateway: GameGateway

  private eventSeq = 0

  private roomEventLog = new Map<string, GameEvent[]>()

  constructor(private logger: Logger) {
    this.connections = new ConnectionRegistry()
    this.rooms = new RoomRegistry()
    this.gateway = new GameGateway(this.rooms, this.connections)
  }

  registerConnection(socket: WebSocketLike, playerId: PlayerId): void {
    this.connections.registerConnection(socket, playerId)
    this.logger.log({
      level: "INFO",
      timestamp: Date.now(),
      message: "registerConnection",
      playerId,
      result: "success",
    })
  }

  handleRawMessage(socket: WebSocketLike, rawData: string): void {
    let message: ClientMessage
    try {
      message = JSON.parse(rawData)
    } catch {
      this.logger.log({
        level: "ERROR",
        timestamp: Date.now(),
        message: "parseMessage",
        result: "error",
        details: {
          raw: rawData,
        },
      })
      this.sendError(socket, "INVALID_JSON", "Invalid JSON message")
      return
    }
    try {
      if (message.type === MESSAGE_TYPES.JOIN_ROOM) {
        this.handleJoinRoom(socket, message)
      } else if (message.type === MESSAGE_TYPES.PLAYER_ACTION) {
        this.handlePlayerAction(socket, message)
      } else if (message.type === MESSAGE_TYPES.RECONNECT) {
        this.handleReconnect(socket, message)
      } else if (message.type === MESSAGE_TYPES.PING) {
        this.sendPong(socket)
      } else if (message.type === MESSAGE_TYPES.READY) {
        this.handleReady(socket, message)
      } else if (message.type === MESSAGE_TYPES.START_GAME) {
        this.handleStartGame(socket, message)
      } else if (message.type === MESSAGE_TYPES.START_NEXT_HAND) {
        this.handleStartNextHand(socket, message)
      }
    } catch (err) {
      const details =
        err && typeof err === "object"
          ? { name: (err as Error).name, message: (err as Error).message }
          : { message: String(err) }
      this.logger.log({
        level: "ERROR",
        timestamp: Date.now(),
        message: "handleRawMessageUnhandledError",
        result: "error",
        details: {
          ...details,
        },
      })
      this.sendError(socket, "INTERNAL_ERROR", "Internal server error")
    }
  }

  handleDisconnect(socket: WebSocketLike): void {
    const result = this.connections.unbindSocket(socket)
    if (!result.playerId) {
      return
    }
    this.logger.log({
      level: "INFO",
      timestamp: Date.now(),
      message: "handleDisconnect",
      playerId: result.playerId,
      roomId: result.roomId || undefined,
      result: "success",
    })
    if (result.roomId) {
      this.tryRecycleRoom(result.roomId)
    }
  }

  startServerLoop(): void {
    setInterval(() => {
      const timestamp = Date.now()
      for (const [roomId] of this.rooms.entries()) {
        this.logger.log({
          level: "INFO",
          timestamp,
          message: "tick",
          roomId,
          result: "success",
        })
      }
    }, 1000)
  }

  private handleJoinRoom(socket: WebSocketLike, message: JoinRoomMessage): void {
    const now = Date.now()
    const result = this.gateway.joinRoom(socket, message)
    if ("errorCode" in result) {
      this.logger.log({
        level: "ERROR",
        timestamp: now,
        message: "handleJoinRoom",
        messageType: MESSAGE_TYPES.JOIN_ROOM,
        result: "error",
        details: {
          code: result.errorCode,
        },
      })
      this.sendError(socket, result.errorCode, result.errorMessage)
      return
    }
    this.broadcastRoomSnapshot(result.roomId, result.room)
    this.logger.log({
      level: "INFO",
      timestamp: now,
      message: "handleJoinRoom",
      roomId: result.roomId,
      playerId: result.playerId,
      messageType: MESSAGE_TYPES.JOIN_ROOM,
      result: "success",
    })
  }

  private handlePlayerAction(socket: WebSocketLike, message: PlayerActionMessage): void {
    const now = Date.now()
    const result = this.gateway.applyPlayerAction(socket, message)
    if (!result) {
      this.logger.log({
        level: "ERROR",
        timestamp: now,
        message: "handlePlayerAction",
        roomId: message.roomId,
        messageType: MESSAGE_TYPES.PLAYER_ACTION,
        result: "error",
      })
      return
    }
    if (!result.accepted) {
      this.logger.log({
        level: "ERROR",
        timestamp: now,
        message: "handlePlayerActionRejected",
        roomId: result.roomId,
        playerId: result.playerId,
        messageType: MESSAGE_TYPES.PLAYER_ACTION,
        result: "error",
      })
      this.sendError(socket, "ACTION_NOT_ACCEPTED", "出牌不合法或当前不能出牌")
      return
    }
    const room = this.rooms.getRoom(result.roomId)
    if (room) {
      this.broadcastRoomSnapshot(result.roomId, room)
    }
    this.broadcastEvents(result.roomId, result.events)
    this.broadcastActionResult(
      result.roomId,
      result.playerId,
      result.actionType,
      result.accepted,
      result.settlement,
    )
    this.logger.log({
      level: "INFO",
      timestamp: now,
      message: "handlePlayerAction",
      roomId: result.roomId,
      playerId: result.playerId,
      messageType: MESSAGE_TYPES.PLAYER_ACTION,
      result: "success",
    })
  }

  private handleReconnect(socket: WebSocketLike, message: ReconnectMessage): void {
    const now = Date.now()
    const result = this.gateway.prepareReconnect(socket, message)
    if ("errorCode" in result) {
      this.logger.log({
        level: "ERROR",
        timestamp: now,
        message: "handleReconnect",
        roomId: message.roomId,
        messageType: MESSAGE_TYPES.RECONNECT,
        result: "error",
        details: {
          code: result.errorCode,
        },
      })
      this.sendError(socket, result.errorCode, result.errorMessage)
      return
    }
    const log = this.roomEventLog.get(result.roomId) || []
    const lastEventId = message.lastEventId
    if (typeof lastEventId === "number") {
      const hasBase = log.some(e => e.eventId === lastEventId)
      if (hasBase) {
        const replay = log.filter(e => e.eventId > lastEventId)
        if (replay.length > 0) {
          this.sendEventsToSocket(socket, result.roomId, replay)
        }
        this.logger.log({
          level: "INFO",
          timestamp: now,
          message: "handleReconnectReplay",
          roomId: result.roomId,
          playerId: result.playerId,
          messageType: MESSAGE_TYPES.RECONNECT,
          result: "success",
          details: {
            lastEventId,
            replayCount: replay.length,
          },
        })
        return
      }
    }
    const snapshot: RoomSnapshotMessage = {
      type: MESSAGE_TYPES.ROOM_SNAPSHOT,
      roomId: result.roomId,
      room: result.room,
    }
    socket.send(JSON.stringify(snapshot))
    this.logger.log({
      level: "INFO",
      timestamp: now,
      message: "handleReconnectSnapshot",
      roomId: result.roomId,
      playerId: result.playerId,
      messageType: MESSAGE_TYPES.RECONNECT,
      result: "success",
      details: {
        lastEventId: message.lastEventId,
      },
    })
  }

  private handleReady(socket: WebSocketLike, message: ReadyMessage): void {
    const now = Date.now()
    const result = this.gateway.toggleReady(socket, message)
    if ("errorCode" in result) {
      this.logger.log({
        level: "ERROR",
        timestamp: now,
        message: "handleReady",
        roomId: message.roomId,
        messageType: MESSAGE_TYPES.READY,
        result: "error",
        details: {
          code: result.errorCode,
        },
      })
      this.sendError(socket, result.errorCode, result.errorMessage)
      return
    }
    this.broadcastRoomSnapshot(result.roomId, result.room)
    this.logger.log({
      level: "INFO",
      timestamp: now,
      message: "handleReady",
      roomId: result.roomId,
      playerId: result.playerId,
      messageType: MESSAGE_TYPES.READY,
      result: "success",
    })
  }

  private handleStartGame(socket: WebSocketLike, message: StartGameMessage): void {
    const now = Date.now()
    const result = this.gateway.startGame(socket, message)
    if ("errorCode" in result) {
      this.logger.log({
        level: "ERROR",
        timestamp: now,
        message: "handleStartGame",
        roomId: message.roomId,
        messageType: MESSAGE_TYPES.START_GAME,
        result: "error",
        details: {
          code: result.errorCode,
        },
      })
      this.sendError(socket, result.errorCode, result.errorMessage)
      return
    }
    this.broadcastRoomSnapshot(result.roomId, result.room)
    this.logger.log({
      level: "INFO",
      timestamp: now,
      message: "handleStartGame",
      roomId: result.roomId,
      playerId: result.playerId,
      messageType: MESSAGE_TYPES.START_GAME,
      result: "success",
    })
  }

  private handleStartNextHand(socket: WebSocketLike, message: StartNextHandMessage): void {
    const now = Date.now()
    const result = this.gateway.startNextHand(socket, message)
    if ("errorCode" in result) {
      this.logger.log({
        level: "ERROR",
        timestamp: now,
        message: "handleStartNextHand",
        roomId: message.roomId,
        messageType: MESSAGE_TYPES.START_NEXT_HAND,
        result: "error",
        details: {
          code: result.errorCode,
        },
      })
      this.sendError(socket, result.errorCode, result.errorMessage)
      return
    }
    this.broadcastRoomSnapshot(result.roomId, result.room)
    this.logger.log({
      level: "INFO",
      timestamp: now,
      message: "handleStartNextHand",
      roomId: result.roomId,
      playerId: result.playerId,
      messageType: MESSAGE_TYPES.START_NEXT_HAND,
      result: "success",
    })
  }

  private broadcastEvents(roomId: string, events: GameEvent[]): void {
    if (events.length === 0) {
      return
    }
    for (const event of events) {
      this.eventSeq += 1
      event.eventId = this.eventSeq
    }
    this.appendEventsToRoomLog(roomId, events)
    const message: GameEventsMessage = {
      type: MESSAGE_TYPES.GAME_EVENTS,
      roomId,
      events,
    }
    const payload = JSON.stringify(message)
    const players = this.connections.getRoomPlayers(roomId)
    let delivered = 0
    for (const playerId of players) {
      const connectionInfo = this.connections.getConnection(playerId)
      if (connectionInfo) {
        connectionInfo.socket.send(payload)
        delivered += 1
      }
    }
    this.logger.log({
      level: "INFO",
      timestamp: Date.now(),
      message: "broadcastEvents",
      roomId,
      messageType: MESSAGE_TYPES.GAME_EVENTS,
      result: "success",
      details: {
        eventCount: events.length,
        delivered,
      },
    })
  }

  private broadcastActionResult(
    roomId: string,
    playerId: PlayerId,
    actionType: PlayerActionType,
    accepted: boolean,
    settlement: SettlementResult | null,
  ): void {
    const message = {
      type: MESSAGE_TYPES.PLAYER_ACTION_RESULT,
      roomId,
      playerId,
      payload: {
        accepted,
        action: {
          type: actionType,
        },
        settlement: settlement || undefined,
      },
    }
    const payload = JSON.stringify(message)
    const players = this.connections.getRoomPlayers(roomId)
    for (const pid of players) {
      const connectionInfo = this.connections.getConnection(pid)
      if (connectionInfo) {
        connectionInfo.socket.send(payload)
      }
    }
  }

  private appendEventsToRoomLog(roomId: string, events: GameEvent[]): void {
    if (events.length === 0) {
      return
    }
    let log = this.roomEventLog.get(roomId)
    if (!log) {
      log = []
      this.roomEventLog.set(roomId, log)
    }
    for (const event of events) {
      log.push(event)
    }
    const limit = 500
    if (log.length > limit) {
      log.splice(0, log.length - limit)
    }
  }

  private tryRecycleRoom(roomId: string): void {
    const room = this.rooms.getRoom(roomId)
    if (!room) {
      return
    }
    if (this.connections.hasConnections(roomId)) {
      return
    }
    if (this.isRoomFinished(room)) {
      this.rooms.deleteRoom(roomId)
      this.roomEventLog.delete(roomId)
      this.logger.log({
        level: "INFO",
        timestamp: Date.now(),
        message: "tryRecycleRoom",
        roomId,
        result: "success",
      })
    }
  }

  private isRoomFinished(room: GameRoom): boolean {
    const state = room.gameState
    if (!state) {
      return true
    }
    return state.phase === "WAITING"
  }

  private sendEventsToSocket(socket: WebSocketLike, roomId: string, events: GameEvent[]): void {
    if (events.length === 0) {
      return
    }
    const message: GameEventsMessage = {
      type: MESSAGE_TYPES.GAME_EVENTS,
      roomId,
      events,
    }
    socket.send(JSON.stringify(message))
  }

  private sendPong(socket: WebSocketLike): void {
    socket.send(JSON.stringify({ type: MESSAGE_TYPES.PONG }))
  }

  private sendError(socket: WebSocketLike, code: string, message: string): void {
    const payload: ErrorMessage = {
      type: MESSAGE_TYPES.ERROR,
      code,
      message,
    }
    socket.send(JSON.stringify(payload))
  }

  private broadcastRoomSnapshot(roomId: string, room: GameRoom): void {
    const snapshot: RoomSnapshotMessage = {
      type: MESSAGE_TYPES.ROOM_SNAPSHOT,
      roomId,
      room,
    }
    const payload = JSON.stringify(snapshot)
    const players = this.connections.getRoomPlayers(roomId)
    for (const playerId of players) {
      const connectionInfo = this.connections.getConnection(playerId)
      if (connectionInfo) {
        connectionInfo.socket.send(payload)
      }
    }
  }
}
