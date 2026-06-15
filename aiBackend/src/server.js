// HTTP layer — exposes the multi-agent supervisor over a REST endpoint.
//
//   POST /chat   { "prompt": "What's 12 times 8?" }   ->   { "answer": "..." }
//
// The handler validates the payload, invokes the supervisor graph via the
// shared service, and returns the final answer. Run with:  npm start

import express from "express";
import cors from "cors";
import { randomUUID } from "node:crypto";
import { runSupervisor, resumeSupervisor } from "./service.js";
import { tracingTarget } from "./observability.js";

const app = express();
const PORT = process.env.PORT || 2424;

// Allow the browser-based UI (different origin) to call this API.
app.use(cors());

// Parse JSON request bodies.
app.use(express.json());

// Health check — handy for container/orchestrator probes.
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Main endpoint: send a prompt. Returns either a completed answer OR an
// approval request (status: "awaiting_approval") with a threadId to resume.
app.post("/chat", async (req, res) => {
  const { prompt } = req.body ?? {};

  // Validate input.
  if (typeof prompt !== "string" || prompt.trim() === "") {
    return res
      .status(400)
      .json({ error: "Body must include a non-empty string field 'prompt'." });
  }

  try {
    const threadId = randomUUID();
    const result = await runSupervisor(prompt, threadId);
    return res.json(result); // { status, answer? , approval?, threadId }
  } catch (err) {
    console.error("Error handling /chat:", err);
    const { status, error, detail } = classifyError(err);
    return res.status(status).json({ error, detail });
  }
});

// Resume a paused run with the human's decision.
//   { threadId, approved: true|false, approver?, reason? }
app.post("/chat/resume", async (req, res) => {
  const { threadId, approved, approver, reason } = req.body ?? {};

  if (typeof threadId !== "string" || threadId.trim() === "") {
    return res.status(400).json({ error: "Body must include 'threadId'." });
  }
  if (typeof approved !== "boolean") {
    return res.status(400).json({ error: "Body must include boolean 'approved'." });
  }

  try {
    const result = await resumeSupervisor(threadId, { approved, approver, reason });
    return res.json(result);
  } catch (err) {
    console.error("Error handling /chat/resume:", err);
    const { status, error, detail } = classifyError(err);
    return res.status(status).json({ error, detail });
  }
});

// Map internal errors to a clear client message (no stack traces leaked).
function classifyError(err) {
  const msg = String(err?.message || err || "");

  // Tool input failed schema validation (e.g. model passed a string for a number).
  if (/did not match expected schema|Invalid input|Received tool input/i.test(msg)) {
    return {
      status: 422,
      error: "The assistant produced an invalid tool input.",
      detail:
        "A tool was called with arguments that didn't match its expected types. " +
        "This usually happens on questions that need capabilities the current " +
        "tools don't support (e.g. algebra/word problems vs. plain arithmetic).",
    };
  }

  // Graph looped without terminating.
  if (/recursion limit/i.test(msg)) {
    return {
      status: 500,
      error: "The assistant could not converge on an answer.",
      detail: "The agent graph hit its step limit without finishing.",
    };
  }

  // Upstream model / network problems.
  if (/fetch failed|ECONNREFUSED|ETIMEDOUT|timeout|429|rate limit/i.test(msg)) {
    return {
      status: 502,
      error: "The model provider is unavailable or rate-limited.",
      detail: "The request to the LLM failed. Please retry shortly.",
    };
  }

  // Fallback — still surface the message instead of a generic string.
  return {
    status: 500,
    error: "The assistant failed to process the request.",
    detail: msg.slice(0, 300),
  };
}

app.listen(PORT, () => {
  console.log(`Multi-agent server listening on http://localhost:${PORT}`);
  console.log(`Observability: ${tracingTarget()} (APP_ENV=${process.env.APP_ENV || "development"})`);
  console.log(`Try: POST http://localhost:${PORT}/chat  { "prompt": "What's 12 times 8?" }`);
});
