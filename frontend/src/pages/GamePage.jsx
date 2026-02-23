import { useState, useRef, useEffect } from "react"
import GameTable from "../components/GameTable"
import useGameSocket from "../websocket/useGameSocket"

function GamePage({ playerId, roomId, onExit }) {
  const [selectedCardIds, setSelectedCardIds] = useState([])
  const [room, setRoom] = useState(null)
  const [lastEvent, setLastEvent] = useState(null)
  const [actionResult, setActionResult] = useState(null)
  const [errorText, setErrorText] = useState("")
  const [isReady, setIsReady] = useState(false)
  const [isHost, setIsHost] = useState(false)
  const [playHistory, setPlayHistory] = useState([])
  const [kingPlayerId, setKingPlayerId] = useState(null)
  const [redTenPlayerIds, setRedTenPlayerIds] = useState([])
  const [showSeatDraw, setShowSeatDraw] = useState(false)
  const [drawSeatId, setDrawSeatId] = useState(null)
  const [drawDisplaySeat, setDrawDisplaySeat] = useState(null)
  const [isDrawingSeat, setIsDrawingSeat] = useState(false)
  const [enableSound, setEnableSound] = useState(true)
  const [lastActionType, setLastActionType] = useState("")
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState("")
  const lastGameStateRef = useRef(null)

  const { status, sendAction } = useGameSocket({
    playerId,
    roomId,
    onSnapshot: snapshot => {
      const nextRoom = snapshot
      const nextGameState = nextRoom && nextRoom.gameState ? nextRoom.gameState : null
      const prevState = lastGameStateRef.current

      if (
        prevState &&
        prevState.winnerId &&
        nextGameState &&
        !nextGameState.winnerId
      ) {
        setPlayHistory([])
        setRedTenPlayerIds([])
      }

      if (
        prevState &&
        nextGameState &&
        nextGameState.lastCombo &&
        nextGameState.lastCombo !== prevState.lastCombo
      ) {
        setPlayHistory(prev => {
          const baseEntry = {
            combo: nextGameState.lastCombo,
            seatId: nextGameState.lastComboSeatId || null,
            playerId: nextGameState.lastPlayedPlayerId || null,
            handId: nextGameState.handId,
          }
          const sameHand = prev.filter(it => it.handId === baseEntry.handId)
          const lastInHand = sameHand.length > 0 ? sameHand[sameHand.length - 1] : null
          const entry = {
            ...baseEntry,
            prevSeatId: lastInHand ? lastInHand.seatId || null : null,
            prevPlayerId: lastInHand ? lastInHand.playerId || null : null,
          }
          const merged = prev.concat(entry)
          const limit = 10
          return merged.slice(-limit)
        })

        const cards = nextGameState.lastCombo.cards || nextGameState.lastCombo
        const hasRedTen = Array.isArray(cards)
          ? cards.some(card => card && typeof card !== "number" && card.isRedTen)
          : false
        if (hasRedTen && nextGameState.lastPlayedPlayerId) {
          setRedTenPlayerIds(prev => {
            if (prev.includes(nextGameState.lastPlayedPlayerId)) {
              return prev
            }
            return prev.concat(nextGameState.lastPlayedPlayerId)
          })
        }
      }

      lastGameStateRef.current = nextGameState
      setRoom(nextRoom)
      if (nextGameState && nextGameState.winnerId) {
        setKingPlayerId(nextGameState.winnerId)
      }
      if (!prevState && nextGameState && nextGameState.seats) {
        const seat = nextGameState.seats.find(s => s.playerId === playerId)
        if (seat) {
          setDrawSeatId(seat.seatId)
          setDrawDisplaySeat(null)
          setShowSeatDraw(true)
        }
      }
      if (nextRoom && playerId) {
        const readyIds = nextRoom.readyPlayerIds || []
        setIsReady(readyIds.includes(playerId))
        setIsHost(nextRoom.hostId === playerId)
      } else {
        setIsReady(false)
        setIsHost(false)
      }
    },
    onEvent: event => {
      setLastEvent(event)
    },
    onActionResult: result => {
      setActionResult(result)
      if (result && result.action && result.action.type) {
        setLastActionType(result.action.type)
      }
      if (!result.accepted && result.error) {
        setErrorText(result.error)
      }
    },
    onChat: msg => {
      setChatMessages(prev => {
        const merged = prev.concat(msg)
        const limit = 50
        return merged.slice(-limit)
      })
    },
    onError: msg => {
      setErrorText(msg)
    }
  })

  const gameState = room && room.gameState ? room.gameState : null
  const selfSeat =
    gameState && gameState.seats ? gameState.seats.find(s => s.playerId === playerId) : null
  const canInstantWin = !!(selfSeat && selfSeat.canInstantWin)
  const readyIds = room && room.readyPlayerIds ? room.readyPlayerIds : []
  const hostId = room && room.hostId ? room.hostId : null
  const allNonHostReady =
    room && room.players && hostId
      ? room.players.filter(id => id !== hostId).every(id => readyIds.includes(id))
      : false

  const handleToggleCard = cardId => {
    setSelectedCardIds(prev =>
      prev.includes(cardId) ? prev.filter(id => id !== cardId) : [...prev, cardId]
    )
  }

  const handleInstantWin = () => {
    if (!gameState || !selfSeat) {
      return
    }
    const redTenCards = selfSeat.handCards ? selfSeat.handCards.filter(card => card.isRedTen) : []
    if (redTenCards.length < 3) {
      return
    }
    const cardIds = redTenCards.slice(0, 3).map(card => card.id)
    sendAction({
      type: "PLAYER_ACTION",
      roomId,
      action: {
        type: "INSTANT_WIN",
        cardIds,
      },
    })
  }

  const handlePlay = () => {
    if (!selectedCardIds.length) {
      return
    }
    sendAction({
      type: "PLAYER_ACTION",
      roomId,
      action: {
        type: "PLAY_CARDS",
        cardIds: selectedCardIds
      }
    })
    setSelectedCardIds([])
  }

  const handlePass = () => {
    sendAction({
      type: "PLAYER_ACTION",
      roomId,
      action: {
        type: "PASS",
        cardIds: []
      }
    })
    setSelectedCardIds([])
  }

  const handleToggleReady = () => {
    const next = !isReady
    setIsReady(next)
    sendAction({
      type: "READY",
      roomId,
      ready: next
    })
  }

  const handleStartGame = () => {
    sendAction({
      type: "START_GAME",
      roomId
    })
  }

  const handleStartNextHand = () => {
    if (!roomId) {
      return
    }
    sendAction({
      type: "START_NEXT_HAND",
      roomId
    })
  }

  const handleSendChat = () => {
    const text = (chatInput || "").trim()
    if (!text || !roomId) {
      return
    }
    sendAction({
      type: "CHAT",
      roomId,
      text
    })
    setChatInput("")
  }

  useEffect(() => {
    if (!showSeatDraw || !drawSeatId) {
      return
    }
    setIsDrawingSeat(true)
    setDrawDisplaySeat(null)
    let elapsed = 0
    const total = 1200
    const step = 90
    const timer = setInterval(() => {
      elapsed += step
      if (elapsed >= total) {
        clearInterval(timer)
        setDrawDisplaySeat(drawSeatId)
        setIsDrawingSeat(false)
        return
      }
      const value = Math.floor(Math.random() * 7) + 1
      setDrawDisplaySeat(value)
    }, step)
    return () => {
      clearInterval(timer)
    }
  }, [showSeatDraw, drawSeatId])

  useEffect(() => {
    if (!enableSound || !lastActionType) {
      return
    }
    let src = ""
    if (lastActionType === "PLAY_CARDS") {
      src =
        "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA="
    } else if (lastActionType === "PASS") {
      src =
        "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA="
    } else if (lastActionType === "INSTANT_WIN") {
      src =
        "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA="
    }
    if (src) {
      const audio = new Audio(src)
      audio.volume = 0.4
      audio.play().catch(() => {})
    }
  }, [enableSound, lastActionType])

  return (
    <div className="min-h-screen flex flex-col items-stretch bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 text-slate-50">
      <header className="h-14 md:h-16 flex items-center justify-between px-4 md:px-8 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="flex items-baseline gap-3 md:gap-4">
          <div className="text-sm tracking-[0.25em] text-cyan-400 uppercase">Room</div>
          <div className="text-base md:text-lg font-semibold truncate">
            #{roomId || "未加入"}
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-4 text-[11px] md:text-xs text-slate-300">
          <div
            className={
              status === "connected"
                ? "flex items-center gap-1 text-emerald-400"
                : status === "connecting"
                ? "flex items-center gap-1 text-amber-300"
                : "flex items-center gap-1 text-rose-400"
            }
          >
            <span className="h-2 w-2 rounded-full bg-current" />
            <span className="hidden sm:inline">
              {status === "connected" ? "已连接" : status === "connecting" ? "连接中" : "已断开"}
            </span>
          </div>
          <div className="hidden sm:block text-slate-500">玩家 {playerId}</div>
          <button
            className={
              "px-2 py-1 rounded-lg border border-slate-600 text-[10px] md:text-xs flex items-center gap-1 " +
              (enableSound ? "text-emerald-300" : "text-slate-400")
            }
            onClick={() => setEnableSound(prev => !prev)}
          >
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-current" />
            <span>{enableSound ? "音效开" : "音效关"}</span>
          </button>
          <button
            className="ml-1 px-2.5 md:px-3 py-1.5 rounded-lg border border-slate-600 text-slate-300 text-[10px] md:text-xs hover:border-rose-400 hover:text-rose-300 transition"
            onClick={onExit}
          >
            退出房间
          </button>
        </div>
      </header>
      <main className="flex-1 flex flex-col items-stretch">
        {room && gameState ? (
          <GameTable
            roomState={gameState}
            playerId={playerId}
            selectedCardIds={selectedCardIds}
            onToggleCard={handleToggleCard}
            onPlay={handlePlay}
            onPass={handlePass}
            onInstantWin={handleInstantWin}
            canInstantWin={canInstantWin}
            lastEvent={lastEvent}
            playHistory={playHistory}
            kingPlayerId={kingPlayerId}
            redTenPlayerIds={redTenPlayerIds}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 px-3 py-4 md:px-0 md:py-0">
            <div className="w-full max-w-2xl px-5 md:px-8 py-5 md:py-6 rounded-3xl bg-slate-900/90 border border-slate-700/80 shadow-xl shadow-cyan-500/30">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.3em] text-slate-400">
                    Lobby
                  </div>
                  <div className="text-sm text-slate-200">
                    等待玩家准备（{room ? room.players.length : 0}/{room ? room.maxPlayers : 7}）
                  </div>
                </div>
                <div className="text-xs text-slate-400">
                  {isHost ? "你是房主，可以在全部准备后开始游戏" : "等待房主开始游戏"}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mb-5 md:mb-6">
                {(room ? room.players : []).map((id, index) => {
                  const readyIds = room && room.readyPlayerIds ? room.readyPlayerIds : []
                  const ready = readyIds.includes(id)
                  const isSelf = id === playerId
                  const host = room && room.hostId === id
                  return (
                    <div
                      key={id}
                      className={
                        "flex items-center justify-between px-4 py-3 rounded-2xl border text-xs " +
                        (ready
                          ? "border-emerald-400/80 bg-emerald-500/10"
                          : "border-slate-700/80 bg-slate-800/80")
                      }
                    >
                      <div>
                        <div className="text-slate-100">
                          玩家 {id}
                          {isSelf && <span className="ml-1 text-cyan-300">（你）</span>}
                        </div>
                        <div className="text-[10px] md:text-[11px] text-slate-400">
                          入场顺序 {index + 1}
                          {host && <span className="ml-2 text-amber-300">房主</span>}
                        </div>
                      </div>
                      <div
                        className={
                          "px-3 py-1 rounded-full text-[11px] " +
                          (ready
                            ? "bg-emerald-500 text-slate-950"
                            : "bg-slate-700 text-slate-200")
                        }
                      >
                        {ready ? "已准备" : "未准备"}
                      </div>
                    </div>
                  )
                })}
                {room &&
                  room.players.length < room.maxPlayers &&
                  Array.from({ length: room.maxPlayers - room.players.length }).map((_, idx) => (
                    <div
                      key={`empty-${idx}`}
                      className="flex items-center justify-between px-4 py-3 rounded-2xl border border-dashed border-slate-700/80 bg-slate-900/60 text-xs text-slate-500"
                    >
                      <div>空位</div>
                      <div className="px-3 py-1 rounded-full bg-slate-800 text-[11px] md:text-xs">
                        等待加入
                      </div>
                    </div>
                  ))}
              </div>
              <div className="flex justify-between items-center mt-2 md:mt-0">
                <button
                  className={
                    "px-5 py-2 rounded-xl text-[11px] md:text-xs font-semibold transition active:scale-[0.97] " +
                    (isReady
                      ? "bg-slate-700 text-slate-100 hover:bg-slate-600"
                      : "bg-emerald-500 text-slate-950 hover:bg-emerald-400")
                  }
                  onClick={handleToggleReady}
                  disabled={!room}
                >
                  {isReady ? "取消准备" : "准备"}
                </button>
                {isHost && (
                  <button
                    className="px-5 py-2 rounded-xl text-[11px] md:text-xs font-semibold bg-gradient-to-r from-amber-400 to-rose-400 text-slate-950 hover:from-amber-300 hover:to-rose-300 disabled:opacity-50 disabled:cursor-not-allowed transition active:scale-[0.97]"
                    onClick={handleStartGame}
                    disabled={
                      !room ||
                      !room.readyPlayerIds ||
                      room.readyPlayerIds.length !== room.maxPlayers
                    }
                  >
                    开始游戏
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
      {room && (
        <div className="fixed bottom-3 left-3 right-3 md:right-4 md:left-auto md:w-72 z-30">
          <div className="bg-slate-900/95 border border-slate-700/90 rounded-2xl shadow-lg shadow-cyan-500/30 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700 text-[11px] text-slate-200">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>房间聊天</span>
              </div>
              <div className="text-[10px] text-slate-400 hidden md:block">
                仅当前房间内玩家可见
              </div>
            </div>
            <div className="max-h-40 md:max-h-52 overflow-y-auto px-3 py-2 space-y-1.5 text-[11px]">
              {chatMessages.length === 0 && (
                <div className="text-slate-500">暂时没有聊天内容，可以先打个招呼。</div>
              )}
              {chatMessages.map((msg, index) => {
                const isSelf = msg.playerId === playerId
                const timeText = msg.timestamp
                  ? new Date(msg.timestamp).toLocaleTimeString("zh-CN", {
                      hour: "2-digit",
                      minute: "2-digit"
                    })
                  : ""
                return (
                  <div
                    key={`${msg.timestamp || 0}-${msg.playerId}-${index}`}
                    className={
                      "flex " + (isSelf ? "justify-end" : "justify-start")
                    }
                  >
                    <div
                      className={
                        "inline-flex max-w-[80%] px-2 py-1 rounded-xl border text-[11px] leading-snug " +
                        (isSelf
                          ? "bg-emerald-500/15 border-emerald-400/70 text-emerald-100"
                          : "bg-slate-800/90 border-slate-700 text-slate-100")
                      }
                    >
                      <div className="flex flex-col">
                        <div className="flex items-center justify-between gap-2 mb-[2px]">
                          <span className="text-[10px] text-slate-300">
                            玩家 {msg.playerId}
                            {isSelf && <span className="ml-1 text-cyan-300">(你)</span>}
                          </span>
                          {timeText && (
                            <span className="text-[9px] text-slate-500">{timeText}</span>
                          )}
                        </div>
                        <div className="text-[11px] break-words whitespace-pre-wrap">
                          {msg.text}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="px-3 py-2 border-t border-slate-700 flex items-center gap-2">
              <input
                className="flex-1 rounded-xl bg-slate-800 border border-slate-600 px-2 py-1 text-[11px] text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400"
                placeholder="输入聊天内容，按回车发送"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSendChat()
                  }
                }}
              />
              <button
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-[11px] font-semibold text-slate-950 disabled:opacity-40 disabled:cursor-not-allowed hover:from-cyan-400 hover:to-emerald-400 transition"
                onClick={handleSendChat}
                disabled={!chatInput.trim() || status !== "connected"}
              >
                发送
              </button>
            </div>
          </div>
        </div>
      )}
      {showSeatDraw && drawSeatId && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70">
          <div className="w-full max-w-md px-8 py-6 rounded-3xl bg-slate-950 border border-cyan-400/70 shadow-2xl shadow-cyan-500/50">
            <div className="text-xs uppercase tracking-[0.3em] text-cyan-300 mb-2">
              开局抽号定座
            </div>
            <div className="text-lg font-semibold text-slate-50 mb-4">
              你抽到的座位号是
              <span className="mx-2 text-3xl font-extrabold text-emerald-400">
                {drawDisplaySeat || drawSeatId}
              </span>
              号
            </div>
            {isDrawingSeat ? (
              <div className="mb-6 text-xs text-cyan-300">
                正在随机抽取座位号，请稍候…
              </div>
            ) : (
              <div className="mb-6 text-xs text-slate-300">
                本局中你的座位号将保持不变，后续每局将按大皇顺序轮转起牌。
              </div>
            )}
            <div className="flex justify-end">
              <button
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-xs font-semibold text-slate-950 hover:from-emerald-400 hover:to-cyan-400 active:scale-[0.98] transition"
                onClick={() => setShowSeatDraw(false)}
                disabled={isDrawingSeat}
              >
                {isDrawingSeat ? "抽取中…" : "开始对局"}
              </button>
            </div>
          </div>
        </div>
      )}
      {errorText && (
        <div className="fixed top-0 inset-x-0 z-50 flex justify-center mt-4 pointer-events-none">
          <div className="pointer-events-auto bg-slate-900/95 rounded-2xl border border-rose-500/70 px-6 py-3 shadow-xl shadow-rose-500/40 max-w-lg w-[90%]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-rose-300 font-semibold mb-1 text-xs">操作失败</div>
                <div className="text-xs text-slate-100 leading-relaxed">{errorText}</div>
              </div>
              <button
                className="ml-2 px-3 py-1.5 rounded-xl bg-rose-500 text-slate-950 text-[11px] font-semibold hover:bg-rose-400 transition"
                onClick={() => setErrorText("")}
              >
                知道了
              </button>
            </div>
          </div>
        </div>
      )}
      {actionResult && actionResult.settlement && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70">
          <div className="bg-slate-950 rounded-3xl border border-amber-400/70 px-6 md:px-10 py-6 md:py-8 shadow-2xl shadow-amber-400/50 max-w-lg w-[92%] md:w-full">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.3em] text-amber-300/90 mb-1">
                  Result
                </div>
                <div className="text-base md:text-lg font-semibold text-amber-200">
                  本局结算
                </div>
              </div>
              {gameState && gameState.winnerId && (
                <div className="px-3 py-1.5 rounded-full bg-amber-400 text-[11px] font-semibold text-slate-950 shadow-[0_0_18px_rgba(251,191,36,0.7)]">
                  胜者 ID {gameState.winnerId}
                </div>
              )}
            </div>
            <div className="max-h-72 overflow-y-auto text-xs md:text-sm text-slate-100 rounded-2xl bg-slate-900/80 border border-slate-700/80 px-4 py-3">
              {gameState && gameState.seats && (
                <div className="space-y-2">
                  {gameState.seats.map(seat => {
                    const playerSettlement =
                      actionResult.settlement.playerResults.find(
                        it => it.playerId === seat.playerId,
                      ) || null
                    const delta = playerSettlement ? playerSettlement.scoreDelta : 0
                    const total = playerSettlement ? playerSettlement.totalScore : seat.totalScore
                    const isWinner =
                      actionResult.settlement.winnerId &&
                      actionResult.settlement.winnerId === seat.playerId
                    const isSelf = playerId === seat.playerId
                    return (
                      <div
                        key={seat.seatId}
                        className={
                          "flex items-center justify-between px-2.5 py-1.5 rounded-xl border " +
                          (isWinner
                            ? "border-amber-400/90 bg-amber-500/10"
                            : "border-slate-700/80 bg-slate-900/70")
                        }
                      >
                        <div className="flex flex-col">
                          <div className="text-xs md:text-sm text-slate-50">
                            座位 {seat.seatId} · 玩家 {seat.playerId}
                            {isSelf && <span className="ml-1 text-cyan-300">(你)</span>}
                            {isWinner && (
                              <span className="ml-2 px-2 py-0.5 rounded-full bg-amber-400 text-[10px] font-semibold text-slate-950">
                                胜者
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-300">
                            本局{" "}
                            <span
                              className={
                                delta > 0
                                  ? "text-emerald-300 font-semibold"
                                  : delta < 0
                                  ? "text-rose-300 font-semibold"
                                  : "text-slate-200"
                              }
                            >
                              {delta > 0 ? `+${delta}` : delta}
                            </span>
                            ，累计{" "}
                            <span className="text-amber-200 font-semibold">{total}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            <div className="mt-5 flex flex-wrap justify-between items-center gap-3">
              <div className="text-[11px] md:text-xs text-slate-300">
                {isHost
                  ? allNonHostReady
                    ? "所有玩家已准备，房主可以开始下一局。"
                    : "等待所有非房主玩家点击“准备下一局”。"
                  : isReady
                  ? "你已准备好下一局，等待房主开始。"
                  : "请点击“准备下一局”，表示你愿意继续游戏。"}
              </div>
              <div className="flex flex-wrap justify-end gap-3">
                <button
                  className="px-4 py-2 rounded-xl bg-slate-800 text-[11px] md:text-xs text-slate-200 hover:bg-slate-700 transition"
                  onClick={() => setActionResult(null)}
                >
                  继续观战
                </button>
                {!isHost && (
                  <button
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-[11px] md:text-xs font-semibold text-slate-950 hover:from-emerald-400 hover:to-cyan-400 transition"
                    onClick={() => {
                      handleToggleReady()
                    }}
                    disabled={!room}
                  >
                    {isReady ? "取消准备" : "准备下一局"}
                  </button>
                )}
                {isHost && (
                  <button
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-[11px] md:text-xs font-semibold text-slate-950 hover:from-emerald-400 hover:to-cyan-400 transition"
                    onClick={() => {
                      setActionResult(null)
                      handleStartNextHand()
                    }}
                    disabled={!gameState || gameState.phase !== "WAITING" || !allNonHostReady}
                  >
                    开始下一局
                  </button>
                )}
                <button
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-rose-400 text-[11px] md:text-xs font-semibold text-slate-950 hover:from-amber-300 hover:to-rose-300 transition"
                  onClick={() => {
                    setActionResult(null)
                    onExit()
                  }}
                >
                  退出牌桌
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default GamePage
