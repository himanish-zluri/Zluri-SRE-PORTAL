export const ROLES = {
  DEVELOPER: 'DEVELOPER',
  MANAGER: 'MANAGER',
  ADMIN: 'ADMIN',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

// Roles that can view all queries (for their PODs)
export const ELEVATED_ROLES: Role[] = [ROLES.MANAGER, ROLES.ADMIN];

// Helper to check if a role has elevated access
export const hasElevatedAccess = (role: Role): boolean => {
  return ELEVATED_ROLES.includes(role);
};
