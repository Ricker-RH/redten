import {
  GamePhase,
  GameState,
  GameStage,
  RankEnum,
  SeatState,
} from "../src/domain/types"
import { calculateSettlement } from "../src/rules/settlementRule"

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

test("settlement distributes points according to unfinished players", () => {
  const seats: SeatState[] = [
    createSeat(1, true, 0),
    createSeat(2, true, 0),
    createSeat(3, true, 0),
    createSeat(4, false, 0),
    createSeat(5, false, 0),
    createSeat(6, false, 0),
    createSeat(7, false, 0),
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
    currentPlayerId: "P3",
    lastCombo: null,
    lastComboSeatId: null,
    lastPlayedCombo: null,
    lastPlayedPlayerId: "P3",
    firstFinisherSeatId: 1,
    historyEvents: [],
    winnerId: "P3",
  }
  const result = calculateSettlement(state)
  expect(result.winnerId).toBe("P3")
  const deltas = new Map(result.playerResults.map(r => [r.playerId, r.scoreDelta]))
  expect(deltas.get("P3")).toBe(4)
  expect(deltas.get("P4")).toBe(-1)
  expect(deltas.get("P5")).toBe(-1)
  expect(deltas.get("P6")).toBe(-1)
  expect(deltas.get("P7")).toBe(-1)
  expect(deltas.get("P1")).toBe(0)
  expect(deltas.get("P2")).toBe(0)
}
