import { Card, GameState, SeatId, SeatState } from "../domain/types"
import { initializeDeck } from "../rules/deckRule"
import { hasTripleRedTenInHand } from "../rules/specialAbilityRule"

export function startNewHand(state: GameState): GameState {
  if (state.phase !== "WAITING") {
    throw new Error("startNewHand can only be called when phase is WAITING")
  }
  const baseSeats: SeatState[] = state.seats.map(seat => ({
    ...seat,
    handCards: [],
    camp: null,
    isFinished: false,
    isFirstFinisher: false,
    canInstantWin: false,
  }))
  const deckResult = initializeDeck({
    config: state.config.deckConfig,
    rngSeed: state.handId,
  })
  const startingSeatId: SeatId | null =
    state.currentTurnSeatId && state.currentTurnSeatId > 0
      ? state.currentTurnSeatId
      : baseSeats.length > 0
      ? baseSeats[0].seatId
      : null
  const dealtSeats = dealCards(baseSeats, deckResult.deck, startingSeatId)
  const seatsWithCamp: SeatState[] = dealtSeats.map(seat => {
    const hasRedTen = seat.handCards.some(card => card.isRedTen)
    return {
      ...seat,
      camp: hasRedTen ? "RED_TEN" : "NORMAL",
    }
  })
  const seatsWithAbility: SeatState[] = seatsWithCamp.map(seat => ({
    ...seat,
    canInstantWin: hasTripleRedTenInHand(seat.handCards),
  }))
  const activeSeats = seatsWithAbility.filter(seat => !seat.isFinished)
  const currentSeat =
    startingSeatId !== null
      ? activeSeats.find(seat => seat.seatId === startingSeatId) || activeSeats[0] || null
      : activeSeats[0] || null
  return {
    ...state,
    stage: "PLAYING",
    phase: "PLAYING",
    campInfo: {
      redTenCampSeats: seatsWithCamp.filter(seat => seat.camp === "RED_TEN").map(seat => seat.seatId),
      normalCampSeats: seatsWithCamp.filter(seat => seat.camp === "NORMAL").map(seat => seat.seatId),
    },
    seats: seatsWithAbility,
    deck: [],
    drawPile: [],
    currentTurnSeatId: currentSeat ? currentSeat.seatId : null,
    currentPlayerId: currentSeat ? currentSeat.playerId : null,
    lastCombo: null,
    lastComboSeatId: null,
    lastPlayedCombo: null,
    lastPlayedPlayerId: null,
    firstFinisherSeatId: null,
    winnerId: null,
    windSourceSeatId: null,
    windDefaultReceiverSeatId: null,
    windMode: "NONE",
    passedSeatIds: [],
  }
}

function dealCards(
  seats: SeatState[],
  deck: Card[],
  startingSeatId: SeatId | null,
): SeatState[] {
  const result: SeatState[] = seats.map(seat => ({
    ...seat,
    handCards: [],
  }))
  if (result.length === 0) {
    return result
  }
  const sorted = result.slice().sort((a, b) => a.seatId - b.seatId)
  const playerCount = sorted.length
  let startIndex = 0
  if (startingSeatId !== null) {
    const idx = sorted.findIndex(seat => seat.seatId === startingSeatId)
    if (idx >= 0) {
      startIndex = idx
    }
  }
  for (let i = 0; i < deck.length; i += 1) {
    const seatIndex = (startIndex + i) % playerCount
    const seat = sorted[seatIndex]
    const card = deck[i]
    sorted[seatIndex] = {
      ...seat,
      handCards: seat.handCards.concat(card),
    }
  }
  const bySeatId = sorted.slice().sort((a, b) => a.seatId - b.seatId)
  return bySeatId
}
