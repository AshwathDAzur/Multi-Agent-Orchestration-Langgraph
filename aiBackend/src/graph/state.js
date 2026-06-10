// Shared state for the supervisor graph — the "whiteboard" every node reads
// and writes. Inter-agent communication happens THROUGH this object, not via
// direct calls between agents.

import { StateSchema, MessagesValue, ReducedValue } from "@langchain/langgraph";
import * as z from "zod";

export const SupervisorState = new StateSchema({
  // The conversation. MessagesValue's reducer APPENDS new messages.
  messages: MessagesValue,

  // The supervisor's routing decision: "math" | "weather" | "done".
  // Reducer overwrites — we only care about the latest decision.
  next: new ReducedValue(z.string().default(""), {
    reducer: (_prev, next) => next,
  }),

  // Which specialists have already run during this request. The reducer
  // accumulates them, so the supervisor can see "math already answered" and
  // avoid re-routing in a loop. Specialist nodes append their own name.
  visited: new ReducedValue(z.array(z.string()).default(() => []), {
    reducer: (prev, next) => [...prev, ...next],
  }),
});
