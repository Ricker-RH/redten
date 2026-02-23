export type LogLevel = "INFO" | "ERROR"

export interface LogEntry {
  level: LogLevel
  timestamp: number
  message: string
  roomId?: string
  playerId?: string
  messageType?: string
  result?: "success" | "error"
  details?: Record<string, unknown>
}

export interface Logger {
  log(entry: LogEntry): void
}

export class ConsoleLogger implements Logger {
  log(entry: LogEntry): void {
    const payload = {
      level: entry.level,
      timestamp: entry.timestamp,
      message: entry.message,
      roomId: entry.roomId,
      playerId: entry.playerId,
      messageType: entry.messageType,
      result: entry.result,
      details: entry.details,
    }
    console.log(JSON.stringify(payload))
  }
}

