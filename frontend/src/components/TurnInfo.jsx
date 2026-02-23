function TurnInfo({ roomState, playerId, lastEvent, kingPlayerId }) {
  if (!roomState) {
    return null
  }

  const currentSeatId = roomState.currentTurnSeatId
  const currentSeat = roomState.seats
    ? roomState.seats.find(s => s.seatId === currentSeatId)
    : null
  const stageText = roomState.stage || roomState.phase || ""

  const isSelfTurn = currentSeat && currentSeat.playerId === playerId

  const lastSeat =
    lastEvent && typeof lastEvent.seatId === "number"
      ? roomState.seats.find(s => s.seatId === lastEvent.seatId)
      : null
  const lastSeatLabel = lastSeat ? `玩家 ${lastSeat.seatId}` : "有人"
  const selfSeat = roomState.seats
    ? roomState.seats.find(s => s.playerId === playerId)
    : null
  const eventText =
    lastEvent && lastEvent.type
      ? lastEvent.type === "PLAY_CARDS"
        ? `${lastSeatLabel} 出牌`
        : lastEvent.type === "PASS"
        ? `${lastSeatLabel} 选择 Pass`
        : lastEvent.type
      : "等待操作"

  const windMode = roomState.windMode || "NONE"
  const windSourceSeatId = roomState.windSourceSeatId
  const windDefaultReceiverSeatId = roomState.windDefaultReceiverSeatId
  const windSourceSeat =
    typeof windSourceSeatId === "number"
      ? roomState.seats.find(s => s.seatId === windSourceSeatId)
      : null
  const windDefaultSeat =
    typeof windDefaultReceiverSeatId === "number"
      ? roomState.seats.find(s => s.seatId === windDefaultReceiverSeatId)
      : null
  const isSelfRedTen =
    selfSeat && selfSeat.camp === "RED_TEN"
  const isSelfKing = kingPlayerId && kingPlayerId === playerId

  let windText = ""
  if (windMode !== "NONE" && windSourceSeat && windDefaultSeat) {
    const sourceLabel = `玩家 ${windSourceSeat.seatId}`
    const defaultLabel = `玩家 ${windDefaultSeat.seatId}`
    if (currentSeat && currentSeat.seatId === windDefaultSeat.seatId) {
      if (windMode === "UNCONFIRMED") {
        windText = `${sourceLabel} 已出完所有牌，当前无人截风，风已给到你（${defaultLabel}），你可以任意出牌开始新一轮。`
      } else {
        windText = `${sourceLabel} 已出完所有牌，风已给到你（队友 ${defaultLabel}），你可以任意出牌继续游戏。`
      }
    } else if (currentSeat) {
      const currentLabel = `玩家 ${currentSeat.seatId}`
      if (windMode === "UNCONFIRMED") {
        if (currentSeat.playerId === playerId) {
          windText = `${sourceLabel} 已出完所有牌，默认风给 ${defaultLabel}。轮到你决定是否抢风：如要抢风，请出牌管上，否则点击 Pass。`
        } else {
          windText = `${sourceLabel} 已出完所有牌，默认风给 ${defaultLabel}。正在询问 ${currentLabel} 是否抢风。`
        }
      } else {
        if (currentSeat.playerId === playerId) {
          windText = `${sourceLabel} 已出完所有牌，默认风给队友 ${defaultLabel}。轮到你决定是否截风：如要截风，请出牌管上，否则点击 Pass。`
        } else {
          windText = `${sourceLabel} 已出完所有牌，默认风给队友 ${defaultLabel}。正在询问 ${currentLabel} 是否截风。`
        }
      }
    }
  }

  const containerClass =
    "rounded-2xl px-4 py-3 text-xs text-slate-200 border " +
    (isSelfTurn
      ? "bg-gradient-to-r from-emerald-900/90 via-slate-950/95 to-cyan-900/90 border-emerald-400/80 shadow-[0_0_26px_rgba(16,185,129,0.9)]"
      : "bg-slate-900/85 border-slate-700/80")

  return (
    <div className={containerClass}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-[11px] uppercase tracking-[0.28em] text-slate-400">
          Turn
        </div>
        <div className="text-[11px] text-cyan-300">
          {stageText ? `阶段 ${stageText}` : ""}
        </div>
      </div>
      <div className="space-y-1">
        {currentSeat ? (
          <div className="flex items-center gap-2">
            <div
              className={
                "w-2 h-2 rounded-full " +
                (isSelfTurn
                  ? "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.95)] animate-pulse"
                  : "bg-slate-500")
              }
            />
            <div className="text-xs">
              {isSelfTurn ? (
                <>
                  <span className="mr-1 text-emerald-300 font-semibold">
                    轮到你出牌
                  </span>
                  <span className="text-slate-300">
                    （座位 {currentSeat.seatId}）
                  </span>
                </>
              ) : (
                <>
                  当前行动玩家
                  <span className="mx-1 font-medium text-emerald-300">
                    玩家 {currentSeat.seatId}
                  </span>
                  <span className="text-slate-300">
                    （ID {currentSeat.playerId}）
                  </span>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-400">等待分配行动玩家</div>
        )}
        <div className="text-[11px] text-slate-400">最近事件：{eventText}</div>
        {windText && (
          <div className="mt-2 rounded-xl border border-emerald-400/80 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.45),_rgba(15,23,42,0.95))] px-3 py-2 shadow-[0_0_18px_rgba(16,185,129,0.65)]">
            <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-100/80 mb-1">
              风阶段
            </div>
            <div className="text-[11px] text-emerald-50 leading-relaxed">
              {windText}
            </div>
          </div>
        )}
        {selfSeat && (isSelfRedTen || isSelfKing) && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {isSelfRedTen && (
              <span className="inline-flex items-center justify-center px-2 h-5 rounded-full bg-rose-500/95 text-[10px] font-semibold text-slate-50 border border-rose-200/80">
                你：红十阵营
              </span>
            )}
            {isSelfKing && (
              <span className="inline-flex items-center justify-center px-2 h-5 rounded-full bg-amber-400 text-[10px] font-bold text-slate-950 shadow-[0_0_10px_rgba(251,191,36,0.8)]">
                你：大皇
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default TurnInfo
