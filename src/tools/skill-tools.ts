import type { PluginContext, ToolRunContext } from "@paperclipai/plugin-sdk";
import { SkillStore } from "../store/skill-store.js";

/** Register all agent-invokable tools */
export function registerTools(ctx: PluginContext, store: SkillStore): void {
  // getMySkills — agent calls this to load all assigned skills
  ctx.tools.register(
    "getMySkills",
    {
      displayName: "Get My Skills",
      description:
        "Returns all superpowers skills assigned to you as formatted markdown.",
      parametersSchema: { type: "object", properties: {} },
    },
    async (_params, runCtx: ToolRunContext) => {
      const agentId = runCtx.agentId;

      const assignment = await store.getAssignment(agentId);
      if (!assignment || assignment.skillIds.length === 0) {
        return {
          content:
            "No skills assigned. Ask admin to assign skills via the Skill Marketplace in Paperclip settings.",
        };
      }

      const parts: string[] = [];
      for (const skillId of assignment.skillIds) {
        const skill = await store.getSkill(skillId);
        if (!skill) {
          parts.push(`## ${skillId}\n*Skill not found — re-sync from GitHub.*`);
          continue;
        }
        let section = `## ${skill.name}\n*${skill.description}*\n\n${skill.content}`;
        if (Object.keys(skill.companionFiles).length > 0) {
          for (const [filename, content] of Object.entries(skill.companionFiles)) {
            section += `\n\n---\n### Companion: ${filename}\n${content}`;
          }
        }
        parts.push(section);
      }

      return { content: `# My Skills (${assignment.skillIds.length})\n\n${parts.join("\n\n---\n\n")}` };
    },
  );

  // listSkills — browse available skills (lightweight cards only)
  ctx.tools.register(
    "listSkills",
    {
      displayName: "List Skills",
      description:
        "List available superpowers skills. Returns name, category, and description only (not full content).",
      parametersSchema: {
        type: "object",
        properties: {
          category: {
            type: "string",
            description: "Filter by category: process, implementation, review, debugging, meta",
          },
        },
      },
    },
    async (params) => {
      const p = params as Record<string, unknown>;
      const category = p.category ? String(p.category) : undefined;
      const cards = await store.listSkillCards(category);

      if (cards.length === 0) {
        return {
          content:
            "No skills available. Ask admin to sync from GitHub via the Skill Marketplace settings.",
        };
      }

      const list = cards
        .map((c) => `- **${c.name}** [${c.category}] — ${c.description}`)
        .join("\n");

      return { content: `${cards.length} skills:\n\n${list}` };
    },
  );

  // logSkillExecution — log skill execution result to an issue document
  ctx.tools.register(
    "logSkillExecution",
    {
      displayName: "Log Skill Execution",
      description: "Log the result of executing a skill to an issue document.",
      parametersSchema: {
        type: "object",
        properties: {
          issueId: { type: "string", description: "Issue ID to attach the log to" },
          skillId: { type: "string", description: "Skill ID that was executed" },
          companyId: { type: "string", description: "Company ID" },
          summary: { type: "string", description: "Execution summary/output" },
        },
        required: ["issueId", "skillId", "companyId", "summary"],
      },
    },
    async (params) => {
      const p = params as Record<string, unknown>;
      const issueId = String(p.issueId);
      const skillId = String(p.skillId);
      const companyId = String(p.companyId);
      const summary = String(p.summary);

      const skill = await store.getSkill(skillId);
      const key = `skill-log-${skillId}`;

      await ctx.issues.documents.upsert({
        issueId,
        key,
        companyId,
        title: `Skill Log: ${skill?.name ?? skillId}`,
        body: `# ${skill?.name ?? skillId} Execution\n\n${summary}\n\n---\n*Logged at ${new Date().toISOString()}*`,
        format: "markdown",
        changeSummary: `Skill ${skillId} executed`,
      });

      return { content: `Logged ${skillId} execution to issue ${issueId}` };
    },
  );

  // getSkill — get full content of a specific skill
  ctx.tools.register(
    "getSkill",
    {
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
    async (params) => {
      const p = params as Record<string, unknown>;
      const id = String(p.id);
      const skill = await store.getSkill(id);

      if (!skill) {
        return { content: `Skill "${id}" not found. Use listSkills to see available skills.` };
      }

      let output = `# ${skill.name}\n*${skill.description}*\n**Category:** ${skill.category}\n\n${skill.content}`;
      if (Object.keys(skill.companionFiles).length > 0) {
        for (const [filename, content] of Object.entries(skill.companionFiles)) {
          output += `\n\n---\n## Companion: ${filename}\n${content}`;
        }
      }

      return { content: output };
    },
  );
}
