// The nodes of the supervisor graph.
//
//  - supervisorNode: an LLM that DECIDES who should act and writes the route
//    into state. Uses structured output so the routing decision is always a
//    valid value (no fragile free-text parsing).
//  - mathNode / weatherNode: each INVOKES a full specialist agent. This is the
//    key idea — a node can run a whole other compiled graph (graph-in-graph).

import { SystemMessage, AIMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import * as z from "zod";

import { makeModel } from "../llm/model.js";
import { mathAgent } from "../agents/mathAgent.js";
import { weatherAgent } from "../agents/weatherAgent.js";
import { dataAccessAgent } from "../agents/dataAccessAgent.js";

// The supervisor routes by CALLING a `route` tool. Forcing a tool call
// (tool_choice: "required") guarantees a structured, valid decision — this is
// more reliable across models than free-text or JSON-mode structured output.
const routeTool = tool(({ next }) => next, {
  name: "route",
  description:
    "Select which specialist should handle the request next, or 'done' if the " +
    "request has already been fully answered.",
  schema: z.object({
    next: z
      .enum(["math", "weather", "data", "done"])
      .describe(
        "'math' for arithmetic/calculations, 'weather' for weather questions, " +
          "'data' for questions about EPC users/employees, roles, or " +
          "permissions, 'done' when the latest specialist has already answered " +
          "or no specialist is needed."
      ),
  }),
});

const SUPERVISOR_PROMPT =
  "You are a supervisor routing a user request to the right specialist.\n" +
  "- Route to 'math' for any arithmetic/calculation request.\n" +
  "- Route to 'weather' for any weather request.\n" +
  "- Route to 'data' for any question about EPC users/employees, roles, " +
  "permissions, departments, disciplines, project assignments, or access " +
  "control.\n" +
  "- Route to 'done' when the user's request has been fully answered, or no " +
  "specialist is needed.\n" +
  "IMPORTANT: a specialist answers the request COMPLETELY in one turn " +
  "(including multi-step work). If a specialist has already run for this " +
  "request, route to 'done' — do NOT route to the same specialist again.\n" +
  "Always call the route tool.";

const supervisorModel = makeModel().bindTools([routeTool], {
  tool_choice: "required",
});

// Supervisor: classify -> write `next` to state.
export const supervisorNode = async (state) => {
  const visited = state.visited ?? [];

  // Tell the model what's already been done this turn so it doesn't re-route.
  const context =
    visited.length > 0
      ? new SystemMessage(
          `Specialists that have ALREADY answered this request: ${visited.join(
            ", "
          )}. Unless the user clearly asked for something a DIFFERENT specialist must still handle, route to 'done'.`
        )
      : null;

  const response = await supervisorModel.invoke(
    [
      new SystemMessage(SUPERVISOR_PROMPT),
      ...state.messages,
      ...(context ? [context] : []),
    ]
  );

  // Forced tool call → read the chosen route from the tool call args.
  let choice = response.tool_calls?.[0]?.args?.next ?? "done";

  // Deterministic guard: never route to a specialist that already ran this
  // turn. This makes loop-prevention robust even if the model ignores the hint.
  if (choice !== "done" && visited.includes(choice)) {
    choice = "done";
  }

  return { next: choice };
};

// Helper: run a specialist agent, record that it ran, and merge ONLY its
// newly-produced messages back into the shared state. The parent `config` is
// threaded through so that an interrupt() inside the specialist subgraph
// propagates up and pauses the whole run (HITL approval).
async function runSpecialist(name, agent, state, config) {
  const before = state.messages.length;
  const result = await agent.invoke({ messages: state.messages }, config);
  const newMessages = result.messages.slice(before);
  return { messages: newMessages, visited: [name] };
}

// Specialist nodes — each invokes its full agent and records its name.
// (config is the 2nd arg LangGraph passes to node functions.)
export const mathNode = async (state, config) =>
  runSpecialist("math", mathAgent, state, config);
export const weatherNode = async (state, config) =>
  runSpecialist("weather", weatherAgent, state, config);
export const dataAccessNode = async (state, config) =>
  runSpecialist("data", dataAccessAgent, state, config);
