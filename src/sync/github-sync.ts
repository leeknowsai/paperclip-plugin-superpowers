import type { PluginContext } from "@paperclipai/plugin-sdk";
import { SkillStore } from "../store/skill-store.js";
import { categoryForSkill } from "../constants.js";
import type { Skill, SyncResult } from "../store/types.js";

interface TreeEntry {
  path: string;
  type: "blob" | "tree";
  sha: string;
  size?: number;
}

/**
 * Syncs skills from the obra/superpowers GitHub repo.
 *
 * Structure: skills/{skill-name}/SKILL.md + optional companion .md files
 */
export class GitHubSync {
  constructor(
    private ctx: PluginContext,
    private store: SkillStore,
    private repo: string,
  ) {}

  async syncAll(): Promise<SyncResult> {
    this.ctx.logger.info(`Starting sync from ${this.repo}`);

    const tree = await this.fetchTree();
    if (!tree.length) {
      this.ctx.logger.warn("Empty tree returned from GitHub");
      return { synced: 0, errors: 0, total: 0 };
    }

    // Group files by skill directory: skills/{name}/...
    const skillDirs = new Map<string, TreeEntry[]>();
    for (const item of tree) {
      if (item.type !== "blob") continue;
      const parts = item.path.split("/");
      if (parts[0] !== "skills" || parts.length < 3) continue;
      const skillName = parts[1];
      if (!skillDirs.has(skillName)) skillDirs.set(skillName, []);
      skillDirs.get(skillName)!.push(item);
    }

    this.ctx.logger.info(`Found ${skillDirs.size} skill directories to sync`);

    let synced = 0;
    let errors = 0;
    const newIndex: string[] = [];

    for (const [skillName, files] of skillDirs) {
      try {
        // Find SKILL.md
        const skillFile = files.find((f) => f.path.endsWith("/SKILL.md"));
        if (!skillFile) continue;

        const raw = await this.fetchRawContent(skillFile.path);
        const skill = this.parseSkillFile(raw, skillName);
        if (!skill) continue;

        // Fetch companion .md files (not SKILL.md, not in subdirs beyond one level)
        const companions: Record<string, string> = {};
        const companionFiles = files.filter(
          (f) =>
            f.path !== skillFile.path &&
            f.path.endsWith(".md") &&
            f.path.split("/").length === 3,
        );
        for (const cf of companionFiles) {
          try {
            const content = await this.fetchRawContent(cf.path);
            const filename = cf.path.split("/").pop()!;
            companions[filename] = content;
          } catch {
            this.ctx.logger.warn(`Failed to fetch companion ${cf.path}`);
          }
        }

        skill.companionFiles = companions;
        await this.store.upsertSkill(skill);
        newIndex.push(skill.id);
        synced++;
      } catch (e) {
        this.ctx.logger.warn(`Failed to sync ${skillName}: ${e}`);
        errors++;
      }
    }

    // Update index
    if (errors === 0) {
      await this.store.setIndex(newIndex);
      this.ctx.logger.info(`Index updated with ${newIndex.length} skills`);
    } else {
      const existing = await this.store.getIndex();
      const merged = [...new Set([...existing, ...newIndex])];
      await this.store.setIndex(merged);
      this.ctx.logger.warn(
        `Partial sync: merged ${newIndex.length} new into ${existing.length} existing (${errors} errors)`,
      );
    }

    return { synced, errors, total: synced + errors };
  }

  private async fetchTree(): Promise<TreeEntry[]> {
    const url = `https://api.github.com/repos/${this.repo}/git/trees/main?recursive=1`;
    const res = await fetch(url, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!res.ok) {
      throw new Error(`GitHub tree API returned ${res.status}`);
    }
    const data = (await res.json()) as { tree: TreeEntry[] };
    return data.tree;
  }

  private async fetchRawContent(path: string): Promise<string> {
    const url = `https://raw.githubusercontent.com/${this.repo}/main/${path}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch ${path}: ${res.status}`);
    }
    return res.text();
  }

  parseSkillFile(raw: string, skillId: string): Skill | null {
    // Extract YAML frontmatter between --- markers
    const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!fmMatch) return null;

    const frontmatter = fmMatch[1];
    const body = fmMatch[2].trim();
    const fm = this.parseSimpleYaml(frontmatter);
    if (!fm.name) return null;

    return {
      id: skillId,
      name: fm.name,
      description: fm.description ?? "",
      category: categoryForSkill(skillId),
      content: body,
      companionFiles: {},
      updatedAt: new Date().toISOString(),
    };
  }

  private parseSimpleYaml(text: string): Record<string, string> {
    const result: Record<string, string> = {};
    for (const line of text.split("\n")) {
      const colonIdx = line.indexOf(":");
      if (colonIdx === -1) continue;
      const key = line.slice(0, colonIdx).trim();
      let value = line.slice(colonIdx + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (key) result[key] = value;
    }
    return result;
  }
}
