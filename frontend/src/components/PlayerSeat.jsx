function PlayerSeat({ seat, align, isCurrent, hasRedTen, hasCrown, isPassed }) {
  const base =
    "px-3 py-2 rounded-2xl bg-slate-900/85 border border-slate-700/80 text-xs text-slate-100 min-w-[120px]"
  const stateText = seat.isFinished ? "已出完" : "出牌中"

  return (
    <div
      className={
        "relative flex flex-col items-center gap-1 " +
        (align === "left"
          ? "items-start"
          : align === "right"
          ? "items-end"
          : "items-center")
      }
    >
      <div
        className={
          base +
          " flex items-center justify-between gap-2" +
          (isCurrent ? " shadow-glow border-cyan-400/80" : "")
        }
      >
        <div className="flex items-center gap-2">
          <div className="relative flex items-end gap-[2px]">
            <div className="w-5 h-5 rounded-full bg-sky-400/90 border border-sky-100/80 shadow-[0_0_10px_rgba(56,189,248,0.7)]" />
            <div className="w-4 h-4 rounded-full bg-amber-400/90 border border-amber-100/80 -translate-y-[3px]" />
            <div className="w-4 h-4 rounded-full bg-emerald-400/90 border border-emerald-100/80 -translate-y-[1px]" />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-medium truncate max-w-[80px]">
              玩家 {seat.playerId}
            </span>
            <span className="text-[10px] text-slate-400">
              座位 {seat.seatId} · {stateText}
            </span>
          </div>
        </div>
        {(hasRedTen || hasCrown) && (
          <div className="flex flex-col items-end gap-1">
            {hasCrown && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-400 text-[10px] font-bold text-slate-950 shadow-[0_0_10px_rgba(251,191,36,0.8)]">
                冠
              </span>
            )}
            {hasRedTen && (
              <span className="inline-flex items-center justify-center px-1.5 h-5 rounded-full bg-rose-500/95 text-[9px] font-semibold text-slate-50 border border-rose-200/80">
                红10
              </span>
            )}
          </div>
        )}
      </div>
      {isPassed && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="px-4 py-1 rounded-full bg-rose-600/90 border border-rose-200/90 shadow-[0_0_18px_rgba(248,113,113,0.95)]">
            <span className="text-sm font-extrabold tracking-[0.2em] text-slate-50">
              PASS
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export default PlayerSeat
