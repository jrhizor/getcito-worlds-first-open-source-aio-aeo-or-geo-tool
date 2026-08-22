import { describe, expect, it } from "vitest";
import { FAILURE_BACKOFF_HOURS, failureBackoffHours } from "./run-backoff";

describe("failureBackoffHours", () => {
	it("returns the cadence when the last cycle produced something", () => {
		expect(failureBackoffHours(0, 24)).toBe(24);
		expect(failureBackoffHours(-1, 24)).toBe(24);
	});

	it("ramps with the failure streak", () => {
		expect(failureBackoffHours(1, 24)).toBe(0.25);
		expect(failureBackoffHours(3, 24)).toBe(1);
	});

	it("settles back at the cadence once the ramp is exhausted", () => {
		expect(failureBackoffHours(FAILURE_BACKOFF_HOURS.length + 1, 24)).toBe(24);
	});

	it("never waits longer than the cadence", () => {
		// A brand on a 30-minute cadence must not be pushed out to the 8h step.
		expect(failureBackoffHours(6, 0.5)).toBe(0.5);
	});
});
