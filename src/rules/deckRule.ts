import { Card, DeckConfig, RankEnum, Suit } from "../domain/types"

export interface InitializeDeckParams {
  config: DeckConfig
  rngSeed: string
}

export interface InitializeDeckResult {
  deck: Card[]
}

export function initializeDeck(params: InitializeDeckParams): InitializeDeckResult {
  const cards: Card[] = []
  const deckCount = params.config.deckCount
  let idCounter = 1
  for (let deckIndex = 1; deckIndex <= deckCount; deckIndex += 1) {
    const originDeckIndex = deckIndex as 1 | 2
    const suits: Suit[] = ["Spade", "Heart", "Diamond", "Club"]
    const ranks: RankEnum[] = [
      RankEnum.THREE,
      RankEnum.FOUR,
      RankEnum.FIVE,
      RankEnum.SIX,
      RankEnum.SEVEN,
      RankEnum.EIGHT,
      RankEnum.NINE,
      RankEnum.TEN,
      RankEnum.JACK,
      RankEnum.QUEEN,
      RankEnum.KING,
      RankEnum.ACE,
      RankEnum.TWO,
    ]
    for (const suit of suits) {
      for (const rank of ranks) {
        const isRedTen =
          rank === RankEnum.TEN &&
          (suit === "Heart" || suit === "Diamond")
        cards.push({
          id: idCounter,
          rank,
          suit,
          isRedTen,
          originDeckIndex,
        })
        idCounter += 1
      }
    }
  }
  const redTenIndices: number[] = []
  for (let i = 0; i < cards.length; i += 1) {
    if (cards[i].isRedTen) {
      redTenIndices.push(i)
    }
  }
  if (redTenIndices.length !== 4) {
    throw new Error("Deck must contain exactly 4 red tens before removal")
  }
  const rng = createRng(params.rngSeed)
  const removeIndexInRedTens = Math.floor(rng() * redTenIndices.length)
  const removeIndex = redTenIndices[removeIndexInRedTens]
  cards.splice(removeIndex, 1)
  const shuffled = shuffle(cards, rng)
  if (shuffled.length !== 103) {
    throw new Error("Deck size must be 103 after removing one red ten")
  }
  return { deck: shuffled }
}

type Rng = () => number

function createRng(seed: string): Rng {
  let h = 1779033703 ^ seed.length
  for (let i = 0; i < seed.length; i += 1) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return function rng() {
    h = Math.imul(h ^ (h >>> 16), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    h ^= h >>> 16
    return (h >>> 0) / 4294967296
  }
}

function shuffle<T>(items: T[], rng: Rng): T[] {
  const array = items.slice()
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    const temp = array[i]
    array[i] = array[j]
    array[j] = temp
  }
  return array
}

