// Assembles the supervisor graph (hub-and-spoke).
//
//   START -> supervisor --(route)--> mathNode    --> supervisor
//                                 \-> weatherNode --> supervisor
//                                 \-> END
//
// The supervisor is the hub: it routes OUT to a specialist via a conditional
// edge, and each specialist loops BACK so the supervisor can decide what's next
// (or finish). This is what enables multi-step coordination.

import { StateGraph, START, END } from "@langchain/langgraph";
import { SupervisorState } from "./state.js";
import { supervisorNode, mathNode, weatherNode } from "./nodes.js";
import { routeFromSupervisor } from "./router.js";

export const supervisor = new StateGraph(SupervisorState)
  .addNode("supervisor", supervisorNode)
  .addNode("mathNode", mathNode)
  .addNode("weatherNode", weatherNode)
  .addEdge(START, "supervisor")
  .addConditionalEdges("supervisor", routeFromSupervisor, [
    "mathNode",
    "weatherNode",
    END,
  ])
  .addEdge("mathNode", "supervisor")
  .addEdge("weatherNode", "supervisor")
  .compile();
