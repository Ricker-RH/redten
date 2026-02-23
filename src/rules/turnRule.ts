import {
  Card,
  Combo,
  ErrorInfo,
  GameEvent,
  GamePhase,
  GameState,
  PlayerAction,
  PlayerId,
  SeatId,
  SeatState,
} from "../domain/types"
import { isValidInstantWinCards } from "./specialAbilityRule"
import { canBeat, detectCombo } from "./comboRule"
import { calculateSettlement } from "./settlementRule"

export interface ActionValidationResult {
  isValid: boolean
  error: ErrorInfo | null
}

export interface ApplyActionResult {
  nextState: GameState
  events: GameEvent[]
}

export interface HandleActionResult {
  nextState: GameState
  events: GameEvent[]
  accepted: boolean
}

export function validateAction(state: GameState, action: PlayerAction): ActionValidationResult {
  if (action.type === "INSTANT_WIN") {
    return validateInstantWin(state, action)
  }
  return {
    isValid: false,
    error: {
      code: "NORMAL_ACTION_NOT_IMPLEMENTED",
      message: "Normal turn validation is not implemented yet",
    },
  }
}

export function applyAction(state: GameState, action: PlayerAction): ApplyActionResult {
  if (action.type === "INSTANT_WIN") {
    const nextState: GameState = {
      ...state,
      stage: "SETTLING",
    }
    const event: GameEvent = {
      eventId: 0,
      type: "INSTANT_WIN",
      seatId: action.seatId,
      timestamp: action.timestamp,
    }
    return {
      nextState,
      events: [event],
    }
  }
  return {
    nextState: state,
    events: [],
  }
}

export function handleAction(state: GameState, action: PlayerAction): HandleActionResult {
  if (state.phase === "SETTLING") {
    const settlement = calculateSettlement(state)
    const updatedSeats: SeatState[] = state.seats.map(seat => {
      const result = settlement.playerResults.find(r => r.playerId === seat.playerId)
      if (!result) {
        return seat
      }
      return {
        ...seat,
        totalScore: result.totalScore,
      }
    })
    const nextState: GameState = {
      ...state,
      seats: updatedSeats,
      phase: "WAITING",
      currentTurnSeatId: null,
      currentPlayerId: null,
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
    return {
      nextState,
      events: [],
      accepted: true,
    }
  }
  if (action.type === "INSTANT_WIN") {
    return handleInstantWin(state, action)
  }
  if (action.type === "PLAY_CARDS") {
    return handlePlayCards(state, action)
  }
  if (action.type === "PASS") {
    return handlePass(state, action)
  }
  return {
    nextState: state,
    events: [],
    accepted: false,
  }
}

function validateInstantWin(state: GameState, action: PlayerAction): ActionValidationResult {
  const seat = state.seats.find(
    s => s.seatId === action.seatId && s.playerId === action.playerId,
  )
  if (!seat) {
    return {
      isValid: false,
      error: {
        code: "SEAT_NOT_FOUND",
        message: "Seat for instant win not found",
      },
    }
  }
  const cards: Card[] = []
  for (const id of action.cardIds) {
    const card = seat.handCards.find(c => c.id === id)
    if (!card) {
      return {
        isValid: false,
        error: {
          code: "CARD_NOT_IN_HAND",
          message: "Card for instant win is not in player hand",
        },
      }
    }
    cards.push(card)
  }
  if (!isValidInstantWinCards(cards)) {
    return {
      isValid: false,
      error: {
        code: "INVALID_INSTANT_WIN_CARDS",
        message: "Instant win must use exactly three red tens",
      },
    }
  }
  return {
    isValid: true,
    error: null,
  }
}

function handleInstantWin(state: GameState, action: PlayerAction): HandleActionResult {
  const validation = validateInstantWin(state, action)
  if (!validation.isValid) {
    return {
      nextState: state,
      events: [],
      accepted: false,
    }
  }
  const seats = state.seats.map(seat => {
    if (seat.playerId !== action.playerId || seat.seatId !== action.seatId) {
      return seat
    }
    const remaining = seat.handCards.filter(
      card => !action.cardIds.includes(card.id),
    )
    return {
      ...seat,
      handCards: remaining,
      isFinished: true,
      isFirstFinisher: true,
    }
  })
  const nextState: GameState = {
    ...state,
    seats,
    phase: "SETTLING",
    winnerId: action.playerId,
  }
  const event: GameEvent = {
    eventId: 0,
    type: "INSTANT_WIN",
    seatId: action.seatId,
    timestamp: action.timestamp,
  }
  return {
    nextState,
    events: [event],
    accepted: true,
  }
}

function handlePlayCards(state: GameState, action: PlayerAction): HandleActionResult {
  const seat = state.seats.find(
    s => s.playerId === action.playerId && s.seatId === action.seatId,
  )
  if (!seat || seat.isFinished) {
    return {
      nextState: state,
      events: [],
      accepted: false,
    }
  }
  const cards: Card[] = []
  for (const id of action.cardIds) {
    const card = seat.handCards.find(c => c.id === id)
    if (!card) {
      return {
        nextState: state,
        events: [],
        accepted: false,
      }
    }
    cards.push(card)
  }
  const comboResult = detectCombo({ cards })
  if (!comboResult.isValid || !comboResult.combo) {
    return {
      nextState: state,
      events: [],
      accepted: false,
    }
  }
  const combo = comboResult.combo
  if (state.currentPlayerId && state.currentPlayerId !== action.playerId) {
    return {
      nextState: state,
      events: [],
      accepted: false,
    }
  }
  const prevCombo = state.lastCombo
  if (prevCombo && !canBeat(prevCombo, combo)) {
    return {
      nextState: state,
      events: [],
      accepted: false,
    }
  }
  const remainingHand = seat.handCards.filter(
    card => !action.cardIds.includes(card.id),
  )
  const updatedSeat: SeatState = {
    ...seat,
    handCards: remainingHand,
  }
  let seats = state.seats.map(s => (s.seatId === updatedSeat.seatId ? updatedSeat : s))
  let winnerId: PlayerId | null = state.winnerId
  let phase: GamePhase = state.phase
  let firstFinisherSeatId = state.firstFinisherSeatId
  let windSourceSeatId = state.windSourceSeatId
  let windDefaultReceiverSeatId = state.windDefaultReceiverSeatId
  let windMode = state.windMode
  if (
    windMode !== "NONE" &&
    windSourceSeatId != null &&
    action.seatId !== windSourceSeatId
  ) {
    windSourceSeatId = null
    windDefaultReceiverSeatId = null
    windMode = "NONE"
  }
  if (remainingHand.length === 0) {
    const isFirst = !state.seats.some(s => s.isFirstFinisher)
    const finishedSeat: SeatState = {
      ...updatedSeat,
      isFinished: true,
      isFirstFinisher: isFirst,
    }
    seats = state.seats.map(s => (s.seatId === finishedSeat.seatId ? finishedSeat : s))
    if (isFirst) {
      winnerId = finishedSeat.playerId
      firstFinisherSeatId = finishedSeat.seatId
    }
    const activeSeats = seats.filter(s => !s.isFinished)
    if (activeSeats.length > 0) {
      const hasRedTenInHand = seats.some(seat =>
        seat.handCards.some(card => card.isRedTen),
      )
      const teamsConfirmed = !hasRedTenInHand
      const sourceSeatId = finishedSeat.seatId
      let defaultReceiver: SeatState | null = null
      if (teamsConfirmed && finishedSeat.camp) {
        const sameCampSeats = seats.filter(
          s => !s.isFinished && s.camp === finishedSeat.camp && s.seatId !== sourceSeatId,
        )
        if (sameCampSeats.length > 0) {
          const sorted = sameCampSeats.slice().sort((a, b) => a.seatId - b.seatId)
          const after = sorted.find(s => s.seatId > sourceSeatId)
          defaultReceiver = after || sorted[0]
        }
      }
      if (!defaultReceiver) {
        const nextActive = findNextActiveSeat(seats, sourceSeatId)
        defaultReceiver = nextActive
      }
      windSourceSeatId = sourceSeatId
      windDefaultReceiverSeatId = defaultReceiver ? defaultReceiver.seatId : null
      windMode = teamsConfirmed ? "CONFIRMED" : "UNCONFIRMED"
    }
  }
  let nextTurn: SeatState | null = null
  if (remainingHand.length === 0 && windMode !== "NONE" && windDefaultReceiverSeatId != null) {
    const seatsSorted = seats
      .filter(s => !s.isFinished)
      .slice()
      .sort((a, b) => a.seatId - b.seatId)
    const findNext = (fromId: SeatId, skipIds: SeatId[]): SeatState | null => {
      if (seatsSorted.length === 0) {
        return null
      }
      const index = seatsSorted.findIndex(s => s.seatId === fromId)
      const startIndex = index === -1 ? 0 : (index + 1) % seatsSorted.length
      let i = startIndex
      for (let step = 0; step < seatsSorted.length; step += 1) {
        const seatCandidate = seatsSorted[i]
        if (!skipIds.includes(seatCandidate.seatId)) {
          return seatCandidate
        }
        i = (i + 1) % seatsSorted.length
      }
      return null
    }
    if (windMode === "UNCONFIRMED") {
      const defaultId = windDefaultReceiverSeatId as SeatId
      const skipIds: SeatId[] = []
      if (windSourceSeatId != null) {
        skipIds.push(windSourceSeatId as SeatId)
      }
      skipIds.push(defaultId)
      const firstQuestion = findNext(defaultId, skipIds)
      nextTurn = firstQuestion || seats.find(s => s.seatId === defaultId) || null
    } else {
      const sourceId = windSourceSeatId as SeatId
      const defaultId = windDefaultReceiverSeatId as SeatId
      const seatsSortedById = seats
        .slice()
        .sort((a, b) => a.seatId - b.seatId)
      const path: SeatState[] = []
      if (seatsSortedById.length > 0) {
        const indexSource = seatsSortedById.findIndex(s => s.seatId === sourceId)
        const indexDefault = seatsSortedById.findIndex(s => s.seatId === defaultId)
        if (indexSource !== -1 && indexDefault !== -1) {
          let i = (indexSource + 1) % seatsSortedById.length
          while (i !== indexDefault) {
            const s = seatsSortedById[i]
            if (!s.isFinished) {
              path.push(s)
            }
            i = (i + 1) % seatsSortedById.length
          }
        }
      }
      const firstQuestion = path.find(s => !s.isFinished) || null
      nextTurn = firstQuestion || seats.find(s => s.seatId === defaultId) || null
    }
  } else {
    nextTurn = findNextActiveSeat(seats, action.seatId)
  }
  const nextState: GameState = {
    ...state,
    seats,
    lastPlayedCombo: combo,
    lastPlayedPlayerId: action.playerId,
    lastCombo: combo,
    lastComboSeatId: action.seatId,
    currentTurnSeatId: nextTurn ? nextTurn.seatId : null,
    currentPlayerId: nextTurn ? nextTurn.playerId : null,
    phase,
    winnerId,
    firstFinisherSeatId,
    windSourceSeatId,
    windDefaultReceiverSeatId,
    windMode,
    passedSeatIds: [],
  }
  const event: GameEvent = {
    eventId: 0,
    type: "PLAY_CARDS",
    seatId: action.seatId,
    timestamp: action.timestamp,
  }
  return {
    nextState,
    events: [event],
    accepted: true,
  }
}

function handlePass(state: GameState, action: PlayerAction): HandleActionResult {
  if (state.phase !== "PLAYING") {
    return {
      nextState: state,
      events: [],
      accepted: false,
    }
  }
  if (!state.lastPlayedCombo) {
    return {
      nextState: state,
      events: [],
      accepted: false,
    }
  }
  const seat = state.seats.find(
    s => s.playerId === action.playerId && s.seatId === action.seatId,
  )
  if (!seat || seat.isFinished) {
    return {
      nextState: state,
      events: [],
      accepted: false,
    }
  }
  const seats = state.seats
  const isCurrentTurn =
    state.currentTurnSeatId != null && state.currentTurnSeatId === action.seatId
  let nextSeat: SeatState | null = null
  let lastPlayedCombo: Combo | null = state.lastPlayedCombo
  let lastPlayedPlayerId = state.lastPlayedPlayerId
  let lastCombo = state.lastCombo
  let lastComboSeatId = state.lastComboSeatId
  let windSourceSeatId = state.windSourceSeatId
  let windDefaultReceiverSeatId = state.windDefaultReceiverSeatId
  let windMode = state.windMode
  let passedSeatIds = state.passedSeatIds.includes(action.seatId)
    ? state.passedSeatIds
    : state.passedSeatIds.concat(action.seatId)
  if (isCurrentTurn) {
    nextSeat = findNextActiveSeat(seats, action.seatId)
    if (state.windMode === "NONE") {
      if (
        nextSeat &&
        state.lastPlayedPlayerId &&
        nextSeat.playerId === state.lastPlayedPlayerId
      ) {
        lastPlayedCombo = null
        lastPlayedPlayerId = null
        lastCombo = null
        lastComboSeatId = null
        passedSeatIds = []
      }
    } else if (
      nextSeat &&
      windDefaultReceiverSeatId != null &&
      nextSeat.seatId === windDefaultReceiverSeatId
    ) {
      lastPlayedCombo = null
      lastPlayedPlayerId = null
      lastCombo = null
      lastComboSeatId = null
      windSourceSeatId = null
      windDefaultReceiverSeatId = null
      windMode = "NONE"
      passedSeatIds = []
    }
  } else if (state.currentTurnSeatId != null) {
    nextSeat = seats.find(s => s.seatId === state.currentTurnSeatId) || null
  }
  const nextState: GameState = {
    ...state,
    currentTurnSeatId: nextSeat ? nextSeat.seatId : null,
    currentPlayerId: nextSeat ? nextSeat.playerId : null,
    lastPlayedCombo,
    lastPlayedPlayerId,
    lastCombo,
    lastComboSeatId,
    windSourceSeatId,
    windDefaultReceiverSeatId,
    windMode,
    passedSeatIds,
  }
  const event: GameEvent = {
    eventId: 0,
    type: "PASS",
    seatId: action.seatId,
    timestamp: action.timestamp,
  }
  return {
    nextState,
    events: [event],
    accepted: true,
  }
}

function findNextActiveSeat(seats: SeatState[], fromSeatId: SeatId): SeatState | null {
  const active = seats
    .filter(s => !s.isFinished)
    .slice()
    .sort((a, b) => a.seatId - b.seatId)
  if (active.length === 0) {
    return null
  }
  const index = active.findIndex(s => s.seatId === fromSeatId)
  if (index === -1) {
    return active[0]
  }
  const nextIndex = (index + 1) % active.length
  return active[nextIndex]
}
