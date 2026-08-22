/**
 * Server-only brand cascade delete, shared by the user-facing and admin delete
 * paths.
 *
 * This lives in its own module — rather than being exported from
 * `server/brands.ts` — on purpose. A server fn file's `.handler` bodies (and the
 * imports only they use) get tree-shaken out of the client bundle. Exporting a
 * plain function from such a file defeats that: the bundler must keep it, which
 * drags `db` → pg → `Buffer` into every client chunk that imports anything from
 * `server/brands.ts` ("Buffer is not defined"). Same failure as issue #68; see
 * `server/prompt-resolution.ts` for the original.
 */
import { db } from "@workspace/lib/db/db";
import {
	brandOpportunities,
	brands,
	citations,
	competitors,
	organization,
	promptRuns,
	prompts,
} from "@workspace/lib/db/schema";
import { eq } from "drizzle-orm";
import { removeBrandJobSchedulers } from "@/lib/job-scheduler";

/**
 * Delete a brand and everything hanging off it, children first.
 *
 * Shared with the admin panel's delete action, which gates on admin rather
 * than org membership — an admin is usually not a member of the org they are
 * deleting, so it cannot reuse `deleteBrandFn`. The cascade itself must not be
 * duplicated: a table added here has to be removed on both paths or the delete
 * starts failing on a foreign key.
 */
export async function deleteBrandCascade(brandId: string) {
	// Queued jobs outlive the rows they point at, so drop them first — a job that
	// starts between the prompt delete and this call would run scrapes against a
	// brand that no longer exists and bill us for the answers.
	const brandPrompts = await db.select({ id: prompts.id }).from(prompts).where(eq(prompts.brandId, brandId));
	await removeBrandJobSchedulers(brandPrompts.map((p) => p.id));

	await db.transaction(async (tx) => {
		await tx.delete(citations).where(eq(citations.brandId, brandId));
		await tx.delete(promptRuns).where(eq(promptRuns.brandId, brandId));
		await tx.delete(prompts).where(eq(prompts.brandId, brandId));
		await tx.delete(competitors).where(eq(competitors.brandId, brandId));
		await tx.delete(brandOpportunities).where(eq(brandOpportunities.brandId, brandId));
		await tx.delete(brands).where(eq(brands.id, brandId));
		// The brand's id doubles as its organization id.
		await tx.delete(organization).where(eq(organization.id, brandId));
	});
}
