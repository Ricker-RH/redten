import { Card, RankEnum, Suit } from "../src/domain/types"
import { detectCombo } from "../src/rules/comboRule"

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

test("detects single red ten as SINGLE", () => {
  const card = createCard(RankEnum.TEN, "Heart")
  const result = detectCombo({ cards: [card] })
  expect(result.isValid).toBe(true)
  expect(result.combo).not.toBeNull()
  if (result.combo) {
    expect(result.combo.type).toBe("SINGLE")
    expect(result.combo.mainRank).toBe(RankEnum.TEN)
    expect(result.combo.length).toBe(1)
  }
})

test("detects two red tens as RED_TEN_BOMB and normal pair correctly", () => {
  const redA = createCard(RankEnum.TEN, "Heart")
  const redB = createCard(RankEnum.TEN, "Diamond")
  const bombResult = detectCombo({ cards: [redA, redB] })
  expect(bombResult.isValid).toBe(true)
  expect(bombResult.combo).not.toBeNull()
  if (bombResult.combo) {
    expect(bombResult.combo.type).toBe("RED_TEN_BOMB")
    expect(bombResult.combo.length).toBe(2)
  }
  const tenA = createCard(RankEnum.TEN, "Spade")
  const tenB = createCard(RankEnum.TEN, "Club")
  const pairResult = detectCombo({ cards: [tenA, tenB] })
  expect(pairResult.isValid).toBe(true)
  expect(pairResult.combo).not.toBeNull()
  if (pairResult.combo) {
    expect(pairResult.combo.type).toBe("PAIR")
    expect(pairResult.combo.length).toBe(2)
  }
})

test("detects normal bomb of same rank", () => {
  const a = createCard(RankEnum.NINE, "Spade")
  const b = createCard(RankEnum.NINE, "Heart")
  const c = createCard(RankEnum.NINE, "Diamond")
  const result = detectCombo({ cards: [a, b, c] })
  expect(result.isValid).toBe(true)
  expect(result.combo).not.toBeNull()
  if (result.combo) {
    expect(result.combo.type).toBe("BOMB")
    expect(result.combo.mainRank).toBe(RankEnum.NINE)
    expect(result.combo.length).toBe(3)
  }
})

test("detects straight without red ten and rejects invalid straight with two", () => {
  const eight = createCard(RankEnum.EIGHT, "Spade")
  const nine = createCard(RankEnum.NINE, "Diamond")
  const ten = createCard(RankEnum.TEN, "Spade")
  const jack = createCard(RankEnum.JACK, "Club")
  const queen = createCard(RankEnum.QUEEN, "Spade")
  const straightResult = detectCombo({
    cards: [eight, nine, ten, jack, queen],
  })
  expect(straightResult.isValid).toBe(true)
  expect(straightResult.combo).not.toBeNull()
  if (straightResult.combo) {
    expect(straightResult.combo.type).toBe("STRAIGHT")
    expect(straightResult.combo.mainRank).toBe(RankEnum.QUEEN)
    expect(straightResult.combo.length).toBe(5)
  }
  const three = createCard(RankEnum.THREE, "Spade")
  const four = createCard(RankEnum.FOUR, "Heart")
  const five = createCard(RankEnum.FIVE, "Diamond")
  const six = createCard(RankEnum.SIX, "Club")
  const two = createCard(RankEnum.TWO, "Spade")
  const invalidResult = detectCombo({
    cards: [three, four, five, six, two],
  })
  expect(invalidResult.isValid).toBe(false)
  expect(invalidResult.combo).toBeNull()
})
