#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
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

    // Get role configuration
    const roleConfig = getRole(config.role);
    logger.info(`Using role: ${roleConfig.name}`);

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

    const transport = new StdioServerTransport();
    await server.connect(transport);
}
