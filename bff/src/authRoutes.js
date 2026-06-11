// Auth routes — OIDC Authorization Code flow with PKCE.
//
//   GET /auth/login    -> redirect to Keycloak
//   GET /auth/callback -> exchange code, store tokens in server session
//   GET /auth/logout   -> clear session + Keycloak logout
//   GET /auth/me       -> who am I (for the frontend auth guard)
//
// Tokens live ONLY in the server-side session (Redis). The browser holds just
// an opaque HttpOnly session cookie — never a token. This is the BFF pattern.

import { Router } from "express";
import { generators } from "openid-client";
import { getClient } from "./oidc.js";
import { REDIRECT_URI, POST_LOGIN, POST_LOGOUT } from "./config.js";

export const authRoutes = Router();

// Kick off login.
authRoutes.get("/login", (req, res) => {
  const client = getClient();

  // PKCE + state/nonce for CSRF protection.
  const code_verifier = generators.codeVerifier();
  const code_challenge = generators.codeChallenge(code_verifier);
  const state = generators.state();
  const nonce = generators.nonce();

  // stash transient values in the session until the callback returns
  req.session.pkce = { code_verifier, state, nonce };

  const url = client.authorizationUrl({
    scope: "openid profile email",
    code_challenge,
    code_challenge_method: "S256",
    state,
    nonce,
  });
  res.redirect(url);
});

// Handle the redirect back from Keycloak.
authRoutes.get("/callback", async (req, res) => {
  const client = getClient();
  const pkce = req.session.pkce;
  if (!pkce) return res.redirect("/auth/login");

  try {
    const params = client.callbackParams(req);
    const tokenSet = await client.callback(REDIRECT_URI, params, {
      code_verifier: pkce.code_verifier,
      state: pkce.state,
      nonce: pkce.nonce,
    });

    const claims = tokenSet.claims();

    // Store tokens + user server-side; clear the transient pkce.
    req.session.tokens = {
      access_token: tokenSet.access_token,
      refresh_token: tokenSet.refresh_token,
      id_token: tokenSet.id_token,
      expires_at: tokenSet.expires_at,
    };
    req.session.user = {
      sub: claims.sub,
      name: claims.name || claims.preferred_username,
      email: claims.email,
      username: claims.preferred_username,
    };
    delete req.session.pkce;

    res.redirect(POST_LOGIN);
  } catch (err) {
    console.error("[auth] callback error:", err.message || err.name);
    res.redirect("/?auth_error=1");
  }
});

// Logout — clear session and redirect through Keycloak end-session.
authRoutes.get("/logout", (req, res) => {
  const client = getClient();
  const idToken = req.session.tokens?.id_token;

  req.session.destroy(() => {
    res.clearCookie("sid");
    if (idToken) {
      const endSession = client.endSessionUrl({
        id_token_hint: idToken,
        post_logout_redirect_uri: POST_LOGOUT,
      });
      return res.redirect(endSession);
    }
    res.redirect(POST_LOGOUT);
  });
});

// Current user — frontend calls this to know if logged in.
authRoutes.get("/me", (req, res) => {
  if (req.session.user) {
    return res.json({ authenticated: true, user: req.session.user });
  }
  res.status(401).json({ authenticated: false });
});
