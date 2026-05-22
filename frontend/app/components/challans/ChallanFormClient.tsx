'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useChallanStore } from '@/lib/store/challanStore'
import { useCustomerStore } from '@/lib/store/customerStore'
import { useBusinessStore } from '@/lib/store/businessStore'
import { useUIStore } from '@/lib/store/uiStore'
import { generateId } from '@/lib/utils/ids'
import { TopBar } from '../app/TopBar'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Textarea } from '../ui/Textarea'
import { Plus, Trash2, Search, Save, Send } from 'lucide-react'
import type { DeliveryChallan, ChallanLineItem, ChallanType } from '@/types/challan'
import { CHALLAN_TYPE_LABELS } from '@/types/challan'
import type { Customer } from '@/types/customer'

function emptyLine(): ChallanLineItem {
  return { id: generateId(), itemId: null, description: '', hsnSac: '', quantity: 1, unit: 'NOS', rate: 0, totalValue: 0 }
}

export function ChallanFormClient() {
  const router = useRouter()
  const { challans, addChallan } = useChallanStore()
  const { customers } = useCustomerStore()
  const { profile } = useBusinessStore()
  const { addToast } = useUIStore()

  const today = new Date().toISOString().split('T')[0]

  const [challanType, setChallanType] = useState<ChallanType>('job_work')
  const [challanDate, setChallanDate] = useState(today)
  const [custSearch, setCustSearch] = useState('')
  const [showCustDrop, setShowCustDrop] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [toName, setToName] = useState('')
  const [toGstin, setToGstin] = useState('')
  const [toAddress, setToAddress] = useState('')
  const [toState, setToState] = useState('')
  const [toStateCode, setToStateCode] = useState('')
  const [toPincode, setToPincode] = useState('')
  const [lines, setLines] = useState<ChallanLineItem[]>([emptyLine()])
  const [transporterName, setTransporterName] = useState('')
  const [vehicleNumber, setVehicleNumber] = useState('')
  const [transportMode, setTransportMode] = useState('Road')
  const [distance, setDistance] = useState('')
  const [ewayBillNumber, setEwayBillNumber] = useState('')
  const [reasonForTransport, setReasonForTransport] = useState('')
  const [expectedReturnDate, setExpectedReturnDate] = useState('')
  const [notes, setNotes] = useState('')

  const custResults = useMemo(() => {
    if (!custSearch) return customers.slice(0, 6)
    const q = custSearch.toLowerCase()
    return customers.filter((c) => c.name.toLowerCase().includes(q) || c.businessName?.toLowerCase().includes(q)).slice(0, 6)
  }, [customers, custSearch])

  const selectCustomer = (c: Customer) => {
    setSelectedCustomer(c)
    setCustSearch(c.businessName || c.name)
    setToName(c.businessName || c.name)
    setToGstin(c.gstin || '')
    setToAddress(c.billingAddress.line1 + (c.billingAddress.line2 ? ', ' + c.billingAddress.line2 : ''))
    setToState(c.billingAddress.state)
    setToStateCode(c.billingAddress.stateCode)
    setToPincode(c.billingAddress.pincode)
    setShowCustDrop(false)
  }

  const updateLine = (id: string, field: keyof ChallanLineItem, value: string | number) => {
    setLines((prev) => prev.map((l) => {
      if (l.id !== id) return l
      const updated = { ...l, [field]: value }
      updated.totalValue = Math.round(updated.quantity * updated.rate * 100) / 100
      return updated
    }))
  }

  const totalValue = useMemo(() => Math.round(lines.reduce((s, l) => s + l.totalValue, 0) * 100) / 100, [lines])

  const challanNumber = `DC-${new Date().getFullYear()}-${String(challans.length + 1).padStart(3, '0')}`

  const handleSave = (asDraft: boolean) => {
    if (!toName.trim()) { addToast({ type: 'error', title: 'To party name is required' }); return }
    if (lines.every((l) => !l.description.trim())) { addToast({ type: 'error', title: 'Add at least one item' }); return }

    const challan: DeliveryChallan = {
      id: generateId(),
      challanNumber,
      challanType,
      status: asDraft ? 'draft' : 'issued',
      challanDate,
      fromName: profile.businessName,
      fromGstin: profile.gstin || null,
      fromAddress: profile.billingAddress.line1 + ', ' + profile.billingAddress.city,
      fromState: profile.billingAddress.state,
      fromStateCode: profile.billingAddress.stateCode,
      fromPincode: profile.billingAddress.pincode,
      customerId: selectedCustomer?.id || null,
      toName: toName.trim(),
      toGstin: toGstin.trim() || null,
      toAddress: toAddress.trim(),
      toState: toState.trim(),
      toStateCode: toStateCode.trim(),
      toPincode: toPincode.trim(),
      lineItems: lines.filter((l) => l.description.trim()),
      totalValue,
      transporterName: transporterName.trim(),
      vehicleNumber: vehicleNumber.trim(),
      transportMode: transportMode.trim(),
      distance: distance ? parseFloat(distance) : null,
      ewayBillNumber: ewayBillNumber.trim() || null,
      expectedReturnDate: expectedReturnDate || null,
      actualReturnDate: null,
      convertedToInvoiceId: null,
      convertedToInvoiceNumber: null,
      reasonForTransport: reasonForTransport.trim() || CHALLAN_TYPE_LABELS[challanType],
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    addChallan(challan)
    addToast({ type: 'success', title: asDraft ? 'Challan saved as draft' : 'Challan issued' })
    router.push('/challans')
  }

  return (
    <div className="flex flex-col flex-1">
      <TopBar title="New Delivery Challan" breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Challans', href: '/challans' }]} />
      <div className="flex-1 p-4 lg:p-6 max-w-4xl mx-auto w-full flex flex-col gap-6">

        {/* Challan Details */}
        <div className="rounded-xl bg-white p-4" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Challan Details</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">Rule 55 CGST Rules — NOT a Tax Invoice</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-[13px] font-medium block mb-1" style={{ color: 'var(--text-2)' }}>Challan Number</label>
              <input value={challanNumber} readOnly className="w-full h-9 rounded-lg border px-3 text-sm font-mono bg-gray-50 outline-none"
                style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }} />
            </div>
            <Input type="date" label="Challan Date" value={challanDate} onChange={(e) => setChallanDate(e.target.value)} required />
            <Select label="Challan Type" value={challanType} onChange={(e) => setChallanType(e.target.value as ChallanType)}
              options={Object.entries(CHALLAN_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
          </div>
        </div>

        {/* To Party */}
        <div className="rounded-xl bg-white p-4" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>Consignee (To Party)</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="relative">
              <label className="text-[13px] font-medium block mb-1" style={{ color: 'var(--text-2)' }}>Search Customer (optional)</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                <input value={custSearch} onChange={(e) => { setCustSearch(e.target.value); setShowCustDrop(true) }} onFocus={() => setShowCustDrop(true)}
                  placeholder="Search customers..." className="w-full h-10 rounded-lg border pl-9 pr-3 text-sm outline-none"
                  style={{ border: '1px solid var(--border)', color: 'var(--text)' }} />
              </div>
              {showCustDrop && custResults.length > 0 && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowCustDrop(false)} />
                  <div className="absolute left-0 right-0 top-full mt-1 z-20 rounded-xl py-1 max-h-48 overflow-y-auto"
                    style={{ background: 'white', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}>
                    {custResults.map((c) => (
                      <button key={c.id} onClick={() => selectCustomer(c)}
                        className="flex flex-col w-full px-3 py-2 text-left hover:bg-ink-50">
                        <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{c.businessName || c.name}</span>
                        {c.gstin && <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{c.gstin}</span>}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <Input label="Party Name *" value={toName} onChange={(e) => setToName(e.target.value)} placeholder="Business / Individual name" required />
            <Input label="GSTIN (if applicable)" value={toGstin} onChange={(e) => setToGstin(e.target.value)} placeholder="27ABCDE1234F1Z5" />
            <Input label="Address" value={toAddress} onChange={(e) => setToAddress(e.target.value)} placeholder="Street address" />
            <Input label="State" value={toState} onChange={(e) => setToState(e.target.value)} placeholder="e.g. Maharashtra" />
            <Input label="Pincode" value={toPincode} onChange={(e) => setToPincode(e.target.value)} placeholder="400001" />
          </div>
        </div>

        {/* Line Items — NO GST columns */}
        <div className="rounded-xl bg-white p-4" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Items / Goods</h3>
            <span className="text-xs text-gray-400">(No GST columns — challan is not a tax document)</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Description', 'HSN/SAC', 'Qty', 'Unit', 'Rate (₹)', 'Value (₹)', ''].map((h) => (
                    <th key={h} className="pb-2 text-left text-[11px] font-semibold uppercase pr-2" style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="py-2 pr-2"><input value={l.description} onChange={(e) => updateLine(l.id, 'description', e.target.value)}
                      className="w-full min-w-[160px] h-8 px-2 rounded border text-sm outline-none" style={{ border: '1px solid var(--border)' }} placeholder="Item description" /></td>
                    <td className="py-2 pr-2"><input value={l.hsnSac} onChange={(e) => updateLine(l.id, 'hsnSac', e.target.value)}
                      className="w-20 h-8 px-2 rounded border text-sm font-mono outline-none" style={{ border: '1px solid var(--border)' }} /></td>
                    <td className="py-2 pr-2"><input type="number" min="0" value={l.quantity} onChange={(e) => updateLine(l.id, 'quantity', Number(e.target.value))}
                      className="w-16 h-8 px-2 rounded border text-sm text-right outline-none" style={{ border: '1px solid var(--border)' }} /></td>
                    <td className="py-2 pr-2"><input value={l.unit} onChange={(e) => updateLine(l.id, 'unit', e.target.value)}
                      className="w-14 h-8 px-2 rounded border text-sm outline-none" style={{ border: '1px solid var(--border)' }} /></td>
                    <td className="py-2 pr-2"><input type="number" min="0" value={l.rate} onChange={(e) => updateLine(l.id, 'rate', Number(e.target.value))}
                      className="w-24 h-8 px-2 rounded border text-sm text-right outline-none" style={{ border: '1px solid var(--border)' }} /></td>
                    <td className="py-2 pr-2 text-right text-sm font-medium" style={{ color: 'var(--text)' }}>{l.totalValue.toLocaleString('en-IN')}</td>
                    <td className="py-2"><button onClick={() => setLines((p) => p.filter((x) => x.id !== l.id))} disabled={lines.length === 1}
                      className="p-1 rounded hover:bg-err-50 disabled:opacity-30"><Trash2 className="w-3.5 h-3.5 text-err-500" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between items-center mt-3">
            <button onClick={() => setLines((p) => [...p, emptyLine()])} className="flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-medium">
              <Plus className="w-4 h-4" /> Add Item
            </button>
            <div className="text-sm font-bold" style={{ color: 'var(--text)' }}>
              Total Value: <span className="text-brand-700">₹{totalValue.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Transport Details */}
        <div className="rounded-xl bg-white p-4" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>Transport Details</h3>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Input label="Reason for Transport" value={reasonForTransport} onChange={(e) => setReasonForTransport(e.target.value)}
              placeholder={CHALLAN_TYPE_LABELS[challanType]} />
            <Input label="Transporter Name" value={transporterName} onChange={(e) => setTransporterName(e.target.value)} placeholder="Optional" />
            <Input label="Vehicle Number" value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} placeholder="MH01AB1234" />
            <Select label="Mode of Transport" value={transportMode} onChange={(e) => setTransportMode(e.target.value)}
              options={['Road', 'Rail', 'Air', 'Ship'].map((m) => ({ value: m, label: m }))} />
            <Input label="Distance (km)" type="number" value={distance} onChange={(e) => setDistance(e.target.value)} placeholder="0" />
            <Input label="E-Way Bill Number" value={ewayBillNumber} onChange={(e) => setEwayBillNumber(e.target.value)} placeholder="If applicable" />
            {(challanType === 'supply_on_approval' || challanType === 'job_work') && (
              <Input type="date" label="Expected Return Date" value={expectedReturnDate} onChange={(e) => setExpectedReturnDate(e.target.value)} />
            )}
          </div>
        </div>

        <Textarea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />

        <div className="flex gap-3 justify-end">
          <button onClick={() => router.back()} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}>Cancel</button>
          <button onClick={() => handleSave(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-ink-100 hover:bg-ink-200" style={{ color: 'var(--text)' }}>
            <Save className="w-4 h-4" /> Save Draft
          </button>
          <button onClick={() => handleSave(false)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors">
            <Send className="w-4 h-4" /> Issue Challan
          </button>
        </div>
      </div>
    </div>
  )
}
