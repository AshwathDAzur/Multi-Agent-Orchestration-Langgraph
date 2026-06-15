// Oracle WRITE tools — mutations gated behind human approval (HITL).
//
// Each tool calls interrupt() BEFORE doing anything: this pauses the whole graph
// and surfaces a description of the proposed change to the caller. The run only
// continues when resumed with the human's decision. On "approve" the tool calls
// the (M2M-authenticated) oracleClient write; on anything else it aborts.

import { tool } from "@langchain/core/tools";
import { interrupt } from "@langchain/langgraph";
import * as z from "zod";
import { oracleClient } from "../clients/oracleClient.js";

// Ask the human. Returns the resume payload, e.g. { approved: true, approver }.
function requestApproval(action, summary, details) {
  return interrupt({
    type: "approval",
    action, // machine action name
    summary, // human-readable one-liner
    details, // structured details for the UI
  });
}

const removeRolePermission = tool(
  async ({ roleId, permissionId }) => {
    const decision = requestApproval(
      "remove_role_permission",
      `Remove permission ${permissionId} from role ${roleId}`,
      { roleId, permissionId }
    );
    if (!decision?.approved) {
      return `Action cancelled — not approved. (${decision?.reason ?? "rejected"})`;
    }
    await oracleClient.revokePermissionFromRole(roleId, permissionId);
    return `Done. Removed permission ${permissionId} from role ${roleId}. (approved by ${decision.approver ?? "unknown"})`;
  },
  {
    name: "remove_role_permission",
    description:
      "Remove (revoke) a permission from a role. REQUIRES human approval. " +
      "Use role id and permission id (look them up first with the read tools).",
    schema: z.object({
      roleId: z.number().describe("The role's numeric id"),
      permissionId: z.number().describe("The permission's numeric id to remove"),
    }),
  }
);

const assignRolePermission = tool(
  async ({ roleId, permissionId }) => {
    const decision = requestApproval(
      "assign_role_permission",
      `Grant permission ${permissionId} to role ${roleId}`,
      { roleId, permissionId }
    );
    if (!decision?.approved) {
      return `Action cancelled — not approved. (${decision?.reason ?? "rejected"})`;
    }
    await oracleClient.assignPermissionToRole(roleId, permissionId);
    return `Done. Granted permission ${permissionId} to role ${roleId}. (approved by ${decision.approver ?? "unknown"})`;
  },
  {
    name: "assign_role_permission",
    description:
      "Grant a permission to a role. REQUIRES human approval. Use role id and " +
      "permission id (look them up first with the read tools).",
    schema: z.object({
      roleId: z.number().describe("The role's numeric id"),
      permissionId: z.number().describe("The permission's numeric id to grant"),
    }),
  }
);

const assignUserRole = tool(
  async ({ userId, roleId }) => {
    const decision = requestApproval(
      "assign_user_role",
      `Assign role ${roleId} to user ${userId}`,
      { userId, roleId }
    );
    if (!decision?.approved) {
      return `Action cancelled — not approved. (${decision?.reason ?? "rejected"})`;
    }
    await oracleClient.assignRoleToUser(userId, roleId, decision.approver);
    return `Done. Assigned role ${roleId} to user ${userId}. (approved by ${decision.approver ?? "unknown"})`;
  },
  {
    name: "assign_user_role",
    description:
      "Assign a role to a user. REQUIRES human approval. Use user id and role id.",
    schema: z.object({
      userId: z.number().describe("The user's numeric id"),
      roleId: z.number().describe("The role's numeric id to assign"),
    }),
  }
);

const removeUserRole = tool(
  async ({ userId, roleId }) => {
    const decision = requestApproval(
      "remove_user_role",
      `Remove role ${roleId} from user ${userId}`,
      { userId, roleId }
    );
    if (!decision?.approved) {
      return `Action cancelled — not approved. (${decision?.reason ?? "rejected"})`;
    }
    await oracleClient.removeRoleFromUser(userId, roleId);
    return `Done. Removed role ${roleId} from user ${userId}. (approved by ${decision.approver ?? "unknown"})`;
  },
  {
    name: "remove_user_role",
    description:
      "Remove a role from a user. REQUIRES human approval. Use user id and role id.",
    schema: z.object({
      userId: z.number().describe("The user's numeric id"),
      roleId: z.number().describe("The role's numeric id to remove"),
    }),
  }
);

export const oracleWriteTools = [
  removeRolePermission,
  assignRolePermission,
  assignUserRole,
  removeUserRole,
];
