export interface HealthStatus {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
}

export interface CaptureParseResult {
  title: string;
  description?: string;
  metadata: Record<string, unknown>;
}

const urlRegex = /(https?:\/\/[^\s]+)/i;

export function parseCaptureText(text: string): CaptureParseResult {
  const urlMatch = text.match(urlRegex);
  const url = urlMatch?.[0];
  const title = (text.replace(urlRegex, '').trim() || url || 'Captured item').slice(0, 120);

  return {
    title,
    description: text.trim(),
    metadata: {
      url,
      raw: text,
      extractedAt: new Date().toISOString(),
    },
  };
}
