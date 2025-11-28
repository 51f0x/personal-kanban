export interface HealthStatus {
    status: 'ok' | 'degraded' | 'error';
    timestamp: string;
}
export interface CaptureParseResult {
    title: string;
    description?: string;
    metadata: Record<string, unknown>;
}
export declare function parseCaptureText(text: string): CaptureParseResult;
