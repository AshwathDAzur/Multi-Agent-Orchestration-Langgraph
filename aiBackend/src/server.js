// HTTP layer — exposes the multi-agent supervisor over a REST endpoint.
//
//   POST /chat   { "prompt": "What's 12 times 8?" }   ->   { "answer": "..." }
//
// The handler validates the payload, invokes the supervisor graph via the
// shared service, and returns the final answer. Run with:  npm start

import express from "express";
import { runSupervisor } from "./service.js";
import { tracingTarget } from "./observability.js";

const app = express();
const PORT = process.env.PORT || 2424;

// Parse JSON request bodies.
app.use(express.json());

// Health check — handy for container/orchestrator probes.
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Main endpoint: send a prompt, get the agent's answer.
app.post("/chat", async (req, res) => {
  const { prompt } = req.body ?? {};

  // Validate input.
  if (typeof prompt !== "string" || prompt.trim() === "") {
    return res
      .status(400)
      .json({ error: "Body must include a non-empty string field 'prompt'." });
  }

  try {
    const { answer } = await runSupervisor(prompt);
    return res.json({ answer });
  } catch (err) {
    // Don't leak internals to the client; log the detail server-side.
    console.error("Error handling /chat:", err);
    return res
      .status(500)
      .json({ error: "Failed to process the request." });
  }
});

app.listen(PORT, () => {
  console.log(`Multi-agent server listening on http://localhost:${PORT}`);
  console.log(`Observability: ${tracingTarget()} (APP_ENV=${process.env.APP_ENV || "development"})`);
  console.log(`Try: POST http://localhost:${PORT}/chat  { "prompt": "What's 12 times 8?" }`);
});
