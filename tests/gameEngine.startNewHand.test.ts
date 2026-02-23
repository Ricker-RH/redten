import {
  GamePhase,
  GameState,
  GameStage,
  RankEnum,
  SeatState,
} from "../src/domain/types"
import { startNewHand } from "../src/engine/gameEngine"

function createSeat(id: number, isFinished: boolean, totalScore: number): SeatState {
  return {
    seatId: id,
    playerId: `P${id}`,
    handCards: [],
    camp: null,
    isFinished,
    isFirstFinisher: false,
    canInstantWin: false,
    totalScore,
  }
}

function createBaseState(phase: GamePhase): GameState {
  const seats: SeatState[] = [
    createSeat(1, true, 10),
    createSeat(2, false, 0),
    createSeat(3, false, 0),
    createSeat(4, false, 0),
    createSeat(5, false, 0),
    createSeat(6, false, 0),
    createSeat(7, false, 0),
  ]
  return {
    tableId: "T1",
    handId: "HAND-1",
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
    stage: "CREATED" as GameStage,
    phase,
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
    firstFinisherSeatId: null,
    historyEvents: [],
    winnerId: null,
  }
}

test("startNewHand can only be called in WAITING phase", () => {
  const state: GameState = createBaseState("PLAYING")
  expect(() => startNewHand(state)).toThrow()
})

test("startNewHand deals cards to seven players with correct counts", () => {
  const state: GameState = createBaseState("WAITING")
  const next = startNewHand(state)
  expect(next.seats.length).toBe(7)
  const counts = next.seats
    .map(seat => seat.handCards.length)
    .slice()
    .sort((a, b) => a - b)
  expect(counts).toEqual([14, 14, 15, 15, 15, 15, 15])
})

test("startNewHand creates deck with 3 red tens and 4 black tens", () => {
  const state: GameState = createBaseState("WAITING")
  const next = startNewHand(state)
  const cards = next.seats.flatMap(seat => seat.handCards)
  const redTens = cards.filter(card => card.isRedTen)
  const blackTens = cards.filter(
    card => card.rank === RankEnum.TEN && !card.isRedTen,
  )
  expect(redTens.length).toBe(3)
  expect(blackTens.length).toBe(4)
})

test("startNewHand sets phase to PLAYING and assigns random current player", () => {
  const state: GameState = createBaseState("WAITING")
  const next = startNewHand(state)
  expect(next.phase).toBe("PLAYING")
  expect(next.stage).toBe("PLAYING")
  expect(next.currentPlayerId).not.toBeNull()
  expect(next.currentTurnSeatId).not.toBeNull()
  if (next.currentPlayerId && next.currentTurnSeatId) {
    const ids = next.seats.map(seat => seat.playerId)
    expect(ids).toContain(next.currentPlayerId)
  }
})

test("startNewHand resets finish flags for all players", () => {
  const state: GameState = createBaseState("WAITING")
  const next = startNewHand(state)
  next.seats.forEach(seat => {
    expect(seat.isFinished).toBe(false)
    expect(seat.isFirstFinisher).toBe(false)
  })
})
