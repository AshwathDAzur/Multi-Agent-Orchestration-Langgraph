// Central model factory.
//
// Every agent/node imports `makeModel()` from here — so the model, key, and
// endpoint are configured in ONE place. Swap the provider here and the whole
// system follows. (Reuses OPENROUTER_API_KEY from .env.)

import { ChatOpenAI } from "@langchain/openai";

const DEFAULT_MODEL = "nvidia/nemotron-3-super-120b-a12b";

/**
 * Create a configured chat model pointed at OpenRouter.
 * @param {object} [opts]
 * @param {string} [opts.model] - override the model name
 * @param {number} [opts.temperature] - sampling temperature (default 0 = deterministic)
 */
export function makeModel({ model = DEFAULT_MODEL, temperature = 0 } = {}) {
  return new ChatOpenAI({
    model,
    temperature,
    apiKey: process.env.OPENROUTER_API_KEY,
    configuration: {
      baseURL: "https://openrouter.ai/api/v1",
    },
  });
}
