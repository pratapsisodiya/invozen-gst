'use client'
import { useState, useMemo } from 'react'
import { useExpenseStore } from '@/lib/store/expenseStore'
import { TopBar } from '../app/TopBar'
import { Modal } from '../ui/Modal'
import { AIQuickExpenseModal } from '../ai/AIQuickExpenseModal'
import { useUIStore } from '@/lib/store/uiStore'
import { generateId } from '@/lib/utils/ids'
import type { Expense, ExpenseCategory } from '@/types/expense'
import { EXPENSE_CATEGORY_LABELS } from '@/types/expense'
import type { ExpenseClassification } from '@/app/api/ai/classify-expense/route'
import { formatDate } from '@/lib/utils/formatters'
import { Plus, Trash2, Sparkles, Loader2, Zap } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const PIE_COLORS = ['#0d9488', '#14b8a6', '#5eead4', '#d97706', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16']

const GST_RATES = [0, 5, 12, 18, 28]

export function ExpensesClient() {
  const { expenses, addExpense, deleteExpense, getTotalByPeriod, getCategoryTotals, getItcSummary } = useExpenseStore()
  const { addToast } = useUIStore()
  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [showAdd, setShowAdd] = useState(false)
  const [showQuickAI, setShowQuickAI] = useState(false)
  const [form, setForm] = useState({
    description: '',
    category: 'other' as ExpenseCategory,
    vendorName: '',
    vendorGstin: '',
    amount: '',
    gstRate: '18',
    isGstRegistered: false,
    isItcEligible: false,
    paymentMethod: 'cash',
    reference: '',
    receiptRef: '',
    notes: '',
  })

  const [classifying, setClassifying] = useState(false)

  const handleAIClassify = async () => {
    if (!form.description.trim()) {
      addToast({ type: 'error', title: 'Enter a description first' })
      return
    }
    setClassifying(true)
    try {
      const res = await fetch('/api/ai/classify-expense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: form.description,
          amount: parseFloat(form.amount) || 0,
          vendorName: form.vendorName || undefined,
        }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json() as ExpenseClassification & { isItcEligible?: boolean; reasoning?: string }
      const cat = data.category as ExpenseCategory
      const validCats = Object.keys(EXPENSE_CATEGORY_LABELS) as ExpenseCategory[]
      setForm((prev) => ({
        ...prev,
        category: validCats.includes(cat) ? cat : 'other',
        isGstRegistered: data.isGstApplicable,
        gstRate: String(data.suggestedGstRate || 18),
        isItcEligible: data.isItcEligible ?? data.isItcClaimable,
      }))
      if (!data.isItcClaimable && data.itcBlockReason) {
        addToast({ type: 'info', title: 'ITC Not Claimable', message: data.itcBlockReason })
      } else {
        addToast({ type: 'success', title: 'AI classified', message: `${data.confidence} confidence` })
      }
    } catch {
      addToast({ type: 'error', title: 'Classification failed', message: 'Please try again' })
    } finally {
      setClassifying(false)
    }
  }

  const totals = useMemo(() => getTotalByPeriod(selectedMonth, selectedYear), [expenses, selectedMonth, selectedYear])
  const itcSummary = useMemo(() => getItcSummary(selectedMonth, selectedYear), [expenses, selectedMonth, selectedYear])
  const categoryTotals = useMemo(() => getCategoryTotals(selectedMonth, selectedYear), [expenses, selectedMonth, selectedYear])

  const monthExpenses = useMemo(() =>
    expenses.filter((e) => {
      const d = new Date(e.date)
      return d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear
    }),
    [expenses, selectedMonth, selectedYear]
  )

  const pieData = Object.entries(categoryTotals)
    .filter(([, v]) => v > 0)
    .map(([cat, value]) => ({ name: EXPENSE_CATEGORY_LABELS[cat as ExpenseCategory] || cat, value }))

  const handleAdd = () => {
    const amount = parseFloat(form.amount)
    if (!form.description || isNaN(amount) || amount <= 0) {
      addToast({ type: 'error', title: 'Description and valid amount are required' })
      return
    }
    const gstRate = form.isGstRegistered ? parseInt(form.gstRate) : 0
    const gstAmount = Math.round(amount * (gstRate / 100) * 100) / 100

    const expense: Expense = {
      id: generateId(),
      date: new Date().toISOString().split('T')[0],
      category: form.category,
      description: form.description,
      vendorName: form.vendorName || null,
      vendorGstin: form.vendorGstin || null,
      amount,
      gstRate,
      gstAmount,
      totalAmount: amount,
      isGstRegistered: form.isGstRegistered,
      isItcEligible: form.isItcEligible,
      supplyType: 'intra',
      paymentMethod: form.paymentMethod,
      reference: form.reference || null,
      receiptRef: form.receiptRef || null,
      notes: form.notes || null,
      createdAt: new Date().toISOString(),
    }
    addExpense(expense)
    setShowAdd(false)
    setForm({ description: '', category: 'other', vendorName: '', vendorGstin: '', amount: '', gstRate: '18', isGstRegistered: false, isItcEligible: false, paymentMethod: 'cash', reference: '', receiptRef: '', notes: '' })
    addToast({ type: 'success', title: 'Expense recorded' })
  }

  return (
    <div className="flex flex-col flex-1">
      <TopBar
        title="Expense Tracker"
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }]}
        actions={
          <div className="flex items-center gap-2">
            <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="h-9 rounded-lg border px-2 text-sm outline-none" style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
              {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
            </select>
            <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="h-9 rounded-lg border px-2 text-sm outline-none" style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
              {[now.getFullYear() - 1, now.getFullYear()].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <button onClick={() => setShowQuickAI(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-brand-600 hover:bg-brand-50 transition-colors"
              style={{ border: '1px solid var(--brand-200)' }}>
              <Zap className="w-4 h-4" /> AI Quick Add
            </button>
            <button onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors">
              <Plus className="w-4 h-4" /> Add Expense
            </button>
          </div>
        }
      />

      <div className="flex-1 p-4 lg:p-6 flex flex-col gap-5">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total Expenses', value: `₹${totals.total.toLocaleString('en-IN')}` },
            { label: 'ITC Claimable', value: `₹${itcSummary.claimable.toLocaleString('en-IN')}` },
            { label: 'Transactions', value: String(totals.count) },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl p-4 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <p className="text-lg font-bold tabular-nums text-brand-700">{value}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          {/* Pie chart */}
          {pieData.length > 0 && (
            <div className="rounded-xl bg-white p-4" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
              <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>Category Breakdown</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                      label={({ name, percent }: { name?: string; percent?: number }) => `${(name || '').split(' ')[0]} ${((percent || 0) * 100).toFixed(0)}%`}>
                      {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: unknown) => [`₹${Number(v).toLocaleString('en-IN')}`, 'Amount']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Category list */}
          <div className="rounded-xl bg-white overflow-hidden" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Category Summary</h3>
            </div>
            {Object.entries(categoryTotals).length === 0 ? (
              <div className="py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No expenses this month</div>
            ) : (
              <div className="flex flex-col">
                {Object.entries(categoryTotals).sort(([, a], [, b]) => b - a).map(([cat, total]) => (
                  <div key={cat} className="flex items-center justify-between px-4 py-2.5 border-t" style={{ borderColor: 'var(--border-soft)' }}>
                    <span className="text-sm" style={{ color: 'var(--text)' }}>{EXPENSE_CATEGORY_LABELS[cat as ExpenseCategory] || cat}</span>
                    <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--text)' }}>₹{total.toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Expense list */}
        {monthExpenses.length > 0 && (
          <div className="rounded-xl bg-white overflow-hidden" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <div className="px-4 py-3" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>All Expenses ({monthExpenses.length})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Date', 'Description', 'Category', 'Vendor', 'Amount', 'GST', ''].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {monthExpenses.map((e) => (
                    <tr key={e.id} className="h-10 border-t hover:bg-ink-50/50" style={{ borderColor: 'var(--border-soft)' }}>
                      <td className="px-4 py-2 text-[13px]" style={{ color: 'var(--text-muted)' }}>{formatDate(e.date)}</td>
                      <td className="px-4 py-2 text-[13px]" style={{ color: 'var(--text)' }}>{e.description}</td>
                      <td className="px-4 py-2 text-[12px]" style={{ color: 'var(--text-muted)' }}>{EXPENSE_CATEGORY_LABELS[e.category]}</td>
                      <td className="px-4 py-2 text-[13px]" style={{ color: 'var(--text-muted)' }}>{e.vendorName || '—'}</td>
                      <td className="px-4 py-2 tabular-nums text-[13px] font-medium" style={{ color: 'var(--text)' }}>₹{e.amount.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-2 tabular-nums text-[13px]" style={{ color: e.isGstRegistered ? 'var(--text-muted)' : 'var(--text-faint)' }}>
                        {e.isGstRegistered ? `₹${e.gstAmount.toLocaleString('en-IN')} (${e.gstRate}%)` : '—'}
                      </td>
                      <td className="px-4 py-2">
                        <button onClick={() => deleteExpense(e.id)} className="p-1 rounded hover:bg-err-50 text-err-600 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Expense" size="sm">
        <div className="p-5 flex flex-col gap-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[13px] font-medium" style={{ color: 'var(--text-2)' }}>Description *</label>
              <button type="button" onClick={handleAIClassify} disabled={classifying || !form.description.trim()}
                className="flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:text-brand-700 disabled:opacity-50 transition-colors">
                {classifying ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                AI Classify
              </button>
            </div>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. Office stationery"
              className="w-full h-9 rounded-lg border px-3 text-sm outline-none" style={{ borderColor: 'var(--border)' }} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[13px] font-medium mb-1 block" style={{ color: 'var(--text-2)' }}>Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as ExpenseCategory })}
                className="w-full h-9 rounded-lg border px-3 text-sm outline-none" style={{ borderColor: 'var(--border)' }}>
                {Object.entries(EXPENSE_CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[13px] font-medium mb-1 block" style={{ color: 'var(--text-2)' }}>Amount (₹) *</label>
              <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00"
                className="w-full h-9 rounded-lg border px-3 text-sm outline-none" style={{ borderColor: 'var(--border)' }} />
            </div>
          </div>
          <div>
            <label className="text-[13px] font-medium mb-1 block" style={{ color: 'var(--text-2)' }}>Vendor Name</label>
            <input value={form.vendorName} onChange={(e) => setForm({ ...form, vendorName: e.target.value })} placeholder="Optional"
              className="w-full h-9 rounded-lg border px-3 text-sm outline-none" style={{ borderColor: 'var(--border)' }} />
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <input type="checkbox" id="gstReg" checked={form.isGstRegistered} onChange={(e) => setForm({ ...form, isGstRegistered: e.target.checked })} />
              <label htmlFor="gstReg" className="text-[13px]" style={{ color: 'var(--text-2)' }}>GST-registered vendor</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="itcEligible" checked={form.isItcEligible} onChange={(e) => setForm({ ...form, isItcEligible: e.target.checked })} />
              <label htmlFor="itcEligible" className="text-[13px]" style={{ color: 'var(--text-2)' }}>ITC eligible (not blocked under Sec 17(5))</label>
            </div>
          </div>
          <div>
            <label className="text-[13px] font-medium mb-1 block" style={{ color: 'var(--text-2)' }}>Receipt Ref</label>
            <input value={form.receiptRef} onChange={(e) => setForm({ ...form, receiptRef: e.target.value })} placeholder="e.g. INV-2025-001"
              className="w-full h-9 rounded-lg border px-3 text-sm outline-none" style={{ borderColor: 'var(--border)' }} />
          </div>
          {form.isGstRegistered && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[13px] font-medium mb-1 block" style={{ color: 'var(--text-2)' }}>Vendor GSTIN</label>
                <input value={form.vendorGstin} onChange={(e) => setForm({ ...form, vendorGstin: e.target.value })} placeholder="27ABCDE1234F1Z5"
                  className="w-full h-9 rounded-lg border px-3 text-sm outline-none" style={{ borderColor: 'var(--border)' }} />
              </div>
              <div>
                <label className="text-[13px] font-medium mb-1 block" style={{ color: 'var(--text-2)' }}>GST Rate</label>
                <select value={form.gstRate} onChange={(e) => setForm({ ...form, gstRate: e.target.value })}
                  className="w-full h-9 rounded-lg border px-3 text-sm outline-none" style={{ borderColor: 'var(--border)' }}>
                  {GST_RATES.map((r) => <option key={r} value={r}>{r}%</option>)}
                </select>
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-2 px-5 pb-5">
          <button onClick={() => setShowAdd(false)} className="flex-1 h-9 rounded-lg border text-sm font-medium" style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>Cancel</button>
          <button onClick={handleAdd} className="flex-1 h-9 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors">Record Expense</button>
        </div>
      </Modal>

      <AIQuickExpenseModal open={showQuickAI} onClose={() => setShowQuickAI(false)} />
    </div>
  )
}
