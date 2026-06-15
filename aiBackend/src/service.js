// Shared service layer between the graph and any caller (HTTP, etc.).
//
// Supports human-in-the-loop: a write tool calls interrupt(), which pauses the
// run. We detect that, return an "awaiting_approval" payload (with a threadId),
// and the caller later resumes via resumeSupervisor() with the human decision.

import { HumanMessage } from "@langchain/core/messages";
import { Command } from "@langchain/langgraph";
import { supervisor } from "./graph/supervisorGraph.js";
import { getCallbacks } from "./observability.js";

// Build the per-request config: thread_id keys the checkpointer; callbacks for tracing.
function makeConfig(threadId) {
  return {
    configurable: { thread_id: threadId },
    recursionLimit: 12,
    callbacks: getCallbacks(),
  };
}

// Extract the final text answer from the message list.
function finalAnswer(messages) {
  return (
    [...messages].reverse().find((m) => m.text?.trim())?.text?.trim() ?? ""
  );
}

// Normalize a graph result into either an "answer" or an "awaiting_approval".
function toResponse(result) {
  // An interrupt surfaces under __interrupt__ (array of pending interrupts).
  const interrupts = result.__interrupt__;
  if (Array.isArray(interrupts) && interrupts.length > 0) {
    const payload = interrupts[0].value; // what the tool passed to interrupt()
    return { status: "awaiting_approval", approval: payload };
  }
  return { status: "completed", answer: finalAnswer(result.messages ?? []) };
}

/**
 * Start a run for a prompt. Returns either a completed answer or an approval
 * request. `threadId` ties this conversation to the checkpointer.
 */
export async function runSupervisor(prompt, threadId) {
  const result = await supervisor.invoke(
    { messages: [new HumanMessage(prompt)] },
    makeConfig(threadId)
  );
  return { ...toResponse(result), threadId };
}

/**
 * Resume a paused run with the human's decision.
 * @param {string} threadId - the thread that was paused
 * @param {object} decision - e.g. { approved: true, approver, reason }
 */
export async function resumeSupervisor(threadId, decision) {
  const result = await supervisor.invoke(
    new Command({ resume: decision }),
    makeConfig(threadId)
  );
  return { ...toResponse(result), threadId };
}
