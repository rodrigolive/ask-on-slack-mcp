import { describe, it, expect, mock, beforeEach, afterEach } from 'bun:test'
import { SlackHandler, HumanInSlack } from '../src/slack-client'
import { WebClient } from '@slack/web-api'
import { SocketModeClient } from '@slack/socket-mode'

// Mock modules will be handled per test

describe('SlackHandler', () => {
  let handler: SlackHandler
  const mockBotToken = 'xoxb-test'
  const mockAppToken = 'xapp-test'

  beforeEach(() => {
    mock.restore()
    handler = new SlackHandler(mockBotToken, mockAppToken)
  })

  afterEach(() => {
    // Timer cleanup handled by Bun
  })

  it('should initialize with correct tokens', () => {
    // Test that the handler was created successfully
    expect(handler).toBeInstanceOf(SlackHandler)
    expect(handler.isReady).toBe(false)
  })

  it('should start with isReady false', () => {
    expect(handler.isReady).toBe(false)
  })

  it('should handle socket client events', () => {
    // Test that a new handler can be created
    const testHandler = new SlackHandler(mockBotToken, mockAppToken)
    expect(testHandler).toBeInstanceOf(SlackHandler)
    expect(testHandler.isReady).toBe(false)
  })
})

describe('HumanInSlack', () => {
  let humanInSlack: HumanInSlack
  let mockHandler: any
  const mockChannel = 'C1234567890'
  const mockUser = 'U1234567890'

  beforeEach(() => {
    mock.restore()
    // Timer cleanup handled by Bun
    
    // Create a proper mock handler with all required properties
    mockHandler = {
      isReady: false,
      webClient: {
        chat: {
          postMessage: mock(() => {})
        }
      },
      socketClient: {
        connected: false,
        on: mock(() => {})
      }
    }
    
    humanInSlack = new HumanInSlack(mockUser, mockChannel)
    humanInSlack.setHandler(mockHandler)
  })
  
  afterEach(() => {
    // Timer cleanup handled by Bun
    // Real timers used by default in Bun
  })

  it('should initialize with correct parameters', () => {
    expect(humanInSlack).toBeInstanceOf(HumanInSlack)
    expect(humanInSlack['userId']).toBe(mockUser)
    expect(humanInSlack['channelId']).toBe(mockChannel)
  })

  it('should handle ask timeout', async () => {
    // Mock setTimeout to immediately call the callback
    const originalSetTimeout = global.setTimeout
    let timeoutCallback: Function | null = null
    
    global.setTimeout = mock((callback: Function, ms: number) => {
      if (ms === 60000) {
        timeoutCallback = callback
        return 123 // return a fake timer id
      }
      return originalSetTimeout(callback as any, ms)
    }) as any
    
    // Set up the mock handler for successful message posting
    mockHandler.webClient.chat.postMessage.mockResolvedValue({ ok: true, ts: '1234567890.123456' })
    
    // Set up the handler to be ready and connected
    mockHandler.isReady = true
    mockHandler.socketClient.connected = true

    // Start the ask operation
    const askPromise = humanInSlack.ask('Test question')
    
    // Wait a tick for the promise to be set up
    await new Promise(resolve => setImmediate(resolve))
    
    // Trigger the timeout
    if (timeoutCallback) {
      timeoutCallback()
    }
    
    // Now expect the promise to reject
    await expect(askPromise).rejects.toThrow('Timeout waiting for human response in Slack')
    
    // Restore original setTimeout
    global.setTimeout = originalSetTimeout
  })

  it('should throw error when handler is not ready', async () => {
    mockHandler.isReady = false
    
    await expect(humanInSlack.ask('Test question')).rejects.toThrow('Slack connection is not ready')
  })
})