'use client'
import { useState, useCallback } from 'react'
import { usePaymentStore } from '@/lib/store/paymentStore'
import { useInvoiceStore } from '@/lib/store/invoiceStore'
import { useUIStore } from '@/lib/store/uiStore'
import { TopBar } from '../app/TopBar'
import { Modal } from '../ui/Modal'
import { parseCSV, reconcile } from '@/lib/bankRecon/bankReconEngine'
import type { BankReconResult, BankTransaction, ReconMatch } from '@/lib/bankRecon/bankReconEngine'
import { generateId } from '@/lib/utils/ids'
import type { Payment } from '@/types/payment'
import { Upload, CheckCircle2, AlertTriangle, XCircle, Check } from 'lucide-react'

interface AISuggestedMatch {
  invoiceId: string | null
  confidence: 'high' | 'medium' | 'low'
  reasoning: string
  suggestedAction: 'link_invoice' | 'record_advance'
}

export function BankReconClient() {
  const { payments, addPayment } = usePaymentStore()
  const { invoices, markAsPaid } = useInvoiceStore()
  const { addToast } = useUIStore()
  const [result, setResult] = useState<BankReconResult | null>(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')
  const [fileName, setFileName] = useState('')
  const [reconciledIds, setReconciledIds] = useState<Set<string>>(new Set())
  const [selectedMatched, setSelectedMatched] = useState<Set<number>>(new Set())
  const [showRecordModal, setShowRecordModal] = useState(false)
  const [recordingTxn, setRecordingTxn] = useState<BankTransaction | null>(null)
  const [recordInvoiceId, setRecordInvoiceId] = useState('')
  const [invoiceSearch, setInvoiceSearch] = useState('')
  const [aiMatching, setAiMatching] = useState(false)
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestedMatch | null>(null)

  const processFile = useCallback((file: File) => {
    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file from your bank (net banking statement export)')
      return
    }
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const txns = parseCSV(text)
      if (txns.length === 0) {
        setError('Could not parse the CSV file. Ensure it has Date, Description, Credit, Debit columns.')
        return
      }
      setError('')
      setResult(reconcile(txns, payments))
      setReconciledIds(new Set())
      setSelectedMatched(new Set())
    }
    reader.readAsText(file)
  }, [payments])

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  const toggleMatchSelect = (idx: number) => {
    setSelectedMatched((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx); else next.add(idx)
      return next
    })
  }

  const selectAllMatched = () => {
    if (!result) return
    const unreconciled = result.matched
      .map((_, i) => i)
      .filter((i) => !reconciledIds.has(result.matched[i].payment.id))
    setSelectedMatched(new Set(unreconciled))
  }

  const handleReconcileSelected = async () => {
    if (!result || selectedMatched.size === 0) return
    let count = 0
    const newReconciled = new Set(reconciledIds)

    for (const idx of selectedMatched) {
      const match: ReconMatch = result.matched[idx]
      if (newReconciled.has(match.payment.id)) continue
      newReconciled.add(match.payment.id)
      // If the payment is linked to an invoice, mark it as paid
      if (match.payment.invoiceId) {
        const inv = invoices.find((i) => i.id === match.payment.invoiceId)
        if (inv && inv.status !== 'paid') {
          await markAsPaid(inv.id, match.bank.credit)
        }
      }
      count++
    }

    setReconciledIds(newReconciled)
    setSelectedMatched(new Set())
    addToast({ type: 'success', title: `${count} transaction${count !== 1 ? 's' : ''} reconciled` })
  }

  const openRecordModal = (txn: BankTransaction) => {
    setRecordingTxn(txn)
    setRecordInvoiceId('')
    setInvoiceSearch('')
    setAiSuggestion(null)
    setShowRecordModal(true)
  }

  const handleAISuggestMatch = async () => {
    if (!recordingTxn || aiMatching) return
    setAiMatching(true)
    try {
      const res = await fetch('/api/ai/bank-recon-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction: {
            description: recordingTxn.description,
            amount: recordingTxn.credit,
            date: recordingTxn.date,
            reference: recordingTxn.reference,
          },
          candidates: unmatchedOutstanding.slice(0, 20).map((invoice) => ({
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            customerName: invoice.customerSnapshot.name,
            balanceDue: invoice.balanceDue,
            dueDate: invoice.dueDate,
          })),
        }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json() as AISuggestedMatch
      setAiSuggestion(data)
      if (data.invoiceId) {
        const invoice = unmatchedOutstanding.find((item) => item.id === data.invoiceId)
        if (invoice) {
          setRecordInvoiceId(invoice.id)
          setInvoiceSearch(`${invoice.invoiceNumber} — ${invoice.customerSnapshot.name}`)
        }
      }
    } catch {
      addToast({ type: 'error', title: 'AI match failed', message: 'Try selecting the invoice manually.' })
    } finally {
      setAiMatching(false)
    }
  }

  const handleRecordPayment = async () => {
    if (!recordingTxn) return
    const inv = invoices.find((i) => i.id === recordInvoiceId || i.invoiceNumber === invoiceSearch)
    const payment: Payment = {
      id: generateId(),
      invoiceId: inv?.id || null,
      customerId: inv?.customerId || '',
      amount: recordingTxn.credit,
      paymentDate: recordingTxn.date,
      method: 'neft',
      reference: recordingTxn.reference || null,
      notes: `Reconciled from bank: ${recordingTxn.description}`,
      isAdvance: !inv,
      advanceAdjustedInvoiceId: null,
      createdAt: new Date().toISOString(),
    }
    await addPayment(payment)
    if (inv) await markAsPaid(inv.id, recordingTxn.credit)
    setShowRecordModal(false)
    addToast({ type: 'success', title: 'Payment recorded', message: `₹${recordingTxn.credit.toLocaleString('en-IN')} from bank statement` })
  }

  const unmatchedOutstanding = invoices.filter((i) => (i.status === 'sent' || i.status === 'overdue') && i.balanceDue > 0)
  const invoiceOptions = invoiceSearch
    ? unmatchedOutstanding.filter((i) => i.invoiceNumber.toLowerCase().includes(invoiceSearch.toLowerCase()) || i.customerSnapshot.name.toLowerCase().includes(invoiceSearch.toLowerCase()))
    : unmatchedOutstanding.slice(0, 8)

  const unreconciledCount = result ? result.matched.filter((m) => !reconciledIds.has(m.payment.id)).length : 0

  return (
    <div className="flex flex-col flex-1">
      <TopBar title="Bank Reconciliation" breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }]} />

      <div className="flex-1 p-4 lg:p-6 flex flex-col gap-5">
        <div className="rounded-xl p-4 text-sm" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="font-semibold mb-1" style={{ color: 'var(--text)' }}>How to use Bank Reconciliation</p>
          <ol className="list-decimal pl-4 space-y-0.5" style={{ color: 'var(--text-muted)' }}>
            <li>Download your bank statement as CSV from net banking</li>
            <li>Upload the CSV below — it will auto-match with your recorded payments</li>
            <li>Select matched transactions and click &ldquo;Reconcile&rdquo; to confirm them</li>
            <li>For unmatched bank credits, click &ldquo;Record&rdquo; to create payment records</li>
          </ol>
        </div>

        {/* Upload zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`rounded-xl border-2 border-dashed p-8 text-center transition-colors ${dragging ? 'border-brand-400 bg-brand-50' : 'border-[var(--border)]'}`}>
          <Upload className="w-8 h-8 mx-auto mb-3 text-brand-600" />
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>{fileName || 'Upload Bank Statement CSV'}</p>
          <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>Drag & drop or click to select · Supports SBI, HDFC, ICICI, Axis CSV formats</p>
          <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium cursor-pointer transition-colors">
            <Upload className="w-4 h-4" /> Choose CSV
            <input type="file" accept=".csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f) }} />
          </label>
          {error && <p className="mt-3 text-xs text-err-600">{error}</p>}
        </div>

        {result && (
          <>
            {/* Summary */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: 'Matched', value: result.matched.length, icon: CheckCircle2, color: 'text-ok-600' },
                { label: 'Unmatched (Bank)', value: result.unmatchedBank.length, icon: AlertTriangle, color: 'text-warn-600' },
                { label: 'Unrecorded Payments', value: result.unmatchedPayments.length, icon: XCircle, color: 'text-err-600' },
                { label: 'Total Bank Credits', value: `₹${result.totalBankCredits.toLocaleString('en-IN')}`, icon: CheckCircle2, color: 'text-brand-600' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="rounded-xl p-4 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <Icon className={`w-5 h-5 mx-auto mb-1 ${color}`} />
                  <p className={`text-lg font-bold tabular-nums ${color}`}>{value}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
                </div>
              ))}
            </div>

            {/* Matched — with reconcile action */}
            {result.matched.length > 0 && (
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between px-4 py-3" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <h3 className="text-sm font-semibold text-ok-700">Matched Transactions ({result.matched.length})</h3>
                    {unreconciledCount > 0 && (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        Select rows and reconcile to confirm payment receipt
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {unreconciledCount > 0 && (
                      <button onClick={selectAllMatched} className="text-xs text-brand-600 font-semibold hover:text-brand-700">
                        Select All ({unreconciledCount})
                      </button>
                    )}
                    {selectedMatched.size > 0 && (
                      <button onClick={handleReconcileSelected}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ok-600 hover:bg-ok-700 text-white text-xs font-semibold transition-colors">
                        <Check className="w-3.5 h-3.5" /> Reconcile ({selectedMatched.size})
                      </button>
                    )}
                  </div>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th className="px-4 py-2.5 w-8"></th>
                      {['Bank Date', 'Description', 'Bank Credit', 'Recorded Amount', 'Confidence', 'Status'].map((h) => (
                        <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.matched.map((m, i) => {
                      const isReconciled = reconciledIds.has(m.payment.id)
                      return (
                        <tr key={i} className={`h-10 border-t ${isReconciled ? 'opacity-50' : ''}`} style={{ borderColor: 'var(--border-soft)' }}>
                          <td className="px-4 py-2">
                            {!isReconciled && (
                              <input type="checkbox" checked={selectedMatched.has(i)} onChange={() => toggleMatchSelect(i)}
                                className="w-4 h-4 rounded" />
                            )}
                            {isReconciled && <CheckCircle2 className="w-4 h-4 text-ok-600" />}
                          </td>
                          <td className="px-4 py-2 text-[13px]" style={{ color: 'var(--text-muted)' }}>{m.bank.date}</td>
                          <td className="px-4 py-2 text-[13px] max-w-[200px] truncate" style={{ color: 'var(--text)' }}>{m.bank.description}</td>
                          <td className="px-4 py-2 tabular-nums text-[13px]" style={{ color: 'var(--text)' }}>₹{m.bank.credit.toLocaleString('en-IN')}</td>
                          <td className="px-4 py-2 tabular-nums text-[13px]" style={{ color: 'var(--text)' }}>₹{m.payment.amount.toLocaleString('en-IN')}</td>
                          <td className="px-4 py-2">
                            <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${m.confidence === 'exact' ? 'bg-ok-50 text-ok-700' : 'bg-warn-50 text-warn-700'}`}>
                              {m.confidence}
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            {isReconciled
                              ? <span className="text-[11px] font-semibold text-ok-600">Reconciled</span>
                              : <span className="text-[11px]" style={{ color: 'var(--text-faint)' }}>Pending</span>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Unmatched bank credits — with Record button */}
            {result.unmatchedBank.length > 0 && (
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                <div className="px-4 py-3" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                  <h3 className="text-sm font-semibold text-warn-700">Bank Credits Not Matched ({result.unmatchedBank.length})</h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Click &ldquo;Record&rdquo; to create a payment for each unmatched credit</p>
                </div>
                <table className="w-full text-sm">
                  <tbody>
                    {result.unmatchedBank.map((t: BankTransaction) => (
                      <tr key={t.id} className="h-10 border-t" style={{ borderColor: 'var(--border-soft)' }}>
                        <td className="px-4 py-2 text-[13px]" style={{ color: 'var(--text-muted)' }}>{t.date}</td>
                        <td className="px-4 py-2 text-[13px] max-w-[200px] truncate" style={{ color: 'var(--text)' }}>{t.description}</td>
                        <td className="px-4 py-2 tabular-nums text-[13px] text-ok-600 font-semibold">₹{t.credit.toLocaleString('en-IN')}</td>
                        {t.reference && <td className="px-4 py-2 font-mono text-[12px]" style={{ color: 'var(--text-muted)' }}>{t.reference}</td>}
                        <td className="px-4 py-2 text-right">
                          <button onClick={() => openRecordModal(t)}
                            className="text-xs px-2.5 py-1 rounded-lg font-semibold text-brand-600 hover:bg-brand-50 transition-colors"
                            style={{ border: '1px solid var(--brand-200)' }}>
                            Record
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* Record Payment Modal */}
      <Modal open={showRecordModal} onClose={() => setShowRecordModal(false)} title="Record Bank Payment" size="sm">
        {recordingTxn && (
          <div className="p-5 flex flex-col gap-4">
            <div className="rounded-lg p-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Bank transaction</p>
              <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--text)' }}>{recordingTxn.description}</p>
              <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                <span>{recordingTxn.date}</span>
                <span className="font-semibold text-ok-600">₹{recordingTxn.credit.toLocaleString('en-IN')}</span>
                {recordingTxn.reference && <span className="font-mono">{recordingTxn.reference}</span>}
              </div>
            </div>

            <div>
              <label className="text-[13px] font-medium block mb-1" style={{ color: 'var(--text-2)' }}>Link to Invoice (optional)</label>
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  AI can suggest the most likely outstanding invoice from the bank narration and amount.
                </p>
                <button
                  onClick={() => void handleAISuggestMatch()}
                  disabled={aiMatching || unmatchedOutstanding.length === 0}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors disabled:opacity-40"
                  style={{ border: '1px solid var(--border)', color: 'var(--text)' }}
                >
                  {aiMatching ? 'Matching...' : 'AI Suggest'}
                </button>
              </div>
              {aiSuggestion && (
                <div className="rounded-lg p-3 mb-2" style={{ background: 'var(--brand-50)', border: '1px solid var(--brand-100)' }}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-semibold uppercase text-brand-700">AI Match</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold uppercase" style={{ background: 'white', color: 'var(--brand-700)', border: '1px solid var(--brand-100)' }}>
                      {aiSuggestion.confidence}
                    </span>
                    <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      {aiSuggestion.suggestedAction === 'link_invoice' ? 'Suggest linking this receipt to an invoice.' : 'Suggest recording this as an advance receipt.'}
                    </span>
                  </div>
                  <p className="text-xs mt-2" style={{ color: 'var(--text)' }}>{aiSuggestion.reasoning}</p>
                </div>
              )}
              <input
                value={invoiceSearch}
                onChange={(e) => { setInvoiceSearch(e.target.value); setRecordInvoiceId('') }}
                placeholder="Search invoice number or customer..."
                className="w-full h-9 rounded-lg border px-3 text-sm outline-none"
                style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
              />
              {invoiceOptions.length > 0 && invoiceSearch && (
                <div className="mt-1 rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                  {invoiceOptions.map((inv) => (
                    <button key={inv.id} onClick={() => { setRecordInvoiceId(inv.id); setInvoiceSearch(`${inv.invoiceNumber} — ${inv.customerSnapshot.name}`) }}
                      className="flex items-center justify-between w-full px-3 py-2 text-sm text-left hover:bg-ink-50"
                      style={{ color: 'var(--text)', borderBottom: '1px solid var(--border-soft)' }}>
                      <span>{inv.invoiceNumber} · {inv.customerSnapshot.name}</span>
                      <span className="text-xs text-brand-600">₹{inv.balanceDue.toLocaleString('en-IN')}</span>
                    </button>
                  ))}
                </div>
              )}
              <p className="text-[11px] mt-1" style={{ color: 'var(--text-faint)' }}>
                Leave empty to record as advance payment
              </p>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setShowRecordModal(false)}
                className="flex-1 h-9 rounded-lg border text-sm" style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>Cancel</button>
              <button onClick={handleRecordPayment}
                className="flex-1 h-9 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold">
                Record Payment
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
