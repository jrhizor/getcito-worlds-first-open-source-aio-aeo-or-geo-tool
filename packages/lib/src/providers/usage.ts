/**
 * Billable-call accounting for upstream providers.
 *
 * Every `Provider.run()` / `runStructuredResearch()` is one billable unit —
 * one Olostep scrape, one chat completion — so this module wraps those calls
 * and writes a `provider_calls` row per attempt. The admin usage page reads
 * those rows back; the point is to have a number to hold against a vendor's
 * invoice.
 *
 * Recording is best-effort by design: a logging failure must never take down
 * the run that was being logged, so `recordProviderCall` swallows its own
 * errors after warning.
 */
import { db } from "../db/db";
import { providerCalls } from "../db/schema";

export type ProviderCallKind = "run" | "research";

export interface ProviderCallRecord {
	provider: string;
	model: string;
	kind: ProviderCallKind;
	brandId?: string | null;
	/** Set for tracked prompt runs; null for reports and onboarding research. */
	promptId?: string | null;
	success: boolean;
	errorMessage?: string | null;
	durationMs?: number;
}

/** Error text is only ever read by a human in the admin table. */
const MAX_ERROR_CHARS = 500;

export async function recordProviderCall(record: ProviderCallRecord): Promise<void> {
	try {
		await db.insert(providerCalls).values({
			provider: record.provider,
			model: record.model,
			kind: record.kind,
			brandId: record.brandId ?? null,
			promptId: record.promptId ?? null,
			success: record.success,
			errorMessage: record.errorMessage?.slice(0, MAX_ERROR_CHARS) ?? null,
			durationMs: record.durationMs,
		});
	} catch (err) {
		console.warn("[provider-usage] failed to record call:", err);
	}
}

/**
 * Run `fn` and record one call against it, whether it resolves or throws.
 *
 * The original error is always rethrown — the counter is an observer, never a
 * gate on the work it observes.
 */
export async function withProviderCallTracking<T>(
	meta: Omit<ProviderCallRecord, "success" | "errorMessage" | "durationMs">,
	fn: () => Promise<T>,
): Promise<T> {
	const startedAt = Date.now();
	try {
		const result = await fn();
		await recordProviderCall({ ...meta, success: true, durationMs: Date.now() - startedAt });
		return result;
	} catch (err) {
		await recordProviderCall({
			...meta,
			success: false,
			errorMessage: err instanceof Error ? err.message : String(err),
			durationMs: Date.now() - startedAt,
		});
		throw err;
	}
}
