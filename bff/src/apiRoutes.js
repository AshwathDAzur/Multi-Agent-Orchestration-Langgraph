// Protected API routes — the BFF forwards authenticated calls to aiBackend.
//
// The browser hits /api/chat with its session cookie. The BFF:
//   1. checks the session (must be logged in),
//   2. attaches the Keycloak access token as a Bearer header,
//   3. forwards to the internal aiBackend and relays the response.
//
// aiBackend is NOT exposed publicly — only the BFF can reach it.

import { Router } from "express";
import { config } from "./config.js";

export const apiRoutes = Router();

// Guard: require a logged-in session.
function requireAuth(req, res, next) {
  if (!req.session?.user || !req.session?.tokens?.access_token) {
    return res.status(401).json({ error: "Not authenticated." });
  }
  next();
}

// Forward a request body to an aiBackend path, relaying status + JSON.
async function forward(path, body, res) {
  try {
    const upstream = await fetch(`${config.aiBackendUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
    const data = await upstream.json().catch(() => ({}));
    res.status(upstream.status).json(data);
  } catch (err) {
    console.error(`[api] proxy error ${path}:`, err.message);
    res.status(502).json({ error: "Upstream request failed." });
  }
}

// POST /api/chat -> start a run (may return awaiting_approval).
apiRoutes.post("/chat", requireAuth, (req, res) => {
  forward("/chat", req.body, res);
});

// POST /api/chat/resume -> resume a paused run with the human decision.
// The approver is taken from the SESSION (the authenticated user), never the
// client body — so the audit trail records who really approved it.
apiRoutes.post("/chat/resume", requireAuth, (req, res) => {
  const { threadId, approved, reason } = req.body ?? {};
  const approver =
    req.session.user.email || req.session.user.username || req.session.user.sub;
  forward("/chat/resume", { threadId, approved, reason, approver }, res);
});
