import { usePluginData } from "@paperclipai/plugin-sdk/ui";
import type { PluginDetailTabProps } from "@paperclipai/plugin-sdk/ui";
import { s } from "./styles.js";
import { useState } from "react";

interface SkillDetail {
  id: string;
  name: string;
  description: string;
  category: string;
  content: string;
  companionFiles: Record<string, string>;
}

interface AgentSkillsData {
  skillIds: string[];
  skills: SkillDetail[];
}

export function AgentSkillsTab({ context }: PluginDetailTabProps) {
  const agentId = context.entityId;
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);

  const { data } = usePluginData<AgentSkillsData | null>(
    "getAgentSkills",
    { agentId },
  );

  if (!data || data.skills.length === 0) {
    return (
      <div style={s.container}>
        <div style={s.empty}>
          No skills assigned to this agent. Go to{" "}
          <strong>Skill Marketplace</strong> in plugin settings to assign skills.
        </div>
      </div>
    );
  }

  return (
    <div style={s.container}>
      <div style={s.section}>
        <div style={s.sectionTitle}>
          Assigned Skills ({data.skills.length})
        </div>
      </div>

      {data.skills.map((skill) => {
        const isExpanded = expandedSkill === skill.id;
        const companionCount = Object.keys(skill.companionFiles).length;
        return (
          <div key={skill.id} style={s.section}>
            <div
              style={{ ...s.sectionHeader, cursor: "pointer" }}
              onClick={() => setExpandedSkill(isExpanded ? null : skill.id)}
            >
              <div>
                <div style={s.cardName}>{skill.name}</div>
                <div style={{ fontSize: "12px", color: "var(--muted-foreground, #888)", marginTop: "2px" }}>
                  {skill.description}
                </div>
              </div>
              <div style={s.row}>
                <span style={s.tag}>{skill.category}</span>
                {companionCount > 0 && (
                  <span style={s.badge("#f59e0b")}>
                    +{companionCount} file{companionCount !== 1 ? "s" : ""}
                  </span>
                )}
                <span style={{ fontSize: "12px", color: "var(--muted-foreground, #555)" }}>
                  {isExpanded ? "▼" : "▶"}
                </span>
              </div>
            </div>

            {isExpanded && (
              <>
                <div
                  style={{
                    fontSize: "13px",
                    color: "var(--foreground, #ccc)",
                    lineHeight: "1.6",
                    whiteSpace: "pre-wrap",
                    borderTop: "1px solid var(--border, #333)",
                    paddingTop: "12px",
                  }}
                >
                  {skill.content}
                </div>

                {Object.entries(skill.companionFiles).map(([filename, content]) => (
                  <div key={filename}>
                    <div style={{ ...s.sectionTitle, fontSize: "12px", marginTop: "8px" }}>
                      Companion: {filename}
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "var(--foreground, #bbb)",
                        lineHeight: "1.5",
                        whiteSpace: "pre-wrap",
                        background: "var(--background, #111)",
                        borderRadius: "8px",
                        padding: "10px",
                        marginTop: "4px",
                      }}
                    >
                      {content}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
