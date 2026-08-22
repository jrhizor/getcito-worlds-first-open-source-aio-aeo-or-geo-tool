import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
	const deleteWhere = vi.fn();
	const selectWhere = vi.fn();
	const updateWhere = vi.fn();
	const from = vi.fn(() => ({ where: selectWhere }));
	const set = vi.fn(() => ({ where: updateWhere }));
	const tx = {
		delete: vi.fn(() => ({ where: deleteWhere })),
		select: vi.fn(() => ({ from })),
		update: vi.fn(() => ({ set })),
	};
	return {
		deleteWhere,
		selectWhere,
		set,
		transaction: vi.fn(async (callback: (transaction: typeof tx) => Promise<void>) => callback(tx)),
		tx,
		updateWhere,
	};
});

vi.mock("./db", () => ({ db: { transaction: mocks.transaction } }));

import { revokeUserAccess, syncMemberships } from "./auth-sync";

describe("revokeUserAccess", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("deletes every membership and clears privileged flags", async () => {
		await revokeUserAccess("user-1");

		expect(mocks.tx.delete).toHaveBeenCalledOnce();
		expect(mocks.deleteWhere).toHaveBeenCalledOnce();
		expect(mocks.set).toHaveBeenCalledWith({ role: "user", hasReportGeneratorAccess: false });
		expect(mocks.updateWhere).toHaveBeenCalledOnce();
	});

	it("keeps memberships that are absent from a regular external sync", async () => {
		mocks.selectWhere.mockResolvedValueOnce([{ id: "membership-1", organizationId: "local-org" }]);

		await syncMemberships("user-1", []);

		expect(mocks.tx.delete).not.toHaveBeenCalled();
	});
});
