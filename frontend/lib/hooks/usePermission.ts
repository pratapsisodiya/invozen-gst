'use client'
import { useAuthStore } from '@/lib/store/authStore'
import { hasPermission } from '@/lib/auth/permissions'
import type { Permission } from '@/lib/auth/permissions'

export function usePermission(permission: Permission): boolean {
  const user = useAuthStore((s) => s.user)
  if (!user) return false
  return hasPermission(user.role, permission)
}

export function usePermissions(permissions: Permission[]): Record<string, boolean> {
  const user = useAuthStore((s) => s.user)
  const role = user?.role ?? 'viewer'
  return permissions.reduce((acc, p) => {
    acc[p] = hasPermission(role, p)
    return acc
  }, {} as Record<string, boolean>)
}
