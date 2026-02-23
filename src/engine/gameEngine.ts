import { Card, GameState, SeatState } from "../domain/types"
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
  const dealtSeats = dealCards(baseSeats, deckResult.deck)
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
  const randomIndex =
    activeSeats.length > 0
      ? Math.floor(Math.random() * activeSeats.length)
      : -1
  const currentSeat = randomIndex >= 0 ? activeSeats[randomIndex] : null
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

function dealCards(seats: SeatState[], deck: Card[]): SeatState[] {
  const result: SeatState[] = seats.map(seat => ({
    ...seat,
    handCards: [],
  }))
  if (result.length === 0) {
    return result
  }
  const playerCount = result.length
  for (let i = 0; i < deck.length; i += 1) {
    const seatIndex = i % playerCount
    const seat = result[seatIndex]
    const card = deck[i]
    result[seatIndex] = {
      ...seat,
      handCards: seat.handCards.concat(card),
    }
  }
  return result
}
