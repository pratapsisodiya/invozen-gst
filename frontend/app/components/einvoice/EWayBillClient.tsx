'use client'
import { useState } from 'react'
import { useUIStore } from '@/lib/store/uiStore'
import { useBusinessStore } from '@/lib/store/businessStore'
import { downloadEWayBillJSON } from '@/lib/ewaybill/ewaybillGenerator'
import type { EWayBillDetails } from '@/lib/ewaybill/ewaybillGenerator'
import type { Invoice } from '@/types/invoice'
import { Truck, Download } from 'lucide-react'

const TRANSPORT_MODES = [
  { value: '1', label: 'Road' },
  { value: '2', label: 'Rail' },
  { value: '3', label: 'Air' },
  { value: '4', label: 'Ship' },
]

export function EWayBillClient({ invoice }: { invoice: Invoice }) {
  const { profile } = useBusinessStore()
  const { addToast } = useUIStore()
  const [form, setForm] = useState<EWayBillDetails>({
    transporterName: '',
    transporterId: '',
    vehicleNumber: '',
    vehicleType: 'R',
    transportMode: '1',
    distance: 0,
    transDocNumber: null,
    transDocDate: null,
  })

  const isRequired = invoice.grandTotal >= 50000

  const handleGenerate = () => {
    if (!form.vehicleNumber && form.transportMode === '1') {
      addToast({ type: 'error', title: 'Vehicle number is required for road transport' })
      return
    }
    downloadEWayBillJSON(invoice, profile, form)
    addToast({ type: 'success', title: 'E-Way Bill JSON downloaded', message: 'Upload to NIC portal to generate EWB number' })
  }

  return (
    <div className="rounded-xl bg-white overflow-hidden" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
      <div className="px-4 py-3 flex items-center gap-2" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <Truck className="w-4 h-4 text-brand-600" />
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>E-Way Bill</h3>
        {isRequired && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-warn-50 text-warn-700 ml-auto">Required (≥₹50K)</span>}
        {!isRequired && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 ml-auto">Optional (&lt;₹50K)</span>}
      </div>

      <div className="p-4 flex flex-col gap-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--text-2)' }}>Transport Mode</label>
            <select value={form.transportMode} onChange={(e) => setForm({ ...form, transportMode: e.target.value as EWayBillDetails['transportMode'] })}
              className="w-full h-9 rounded-lg border px-3 text-sm outline-none" style={{ borderColor: 'var(--border)' }}>
              {TRANSPORT_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--text-2)' }}>Vehicle Number</label>
            <input value={form.vehicleNumber} onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value.toUpperCase() })}
              placeholder="MH01AB1234"
              className="w-full h-9 rounded-lg border px-3 text-sm outline-none" style={{ borderColor: 'var(--border)' }} />
          </div>
          <div>
            <label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--text-2)' }}>Transporter Name</label>
            <input value={form.transporterName} onChange={(e) => setForm({ ...form, transporterName: e.target.value })}
              placeholder="Optional"
              className="w-full h-9 rounded-lg border px-3 text-sm outline-none" style={{ borderColor: 'var(--border)' }} />
          </div>
          <div>
            <label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--text-2)' }}>Distance (km)</label>
            <input type="number" value={form.distance || ''} onChange={(e) => setForm({ ...form, distance: parseInt(e.target.value) || 0 })}
              placeholder="0"
              className="w-full h-9 rounded-lg border px-3 text-sm outline-none" style={{ borderColor: 'var(--border)' }} />
          </div>
        </div>

        <button onClick={handleGenerate}
          className="flex items-center justify-center gap-2 w-full h-9 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors">
          <Download className="w-4 h-4" /> Generate E-Way Bill JSON
        </button>
        <p className="text-[11px] text-center" style={{ color: 'var(--text-muted)' }}>
          Upload the JSON to <a href="https://ewaybillgst.gov.in" target="_blank" rel="noopener noreferrer" className="text-brand-600">ewaybillgst.gov.in</a> to get the EWB number
        </p>
      </div>
    </div>
  )
}
