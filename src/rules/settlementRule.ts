import { GameState, PlayerId, SeatId } from "../domain/types"

export interface PlayerSettlement {
  playerId: PlayerId
  seatId: SeatId
  scoreDelta: number
  totalScore: number
}

export interface SettlementResult {
  winnerId: PlayerId
  playerResults: PlayerSettlement[]
}

export function calculateSettlement(state: GameState): SettlementResult {
  if (!state.winnerId) {
    throw new Error("winnerId must be set before settlement")
  }
  const winnerId = state.winnerId
  const unfinishedLosers = state.seats.filter(
    seat => seat.playerId !== winnerId && !seat.isFinished,
  )
  const n = unfinishedLosers.length
  const playerResults: PlayerSettlement[] = state.seats.map(seat => {
    const isWinner = seat.playerId === winnerId
    const isUnfinished = !seat.isFinished
    let delta = 0
    if (isWinner) {
      delta = n
    } else if (isUnfinished) {
      delta = -1
    }
    return {
      playerId: seat.playerId,
      seatId: seat.seatId,
      scoreDelta: delta,
      totalScore: seat.totalScore + delta,
    }
  })
  return {
    winnerId,
    playerResults,
  }
}
