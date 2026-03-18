export const PLUGIN_ID = "superpowers";
export const PLUGIN_VERSION = "0.1.0";
export const GITHUB_REPO = "obra/superpowers";

export const SKILL_CATEGORIES = {
  process: ["brainstorming", "writing-plans", "executing-plans", "dispatching-parallel-agents"],
  implementation: ["test-driven-development", "subagent-driven-development", "using-git-worktrees"],
  review: ["requesting-code-review", "receiving-code-review", "verification-before-completion", "finishing-a-development-branch"],
  debugging: ["systematic-debugging"],
  meta: ["using-superpowers", "writing-skills"],
} as const;

/** Flat lookup: skill ID → category */
export function categoryForSkill(skillId: string): string {
  for (const [cat, ids] of Object.entries(SKILL_CATEGORIES)) {
    if ((ids as readonly string[]).includes(skillId)) return cat;
  }
  return "other";
}

export const CATEGORY_LABELS: Record<string, string> = {
  process: "Process",
  implementation: "Implementation",
  review: "Review",
  debugging: "Debugging",
  meta: "Meta",
  other: "Other",
};
