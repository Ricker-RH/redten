function rankToText(rank) {
  if (rank === 11) return "J"
  if (rank === 12) return "Q"
  if (rank === 13) return "K"
  if (rank === 14) return "A"
  if (rank === 15) return "2"
  return String(rank)
}

function suitToSymbol(suit) {
  if (suit === "Heart") return "♥"
  if (suit === "Diamond") return "♦"
  if (suit === "Club") return "♣"
  if (suit === "Spade") return "♠"
  return ""
}

function isRedSuit(suit) {
  return suit === "Heart" || suit === "Diamond"
}

function PlayerHand({ seat, selectedCardIds, onToggleCard }) {
  if (!seat) {
    return (
      <div className="text-xs text-slate-400">
        等待你被分配座位
      </div>
    )
  }

  const cards = seat.handCards || []
  const sorted = cards.slice().sort((a, b) => {
    if (a.rank !== b.rank) {
      return a.rank - b.rank
    }
    if (a.suit < b.suit) return -1
    if (a.suit > b.suit) return 1
    return a.id - b.id
  })
  const count = sorted.length || 1
  const spread = Math.min(32, 260 / count)

  return (
    <>
      <div className="md:hidden w-full max-w-md">
        <div className="h-24 w-full rounded-full bg-slate-900/85 border border-slate-700/80 shadow-[0_0_40px_rgba(15,23,42,1)] px-3 flex items-center overflow-x-auto gap-2">
          {sorted.map(card => {
            const isSelected = selectedCardIds.includes(card.id)
            const rankText = rankToText(card.rank)
            const suitSymbol = suitToSymbol(card.suit)
            const red = isRedSuit(card.suit)
            return (
              <button
                key={card.id}
                onClick={() => onToggleCard(card.id)}
                className={
                  "flex-shrink-0 transition-transform duration-150 outline-none " +
                  (isSelected ? "-translate-y-1.5" : "active:-translate-y-1")
                }
              >
                <div
                  className={
                    "w-12 h-18 rounded-2xl border flex flex-col justify-between px-1.5 py-1.5 bg-slate-50 " +
                    (card.isRedTen
                      ? "border-amber-400 shadow-[0_0_18px_rgba(251,191,36,0.6)]"
                      : "border-slate-400 shadow-md") +
                    " " +
                    (red ? "text-rose-600" : "text-slate-900") +
                    (isSelected ? " ring-2 ring-emerald-400/90" : "")
                  }
                >
                  <div className="flex flex-col items-start leading-none">
                    <span className="text-[12px] font-semibold">{rankText}</span>
                    <span className="text-[11px]">{suitSymbol}</span>
                  </div>
                  <div className="flex-1 flex items-center justify-center">
                    <span className="text-lg">{suitSymbol}</span>
                  </div>
                  <div className="flex flex-col items-end leading-none rotate-180">
                    <span className="text-[12px] font-semibold">{rankText}</span>
                    <span className="text-[11px]">{suitSymbol}</span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
      <div className="hidden md:flex relative h-32 w-full max-w-3xl items-end justify-center">
        <div className="absolute inset-x-6 bottom-0 h-20 rounded-full bg-slate-900/80 border border-slate-700/80 shadow-[0_0_60px_rgba(15,23,42,1)]" />
        <div className="relative flex justify-center w-full">
          {sorted.map((card, index) => {
            const offset = (index - (count - 1) / 2) * spread
            const isSelected = selectedCardIds.includes(card.id)
            const rankText = rankToText(card.rank)
            const suitSymbol = suitToSymbol(card.suit)
            const red = isRedSuit(card.suit)
            return (
              <button
                key={card.id}
                onClick={() => onToggleCard(card.id)}
                className={
                  "absolute bottom-0 origin-bottom transition-transform duration-150 outline-none " +
                  (isSelected
                    ? "-translate-y-7"
                    : "hover:-translate-y-4 hover:scale-105 focus-visible:-translate-y-4")
                }
                style={{
                  transform: `translateX(${offset}px) rotate(${offset / 32}deg)`
                }}
              >
                <div
                  className={
                    "w-14 h-20 rounded-2xl border flex flex-col justify-between px-2 py-1 bg-slate-50 " +
                    (card.isRedTen
                      ? "border-amber-400 shadow-[0_0_18px_rgba(251,191,36,0.6)]"
                      : "border-slate-400 shadow-md") +
                    " " +
                    (red ? "text-rose-600" : "text-slate-900") +
                    (isSelected ? " ring-2 ring-emerald-400/90" : "")
                  }
                >
                  <div className="flex flex-col items-start leading-none">
                    <span className="text-[12px] font-semibold">{rankText}</span>
                    <span className="text-[11px]">{suitSymbol}</span>
                  </div>
                  <div className="flex-1 flex items-center justify-center">
                    <span className="text-lg">{suitSymbol}</span>
                  </div>
                  <div className="flex flex-col items-end leading-none rotate-180">
                    <span className="text-[12px] font-semibold">{rankText}</span>
                    <span className="text-[11px]">{suitSymbol}</span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}

export default PlayerHand
