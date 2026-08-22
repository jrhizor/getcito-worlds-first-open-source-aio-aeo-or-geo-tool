/**
 * pg-boss's own fetch order, reproduced so the admin queue page can show a
 * position number.
 *
 * pg-boss selects with `ORDER BY priority DESC, created_on, id` over jobs whose
 * `start_after` has passed (see `pg-boss/dist/plans.js`). There is no API that
 * returns a job's position, and a position only means anything relative to every
 * other waiting job, so the sort is duplicated here rather than queried.
 *
 * Getting the direction wrong would be invisible - the page would still render a
 * plausible list - which is why this lives on its own with a test.
 */
export interface OrderableJob {
	jobId: string;
	priority: number;
	createdOn: string | null;
}

export function compareQueueOrder(a: OrderableJob, b: OrderableJob): number {
	return (
		b.priority - a.priority || (a.createdOn ?? "").localeCompare(b.createdOn ?? "") || a.jobId.localeCompare(b.jobId)
	);
}
