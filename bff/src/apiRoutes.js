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

// POST /api/chat -> forward to aiBackend /chat with Bearer token.
apiRoutes.post("/chat", requireAuth, async (req, res) => {
  try {
    const upstream = await fetch(`${config.aiBackendUrl}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${req.session.tokens.access_token}`,
      },
      body: JSON.stringify(req.body ?? {}),
    });

    const data = await upstream.json().catch(() => ({}));
    res.status(upstream.status).json(data);
  } catch (err) {
    console.error("[api] proxy error:", err.message);
    res.status(502).json({ error: "Upstream request failed." });
  }
});
