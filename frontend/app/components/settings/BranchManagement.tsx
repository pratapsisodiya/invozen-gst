'use client'
import { useState } from 'react'
import { useBusinessStore } from '@/lib/store/businessStore'
import { useUIStore } from '@/lib/store/uiStore'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { STATE_CODES } from '@/lib/gst/constants'
import { Plus, Building2, Pencil, Trash2, Star } from 'lucide-react'
import { generateId } from '@/lib/utils/ids'
import type { Branch } from '@/types/business'

const STATE_OPTIONS = Object.entries(STATE_CODES).map(([code, name]) => ({ value: code, label: name }))

const EMPTY_BRANCH: Omit<Branch, 'id'> = {
  name: '',
  gstin: '',
  stateCode: '29',
  state: 'Karnataka',
  isDefault: false,
  address: { line1: '', line2: null, city: '', state: 'Karnataka', stateCode: '29', pincode: '' },
}

export function BranchManagement() {
  const { profile, updateProfile } = useBusinessStore()
  const { addToast } = useUIStore()
  const [showModal, setShowModal] = useState(false)
  const [editBranch, setEditBranch] = useState<Branch | null>(null)
  const [form, setForm] = useState<Omit<Branch, 'id'>>(EMPTY_BRANCH)

  const branches = profile.branches ?? []

  const openAdd = () => {
    setEditBranch(null)
    setForm(EMPTY_BRANCH)
    setShowModal(true)
  }

  const openEdit = (b: Branch) => {
    setEditBranch(b)
    setForm({ name: b.name, gstin: b.gstin, stateCode: b.stateCode, state: b.state, isDefault: b.isDefault, address: b.address })
    setShowModal(true)
  }

  const handleSave = () => {
    if (!form.name.trim()) { addToast({ type: 'error', title: 'Branch name is required' }); return }
    if (editBranch) {
      const updated = branches.map((b) => b.id === editBranch.id ? { ...b, ...form } : b)
      updateProfile({ branches: updated })
      addToast({ type: 'success', title: 'Branch updated' })
    } else {
      const newBranch: Branch = { ...form, id: generateId() }
      updateProfile({ branches: [...branches, newBranch] })
      addToast({ type: 'success', title: 'Branch added' })
    }
    setShowModal(false)
  }

  const handleDelete = (id: string) => {
    updateProfile({ branches: branches.filter((b) => b.id !== id) })
    addToast({ type: 'success', title: 'Branch removed' })
  }

  const handleSetDefault = (id: string) => {
    updateProfile({ branches: branches.map((b) => ({ ...b, isDefault: b.id === id })) })
  }

  const set = (k: keyof Omit<Branch, 'id' | 'address'>, v: string | boolean) =>
    setForm((prev) => ({ ...prev, [k]: v }))

  const setAddr = (k: string, v: string) =>
    setForm((prev) => ({ ...prev, address: { ...prev.address, [k]: v } }))

  return (
    <div className="p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Branch / GSTIN Management</h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Manage multiple GSTINs for different states or branches</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors">
          <Plus className="w-3.5 h-3.5" /> Add Branch
        </button>
      </div>

      {/* Main GSTIN */}
      <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="w-9 h-9 rounded-lg bg-brand-600 flex items-center justify-center flex-shrink-0">
          <Building2 className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{profile.businessName}</p>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-brand-50 text-brand-700">Primary</span>
          </div>
          <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>{profile.gstin || 'No GSTIN'} · {profile.state}</p>
        </div>
      </div>

      {/* Additional branches */}
      {branches.length === 0 ? (
        <div className="py-8 text-center text-sm rounded-xl" style={{ color: 'var(--text-muted)', border: '1px dashed var(--border)' }}>
          No additional branches added yet. Add a branch for each state where you have a separate GSTIN.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {branches.map((b) => (
            <div key={b.id} className="flex items-center gap-3 p-3.5 rounded-xl" style={{ border: '1px solid var(--border)' }}>
              <Building2 className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{b.name}</p>
                  {b.isDefault && <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-ok-50 text-ok-700">Default</span>}
                </div>
                <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{b.gstin} · {b.state}</p>
              </div>
              <div className="flex items-center gap-1">
                {!b.isDefault && (
                  <button onClick={() => handleSetDefault(b.id)} title="Set as default" className="p-1.5 rounded hover:bg-ink-100">
                    <Star className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                  </button>
                )}
                <button onClick={() => openEdit(b)} className="p-1.5 rounded hover:bg-ink-100">
                  <Pencil className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                </button>
                <button onClick={() => handleDelete(b.id)} className="p-1.5 rounded hover:bg-err-50 text-err-500">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editBranch ? 'Edit Branch' : 'Add Branch'} size="md">
        <div className="p-5 flex flex-col gap-4">
          <Input label="Branch Name" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Mumbai Branch" />
          <Input label="GSTIN" value={form.gstin} onChange={(e) => set('gstin', e.target.value.toUpperCase())} placeholder="27XXXXX1234F1Z5" />
          <Select label="State" value={form.stateCode}
            onChange={(e) => {
              set('stateCode', e.target.value)
              set('state', STATE_CODES[e.target.value] || '')
            }}
            options={STATE_OPTIONS} />
          <Input label="Address" value={form.address.line1} onChange={(e) => setAddr('line1', e.target.value)} placeholder="Street address" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="City" value={form.address.city} onChange={(e) => setAddr('city', e.target.value)} />
            <Input label="Pincode" value={form.address.pincode} onChange={(e) => setAddr('pincode', e.target.value)} />
          </div>
        </div>
        <div className="flex gap-2 px-5 pb-5">
          <button onClick={() => setShowModal(false)} className="flex-1 h-10 rounded-lg border text-sm font-medium hover:bg-ink-50" style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>Cancel</button>
          <button onClick={handleSave} className="flex-1 h-10 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors">
            {editBranch ? 'Update Branch' : 'Add Branch'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
