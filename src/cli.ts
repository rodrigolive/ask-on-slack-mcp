#!/usr/bin/env node
import sade from 'sade';

import { main as stdioMain } from './stdio.ts';
import { main as serveMain } from './serve.ts';

const prog = sade('ask-on-slack');

prog
  .version('0.1.0')
  .describe('MCP server to ask humans on Slack from AI agents using HTTP polling')
  .option('--slack-bot-token', 'Bot User OAuth Token (xoxb-...)')
  .option('--slack-app-token', 'App-Level Token (xapp-...)')
  .option('--slack-channel-id', 'Channel ID where the bot will operate')
  .option('--slack-user-id', 'User ID to mention when asking questions')
  .option('--role, -r', 'Role for the human (boss, expert, or custom name)')
  .option('--log-level', 'Logging level (default: INFO)')
  .option('--log-file', 'Log file path (if specified, logs will be written to file instead of stderr)');

prog
  .command('stdio')
  .describe('Run the MCP server over stdio transport')
  .action(async () => {
    try {
      await stdioMain();
    } catch (e) {
      console.error(`[ERROR] ${new Date().toISOString()} - ${e?.stack || e}`);
      process.exit(1);
    }
  });

prog
  .command('serve')
  .describe('Run the MCP server over HTTP transport')
  .option('--port', 'Port to listen on (default: 3000)')
  .action(async (opts) => {
    try {
      // Set PORT environment variable if provided
      if (opts.port) {
        process.env.PORT = opts.port;
      }
      await serveMain();
    } catch (e) {
      console.error(`[ERROR] ${new Date().toISOString()} - ${e?.stack || e}`);
      process.exit(1);
    }
  });

prog.parse(process.argv);