import { useEffect, useRef, useState } from "react"

const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:3000"

function useGameSocket({ playerId, roomId, onSnapshot, onEvent, onActionResult, onError }) {
  const [status, setStatus] = useState("connecting")
  const socketRef = useRef(null)
  const reconnectRef = useRef({ shouldReconnect: true, lastRoomId: roomId })

  useEffect(() => {
    reconnectRef.current.lastRoomId = roomId
  }, [roomId])

  useEffect(() => {
    if (!playerId) {
      return
    }

    const setupWebSocket = ws => {
      socketRef.current = ws
      setStatus("connecting")

      ws.onopen = () => {
        setStatus("connected")
        if (roomId) {
          const joinMsg = {
            type: "JOIN_ROOM",
            roomId
          }
          ws.send(JSON.stringify(joinMsg))
        }
      }

      ws.onmessage = event => {
        let data
        try {
          data = JSON.parse(event.data)
        } catch {
          return
        }
        if (!data || !data.type) {
          return
        }
        if (data.type === "ROOM_SNAPSHOT") {
          if (onSnapshot) {
            const room = data.room || data.roomState || data.payload || data
            onSnapshot(room)
          }
        } else if (data.type === "GAME_EVENTS" || data.type === "ROOM_EVENT") {
          if (onEvent && data.events && data.events.length > 0) {
            const last = data.events[data.events.length - 1]
            onEvent(last)
          }
        } else if (data.type === "PLAYER_ACTION_RESULT") {
          if (onActionResult) {
            onActionResult(data.payload || data.result)
          }
        } else if (data.type === "ERROR") {
          if (onError) {
            const message = data.message || data.code || "未知错误"
            onError(message)
          }
        }
      }

      ws.onclose = () => {
        setStatus("disconnected")
        if (reconnectRef.current.shouldReconnect) {
          setTimeout(() => {
            if (reconnectRef.current.shouldReconnect) {
              const lastId = reconnectRef.current.lastRoomId
              const retryUrl = `${WS_URL}?playerId=${encodeURIComponent(playerId)}`
              const retryWs = new WebSocket(retryUrl)
              setupWebSocket(retryWs)
              retryWs.onopen = () => {
                setStatus("connected")
                if (lastId) {
                  const reconnectMsg = {
                    type: "RECONNECT",
                    roomId: lastId
                  }
                  retryWs.send(JSON.stringify(reconnectMsg))
                }
              }
            }
          }, 1000)
        }
      }
    }

    const url = `${WS_URL}?playerId=${encodeURIComponent(playerId)}`
    const ws = new WebSocket(url)
    setupWebSocket(ws)

    return () => {
      reconnectRef.current.shouldReconnect = false
      if (socketRef.current) {
        socketRef.current.close()
      }
    }
  }, [playerId])

  const sendAction = payload => {
    const ws = socketRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return
    }
    ws.send(JSON.stringify(payload))
  }

  return { status, sendAction }
}

export default useGameSocket
