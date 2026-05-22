'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCAStore } from '@/lib/store/caStore'
import { TopBar } from '../app/TopBar'
import { Modal } from '../ui/Modal'
import { useUIStore } from '@/lib/store/uiStore'
import type { CAClient } from '@/types/ca'
import { generateId } from '@/lib/utils/ids'
import { Plus, Building2, AlertCircle, CheckCircle2, Clock, ExternalLink } from 'lucide-react'

function ComplianceIndicator({ score }: { score: number }) {
  const color = score >= 75 ? 'text-ok-600' : score >= 50 ? 'text-warn-600' : 'text-err-600'
  const bg = score >= 75 ? 'bg-ok-50' : score >= 50 ? 'bg-warn-50' : 'bg-err-50'
  return (
    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${bg} ${color}`}>{score}</span>
  )
}

const MOCK_SCORE = () => Math.floor(60 + Math.random() * 40)

export function CADashboardClient() {
  const router = useRouter()
  const { clients, addClient, removeClient } = useCAStore()
  const { addToast } = useUIStore()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({
    businessName: '',
    gstin: '',
    state: '',
    filingFrequency: 'monthly' as 'monthly' | 'quarterly',
    contactName: '',
    contactPhone: '',
    contactEmail: '',
  })

  const handleAdd = () => {
    if (!form.businessName || !form.gstin) {
      addToast({ type: 'error', title: 'Business name and GSTIN are required' })
      return
    }
    addClient({
      ...form,
      nextFilingDue: new Date(new Date().getFullYear(), new Date().getMonth(), 20).toISOString(),
      lastFiledDate: null,
      pendingInvoices: 0,
      outstandingAmount: 0,
      complianceScore: MOCK_SCORE(),
      status: 'active',
    })
    setShowAdd(false)
    setForm({ businessName: '', gstin: '', state: '', filingFrequency: 'monthly', contactName: '', contactPhone: '', contactEmail: '' })
    addToast({ type: 'success', title: 'Client added to CA dashboard' })
  }

  const totalClients = clients.length
  const overdueClients = clients.filter((c) => c.nextFilingDue && new Date(c.nextFilingDue) < new Date()).length
  const avgScore = clients.length === 0 ? 0 : Math.round(clients.reduce((s, c) => s + c.complianceScore, 0) / clients.length)

  return (
    <div className="flex flex-col flex-1">
      <TopBar
        title="CA Multi-Client Dashboard"
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }]}
        actions={
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> Add Client
          </button>
        }
      />

      <div className="flex-1 p-4 lg:p-6 flex flex-col gap-5">
        {/* Summary KPIs */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total Clients', value: totalClients, icon: Building2, color: 'text-brand-600' },
            { label: 'Filings Overdue', value: overdueClients, icon: AlertCircle, color: 'text-err-600' },
            { label: 'Avg Compliance Score', value: `${avgScore}/100`, icon: CheckCircle2, color: 'text-ok-600' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-xl p-4 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <Icon className={`w-5 h-5 mx-auto mb-1 ${color}`} />
              <p className={`text-xl font-bold tabular-nums ${color}`}>{value}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Client grid */}
        {clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Building2 className="w-12 h-12 mb-4 text-brand-600 opacity-30" />
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>No clients added yet</p>
            <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>Add your client businesses to track their compliance and filings</p>
            <button onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors">
              <Plus className="w-4 h-4" /> Add First Client
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {clients.map((client) => {
              const isOverdue = client.nextFilingDue && new Date(client.nextFilingDue) < new Date()
              return (
                <div key={client.id} className="rounded-xl bg-white p-4 flex flex-col gap-3"
                  style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{client.businessName}</p>
                      <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{client.gstin}</p>
                    </div>
                    <ComplianceIndicator score={client.complianceScore} />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p style={{ color: 'var(--text-muted)' }}>Contact</p>
                      <p className="font-medium" style={{ color: 'var(--text)' }}>{client.contactName || '—'}</p>
                    </div>
                    <div>
                      <p style={{ color: 'var(--text-muted)' }}>Filing</p>
                      <p className="font-medium capitalize" style={{ color: 'var(--text)' }}>{client.filingFrequency}</p>
                    </div>
                  </div>

                  <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg ${isOverdue ? 'bg-err-50 text-err-700' : 'bg-ok-50 text-ok-700'}`}>
                    {isOverdue
                      ? <><AlertCircle className="w-3 h-3" /> Filing Overdue</>
                      : <><Clock className="w-3 h-3" /> Next Due: {client.nextFilingDue ? new Date(client.nextFilingDue).toLocaleDateString('en-IN') : '—'}</>}
                  </div>

                  <div className="flex gap-2">
                    <button
                      className="flex-1 h-7 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-medium transition-colors flex items-center justify-center gap-1"
                      onClick={() => router.push(`/dashboard?clientId=${client.id}&clientName=${encodeURIComponent(client.businessName)}`)}>
                      <ExternalLink className="w-3 h-3" /> Open Client
                    </button>
                    <button onClick={() => { if (confirm(`Remove ${client.businessName}?`)) removeClient(client.id) }}
                      className="h-7 w-7 rounded-lg hover:bg-err-50 text-err-600 flex items-center justify-center transition-colors">
                      ×
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Client Business" size="sm">
        <div className="p-5 flex flex-col gap-3">
          {[
            { label: 'Business Name *', key: 'businessName', placeholder: 'e.g. Sharma Enterprises' },
            { label: 'GSTIN *', key: 'gstin', placeholder: '27ABCDE1234F1Z5' },
            { label: 'State', key: 'state', placeholder: 'Maharashtra' },
            { label: 'Contact Person', key: 'contactName', placeholder: 'Ravi Sharma' },
            { label: 'Contact Phone', key: 'contactPhone', placeholder: '9876543210' },
            { label: 'Contact Email', key: 'contactEmail', placeholder: 'ravi@example.com' },
          ].map(({ label, key, placeholder }) => (
            <div key={key}>
              <label className="text-[13px] font-medium mb-1 block" style={{ color: 'var(--text-2)' }}>{label}</label>
              <input
                value={form[key as keyof typeof form]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                placeholder={placeholder}
                className="w-full h-9 rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-brand-600/20"
                style={{ borderColor: 'var(--border)' }} />
            </div>
          ))}
          <div>
            <label className="text-[13px] font-medium mb-1 block" style={{ color: 'var(--text-2)' }}>Filing Frequency</label>
            <select value={form.filingFrequency} onChange={(e) => setForm({ ...form, filingFrequency: e.target.value as 'monthly' | 'quarterly' })}
              className="w-full h-9 rounded-lg border px-3 text-sm outline-none" style={{ borderColor: 'var(--border)' }}>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2 px-5 pb-5">
          <button onClick={() => setShowAdd(false)} className="flex-1 h-9 rounded-lg border text-sm font-medium hover:bg-ink-50" style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>Cancel</button>
          <button onClick={handleAdd} className="flex-1 h-9 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors">Add Client</button>
        </div>
      </Modal>
    </div>
  )
}
