'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useItemStore } from '@/lib/store/itemStore'
import { useUIStore } from '@/lib/store/uiStore'
import { TopBar } from '../app/TopBar'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { generateId } from '@/lib/utils/ids'
import { GST_RATES } from '@/lib/gst/constants'
import { UNITS } from '@/types/item'
import type { Item, ItemType } from '@/types/item'

const UNIT_OPTIONS = UNITS.map((u) => ({ value: u, label: u }))

export function ItemFormClient({ editId }: { editId?: string }) {
  const router = useRouter()
  const { items, addItem, updateItem } = useItemStore()
  const { addToast } = useUIStore()

  const editing = editId ? items.find((i) => i.id === editId) : null

  const [form, setForm] = useState({
    name: editing?.name || '',
    description: editing?.description || '',
    type: (editing?.type || 'product') as ItemType,
    hsnCode: editing?.hsnCode || '',
    sacCode: editing?.sacCode || '',
    unit: editing?.unit || 'NOS',
    defaultRate: editing?.defaultRate || 0,
    defaultGstRate: editing?.defaultGstRate || 18,
    trackInventory: editing?.trackInventory || false,
    stockQuantity: editing?.stockQuantity || 0,
    lowStockThreshold: editing?.lowStockThreshold || 0,
  })
  const [saving, setSaving] = useState(false)

  const u = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setTimeout(() => {
      const item: Item = {
        id: editing?.id || generateId(),
        name: form.name,
        description: form.description || null,
        type: form.type,
        hsnCode: form.type === 'product' ? (form.hsnCode || null) : null,
        sacCode: form.type === 'service' ? (form.sacCode || null) : null,
        unit: form.unit,
        defaultRate: Number(form.defaultRate),
        defaultGstRate: Number(form.defaultGstRate),
        isActive: editing?.isActive ?? true,
        trackInventory: form.type === 'product' ? form.trackInventory : false,
        stockQuantity: form.type === 'product' && form.trackInventory ? Number(form.stockQuantity) : null,
        lowStockThreshold: form.type === 'product' && form.trackInventory ? Number(form.lowStockThreshold) : null,
        createdAt: editing?.createdAt || new Date().toISOString(),
      }
      if (editing) updateItem(editing.id, item)
      else addItem(item)
      setSaving(false)
      addToast({ type: 'success', title: editing ? 'Item updated' : 'Item added', message: item.name })
      router.push('/items')
    }, 500)
  }

  return (
    <div className="flex flex-col flex-1">
      <TopBar
        title={editing ? `Edit ${editing.name}` : 'Add Item'}
        breadcrumb={[{ label: 'Items', href: '/items' }]}
      />
      <div className="flex-1 p-4 lg:p-6">
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto flex flex-col gap-5">
          {/* Basic details */}
          <div className="rounded-xl bg-white p-5" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>Item Details</h2>
            <div className="flex flex-col gap-4">
              <Input label="Item Name" value={form.name} onChange={u('name')} required />
              <div>
                <label className="text-[13px] font-medium mb-1.5 block" style={{ color: 'var(--text-2)' }}>Description</label>
                <textarea value={form.description} onChange={u('description')} rows={2}
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-600/20 resize-none"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                  placeholder="Optional description" />
              </div>
              <div>
                <label className="text-[13px] font-medium mb-2 block" style={{ color: 'var(--text-2)' }}>Type</label>
                <div className="flex gap-3">
                  {(['product', 'service'] as const).map((t) => (
                    <button key={t} type="button"
                      onClick={() => setForm((p) => ({ ...p, type: t }))}
                      className={`flex-1 h-10 rounded-lg border text-sm font-medium transition-colors ${form.type === t ? 'bg-brand-600 text-white border-brand-600' : 'hover:bg-ink-50'}`}
                      style={{ borderColor: form.type === t ? undefined : 'var(--border)', color: form.type === t ? undefined : 'var(--text)' }}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Codes & rates */}
          <div className="rounded-xl bg-white p-5" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>Classification & Pricing</h2>
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                {form.type === 'product'
                  ? <Input label="HSN Code" value={form.hsnCode} onChange={u('hsnCode')} placeholder="e.g. 8471" />
                  : <Input label="SAC Code" value={form.sacCode} onChange={u('sacCode')} placeholder="e.g. 998314" />}
                <Select label="Unit" value={form.unit}
                  onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))}
                  options={UNIT_OPTIONS} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Default Rate (₹)" type="number" value={String(form.defaultRate)} onChange={u('defaultRate')} required min="0" step="0.01" />
                <div>
                  <label className="text-[13px] font-medium mb-2 block" style={{ color: 'var(--text-2)' }}>GST Rate</label>
                  <div className="flex gap-2 flex-wrap">
                    {GST_RATES.map((r) => (
                      <button key={r} type="button"
                        onClick={() => setForm((p) => ({ ...p, defaultGstRate: r }))}
                        className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${form.defaultGstRate === r ? 'bg-brand-600 text-white' : 'hover:bg-ink-50 border'}`}
                        style={{ borderColor: form.defaultGstRate === r ? undefined : 'var(--border)', color: form.defaultGstRate === r ? undefined : 'var(--text-2)' }}>
                        {r}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Inventory (products only) */}
          {form.type === 'product' && (
            <div className="rounded-xl bg-white p-5" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Inventory Tracking</h2>
                <button type="button"
                  onClick={() => setForm((p) => ({ ...p, trackInventory: !p.trackInventory }))}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${form.trackInventory ? 'bg-brand-600' : 'bg-ink-200'}`}
                  role="switch" aria-checked={form.trackInventory}>
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${form.trackInventory ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                </button>
              </div>
              {form.trackInventory && (
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Current Stock" type="number" value={String(form.stockQuantity)} onChange={u('stockQuantity')} min="0" />
                  <Input label="Low Stock Alert" type="number" value={String(form.lowStockThreshold)} onChange={u('lowStockThreshold')} min="0" />
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <button type="button" onClick={() => router.back()}
              className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-ink-50 transition-colors"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 h-10 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors disabled:opacity-50">
              {saving ? 'Saving...' : editing ? 'Update Item' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
