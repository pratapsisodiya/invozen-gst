'use client'
import { useState } from 'react'
import { useUIStore } from '@/lib/store/uiStore'
import { useAuthStore } from '@/lib/store/authStore'
import { hasPermission } from '@/lib/auth/permissions'
import type { UserRole } from '@/types/auth'
import { Shield, Users, Plus } from 'lucide-react'

const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  owner: 'Full access to all features including settings and user management',
  admin: 'Full access except user management',
  accountant: 'Can create/edit invoices, purchases, and view reports',
  ca: 'Read-only access to reports and compliance management',
  viewer: 'Read-only access to all data',
}

const ROLE_COLORS: Record<UserRole, string> = {
  owner: 'bg-brand-50 text-brand-700',
  admin: 'bg-blue-50 text-blue-700',
  accountant: 'bg-ok-50 text-ok-700',
  ca: 'bg-purple-50 text-purple-700',
  viewer: 'bg-gray-100 text-gray-600',
}

const SAMPLE_USERS = [
  { id: '1', name: 'Prakash Mehta', email: 'prakash@example.com', role: 'owner' as UserRole },
  { id: '2', name: 'Meena Sharma', email: 'meena@example.com', role: 'accountant' as UserRole },
]

export function UserManagement() {
  const { addToast } = useUIStore()
  const user = useAuthStore((s) => s.user)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<UserRole>('viewer')

  const canManageUsers = user ? hasPermission(user.role, 'user:manage') : false

  const handleInvite = () => {
    if (!inviteEmail.includes('@')) {
      addToast({ type: 'error', title: 'Invalid email address' })
      return
    }
    addToast({ type: 'success', title: `Invitation sent to ${inviteEmail}`, message: `Role: ${inviteRole}` })
    setShowInvite(false)
    setInviteEmail('')
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
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        {SAMPLE_USERS.map((u, i) => (
          <div key={u.id} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t' : ''}`} style={{ borderColor: 'var(--border-soft)' }}>
            <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-bold flex-shrink-0">
              {u.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{u.name}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{u.email}</p>
            </div>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${ROLE_COLORS[u.role]}`}>{u.role}</span>
          </div>
        ))}
      </div>

      {/* Role matrix */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
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
          <div className="rounded-xl bg-white p-5 w-full max-w-sm flex flex-col gap-4" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Invite Team Member</h3>
            <div>
              <label className="text-[13px] font-medium mb-1 block" style={{ color: 'var(--text-2)' }}>Email Address</label>
              <input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="colleague@example.com"
                className="w-full h-9 rounded-lg border px-3 text-sm outline-none" style={{ borderColor: 'var(--border)' }} />
            </div>
            <div>
              <label className="text-[13px] font-medium mb-1 block" style={{ color: 'var(--text-2)' }}>Role</label>
              <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as UserRole)}
                className="w-full h-9 rounded-lg border px-3 text-sm outline-none" style={{ borderColor: 'var(--border)' }}>
                {(['admin', 'accountant', 'ca', 'viewer'] as UserRole[]).map((r) => (
                  <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                ))}
              </select>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{ROLE_DESCRIPTIONS[inviteRole]}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowInvite(false)} className="flex-1 h-9 rounded-lg border text-sm font-medium" style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>Cancel</button>
              <button onClick={handleInvite} className="flex-1 h-9 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors">Send Invite</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
