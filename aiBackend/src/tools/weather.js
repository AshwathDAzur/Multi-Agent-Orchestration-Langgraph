// Weather tool — a stand-in for a real data source (e.g. a gateway API call).
// Returns a canned answer so the demo runs without external dependencies.

import { tool } from "@langchain/core/tools";
import * as z from "zod";

export const getWeather = tool(
  ({ city }) => `It's always sunny in ${city}!`,
  {
    name: "get_weather",
    description: "Get the current weather for a given city",
    schema: z.object({
      city: z.string().describe("The city to get the weather for"),
    }),
  }
);

export const weatherTools = [getWeather];
