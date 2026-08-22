export interface ModelMeta {
	label: string;
	iconId: string;
	/** Per-model chart color override. Falls back to the provider-family color
	 *  (see `getModelColor`) when unset. Set it when two models share a
	 *  provider icon (e.g. Claude Opus vs Sonnet) so they don't collide. */
	color?: string;
}

export const KNOWN_MODELS: Record<string, ModelMeta> = {
	chatgpt: { label: "ChatGPT", iconId: "openai" },
	claude: { label: "Claude", iconId: "anthropic" },
	"claude-opus": { label: "Claude Opus", iconId: "anthropic", color: "#f59e0b" },
	"claude-sonnet": { label: "Claude Sonnet", iconId: "anthropic", color: "#ea580c" },
	"google-ai-mode": { label: "Google AI Mode", iconId: "google" },
	"google-ai-overview": { label: "Google AI Overview", iconId: "google" },
	gemini: { label: "Gemini", iconId: "google" },
	copilot: { label: "Copilot", iconId: "microsoft" },
	perplexity: { label: "Perplexity", iconId: "perplexity" },
	grok: { label: "Grok", iconId: "x" },
	mistral: { label: "Mistral", iconId: "mistral" },
	deepseek: { label: "DeepSeek", iconId: "generic" },
};

export function getModelMeta(model: string): ModelMeta {
	if (KNOWN_MODELS[model]) return KNOWN_MODELS[model];
	const label = model
		.split("-")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
	return { label, iconId: "generic" };
}
