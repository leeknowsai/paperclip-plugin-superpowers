import type { PaperclipPluginManifestV1 } from "@paperclipai/plugin-sdk";
import { PLUGIN_ID, PLUGIN_VERSION, GITHUB_REPO } from "./constants.js";

const manifest: PaperclipPluginManifestV1 = {
  id: PLUGIN_ID,
  apiVersion: 1,
  version: PLUGIN_VERSION,
  displayName: "Superpowers Skills",
  description:
    "Browse, assign, and manage development methodology skills from the superpowers library. Agents call getMySkills to load their assigned skills at runtime.",
  author: "x-watchdog",
  categories: ["automation"],
  capabilities: [
    "agents.read",
    "plugin.state.read",
    "plugin.state.write",
    "http.outbound",
    "agent.tools.register",
    "instance.settings.register",
    "ui.page.register",
    "ui.detailTab.register",
  ],
  entrypoints: {
    worker: "./dist/worker.js",
    ui: "./dist/ui/",
  },
  instanceConfigSchema: {
    type: "object",
    properties: {
      githubRepo: {
        type: "string",
        title: "GitHub Repository",
        description: "Owner/repo of the superpowers library to sync from.",
        default: GITHUB_REPO,
      },
    },
  },
  tools: [
    {
      name: "getMySkills",
      displayName: "Get My Skills",
      description:
        "Returns all superpowers skills assigned to the calling agent as formatted markdown.",
      parametersSchema: { type: "object", properties: {} },
    },
    {
      name: "listSkills",
      displayName: "List Skills",
      description:
        "List available superpowers skills. Optionally filter by category.",
      parametersSchema: {
        type: "object",
        properties: {
          category: {
            type: "string",
            description:
              "Filter by category: process, implementation, review, debugging, meta",
          },
        },
      },
    },
    {
      name: "getSkill",
      displayName: "Get Skill",
      description: "Get the full content of a specific superpowers skill by ID.",
      parametersSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "Skill ID (e.g. brainstorming, test-driven-development)" },
        },
        required: ["id"],
      },
    },
  ],
  ui: {
    slots: [
      {
        type: "settingsPage",
        id: "skill-marketplace",
        displayName: "Skill Marketplace",
        exportName: "SkillMarketplace",
      },
      {
        type: "detailTab",
        id: "agent-skills",
        displayName: "Skills",
        exportName: "AgentSkillsTab",
        entityTypes: ["agent"],
      },
    ],
  },
};

export default manifest;
