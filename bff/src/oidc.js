// OIDC client setup — discovers the Keycloak realm and builds a client.
//
// Keycloak may not be ready the instant the BFF boots, so discovery retries.

import { Issuer } from "openid-client";
import { config, REDIRECT_URI } from "./config.js";

let client = null;

async function discoverWithRetry(retries = 30, delayMs = 3000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Discover via the INTERNAL url (the BFF can actually reach this host).
      const issuer = await Issuer.discover(config.keycloak.internalUrl);
      return issuer;
    } catch (err) {
      console.log(
        `[oidc] Keycloak not ready (attempt ${attempt}/${retries}): ${err.message}`
      );
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

export async function initOidc() {
  const discovered = await discoverWithRetry();
  const m = discovered.metadata;

  // Keycloak advertises browser-facing URLs (localhost:8081) for every
  // endpoint. The browser needs those for the authorization redirect, but the
  // BFF's BACKCHANNEL calls (token, userinfo, jwks) must use the INTERNAL host.
  // So we build the Issuer with:
  //   - issuer + authorization_endpoint = PUBLIC (browser-facing)
  //   - token/userinfo/jwks/end_session = INTERNAL (BFF-reachable)
  const pub = config.keycloak.issuer; // http://localhost:8081/realms/aichat
  const intl = config.keycloak.internalUrl; // http://host.docker.internal:8081/realms/aichat
  const toInternal = (url) =>
    typeof url === "string" ? url.replace(pub, intl) : url;

  const issuer = new Issuer({
    ...m,
    issuer: pub, // must match the token's `iss` claim
    authorization_endpoint: m.authorization_endpoint, // browser uses this (public)
    token_endpoint: toInternal(m.token_endpoint),
    userinfo_endpoint: toInternal(m.userinfo_endpoint),
    jwks_uri: toInternal(m.jwks_uri),
    end_session_endpoint: m.end_session_endpoint, // browser uses this (public)
    revocation_endpoint: toInternal(m.revocation_endpoint),
    introspection_endpoint: toInternal(m.introspection_endpoint),
  });

  client = new issuer.Client({
    client_id: config.keycloak.clientId,
    client_secret: config.keycloak.clientSecret,
    redirect_uris: [REDIRECT_URI],
    response_types: ["code"],
  });
  console.log("[oidc] Keycloak client initialized.");
  console.log(`[oidc] issuer=${pub}`);
  console.log(`[oidc] token_endpoint(internal)=${toInternal(m.token_endpoint)}`);
  return client;
}

export function getClient() {
  if (!client) throw new Error("OIDC client not initialized yet.");
  return client;
}
