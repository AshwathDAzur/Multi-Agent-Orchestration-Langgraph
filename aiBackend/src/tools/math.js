// Math tools — pure functions the math specialist can call.
// Kept separate from agents so they can be reused/tested independently.

import { tool } from "@langchain/core/tools";
import * as z from "zod";

export const add = tool(({ a, b }) => a + b, {
  name: "add",
  description: "Add two numbers",
  schema: z.object({
    a: z.number().describe("First number"),
    b: z.number().describe("Second number"),
  }),
});

export const multiply = tool(({ a, b }) => a * b, {
  name: "multiply",
  description: "Multiply two numbers",
  schema: z.object({
    a: z.number().describe("First number"),
    b: z.number().describe("Second number"),
  }),
});

export const divide = tool(({ a, b }) => a / b, {
  name: "divide",
  description: "Divide the first number by the second",
  schema: z.object({
    a: z.number().describe("Numerator"),
    b: z.number().describe("Denominator"),
  }),
});

export const mathTools = [add, multiply, divide];
