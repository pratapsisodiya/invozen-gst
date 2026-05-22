'use client'
import { useState, useRef } from 'react'
import { Modal } from '../ui/Modal'
import { useItemStore } from '@/lib/store/itemStore'
import { useCustomerStore } from '@/lib/store/customerStore'
import { useUIStore } from '@/lib/store/uiStore'
import {
  parseItemsFromCSV, getItemCSVTemplate,
  parseCustomersFromCSV, getCustomerCSVTemplate,
  downloadTemplate,
} from '@/lib/import/excelImport'
import { Upload, Download, AlertCircle, CheckCircle2, X } from 'lucide-react'
import type { Item } from '@/types/item'
import type { Customer } from '@/types/customer'

type TabId = 'items' | 'customers'

interface Props {
  open: boolean
  onClose: () => void
  defaultTab?: TabId
}

export function BulkImportModal({ open, onClose, defaultTab = 'items' }: Props) {
  const { addItem } = useItemStore()
  const { addCustomer } = useCustomerStore()
  const { addToast } = useUIStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [activeTab, setActiveTab] = useState<TabId>(defaultTab)
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  const previewCount = activeTab === 'items' ? itemPreview.length : customerPreview.length

  const handleImport = async () => {
    if (previewCount === 0) return
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
    onClose()
  }

  const switchTab = (tab: TabId) => {
    setActiveTab(tab)
    reset()
  }

  const isItems = activeTab === 'items'

  return (
    <Modal open={open} onClose={onClose} title="Bulk Import" size="lg">
      {/* Tabs */}
      <div className="flex border-b px-5 pt-1" style={{ borderColor: 'var(--border)' }}>
        {(['items', 'customers'] as TabId[]).map((tab) => (
          <button
            key={tab}
            onClick={() => switchTab(tab)}
            className="px-4 py-2.5 text-sm font-medium capitalize border-b-2 -mb-px transition-colors"
            style={{
              borderColor: activeTab === tab ? 'var(--brand-600)' : 'transparent',
              color: activeTab === tab ? 'var(--brand-600)' : 'var(--text-muted)',
            }}
          >
            {tab === 'items' ? 'Items' : 'Customers'}
          </button>
        ))}
      </div>

      <div className="p-5 flex flex-col gap-4">
        {/* Instructions */}
        <div className="flex items-start gap-2 p-3 rounded-lg text-sm" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <AlertCircle className="w-4 h-4 text-brand-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium" style={{ color: 'var(--text)' }}>
              Upload a CSV file to import {isItems ? 'items' : 'customers'} in bulk.
            </p>
            <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
              {isItems
                ? 'Required: Name, Rate. Optional: Description, Type, HSN Code, Unit, GST Rate'
                : 'Required: Name. Optional: Business Name, GSTIN, Email, Phone, State, Credit Limit'}
            </p>
          </div>
        </div>

        <button
          onClick={() => downloadTemplate(
            isItems ? 'items_template.csv' : 'customers_template.csv',
            isItems ? getItemCSVTemplate() : getCustomerCSVTemplate()
          )}
          className="flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700 font-medium"
        >
          <Download className="w-4 h-4" /> Download CSV Template
        </button>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className="flex flex-col items-center justify-center gap-2 py-8 rounded-xl border-2 border-dashed cursor-pointer transition-colors"
          style={{ borderColor: dragging ? 'var(--brand-600)' : 'var(--border)', background: dragging ? 'var(--brand-50)' : 'var(--surface)' }}
        >
          <Upload className="w-8 h-8" style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
            {fileName || 'Drop CSV file here or click to browse'}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Supports .csv files</p>
          <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFileChange} />
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <div className="rounded-lg border border-err-200 bg-err-50 p-3">
            <p className="text-xs font-semibold text-err-700 mb-1">{errors.length} row(s) have errors and will be skipped:</p>
            {errors.map((e) => (
              <p key={e.row} className="text-xs text-err-600">Row {e.row}: {e.message}</p>
            ))}
          </div>
        )}

        {/* Preview */}
        {isItems && itemPreview.length > 0 && (
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between px-4 py-2.5" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-ok-600" />
                <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{itemPreview.length} items ready to import</span>
              </div>
              <button onClick={reset} className="p-1 rounded hover:bg-ink-100"><X className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} /></button>
            </div>
            <div className="max-h-48 overflow-y-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                    {['Name', 'Type', 'HSN/SAC', 'Unit', 'Rate', 'GST%'].map((h) => (
                      <th key={h} className="px-3 py-2 text-left font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {itemPreview.slice(0, 20).map((item, i) => (
                    <tr key={i} className="border-t h-9" style={{ borderColor: 'var(--border-soft)' }}>
                      <td className="px-3 py-1.5" style={{ color: 'var(--text)' }}>{item.name}</td>
                      <td className="px-3 py-1.5" style={{ color: 'var(--text-muted)' }}>{item.type}</td>
                      <td className="px-3 py-1.5 font-mono" style={{ color: 'var(--text-muted)' }}>{item.hsnCode || item.sacCode || '—'}</td>
                      <td className="px-3 py-1.5" style={{ color: 'var(--text-muted)' }}>{item.unit}</td>
                      <td className="px-3 py-1.5 tabular-nums" style={{ color: 'var(--text)' }}>₹{item.defaultRate.toLocaleString('en-IN')}</td>
                      <td className="px-3 py-1.5" style={{ color: 'var(--text-muted)' }}>{item.defaultGstRate}%</td>
                    </tr>
                  ))}
                  {itemPreview.length > 20 && (
                    <tr><td colSpan={6} className="px-3 py-2 text-center text-xs" style={{ color: 'var(--text-muted)' }}>+{itemPreview.length - 20} more items</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!isItems && customerPreview.length > 0 && (
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between px-4 py-2.5" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-ok-600" />
                <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{customerPreview.length} customers ready to import</span>
              </div>
              <button onClick={reset} className="p-1 rounded hover:bg-ink-100"><X className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} /></button>
            </div>
            <div className="max-h-48 overflow-y-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                    {['Name', 'Business', 'GSTIN', 'Email', 'State', 'Credit Limit'].map((h) => (
                      <th key={h} className="px-3 py-2 text-left font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {customerPreview.slice(0, 20).map((c, i) => (
                    <tr key={i} className="border-t h-9" style={{ borderColor: 'var(--border-soft)' }}>
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
                  {customerPreview.length > 20 && (
                    <tr><td colSpan={6} className="px-3 py-2 text-center text-xs" style={{ color: 'var(--text-muted)' }}>+{customerPreview.length - 20} more customers</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 px-5 pb-5">
        <button onClick={onClose} className="flex-1 h-10 rounded-lg border text-sm font-medium hover:bg-ink-50" style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
          Cancel
        </button>
        <button
          onClick={handleImport}
          disabled={previewCount === 0 || importing}
          className="flex-1 h-10 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
        >
          {importing ? 'Importing...' : `Import ${previewCount > 0 ? `${previewCount} ${isItems ? 'Items' : 'Customers'}` : ''}`}
        </button>
      </div>
    </Modal>
  )
}
