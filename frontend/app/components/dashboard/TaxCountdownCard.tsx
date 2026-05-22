'use client'
import { useMemo, useState } from 'react'
import { Shield, Edit2, Check, X } from 'lucide-react'
import { useInvoiceStore } from '@/lib/store/invoiceStore'
import { usePurchaseStore } from '@/lib/store/purchaseStore'
import { useBusinessStore } from '@/lib/store/businessStore'
import { computeTaxProjection } from '@/lib/gst/taxLiabilityProjection'
import { formatCurrencyWithSymbol } from '@/lib/utils/formatters'

export function TaxCountdownCard() {
  const { invoices } = useInvoiceStore()
  const { purchases } = usePurchaseStore()
  const { settings, updateBankBalance } = useBusinessStore()

  const [editingBalance, setEditingBalance] = useState(false)
  const [balanceInput, setBalanceInput] = useState('')

  const projection = useMemo(
    () => computeTaxProjection(invoices, purchases, settings.currentBankBalance),
    [invoices, purchases, settings.currentBankBalance]
  )

  const handleSaveBalance = () => {
    const val = parseFloat(balanceInput.replace(/,/g, ''))
    if (!isNaN(val) && val >= 0) updateBankBalance(val)
    setEditingBalance(false)
  }

  const pct = Math.min(
    100,
    Math.round(
      ((projection.runRate.daysInMonth - projection.daysUntilDue) /
        projection.runRate.daysInMonth) *
        100
    )
  )

  const safeColor =
    projection.safeToSpend < 0
      ? 'var(--err-600)'
      : projection.safeToSpend < 20000
      ? 'var(--warn-600)'
      : 'var(--ok-600)'

  return (
    <div
      className="rounded-xl bg-white p-4 flex flex-col gap-3"
      style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-brand-600" />
          <span className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>
            Tax Liability Countdown
          </span>
        </div>
        <span
          className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
          style={{
            background: projection.daysUntilDue <= 7 ? 'var(--err-50)' : 'var(--warn-50)',
            color: projection.daysUntilDue <= 7 ? 'var(--err-600)' : 'var(--warn-700)',
          }}
        >
          GSTR-3B due in {projection.daysUntilDue}d
        </span>
      </div>

      {/* Progress bar — month elapsed */}
      <div className="w-full h-1.5 rounded-full" style={{ background: 'var(--surface)' }}>
        <div
          className="h-1.5 rounded-full transition-all"
          style={{ width: `${pct}%`, background: 'var(--brand-600)' }}
        />
      </div>

      {/* Tax numbers */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Output GST</span>
          <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--text)' }}>
            {formatCurrencyWithSymbol(projection.outputGST)}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>ITC Available</span>
          <span className="text-sm font-bold tabular-nums text-ok-600">
            −{formatCurrencyWithSymbol(projection.itcAvailable)}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Net Payable</span>
          <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--err-600)' }}>
            {formatCurrencyWithSymbol(projection.netLiability)}
          </span>
        </div>
      </div>

      <div
        className="rounded-lg p-3 flex items-center justify-between"
        style={{ background: 'var(--surface)' }}
      >
        <div>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Safe to Spend</p>
          <p
            className="text-lg font-bold tabular-nums"
            style={{ color: safeColor }}
          >
            {formatCurrencyWithSymbol(Math.abs(projection.safeToSpend))}
            {projection.safeToSpend < 0 && (
              <span className="text-[11px] font-normal ml-1">(shortfall)</span>
            )}
          </p>
        </div>

        {/* Bank balance input */}
        <div className="flex items-center gap-1">
          {editingBalance ? (
            <>
              <input
                type="number"
                className="w-28 px-2 py-1 text-xs rounded border text-right tabular-nums"
                style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                placeholder="Bank balance"
                value={balanceInput}
                onChange={(e) => setBalanceInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveBalance()}
                autoFocus
              />
              <button onClick={handleSaveBalance} className="p-1 rounded hover:bg-ok-50">
                <Check className="w-3.5 h-3.5 text-ok-600" />
              </button>
              <button onClick={() => setEditingBalance(false)} className="p-1 rounded hover:bg-err-50">
                <X className="w-3.5 h-3.5 text-err-600" />
              </button>
            </>
          ) : (
            <button
              className="flex items-center gap-1 text-[11px] px-2 py-1 rounded border hover:bg-ink-50 transition-colors"
              style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
              onClick={() => {
                setBalanceInput(settings.currentBankBalance.toString())
                setEditingBalance(true)
              }}
            >
              <Edit2 className="w-3 h-3" />
              {settings.currentBankBalance > 0
                ? formatCurrencyWithSymbol(settings.currentBankBalance)
                : 'Set balance'}
            </button>
          )}
        </div>
      </div>

      <p className="text-[11px]" style={{ color: 'var(--text-faint)' }}>
        Month-end projection:{' '}
        <span className="font-semibold" style={{ color: 'var(--text-muted)' }}>
          {formatCurrencyWithSymbol(projection.projectedMonthEnd)}
        </span>
        {' '}at ₹{projection.runRate.dailyOutputGST.toFixed(0)}/day run rate
      </p>
    </div>
  )
}
