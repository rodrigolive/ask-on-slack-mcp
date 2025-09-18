export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'

export interface Config {
  slackBotToken: string | undefined
  slackAppToken: string | undefined
  slackChannelId: string | undefined
  slackUserId: string | undefined
  role: string
  logLevel: LogLevel
  logFile?: string
}

export interface ToolAskInput {
  question: string
}

export interface Human {
  ask(question: string): Promise<string>
}

export interface Logger {
  level: LogLevel
  debug(msg: string): void
  info(msg: string): void
  warn(msg: string): void
  error(msg: string): void
  close(): Promise<void>
}

