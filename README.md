# paperclip-plugin-superpowers

Paperclip plugin that syncs **14 structured development methodology skills** from [obra/superpowers](https://github.com/obra/superpowers) and makes them assignable to Paperclip agents.

Skills include brainstorming, TDD, systematic debugging, code review, planning, and more — each a detailed workflow that agents load at runtime via tools.

## Key Difference from Personas

Unlike the agency-agents plugin (1 persona per agent), agents can have **multiple skills** assigned simultaneously.

## Skills (14)

| Category | Skills |
|----------|--------|
| **Process** | brainstorming, writing-plans, executing-plans, dispatching-parallel-agents |
| **Implementation** | test-driven-development, subagent-driven-development, using-git-worktrees |
| **Review** | requesting-code-review, receiving-code-review, verification-before-completion, finishing-a-development-branch |
| **Debugging** | systematic-debugging |
| **Meta** | using-superpowers, writing-skills |

## Agent Tools

| Tool | Description |
|------|-------------|
| `getMySkills` | Returns all skills assigned to the calling agent as markdown |
| `listSkills` | List available skills (cards only, optional category filter) |
| `getSkill` | Get full content of a specific skill by ID |

## UI

- **Skill Marketplace** (Settings page) — browse skills, assign/unassign to agents, sync from GitHub
- **Agent Skills** (Detail tab) — view all skills assigned to an agent with expandable content

## Install

```bash
# From Paperclip monorepo
cd packages/plugins/superpowers
npm run build

# Install into Paperclip
curl -X POST http://localhost:3100/api/plugins/install \
  -H 'Content-Type: application/json' \
  -d '{"packageName": "/path/to/superpowers", "isLocalPath": true}'
```

## Sync Skills

After install, trigger sync via UI ("Sync from GitHub" button) or API:

```bash
curl -X POST http://localhost:3100/api/plugins/superpowers/actions/syncFromGitHub \
  -H 'Content-Type: application/json' -d '{}'
```

## Structure

```
src/
  constants.ts          # Plugin ID, skill categories
  manifest.ts           # Capabilities, tools, UI slots
  worker.ts             # Actions + data handlers + tool registration
  store/
    types.ts            # Skill, SkillAssignment, SyncResult
    skill-store.ts      # CRUD + multi-skill assignment via ctx.state
  sync/
    github-sync.ts      # Fetch skills from obra/superpowers GitHub
  tools/
    skill-tools.ts      # getMySkills, listSkills, getSkill
  ui/
    skill-marketplace.tsx  # Settings page: browse & assign
    agent-skills-tab.tsx   # Agent detail tab: view assigned skills
    styles.ts              # Shared inline styles
```

## License

MIT
