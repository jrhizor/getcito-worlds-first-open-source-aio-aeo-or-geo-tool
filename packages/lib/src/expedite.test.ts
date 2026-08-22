import { describe, expect, it } from "vitest";
import { shouldExpediteJob } from "./expedite";

const HOUR = 60 * 60 * 1000;
const now = new Date("2026-08-20T12:00:00Z").getTime();
const base = { jobConsecutiveFailures: 0, runFrequencyMs: 24 * HOUR, now, minIntervalMs: HOUR };

describe("shouldExpediteJob", () => {
	it("expedites a stalled prompt", () => {
		expect(shouldExpediteJob({ ...base, lastRunAt: new Date(now - 30 * HOUR) })).toBe(true);
	});

	it("expedites a prompt that has never recorded a run", () => {
		expect(shouldExpediteJob({ ...base, lastRunAt: null })).toBe(true);
	});

	it("refuses while the job carries a failure streak", () => {
		// The 15-minute backoff a failed cycle chose must not be undone every
		// 5 minutes by the maintenance sweep.
		expect(shouldExpediteJob({ ...base, jobConsecutiveFailures: 1, lastRunAt: null })).toBe(false);
	});

	it("refuses for a prompt that ran within the floor", () => {
		expect(shouldExpediteJob({ ...base, lastRunAt: new Date(now - 10 * 60 * 1000) })).toBe(false);
	});
});
