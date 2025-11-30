import { CapturePayload, sendCapture } from '../services/capture';

const STORAGE_KEY = 'pk_pending_captures_v1';

type PendingCapture = CapturePayload & { id: string };

function loadQueue(): PendingCapture[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PendingCapture[]) : [];
  } catch (error) {
    console.warn('Failed to load capture queue', error);
    return [];
  }
}

function saveQueue(queue: PendingCapture[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

export function enqueueCapture(payload: CapturePayload) {
  const queue = loadQueue();
  queue.push({ ...payload, id: crypto.randomUUID() });
  saveQueue(queue);
}

export async function flushCaptureQueue() {
  if (!navigator.onLine) return;
  const queue = loadQueue();
  if (!queue.length) return;

  const remaining: PendingCapture[] = [];

  for (const entry of queue) {
    try {
      await sendCapture(entry);
    } catch (error) {
      console.warn('Failed to flush capture, will retry', error);
      remaining.push(entry);
    }
  }

  saveQueue(remaining);
}

export function initOfflineQueue() {
  window.addEventListener('online', () => {
    flushCaptureQueue().catch((error) => console.error('Queue flush failed', error));
  });
  flushCaptureQueue().catch((error) => console.error('Queue flush failed', error));
}
