import { Card, Combo, ErrorInfo, RankEnum } from "../domain/types"

export interface DetectComboParams {
  cards: Card[]
}

export interface DetectComboResult {
  isValid: boolean
  combo: Combo | null
  error: ErrorInfo | null
}

export function detectCombo(params: DetectComboParams): DetectComboResult {
  const cards = params.cards
  if (!cards || cards.length === 0) {
    return invalidResult({
      code: "EMPTY_COMBO",
      message: "No cards provided",
    })
  }
  if (cards.length === 1) {
    const card = cards[0]
    return validResult({
      type: "SINGLE",
      cards: [card],
      mainRank: card.rank,
      length: 1,
    })
  }
  if (cards.length === 2) {
    const [a, b] = cards
    if (a.isRedTen && b.isRedTen) {
      return validResult({
        type: "RED_TEN_BOMB",
        cards: [a, b],
        mainRank: RankEnum.TEN,
        length: 2,
      })
    }
    if (a.rank === b.rank) {
      return validResult({
        type: "PAIR",
        cards: [a, b],
        mainRank: a.rank,
        length: 2,
      })
    }
    return invalidResult({
      code: "INVALID_PAIR",
      message: "Two cards must have same rank",
    })
  }
  if (isBomb(cards)) {
    return validResult(bombFromCards(cards))
  }
  if (cards.length >= 3 && isStraight(cards)) {
    return validResult(straightFromCards(cards))
  }
  return invalidResult({
    code: "UNRECOGNIZED_COMBO",
    message: "Cards do not form a valid combo",
  })
}

function invalidResult(error: ErrorInfo): DetectComboResult {
  return {
    isValid: false,
    combo: null,
    error,
  }
}

function validResult(combo: Combo): DetectComboResult {
  return {
    isValid: true,
    combo,
    error: null,
  }
}

function allRedTens(cards: Card[]): boolean {
  if (cards.length === 0) {
    return false
  }
  for (const card of cards) {
    if (!card.isRedTen) {
      return false
    }
  }
  return true
}

function isBomb(cards: Card[]): boolean {
  if (cards.length < 3) {
    return false
  }
  if (cards.length === 3 && allRedTens(cards)) {
    return false
  }
  const firstRank = cards[0].rank
  for (let i = 1; i < cards.length; i += 1) {
    if (cards[i].rank !== firstRank) {
      return false
    }
  }
  return true
}

function bombFromCards(cards: Card[]): Combo {
  const rank = cards[0].rank
  return {
    type: "BOMB",
    cards: cards.slice(),
    mainRank: rank,
    length: cards.length,
  }
}

function isStraight(cards: Card[]): boolean {
  if (cards.length < 3) {
    return false
  }
  for (const card of cards) {
    if (card.isRedTen) {
      return false
    }
  }
  const ranks = cards.map(card => card.rank).slice().sort((a, b) => a - b)
  const uniqueRanks: number[] = []
  for (const rank of ranks) {
    if (uniqueRanks.length === 0 || uniqueRanks[uniqueRanks.length - 1] !== rank) {
      uniqueRanks.push(rank)
    }
  }
  if (uniqueRanks.length !== cards.length) {
    return false
  }
  for (const rank of uniqueRanks) {
    if (rank === RankEnum.TWO) {
      return false
    }
  }
  for (let i = 1; i < uniqueRanks.length; i += 1) {
    if (uniqueRanks[i] !== uniqueRanks[i - 1] + 1) {
      return false
    }
  }
  return true
}

function straightFromCards(cards: Card[]): Combo {
  const sorted = cards.slice().sort((a, b) => a.rank - b.rank)
  const mainRank = sorted[sorted.length - 1].rank
  return {
    type: "STRAIGHT",
    cards: sorted,
    mainRank,
    length: sorted.length,
  }
}

export function compareCombos(a: Combo, b: Combo): number {
  if (a.type === b.type) {
    if (a.type === "SINGLE") {
      return compareNumber(singlePower(a.cards[0]), singlePower(b.cards[0]))
    }
    if (a.type === "PAIR") {
      return compareNumber(rankPower(a.mainRank), rankPower(b.mainRank))
    }
    if (a.type === "STRAIGHT") {
      if (a.length !== b.length) {
        return 0
      }
      return compareNumber(rankPower(a.mainRank), rankPower(b.mainRank))
    }
    if (a.type === "BOMB") {
      if (a.length !== b.length) {
        return compareNumber(a.length, b.length)
      }
      return compareNumber(rankPower(a.mainRank), rankPower(b.mainRank))
    }
    if (a.type === "RED_TEN_BOMB") {
      return 0
    }
  }
  if (a.type === "RED_TEN_BOMB" && b.type !== "RED_TEN_BOMB") {
    return 1
  }
  if (b.type === "RED_TEN_BOMB" && a.type !== "RED_TEN_BOMB") {
    return -1
  }
  const aIsBomb = a.type === "BOMB" || a.type === "RED_TEN_BOMB"
  const bIsBomb = b.type === "BOMB" || b.type === "RED_TEN_BOMB"
  if (aIsBomb && !bIsBomb) {
    return 1
  }
  if (bIsBomb && !aIsBomb) {
    return -1
  }
  const typeOrder: Record<string, number> = {
    SINGLE: 1,
    PAIR: 2,
    STRAIGHT: 3,
    BOMB: 4,
    RED_TEN_BOMB: 5,
  }
  const aOrder = typeOrder[a.type]
  const bOrder = typeOrder[b.type]
  return compareNumber(aOrder, bOrder)
}

function isBombType(combo: Combo): boolean {
  return combo.type === "BOMB" || combo.type === "RED_TEN_BOMB"
}

export function canBeat(prev: Combo | null, next: Combo): boolean {
  if (!prev) {
    return true
  }
  if (prev.type === next.type) {
    if (prev.type === "SINGLE" || prev.type === "PAIR") {
      return compareCombos(next, prev) === 1
    }
    if (prev.type === "STRAIGHT") {
      if (prev.length !== next.length) {
        return false
      }
      return compareCombos(next, prev) === 1
    }
    if (prev.type === "BOMB") {
      return compareCombos(next, prev) === 1
    }
    if (prev.type === "RED_TEN_BOMB") {
      if (next.type !== "RED_TEN_BOMB") {
        return false
      }
      return compareCombos(next, prev) === 1
    }
  }
  const prevIsBomb = isBombType(prev)
  const nextIsBomb = isBombType(next)
  if (prevIsBomb && nextIsBomb) {
    return compareCombos(next, prev) === 1
  }
  if (!prevIsBomb && nextIsBomb) {
    return true
  }
  if (prevIsBomb && !nextIsBomb) {
    return false
  }
  return false
}

function compareNumber(a: number, b: number): number {
  if (a > b) {
    return 1
  }
  if (a < b) {
    return -1
  }
  return 0
}

function singlePower(card: Card): number {
  if (card.isRedTen) {
    return 14
  }
  return rankPower(card.rank)
}

function rankPower(rank: RankEnum): number {
  switch (rank) {
    case RankEnum.THREE:
      return 1
    case RankEnum.FOUR:
      return 2
    case RankEnum.FIVE:
      return 3
    case RankEnum.SIX:
      return 4
    case RankEnum.SEVEN:
      return 5
    case RankEnum.EIGHT:
      return 6
    case RankEnum.NINE:
      return 7
    case RankEnum.TEN:
      return 8
    case RankEnum.JACK:
      return 9
    case RankEnum.QUEEN:
      return 10
    case RankEnum.KING:
      return 11
    case RankEnum.ACE:
      return 12
    case RankEnum.TWO:
      return 13
    default:
      return 0
  }
}
