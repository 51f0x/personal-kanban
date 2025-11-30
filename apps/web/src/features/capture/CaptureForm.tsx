import { FormEvent, useEffect, useState } from 'react';
import { sendCapture } from '../../services/capture';
import type { Board } from '../../services/types';
import { enqueueCapture } from '../../utils/offlineQueue';
import { useVoiceCapture } from '../../hooks/useVoiceCapture';
import { NativeSelect } from '@/components/base/select/select-native';
import { TextArea } from '@/components/base/textarea/textarea';
import { Button } from '@/components/base/buttons/button';

interface Props {
  boards: Board[];
  ownerId: string;
  onCaptured?: () => void;
}

export function CaptureForm({ boards, ownerId, onCaptured }: Props) {
  const [text, setText] = useState('');
  const [boardId, setBoardId] = useState<string>(() => boards[0]?.id ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const { listening, start, stop, supported, transcript, reset } = useVoiceCapture();

  useEffect(() => {
    if (!boardId && boards[0]) {
      setBoardId(boards[0].id);
    }
  }, [boardId, boards]);

  const targetBoardId = boardId || boards[0]?.id || '';

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!ownerId || !targetBoardId || !text.trim()) {
      setMessage('Owner, board, and text are required');
      return;
    }
    setSubmitting(true);
    setMessage(null);
    const payload = {
      ownerId,
      boardId: targetBoardId,
      text: `${text.trim()}${transcript ? ` ${transcript}` : ''}`.trim(),
      source: 'web-quick-add',
    };
    try {
      await sendCapture(payload);
      setMessage('Captured successfully');
      setText('');
      reset();
      onCaptured?.();
    } catch (error) {
      enqueueCapture(payload);
      setMessage('Offline? Task queued for sync.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section 
      className="backdrop-blur-sm border rounded-2xl p-8 flex flex-col gap-6 shadow-lg hover:shadow-xl transition-all duration-250"
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border-subtle)',
      }}
    >
      <header className="flex flex-col gap-2">
        <p 
          className="text-xs uppercase tracking-wider font-semibold"
          style={{ color: 'var(--accent-soft)' }}
        >
          Quick capture
        </p>
        <h2 
          className="text-2xl font-semibold"
          style={{ color: 'var(--text-primary)' }}
        >
          Send anything to your Input queue
        </h2>
      </header>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <NativeSelect
          label="Board"
          value={targetBoardId}
          onChange={(e) => setBoardId(e.target.value)}
          options={boards.map((board) => ({
            label: board.name,
            value: board.id,
          }))}
        />
        <TextArea
          label="Text or URL"
          value={text}
          onChange={(value: string) => setText(value)}
          placeholder="Type or paste anything..."
          rows={6}
        />
        {supported && (
          <div className="flex gap-3 items-center flex-wrap">
            <Button
              size="sm"
              color="secondary"
              onClick={listening ? stop : start}
            >
              {listening ? 'Stop dictation' : 'Voice capture'}
            </Button>
            {transcript && (
              <span 
                className="text-sm"
                style={{ color: 'var(--text-secondary)' }}
              >
                Voice: {transcript}
              </span>
            )}
          </div>
        )}
        <Button
          type="submit"
          size="md"
          color="primary"
          isDisabled={submitting || !ownerId}
          isLoading={submitting}
        >
          {submitting ? 'Capturing...' : 'Capture'}
        </Button>
      </form>
      {message && (
        <p 
          className="text-sm"
          style={{ color: 'var(--text-secondary)' }}
        >
          {message}
        </p>
      )}
    </section>
  );
}
