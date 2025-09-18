import { spawn } from 'node:child_process'
import { rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'

function runServer(json: any, env?: Record<string, string>): Promise<any> {
  return new Promise((resolve, reject) => {
    const proc = spawn('bun', ['dist/index.js', '--log-level', 'ERROR'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, ...(env || {}) },
    })
    let out = ''
    let err = ''
    proc.stdout.on('data', (d) => (out += d.toString()))
    proc.stderr.on('data', (d) => (err += d.toString()))
    proc.on('error', reject)
    proc.on('close', () => {
      try {
        const lines = out
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean)
        const last = lines[lines.length - 1]
        const parsed = JSON.parse(last)
        resolve(parsed)
      } catch (e) {
        reject(new Error(`Failed to parse server output: ${e}\nSTDOUT=\n${out}\nSTDERR=\n${err}`))
      }
    })
    proc.stdin.write(JSON.stringify(json) + '\n')
    proc.stdin.end()
  })
}

beforeAll(async () => {
  // Ensure we have a fresh build
  if (existsSync(join(process.cwd(), 'dist'))) {
    rmSync(join(process.cwd(), 'dist'), { recursive: true, force: true })
  }
  const { spawnSync } = await import('node:child_process')
  const res = spawnSync('bun', ['run', 'build'], { encoding: 'utf8' })
  if (res.status !== 0) {
    throw new Error(`Build failed: ${res.stdout}\n${res.stderr}`)
  }
})

test('tools/list includes ask_on_slack', async () => {
  const req = { jsonrpc: '2.0', id: 1, method: 'tools/list' }
  const res = await runServer(req)
  expect(res.result).toBeDefined()
  expect(Array.isArray(res.result.tools)).toBe(true)
  const names = res.result.tools.map((t: any) => t.name)
  expect(names).toContain('ask_on_slack')
})

test('tools/call ask_on_slack without Slack config returns isError', async () => {
  const req = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: { name: 'ask_on_slack', arguments: { question: 'Ping?' } },
  }
  // Unset Slack env to force NoopHuman
  const res = await runServer(req, {
    ASK_SLACK_BOT: '',
    ASK_SLACK_APP: '',
    ASK_SLACK_CHANNEL: '',
    ASK_SLACK_USER: '',
  })
  // SDK wraps tool errors into a successful result with isError=true
  expect(res.result).toBeDefined()
  expect(res.result.isError).toBe(true)
  const text = res.result.content?.[0]?.text || ''
  expect(text).toContain('No Human client configured')
})
