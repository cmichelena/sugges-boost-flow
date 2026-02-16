import { Building2, Landmark } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type WorkspaceType = "organisation" | "building";

export interface WorkspaceTypeConfig {
  label: string;
  description: string;
  icon: LucideIcon;
  defaultCategories: string[];
  statuses: string[];
  /** Extra fields shown on suggestion forms */
  extraFields: {
    targetResponseDate?: boolean;
    targetResolutionDate?: boolean;
    responsibleParty?: boolean;
  };
  /** Optional workspace-level settings */
  optionalSettings: {
    publicVisibilityMode?: boolean;
  };
  /** Terminology overrides */
  terminology: {
    suggestion: string;
    suggestions: string;
    submit: string;
  };
}

export const WORKSPACE_TYPE_CONFIGS: Record<WorkspaceType, WorkspaceTypeConfig> = {
  organisation: {
    label: "Organisation",
    description: "For companies, teams, and organisations collecting ideas and feedback",
    icon: Landmark,
    defaultCategories: [
      "Idea",
      "Improvement",
      "Risk",
      "Feedback",
      "Process",
      "Culture",
      "Other",
    ],
    statuses: [
      "Submitted",
      "Under Review",
      "In Progress",
      "Implemented",
      "Declined",
    ],
    extraFields: {},
    optionalSettings: {},
    terminology: {
      suggestion: "Suggestion",
      suggestions: "Suggestions",
      submit: "Submit a Suggestion",
    },
  },
  building: {
    label: "Building",
    description: "For buildings, estates, and facilities tracking issues and concerns",
    icon: Building2,
    defaultCategories: [
      "Safety",
      "Maintenance",
      "Cleanliness",
      "Utilities",
      "Noise / Nuisance",
      "Structural Concern",
      "Other",
    ],
    statuses: [
      "Logged",
      "In Review",
      "Assigned",
      "Scheduled",
      "Resolved",
      "Escalated",
    ],
    extraFields: {
      targetResponseDate: true,
      targetResolutionDate: true,
      responsibleParty: true,
    },
    optionalSettings: {
      publicVisibilityMode: true,
    },
    terminology: {
      suggestion: "Issue",
      suggestions: "Issues",
      submit: "Log an Issue",
    },
  },
};

export const WORKSPACE_TYPES = Object.keys(WORKSPACE_TYPE_CONFIGS) as WorkspaceType[];

export function getWorkspaceConfig(type: string | undefined | null): WorkspaceTypeConfig {
  if (type && type in WORKSPACE_TYPE_CONFIGS) {
    return WORKSPACE_TYPE_CONFIGS[type as WorkspaceType];
  }
  return WORKSPACE_TYPE_CONFIGS.organisation;
}

export function getStatusesForWorkspaceType(type: string | undefined | null): string[] {
  return getWorkspaceConfig(type).statuses;
}
