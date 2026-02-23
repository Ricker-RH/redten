import { useState } from "react"
import LoginPage from "./pages/LoginPage"
import RoomPage from "./pages/RoomPage"
import GamePage from "./pages/GamePage"

function App() {
  const [playerId, setPlayerId] = useState("")
  const [roomId, setRoomId] = useState("")
  const [page, setPage] = useState("login")

  if (page === "login") {
    return (
      <LoginPage
        onLogin={id => {
          setPlayerId(id)
          setPage("room")
        }}
      />
    )
  }

  if (page === "room") {
    return (
      <RoomPage
        playerId={playerId}
        roomId={roomId}
        onChangeRoomId={setRoomId}
        onEnterGame={() => setPage("game")}
      />
    )
  }

  return <GamePage playerId={playerId} roomId={roomId} onExit={() => setPage("room")} />
}

export default App

