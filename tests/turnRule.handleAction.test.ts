import {
  Card,
  GamePhase,
  GameState,
  GameStage,
  PlayerAction,
  RankEnum,
  SeatState,
} from "../src/domain/types"
import { handleAction } from "../src/rules/turnRule"

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
  seatId: number,
  cards: Card[],
  finished = false,
  totalScore = 0,
): SeatState {
  return {
    seatId,
    playerId: `P${seatId}`,
    handCards: cards,
    camp: null,
    isFinished: finished,
    isFirstFinisher: false,
    canInstantWin: false,
    totalScore,
  }
}

function createBaseState(seats: SeatState[]): GameState {
  return {
    tableId: "T1",
    handId: "H1",
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
    windSourceSeatId: null,
    windDefaultReceiverSeatId: null,
    windMode: "NONE",
  }
}

test("normal play cards flow updates last combo and advances turn", () => {
  const card1 = createCard(1, RankEnum.NINE)
  const card2 = createCard(2, RankEnum.JACK)
  const seats: SeatState[] = [
    createSeat(1, [card1]),
    createSeat(2, [card2]),
  ]
  const state = createBaseState(seats)
  const action: PlayerAction = {
    playerId: "P1",
    seatId: 1,
    type: "PLAY_CARDS",
    cardIds: [1],
    timestamp: Date.now(),
  }
  const result = handleAction(state, action)
  expect(result.accepted).toBe(true)
  const next = result.nextState
  expect(next.lastPlayedCombo).not.toBeNull()
  expect(next.lastPlayedPlayerId).toBe("P1")
  expect(next.currentPlayerId).toBe("P2")
})

test("non current player cannot play cards", () => {
  const card1 = createCard(1, RankEnum.NINE)
  const card2 = createCard(2, RankEnum.JACK)
  const seats: SeatState[] = [
    createSeat(1, [card1]),
    createSeat(2, [card2]),
  ]
  const state = createBaseState(seats)
  const action: PlayerAction = {
    playerId: "P2",
    seatId: 2,
    type: "PLAY_CARDS",
    cardIds: [2],
    timestamp: Date.now(),
  }
  const result = handleAction(state, action)
  expect(result.accepted).toBe(false)
  expect(result.nextState).toBe(state)
})

test("illegal combo cannot be played", () => {
  const card1 = createCard(1, RankEnum.THREE)
  const card2 = createCard(2, RankEnum.FOUR)
  const seats: SeatState[] = [
    createSeat(1, [card1, card2]),
    createSeat(2, []),
  ]
  const state = createBaseState(seats)
  const action: PlayerAction = {
    playerId: "P1",
    seatId: 1,
    type: "PLAY_CARDS",
    cardIds: [1, 2],
    timestamp: Date.now(),
  }
  const result = handleAction(state, action)
  expect(result.accepted).toBe(false)
})

test("cannot play weaker combo than last played", () => {
  const nine = createCard(1, RankEnum.NINE)
  const eight = createCard(2, RankEnum.EIGHT)
  const seats: SeatState[] = [
    createSeat(1, [nine]),
    createSeat(2, [eight]),
  ]
  let state = createBaseState(seats)
  const first: PlayerAction = {
    playerId: "P1",
    seatId: 1,
    type: "PLAY_CARDS",
    cardIds: [1],
    timestamp: Date.now(),
  }
  const r1 = handleAction(state, first)
  expect(r1.accepted).toBe(true)
  state = r1.nextState
  const action: PlayerAction = {
    playerId: "P2",
    seatId: 2,
    type: "PLAY_CARDS",
    cardIds: [2],
    timestamp: Date.now(),
  }
  const result = handleAction(state, action)
  expect(result.accepted).toBe(false)
})

test("player finishing hand enters settling phase with winnerId set", () => {
  const card1 = createCard(1, RankEnum.NINE)
  const seats: SeatState[] = [
    createSeat(1, [card1]),
    createSeat(2, [createCard(2, RankEnum.EIGHT)]),
  ]
  const state = createBaseState(seats)
  const action: PlayerAction = {
    playerId: "P1",
    seatId: 1,
    type: "PLAY_CARDS",
    cardIds: [1],
    timestamp: Date.now(),
  }
  const result = handleAction(state, action)
  expect(result.accepted).toBe(true)
  const next = result.nextState
  expect(next.phase).toBe("SETTLING")
  expect(next.winnerId).toBe("P1")
})

test("instant win ends round immediately and enters settling phase", () => {
  const redTen1: Card = {
    id: 1,
    rank: RankEnum.TEN,
    suit: "Heart",
    isRedTen: true,
    originDeckIndex: 1,
  }
  const redTen2: Card = {
    id: 2,
    rank: RankEnum.TEN,
    suit: "Diamond",
    isRedTen: true,
    originDeckIndex: 1,
  }
  const redTen3: Card = {
    id: 3,
    rank: RankEnum.TEN,
    suit: "Heart",
    isRedTen: true,
    originDeckIndex: 2,
  }
  const seats: SeatState[] = [
    createSeat(1, [redTen1, redTen2, redTen3]),
    createSeat(2, [createCard(4, RankEnum.ACE)]),
  ]
  const state = createBaseState(seats)
  const action: PlayerAction = {
    playerId: "P1",
    seatId: 1,
    type: "INSTANT_WIN",
    cardIds: [1, 2, 3],
    timestamp: Date.now(),
  }
  const result = handleAction(state, action)
  expect(result.accepted).toBe(true)
  const next = result.nextState
  expect(next.phase).toBe("SETTLING")
  expect(next.winnerId).toBe("P1")
})

test("round reset after all other players pass and turn returns to last player", () => {
  const c1 = createCard(1, RankEnum.NINE)
  const c2 = createCard(2, RankEnum.TEN)
  const c3 = createCard(3, RankEnum.JACK)
  const seats: SeatState[] = [
    createSeat(1, [c1]),
    createSeat(2, [c2]),
    createSeat(3, [c3]),
  ]
  let state: GameState = {
    ...createBaseState(seats),
    lastPlayedCombo: null,
    lastPlayedPlayerId: null,
  }
  const first: PlayerAction = {
    playerId: "P1",
    seatId: 1,
    type: "PLAY_CARDS",
    cardIds: [1],
    timestamp: Date.now(),
  }
  const r1 = handleAction(state, first)
  expect(r1.accepted).toBe(true)
  state = r1.nextState
  const pass2: PlayerAction = {
    playerId: "P2",
    seatId: 2,
    type: "PASS",
    cardIds: [],
    timestamp: Date.now(),
  }
  const r2 = handleAction(state, pass2)
  expect(r2.accepted).toBe(true)
  state = r2.nextState
  const pass3: PlayerAction = {
    playerId: "P3",
    seatId: 3,
    type: "PASS",
    cardIds: [],
    timestamp: Date.now(),
  }
  const r3 = handleAction(state, pass3)
  expect(r3.accepted).toBe(true)
  const next = r3.nextState
  expect(next.currentPlayerId).toBe("P1")
  expect(next.lastPlayedCombo).toBeNull()
  expect(next.lastPlayedPlayerId).toBeNull()
})
