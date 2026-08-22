// Constants for prompt processing
export const RUNS_PER_PROMPT = 1;

// Fallback cadence (hours) when the DEFAULT_DELAY_HOURS env var is unset or invalid.
export const DEFAULT_DELAY_HOURS_FALLBACK = 24;

/**
 * Resolves the default prompt cadence (hours) for brands without a
 * delayOverrideHours. Reads DEFAULT_DELAY_HOURS from the environment; falls
 * back to DEFAULT_DELAY_HOURS_FALLBACK when unset, non-numeric, or <= 0.
 *
 * Server-only. Client code should read clientConfig.defaultDelayHours instead
 * of calling this directly — `process` is not defined in browser bundles.
 */
export function getDefaultDelayHours(): number {
	const raw = typeof process !== "undefined" ? process.env.DEFAULT_DELAY_HOURS : undefined;
	if (!raw) return DEFAULT_DELAY_HOURS_FALLBACK;
	const parsed = Number(raw);
	if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_DELAY_HOURS_FALLBACK;
	return parsed;
}

// Maximum limits for brand resources
export const MAX_COMPETITORS = 100;
export const MAX_PROMPTS = 100;

/**
 * Sentinel providers store in `prompt_runs.web_queries` when a web search
 * happened (citations prove it) but the provider doesn't expose the actual
 * query strings (OpenRouter always; BrightData/Olostep on extraction failure).
 * Written by the provider implementations and filtered out by every fan-out
 * read path — keep both sides on this constant.
 */
export const WEB_QUERIES_UNAVAILABLE = "unavailable";

/**
 * Retry and expiry policy for the `process-prompt` queue.
 *
 * Shared because the web app, the worker, and the maintenance job all enqueue
 * this queue, and pg-boss lets a per-job value override the queue default — so
 * a number that disagrees between call sites silently wins or loses depending
 * on which path created the job. It previously lived inline in six places.
 *
 * `expireInSeconds` has to clear the slowest provider's scrape ceiling times
 * the worker's localConcurrency, because scrapes queue behind each other at
 * the provider concurrency gates. See apps/worker/src/index.ts.
 *
 * `retryLimit: 0` because by the time this job can fail it has already sent
 * paid requests, and a queue-level retry re-runs the entire fan-out — including
 * every model that succeeded. Worse, pg-boss cannot cancel a promise, so a job
 * killed at `expireInSeconds` keeps running while its retry starts, and both
 * waves bill. Recovery goes through the handler's own failure backoff
 * (run-backoff.ts) instead, or through schedule-maintenance for a job that died
 * before reaching it.
 */
export const PROCESS_PROMPT_JOB_POLICY = {
	retryLimit: 0,
	// Inert while retryLimit is 0, kept because the queue reconcile in
	// apps/worker/src/index.ts writes all four columns.
	retryDelay: 60,
	retryBackoff: true,
	expireInSeconds: 60 * 100,
} as const;

/**
 * Priority for a prompt that has no results yet, or that someone asked to run
 * now from the admin panel.
 *
 * pg-boss fetches `ORDER BY priority DESC, created_on`, and the steady state of
 * this queue is a backlog of a hundred-odd overdue prompts draining at the
 * provider concurrency gates. At that rate a newly onboarded brand added to the
 * back of the line waits the better part of a day before its first answer
 * exists, so its dashboard is empty exactly when someone wants to show it.
 *
 * A first run is the only run whose delay is visible to anyone: every later run
 * lands on top of data that is already there. So first runs go to the front,
 * and the priority is spent on the job — the next cycle is enqueued fresh at
 * the default 0 and takes its normal turn.
 */
export const FIRST_RUN_JOB_PRIORITY = 100;
