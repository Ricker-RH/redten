import { Card } from "../domain/types"

export function hasTripleRedTenInHand(handCards: Card[]): boolean {
  let count = 0
  for (const card of handCards) {
    if (card.isRedTen) {
      count += 1
    }
  }
  return count === 3
}

export function isValidInstantWinCards(cards: Card[]): boolean {
  if (cards.length !== 3) {
    return false
  }
  for (const card of cards) {
    if (!card.isRedTen) {
      return false
    }
  }
  return true
}
