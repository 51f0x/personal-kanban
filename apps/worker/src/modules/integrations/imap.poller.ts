import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ImapFlow } from 'imapflow';
import { QuickTaskService } from '../capture-worker/quick-task.service';

@Injectable()
export class ImapPollerService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(ImapPollerService.name);
    private client?: ImapFlow;
    private interval?: NodeJS.Timeout;
    private enabled = false;

    constructor(
        private readonly config: ConfigService,
        private readonly quickTask: QuickTaskService,
    ) {}

    async onModuleInit() {
        try {
            const host = this.config.get<string>('IMAP_HOST');
            const username = this.config.get<string>('IMAP_USERNAME');
            const password = this.config.get<string>('IMAP_PASSWORD');
            const boardId = this.config.get<string>('IMAP_DEFAULT_BOARD_ID');
            const ownerId = this.config.get<string>('IMAP_DEFAULT_OWNER_ID');

            if (!host || !username || !password || !boardId || !ownerId) {
                this.logger.log('IMAP capture disabled (missing configuration).');
                return;
            }

            this.enabled = true;

            this.client = new ImapFlow({
                host,
                port: Number(this.config.get<string>('IMAP_PORT') ?? '993'),
                secure: this.config.get<string>('IMAP_SECURE') !== 'false',
                auth: { user: username, pass: password },
            });

            await this.client.connect();
            this.logger.log('Connected to IMAP server');

            const intervalMs = Number(this.config.get<string>('IMAP_POLL_INTERVAL_MS') ?? '60000');
            this.interval = setInterval(() => {
                this.pollMailbox().catch((error) => this.logger.error('IMAP poll failed', error));
            }, intervalMs);

            this.logger.log(`IMAP poller started (interval: ${intervalMs}ms)`);
        } catch (error) {
            this.logger.error('Failed to initialize IMAP poller:', error);
            // Don't throw - allow app to start even if IMAP is unavailable
            // The service will remain disabled
            this.enabled = false;
        }
    }

    async onModuleDestroy() {
        this.interval && clearInterval(this.interval);
        if (this.client && this.enabled) {
            await this.client
                .logout()
                .catch((error) => this.logger.error('Failed to logout IMAP', error));
        }
    }

    async pollMailbox() {
        if (!this.enabled || !this.client) return;
        const mailbox = this.config.get<string>('IMAP_MAILBOX') ?? 'INBOX';
        await this.client.mailboxOpen(mailbox);
        const unseen = (await this.client.search({ seen: false })) || [];
        if (!unseen.length) {
            return;
        }

        const boardId = this.config.get<string>('IMAP_DEFAULT_BOARD_ID') as string;
        const ownerId = this.config.get<string>('IMAP_DEFAULT_OWNER_ID') as string;
        const columnId = this.config.get<string>('IMAP_DEFAULT_COLUMN_ID') ?? undefined;

        for (const sequence of unseen) {
            const message = await this.client.fetchOne(sequence, { source: true, envelope: true });
            if (!message) {
                continue;
            }
            const subject = message.envelope?.subject || 'Email capture';
            const from = message.envelope?.from?.[0]?.address || 'unknown';
            const raw = message.source?.toString('utf8') ?? '';
            const text = `${subject}\nFrom: ${from}\n${raw.substring(0, 2000)}`;

            await this.quickTask
                .createFromCapture({
                    ownerId,
                    boardId,
                    columnId,
                    text,
                    source: 'imap',
                })
                .catch((error) => this.logger.error('Failed to create task from email', error));

            await this.client.messageFlagsAdd(sequence, ['\\Seen']);
        }

        this.logger.log(`Processed ${unseen.length} email(s) into capture queue.`);
    }

    configureForTest(client: ImapFlow) {
        this.client = client;
        this.enabled = true;
    }
}
