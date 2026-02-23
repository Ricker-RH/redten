import { Camp, GameState, PlayerId, SeatId } from "../domain/types"

export interface PlayerSettlement {
  playerId: PlayerId
  seatId: SeatId
  scoreDelta: number
  totalScore: number
}

export interface SettlementResult {
  winnerId: PlayerId | null
  playerResults: PlayerSettlement[]
}

export function calculateSettlement(state: GameState): SettlementResult {
  const seats = state.seats
  const firstFinisherSeat =
    state.firstFinisherSeatId != null
      ? seats.find(seat => seat.seatId === state.firstFinisherSeatId) || null
      : null
  const firstCamp: Camp | null = firstFinisherSeat ? firstFinisherSeat.camp : null
  const redSeats = seats.filter(seat => seat.camp === "RED_TEN")
  const normalSeats = seats.filter(seat => seat.camp === "NORMAL")
  const redUnfinished = redSeats.filter(seat => !seat.isFinished)
  const normalUnfinished = normalSeats.filter(seat => !seat.isFinished)
  const redFinishedAll = redSeats.length > 0 && redUnfinished.length === 0
  const normalFinishedAll = normalSeats.length > 0 && normalUnfinished.length === 0
  let winnerCamp: Camp | null = null
  let isDraw = false
  if (firstCamp === "RED_TEN") {
    if (redFinishedAll && normalUnfinished.length > 0) {
      winnerCamp = "RED_TEN"
    } else if (normalFinishedAll && redUnfinished.length > 0) {
      isDraw = true
    } else if (redFinishedAll && normalFinishedAll) {
      winnerCamp = "RED_TEN"
    } else {
      isDraw = true
    }
  } else if (firstCamp === "NORMAL") {
    if (normalFinishedAll && redUnfinished.length > 0) {
      winnerCamp = "NORMAL"
    } else if (redFinishedAll && normalUnfinished.length > 0) {
      isDraw = true
    } else if (redFinishedAll && normalFinishedAll) {
      winnerCamp = "NORMAL"
    } else {
      isDraw = true
    }
  } else {
    isDraw = true
  }
  let winnerId: PlayerId | null = null
  let loserCamp: Camp | null = null
  if (!isDraw && winnerCamp) {
    loserCamp = winnerCamp === "RED_TEN" ? "NORMAL" : "RED_TEN"
    if (firstFinisherSeat && firstFinisherSeat.camp === winnerCamp) {
      winnerId = firstFinisherSeat.playerId
    } else {
      const winnerSeat = seats.find(seat => seat.camp === winnerCamp) || null
      winnerId = winnerSeat ? winnerSeat.playerId : null
    }
  }
  let winnerSeatsCount = 0
  let loserUnfinishedCount = 0
  if (!isDraw && winnerCamp && loserCamp) {
    winnerSeatsCount = seats.filter(seat => seat.camp === winnerCamp).length
    loserUnfinishedCount = seats.filter(
      seat => seat.camp === loserCamp && !seat.isFinished,
    ).length
  }
  let lossPerUnfinished = 0
  let gainPerWinner = 0
  if (!isDraw && winnerSeatsCount > 0 && loserUnfinishedCount > 0) {
    lossPerUnfinished = winnerSeatsCount * loserUnfinishedCount
    const totalLoss = lossPerUnfinished * loserUnfinishedCount
    gainPerWinner = totalLoss / winnerSeatsCount
  }
  const playerResults: PlayerSettlement[] = seats.map(seat => {
    let delta = 0
    if (!isDraw && winnerCamp && loserCamp) {
      if (seat.camp === winnerCamp) {
        delta = gainPerWinner
      } else if (seat.camp === loserCamp && !seat.isFinished && lossPerUnfinished > 0) {
        delta = -lossPerUnfinished
      }
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
