// Conditional-edge function for the supervisor.
//
// Reads the `next` decision the supervisor wrote into state and directs the
// graph to the matching specialist node, or ends the run.

import { END } from "@langchain/langgraph";

export const routeFromSupervisor = (state) => {
  switch (state.next) {
    case "math":
      return "mathNode";
    case "weather":
      return "weatherNode";
    case "data":
      return "dataAccessNode";
    case "done":
    default:
      return END;
  }
};
