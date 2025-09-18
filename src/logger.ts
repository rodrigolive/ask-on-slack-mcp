import { createWriteStream, WriteStream } from 'node:fs'
import { Config, LogLevel, Logger } from './types.ts'

const levels: Record<LogLevel, number> = {
  DEBUG: 10,
  INFO: 20,
  WARN: 30,
  ERROR: 40,
}

export function createLogger(config: Config): Logger {
  const level = config.logLevel
  const stream: WriteStream | undefined = config.logFile
    ? createWriteStream(config.logFile, { flags: 'a' })
    : undefined

  function log(lvl: LogLevel, msg: string) {
    if (levels[lvl] < levels[level]) return
    const line = `[${lvl}] ${new Date().toISOString()} - ${msg}`
    if (stream) {
      stream.write(line + '\n')
    } else {
      // stderr for logs
      console.error(line)
    }
  }

  return {
    level,
    debug: (m) => log('DEBUG', m),
    info: (m) => log('INFO', m),
    warn: (m) => log('WARN', m),
    error: (m) => log('ERROR', m),
    async close() {
      if (stream) await new Promise((r) => stream.end(r))
    },
  }
}

