import type { Logger, Human } from './types';

export interface SlackConfig {
    botToken: string;
    appToken: string;
    channelId?: string;
    botUserId?: string;
}

type SlackMsg = {
    type?: string;
    user?: string;
    text?: string;
    ts: string;
    thread_ts?: string;
    bot_id?: string;
    subtype?: string;
};

export class SlackHuman implements Human {
    private log: Logger;
    private cfg: SlackConfig;

    constructor(cfg: SlackConfig, log: Logger) {
        this.cfg = cfg;
        this.log = log;
    }

    private async slackFetch<T>(
        path: string,
        init?: RequestInit & { retry?: number },
        retriesLeft: number = 3
    ): Promise<T> {
        const url = `https://slack.com/api/${path}`;
        const res = await fetch(url, {
            ...init,
            headers: {
                Authorization: `Bearer ${this.cfg.botToken}`,
                'Content-Type': 'application/json; charset=utf-8',
                ...(init?.headers || {})
            }
        });

        if (res.status === 429) {
            if (retriesLeft <= 0) {
                throw new Error('Too many retries on 429');
            }
            const retryAfter = Number(res.headers.get('retry-after') ?? '1');
            await this.sleep(retryAfter * 1000);
            return this.slackFetch<T>(path, init, retriesLeft - 1);
        }

        const data = (await res.json()) as any;
        if (!data.ok) {
            throw Object.assign(new Error(data.error || 'slack_api_error'), {
                data
            });
        }
        return data as T;
    }

    private sleep(ms: number) {
        return new Promise(r => setTimeout(r, ms));
    }

    private async ensureInChannel(channel: string) {
        try {
            await this.slackFetch<any>('conversations.join', {
                method: 'POST',
                body: JSON.stringify({ channel })
            });
        } catch {
            // ignore (already joined or not allowed for private channels)
        }
    }

    private async postQuestion(channel: string, text: string) {
        const res = await this.slackFetch<{ ok: boolean; ts: string }>(
            'chat.postMessage',
            {
                method: 'POST',
                body: JSON.stringify({ channel, text })
            }
        );
        return res.ts; // parent thread ts
    }

    private async getThreadReplies(channel: string, thread_ts: string) {
        const res = await this.slackFetch<{ messages: SlackMsg[] }>(
            `conversations.replies?channel=${encodeURIComponent(
                channel
            )}&ts=${encodeURIComponent(thread_ts)}&limit=50`
        );
        return res.messages || [];
    }

    private isHumanReply(msg: SlackMsg, parentTs: string, postedTs: string) {
        // We only want replies in the thread, after we posted,
        // and not from bots/system.
        if (!msg) return false;
        if (msg.bot_id) return false;
        if (msg.subtype && msg.subtype !== 'thread_broadcast') return false;
        if (msg.thread_ts !== parentTs) return false;
        if (!msg.text || !msg.user) return false;
        // only messages strictly after our post
        if (parseFloat(msg.ts) <= parseFloat(postedTs)) return false;
        return true;
    }

    async ask(question: string, hasReply = true): Promise<string> {
        const timeoutMs = 300_000;
        const { channelId, botUserId } = this.cfg;

        if (!channelId) throw new Error('channelId is required');

        await this.ensureInChannel(channelId);

        const parentTs = await this.postQuestion(channelId, question);
        this.log.info(`Posted question. Thread ts: ${parentTs}`);

        if (hasReply) {
            return await this.waitForReply({
                channelId,
                botUserId,
                threadTs: parentTs,
                timeoutMs
            });
        } else {
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
        const deadline = Date.now() + timeoutMs;
        let backoffMs = 500; // start with 0.5s, cap later

        // First quick check (often someone replies instantly)
        {
            const msgs = await this.getThreadReplies(channelId, threadTs);
            const reply = msgs.find(m => this.isHumanReply(m, threadTs, threadTs));
            if (reply) {
                let replyText = reply.text!;
                if (botUserId) {
                    replyText = replyText.replace(new RegExp(`<@${botUserId}>`, "g"), "").trim();
                }
                return `The boss replied (use the tool to clarify back with the boss): ${replyText}`;
            }
        }

        while (Date.now() < deadline) {
            await this.sleep(backoffMs);
            try {
                // Check for replies in the thread
                const msgs = await this.getThreadReplies(channelId, threadTs);
                const reply = msgs.find(m => this.isHumanReply(m, threadTs, threadTs));
                if (reply) {
                    this.log.info(
                        `Thread reply from <@${reply.user}>: ${reply.text}`
                    );
                    let replyText = reply.text!;
                    if (botUserId) {
                        replyText = replyText.replace(new RegExp(`<@${botUserId}>`, "g"), "").trim();
                    }
                    return `The boss replied (use the tool to clarify back with the boss): ${replyText}`;
                }

                // If we have a bot user ID, also check for direct mentions
                if (botUserId) {
                    const history = await this.slackFetch<{ messages: SlackMsg[] }>(
                        `conversations.history?channel=${encodeURIComponent(channelId)}&limit=10`
                    );
                    
                    const mention = history.messages.find(msg => 
                        !msg.bot_id && 
                        msg.text?.includes(`<@${botUserId}>`) &&
                        parseFloat(msg.ts) > parseFloat(threadTs)
                    );
                    
                    if (mention) {
                        this.log.info(
                            `Mention from <@${mention.user}>: ${mention.text}`
                        );
                        let mentionText = mention.text!;
                        if (botUserId) {
                            mentionText = mentionText.replace(new RegExp(`<@${botUserId}>`, "g"), "").trim();
                        }
                        return `The boss replied (use the tool to clarify back with the boss): ${mentionText}`;
                    }
                }

                // gentle backoff up to ~6s to reduce API calls
                backoffMs = Math.min(backoffMs + 250, 4000);
            } catch (err: any) {
                // If temporarily failing, wait a bit and retry
                this.log.error('Polling error: ' + (err?.data?.error || err?.message || String(err)));
                await this.sleep(2000);
            }
        }

        throw new Error('Timed out waiting for a thread reply.');
    }
}

