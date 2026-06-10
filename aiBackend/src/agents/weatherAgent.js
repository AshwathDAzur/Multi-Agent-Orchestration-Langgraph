// Weather specialist — a compiled agent with the weather tool and its own persona.

import { createToolAgent } from "./createToolAgent.js";
import { weatherTools } from "../tools/weather.js";

export const weatherAgent = createToolAgent({
  systemPrompt:
    "You are a weather specialist. Use the get_weather tool to answer questions " +
    "about the weather in a city. Only answer weather questions.",
  tools: weatherTools,
});
