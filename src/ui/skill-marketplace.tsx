import { useState } from "react";
import { usePluginData, usePluginAction, useHostContext, usePluginToast } from "@paperclipai/plugin-sdk/ui";
import type { PluginSettingsPageProps } from "@paperclipai/plugin-sdk/ui";
import { s } from "./styles.js";

interface SkillCard {
  id: string;
  name: string;
  description: string;
  category: string;
}

interface AgentRow {
  id: string;
  name: string;
  assignedSkillIds: string[];
  assignedSkillNames: string[];
}

export function SkillMarketplace(_props: PluginSettingsPageProps) {
  const hostCtx = useHostContext();
  const toast = usePluginToast();

  const { data: skills, loading: skillsLoading, refresh: refreshSkills } = usePluginData<SkillCard[]>(
    "listSkillCards",
  );
  const { data: agents, loading: agentsLoading, refresh: refreshAgents } = usePluginData<AgentRow[]>(
    "listAgentAssignments",
    { companyId: hostCtx.companyId },
  );

  const syncFromGitHub = usePluginAction("syncFromGitHub");
  const assignSkill = usePluginAction("assignSkill");
  const unassignSkill = usePluginAction("unassignSkill");

  const [syncing, setSyncing] = useState(false);
  const [filter, setFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  const skillList = skills ?? [];
  const agentList = agents ?? [];
  const categories = [...new Set(skillList.map((sk) => sk.category))].sort();

  const selectedAgentSkills = selectedAgent
    ? agentList.find((a) => a.id === selectedAgent)?.assignedSkillIds ?? []
    : [];

  const filtered = skillList.filter((sk) => {
    const q = filter.toLowerCase();
    const matchesText =
      !q ||
      sk.name.toLowerCase().includes(q) ||
      sk.description.toLowerCase().includes(q);
    const matchesCat = !categoryFilter || sk.category === categoryFilter;
    return matchesText && matchesCat;
  });

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = (await syncFromGitHub({})) as {
        synced: number;
        errors: number;
        total: number;
      };
      toast({
        title: "Sync complete",
        body: `${result.synced}/${result.total} skills synced${result.errors ? ` (${result.errors} errors)` : ""}`,
        tone: result.errors ? "warn" : "success",
      });
      refreshSkills();
      refreshAgents();
    } catch (e: unknown) {
      const err = e as Record<string, unknown> | Error;
      const msg = err instanceof Error
        ? err.message
        : typeof err === "object" && err !== null && "message" in err
          ? String(err.message)
          : JSON.stringify(err);
      if (msg.includes("TIMEOUT")) {
        toast({
          title: "Sync running in background",
          body: "Refresh the page shortly.",
          tone: "info",
          ttlMs: 15000,
        });
      } else {
        toast({ title: "Sync failed", body: msg, tone: "error" });
      }
    }
    setSyncing(false);
  };

  const handleToggleSkill = async (skillId: string) => {
    if (!selectedAgent) return;
    const agentName = agentList.find((a) => a.id === selectedAgent)?.name ?? "agent";
    const skillName = skillList.find((sk) => sk.id === skillId)?.name ?? "skill";
    const isAssigned = selectedAgentSkills.includes(skillId);

    if (isAssigned) {
      await unassignSkill({ agentId: selectedAgent, skillId });
      toast({ title: "Skill removed", body: `Removed ${skillName} from ${agentName}`, tone: "info" });
    } else {
      await assignSkill({ agentId: selectedAgent, skillId });
      toast({ title: "Skill assigned", body: `${skillName} → ${agentName}`, tone: "success" });
    }
    refreshAgents();
  };

  const handleUnassignAll = async (agentId: string, skillIds: string[]) => {
    const agentName = agentList.find((a) => a.id === agentId)?.name ?? "agent";
    for (const skillId of skillIds) {
      await unassignSkill({ agentId, skillId });
    }
    toast({ title: "Skills cleared", body: `Removed all skills from ${agentName}`, tone: "info" });
    refreshAgents();
  };

  return (
    <div style={s.container}>
      {/* Agent Assignments */}
      <div style={s.section}>
        <div style={s.sectionTitle}>Agent Assignments</div>
        {agentsLoading ? (
          <div style={s.loading}>Loading agents...</div>
        ) : agentList.length === 0 ? (
          <div style={s.empty}>No agents found. Sync skills first.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {agentList.map((agent) => (
              <div
                key={agent.id}
                style={{
                  ...(selectedAgent === agent.id ? s.cardSelected : s.card),
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
                onClick={() =>
                  setSelectedAgent(selectedAgent === agent.id ? null : agent.id)
                }
              >
                <div>
                  <span style={{ fontSize: "13px", fontWeight: 600 }}>
                    {agent.name}
                  </span>
                  {agent.assignedSkillNames.length > 0 ? (
                    <span style={{ fontSize: "12px", color: "var(--primary, #60a5fa)", marginLeft: "8px" }}>
                      {agent.assignedSkillNames.length} skill{agent.assignedSkillNames.length !== 1 ? "s" : ""}:{" "}
                      {agent.assignedSkillNames.join(", ")}
                    </span>
                  ) : (
                    <span style={{ fontSize: "12px", color: "var(--muted-foreground, #555)", marginLeft: "8px" }}>
                      No skills
                    </span>
                  )}
                </div>
                <div style={s.row}>
                  {selectedAgent === agent.id && (
                    <span style={s.badge("#3b82f6")}>
                      Click skills below to toggle
                    </span>
                  )}
                  {agent.assignedSkillIds.length > 0 && (
                    <button
                      style={s.btnDanger}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUnassignAll(agent.id, agent.assignedSkillIds);
                      }}
                    >
                      Clear all
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Skills */}
      <div style={s.section}>
        <div style={s.sectionHeader}>
          <div style={s.sectionTitle}>
            Skills ({filtered.length}/{skillList.length})
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <a
              href="https://github.com/obra/superpowers"
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: "11px", color: "var(--muted-foreground, #555)", textDecoration: "none" }}
            >
              github.com/obra/superpowers
            </a>
            <button
              style={syncing ? s.btnDisabled : s.btn}
              disabled={syncing}
              onClick={handleSync}
            >
              {syncing ? "Syncing..." : "Sync from GitHub"}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
          <input
            style={{ ...s.input, maxWidth: "220px" }}
            placeholder="Search skills..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
            <button
              style={!categoryFilter ? s.pillActive : s.pill}
              onClick={() => setCategoryFilter(null)}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                style={categoryFilter === cat ? s.pillActive : s.pill}
                onClick={() =>
                  setCategoryFilter(categoryFilter === cat ? null : cat)
                }
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {skillsLoading ? (
          <div style={s.loading}>Loading skills...</div>
        ) : filtered.length === 0 ? (
          <div style={s.empty}>
            {skillList.length === 0
              ? 'No skills loaded. Click "Sync from GitHub" to import.'
              : "No skills match your filters."}
          </div>
        ) : (
          <div style={s.grid}>
            {filtered.map((sk) => {
              const isAssigned = selectedAgentSkills.includes(sk.id);
              return (
                <div
                  key={sk.id}
                  style={isAssigned ? s.cardSelected : s.card}
                  onClick={() => handleToggleSkill(sk.id)}
                  title={
                    selectedAgent
                      ? isAssigned
                        ? `Remove "${sk.name}" from selected agent`
                        : `Assign "${sk.name}" to selected agent`
                      : "Select an agent first to assign"
                  }
                >
                  <div style={s.row}>
                    <span style={s.cardName}>{sk.name}</span>
                    {isAssigned && (
                      <span style={s.badge("#22c55e")}>assigned</span>
                    )}
                  </div>
                  <div style={s.cardMeta}>
                    <span style={s.tag}>{sk.category}</span>
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "var(--muted-foreground, #888)",
                      marginTop: "4px",
                      lineHeight: "1.4",
                    }}
                  >
                    {sk.description.length > 140
                      ? sk.description.slice(0, 140) + "..."
                      : sk.description}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
