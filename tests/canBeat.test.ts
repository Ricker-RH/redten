import { Card, Combo, RankEnum, Suit } from "../src/domain/types"
import { canBeat, detectCombo } from "../src/rules/comboRule"

function createCard(rank: RankEnum, suit: Suit, originDeckIndex: 1 | 2 = 1): Card {
  const isRedTen =
    rank === RankEnum.TEN &&
    (suit === "Heart" || suit === "Diamond")
  return {
    id: Math.random(),
    rank,
    suit,
    isRedTen,
    originDeckIndex,
  }
}

function toCombo(cards: Card[]): Combo {
  const result = detectCombo({ cards })
  if (!result.isValid || !result.combo) {
    throw new Error("Invalid combo in test data")
  }
  return result.combo
}

test("single can beat smaller single and not larger single", () => {
  const nine = createCard(RankEnum.NINE, "Spade")
  const jack = createCard(RankEnum.JACK, "Spade")
  const prev = toCombo([nine])
  const nextLarger = toCombo([jack])
  const nextSmaller = toCombo([createCard(RankEnum.EIGHT, "Spade")])
  expect(canBeat(prev, nextLarger)).toBe(true)
  expect(canBeat(prev, nextSmaller)).toBe(false)
})

test("single cannot beat pair and pair cannot be beaten by single", () => {
  const nineA = createCard(RankEnum.NINE, "Spade")
  const nineB = createCard(RankEnum.NINE, "Heart")
  const pairNine = toCombo([nineA, nineB])
  const singleKing = toCombo([createCard(RankEnum.KING, "Spade")])
  expect(canBeat(pairNine, singleKing)).toBe(false)
  expect(canBeat(singleKing, pairNine)).toBe(false)
})

test("straight of different length cannot beat each other", () => {
  const s3 = createCard(RankEnum.THREE, "Spade")
  const s4 = createCard(RankEnum.FOUR, "Spade")
  const s5 = createCard(RankEnum.FIVE, "Spade")
  const s6 = createCard(RankEnum.SIX, "Spade")
  const s7 = createCard(RankEnum.SEVEN, "Spade")
  const s8 = createCard(RankEnum.EIGHT, "Spade")
  const s9 = createCard(RankEnum.NINE, "Spade")
  const straightFive = toCombo([s3, s4, s5, s6, s7])
  const straightThree = toCombo([s7, s8, s9])
  expect(canBeat(straightFive, straightThree)).toBe(false)
  expect(canBeat(straightThree, straightFive)).toBe(false)
})

test("bomb can beat straight", () => {
  const threeA = createCard(RankEnum.THREE, "Spade")
  const threeB = createCard(RankEnum.THREE, "Heart")
  const threeC = createCard(RankEnum.THREE, "Diamond")
  const bombThree = toCombo([threeA, threeB, threeC])
  const eight = createCard(RankEnum.EIGHT, "Spade")
  const nine = createCard(RankEnum.NINE, "Heart")
  const ten = createCard(RankEnum.TEN, "Spade")
  const jack = createCard(RankEnum.JACK, "Heart")
  const queen = createCard(RankEnum.QUEEN, "Spade")
  const straight = toCombo([eight, nine, ten, jack, queen])
  expect(canBeat(straight, bombThree)).toBe(true)
  expect(canBeat(bombThree, straight)).toBe(true)
})

test("smaller bomb cannot beat larger bomb", () => {
  const nineA = createCard(RankEnum.NINE, "Spade")
  const nineB = createCard(RankEnum.NINE, "Heart")
  const nineC = createCard(RankEnum.NINE, "Diamond")
  const threeA = createCard(RankEnum.THREE, "Spade")
  const threeB = createCard(RankEnum.THREE, "Heart")
  const threeC = createCard(RankEnum.THREE, "Diamond")
  const threeD = createCard(RankEnum.THREE, "Club")
  const smallBomb = toCombo([nineA, nineB, nineC])
  const largeBomb = toCombo([threeA, threeB, threeC, threeD])
  expect(canBeat(largeBomb, smallBomb)).toBe(false)
  expect(canBeat(smallBomb, largeBomb)).toBe(true)
})

test("red ten bomb can beat any non-bomb and any normal bomb", () => {
  const redTenA = createCard(RankEnum.TEN, "Heart")
  const redTenB = createCard(RankEnum.TEN, "Diamond")
  const redBomb = toCombo([redTenA, redTenB])
  const singleAce = toCombo([createCard(RankEnum.ACE, "Spade")])
  const nineA = createCard(RankEnum.NINE, "Spade")
  const nineB = createCard(RankEnum.NINE, "Heart")
  const nineC = createCard(RankEnum.NINE, "Diamond")
  const bombNine = toCombo([nineA, nineB, nineC])
  expect(canBeat(singleAce, redBomb)).toBe(true)
  expect(canBeat(bombNine, redBomb)).toBe(true)
})

