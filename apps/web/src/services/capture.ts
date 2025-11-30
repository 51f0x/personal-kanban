const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';
const TOKEN = import.meta.env.VITE_CAPTURE_TOKEN ?? '';

export interface CapturePayload {
  ownerId: string;
  boardId: string;
  columnId?: string;
  text: string;
  source?: string;
}

export async function sendCapture(payload: CapturePayload) {
  const response = await fetch(`${API_URL}/capture`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(TOKEN ? { 'x-capture-token': TOKEN } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Capture failed (${response.status})`);
  }

  return response.json();
}
