#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { createLogger } from './logger.ts';
import { NoopHuman } from './human.ts';
import { SlackHuman } from './slack-http-client.ts';
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
        logLevel: toLevel(
            (args['log-level'] as string) || (env.LOG_LEVEL as string) || 'INFO'
        ),
        logFile:
            (args['log-file'] as string) ||
            (env.LOG_FILE as string) ||
            undefined
    };
}

export async function main() {
    const config = getConfig();
    const logger = createLogger(config);

    logger.info('Starting Ask on Slack MCP server');

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

    const inputSchema: any = {
        type: 'object',
        properties: {
            question: {
                type: 'string',
                description:
                    'The question to ask the human. Be specific and provide context.'
            }
        },
        required: ['question']
    };

    const server = new McpServer({
        name: 'ask-on-slack-mcp',
        version: '0.1.0'
    });

    server.registerTool(
        'ask_the_boss_on_slack',
        {
            title: 'Ask on Slack',
            description:
                'Ask a human boss for information that only they would know. Use for preferences, project-specific context, local env details, non-public info, doubts. If the user replies with another question, call this tool again. Only use this tool when you really need human input.',
            inputSchema: {
                question: z
                    .string()
                    .describe(
                        'The question to ask the human boss. Be specific and provide context.'
                    )
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
        'clarify_with_the_boss_on_slack',
        {
            title: 'Clarify with the boss on Slack',
            description:
                'If you called the ask_the_boss_on_slack tool but the boss did not understand your question or asked anything back, use MUST this tool to re-ask in a clearer way. Do not use this tool if you have not called ask_the_boss_on_slack before. Only use this tool when you really need human input.',
            inputSchema: {
                question: z
                    .string()
                    .describe(
                        'The clarification to ask the human boss. Be specific and provide context.'
                    )
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
        'acknowledge_the_boss_on_slack',
        {
            title: 'Acknowledge the boss on Slack',
            description:
                'If you called the ask_the_boss_on_slack tool and the boss replied, then you MUST use this tool to acknowledge the reply with a simple message like "Thanks", "Got it", "Understood", "Ok", "Will do", etc. Do not use this tool if you have not called ask_the_boss_on_slack before',
            inputSchema: {
                acknowledgement: z
                    .string()
                    .describe(
                        'The text to tell the boss to acknowledge receiving their reply. Keep it short.'
                    )
            }
        },
        async ({ acknowledgement }) => {
            try {
                const q = String(acknowledgement || '').trim();
                if (!q) throw new Error('Missing required parameter: acknowledgement');
                await human.ask(q, false);
                return { content: [{ type: 'text', text: '(the boss heard you)' }] };
            } catch (e: any) {
                logger.error(`clarify_on_slack error: ${e?.message || e}`);
                throw e;
            }
        }
    );

    const transport = new StdioServerTransport();
    await server.connect(transport);
}
