import { describe, expect, it } from "vitest";
import { extractJsonObject, extractWebQueries, pickSources } from "./olostep";

describe("extractJsonObject", () => {
	it("reads a bare JSON object", () => {
		expect(extractJsonObject('{"brandName":"Acme"}')).toEqual({ brandName: "Acme" });
	});

	it("reads a fenced JSON block wrapped in prose", () => {
		const answer = 'Sure, here is the data:\n\n```json\n{"brandName":"Acme","aliases":["ACME"]}\n```\n\nLet me know!';
		expect(extractJsonObject(answer)).toEqual({ brandName: "Acme", aliases: ["ACME"] });
	});

	it("ignores braces in prose around an unfenced object", () => {
		const answer = 'Here it is: {"a":{"b":1}} — hope that helps.';
		expect(extractJsonObject(answer)).toEqual({ a: { b: 1 } });
	});

	it("throws when the answer carries no object", () => {
		expect(() => extractJsonObject("I cannot help with that.")).toThrow(/No JSON object/);
	});
});

describe("pickSources", () => {
	it("skips an empty sources array in favour of a populated fallback", () => {
		const payload = { sources: [], inline_references: [{ url: "https://a.com" }] };
		expect(pickSources(payload)).toEqual([{ url: "https://a.com" }]);
	});

	it("reads Gemini's links_attached when sources is empty", () => {
		expect(pickSources({ sources: [], links_attached: ["https://b.com"] })).toEqual(["https://b.com"]);
	});

	it("prefers sources when it has entries", () => {
		const payload = { sources: [{ url: "https://a.com" }], inline_references: [{ url: "https://b.com" }] };
		expect(pickSources(payload)).toEqual([{ url: "https://a.com" }]);
	});

	it("returns an empty array when every container is empty or missing", () => {
		expect(pickSources({ sources: [], answer_markdown: "text" })).toEqual([]);
	});
});

describe("extractWebQueries", () => {
	it("reads the ChatGPT parser's nested { query } objects", () => {
		const payload = {
			network_search_calls: {
				search_queries: [
					{ query: "pulse jet bag filter India", type: "model_query" },
					{ query: "bag filter manufacturers India", type: "model_query" },
				],
			},
		};
		expect(extractWebQueries(payload)).toEqual(["pulse jet bag filter India", "bag filter manufacturers India"]);
	});

	it("reads a flat string array at the top level", () => {
		expect(extractWebQueries({ search_queries: ["a", " ", "b"] })).toEqual(["a", "b"]);
	});

	it("finds queries nested one level down under result", () => {
		expect(extractWebQueries({ result: { web_search_queries: ["a"] } })).toEqual(["a"]);
	});

	it("ignores related_queries, which are page suggestions rather than issued searches", () => {
		expect(extractWebQueries({ related_queries: ["dust collector price"] })).toEqual([]);
	});

	it("returns nothing when the parser exposes no queries", () => {
		expect(extractWebQueries({ answer_markdown: "text", sources: [{ url: "https://x.com" }] })).toEqual([]);
	});
});
