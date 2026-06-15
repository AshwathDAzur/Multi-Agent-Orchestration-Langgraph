// Same-origin paths — everything goes through nginx to the BFF.
// (No host/port: the browser talks only to the public origin.)
export const API_CHAT = "/api/chat";
export const API_CHAT_RESUME = "/api/chat/resume";
export const AUTH_ME = "/auth/me";
export const AUTH_LOGIN = "/auth/login";
export const AUTH_LOGOUT = "/auth/logout";
