import { useState } from "react"

function LoginPage({ onLogin }) {
  const [idInput, setIdInput] = useState("")

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <div className="w-full max-w-md px-10 py-12 rounded-3xl bg-slate-900/80 shadow-2xl shadow-cyan-500/20 border border-slate-700/60">
        <div className="text-center mb-10">
          <div className="text-sm tracking-[0.25em] text-cyan-400 uppercase mb-2">Competitive</div>
          <h1 className="text-3xl font-semibold tracking-widest text-slate-50 mb-1">红十牌桌</h1>
          <p className="text-slate-400 text-xs">七人实时竞技房间</p>
        </div>
        <div className="space-y-6">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">玩家 ID</label>
            <input
              type="text"
              placeholder="输入你的代号"
              className="w-full rounded-xl bg-slate-800/80 border border-slate-600/80 px-4 py-3 text-sm text-slate-50 outline-none ring-0 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/40 transition-all"
              value={idInput}
              onChange={e => setIdInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && idInput.trim()) {
                  onLogin(idInput.trim())
                }
              }}
            />
          </div>
          <button
            className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 text-sm font-semibold tracking-wide text-slate-950 shadow-lg shadow-cyan-500/40 hover:shadow-cyan-400/60 hover:from-cyan-400 hover:to-sky-400 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            onClick={() => {
              if (idInput.trim()) {
                onLogin(idInput.trim())
              }
            }}
          >
            进入牌桌大厅
          </button>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
