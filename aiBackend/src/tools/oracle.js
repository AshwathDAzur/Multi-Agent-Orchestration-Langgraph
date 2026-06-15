// Oracle data-access tools — thin wrappers over the OracleDigitalWorker .NET API
// (EPC user/role/permission data). Each tool calls the API client and returns
// the result as JSON text for the model to reason over. Read-only for v1.

import { tool } from "@langchain/core/tools";
import * as z from "zod";
import { oracleClient } from "../clients/oracleClient.js";

// Helper: serialize tool output to a string (model reads text, not objects).
const asText = (data) => JSON.stringify(data);

const listUsers = tool(
  async () => asText(await oracleClient.listUsers()),
  {
    name: "list_users",
    description:
      "List all EPC users/employees with their details (name, job title, " +
      "department, discipline, project site, roles). Use this to answer any " +
      "question about people, then filter/aggregate in your reasoning.",
    schema: z.object({}),
  }
);

const getUser = tool(
  async ({ id }) => asText(await oracleClient.getUser(id)),
  {
    name: "get_user",
    description: "Get a single EPC user by their numeric id.",
    schema: z.object({
      id: z.number().describe("The user's numeric id"),
    }),
  }
);

const listRoles = tool(
  async () => asText(await oracleClient.listRoles()),
  {
    name: "list_roles",
    description:
      "List all roles in the EPC system, each with the permission codes it " +
      "grants. Use this to answer questions about roles and their access.",
    schema: z.object({}),
  }
);

const getRole = tool(
  async ({ id }) => asText(await oracleClient.getRole(id)),
  {
    name: "get_role",
    description: "Get a single role (with its permissions) by numeric id.",
    schema: z.object({
      id: z.number().describe("The role's numeric id"),
    }),
  }
);

const listPermissions = tool(
  async () => asText(await oracleClient.listPermissions()),
  {
    name: "list_permissions",
    description:
      "List all permissions in the EPC system (code, name, module, action). " +
      "Use this to answer questions about available permissions.",
    schema: z.object({}),
  }
);

export const oracleTools = [
  listUsers,
  getUser,
  listRoles,
  getRole,
  listPermissions,
];
