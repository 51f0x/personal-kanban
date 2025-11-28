export interface HealthStatus {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
}
