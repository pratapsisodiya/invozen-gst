'use client'
import { useState, useEffect, useRef, startTransition } from 'react'
import { TopBar } from '../app/TopBar'
import { Modal } from '../ui/Modal'
import { downloadBackup, validateBackup, restoreFromBackup, getBackupDaysAgo, getLastBackupDate } from '@/lib/backup/backupManager'
import type { BackupManifest } from '@/lib/backup/backupManager'
import { useUIStore } from '@/lib/store/uiStore'
import { Download, Upload, DatabaseBackup, CheckCircle2, AlertTriangle, Clock } from 'lucide-react'

export function BackupRestoreClient() {
  const { addToast } = useUIStore()
  const [lastBackup, setLastBackup] = useState<string | null>(null)
  const [daysAgo, setDaysAgo] = useState<number | null>(null)
  const [showRestoreModal, setShowRestoreModal] = useState(false)
  const [manifest, setManifest] = useState<BackupManifest | null>(null)
  const [restoreFile, setRestoreFile] = useState<File | null>(null)
  const [validating, setValidating] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    startTransition(() => {
      setLastBackup(getLastBackupDate())
      setDaysAgo(getBackupDaysAgo())
    })
  }, [])

  const handleDownload = () => {
    downloadBackup()
    setLastBackup(new Date().toISOString())
    setDaysAgo(0)
    addToast({ type: 'success', title: 'Backup downloaded', message: 'Keep this file safe!' })
  }

  const handleFileSelect = async (file: File) => {
    setValidating(true)
    setManifest(null)
    const result = await validateBackup(file)
    setValidating(false)
    if (!result.valid) {
      addToast({ type: 'error', title: 'Invalid backup file', message: result.error })
      return
    }
    setRestoreFile(file)
    setManifest(result.manifest!)
    setShowRestoreModal(true)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  const handleRestore = async () => {
    if (!restoreFile) return
    setRestoring(true)
    const result = await restoreFromBackup(restoreFile)
    setRestoring(false)
    if (!result.success) {
      addToast({ type: 'error', title: 'Restore failed', message: result.message })
      setShowRestoreModal(false)
      return
    }
    addToast({ type: 'success', title: 'Restore successful', message: 'Reloading...' })
    setTimeout(() => window.location.reload(), 1500)
  }

  const urgency = daysAgo === null ? 'never' : daysAgo === 0 ? 'today' : daysAgo <= 7 ? 'good' : 'warning'

  return (
    <div className="flex flex-col flex-1">
      <TopBar title="Backup & Restore" breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }]} />

      <div className="flex-1 p-4 lg:p-6 max-w-2xl mx-auto w-full flex flex-col gap-6">
        {/* Status */}
        <div className={`rounded-xl p-4 flex items-start gap-3 ${urgency === 'warning' || urgency === 'never' ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}
          style={{ border: '1px solid' }}>
          {urgency === 'today' || urgency === 'good'
            ? <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            : <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />}
          <div>
            <p className={`text-sm font-semibold ${urgency === 'warning' || urgency === 'never' ? 'text-amber-800' : 'text-green-800'}`}>
              {urgency === 'never' ? 'No backup on record'
                : urgency === 'today' ? 'Backup is up to date'
                : urgency === 'good' ? `Last backed up ${daysAgo} day${daysAgo !== 1 ? 's' : ''} ago`
                : `Backup is ${daysAgo} days old — please update`}
            </p>
            <p className={`text-xs mt-0.5 ${urgency === 'warning' || urgency === 'never' ? 'text-amber-700' : 'text-green-700'}`}>
              {lastBackup ? `Last backup: ${new Date(lastBackup).toLocaleString('en-IN')}` : 'GST law requires financial records to be preserved for 8 years.'}
            </p>
          </div>
        </div>

        {/* Download */}
        <div className="rounded-xl bg-white p-5" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
              <DatabaseBackup className="w-5 h-5 text-brand-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Download Full Backup</h3>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                Exports all your data — invoices, customers, purchases, payments, items, quotations, challans, and settings — into a single JSON file.
              </p>
              <div className="mt-3 flex items-center gap-3">
                <button onClick={handleDownload}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors">
                  <Download className="w-4 h-4" /> Download Backup
                </button>
                {daysAgo !== null && (
                  <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <Clock className="w-3.5 h-3.5" />
                    {daysAgo === 0 ? 'Just now' : `${daysAgo}d ago`}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Restore */}
        <div className="rounded-xl bg-white p-5" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
              <Upload className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Restore from Backup</h3>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                Upload a backup file to restore all your data. <strong className="text-amber-700">This will overwrite all existing data.</strong>
              </p>
              <div
                className="mt-3 border-2 border-dashed rounded-xl p-6 text-center cursor-pointer hover:border-brand-400 transition-colors"
                style={{ borderColor: 'var(--border)' }}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--text-faint)' }} />
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Drop backup file here or <span className="text-brand-600 font-medium">browse</span></p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-faint)' }}>Accepts .json files exported from Invozen GST</p>
              </div>
              <input ref={fileInputRef} type="file" accept=".json" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); e.target.value = '' }} />
              {validating && <p className="text-xs mt-2 text-brand-600">Validating backup file...</p>}
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text)' }}>What&apos;s included in the backup?</p>
          <div className="grid grid-cols-2 gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            {['Invoices & line items', 'Customer records', 'Purchase register', 'Payments', 'Items catalog', 'Quotations', 'Delivery challans', 'ITC reversals', 'Recurring templates', 'Expenses', 'Business settings', 'Reminder history'].map((item) => (
              <p key={item} className="flex items-center gap-1">
                <span className="text-brand-600">✓</span> {item}
              </p>
            ))}
          </div>
        </div>
      </div>

      {/* Restore Confirmation Modal */}
      <Modal open={showRestoreModal} onClose={() => { setShowRestoreModal(false); setManifest(null); setRestoreFile(null) }} title="Confirm Restore">
        {manifest && (
          <div className="p-5 flex flex-col gap-4">
            <div className="rounded-xl p-3 bg-amber-50 border border-amber-200">
              <p className="text-sm font-semibold text-amber-800">Warning: This will replace ALL your current data</p>
              <p className="text-xs text-amber-700 mt-1">We recommend downloading a fresh backup before restoring.</p>
            </div>
            <div>
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>Backup Details</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg p-2" style={{ background: 'var(--surface)' }}>
                  <p style={{ color: 'var(--text-muted)' }}>Business</p>
                  <p className="font-medium" style={{ color: 'var(--text)' }}>{manifest.businessName}</p>
                </div>
                <div className="rounded-lg p-2" style={{ background: 'var(--surface)' }}>
                  <p style={{ color: 'var(--text-muted)' }}>Created At</p>
                  <p className="font-medium" style={{ color: 'var(--text)' }}>{new Date(manifest.createdAt).toLocaleDateString('en-IN')}</p>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {Object.entries(manifest.counts).filter(([, v]) => v > 0).slice(0, 9).map(([k, v]) => (
                  <div key={k} className="rounded-lg p-2 text-center" style={{ background: 'var(--surface)' }}>
                    <p className="font-bold text-sm" style={{ color: 'var(--text)' }}>{v}</p>
                    <p className="text-[10px] capitalize" style={{ color: 'var(--text-muted)' }}>{k.replace('invozen-', '')}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setShowRestoreModal(false); setManifest(null); setRestoreFile(null) }}
                className="flex-1 h-9 rounded-lg border text-sm" style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>Cancel</button>
              <button onClick={handleRestore} disabled={restoring}
                className="flex-1 h-9 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold disabled:opacity-50">
                {restoring ? 'Restoring...' : 'Restore Now'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
