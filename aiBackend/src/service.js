// Shared service layer between the graph and any caller (CLI, HTTP, etc.).
//
// Keeps graph-invocation details in ONE place so the Express handler and the
// demo script don't duplicate logic.

import { HumanMessage } from "@langchain/core/messages";
import { supervisor } from "./graph/supervisorGraph.js";
import { getCallbacks } from "./observability.js";

/**
 * Run the supervisor graph for a single user prompt.
 * @param {string} prompt - the user's message
 * @returns {Promise<{ answer: string, messages: Array }>}
 *   answer  = the final assistant reply (clean, for the UI)
 *   messages = the full trace (handy for debugging)
 */
export async function runSupervisor(prompt) {
  const result = await supervisor.invoke(
    { messages: [new HumanMessage(prompt)] },
    {
      recursionLimit: 12, // guard against an unbounded supervisor loop
      callbacks: getCallbacks(), // dev -> Langfuse, prod -> [] (LangSmith via env)
    }
  );

  // The final answer is the last message that actually has text content
  // (skip empty assistant messages that only carried a tool call).
  const answer =
    [...result.messages].reverse().find((m) => m.text?.trim())?.text?.trim() ??
    "";

  return { answer, messages: result.messages };
}
