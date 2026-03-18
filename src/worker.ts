import {
  definePlugin,
  runWorker,
  type PluginContext,
  type PluginHealthDiagnostics,
} from "@paperclipai/plugin-sdk";
import { GITHUB_REPO } from "./constants.js";
import { SkillStore } from "./store/skill-store.js";
import { GitHubSync } from "./sync/github-sync.js";
import { registerTools } from "./tools/skill-tools.js";

type SuperpowersConfig = {
  githubRepo: string;
};

const plugin = definePlugin({
  async setup(ctx: PluginContext) {
    const rawConfig = await ctx.config.get();
    const config = rawConfig as unknown as SuperpowersConfig;
    const repo = config.githubRepo || GITHUB_REPO;

    const store = new SkillStore(ctx);
    const sync = new GitHubSync(ctx, store, repo);

    // Register agent-invokable tools
    registerTools(ctx, store);

    // Action: sync from GitHub
    ctx.actions.register("syncFromGitHub", async () => {
      const result = await sync.syncAll();
      return result;
    });

    // Action: assign skill to agent
    ctx.actions.register("assignSkill", async (params) => {
      const p = params as Record<string, unknown>;
      const agentId = String(p.agentId);
      const skillId = String(p.skillId);
      await store.assignSkill(agentId, skillId);
      return { success: true };
    });

    // Action: unassign skill from agent
    ctx.actions.register("unassignSkill", async (params) => {
      const p = params as Record<string, unknown>;
      const agentId = String(p.agentId);
      const skillId = String(p.skillId);
      await store.unassignSkill(agentId, skillId);
      return { success: true };
    });

    // Data: list skill cards (lightweight)
    ctx.data.register("listSkillCards", async (params) => {
      const p = params as Record<string, unknown>;
      const category = p.category ? String(p.category) : undefined;
      return await store.listSkillCards(category);
    });

    // Data: get full skill by ID
    ctx.data.register("getSkillDetail", async (params) => {
      const id = String((params as Record<string, unknown>).id);
      return await store.getSkill(id);
    });

    // Data: get assignment for agent
    ctx.data.register("getAssignment", async (params) => {
      const p = params as Record<string, unknown>;
      const agentId = String(p.agentId);
      return await store.getAssignment(agentId);
    });

    // Data: list agents with their skill assignments (for UI)
    ctx.data.register("listAgentAssignments", async (params) => {
      const p = params as Record<string, unknown>;
      const companyId = String(p.companyId ?? "");
      if (!companyId) return [];
      const agents = await ctx.agents.list({ companyId, limit: 200, offset: 0 });
      const rows = await Promise.all(
        agents.map(async (agent) => {
          const assignment = await store.getAssignment(agent.id);
          const skillIds = assignment?.skillIds ?? [];
          const skillNames: string[] = [];
          for (const sid of skillIds) {
            const skill = await store.getSkill(sid);
            if (skill) skillNames.push(skill.name);
          }
          return {
            id: agent.id,
            name: agent.name,
            assignedSkillIds: skillIds,
            assignedSkillNames: skillNames,
          };
        }),
      );
      return rows;
    });

    // Data: get full skills for agent detail tab
    ctx.data.register("getAgentSkills", async (params) => {
      const p = params as Record<string, unknown>;
      const agentId = String(p.agentId ?? "");
      if (!agentId) return null;
      const assignment = await store.getAssignment(agentId);
      if (!assignment || assignment.skillIds.length === 0) return null;
      const skills = [];
      for (const sid of assignment.skillIds) {
        const skill = await store.getSkill(sid);
        if (skill) skills.push(skill);
      }
      return { skillIds: assignment.skillIds, skills };
    });

    ctx.logger.info(`Superpowers plugin started (repo: ${repo})`);
  },

  async onHealth(): Promise<PluginHealthDiagnostics> {
    return { status: "ok" };
  },
});

runWorker(plugin, import.meta.url);
