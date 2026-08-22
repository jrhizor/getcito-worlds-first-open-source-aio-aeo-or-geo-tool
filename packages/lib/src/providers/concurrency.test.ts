import { describe, expect, it } from "vitest";
import { createGate } from "./concurrency";

/** Resolves once the caller signals, so a task's duration is controllable. */
function deferred() {
	let resolve!: () => void;
	const promise = new Promise<void>((r) => {
		resolve = r;
	});
	return { promise, resolve };
}

describe("createGate", () => {
	it("never runs more than `limit` tasks at once", async () => {
		const gate = createGate(2);
		let active = 0;
		let peak = 0;
		const blockers = Array.from({ length: 6 }, () => deferred());

		const tasks = blockers.map((blocker) =>
			gate(async () => {
				active++;
				peak = Math.max(peak, active);
				await blocker.promise;
				active--;
			}),
		);

		// Release one at a time so the queue is exercised rather than drained.
		for (const blocker of blockers) {
			blocker.resolve();
			await new Promise((r) => setTimeout(r, 0));
		}
		await Promise.all(tasks);

		expect(peak).toBe(2);
	});

	it("releases the slot when a task throws", async () => {
		const gate = createGate(1);
		await expect(gate(async () => Promise.reject(new Error("boom")))).rejects.toThrow("boom");
		await expect(gate(async () => "next")).resolves.toBe("next");
	});

	it("runs queued tasks in the order they arrived", async () => {
		const gate = createGate(1);
		const order: number[] = [];
		const tasks = [1, 2, 3].map((n) =>
			gate(async () => {
				order.push(n);
			}),
		);
		await Promise.all(tasks);
		expect(order).toEqual([1, 2, 3]);
	});
});
