// Reusable specialist factory.
//
// Every specialist is the SAME brain<->tool loop you built by hand in the
// langGraph project: START -> llmCall <-> toolNode -> END. Rather than copy that
// loop into each specialist, we build it once here and parameterize it with a
// system prompt + a set of tools. Each specialist file just calls this.

import {
  StateSchema,
  MessagesValue,
  StateGraph,
  START,
  END,
} from "@langchain/langgraph";
import { SystemMessage, AIMessage } from "@langchain/core/messages";
import { makeModel } from "../llm/model.js";

/**
 * Build a compiled tool-using agent (its own StateGraph).
 * @param {object} cfg
 * @param {string} cfg.systemPrompt - the specialist's persona / instructions
 * @param {Array} cfg.tools - the tools this specialist may call
 * @returns a compiled graph you can `.invoke({ messages })`
 */
export function createToolAgent({ systemPrompt, tools }) {
  const toolsByName = Object.fromEntries(tools.map((t) => [t.name, t]));
  const model = makeModel().bindTools(tools);

  // Each specialist tracks only its own message history.
  const State = new StateSchema({ messages: MessagesValue });

  // The "brain": prepend the persona, send the conversation to the model.
  const llmCall = async (state) => ({
    messages: [
      await model.invoke([new SystemMessage(systemPrompt), ...state.messages]),
    ],
  });

  // The "hands": run whatever tools the model requested.
  const toolNode = async (state) => {
    const lastMessage = state.messages.at(-1);
    if (lastMessage == null || !AIMessage.isInstance(lastMessage)) {
      return { messages: [] };
    }

    const result = [];
    for (const toolCall of lastMessage.tool_calls ?? []) {
      const selectedTool = toolsByName[toolCall.name];
      const observation = await selectedTool.invoke(toolCall);
      result.push(observation);
    }
    return { messages: result };
  };

  // Loop back to the brain if a tool was called; otherwise we're done.
  const shouldContinue = (state) => {
    const lastMessage = state.messages.at(-1);
    if (!lastMessage || !AIMessage.isInstance(lastMessage)) return END;
    if (lastMessage.tool_calls?.length) return "toolNode";
    return END;
  };

  return new StateGraph(State)
    .addNode("llmCall", llmCall)
    .addNode("toolNode", toolNode)
    .addEdge(START, "llmCall")
    .addConditionalEdges("llmCall", shouldContinue, ["toolNode", END])
    .addEdge("toolNode", "llmCall")
    .compile();
}
