'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePurchaseStore } from '@/lib/store/purchaseStore'
import { useUIStore } from '@/lib/store/uiStore'
import { generateId } from '@/lib/utils/ids'
import { TopBar } from '../app/TopBar'
import { Input } from '../ui/Input'
import { Textarea } from '../ui/Textarea'
import { Save } from 'lucide-react'
import type { Vendor } from '@/types/purchase'

export function VendorFormClient({ editId }: { editId?: string }) {
  const router = useRouter()
  const { vendors, addVendor, updateVendor } = usePurchaseStore()
  const { addToast } = useUIStore()

  const existing = editId ? vendors.find((v) => v.id === editId) : null

  const [name, setName] = useState(existing?.name || '')
  const [businessName, setBusinessName] = useState(existing?.businessName || '')
  const [gstin, setGstin] = useState(existing?.gstin || '')
  const [phone, setPhone] = useState(existing?.phone || '')
  const [email, setEmail] = useState(existing?.email || '')
  const [line1, setLine1] = useState(existing?.address.line1 || '')
  const [city, setCity] = useState(existing?.address.city || '')
  const [state, setState] = useState(existing?.address.state || '')
  const [pincode, setPincode] = useState(existing?.address.pincode || '')
  const [notes, setNotes] = useState(existing?.notes || '')

  const stateCode = gstin.length >= 2 ? gstin.slice(0, 2) : ''

  const handleSave = () => {
    if (!name.trim()) { addToast({ type: 'error', title: 'Vendor name is required' }); return }
    const vendor: Vendor = {
      id: existing?.id || generateId(),
      name: name.trim(),
      businessName: businessName.trim() || null,
      gstin: gstin.trim().toUpperCase() || null,
      gstinState: state.trim() || null,
      gstinStateCode: stateCode || null,
      phone: phone.trim() || null,
      email: email.trim() || null,
      address: { line1: line1.trim(), line2: null, city: city.trim(), state: state.trim(), stateCode, pincode: pincode.trim() },
      totalPurchases: existing?.totalPurchases || 0,
      totalItcClaimed: existing?.totalItcClaimed || 0,
      notes: notes.trim() || null,
      createdAt: existing?.createdAt || new Date().toISOString(),
    }
    if (existing) { updateVendor(existing.id, vendor); addToast({ type: 'success', title: 'Vendor updated' }) }
    else { addVendor(vendor); addToast({ type: 'success', title: 'Vendor added' }) }
    router.push('/vendors')
  }

  return (
    <div className="flex flex-col flex-1">
      <TopBar
        title={existing ? 'Edit Vendor' : 'New Vendor'}
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Vendors', href: '/vendors' }]}
      />
      <div className="flex-1 p-4 lg:p-6 max-w-2xl mx-auto w-full flex flex-col gap-6">
        <div className="rounded-xl bg-white p-4" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>Basic Information</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Input label="Contact Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ramesh Gupta" required />
            <Input label="Business Name" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="e.g. Gupta Steel & Metals" />
            <Input label="GSTIN" value={gstin} onChange={(e) => setGstin(e.target.value.toUpperCase())} placeholder="e.g. 08AABCG5678B1Z7" maxLength={15} />
            <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile" />
            <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vendor@example.com" />
          </div>
        </div>

        <div className="rounded-xl bg-white p-4" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>Address</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Input label="Address Line 1" value={line1} onChange={(e) => setLine1(e.target.value)} placeholder="Street, Area" />
            <Input label="City" value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
            <Input label="State" value={state} onChange={(e) => setState(e.target.value)} placeholder="State" />
            <Input label="Pincode" value={pincode} onChange={(e) => setPincode(e.target.value)} placeholder="6-digit pincode" maxLength={6} />
          </div>
        </div>

        <Textarea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Internal notes about this vendor..." />

        <div className="flex gap-3 justify-end">
          <button onClick={() => router.back()} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}>Cancel</button>
          <button onClick={handleSave} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors">
            <Save className="w-4 h-4" /> {existing ? 'Update Vendor' : 'Add Vendor'}
          </button>
        </div>
      </div>
    </div>
  )
}
