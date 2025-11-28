import { ConfigService } from '@nestjs/config';
import { ImapFlow } from 'imapflow';
import { ImapPollerService } from '../imap.poller';
import { QuickTaskService } from '../../capture/quick-task.service';

describe('ImapPollerService', () => {
  const defaultConfig = {
    IMAP_HOST: 'localhost',
    IMAP_USERNAME: 'user',
    IMAP_PASSWORD: 'pass',
    IMAP_DEFAULT_BOARD_ID: 'board-1',
    IMAP_DEFAULT_OWNER_ID: 'owner-1',
  };

  const config = {
    get: jest.fn((key: string) => (defaultConfig as Record<string, string>)[key]),
  } as unknown as ConfigService;

  const quickTask = {
    createFromCapture: jest.fn().mockResolvedValue({ id: 'task-1', boardId: 'board-1' }),
  } as unknown as QuickTaskService;

  const fakeClient = () => {
    let seenFlagged = false;
    return {
      mailboxOpen: jest.fn(),
      async search() {
        if (seenFlagged) return [];
        return [1];
      },
      async fetchOne() {
        return {
          envelope: {
            subject: 'Test subject',
            from: [{ address: 'sender@example.com' }],
          },
          source: Buffer.from('Body content'),
        };
      },
      async messageFlagsAdd() {
        seenFlagged = true;
      },
    };
  };

  it('processes unseen emails and dedupes via seen flag', async () => {
    const service = new ImapPollerService(config, quickTask);
    service.configureForTest(fakeClient() as unknown as ImapFlow);

    await service.pollMailbox();
    expect(quickTask.createFromCapture).toHaveBeenCalledTimes(1);

    await service.pollMailbox();
    expect(quickTask.createFromCapture).toHaveBeenCalledTimes(1);
  });
});
