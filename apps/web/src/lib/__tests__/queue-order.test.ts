import { describe, expect, it } from "vitest";
import { compareQueueOrder, type OrderableJob } from "@/lib/queue-order";

const job = (jobId: string, priority: number, createdOn: string | null): OrderableJob => ({
	jobId,
	priority,
	createdOn,
});

describe("compareQueueOrder", () => {
	it("puts higher priority first, regardless of age", () => {
		const sorted = [job("old", 0, "2026-01-01T00:00:00.000Z"), job("bumped", 100, "2026-06-01T00:00:00.000Z")].sort(
			compareQueueOrder,
		);
		expect(sorted.map((j) => j.jobId)).toEqual(["bumped", "old"]);
	});

	it("falls back to oldest first within the same priority", () => {
		const sorted = [job("newer", 0, "2026-06-02T00:00:00.000Z"), job("older", 0, "2026-06-01T00:00:00.000Z")].sort(
			compareQueueOrder,
		);
		expect(sorted.map((j) => j.jobId)).toEqual(["older", "newer"]);
	});

	it("breaks ties on job id so the order is stable across refreshes", () => {
		const at = "2026-06-01T00:00:00.000Z";
		const sorted = [job("b", 0, at), job("a", 0, at)].sort(compareQueueOrder);
		expect(sorted.map((j) => j.jobId)).toEqual(["a", "b"]);
	});

	it("sorts jobs with no creation date ahead of dated ones rather than throwing", () => {
		const sorted = [job("dated", 0, "2026-06-01T00:00:00.000Z"), job("undated", 0, null)].sort(compareQueueOrder);
		expect(sorted.map((j) => j.jobId)).toEqual(["undated", "dated"]);
	});
});
