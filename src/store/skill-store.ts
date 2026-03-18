import type { PluginContext } from "@paperclipai/plugin-sdk";
import type { Skill, SkillCard, SkillAssignment } from "./types.js";

/**
 * Skill CRUD and assignment management via Paperclip plugin state API.
 *
 * Storage layout:
 *   skill:{id}          → full Skill object (instance scope)
 *   skill-index         → string[] of all skill IDs (instance scope)
 *   skill-assignments   → SkillAssignment (agent scope)
 */
export class SkillStore {
  constructor(private ctx: PluginContext) {}

  // ── Skill CRUD ──

  async upsertSkill(skill: Skill): Promise<void> {
    await this.ctx.state.set(
      { scopeKind: "instance", stateKey: `skill:${skill.id}` },
      skill,
    );
  }

  async getSkill(id: string): Promise<Skill | null> {
    const raw = await this.ctx.state.get({
      scopeKind: "instance",
      stateKey: `skill:${id}`,
    });
    return (raw as Skill) ?? null;
  }

  async deleteSkill(id: string): Promise<void> {
    await this.ctx.state.delete({
      scopeKind: "instance",
      stateKey: `skill:${id}`,
    });
    const index = await this.getIndex();
    const updated = index.filter((sid) => sid !== id);
    await this.setIndex(updated);
  }

  async listSkills(category?: string): Promise<Skill[]> {
    const index = await this.getIndex();
    const skills: Skill[] = [];
    for (const id of index) {
      const sk = await this.getSkill(id);
      if (sk && (!category || sk.category === category)) {
        skills.push(sk);
      }
    }
    return skills;
  }

  async listSkillCards(category?: string): Promise<SkillCard[]> {
    const full = await this.listSkills(category);
    return full.map(({ id, name, description, category: cat }) => ({
      id,
      name,
      description,
      category: cat,
    }));
  }

  // ── Index management ──

  async getIndex(): Promise<string[]> {
    const raw = await this.ctx.state.get({
      scopeKind: "instance",
      stateKey: "skill-index",
    });
    return (raw as string[]) ?? [];
  }

  async setIndex(ids: string[]): Promise<void> {
    await this.ctx.state.set(
      { scopeKind: "instance", stateKey: "skill-index" },
      ids,
    );
  }

  // ── Assignment management (multi-skill per agent) ──

  async getAssignment(agentId: string): Promise<SkillAssignment | null> {
    const raw = await this.ctx.state.get({
      scopeKind: "agent",
      scopeId: agentId,
      stateKey: "skill-assignments",
    });
    return (raw as SkillAssignment) ?? null;
  }

  async assignSkill(agentId: string, skillId: string): Promise<void> {
    const existing = await this.getAssignment(agentId);
    const skillIds = existing ? [...new Set([...existing.skillIds, skillId])] : [skillId];
    const assignment: SkillAssignment = {
      agentId,
      skillIds,
      assignedAt: new Date().toISOString(),
    };
    await this.ctx.state.set(
      { scopeKind: "agent", scopeId: agentId, stateKey: "skill-assignments" },
      assignment,
    );
  }

  async unassignSkill(agentId: string, skillId: string): Promise<void> {
    const existing = await this.getAssignment(agentId);
    if (!existing) return;
    const skillIds = existing.skillIds.filter((id) => id !== skillId);
    if (skillIds.length === 0) {
      await this.ctx.state.delete({
        scopeKind: "agent",
        scopeId: agentId,
        stateKey: "skill-assignments",
      });
    } else {
      await this.ctx.state.set(
        { scopeKind: "agent", scopeId: agentId, stateKey: "skill-assignments" },
        { ...existing, skillIds },
      );
    }
  }
}
