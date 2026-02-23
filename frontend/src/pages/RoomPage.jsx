import { useState } from "react"

function RoomPage({ playerId, roomId, onChangeRoomId, onEnterGame }) {
  const [mode, setMode] = useState("join")

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <div className="w-full max-w-3xl px-10 py-10 rounded-3xl bg-slate-900/80 shadow-2xl shadow-emerald-500/20 border border-slate-700/60">
        <div className="flex justify-between items-center mb-8">
          <div>
            <div className="text-xs text-slate-400 mb-1">玩家</div>
            <div className="text-lg font-semibold text-slate-50">{playerId}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-400 mb-1">模式</div>
            <div className="inline-flex rounded-full bg-slate-800/80 border border-slate-600/80 p-1 text-xs">
              <button
                className={`px-4 py-1 rounded-full transition ${
                  mode === "join" ? "bg-emerald-500 text-slate-950 shadow shadow-emerald-400/60" : "text-slate-300"
                }`}
                onClick={() => setMode("join")}
              >
                加入房间
              </button>
              <button
                className={`px-4 py-1 rounded-full transition ${
                  mode === "create" ? "bg-cyan-500 text-slate-950 shadow shadow-cyan-400/60" : "text-slate-300"
                }`}
                onClick={() => setMode("create")}
              >
                创建房间
              </button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
          <div className="md:col-span-2 space-y-6">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">
                {mode === "join" ? "房间 ID" : "新房间 ID"}
              </label>
              <input
                type="text"
                value={roomId}
                placeholder={mode === "join" ? "输入要加入的房间号" : "输入你想使用的房间号"}
                className="w-full rounded-xl bg-slate-800/80 border border-slate-600/80 px-4 py-3 text-sm text-slate-50 outline-none ring-0 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/40 transition-all"
                onChange={e => onChangeRoomId(e.target.value.trim())}
              />
            </div>
            <button
              className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-sm font-semibold tracking-wide text-slate-950 shadow-lg shadow-emerald-500/40 hover:shadow-emerald-400/60 hover:from-emerald-400 hover:to-cyan-400 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={!roomId}
              onClick={onEnterGame}
            >
              <span>{mode === "join" ? "进入房间" : "创建并进入"}</span>
            </button>
          </div>
          <div className="md:col-span-1">
            <div className="rounded-2xl bg-gradient-to-br from-emerald-600/30 via-cyan-500/10 to-slate-900 border border-emerald-400/40 px-5 py-6 text-xs text-slate-200 space-y-3">
              <div className="text-emerald-300 text-sm font-medium">房间说明</div>
              <p>七人实时竞技房间，玩家进入后自动分配座位，等待人数满足后开局。</p>
              <p>建议全员使用语音通话，体验更接近线下牌桌氛围。</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RoomPage

