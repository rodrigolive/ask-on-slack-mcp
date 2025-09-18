import { bossRole } from './boss.js';
import { expertRole } from './expert.js';
import { genericRole } from './generic.js';

export type RoleConfig = {
  name: string;
  askTool: {
    title: string;
    description: string;
    inputDescription: string;
  };
  clarifyTool: {
    title: string;
    description: string;
    inputDescription: string;
  };
  acknowledgeTool: {
    title: string;
    description: string;
    inputDescription: string;
  };
};

const roles: Record<string, RoleConfig> = {
  boss: bossRole,
  expert: expertRole,
};

export function getRole(roleName: string): RoleConfig {
  const normalizedRole = roleName.toLowerCase();
  return roles[normalizedRole] || genericRole;
}

export function getAvailableRoles(): string[] {
  return Object.keys(roles);
}