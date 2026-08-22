import { describe, expect, it } from "vitest";
import { BRIGHTDATA_COUNTRIES } from "./brightdata-locations";
import { DATAFORSEO_LOCATIONS, isDataforseoLocation, TARGET_MARKETS } from "./locations";

describe("TARGET_MARKETS", () => {
	it("resolves every market to a BrightData country code", () => {
		const unresolved = TARGET_MARKETS.filter((market) => !BRIGHTDATA_COUNTRIES[market]);
		expect(unresolved).toEqual([]);
	});

	it("lists each country once, preferring the short spelling", () => {
		const codes = TARGET_MARKETS.map((market) => BRIGHTDATA_COUNTRIES[market]);
		expect(new Set(codes).size).toBe(codes.length);
		expect(TARGET_MARKETS).toContain("Moldova");
		expect(TARGET_MARKETS).not.toContain("Moldova, Republic of");
	});

	it("still covers every DataForSEO location", () => {
		const codes = new Set(TARGET_MARKETS.map((market) => BRIGHTDATA_COUNTRIES[market]));
		const uncovered = DATAFORSEO_LOCATIONS.filter((location) => !codes.has(BRIGHTDATA_COUNTRIES[location]));
		expect(uncovered).toEqual([]);
	});

	it("flags markets DataForSEO cannot take as a location_name", () => {
		expect(isDataforseoLocation("India")).toBe(true);
		expect(isDataforseoLocation("Fiji")).toBe(false);
	});
});
