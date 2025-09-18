import { App, LogLevel } from '@slack/bolt';
import type { Logger, Human } from './types';

export interface SlackConfig {
    botToken: string;
    appToken: string;
    channelId?: string;
    botUserId?: string;
}

export class SlackHuman implements Human {
    private app: App | null = null;
    private log: Logger;
    private cfg: SlackConfig;

    constructor(cfg: SlackConfig, log: Logger) {
        this.cfg = cfg;
        this.log = log;
    }

    private async ensureApp(): Promise<App> {
        if (!this.app) {
            this.app = new App({
                token: this.cfg.botToken,
                appToken: this.cfg.appToken,
                socketMode: true,
                logLevel: LogLevel.INFO
            });
            await this.app.start();
            this.log.info('[SLACK] App started');
        }
        return this.app;
    }

    async ask(question: string, hasReply = true): Promise<string> {
        const timeoutMs = 300_000;
        const app = await this.ensureApp();
        const { channelId, botUserId } = this.cfg;

        if (!channelId) throw new Error('channelId is required');

        await app.start();

        try {
            await app.client.conversations.join({
                channel: channelId
            });
        } catch {}

        const res = await app.client.chat.postMessage({
            channel: channelId,
            text: question
        });

        const threadTs = res.ts;
        this.log.info(`Posted question. Thread ts: ${threadTs}`);

        if( hasReply ) {
            return await this.waitForReply({
                channelId,
                botUserId,
                threadTs: threadTs!,
                timeoutMs
            });
        }
        else {
            return '';
        }
    }

    private async waitForReply(opts: {
        channelId: string;
        botUserId: string | undefined;
        threadTs: string;
        timeoutMs: number;
    }): Promise<string> {
        const { channelId, botUserId, threadTs, timeoutMs } = opts;

        const app = await this.ensureApp();
        return await new Promise<string>((resolve, reject) => {
            const timeout = setTimeout(() => {
                console.error('Timed out waiting.');
                process.exit(2);
            }, timeoutMs);

            const done = reply => {
                clearTimeout(timeout);
                reply = reply.replace(new RegExp(`<@${botUserId}>`, "g"), "").trim();
                resolve(`The boss replied (use the tool to clarify back with the boss):\n${reply}`);
            };

            app.event('message', async ({ event }) => {
                if ('bot_id' in event && event.bot_id) return; // ignore bot posts
                if (!('text' in event) || !event.text || !('user' in event) || !event.user) return;

                // ---- Case 1: reply in the thread ----
                if (
                    !event.subtype &&
                    event.thread_ts === threadTs &&
                    event.channel === channelId &&
                    parseFloat(event.ts) > parseFloat(threadTs)
                ) {
                    clearTimeout(timeout);
                    this.log.info(
                        `Thread reply from <@${event.user}>: ${event.text}`
                    );
                    done(event.text);
                }

                if (
                    event.subtype === 'thread_broadcast' &&
                    event.channel === channelId &&
                    event.thread_ts === threadTs &&
                    parseFloat(event.ts) > parseFloat(threadTs)
                ) {
                    clearTimeout(timeout);
                    this.log.info(
                        `Thread reply (broadcast) from <@${event.user}>: ${event.text}`
                    );
                    done(event.text);
                }

                // ---- Case 2: mention anywhere ----
                if (botUserId && event.text.includes(`<@${botUserId}>`)) {
                    clearTimeout(timeout);
                    this.log.info(
                        `Mention from <@${event.user}>: ${event.text}`
                    );
                    done(event.text);
                }
            });
        });
    }
}
