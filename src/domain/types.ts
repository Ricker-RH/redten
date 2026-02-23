export type PlayerId = string
export type SeatId = number
export type CardId = number

export enum RankEnum {
  THREE = 3,
  FOUR = 4,
  FIVE = 5,
  SIX = 6,
  SEVEN = 7,
  EIGHT = 8,
  NINE = 9,
  TEN = 10,
  JACK = 11,
  QUEEN = 12,
  KING = 13,
  ACE = 14,
  TWO = 15,
}

export type Rank = RankEnum

export type Suit = "Spade" | "Heart" | "Diamond" | "Club"

export interface Card {
  id: CardId
  rank: Rank
  suit: Suit
  isRedTen: boolean
  originDeckIndex: 1 | 2
}

export type ComboType =
  | "SINGLE"
  | "PAIR"
  | "STRAIGHT"
  | "BOMB"
  | "RED_TEN_BOMB"

export interface Combo {
  type: ComboType
  cards: Card[]
  mainRank: Rank
  length: number
}

export type Camp = "RED_TEN" | "NORMAL"

export interface SeatState {
  seatId: SeatId
  playerId: PlayerId
  handCards: Card[]
  camp: Camp | null
  isFinished: boolean
  isFirstFinisher: boolean
  canInstantWin: boolean
  totalScore: number
}

export interface CampInfo {
  redTenCampSeats: SeatId[]
  normalCampSeats: SeatId[]
}

export type GamePhase =
  | "WAITING"
  | "DEALING"
  | "PLAYING"
  | "SETTLING"

export type GameStage =
  | "CREATED"
  | "DEALING"
  | "DRAWING"
  | "PLAYING"
  | "SHOWDOWN"
  | "SETTLING"
  | "FINISHED"

export interface DeckConfig {
  deckCount: 2
  removeJokers: boolean
  redTenRanks: Rank[]
  redTenSuits: Suit[]
}

export interface TimingConfig {
  actionTimeoutMs: number
}

export interface ScoringConfig {
  baseScore: number
}

export interface GameConfig {
  deckConfig: DeckConfig
  timingConfig: TimingConfig
  scoringConfig: ScoringConfig
}

export interface GameEvent {
  eventId: number
  type: string
  seatId: SeatId | null
  timestamp: number
}

export interface GameState {
  tableId: string
  handId: string
  config: GameConfig
  stage: GameStage
  phase: GamePhase
  seats: SeatState[]
  deck: Card[]
  drawPile: Card[]
  campInfo: CampInfo | null
  currentTurnSeatId: SeatId | null
  currentPlayerId: PlayerId | null
  lastCombo: Combo | null
  lastComboSeatId: SeatId | null
  lastPlayedCombo: Combo | null
  lastPlayedPlayerId: PlayerId | null
  firstFinisherSeatId: SeatId | null
  historyEvents: GameEvent[]
  winnerId: PlayerId | null
  windSourceSeatId: SeatId | null
  windDefaultReceiverSeatId: SeatId | null
  windMode: "NONE" | "UNCONFIRMED" | "CONFIRMED"
  passedSeatIds: SeatId[]
}

export type PlayerActionType = "PLAY_CARDS" | "PASS" | "INSTANT_WIN"

export interface PlayerAction {
  playerId: PlayerId
  seatId: SeatId
  type: PlayerActionType
  cardIds: CardId[]
  timestamp: number
}

export interface ErrorInfo {
  code: string
  message: string
}
