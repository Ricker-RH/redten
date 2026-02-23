function TurnInfo({ roomState, playerId, lastEvent }) {
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

  return (
    <div className="rounded-2xl bg-slate-900/85 border border-slate-700/80 px-4 py-3 text-xs text-slate-200">
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
                (isSelfTurn ? "bg-emerald-400" : "bg-slate-500")
              }
            />
            <div className="text-xs">
              当前行动玩家
              <span className="mx-1 font-medium text-emerald-300">
                {isSelfTurn ? "你" : currentSeat.playerId}
              </span>
              座位 {currentSeat.seatId}
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-400">等待分配行动玩家</div>
        )}
        <div className="text-[11px] text-slate-400">最近事件：{eventText}</div>
        {windText && (
          <div className="text-[11px] text-emerald-300/90 leading-relaxed">
            {windText}
          </div>
        )}
      </div>
    </div>
  )
}

export default TurnInfo
