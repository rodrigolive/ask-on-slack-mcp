import express from 'express';
import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import { createLogger } from './logger.ts';
import { NoopHuman } from './human.ts';
import { SlackHuman } from './slack-http-client.ts';
import { getRole } from './role/index.ts';
import type { Config, LogLevel } from './types.ts';

function parseArgs(argv: string[]) {
    const out: Record<string, string> = {};
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a.startsWith('--')) {
            const key = a.slice(2);
            const val =
                argv[i + 1] && !argv[i + 1].startsWith('--')
                    ? argv[++i]
                    : 'true';
            out[key] = val;
        }
    }
    return out;
}

function getConfig(): Config {
    const args = parseArgs(process.argv.slice(2));
    const env = process.env;
    const toLevel = (v?: string): LogLevel =>
        (v || 'INFO').toUpperCase() as LogLevel;

    return {
        slackBotToken: args['slack-bot-token'] || env.ASK_SLACK_BOT,
        slackAppToken: args['slack-app-token'] || env.ASK_SLACK_APP,
        slackChannelId: args['slack-channel-id'] || env.ASK_SLACK_CHANNEL,
        slackBotUserId: args['slack-user-id'] || env.ASK_SLACK_USER,
        role: args['role'] || env.ASK_SLACK_ROLE || 'boss',
        logLevel: toLevel(
            (args['log-level'] as string) || (env.LOG_LEVEL as string) || 'INFO'
        ),
        logFile:
            (args['log-file'] as string) ||
            (env.LOG_FILE as string) ||
            undefined
    };
}

function createMcpServer(human: NoopHuman | SlackHuman, logger: any, roleConfig: any) {
    const server = new McpServer({
        name: 'ask-on-slack-mcp',
        version: '0.1.0'
    });

    server.registerTool(
        `ask_the_${roleConfig.name}_on_slack`,
        {
            title: roleConfig.askTool.title,
            description: roleConfig.askTool.description,
            inputSchema: {
                question: z
                    .string()
                    .describe(roleConfig.askTool.inputDescription)
            }
        },
        async ({ question }) => {
            try {
                const q = String(question || '').trim();
                if (!q) throw new Error('Missing required parameter: question');
                const answer = await human.ask(q);
                return { content: [{ type: 'text', text: answer }] };
            } catch (e: any) {
                logger.error(`ask_on_slack error: ${e?.message || e}`);
                throw e;
            }
        }
    );

    server.registerTool(
        `clarify_with_the_${roleConfig.name}_on_slack`,
        {
            title: roleConfig.clarifyTool.title,
            description: roleConfig.clarifyTool.description,
            inputSchema: {
                question: z
                    .string()
                    .describe(roleConfig.clarifyTool.inputDescription)
            }
        },
        async ({ question }) => {
            try {
                const q = String(question || '').trim();
                if (!q) throw new Error('Missing required parameter: question');
                const answer = await human.ask(q);
                return { content: [{ type: 'text', text: answer }] };
            } catch (e: any) {
                logger.error(`clarify_on_slack error: ${e?.message || e}`);
                throw e;
            }
        }
    );

    server.registerTool(
        `acknowledge_the_${roleConfig.name}_on_slack`,
        {
            title: roleConfig.acknowledgeTool.title,
            description: roleConfig.acknowledgeTool.description,
            inputSchema: {
                acknowledgement: z
                    .string()
                    .describe(roleConfig.acknowledgeTool.inputDescription)
            }
        },
        async ({ acknowledgement }) => {
            try {
                const q = String(acknowledgement || '').trim();
                if (!q) throw new Error('Missing required parameter: acknowledgement');
                await human.ask(q, false);
                return { content: [{ type: 'text', text: `(the ${roleConfig.name} heard you)` }] };
            } catch (e: any) {
                logger.error(`clarify_on_slack error: ${e?.message || e}`);
                throw e;
            }
        }
    );

    return server;
}

export async function main() {
    const config = getConfig();
    const logger = createLogger(config);

    logger.info('Starting Ask on Slack MCP HTTP server');

    let human: NoopHuman | SlackHuman;

    // Slack is considered configured if we have tokens. Channel/user are optional:
    // - If channelId is present but botUserId is not, we post to channel and listen to thread replies (no mention required)
    // - If channelId and botUserId are present, we require a mention in the thread
    // - If channelId is absent and botUserId present, we DM the user
    const haveSlackCreds = !!(config.slackBotToken && config.slackAppToken);
    if (!haveSlackCreds) {
        logger.warn(
            'Slack not configured. ask_on_slack tool will return an error if invoked.'
        );
        human = new NoopHuman();
    } else {
        human = new SlackHuman(
            {
                botToken: config.slackBotToken!,
                appToken: config.slackAppToken!,
                channelId: config.slackChannelId,
                botUserId: config.slackBotUserId
            },
            logger
        );
    }

    // Get role configuration
    const roleConfig = getRole(config.role);
    logger.info(`Using role: ${roleConfig.name}`);

    const port = parseInt(process.env.PORT || '3000');
    const app = express();
    
    // Map to store transports by session ID
    const transports: Record<string, StreamableHTTPServerTransport> = {};

    app.use(express.json());

    // MCP POST endpoint
    const mcpPostHandler = async (req: any, res: any) => {
        const sessionId = req.headers['mcp-session-id'];
        
        try {
            let transport;
            if (sessionId && transports[sessionId]) {
                // Reuse existing transport
                transport = transports[sessionId];
            } else if (!sessionId && isInitializeRequest(req.body)) {
                // New initialization request
                transport = new StreamableHTTPServerTransport({
                    sessionIdGenerator: () => randomUUID(),
                    onsessioninitialized: (sessionId) => {
                        logger.info(`Session initialized with ID: ${sessionId}`);
                        transports[sessionId] = transport;
                    }
                });
                
                // Set up onclose handler to clean up transport when closed
                transport.onclose = () => {
                    const sid = transport.sessionId;
                    if (sid && transports[sid]) {
                        logger.info(`Transport closed for session ${sid}, removing from transports map`);
                        delete transports[sid];
                    }
                };
                
                // Connect the transport to the MCP server BEFORE handling the request
                const server = createMcpServer(human, logger, roleConfig);
                await server.connect(transport);
                await transport.handleRequest(req, res, req.body);
                return; // Already handled
            } else {
                // Invalid request - no session ID or not initialization request
                res.status(400).json({
                    jsonrpc: '2.0',
                    error: {
                        code: -32000,
                        message: 'Bad Request: No valid session ID provided',
                    },
                    id: null,
                });
                return;
            }
            
            // Handle the request with existing transport
            await transport.handleRequest(req, res, req.body);
        } catch (error) {
            logger.error('Error handling MCP request:', error);
            if (!res.headersSent) {
                res.status(500).json({
                    jsonrpc: '2.0',
                    error: {
                        code: -32603,
                        message: 'Internal server error',
                    },
                    id: null,
                });
            }
        }
    };

    // Handle GET requests for SSE streams
    const mcpGetHandler = async (req: any, res: any) => {
        const sessionId = req.headers['mcp-session-id'];
        if (!sessionId || !transports[sessionId]) {
            res.status(400).send('Invalid or missing session ID');
            return;
        }
        
        const transport = transports[sessionId];
        await transport.handleRequest(req, res);
    };

    // Handle DELETE requests for session termination
    const mcpDeleteHandler = async (req: any, res: any) => {
        const sessionId = req.headers['mcp-session-id'];
        if (!sessionId || !transports[sessionId]) {
            res.status(400).send('Invalid or missing session ID');
            return;
        }
        
        try {
            const transport = transports[sessionId];
            await transport.handleRequest(req, res);
        } catch (error) {
            logger.error('Error handling session termination:', error);
            if (!res.headersSent) {
                res.status(500).send('Error processing session termination');
            }
        }
    };

    // Set up routes
    app.post('/mcp', mcpPostHandler);
    app.get('/mcp', mcpGetHandler);
    app.delete('/mcp', mcpDeleteHandler);

    app.listen(port, (error?: Error) => {
        if (error) {
            logger.error('Failed to start server:', error);
            process.exit(1);
        }
        logger.info(`MCP Streamable HTTP Server listening on port ${port} at path /mcp`);
    });

    // Handle server shutdown
    process.on('SIGINT', async () => {
        logger.info('Shutting down server...');
        // Close all active transports to properly clean up resources
        for (const sessionId in transports) {
            try {
                logger.info(`Closing transport for session ${sessionId}`);
                await transports[sessionId].close();
                delete transports[sessionId];
            } catch (error) {
                logger.error(`Error closing transport for session ${sessionId}:`, error);
            }
        }
        logger.info('Server shutdown complete');
        process.exit(0);
    });
}
