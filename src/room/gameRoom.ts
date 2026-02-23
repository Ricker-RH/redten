import {
  GameConfig,
  GameEvent,
  GamePhase,
  GameState,
  GameStage,
  PlayerAction,
  PlayerId,
  RankEnum,
  SeatId,
  SeatState,
} from "../domain/types"
import { startNewHand } from "../engine/gameEngine"
import { handleAction } from "../rules/turnRule"
import { calculateSettlement, SettlementResult } from "../rules/settlementRule"

export interface GameRoom {
  roomId: string
  maxPlayers: number
  players: PlayerId[]
  hostId: PlayerId | null
  readyPlayerIds: PlayerId[]
  gameState: GameState | null
  status: "OPEN" | "FULL" | "PLAYING"
  lastWinnerSeatId: SeatId | null
}

export interface RoomActionResult {
  room: GameRoom
  events: GameEvent[]
  accepted: boolean
  settlement: SettlementResult | null
}

const defaultConfig: GameConfig = {
  deckConfig: {
    deckCount: 2,
    removeJokers: true,
    redTenRanks: [RankEnum.TEN],
    redTenSuits: ["Heart", "Diamond"],
  },
  timingConfig: {
    actionTimeoutMs: 15000,
  },
  scoringConfig: {
    baseScore: 10,
  },
}

export function createRoom(roomId: string): GameRoom {
  return {
    roomId,
    maxPlayers: 7,
    players: [],
    hostId: null,
    readyPlayerIds: [],
    gameState: null,
    status: "OPEN",
    lastWinnerSeatId: null,
  }
}

export function joinRoom(room: GameRoom, playerId: PlayerId): GameRoom {
  if (room.status !== "OPEN") {
    throw new Error("Cannot join room that is not open")
  }
  if (room.players.length >= room.maxPlayers) {
    throw new Error("Room is full")
  }
  if (room.players.includes(playerId)) {
    throw new Error("Player already in room")
  }
  const nextPlayers = room.players.concat(playerId)
  const nextStatus = nextPlayers.length === room.maxPlayers ? "FULL" : "OPEN"
   const hostId = room.hostId || playerId
  return {
    ...room,
    players: nextPlayers,
    hostId,
    status: nextStatus,
  }
}

export function startGameInRoom(room: GameRoom): GameRoom {
  if (room.status !== "FULL") {
    throw new Error("Game can only start when room is FULL")
  }
  if (room.players.length !== room.maxPlayers) {
    throw new Error("Room must have maxPlayers to start game")
  }
  const players = room.players.slice()
  for (let i = players.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = players[i]
    players[i] = players[j]
    players[j] = tmp
  }
  const seats: SeatState[] = players.map((playerId, index) => {
    const seatId = index + 1
    const seat: SeatState = {
      seatId,
      playerId,
      handCards: [],
      camp: null,
      isFinished: false,
      isFirstFinisher: false,
      canInstantWin: false,
      totalScore: 0,
    }
    return seat
  })
  const baseState: GameState = {
    tableId: room.roomId,
    handId: `${room.roomId}:1`,
    config: defaultConfig,
    stage: "CREATED" as GameStage,
    phase: "WAITING" as GamePhase,
    seats,
    deck: [],
    drawPile: [],
    campInfo: null,
    currentTurnSeatId: seats.length > 0 ? seats[0].seatId : null,
    currentPlayerId: seats.length > 0 ? seats[0].playerId : null,
    lastCombo: null,
    lastComboSeatId: null,
    lastPlayedCombo: null,
    lastPlayedPlayerId: null,
    firstFinisherSeatId: null,
    historyEvents: [],
    winnerId: null,
    windSourceSeatId: null,
    windDefaultReceiverSeatId: null,
    windMode: "NONE",
    passedSeatIds: [],
  }
  const startedState = startNewHand(baseState)
  return {
    ...room,
    status: "PLAYING",
    gameState: startedState,
  }
}

export function applyPlayerAction(room: GameRoom, action: PlayerAction): RoomActionResult {
  if (room.status !== "PLAYING" || !room.gameState) {
    return {
      room,
      events: [],
      accepted: false,
      settlement: null,
    }
  }
  const firstResult = handleAction(room.gameState, action)
  let nextGameState = firstResult.accepted ? firstResult.nextState : room.gameState
  let events: GameEvent[] = firstResult.events
  let nextLastWinnerSeatId = room.lastWinnerSeatId
  let settlement: SettlementResult | null = null
  if (firstResult.accepted && nextGameState.phase === "SETTLING") {
    if (nextGameState.firstFinisherSeatId) {
      nextLastWinnerSeatId = nextGameState.firstFinisherSeatId
    }
    settlement = calculateSettlement(nextGameState)
    const settleResult = handleAction(nextGameState, {
      ...action,
      cardIds: [],
      timestamp: Date.now(),
    })
    if (settleResult.accepted) {
      nextGameState = settleResult.nextState
      if (settleResult.events.length > 0) {
        events = events.concat(settleResult.events)
      }
    }
  }
  const nextRoom: GameRoom = {
    ...room,
    gameState: nextGameState,
    lastWinnerSeatId: nextLastWinnerSeatId,
  }
  return {
    room: nextRoom,
    events,
    accepted: firstResult.accepted,
    settlement,
  }
}

export function startNextHand(room: GameRoom): GameRoom {
  if (room.status !== "PLAYING") {
    throw new Error("startNextHand can only be called when room is PLAYING")
  }
  if (!room.gameState || room.gameState.phase !== "WAITING") {
    throw new Error("startNextHand can only be called when gameState.phase is WAITING")
  }
  const prevState = room.gameState
  const basePrefix = `${room.roomId}:`
  let nextHandIndex = 1
  if (prevState.handId && prevState.handId.startsWith(basePrefix)) {
    const suffix = prevState.handId.slice(basePrefix.length)
    const parsed = parseInt(suffix, 10)
    const currentIndex = Number.isNaN(parsed) ? 1 : parsed
    nextHandIndex = currentIndex + 1
  }
  const newHandId = `${room.roomId}:${nextHandIndex}`
  const newSeats: SeatState[] = prevState.seats.map(seat => ({
    seatId: seat.seatId,
    playerId: seat.playerId,
    handCards: [],
    camp: null,
    isFinished: false,
    isFirstFinisher: false,
    canInstantWin: false,
    totalScore: seat.totalScore,
  }))
  const newGameState: GameState = {
    tableId: room.roomId,
    handId: newHandId,
    config: prevState.config,
    stage: "CREATED" as GameStage,
    phase: "WAITING" as GamePhase,
    seats: newSeats,
    deck: [],
    drawPile: [],
    campInfo: null,
    currentTurnSeatId:
      room.lastWinnerSeatId !== null ? room.lastWinnerSeatId : newSeats[0]?.seatId ?? null,
    currentPlayerId:
      room.lastWinnerSeatId !== null
        ? newSeats.find(seat => seat.seatId === room.lastWinnerSeatId)?.playerId ?? null
        : newSeats[0]?.playerId ?? null,
    lastCombo: null,
    lastComboSeatId: null,
    lastPlayedCombo: null,
    lastPlayedPlayerId: null,
    firstFinisherSeatId: null,
    historyEvents: [],
    winnerId: null,
    windSourceSeatId: null,
    windDefaultReceiverSeatId: null,
    windMode: "NONE",
    passedSeatIds: [],
  }
  const startedState = startNewHand(newGameState)
  return {
    ...room,
    gameState: startedState,
  }
}
