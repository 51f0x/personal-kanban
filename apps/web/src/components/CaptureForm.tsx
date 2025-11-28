import { FormEvent, useEffect, useState } from 'react';
import { sendCapture } from '../api/capture';
import type { Board } from '../api/types';
import { enqueueCapture } from '../utils/offlineQueue';
import { useVoiceCapture } from '../hooks/useVoiceCapture';

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
    <section className="capture-card">
      <header>
        <p className="eyebrow">Quick capture</p>
        <h2>Send anything to your Input queue</h2>
      </header>
      <form onSubmit={handleSubmit} className="capture-form">
        <label>
          Board
          <select value={targetBoardId} onChange={(event) => setBoardId(event.target.value)}>
            {boards.map((board) => (
              <option key={board.id} value={board.id}>
                {board.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Text or URL
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Type or paste anything..."
          />
        </label>
        {supported && (
          <div className="voice-controls">
            <button type="button" onClick={listening ? stop : start}>
              {listening ? 'Stop dictation' : 'Voice capture'}
            </button>
            {transcript && <span className="muted">Voice: {transcript}</span>}
          </div>
        )}
        <button type="submit" disabled={submitting || !ownerId}>
          {submitting ? 'Capturing...' : 'Capture'}
        </button>
      </form>
      {message && <p className="muted">{message}</p>}
    </section>
  );
}
