/**
 * Brand locale hint shared by the direct-LLM providers.
 *
 * A brand's target market/language lives on the brand row and is forwarded by
 * the worker on every run (`ProviderOptions.targetMarket` / `targetLanguage`,
 * see apps/worker/src/jobs/process-prompt.ts). Scraper providers hand it to the
 * upstream API natively — DataForSEO sets `location_name` / `language_name` —
 * but chat-completion endpoints have no such field, so the only lever is a
 * system message. Providers that skip this silently run every brand in the
 * model's default locale.
 *
 * Returns undefined when the brand set neither value, so a brand that never
 * picked a market keeps the model's own default instead of being pinned to one.
 */
import { BRIGHTDATA_COUNTRIES } from "../brightdata-locations";
import type { ProviderOptions } from "./types";

export function localeSystemPrompt(options?: ProviderOptions): string | undefined {
	const parts: string[] = [];
	if (options?.targetLanguage) parts.push(`Please provide your response in language: ${options.targetLanguage}.`);
	if (options?.targetMarket) parts.push(`Assume the user's location is: ${options.targetMarket}.`);
	return parts.length > 0 ? parts.join(" ") : undefined;
}

/**
 * The same hint as an OpenAI-style `messages` prefix — spread into the array so
 * it disappears entirely when the brand has no locale set.
 */
export function localeSystemMessages(options?: ProviderOptions): Array<{ role: "system"; content: string }> {
	const content = localeSystemPrompt(options);
	return content ? [{ role: "system", content }] : [];
}

/**
 * The brand's target market as an ISO-3166-1 alpha-2 code, for the *search
 * tools* rather than the prompt.
 *
 * A system message steers what the model writes; it does not move where the
 * model searches from. OpenAI's and Anthropic's web-search tools localize
 * results by the caller's IP unless given an approximate user location — which
 * is why a worker hosted in India returns city-level local results no matter
 * what the prompt says. Reuses the country table the BrightData provider
 * already ships (every UI location in locations.ts has an entry).
 *
 * Returns undefined for an unset or unrecognized market, so the tool keeps its
 * default behaviour rather than being sent a bogus code.
 */
export function localeCountryCode(options?: ProviderOptions): string | undefined {
	if (!options?.targetMarket) return undefined;
	return BRIGHTDATA_COUNTRIES[options.targetMarket]?.toUpperCase();
}
