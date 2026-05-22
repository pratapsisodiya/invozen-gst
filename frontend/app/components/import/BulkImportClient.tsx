'use client'
import { useState, useRef } from 'react'
import { useItemStore } from '@/lib/store/itemStore'
import { useCustomerStore } from '@/lib/store/customerStore'
import { useUIStore } from '@/lib/store/uiStore'
import {
  parseItemsFromCSV, getItemCSVTemplate,
  parseCustomersFromCSV, getCustomerCSVTemplate,
  downloadTemplate,
} from '@/lib/import/excelImport'
import { TopBar } from '../app/TopBar'
import { Upload, Download, AlertCircle, CheckCircle2, X } from 'lucide-react'
import type { Item } from '@/types/item'
import type { Customer } from '@/types/customer'

type TabId = 'items' | 'customers'

export function BulkImportClient() {
  const { addItem } = useItemStore()
  const { addCustomer } = useCustomerStore()
  const { addToast } = useUIStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [activeTab, setActiveTab] = useState<TabId>('customers')
  const [itemPreview, setItemPreview] = useState<Item[]>([])
  const [customerPreview, setCustomerPreview] = useState<Customer[]>([])
  const [errors, setErrors] = useState<{ row: number; message: string }[]>([])
  const [importing, setImporting] = useState(false)
  const [fileName, setFileName] = useState('')
  const [dragging, setDragging] = useState(false)

  const reset = () => {
    setItemPreview([])
    setCustomerPreview([])
    setErrors([])
    setFileName('')
    if (fileRef.current) fileRef.current.value = ''
  }

  const processFile = (file: File) => {
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      addToast({ type: 'error', title: 'Only CSV files are supported' })
      return
    }
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      if (activeTab === 'items') {
        const result = parseItemsFromCSV(text)
        setItemPreview(result.rows)
        setErrors(result.errors)
      } else {
        const result = parseCustomersFromCSV(text)
        setCustomerPreview(result.rows)
        setErrors(result.errors)
      }
    }
    reader.readAsText(file)
  }

  const handleImport = async () => {
    const count = activeTab === 'items' ? itemPreview.length : customerPreview.length
    if (count === 0) return
    setImporting(true)
    if (activeTab === 'items') {
      for (const item of itemPreview) await addItem(item)
      addToast({ type: 'success', title: `${itemPreview.length} items imported` })
    } else {
      for (const customer of customerPreview) addCustomer(customer)
      addToast({ type: 'success', title: `${customerPreview.length} customers imported` })
    }
    setImporting(false)
    reset()
  }

  const switchTab = (tab: TabId) => { setActiveTab(tab); reset() }
  const isItems = activeTab === 'items'
  const previewCount = isItems ? itemPreview.length : customerPreview.length

  return (
    <div className="flex flex-col flex-1">
      <TopBar
        title="Bulk Import"
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }]}
      />

      <div className="flex-1 p-4 lg:p-6 max-w-3xl mx-auto w-full flex flex-col gap-5">
        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          {(['customers', 'items'] as TabId[]).map((tab) => (
            <button
              key={tab}
              onClick={() => switchTab(tab)}
              className="flex-1 py-2 text-sm font-medium rounded-lg capitalize transition-colors"
              style={{
                background: activeTab === tab ? 'white' : 'transparent',
                color: activeTab === tab ? 'var(--brand-600)' : 'var(--text-muted)',
                boxShadow: activeTab === tab ? 'var(--shadow-sm)' : 'none',
              }}
            >
              {tab === 'items' ? 'Items' : 'Customers'}
            </button>
          ))}
        </div>

        {/* Instructions */}
        <div className="flex items-start gap-3 p-4 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <AlertCircle className="w-5 h-5 text-brand-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
              Upload a CSV to import {isItems ? 'items' : 'customers'} in bulk
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              {isItems
                ? 'Required columns: Name, Rate. Optional: Description, Type, HSN Code, Unit, GST Rate'
                : 'Required: Name. Optional: Business Name, GSTIN, Email, Phone, State, Credit Limit, Payment Terms Days'}
            </p>
            <button
              onClick={() => downloadTemplate(
                isItems ? 'items_template.csv' : 'customers_template.csv',
                isItems ? getItemCSVTemplate() : getCustomerCSVTemplate()
              )}
              className="flex items-center gap-1.5 mt-2 text-xs text-brand-600 hover:text-brand-700 font-semibold"
            >
              <Download className="w-3.5 h-3.5" /> Download CSV Template
            </button>
          </div>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) processFile(f) }}
          onClick={() => fileRef.current?.click()}
          className="flex flex-col items-center justify-center gap-3 py-12 rounded-xl border-2 border-dashed cursor-pointer transition-colors"
          style={{ borderColor: dragging ? 'var(--brand-600)' : 'var(--border)', background: dragging ? 'var(--brand-50)' : 'var(--surface)' }}
        >
          <Upload className="w-10 h-10" style={{ color: 'var(--text-muted)' }} />
          <div className="text-center">
            <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
              {fileName || `Drop your ${isItems ? 'items' : 'customers'} CSV here`}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>or click to browse — supports .csv files</p>
          </div>
          <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f) }} />
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <div className="rounded-xl border border-err-200 bg-err-50 p-4">
            <p className="text-sm font-semibold text-err-700 mb-2">{errors.length} row(s) have validation errors:</p>
            {errors.slice(0, 10).map((e) => (
              <p key={e.row} className="text-xs text-err-600 mt-0.5">• Row {e.row}: {e.message}</p>
            ))}
          </div>
        )}

        {/* Preview */}
        {previewCount > 0 && (
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between px-4 py-3" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-ok-600" />
                <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                  {previewCount} {isItems ? 'items' : 'customers'} ready to import
                </span>
              </div>
              <button onClick={reset} className="p-1 rounded hover:bg-ink-100">
                <X className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {isItems ? (
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                      {['Name', 'Type', 'HSN/SAC', 'Unit', 'Rate', 'GST%'].map((h) => (
                        <th key={h} className="px-3 py-2 text-left font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {itemPreview.map((item, i) => (
                      <tr key={i} className="border-t h-10" style={{ borderColor: 'var(--border-soft)' }}>
                        <td className="px-3 py-1.5" style={{ color: 'var(--text)' }}>{item.name}</td>
                        <td className="px-3 py-1.5 capitalize" style={{ color: 'var(--text-muted)' }}>{item.type}</td>
                        <td className="px-3 py-1.5 font-mono" style={{ color: 'var(--text-muted)' }}>{item.hsnCode || item.sacCode || '—'}</td>
                        <td className="px-3 py-1.5" style={{ color: 'var(--text-muted)' }}>{item.unit}</td>
                        <td className="px-3 py-1.5 tabular-nums" style={{ color: 'var(--text)' }}>₹{item.defaultRate.toLocaleString('en-IN')}</td>
                        <td className="px-3 py-1.5" style={{ color: 'var(--text-muted)' }}>{item.defaultGstRate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                      {['Name', 'Business', 'GSTIN', 'Email', 'State', 'Credit Limit'].map((h) => (
                        <th key={h} className="px-3 py-2 text-left font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {customerPreview.map((c, i) => (
                      <tr key={i} className="border-t h-10" style={{ borderColor: 'var(--border-soft)' }}>
                        <td className="px-3 py-1.5" style={{ color: 'var(--text)' }}>{c.name}</td>
                        <td className="px-3 py-1.5" style={{ color: 'var(--text-muted)' }}>{c.businessName || '—'}</td>
                        <td className="px-3 py-1.5 font-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>{c.gstin || '—'}</td>
                        <td className="px-3 py-1.5" style={{ color: 'var(--text-muted)' }}>{c.email || '—'}</td>
                        <td className="px-3 py-1.5" style={{ color: 'var(--text-muted)' }}>{c.gstinState || '—'}</td>
                        <td className="px-3 py-1.5 tabular-nums" style={{ color: 'var(--text)' }}>
                          {c.creditLimit ? `₹${c.creditLimit.toLocaleString('en-IN')}` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {previewCount > 0 && (
          <button
            onClick={handleImport}
            disabled={importing}
            className="w-full h-11 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
          >
            {importing ? 'Importing…' : `Import ${previewCount} ${isItems ? 'Items' : 'Customers'}`}
          </button>
        )}
      </div>
    </div>
  )
}
