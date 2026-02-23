import { Card, RankEnum, Suit } from "../src/domain/types"
import {
  hasTripleRedTenInHand,
  isValidInstantWinCards,
} from "../src/rules/specialAbilityRule"

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

test("hasTripleRedTenInHand returns true when hand has exactly three red tens", () => {
  const red1 = createCard(RankEnum.TEN, "Heart")
  const red2 = createCard(RankEnum.TEN, "Diamond")
  const red3 = createCard(RankEnum.TEN, "Heart", 2)
  const other = createCard(RankEnum.NINE, "Spade")
  const result = hasTripleRedTenInHand([red1, red2, red3, other])
  expect(result).toBe(true)
})

test("hasTripleRedTenInHand returns false when hand has fewer or more red tens", () => {
  const red1 = createCard(RankEnum.TEN, "Heart")
  const red2 = createCard(RankEnum.TEN, "Diamond")
  const other = createCard(RankEnum.TEN, "Spade")
  const extra = createCard(RankEnum.NINE, "Spade")
  const resultLess = hasTripleRedTenInHand([red1, red2, extra])
  expect(resultLess).toBe(false)
  const red3 = createCard(RankEnum.TEN, "Heart", 2)
  const resultMore = hasTripleRedTenInHand([red1, red2, red3, other, extra])
  expect(resultMore).toBe(false)
})

test("isValidInstantWinCards enforces exactly three red tens", () => {
  const red1 = createCard(RankEnum.TEN, "Heart")
  const red2 = createCard(RankEnum.TEN, "Diamond")
  const red3 = createCard(RankEnum.TEN, "Heart", 2)
  const nonRed = createCard(RankEnum.TEN, "Spade")
  const tooMany = [red1, red2, red3, nonRed]
  const tooFew = [red1, red2]
  const withNonRed = [red1, red2, nonRed]
  expect(isValidInstantWinCards([red1, red2, red3])).toBe(true)
  expect(isValidInstantWinCards(tooMany)).toBe(false)
  expect(isValidInstantWinCards(tooFew)).toBe(false)
  expect(isValidInstantWinCards(withNonRed)).toBe(false)
})
