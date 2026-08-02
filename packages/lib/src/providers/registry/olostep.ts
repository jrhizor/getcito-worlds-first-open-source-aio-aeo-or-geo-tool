import Olostep from "olostep";
import type { Provider, ScrapeResult, ProviderOptions, ModelConfig } from "../types";
import type { Citation } from "../../text-extraction";
import { WEB_QUERIES_UNAVAILABLE } from "../../constants";
import { BRIGHTDATA_COUNTRIES } from "../../brightdata-locations";
import { DATAFORSEO_LOCATION_LANGUAGES } from "../../location-languages";

function getLanguageCode(languageName: string): string | undefined {
	for (const languages of Object.values(DATAFORSEO_LOCATION_LANGUAGES)) {
		const match = languages.find((l) => l.name === languageName);
		if (match) return match.code;
	}
	return undefined;
}

const OLOSTEP_PARSERS: Record<string, { parserId: string; urlTemplate: (q: string, lang?: string) => string; credits: number }> = {
	chatgpt: {
		parserId: "@olostep/chatgpt-results",
		urlTemplate: (q) => `https://chatgpt.com/?q=${encodeURIComponent(q)}`,
		credits: 5,
	},
	"google-ai-mode": {
		parserId: "@olostep/google-aimode-results",
		urlTemplate: (q, lang) => `https://google.com/aimode?q=${encodeURIComponent(q)}${lang ? `&hl=${lang}` : ''}`,
		credits: 3,
	},
	"google-ai-overview": {
		parserId: "@olostep/google-ai-overview-results",
		urlTemplate: (q, lang) => `https://www.google.com/search?q=${encodeURIComponent(q)}${lang ? `&hl=${lang}` : ''}`,
		credits: 3,
	},
	gemini: {
		parserId: "@olostep/gemini-results",
		urlTemplate: (q) => `https://gemini.google.com/?q=${encodeURIComponent(q)}`,
		credits: 3,
	},
	copilot: {
		parserId: "@olostep/microsoft-copilot-results",
		urlTemplate: (q) => `https://copilot.microsoft.com/chats?q=${encodeURIComponent(q)}`,
		credits: 3,
	},
	perplexity: {
		parserId: "@olostep/perplexity-results",
		urlTemplate: (q) => `https://www.perplexity.ai/?q=${encodeURIComponent(q)}`,
		credits: 3,
	},
	grok: {
		parserId: "@olostep/grok-results",
		urlTemplate: (q) => `https://grok.com/?q=${encodeURIComponent(q)}`,
		credits: 3,
	},
};

let _client: Olostep | null = null;
function getClient(): Olostep {
	if (!_client) {
		_client = new Olostep({ apiKey: process.env.OLOSTEP_API_KEY, retry: { maxRetries: 3, initialDelayMs: 2000 } });
	}
	return _client;
}

function extractTextFromOlostep(data: any, model: string): string {
	if (data?.result?.markdown_content) return data.result.markdown_content;
	if (data?.answer_markdown) return data.answer_markdown;
	if (data?.result?.text_content) return data.result.text_content;
	if (typeof data?.answer === "string") return data.answer;
	if (data?.result?.ai_overview) return data.result.ai_overview;
	if (data?.ai_overview) return data.ai_overview;

	if (model === "google-ai-mode" || model === "google-ai-overview") {
		return "No Google AI mode invoked.";
	}
	return "No text content found in Olostep response.";
}

function extractCitationsFromOlostep(data: any): Citation[] {
	const citations: Citation[] = [];
	const sources = data?.sources ?? data?.citations ?? data?.result?.links_on_page ?? data?.inline_references ?? [];
	let idx = 0;
	for (const source of Array.isArray(sources) ? sources : []) {
		const url = typeof source === "string" ? source : source?.url;
		if (!url || typeof url !== "string") continue;
		try {
			// Some search engines return relative URLs like "/goto?url=..." 
			// Providing a base URL prevents new URL() from throwing ERR_INVALID_URL
			const parsed = new URL(url, "https://google.com");
			citations.push({
				url,
				title: source?.title ?? source?.label ?? undefined,
				domain: parsed.hostname.replace(/^www\./, ""),
				citationIndex: idx++,
			});
		} catch (e) {
			console.warn(`Olostep: skipping invalid citation URL: ${url}`, e);
		}
	}
	return citations;
}

function extractWebQueries(data: any): string[] {
	const queries: string[] = [];

	// Batch API returns a flat string array at data.search_queries
	const flat = data?.search_queries;
	if (Array.isArray(flat)) {
		for (const q of flat) {
			if (typeof q === "string" && q.trim()) queries.push(q);
		}
	}

	// Scrape API nests queries under network_search_calls or search_model_queries
	if (queries.length === 0) {
		const searchCalls = data?.network_search_calls?.search_queries ?? data?.search_model_queries ?? [];
		for (const call of Array.isArray(searchCalls) ? searchCalls : []) {
			// May be a string (flat array) or an object with .query
			if (typeof call === "string" && call.trim()) queries.push(call);
			else if (call?.query) queries.push(call.query);
		}
	}

	return queries;
}

export const olostep: Provider = {
	id: "olostep",
	name: "Olostep",

	isConfigured() {
		return !!process.env.OLOSTEP_API_KEY;
	},

	validateTarget(config: ModelConfig) {
		if (!OLOSTEP_PARSERS[config.model]) {
			return `Olostep does not support model "${config.model}". Supported: ${Object.keys(OLOSTEP_PARSERS).join(", ")}`;
		}
		return null;
	},

	async run(model: string, prompt: string, _options?: ProviderOptions): Promise<ScrapeResult> {
		const parserConfig = OLOSTEP_PARSERS[model];
		if (!parserConfig) throw new Error(`Olostep does not support model "${model}"`);

		const defaultLanguage = _options?.targetLanguage ?? "en";
		const finalPrompt = (model !== "google-ai-mode" && model !== "google-ai-overview" && defaultLanguage !== "en")
			? `${prompt}\nPlease provide your response in ${defaultLanguage}.`
			: prompt;

		const langCode = getLanguageCode(defaultLanguage);
		const client = getClient();
		const url = parserConfig.urlTemplate(finalPrompt, langCode);

		const country = _options?.targetMarket ? BRIGHTDATA_COUNTRIES[_options.targetMarket] : undefined;

		// Use batch API — the /scrapes endpoint doesn't support all parsers
		const batch = await client.batches.create(
			[{ url, customId: "1" }],
			{
				parser: { id: parserConfig.parserId },
				...(country && { country })
			},
		);

		await Promise.race([
			batch.waitTillDone({ checkEveryNSecs: 5, timeoutSeconds: 300 }),
			new Promise((_, reject) => setTimeout(() => reject(new Error(`Olostep batch waitTillDone hard timeout for ${model}`)), 310 * 1000))
		]);

		let retrieveId: string | undefined;
		for await (const item of batch.items()) {
			retrieveId = item.retrieve_id;
			break; // single item batch
		}

		if (!retrieveId) {
			const batchStatus = await client.batches.info(batch.id) as any;
			throw new Error(`Olostep batch for ${model} completed but no items returned. Status: ${batchStatus?.status}, Error: ${batchStatus?.error}`);
		}

		// Use client.retrieve (GET) instead of item.retrieve (POST) — the
		// SDK's BatchItem.retrieve uses POST which the API rejects with 403.
		const retrieved = await client.retrieve(retrieveId, ["json" as any]);

		const jsonContent = retrieved.json_content;
		const parsed =
			typeof jsonContent === "string" ? JSON.parse(jsonContent) : (jsonContent ?? retrieved);

		const webQueries = extractWebQueries(parsed);
		const citations = extractCitationsFromOlostep(parsed);

		return {
			// Store the parsed content directly instead of the full retrieved
			// wrapper (which double-encodes json_content as a string).
			rawOutput: parsed,
			textContent: extractTextFromOlostep(parsed, model),
			// Mark as "unavailable" only when citations prove a search happened
			// but the API didn't expose the query strings
			webQueries: webQueries.length > 0 ? webQueries : citations.length > 0 ? [WEB_QUERIES_UNAVAILABLE] : [],
			citations,
			modelVersion: parsed?.model ?? undefined,
		};
	},
};
