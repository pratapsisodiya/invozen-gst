import type { UserRole } from '@/types/auth'

export type Permission =
  | 'invoice:create'
  | 'invoice:edit'
  | 'invoice:delete'
  | 'invoice:view'
  | 'customer:create'
  | 'customer:edit'
  | 'customer:delete'
  | 'customer:view'
  | 'purchase:create'
  | 'purchase:edit'
  | 'purchase:view'
  | 'payment:create'
  | 'payment:view'
  | 'report:view'
  | 'report:export'
  | 'settings:edit'
  | 'settings:view'
  | 'compliance:manage'
  | 'compliance:view'
  | 'audit:view'
  | 'user:manage'
  | 'expense:create'
  | 'expense:view'

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  owner: [
    'invoice:create', 'invoice:edit', 'invoice:delete', 'invoice:view',
    'customer:create', 'customer:edit', 'customer:delete', 'customer:view',
    'purchase:create', 'purchase:edit', 'purchase:view',
    'payment:create', 'payment:view',
    'report:view', 'report:export',
    'settings:edit', 'settings:view',
    'compliance:manage', 'compliance:view',
    'audit:view', 'user:manage',
    'expense:create', 'expense:view',
  ],
  admin: [
    'invoice:create', 'invoice:edit', 'invoice:delete', 'invoice:view',
    'customer:create', 'customer:edit', 'customer:delete', 'customer:view',
    'purchase:create', 'purchase:edit', 'purchase:view',
    'payment:create', 'payment:view',
    'report:view', 'report:export',
    'settings:view',
    'compliance:manage', 'compliance:view',
    'audit:view',
    'expense:create', 'expense:view',
  ],
  accountant: [
    'invoice:create', 'invoice:edit', 'invoice:view',
    'customer:view',
    'purchase:create', 'purchase:edit', 'purchase:view',
    'payment:create', 'payment:view',
    'report:view', 'report:export',
    'compliance:manage', 'compliance:view',
    'expense:create', 'expense:view',
  ],
  ca: [
    'invoice:view',
    'customer:view',
    'purchase:view',
    'payment:view',
    'report:view', 'report:export',
    'compliance:manage', 'compliance:view',
    'audit:view',
    'expense:view',
  ],
  viewer: [
    'invoice:view',
    'customer:view',
    'purchase:view',
    'payment:view',
    'report:view',
    'compliance:view',
    'expense:view',
  ],
}

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

export function getPermissionsForRole(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? []
}
