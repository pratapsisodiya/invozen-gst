'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCustomerStore } from '@/lib/store/customerStore'
import { useUIStore } from '@/lib/store/uiStore'
import { TopBar } from '../app/TopBar'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { GSTINInput } from '../ui/GSTINInput'
import { generateId } from '@/lib/utils/ids'
import type { Customer } from '@/types/customer'
import { STATE_CODES } from '@/lib/gst/constants'

const STATE_OPTIONS = Object.entries(STATE_CODES).map(([code, name]) => ({ value: code, label: name }))

export function CustomerFormClient({ editId }: { editId?: string }) {
  const router = useRouter()
  const { customers, addCustomer, updateCustomer } = useCustomerStore()
  const { addToast } = useUIStore()

  const editing = editId ? customers.find((c) => c.id === editId) : null

  const [form, setForm] = useState({
    name: editing?.name || '',
    businessName: editing?.businessName || '',
    phone: editing?.phone || '',
    email: editing?.email || '',
    gstin: editing?.gstin || '',
    businessType: editing?.businessType || 'b2b' as const,
    line1: editing?.billingAddress.line1 || '',
    city: editing?.billingAddress.city || '',
    state: editing?.billingAddress.state || '',
    stateCode: editing?.billingAddress.stateCode || '',
    pincode: editing?.billingAddress.pincode || '',
    paymentTermsDays: editing?.paymentTermsDays || 30,
    notes: editing?.notes || '',
  })
  const [gstinState, setGstinState] = useState<{ state: string | null; stateCode: string | null }>({ state: null, stateCode: null })
  const [saving, setSaving] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setTimeout(() => {
      const customer: Customer = {
        id: editing?.id || generateId(),
        name: form.name,
        businessName: form.businessName || null,
        contactPerson: null,
        phone: form.phone || null,
        email: form.email || null,
        gstin: form.gstin || null,
        gstinState: gstinState.state || form.state || null,
        gstinStateCode: gstinState.stateCode || form.stateCode || null,
        businessType: form.businessType,
        billingAddress: { line1: form.line1, line2: null, city: form.city, state: form.state, stateCode: form.stateCode, pincode: form.pincode },
        shippingAddress: null,
        creditLimit: null,
        paymentTermsDays: form.paymentTermsDays,
        totalInvoiced: editing?.totalInvoiced || 0,
        totalPaid: editing?.totalPaid || 0,
        notes: form.notes || null,
        tags: editing?.tags || [],
        createdAt: editing?.createdAt || new Date().toISOString(),
      }
      if (editing) updateCustomer(editing.id, customer)
      else addCustomer(customer)
      setSaving(false)
      addToast({ type: 'success', title: editing ? 'Customer updated' : 'Customer added', message: customer.name })
      router.push('/customers')
    }, 600)
  }

  const u = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  return (
    <div className="flex flex-col flex-1">
      <TopBar
        title={editing ? `Edit ${editing.name}` : 'Add Customer'}
        breadcrumb={[{ label: 'Customers', href: '/customers' }]}
      />
      <div className="flex-1 p-4 lg:p-6">
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto flex flex-col gap-5">
          <div className="rounded-xl bg-white p-5" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>Basic Details</h2>
            <div className="grid grid-cols-1 gap-4">
              <div className="grid grid-cols-2 gap-3">
                <Input label="Customer Name" value={form.name} onChange={u('name')} required />
                <Input label="Business Name" value={form.businessName} onChange={u('businessName')} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Phone" type="tel" value={form.phone} onChange={u('phone')} />
                <Input label="Email" type="email" value={form.email} onChange={u('email')} />
              </div>
              <Select label="Customer Type" value={form.businessType}
                onChange={(e) => setForm((p) => ({ ...p, businessType: e.target.value as 'b2b' | 'b2c' | 'export' }))}
                options={[
                  { value: 'b2b', label: 'B2B (Registered business)' },
                  { value: 'b2c', label: 'B2C (Individual/Unregistered)' },
                  { value: 'export', label: 'Export' },
                ]}
              />
              {form.businessType === 'b2b' && (
                <GSTINInput value={form.gstin} onChange={(v) => setForm((p) => ({ ...p, gstin: v }))}
                  onValidated={(r) => {
                    setGstinState({ state: r.state, stateCode: r.stateCode })
                    if (r.state) setForm((p) => ({ ...p, state: r.state!, stateCode: r.stateCode! }))
                  }}
                />
              )}
              <Select label="Payment Terms" value={String(form.paymentTermsDays)}
                onChange={(e) => setForm((p) => ({ ...p, paymentTermsDays: Number(e.target.value) }))}
                options={[
                  { value: '0', label: 'Due immediately' },
                  { value: '7', label: '7 days' },
                  { value: '14', label: '14 days' },
                  { value: '30', label: '30 days' },
                  { value: '45', label: '45 days' },
                  { value: '60', label: '60 days' },
                ]}
              />
            </div>
          </div>

          <div className="rounded-xl bg-white p-5" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>Billing Address</h2>
            <div className="flex flex-col gap-3">
              <Input label="Address Line 1" value={form.line1} onChange={u('line1')} required />
              <div className="grid grid-cols-2 gap-3">
                <Input label="City" value={form.city} onChange={u('city')} required />
                <Input label="PIN Code" value={form.pincode} onChange={u('pincode')} required />
              </div>
              <Select label="State" value={form.stateCode}
                onChange={(e) => setForm((p) => ({ ...p, stateCode: e.target.value, state: STATE_CODES[e.target.value] || '' }))}
                options={STATE_OPTIONS}
                placeholder="Select state"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => router.back()}
              className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-ink-50 transition-colors"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 h-10 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors disabled:opacity-50">
              {saving ? 'Saving...' : editing ? 'Update Customer' : 'Add Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
