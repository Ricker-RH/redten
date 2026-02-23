import { Card, Combo, RankEnum, Suit } from "../src/domain/types"
import { compareCombos, detectCombo } from "../src/rules/comboRule"

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

test("single card ordering respects red ten and black ten positions", () => {
  const redTen = createCard(RankEnum.TEN, "Heart")
  const two = createCard(RankEnum.TWO, "Spade")
  const ace = createCard(RankEnum.ACE, "Spade")
  const king = createCard(RankEnum.KING, "Spade")
  const queen = createCard(RankEnum.QUEEN, "Spade")
  const jack = createCard(RankEnum.JACK, "Spade")
  const blackTen = createCard(RankEnum.TEN, "Spade")
  const nine = createCard(RankEnum.NINE, "Spade")
  const redTenCombo = toCombo([redTen])
  const twoCombo = toCombo([two])
  const aceCombo = toCombo([ace])
  const kingCombo = toCombo([king])
  const queenCombo = toCombo([queen])
  const jackCombo = toCombo([jack])
  const blackTenCombo = toCombo([blackTen])
  const nineCombo = toCombo([nine])
  expect(compareCombos(redTenCombo, twoCombo)).toBe(1)
  expect(compareCombos(twoCombo, aceCombo)).toBe(1)
  expect(compareCombos(aceCombo, kingCombo)).toBe(1)
  expect(compareCombos(kingCombo, queenCombo)).toBe(1)
  expect(compareCombos(queenCombo, jackCombo)).toBe(1)
  expect(compareCombos(jackCombo, blackTenCombo)).toBe(1)
  expect(compareCombos(blackTenCombo, nineCombo)).toBe(1)
})

test("pair comparison uses rank only, not red ten priority inside pair", () => {
  const redTen = createCard(RankEnum.TEN, "Heart")
  const blackTen = createCard(RankEnum.TEN, "Spade")
  const nineA = createCard(RankEnum.NINE, "Spade")
  const nineB = createCard(RankEnum.NINE, "Heart")
  const pairTen = toCombo([redTen, blackTen])
  const pairNine = toCombo([nineA, nineB])
  expect(compareCombos(pairTen, pairNine)).toBe(1)
})

test("straight comparison uses highest card when lengths are equal", () => {
  const s3 = createCard(RankEnum.THREE, "Spade")
  const s4 = createCard(RankEnum.FOUR, "Spade")
  const s5 = createCard(RankEnum.FIVE, "Spade")
  const s6 = createCard(RankEnum.SIX, "Spade")
  const s7 = createCard(RankEnum.SEVEN, "Spade")
  const s8 = createCard(RankEnum.EIGHT, "Spade")
  const s9 = createCard(RankEnum.NINE, "Spade")
  const straightLow = toCombo([s3, s4, s5, s6, s7])
  const straightHigh = toCombo([s4, s5, s6, s7, s8])
  const straightHigher = toCombo([s5, s6, s7, s8, s9])
  expect(compareCombos(straightHigh, straightLow)).toBe(1)
  expect(compareCombos(straightHigher, straightHigh)).toBe(1)
})

test("bomb comparison prefers more cards then higher rank", () => {
  const nineA = createCard(RankEnum.NINE, "Spade")
  const nineB = createCard(RankEnum.NINE, "Heart")
  const nineC = createCard(RankEnum.NINE, "Diamond")
  const threeA = createCard(RankEnum.THREE, "Spade")
  const threeB = createCard(RankEnum.THREE, "Heart")
  const threeC = createCard(RankEnum.THREE, "Diamond")
  const threeD = createCard(RankEnum.THREE, "Club")
  const bombThree = toCombo([threeA, threeB, threeC, threeD])
  const bombNine = toCombo([nineA, nineB, nineC])
  expect(compareCombos(bombThree, bombNine)).toBe(1)
})

test("bomb beats straight regardless of straight strength", () => {
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
  expect(compareCombos(bombThree, straight)).toBe(1)
})

test("two red tens bomb is the strongest bomb", () => {
  const redTenA = createCard(RankEnum.TEN, "Heart")
  const redTenB = createCard(RankEnum.TEN, "Diamond")
  const bombRedTen = toCombo([redTenA, redTenB])
  const aceA = createCard(RankEnum.ACE, "Spade")
  const aceB = createCard(RankEnum.ACE, "Heart")
  const aceC = createCard(RankEnum.ACE, "Diamond")
  const aceD = createCard(RankEnum.ACE, "Club")
  const bombAces = toCombo([aceA, aceB, aceC, aceD])
  const eight = createCard(RankEnum.EIGHT, "Spade")
  const nine = createCard(RankEnum.NINE, "Heart")
  const ten = createCard(RankEnum.TEN, "Spade")
  const jack = createCard(RankEnum.JACK, "Heart")
  const queen = createCard(RankEnum.QUEEN, "Spade")
  const straight = toCombo([eight, nine, ten, jack, queen])
  expect(compareCombos(bombRedTen, bombAces)).toBe(1)
  expect(compareCombos(bombRedTen, straight)).toBe(1)
})

