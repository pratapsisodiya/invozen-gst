'use client'
import { useState, useEffect } from 'react'
import { Modal } from '../ui/Modal'
import { Loader2, FileText, Sparkles, AlertCircle } from 'lucide-react'
import { useUIStore } from '@/lib/store/uiStore'
import type { PurchaseInvoice } from '@/types/purchase'
import type { BusinessProfile } from '@/types/business'
import { AmountDisplay } from '../ui/AmountDisplay'

interface AIPDFAssistModalProps {
  open: boolean
  onClose: () => void
  purchase: PurchaseInvoice
  profile: BusinessProfile
}

export function AIPDFAssistModal({
  open,
  onClose,
  purchase,
  profile
}: AIPDFAssistModalProps) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ headline: string; bullets: string[] } | null>(null)
  const { addToast } = useUIStore()

  useEffect(() => {
    if (open && !result) {
      void analyzePurchase()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const analyzePurchase = async () => {
    setLoading(true)
    try {
      // Build highlights and metrics for AI
      const highlights = purchase.lineItems.map(
        li => `${li.description}: ₹${li.totalAmount} (GST ${li.gstRate}%) - ITC ${li.itcEligible ? 'Eligible' : 'Blocked'}`
      )
      if (purchase.notes) highlights.push(`Notes: ${purchase.notes}`)

      const metrics = [
        { label: 'Vendor', value: purchase.vendorSnapshot.name },
        { label: 'GSTIN', value: purchase.vendorSnapshot.gstin || 'Unregistered' },
        { label: 'Taxable Value', value: `₹${purchase.taxableValue}` },
        { label: 'Total Tax', value: `₹${purchase.totalTax}` },
        { label: 'Grand Total', value: `₹${purchase.grandTotal}` },
        { label: 'ITC Available', value: `₹${purchase.itcAvailable}` },
      ]

      const res = await fetch('/api/ai/pdf-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType: 'Purchase Invoice',
          businessName: profile.businessName,
          summary: `Invoice ${purchase.vendorInvoiceNumber} from ${purchase.vendorSnapshot.name}.`,
          highlights,
          metrics,
        })
      })

      if (!res.ok) throw new Error('Analysis failed')
      const data = await res.json() as { headline: string; bullets: string[] }
      setResult(data)
    } catch {
      addToast({ type: 'error', title: 'AI Error', message: 'Could not analyze document' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="AI Document Review" size="md">
      <div className="p-5 flex flex-col gap-4">
        <div className="flex items-start gap-3 p-3 rounded-lg" style={{ background: 'var(--brand-50)', border: '1px solid var(--brand-100)' }}>
          <Sparkles className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
          <p className="text-sm" style={{ color: 'var(--brand-700)' }}>
            AI is analyzing the purchase invoice metadata for compliance, ITC blocks, and key takeaways.
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
            <p className="text-sm text-brand-600 font-medium">Scanning invoice data...</p>
          </div>
        ) : result ? (
          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-semibold text-brand-700">{result.headline}</h3>
            <div className="flex flex-col gap-2">
              {result.bullets.map((bullet, i) => (
                <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-white" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                  <AlertCircle className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
                  <p className="text-sm" style={{ color: 'var(--text)' }}>{bullet}</p>
                </div>
              ))}
            </div>
            
            <div className="mt-2 pt-4 border-t flex flex-wrap gap-2" style={{ borderColor: 'var(--border)' }}>
              <span className="px-2 py-1 bg-ink-50 rounded text-xs font-medium" style={{ color: 'var(--text-2)' }}>
                ITC Available: ₹{purchase.itcAvailable}
              </span>
              <span className="px-2 py-1 bg-ink-50 rounded text-xs font-medium" style={{ color: 'var(--text-2)' }}>
                Total Tax: ₹{purchase.totalTax}
              </span>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex px-5 pb-5">
        <button onClick={onClose} className="w-full h-10 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors">
          Close
        </button>
      </div>
    </Modal>
  )
}
