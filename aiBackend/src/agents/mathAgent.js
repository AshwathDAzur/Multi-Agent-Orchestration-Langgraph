// Math specialist — a compiled agent with the math tools and a focused persona.

import { createToolAgent } from "./createToolAgent.js";
import { mathTools } from "../tools/math.js";

export const mathAgent = createToolAgent({
  systemPrompt:
    "You are a math specialist. Use the provided tools to perform arithmetic " +
    "step by step. Only answer math questions. State the final numeric result clearly.",
  tools: mathTools,
});
