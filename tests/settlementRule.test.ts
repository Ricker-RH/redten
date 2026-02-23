import { Camp, GamePhase, GameState, GameStage, RankEnum, SeatState } from "../src/domain/types"
import { calculateSettlement } from "../src/rules/settlementRule"

function createSeat(
  id: number,
  camp: Camp,
  isFinished: boolean,
  totalScore: number,
): SeatState {
  return {
    seatId: id,
    playerId: `P${id}`,
    handCards: [],
    camp,
    isFinished,
    isFirstFinisher: false,
    canInstantWin: false,
    totalScore,
  }
}

test("red ten camp wins when all red players finish and some normal players remain", () => {
  const seats: SeatState[] = [
    createSeat(1, "RED_TEN", true, 0),
    createSeat(2, "RED_TEN", true, 0),
    createSeat(3, "NORMAL", true, 0),
    createSeat(4, "NORMAL", false, 0),
    createSeat(5, "NORMAL", false, 0),
  ]
  const state: GameState = {
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
    stage: "SETTLING" as GameStage,
    phase: "SETTLING" as GamePhase,
    seats,
    deck: [],
    drawPile: [],
    campInfo: null,
    currentTurnSeatId: null,
    currentPlayerId: "P1",
    lastCombo: null,
    lastComboSeatId: null,
    lastPlayedCombo: null,
    lastPlayedPlayerId: "P1",
    firstFinisherSeatId: 1,
    historyEvents: [],
    winnerId: null,
  }
  const result = calculateSettlement(state)
  expect(result.winnerId).toBe("P1")
  const deltas = new Map(result.playerResults.map(r => [r.playerId, r.scoreDelta]))
  expect(deltas.get("P1")).toBe(4)
  expect(deltas.get("P2")).toBe(4)
  expect(deltas.get("P4")).toBe(-4)
  expect(deltas.get("P5")).toBe(-4)
  expect(deltas.get("P3")).toBe(0)
})

test("draw when first finisher is red ten but normal camp all finish while red players remain", () => {
  const seats: SeatState[] = [
    createSeat(1, "RED_TEN", true, 0),
    createSeat(2, "RED_TEN", false, 0),
    createSeat(3, "NORMAL", true, 0),
    createSeat(4, "NORMAL", true, 0),
  ]
  const state: GameState = {
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
    stage: "SETTLING" as GameStage,
    phase: "SETTLING" as GamePhase,
    seats,
    deck: [],
    drawPile: [],
    campInfo: null,
    currentTurnSeatId: null,
    currentPlayerId: "P1",
    lastCombo: null,
    lastComboSeatId: null,
    lastPlayedCombo: null,
    lastPlayedPlayerId: "P1",
    firstFinisherSeatId: 1,
    historyEvents: [],
    winnerId: null,
  }
  const result = calculateSettlement(state)
  expect(result.winnerId).toBeNull()
  const deltas = new Map(result.playerResults.map(r => [r.playerId, r.scoreDelta]))
  expect(deltas.get("P1")).toBe(0)
  expect(deltas.get("P2")).toBe(0)
  expect(deltas.get("P3")).toBe(0)
  expect(deltas.get("P4")).toBe(0)
})
