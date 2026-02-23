import PlayerHand from "./PlayerHand"
import PlayerSeat from "./PlayerSeat"
import TurnInfo from "./TurnInfo"

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

function GameTable({
  roomState,
  playerId,
  selectedCardIds,
  onToggleCard,
  onPlay,
  onPass,
  onInstantWin,
  canInstantWin,
  lastEvent,
  playHistory = [],
  kingPlayerId,
  redTenPlayerIds = [],
}) {
  if (!roomState) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-950">
        <div className="text-center text-slate-300 text-sm">
          <div className="mb-2">等待房间状态同步</div>
          <div className="text-xs text-slate-500">请确认房间人数是否已满足开局条件</div>
        </div>
      </div>
    )
  }

  const seats = roomState.seats || []
  const selfSeat = seats.find(s => s.playerId === playerId)
  const otherSeats = seats.filter(s => s.playerId !== playerId)
  const topSeats = otherSeats.slice(0, 3)
  const sideSeats = otherSeats.slice(3)
  const leftSideSeats = sideSeats.slice(0, 2)
  const rightSideSeats = sideSeats.slice(2)

  const currentTurnSeatId = roomState.currentTurnSeatId
  const passedSeatIdSet = new Set(roomState.passedSeatIds || [])
  const redTenPlayerIdSet = new Set(redTenPlayerIds || [])

  const lastCombo = roomState.lastCombo
  const lastComboCards = lastCombo ? lastCombo.cards || lastCombo : []

  return (
    <div className="flex-1 flex flex-col bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.25),_transparent_60%),radial-gradient(circle_at_bottom,_rgba(34,197,94,0.25),_transparent_55%)]">
      <div className="flex-1 flex flex-col md:hidden">
        <div className="flex flex-row items-center justify-center px-2 pt-2 pb-1 overflow-x-auto gap-2">
          {otherSeats.map(seat => (
            <div key={seat.seatId} className="flex-shrink-0">
              <PlayerSeat
                seat={seat}
                align="top"
                isCurrent={seat.seatId === currentTurnSeatId}
                hasRedTen={redTenPlayerIdSet.has(seat.playerId)}
                hasCrown={kingPlayerId === seat.playerId}
                isPassed={passedSeatIdSet.has(seat.seatId)}
              />
            </div>
          ))}
        </div>
        <div className="flex-1 flex items-center justify-center px-2 pb-2">
          <div className="w-full max-w-sm h-40 rounded-3xl bg-gradient-to-br from-emerald-900/70 via-emerald-800/70 to-slate-900/80 border border-emerald-500/40 shadow-[0_0_60px_rgba(16,185,129,0.55)] flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,_rgba(34,197,94,0.25),_transparent_60%)]" />
            <div className="relative z-10 flex flex-col items-center gap-3">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-emerald-300">
                <span>Center Pot</span>
                {lastCombo && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-900/70 border border-emerald-400/60 text-[9px] tracking-[0.16em]">
                    {lastCombo.type}
                  </span>
                )}
              </div>
              <div className="relative flex justify-center items-center w-full h-28">
                <div className="absolute inset-10 rounded-[999px] bg-[radial-gradient(circle_at_center,_rgba(16,185,129,0.35),_transparent_70%)] blur-xl" />
                {lastCombo &&
                  lastComboCards.map((item, index) => {
                    const card = typeof item === "number" ? null : item
                    const key = card ? card.id : index
                    const count = lastComboCards.length || 1
                    const offset = (index - (count - 1) / 2) * 10
                    const rotate = offset / 36
                    if (!card) {
                      return (
                        <div
                          key={key}
                          className="w-9 h-12 rounded-xl bg-slate-900/80 border border-emerald-300/70 flex items-center justify-center text-[11px] text-emerald-100 shadow-lg shadow-emerald-500/40 transform transition-transform duration-300 animate-[fadeUp_0.35s_ease-out]"
                          style={{
                            transform: `translateX(${offset}px) rotate(${rotate}deg)`,
                          }}
                        >
                          {String(item)}
                        </div>
                      )
                    }
                    const rankText = rankToText(card.rank)
                    const suitSymbol = suitToSymbol(card.suit)
                    const red = isRedSuit(card.suit)
                    return (
                      <div
                        key={key}
                        className={
                          "absolute w-9 h-12 rounded-xl border bg-slate-50 px-1 py-1 flex flex-col justify-between shadow-lg shadow-emerald-500/50 transition-transform duration-300 animate-[fadeUp_0.35s_ease-out] " +
                          (red ? "text-rose-600 border-rose-400" : "text-slate-900 border-emerald-300/80")
                        }
                        style={{
                          transform: `translateX(${offset}px) rotate(${rotate}deg)`,
                        }}
                      >
                        <div className="text-[9px] leading-none">
                          <div className="font-semibold">{rankText}</div>
                          <div>{suitSymbol}</div>
                        </div>
                        <div className="flex-1 flex items-center justify-center">
                          <span className="text-xs">{suitSymbol}</span>
                        </div>
                      </div>
                    )
                  })}
                {!lastCombo && (
                  <div className="text-[11px] text-emerald-200/80">等待本轮第一手出牌</div>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="px-3 pb-2">
          <TurnInfo
            roomState={roomState}
            playerId={playerId}
            lastEvent={lastEvent}
            kingPlayerId={kingPlayerId}
          />
        </div>
        <div className="px-2 pb-3 flex flex-col items-center gap-2">
          <PlayerHand
            seat={selfSeat}
            selectedCardIds={selectedCardIds}
            onToggleCard={onToggleCard}
          />
          <div className="w-full max-w-md flex items-center justify-center gap-2">
            {canInstantWin && (
              <button
                className="flex-1 px-3 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-amber-400 text-[11px] font-semibold text-slate-950 shadow-lg shadow-rose-500/50 hover:from-rose-400 hover:to-amber-300 hover:shadow-rose-400/70 active:scale-[0.97] transition"
                onClick={onInstantWin}
              >
                三红十直接获胜
              </button>
            )}
            <button
              className="flex-1 px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/50 hover:from-emerald-400 hover:to-cyan-400 hover:shadow-emerald-400/70 active:scale-[0.97] transition disabled:opacity-40 disabled:cursor-not-allowed"
              onClick={onPlay}
              disabled={!selectedCardIds.length}
            >
              出牌
            </button>
            <button
              className="px-3 py-2 rounded-xl bg-slate-800 text-xs font-medium text-slate-200 border border-slate-600 hover:border-slate-400 hover:bg-slate-700 active:scale-[0.97] transition"
              onClick={onPass}
            >
              Pass
            </button>
          </div>
        </div>
      </div>
      <div className="hidden md:flex-1 md:flex md:flex-col">
        <div className="flex-1 flex flex-col md:flex-row">
          <div className="md:w-1/5 flex md:flex-col items-center justify-center gap-3 md:gap-4 px-2 md:px-0 pt-3 md:pt-0">
            {leftSideSeats.map(seat => (
              <PlayerSeat
                key={seat.seatId}
                seat={seat}
                align="left"
                isCurrent={seat.seatId === currentTurnSeatId}
                hasRedTen={redTenPlayerIdSet.has(seat.playerId)}
                hasCrown={kingPlayerId === seat.playerId}
                isPassed={passedSeatIdSet.has(seat.seatId)}
              />
            ))}
          </div>
          <div className="flex-1 flex flex-col px-2 md:px-0">
            <div className="flex-1 flex flex-col">
              <div className="flex-1 flex items-center justify-center pt-2 md:pt-0">
                <div className="w-full max-w-md md:max-w-2xl h-52 md:h-64 rounded-3xl bg-gradient-to-br from-emerald-900/70 via-emerald-800/70 to-slate-900/80 border border-emerald-500/40 shadow-[0_0_80px_rgba(16,185,129,0.55)] flex flex-col items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,_rgba(34,197,94,0.25),_transparent_60%)]" />
                  <div className="relative z-10 flex flex-col items-center gap-4">
                    <div className="flex items-center gap-3 text-xs uppercase tracking-[0.35em] text-emerald-300">
                      <span>Center Pot</span>
                      {lastCombo && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-900/70 border border-emerald-400/60 text-[10px] tracking-[0.18em]">
                          {lastCombo.type}
                        </span>
                      )}
                    </div>
                    <div className="relative flex justify-center items-center w-full h-32 md:h-40">
                      <div className="absolute inset-12 rounded-[999px] bg-[radial-gradient(circle_at_center,_rgba(16,185,129,0.35),_transparent_70%)] blur-xl" />
            {lastCombo &&
              lastComboCards.map((item, index) => {
                          const card = typeof item === "number" ? null : item
                          const key = card ? card.id : index
                          const count = lastComboCards.length || 1
                const offset = (index - (count - 1) / 2) * 12
                const rotate = offset / 40
                          if (!card) {
                            return (
                              <div
                                key={key}
                                className="w-10 h-14 rounded-xl bg-slate-900/80 border border-emerald-300/70 flex items-center justify-center text-xs text-emerald-100 shadow-lg shadow-emerald-500/40 transform transition-transform duration-300 animate-[fadeUp_0.35s_ease-out]"
                                style={{
                                  transform: `translateX(${offset}px) rotate(${rotate}deg)`,
                                }}
                              >
                                {String(item)}
                              </div>
                            )
                          }
                          const rankText = rankToText(card.rank)
                          const suitSymbol = suitToSymbol(card.suit)
                          const red = isRedSuit(card.suit)
                          return (
                            <div
                              key={key}
                              className={
                                "absolute w-10 h-14 rounded-xl border bg-slate-50 px-1 py-1 flex flex-col justify-between shadow-lg shadow-emerald-500/50 transition-transform duration-300 animate-[fadeUp_0.35s_ease-out] " +
                                (red ? "text-rose-600 border-rose-400" : "text-slate-900 border-emerald-300/80")
                              }
                              style={{
                                transform: `translateX(${offset}px) rotate(${rotate}deg)`,
                              }}
                            >
                              <div className="text-[9px] leading-none">
                                <div className="font-semibold">{rankText}</div>
                                <div>{suitSymbol}</div>
                              </div>
                              <div className="flex-1 flex items-center justify-center">
                                <span className="text-sm">{suitSymbol}</span>
                              </div>
                            </div>
                          )
                        })}
                      {!lastCombo && (
                        <div className="text-xs text-emerald-200/80">
                          等待本轮第一手出牌
                        </div>
                      )}
                    </div>
                    {playHistory && playHistory.length > 0 && (
                      <div className="mt-3 w-full max-w-xs self-end text-[10px] text-emerald-100/70">
                        <div className="mb-1 flex items-center justify-between">
                          <span className="uppercase tracking-[0.18em] text-emerald-300/80">
                            History
                          </span>
                          <span className="text-[9px] text-emerald-200/60">
                            最近 {Math.min(Math.max(playHistory.length - 1, 0), 3)} 手
                          </span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          {playHistory
                            .slice(0, -1)
                            .slice(-3)
                            .reverse()
                            .map((entry, index) => {
                              const combo = entry.combo
                              if (!combo) {
                                return null
                              }
                              const cards = combo.cards || combo
                              return (
                                <div
                                  key={index}
                                  className="flex items-center gap-1.5 rounded-xl px-2 py-1 border border-emerald-700/60 bg-slate-950/75"
                                >
                                  <div className="flex flex-wrap gap-[2px]">
                                    {cards.map((item, idx) => {
                                      const card = typeof item === "number" ? null : item
                                      const key = card ? card.id : idx
                                      if (!card) {
                                        return (
                                          <div
                                            key={key}
                                            className="w-6 h-9 rounded-lg bg-slate-900/80 border border-slate-600/70 flex items-center justify-center text-[9px] text-slate-200"
                                          >
                                            {String(item)}
                                          </div>
                                        )
                                      }
                                      const rankText = rankToText(card.rank)
                                      const suitSymbol = suitToSymbol(card.suit)
                                      const red = isRedSuit(card.suit)
                                      return (
                                        <div
                                          key={key}
                                          className={
                                            "w-7 h-10 rounded-lg border bg-slate-50 px-[2px] py-[2px] flex flex-col justify-between shadow-md " +
                                            (red
                                              ? "text-rose-600 border-rose-400/80"
                                              : "text-slate-900 border-emerald-300/80")
                                          }
                                        >
                                          <div className="text-[8px] leading-none">
                                            <div className="font-semibold">{rankText}</div>
                                            <div>{suitSymbol}</div>
                                          </div>
                                          <div className="flex-1 flex items-center justify-center">
                                            <span className="text-[10px]">{suitSymbol}</span>
                                          </div>
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                              )
                            })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="h-24 md:h-28 flex items-center justify-center">
                <div className="flex gap-2 md:gap-6">
                  {topSeats.map(seat => (
                    <PlayerSeat
                      key={seat.seatId}
                      seat={seat}
                      align="top"
                      isCurrent={seat.seatId === currentTurnSeatId}
                      hasRedTen={redTenPlayerIdSet.has(seat.playerId)}
                      hasCrown={kingPlayerId === seat.playerId}
                      isPassed={passedSeatIdSet.has(seat.seatId)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="md:w-1/5 flex md:flex-col items-center justify-center gap-3 md:gap-4 px-2 md:px-0 pb-3 md:pb-0">
            {rightSideSeats.map(seat => (
              <PlayerSeat
                key={seat.seatId}
                seat={seat}
                align="right"
                isCurrent={seat.seatId === currentTurnSeatId}
                hasRedTen={redTenPlayerIdSet.has(seat.playerId)}
                hasCrown={kingPlayerId === seat.playerId}
                isPassed={passedSeatIdSet.has(seat.seatId)}
              />
            ))}
          </div>
        </div>
        <div className="h-40 md:h-40 px-3 md:px-10 flex items-center justify-between bg-gradient-to-t from-slate-950/95 via-slate-950/80 to-slate-950/40 border-t border-slate-800/80">
          <div className="w-40 md:w-64">
            <TurnInfo
              roomState={roomState}
              playerId={playerId}
              lastEvent={lastEvent}
              kingPlayerId={kingPlayerId}
            />
          </div>
          <div className="flex-1 flex flex-col items-center">
            <PlayerHand
              seat={selfSeat}
              selectedCardIds={selectedCardIds}
              onToggleCard={onToggleCard}
            />
          </div>
          <div className="w-32 md:w-64 flex flex-col items-end justify-center gap-2 md:gap-3 pr-1 md:pr-0">
            {canInstantWin && (
              <button
                className="px-4 md:px-5 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-amber-400 text-[11px] md:text-xs font-semibold text-slate-950 shadow-lg shadow-rose-500/50 hover:from-rose-400 hover:to-amber-300 hover:shadow-rose-400/70 active:scale-[0.97] transition"
                onClick={onInstantWin}
              >
                三红十直接获胜
              </button>
            )}
            <button
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/50 hover:from-emerald-400 hover:to-cyan-400 hover:shadow-emerald-400/70 active:scale-[0.97] transition disabled:opacity-40 disabled:cursor-not-allowed"
              onClick={onPlay}
              disabled={!selectedCardIds.length}
            >
              出牌
            </button>
            <button
              className="px-5 py-2 rounded-xl bg-slate-800 text-xs font-medium text-slate-200 border border-slate-600 hover:border-slate-400 hover:bg-slate-700 active:scale-[0.97] transition"
              onClick={onPass}
            >
              Pass
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GameTable
