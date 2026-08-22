import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
	useRouteContext: () => ({ clientConfig: { mode: "whitelabel" } }),
}));

import { NavAppInfo } from "./nav-app-info";

describe("NavAppInfo", () => {
	it("shows release and project links in whitelabel mode", () => {
		const html = renderToStaticMarkup(<NavAppInfo />);

		expect(html).toContain(`v${__APP_VERSION__}`);
		expect(html).toContain("https://www.Getcito.com/");
		expect(html).toContain("https://github.com/ai-search-guru/getcito-worlds-first-open-source-aio-aeo-or-geo-tool");
	});
});
