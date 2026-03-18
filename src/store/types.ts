export interface Skill {
  id: string;
  name: string;
  description: string;
  category: string;
  content: string;
  companionFiles: Record<string, string>;
  updatedAt: string;
}

export interface SkillCard {
  id: string;
  name: string;
  description: string;
  category: string;
}

export interface SkillAssignment {
  agentId: string;
  skillIds: string[];
  assignedAt: string;
}

export interface SyncResult {
  synced: number;
  errors: number;
  total: number;
}
