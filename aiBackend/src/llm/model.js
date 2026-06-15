// Central model factory.
//
// Every agent/node imports `makeModel()` from here — so the model, key, and
// endpoint are configured in ONE place. Swap the provider here and the whole
// system follows. (Reuses OPENROUTER_API_KEY from .env.)

import { ChatOpenAI } from "@langchain/openai";

const DEFAULT_MODEL = process.env.DEFAULT_MODEL;

/**
 * Create a configured chat model pointed at OpenRouter.
 * @param {object} [opts]
 * @param {string} [opts.model] - override the model name
 * @param {number} [opts.temperature] - sampling temperature (default 0 = deterministic)
 * @param {number} [opts.maxTokens] - cap on output tokens
 */
export function makeModel({ model = DEFAULT_MODEL, temperature = 0, maxTokens } = {}) {
  return new ChatOpenAI({
    model,
    temperature,
    // Cap output tokens. The model otherwise requests a huge default (65k),
    // which can exceed an OpenRouter free-tier budget and 402. Override via
    // MAX_OUTPUT_TOKENS if needed.
    maxTokens: maxTokens ?? Number(process.env.MAX_OUTPUT_TOKENS ?? 2048),
    apiKey: process.env.OPENROUTER_API_KEY,
    configuration: {
      baseURL: "https://openrouter.ai/api/v1",
    },
  });
}
