import {
  Card,
  GamePhase,
  GameState,
  GameStage,
  PlayerAction,
  RankEnum,
  SeatState,
} from "../src/domain/types"
import {
  GameRoom,
  createRoom,
  joinRoom,
  startGameInRoom,
  applyPlayerAction,
  startNextHand,
} from "../src/room/gameRoom"

function createCard(id: number, rank: RankEnum): Card {
  return {
    id,
    rank,
    suit: "Spade",
    isRedTen: rank === RankEnum.TEN,
    originDeckIndex: 1,
  }
}

function createSeat(
  id: number,
  cards: Card[],
  finished = false,
  totalScore = 0,
): SeatState {
  return {
    seatId: id,
    playerId: `P${id}`,
    handCards: cards,
    camp: null,
    isFinished: finished,
    isFirstFinisher: false,
    canInstantWin: false,
    totalScore,
  }
}

function createPlayingRoomWithTwoPlayers(): GameRoom {
  const card1 = createCard(1, RankEnum.NINE)
  const card2 = createCard(2, RankEnum.JACK)
  const seats: SeatState[] = [createSeat(1, [card1]), createSeat(2, [card2])]
  const gameState: GameState = {
    tableId: "T-ROOM",
    handId: "HAND-ROOM",
    config: {
      deckConfig: {
        deckCount: 2,
        removeJokers: true,
        redTenRanks: [RankEnum.TEN],
        redTenSuits: ["Heart", "Diamond"],
      },
      timingConfig: {
        actionTimeoutMs: 10000,
      },
      scoringConfig: {
        baseScore: 10,
      },
    },
    stage: "PLAYING" as GameStage,
    phase: "PLAYING" as GamePhase,
    seats,
    deck: [],
    drawPile: [],
    campInfo: null,
    currentTurnSeatId: 1,
    currentPlayerId: "P1",
    lastCombo: null,
    lastComboSeatId: null,
    lastPlayedCombo: null,
    lastPlayedPlayerId: null,
    firstFinisherSeatId: null,
    historyEvents: [],
    winnerId: null,
  }
  return {
    roomId: "ROOM-A",
    maxPlayers: 7,
    players: ["P1", "P2"],
    gameState,
    status: "PLAYING",
  }
}

function createSettlingRoom(): GameRoom {
  const seat1 = createSeat(1, [], true)
  const seat2 = createSeat(2, [createCard(2, RankEnum.EIGHT)])
  const seats: SeatState[] = [seat1, seat2]
  const gameState: GameState = {
    tableId: "T-ROOM",
    handId: "HAND-ROOM",
    config: {
      deckConfig: {
        deckCount: 2,
        removeJokers: true,
        redTenRanks: [RankEnum.TEN],
        redTenSuits: ["Heart", "Diamond"],
      },
      timingConfig: {
        actionTimeoutMs: 10000,
      },
      scoringConfig: {
        baseScore: 10,
      },
    },
    stage: "SETTLING" as GameStage,
    phase: "SETTLING" as GamePhase,
    seats,
    deck: [],
    drawPile: [],
    campInfo: null,
    currentTurnSeatId: null,
    currentPlayerId: null,
    lastCombo: null,
    lastComboSeatId: null,
    lastPlayedCombo: null,
    lastPlayedPlayerId: null,
    firstFinisherSeatId: 1,
    historyEvents: [],
    winnerId: "P1",
  }
  return {
    roomId: "ROOM-B",
    maxPlayers: 7,
    players: ["P1", "P2"],
    gameState,
    status: "PLAYING",
  }
}

function createWaitingRoomWithScores(): GameRoom {
  const seats: SeatState[] = []
  const players: string[] = []
  for (let i = 1; i <= 7; i += 1) {
    const seat = createSeat(i, [], false, i * 10)
    seats.push(seat)
    players.push(`P${i}`)
  }
  const gameState: GameState = {
    tableId: "ROOM-C",
    handId: "ROOM-C:3",
    config: {
      deckConfig: {
        deckCount: 2,
        removeJokers: true,
        redTenRanks: [RankEnum.TEN],
        redTenSuits: ["Heart", "Diamond"],
      },
      timingConfig: {
        actionTimeoutMs: 10000,
      },
      scoringConfig: {
        baseScore: 10,
      },
    },
    stage: "SETTLING" as GameStage,
    phase: "WAITING" as GamePhase,
    seats,
    deck: [],
    drawPile: [],
    campInfo: null,
    currentTurnSeatId: null,
    currentPlayerId: null,
    lastCombo: null,
    lastComboSeatId: null,
    lastPlayedCombo: null,
    lastPlayedPlayerId: null,
    firstFinisherSeatId: 1,
    historyEvents: [],
    winnerId: null,
  }
  return {
    roomId: "ROOM-C",
    maxPlayers: 7,
    players,
    gameState,
    status: "PLAYING",
  }
}

test("cannot join the same player twice", () => {
  let room = createRoom("R1")
  room = joinRoom(room, "P1")
  expect(() => joinRoom(room, "P1")).toThrow()
})

test("cannot exceed max players in room", () => {
  let room = createRoom("R1")
  for (let i = 1; i <= 7; i += 1) {
    room = joinRoom(room, `P${i}`)
  }
  expect(room.status).toBe("FULL")
  expect(room.players.length).toBe(7)
  expect(() => joinRoom(room, "P8")).toThrow()
})

test("room becomes FULL when reaching maxPlayers", () => {
  let room = createRoom("R2")
  for (let i = 1; i <= 7; i += 1) {
    room = joinRoom(room, `P${i}`)
  }
  expect(room.status).toBe("FULL")
})

test("startGameInRoom can only be called when room is FULL", () => {
  let openRoom = createRoom("R3")
  expect(() => startGameInRoom(openRoom)).toThrow()
  let room = createRoom("R4")
  for (let i = 1; i <= 7; i += 1) {
    room = joinRoom(room, `P${i}`)
  }
  const started = startGameInRoom(room)
  expect(started.status).toBe("PLAYING")
  expect(started.gameState).not.toBeNull()
})

test("startGameInRoom sets gameState and initializes a seven-player game", () => {
  let room: GameRoom = createRoom("R5")
  for (let i = 1; i <= 7; i += 1) {
    room = joinRoom(room, `P${i}`)
  }
  const started = startGameInRoom(room)
  expect(started.status).toBe("PLAYING")
  expect(started.gameState).not.toBeNull()
  if (started.gameState) {
    const game = started.gameState
    expect(game.phase).toBe("PLAYING")
    expect(game.seats.length).toBe(7)
    const ids = game.seats.map(seat => seat.playerId).slice().sort()
    const expectedIds = room.players.slice().sort()
    expect(ids).toEqual(expectedIds)
  }
})

test("applyPlayerAction with normal play advances currentPlayerId", () => {
  const room = createPlayingRoomWithTwoPlayers()
  const action: PlayerAction = {
    playerId: "P1",
    seatId: 1,
    type: "PLAY_CARDS",
    cardIds: [1],
    timestamp: Date.now(),
  }
  const result = applyPlayerAction(room, action)
  const nextRoom = result.room
  const nextRoom = result.room
  expect(nextRoom.gameState).not.toBeNull()
    expect(nextRoom.gameState.currentPlayerId).toBe("P2")
    expect(nextRoom.gameState.phase).toBe("SETTLING")
  }

test("applyPlayerAction throws when non-current player attempts to play", () => {
  const room = createPlayingRoomWithTwoPlayers()
  const action: PlayerAction = {
    playerId: "P2",
    seatId: 2,
    type: "PLAY_CARDS",
    cardIds: [2],
    timestamp: Date.now(),
  }
  expect(() => applyPlayerAction(room, action)).toThrow()
})

test("applyPlayerAction moves phase to WAITING after settlement", () => {
  const room = createSettlingRoom()
  const action: PlayerAction = {
    playerId: "P1",
    seatId: 1,
    type: "PASS",
    cardIds: [],
    timestamp: Date.now(),
  }
  const result = applyPlayerAction(room, action)
  const nextRoom = result.room
  expect(nextRoom.gameState).not.toBeNull()
  if (nextRoom.gameState) {
    expect(nextRoom.gameState.phase).toBe("WAITING")
  }
})

test("startNextHand can only be called when gameState phase is WAITING", () => {
  let room: GameRoom = createRoom("R6")
  for (let i = 1; i <= 7; i += 1) {
    room = joinRoom(room, `P${i}`)
  }
  const started = startGameInRoom(room)
  expect(started.gameState).not.toBeNull()
  if (started.gameState) {
    expect(started.gameState.phase).toBe("PLAYING")
  }
  expect(() => startNextHand(started)).toThrow()

  const waitingRoom = createWaitingRoomWithScores()
  const nextRoom = startNextHand(waitingRoom)
  expect(nextRoom.gameState).not.toBeNull()
})

test("startNextHand preserves totalScore and increments handId", () => {
  const waitingRoom = createWaitingRoomWithScores()
  const nextRoom = startNextHand(waitingRoom)
  expect(nextRoom.gameState).not.toBeNull()
  if (nextRoom.gameState) {
    const game = nextRoom.gameState
    expect(game.handId).toBe("ROOM-C:4")
    expect(game.phase).toBe("PLAYING")
    expect(game.seats.length).toBe(7)
    for (let i = 0; i < game.seats.length; i += 1) {
      expect(game.seats[i].totalScore).toBe((i + 1) * 10)
    }
  }
})
