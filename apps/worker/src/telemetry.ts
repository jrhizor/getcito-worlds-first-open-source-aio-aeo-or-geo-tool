/**
 * Telemetry stubs. Call sites pass an event name and properties so a real
 * backend can be dropped in here without touching them; the signature has to
 * accept those arguments even while the body ignores them.
 */
export function trackWorkerEvent(_event: string, _properties?: Record<string, unknown>): void {}
export async function shutdownTelemetry(): Promise<void> {}
