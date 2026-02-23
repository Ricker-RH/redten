import { useState, useRef } from "react"
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
        const entry = {
          combo: nextGameState.lastCombo,
          seatId: nextGameState.lastComboSeatId || null,
          playerId: nextGameState.lastPlayedPlayerId || null,
          handId: nextGameState.handId,
        }
        setPlayHistory(prev => {
          const merged = prev.concat(entry)
          const limit = 4
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
      if (!result.accepted && result.error) {
        setErrorText(result.error)
      }
    },
    onError: msg => {
      setErrorText(msg)
    }
  })

  const gameState = room && room.gameState ? room.gameState : null
  const selfSeat =
    gameState && gameState.seats ? gameState.seats.find(s => s.playerId === playerId) : null
  const canInstantWin = !!(selfSeat && selfSeat.canInstantWin)

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

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 text-slate-50">
      <header className="h-16 flex items-center justify-between px-8 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="flex items-baseline gap-4">
          <div className="text-sm tracking-[0.25em] text-cyan-400 uppercase">Room</div>
          <div className="text-lg font-semibold">#{roomId || "未加入"}</div>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-300">
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
            <span>
              {status === "connected" ? "已连接" : status === "connecting" ? "连接中" : "已断开"}
            </span>
          </div>
          <div className="text-slate-500">玩家 {playerId}</div>
          <button
            className="px-3 py-1.5 rounded-lg border border-slate-600 text-slate-300 text-xs hover:border-rose-400 hover:text-rose-300 transition"
            onClick={onExit}
          >
            退出房间
          </button>
        </div>
      </header>
      <main className="flex-1 flex flex-col">
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
          <div className="flex-1 flex items-center justify-center bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900">
            <div className="w-full max-w-2xl px-8 py-6 rounded-3xl bg-slate-900/90 border border-slate-700/80 shadow-xl shadow-cyan-500/30">
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
              <div className="grid grid-cols-2 gap-4 mb-6">
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
                        <div className="text-[11px] text-slate-400">
                          座位 {index + 1}
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
                      <div className="px-3 py-1 rounded-full bg-slate-800 text-[11px]">
                        等待加入
                      </div>
                    </div>
                  ))}
              </div>
              <div className="flex justify-between items-center">
                <button
                  className={
                    "px-5 py-2 rounded-xl text-xs font-semibold transition " +
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
                    className="px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-amber-400 to-rose-400 text-slate-950 hover:from-amber-300 hover:to-rose-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
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
        <div className="fixed inset-0 flex items-center justify-center bg-black/60">
          <div className="bg-slate-950 rounded-3xl border border-amber-400/60 px-10 py-8 shadow-2xl shadow-amber-400/50 max-w-lg w-full">
            <div className="text-amber-300 font-semibold mb-4 text-base">本局结算</div>
            <div className="max-h-72 overflow-y-auto text-sm text-slate-100">
              <pre className="whitespace-pre-wrap text-xs text-slate-200">
                {JSON.stringify(actionResult.settlement, null, 2)}
              </pre>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-200 hover:bg-slate-700 transition"
                onClick={() => setActionResult(null)}
              >
                继续观战
              </button>
              <button
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-rose-400 text-xs font-semibold text-slate-950 hover:from-amber-300 hover:to-rose-300 transition"
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
      )}
    </div>
  )
}

export default GamePage
