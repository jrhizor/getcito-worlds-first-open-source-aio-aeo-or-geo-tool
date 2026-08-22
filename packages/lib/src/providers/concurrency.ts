/**
 * Per-provider concurrency gate.
 *
 * The worker runs several prompt jobs at once (`localConcurrency`) and each job
 * fans out to every configured model in parallel, so in-flight calls to a
 * single vendor are jobs × models — 60 for a ten-job, six-model Olostep setup.
 * Vendors queue the excess, and that queue wait counts against our own
 * client-side timeout, so the slowest engines time out first while still being
 * billed for work whose result we discard.
 *
 * Bounding here rather than in the worker means the limit holds regardless of
 * how the job layer fans out.
 */
export function createGate(limit: number) {
	let active = 0;
	const waiting: (() => void)[] = [];

	// Hand the slot straight to the next waiter instead of decrementing and
	// letting it re-check: a decrement would briefly open a slot that a newly
	// arriving caller could take, pushing `active` past `limit`.
	const release = () => {
		const next = waiting.shift();
		if (next) next();
		else active--;
	};

	return async function gate<T>(fn: () => Promise<T>): Promise<T> {
		if (active >= limit) {
			await new Promise<void>((resolve) => waiting.push(resolve));
		} else {
			active++;
		}
		try {
			return await fn();
		} finally {
			release();
		}
	};
}
