import { apiPost } from './api';

const TOKEN = import.meta.env.VITE_CAPTURE_TOKEN ?? '';

export interface CapturePayload {
    ownerId: string;
    boardId: string;
    columnId?: string;
    text: string;
    source?: string;
}

export async function sendCapture(payload: CapturePayload) {
    const headers: HeadersInit = {};

    // Add capture token if configured (this is different from JWT auth)
    if (TOKEN) {
        headers['x-capture-token'] = TOKEN;
    }

    return apiPost('/capture', payload, { headers });
}
