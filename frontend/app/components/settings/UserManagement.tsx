'use client'
import { useState, useEffect, useCallback } from 'react'
import { useUIStore } from '@/lib/store/uiStore'
import { useAuthStore } from '@/lib/store/authStore'
import { hasPermission } from '@/lib/auth/permissions'
import type { UserRole } from '@/types/auth'
import { Shield, Plus, Trash2, Loader2 } from 'lucide-react'
import { apiFetch } from '@/lib/api/fetch'

const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  owner: 'Full access to all features including settings and user management',
  admin: 'Full access except user management',
  accountant: 'Can create/edit invoices, purchases, and view reports',
  ca: 'Read-only access to reports and compliance management',
  viewer: 'Read-only access to all data',
}

const ROLE_COLORS: Record<UserRole, string> = {
  owner: 'bg-brand-50 text-brand-700 border border-brand-200',
  admin: 'bg-blue-50 text-blue-700 border border-blue-200',
  accountant: 'bg-ok-50 text-ok-700 border border-ok-200',
  ca: 'bg-purple-50 text-purple-700 border border-purple-200',
  viewer: 'bg-gray-50 text-gray-600 border border-gray-200',
}

interface TeamMember {
  id: string
  name: string
  email: string
  role: UserRole
  status: 'active' | 'pending'
  createdAt: string
}

export function UserManagement() {
  const { addToast } = useUIStore()
  const user = useAuthStore((s) => s.user)
  const [users, setUsers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<UserRole>('viewer')

  const canManageUsers = user ? hasPermission(user.role, 'user:manage') : false

  const refreshUsers = useCallback(async () => {
    try {
      setLoading(true)
      const res = await apiFetch('/api/users')
      if (res.ok) {
        const data = await res.json() as TeamMember[]
        setUsers(data)
      } else {
        addToast({ type: 'error', title: 'Failed to load team members' })
      }
    } catch (err) {
      console.error('Error fetching users:', err)
      addToast({ type: 'error', title: 'Error connecting to team service' })
    } finally {
      setLoading(false)
    }
  }, [addToast])

  useEffect(() => {
    let active = true
    apiFetch('/api/users')
      .then(async (res) => {
        if (res.ok && active) {
          const data = await res.json() as TeamMember[]
          setUsers(data)
        }
      })
      .catch((err) => console.error('Error fetching users on mount:', err))
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const handleInvite = async () => {
    if (!inviteEmail.includes('@')) {
      addToast({ type: 'error', title: 'Invalid email address' })
      return
    }
    try {
      setActionLoading('invite')
      const res = await apiFetch('/api/users/invite', {
        method: 'POST',
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      })
      if (res.ok) {
        addToast({ type: 'success', title: `Invitation sent to ${inviteEmail}`, message: `Role: ${inviteRole}` })
        setShowInvite(false)
        setInviteEmail('')
        await refreshUsers()
      } else {
        const errData = await res.json() as { error?: string }
        addToast({ type: 'error', title: 'Failed to send invitation', message: errData.error })
      }
    } catch (err) {
      console.error(err)
      addToast({ type: 'error', title: 'Error sending invitation' })
    } finally {
      setActionLoading(null)
    }
  }

  const handleRoleChange = async (targetUserId: string, newRole: UserRole) => {
    try {
      setActionLoading(targetUserId)
      const res = await apiFetch(`/api/users/${targetUserId}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role: newRole }),
      })
      if (res.ok) {
        addToast({ type: 'success', title: 'Role updated successfully' })
        await refreshUsers()
      } else {
        const errData = await res.json() as { error?: string }
        addToast({ type: 'error', title: 'Failed to update role', message: errData.error })
      }
    } catch (err) {
      console.error(err)
      addToast({ type: 'error', title: 'Error updating role' })
    } finally {
      setActionLoading(null)
    }
  }

  const handleRemoveUser = async (targetUserId: string, email: string, isPending: boolean) => {
    const confirmMessage = isPending
      ? `Are you sure you want to revoke the invitation to ${email}?`
      : `Are you sure you want to remove ${email} from the team?`
      
    if (!confirm(confirmMessage)) return
    try {
      setActionLoading(targetUserId)
      const res = await apiFetch(`/api/users/${targetUserId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        addToast({ type: 'success', title: isPending ? 'Invitation revoked' : 'User removed from team' })
        await refreshUsers()
      } else {
        const errData = await res.json() as { error?: string }
        addToast({ type: 'error', title: 'Failed to remove user', message: errData.error })
      }
    } catch (err) {
      console.error(err)
      addToast({ type: 'error', title: 'Error removing user' })
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Team Members & Access</h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Manage who can access your Invozen workspace</p>
        </div>
        {canManageUsers && (
          <button onClick={() => setShowInvite(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> Invite User
          </button>
        )}
      </div>

      {/* Users list */}
      {loading ? (
        <div className="flex flex-col gap-2 py-8 items-center justify-center border border-dashed rounded-xl" style={{ borderColor: 'var(--border)' }}>
          <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Loading team members...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-xl border border-dashed py-8 text-center" style={{ borderColor: 'var(--border)' }}>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No team members found.</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden bg-white" style={{ border: '1px solid var(--border)' }}>
          {users.map((u, i) => {
            const isSelf = user?.email === u.email
            const isOwner = u.role === 'owner'
            return (
              <div key={u.id} className={`flex items-center gap-3 px-4 py-3.5 ${i > 0 ? 'border-t' : ''}`} style={{ borderColor: 'var(--border-soft)' }}>
                <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-bold flex-shrink-0">
                  {u.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
                      {u.name} {isSelf && <span className="text-[10px] text-brand-600 font-semibold">(You)</span>}
                    </p>
                    {u.status === 'pending' && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">Pending</span>
                    )}
                  </div>
                  <p className="text-xs truncate font-mono" style={{ color: 'var(--text-muted)' }}>{u.email}</p>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Role Selector/Badge */}
                  {canManageUsers && !isSelf && !isOwner && u.status !== 'pending' ? (
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                      disabled={actionLoading !== null}
                      className="text-xs font-medium px-2 py-1 rounded-lg border bg-white outline-none cursor-pointer"
                      style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                    >
                      {(['admin', 'accountant', 'ca', 'viewer'] as UserRole[]).map((r) => (
                        <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                      ))}
                    </select>
                  ) : (
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${ROLE_COLORS[u.role as UserRole] || 'bg-gray-100 text-gray-700'}`}>
                      {u.role}
                    </span>
                  )}

                  {/* Action Buttons */}
                  {canManageUsers && !isSelf && !isOwner && (
                    <button
                      onClick={() => handleRemoveUser(u.id, u.email, u.status === 'pending')}
                      disabled={actionLoading !== null}
                      className="p-1.5 rounded hover:bg-red-50 hover:text-red-700 text-gray-400 transition-colors disabled:opacity-50"
                      title={u.status === 'pending' ? 'Revoke Invitation' : 'Remove Team Member'}
                    >
                      {actionLoading === u.id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Role matrix */}
      <div className="rounded-xl overflow-hidden bg-white" style={{ border: '1px solid var(--border)' }}>
        <div className="px-4 py-3" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
          <h4 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Role Permissions</h4>
        </div>
        <div className="flex flex-col gap-0">
          {(Object.entries(ROLE_DESCRIPTIONS) as [UserRole, string][]).map(([role, desc], i) => (
            <div key={role} className={`flex items-start gap-3 px-4 py-3 ${i > 0 ? 'border-t' : ''}`} style={{ borderColor: 'var(--border-soft)' }}>
              <Shield className="w-4 h-4 flex-shrink-0 mt-0.5 text-brand-600" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full capitalize ${ROLE_COLORS[role]}`}>{role}</span>
                </div>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Invite modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-xl bg-white p-5 w-full max-w-sm flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Invite Team Member</h3>
            <div>
              <label className="text-[13px] font-medium mb-1 block" style={{ color: 'var(--text-2)' }}>Email Address</label>
              <input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="colleague@example.com"
                className="w-full h-9 rounded-lg border px-3 text-sm outline-none" style={{ borderColor: 'var(--border)' }} />
            </div>
            <div>
              <label className="text-[13px] font-medium mb-1 block" style={{ color: 'var(--text-2)' }}>Role</label>
              <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as UserRole)}
                className="w-full h-9 rounded-lg border px-3 text-sm outline-none bg-white" style={{ borderColor: 'var(--border)' }}>
                {(['admin', 'accountant', 'ca', 'viewer'] as UserRole[]).map((r) => (
                  <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                ))}
              </select>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{ROLE_DESCRIPTIONS[inviteRole]}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowInvite(false)} disabled={actionLoading !== null} className="flex-1 h-9 rounded-lg border text-sm font-medium" style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>Cancel</button>
              <button onClick={handleInvite} disabled={actionLoading !== null} className="flex-1 h-9 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-1.5">
                {actionLoading === 'invite' && <Loader2 className="w-4 h-4 animate-spin" />}
                Send Invite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
