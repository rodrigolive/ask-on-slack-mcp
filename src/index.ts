#!/usr/bin/env node

/**
 * Main entry point for the Human-in-the-Loop Slack MCP Server.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { Command } from 'commander';
import { createWriteStream, WriteStream } from 'fs';
import { HumanInSlack, SlackHandler } from './slack-client.js';
import { Config } from './types.js';

let logStream: WriteStream | null = null;

const logger = {
  info: (message: string) => {
    const logMessage = `[INFO] ${new Date().toISOString()} - ${message}\n`;
    if (logStream) {
      logStream.write(logMessage);
    } else {
      console.error(logMessage.trim());
    }
  },
  error: (message: string) => {
    const logMessage = `[ERROR] ${new Date().toISOString()} - ${message}\n`;
    if (logStream) {
      logStream.write(logMessage);
    } else {
      console.error(logMessage.trim());
    }
  },
  warn: (message: string) => {
    const logMessage = `[WARN] ${new Date().toISOString()} - ${message}\n`;
    if (logStream) {
      logStream.write(logMessage);
    } else {
      console.error(logMessage.trim());
    }
  },
};

function setupLogging(logLevel: string = 'INFO', logFile?: string): void {
  if (logFile) {
    try {
      logStream = createWriteStream(logFile, { flags: 'a' });
      logger.info(`Log file set to: ${logFile}`);
    } catch (error) {
      console.error(`Failed to create log file ${logFile}: ${error}`);
      process.exit(1);
    }
  }
  logger.info(`Log level set to: ${logLevel}`);
}

export function parseArgs(args?: string[]): Config {
  // Create a new Command instance to avoid conflicts
  const cmd = new Command();
  
  cmd
    .name('ask-on-slack-mcp')
    .description('Ask on Slack MCP Server - Enables AI assistants to request information from humans via Slack')
    .version('0.1.0')
    .option('--slack-bot-token <token>', 'Slack bot token (xoxb-...) or use ASK_SLACK_BOT env var')
    .option('--slack-app-token <token>', 'Slack app token for Socket Mode (xapp-...) or use ASK_SLACK_APP env var')
    .option('--slack-channel-id <id>', 'Slack channel ID (C...) or use ASK_SLACK_CHANNEL env var')
    .option('--slack-user-id <id>', 'Slack user ID (U...) or use ASK_SLACK_USER env var')
    .option('--log-level <level>', 'Log level (DEBUG, INFO, WARN, ERROR)', 'INFO')
    .option('--log-file <file>', 'Log file path (if specified, logs will be written to file instead of stderr)')
    .exitOverride()
    .parse(args, { from: 'user' });

  const options = cmd.opts();

  // Get values from command line options or environment variables
  const slackBotToken = options.slackBotToken || process.env.ASK_SLACK_BOT;
  const slackAppToken = options.slackAppToken || process.env.ASK_SLACK_APP;
  const slackChannelId = options.slackChannelId || process.env.ASK_SLACK_CHANNEL;
  const slackUserId = options.slackUserId || process.env.ASK_SLACK_USER;

  // Validate that all required values are present
  if (!slackBotToken) {
    throw new Error('Slack bot token is required. Provide --slack-bot-token or set ASK_SLACK_BOT environment variable.');
  }
  if (!slackAppToken) {
    throw new Error('Slack app token is required. Provide --slack-app-token or set ASK_SLACK_APP environment variable.');
  }
  if (!slackChannelId) {
    throw new Error('Slack channel ID is required. Provide --slack-channel-id or set ASK_SLACK_CHANNEL environment variable.');
  }
  if (!slackUserId) {
    throw new Error('Slack user ID is required. Provide --slack-user-id or set ASK_SLACK_USER environment variable.');
  }

  return {
    slackBotToken,
    slackAppToken,
    slackChannelId,
    slackUserId,
    logLevel: options.logLevel,
    logFile: options.logFile,
  };
}

async function main() {
  const config = parseArgs();
  setupLogging(config.logLevel, config.logFile);

  // Create human handler
  const human = new HumanInSlack(config.slackUserId, config.slackChannelId);

  // Create MCP server
  const server = new Server(
    {
      name: 'Ask on Slack MCP',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );
  
  // Store config in closure for tool handlers
  const currentConfig = config;

  // Tool: ask_on_slack only
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'ask_on_slack',
        description: `Ask a human for information that only they would know.
        
        Use this tool when you need information such as:
        - Personal preferences
        - Project-specific context  
        - Local environment details
        - Non-public information`,
        inputSchema: {
          type: 'object',
          properties: {
            question: {
              type: 'string',
              description: 'The question to ask the human. Be specific and provide context.',
            },
          },
          required: ['question'],
        },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    switch (name) {
      case 'ask_on_slack': {
        const { question } = args as { question: string };
        
        // Version check to ensure new code is running
        const currentTime = Math.floor(Date.now() / 1000);

        // Initialize handler on demand if not set
        if (!human.handler) {
          logger.info('Initializing Slack handler on demand...');
          
          const slackHandler = new SlackHandler(currentConfig.slackBotToken, currentConfig.slackAppToken);
          human.setHandler(slackHandler);
          
          try {
            await slackHandler.start();
            logger.info(`Slack handler initialized: isReady=${slackHandler.isReady}`);
          } catch (error) {
            logger.error(`Failed to initialize Slack handler: ${error}`);
            const errorDetails = error instanceof Error ? error.stack || error.message : String(error);
            return {
              content: [
                {
                  type: 'text',
                  text: `Error: Failed to initialize Slack: ${errorDetails} [Code version: ${currentTime}]`,
                },
              ],
            };
          }
        }

        // Check if connection is ready
        if (!human.handler!.isReady) {
          logger.info('Handler not ready, attempting dynamic connection...');

          try {
            // Verify web client authentication
            logger.info('Verifying web client authentication...');

            const currentBotToken = currentConfig.slackBotToken;
            const handlerToken = (human.handler!.webClient as any).token || 'NOT_SET';

            logger.info(`Current env bot token: ${currentBotToken.slice(0, 10)}...${currentBotToken.slice(-5)}`);
            logger.info(`Handler web client token: ${handlerToken.slice(0, 10)}...${handlerToken.slice(-5)}`);

            if (currentBotToken !== handlerToken) {
              logger.warn('Token mismatch detected between environment and handler!');
              return {
                content: [
                  {
                    type: 'text',
                    text: `Error: Token mismatch - env vs handler tokens differ [Code version: ${currentTime}]`,
                  },
                ],
              };
            }

            try {
              const authResult = await human.handler!.webClient.auth.test();
              logger.info(`Auth test result: ${authResult.ok}`);
              if (!authResult.ok) {
                return {
                  content: [
                    {
                      type: 'text',
                      text: `Error: Slack auth failed: ${authResult.error || 'Unknown'} - Token: ${currentBotToken.slice(0, 10)}...${currentBotToken.slice(-5)} [Code version: ${currentTime}]`,
                    },
                  ],
                };
              }
            } catch (authError) {
              logger.error(`Auth test failed: ${authError}`);
              return {
                content: [
                  {
                    type: 'text',
                    text: `Error: Slack auth test failed: ${String(authError)} - Token: ${currentBotToken.slice(0, 10)}...${currentBotToken.slice(-5)} [Code version: ${currentTime}]`,
                  },
                ],
              };
            }

            // Check if socket client is connected
            const isConnected = human.handler!.socketClient.connected;
            if (!isConnected) {
              logger.info('Socket client not connected, waiting for connection...');
              
              // Wait for connection establishment
              let connectionEstablished = false;
              for (let i = 0; i < 20; i++) {
                const connected = human.handler!.socketClient.connected;
                logger.info(`Checking connection (attempt ${i + 1}): ${connected}`);

                if (connected) {
                  logger.info('Socket connection established');
                  human.handler!.isReady = true;
                  connectionEstablished = true;
                  break;
                }
                await new Promise(resolve => setTimeout(resolve, 500));
              }

              if (!connectionEstablished) {
                logger.warn('Socket connection failed to establish after 10 seconds');
                  return {
                    content: [
                      {
                        type: 'text',
                        text: `Error: Socket session timeout [Code version: ${currentTime}]`,
                      },
                    ],
                  };
                }
              }
          } catch (error) {
            logger.error(`Failed to establish socket connection: ${error}`);
            return {
              content: [
                {
                  type: 'text',
                  text: `Error: Socket connection failed: ${String(error)} [Code version: ${currentTime}]`,
                },
              ],
            };
          }
        }

        // Final check
        if (human.handler!.isReady) {
          logger.info('Connection ready, proceeding with ask');
        } else {
          return {
            content: [
              {
                type: 'text',
                text: `Error: Slack not ready after retry [Code version: ${currentTime}]`,
              },
            ],
          };
        }

        try {
          const response = await human.ask(question);
          return {
            content: [
              {
                type: 'text',
                text: response,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error asking human: ${String(error)}`,
              },
            ],
          };
        }
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  });

  // Run MCP server
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info('Ask on Slack MCP server started');
}

// グローバルエラーハンドラー
process.on('uncaughtException', (error) => {
  logger.error(`Uncaught Exception: ${error.message}`);
  logger.error(error.stack || '');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
});

// Cleanup function to close log stream
function cleanup() {
  if (logStream) {
    logStream.end();
    logStream = null;
  }
}

// Only run main if this file is executed directly (not imported)
if (import.meta.main) {
  // Setup cleanup handlers
  process.on('exit', cleanup);
  process.on('SIGINT', () => {
    cleanup();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    cleanup();
    process.exit(0);
  });

  main().catch((error) => {
    logger.error(`Fatal error: ${error}`);
    logger.error(error.stack || '');
    cleanup();
    process.exit(1);
  });
}