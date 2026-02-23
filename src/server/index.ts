import http from "http"
import { WebSocketServer } from "ws"
import { RoomManager, WebSocketLike } from "./roomManager"
import { ConsoleLogger } from "./logger"

const logger = new ConsoleLogger()
const roomManager = new RoomManager(logger)

const port = Number(process.env.PORT) || 3000

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" })
  res.end("OK")
})

const wss = new WebSocketServer({ server })

wss.on("connection", (socket, req) => {
  const url = req.url || "/"
  const index = url.indexOf("?")
  let playerId = ""
  if (index >= 0) {
    const search = url.substring(index + 1)
    const params = new URLSearchParams(search)
    const fromQuery = params.get("playerId")
    if (fromQuery) {
      playerId = fromQuery
    }
  }
  if (!playerId) {
    playerId = `P-${Math.random().toString(36).slice(2, 8)}`
  }
  const wsSocket: WebSocketLike = {
    send: data => {
      socket.send(data)
    },
  }
  roomManager.registerConnection(wsSocket, playerId)

  socket.on("message", data => {
    roomManager.handleRawMessage(wsSocket, data.toString())
  })

  socket.on("close", () => {
    roomManager.handleDisconnect(wsSocket)
  })
})

roomManager.startServerLoop()

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`WebSocket server started on ws://localhost:${port}`)
})
