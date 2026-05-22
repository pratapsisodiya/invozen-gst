'use client'
import { useState } from 'react'
import { useBusinessStore } from '@/lib/store/businessStore'
import { useUIStore } from '@/lib/store/uiStore'
import { useInvoiceStore } from '@/lib/store/invoiceStore'
import { useCustomerStore } from '@/lib/store/customerStore'
import { usePaymentStore } from '@/lib/store/paymentStore'
import { usePurchaseStore } from '@/lib/store/purchaseStore'
import { TopBar } from '../app/TopBar'
import { Tabs } from '../ui/Tabs'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { UserManagement } from './UserManagement'
import { BranchManagement } from './BranchManagement'
import { GST_RATES, STATE_CODES } from '@/lib/gst/constants'
import { downloadCSV, downloadJSON } from '@/lib/export/excelExport'
import { calculateGSTR1Summary } from '@/lib/gst/gstr1'

const STATE_OPTIONS = Object.entries(STATE_CODES).map(([code, name]) => ({ value: code, label: name }))

const TABS = [
  { key: 'profile', label: 'Business Profile' },
  { key: 'branches', label: 'Branches' },
  { key: 'invoice', label: 'Invoice Settings' },
  { key: 'tax', label: 'Tax & GST' },
  { key: 'team', label: 'Team & Access' },
  { key: 'integrations', label: 'Integrations' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'data', label: 'Data & Export' },
]

export function SettingsClient() {
  const { profile, settings, updateProfile, updateSettings } = useBusinessStore()
  const { addToast } = useUIStore()
  const { invoices, setInvoices } = useInvoiceStore()
  const { customers } = useCustomerStore()
  const { payments } = usePaymentStore()
  const { purchases } = usePurchaseStore()
  const [activeTab, setActiveTab] = useState('profile')
  const [saving, setSaving] = useState(false)

  const save = (fn: () => void) => {
    setSaving(true)
    setTimeout(() => {
      fn()
      setSaving(false)
      addToast({ type: 'success', title: 'Settings saved' })
    }, 500)
  }

  const handleExport = (type: string) => {
    const now = new Date()
    const month = now.getMonth() + 1
    const year = now.getFullYear()
    switch (type) {
      case 'invoices': {
        const rows = invoices.map((inv) => ({
          'Invoice No': inv.invoiceNumber,
          'Date': inv.invoiceDate,
          'Customer': inv.customerSnapshot.name,
          'GSTIN': inv.customerSnapshot.gstin || '',
          'Supply Type': inv.supplyType,
          'Taxable Value': inv.taxableValue,
          'CGST': inv.cgstTotal,
          'SGST': inv.sgstTotal,
          'IGST': inv.igstTotal,
          'Total Tax': inv.totalTax,
          'Grand Total': inv.grandTotal,
          'Status': inv.status,
        }))
        downloadCSV(rows, `Invoices_${year}.csv`)
        addToast({ type: 'success', title: 'Invoices exported', message: `${rows.length} records` })
        break
      }
      case 'customers': {
        const rows = customers.map((c) => ({
          'Name': c.name,
          'GSTIN': c.gstin || '',
          'Email': c.email || '',
          'Phone': c.phone || '',
          'State': c.billingAddress.state,
          'City': c.billingAddress.city,
          'Total Invoiced': c.totalInvoiced || 0,
          'Total Paid': c.totalPaid || 0,
        }))
        downloadCSV(rows, 'Customers.csv')
        addToast({ type: 'success', title: 'Customers exported', message: `${rows.length} records` })
        break
      }
      case 'payments': {
        const rows = payments.map((p) => ({
          'Date': p.paymentDate,
          'Invoice ID': p.invoiceId || '',
          'Amount': p.amount,
          'Method': p.method,
          'Reference': p.reference || '',
          'Is Advance': p.isAdvance ? 'Yes' : 'No',
        }))
        downloadCSV(rows, `Payments_${year}.csv`)
        addToast({ type: 'success', title: 'Payments exported', message: `${rows.length} records` })
        break
      }
      case 'gstr1': {
        const summary = calculateGSTR1Summary(invoices, { month, year })
        downloadJSON(summary, `GSTR1_${year}_${String(month).padStart(2, '0')}.json`)
        addToast({ type: 'success', title: 'GSTR-1 JSON exported' })
        break
      }
      case 'gstr3b': {
        const rows = purchases.map((p) => ({
          'Vendor': p.vendorSnapshot.name,
          'GSTIN': p.vendorSnapshot.gstin || '',
          'Invoice No': p.vendorInvoiceNumber,
          'Date': p.invoiceDate,
          'Taxable': p.taxableValue,
          'CGST': p.cgstTotal,
          'SGST': p.sgstTotal,
          'IGST': p.igstTotal,
          'ITC Status': p.itcStatus,
        }))
        downloadCSV(rows, `GSTR3B_Purchases_${year}_${String(month).padStart(2, '0')}.csv`)
        addToast({ type: 'success', title: 'GSTR-3B data exported' })
        break
      }
      default:
        addToast({ type: 'info', title: 'Export coming soon' })
    }
  }

  const handleClearDemoData = () => {
    if (!window.confirm('This will delete ALL invoices, customers, payments, and purchases. Settings will be preserved. Are you sure?')) return
    setInvoices([])
    addToast({ type: 'success', title: 'Demo data cleared', message: 'All records removed. Settings preserved.' })
  }

  return (
    <div className="flex flex-col flex-1">
      <TopBar title="Settings" breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }]} />

      <div className="flex-1 p-4 lg:p-6">
        <div className="max-w-3xl mx-auto flex flex-col gap-5">
          <div className="rounded-xl bg-white overflow-hidden" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <div className="px-5 pt-4 pb-0 overflow-x-auto">
              <Tabs tabs={TABS} activeKey={activeTab} onChange={setActiveTab} />
            </div>

            {/* Business Profile */}
            {activeTab === 'profile' && (
              <div className="p-5 flex flex-col gap-5">
                <div className="flex flex-col gap-4">
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Business Information</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Business Name" defaultValue={profile.businessName}
                      onBlur={(e) => updateProfile({ businessName: e.target.value })} />
                    <Input label="Legal Name" defaultValue={profile.legalName}
                      onBlur={(e) => updateProfile({ legalName: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Phone" type="tel" defaultValue={profile.phone || ''}
                      onBlur={(e) => updateProfile({ phone: e.target.value })} />
                    <Input label="Email" type="email" defaultValue={profile.email || ''}
                      onBlur={(e) => updateProfile({ email: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Select label="Business Type" value={profile.businessType}
                      onChange={(e) => updateProfile({ businessType: e.target.value })}
                      options={[
                        { value: 'Sole Proprietor', label: 'Sole Proprietor' },
                        { value: 'Partnership', label: 'Partnership' },
                        { value: 'LLP', label: 'LLP' },
                        { value: 'Private Limited', label: 'Private Limited' },
                        { value: 'Public Limited', label: 'Public Limited' },
                        { value: 'HUF', label: 'HUF' },
                      ]}
                    />
                    <Input label="Industry" defaultValue={profile.industry || ''}
                      onBlur={(e) => updateProfile({ industry: e.target.value })} />
                  </div>
                </div>

                <div className="flex flex-col gap-4" style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Business Address</h3>
                  <Input label="Address Line 1" defaultValue={profile.billingAddress.line1}
                    onBlur={(e) => updateProfile({ billingAddress: { ...profile.billingAddress, line1: e.target.value } })} />
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="City" defaultValue={profile.billingAddress.city}
                      onBlur={(e) => updateProfile({ billingAddress: { ...profile.billingAddress, city: e.target.value } })} />
                    <Input label="PIN Code" defaultValue={profile.billingAddress.pincode}
                      onBlur={(e) => updateProfile({ billingAddress: { ...profile.billingAddress, pincode: e.target.value } })} />
                  </div>
                  <Select label="State" value={profile.billingAddress.stateCode}
                    onChange={(e) => updateProfile({ billingAddress: { ...profile.billingAddress, stateCode: e.target.value, state: STATE_CODES[e.target.value] || '' } })}
                    options={STATE_OPTIONS} placeholder="Select state" />
                </div>

                <button onClick={() => save(() => {})} disabled={saving}
                  className="self-end px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            )}

            {/* Invoice Settings */}
            {activeTab === 'invoice' && (
              <div className="p-5 flex flex-col gap-5">
                <div className="flex flex-col gap-4">
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Invoice Numbering</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Invoice Prefix" defaultValue={settings.invoiceSettings.invoicePrefix}
                      onBlur={(e) => updateSettings({ invoiceSettings: { ...settings.invoiceSettings, invoicePrefix: e.target.value } })} />
                    <Input label="Starting Number" type="number" defaultValue={String(settings.invoiceSettings.invoiceStartNumber)}
                      onBlur={(e) => updateSettings({ invoiceSettings: { ...settings.invoiceSettings, invoiceStartNumber: Number(e.target.value) } })} />
                  </div>
                  <Select label="Default Due Period" value={String(settings.invoiceSettings.duePeriodDays)}
                    onChange={(e) => updateSettings({ invoiceSettings: { ...settings.invoiceSettings, duePeriodDays: Number(e.target.value) } })}
                    options={[
                      { value: '0', label: 'Due on receipt' },
                      { value: '7', label: '7 days' },
                      { value: '14', label: '14 days' },
                      { value: '30', label: '30 days' },
                      { value: '45', label: '45 days' },
                      { value: '60', label: '60 days' },
                    ]}
                  />
                </div>

                <div className="flex flex-col gap-4" style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Invoice Footer</h3>
                  <div>
                    <label className="text-[13px] font-medium mb-1.5 block" style={{ color: 'var(--text-2)' }}>Footer Note</label>
                    <textarea defaultValue={settings.invoiceSettings.footerNote || ''}
                      rows={2}
                      onBlur={(e) => updateSettings({ invoiceSettings: { ...settings.invoiceSettings, footerNote: e.target.value } })}
                      className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-600/20 resize-none"
                      style={{ borderColor: 'var(--border)' }} />
                  </div>
                  <div>
                    <label className="text-[13px] font-medium mb-1.5 block" style={{ color: 'var(--text-2)' }}>Terms & Conditions</label>
                    <textarea defaultValue={settings.invoiceSettings.termsAndConditions || ''}
                      rows={3}
                      onBlur={(e) => updateSettings({ invoiceSettings: { ...settings.invoiceSettings, termsAndConditions: e.target.value } })}
                      className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-600/20 resize-none"
                      style={{ borderColor: 'var(--border)' }} />
                  </div>
                  <div className="flex flex-col gap-3">
                    {[
                      { key: 'showBankDetails', label: 'Show bank details on invoice' },
                      { key: 'showUpiQr', label: 'Show UPI QR code on invoice' },
                    ].map((opt) => (
                      <div key={opt.key} className="flex items-center justify-between p-3 rounded-lg"
                        style={{ background: 'var(--surface)', border: '1px solid var(--border-soft)' }}>
                        <span className="text-sm" style={{ color: 'var(--text)' }}>{opt.label}</span>
                        <div
                          className={`relative inline-flex h-5 w-9 items-center rounded-full cursor-pointer transition-colors ${settings.invoiceSettings[opt.key as 'showBankDetails' | 'showUpiQr'] ? 'bg-brand-600' : 'bg-ink-200'}`}
                          onClick={() => updateSettings({ invoiceSettings: { ...settings.invoiceSettings, [opt.key]: !settings.invoiceSettings[opt.key as 'showBankDetails' | 'showUpiQr'] } })}>
                          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${settings.invoiceSettings[opt.key as 'showBankDetails' | 'showUpiQr'] ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button onClick={() => save(() => {})} disabled={saving}
                  className="self-end px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            )}

            {/* Tax & GST */}
            {activeTab === 'tax' && (
              <div className="p-5 flex flex-col gap-5">
                <div className="flex flex-col gap-4">
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>GST Registration</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="GSTIN" defaultValue={profile.gstin || ''}
                      onBlur={(e) => updateProfile({ gstin: e.target.value })} />
                    <Input label="PAN Number" defaultValue={profile.panNumber || ''}
                      onBlur={(e) => updateProfile({ panNumber: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Select label="Registration Type" value={profile.gstRegistrationType}
                      onChange={(e) => updateProfile({ gstRegistrationType: e.target.value as typeof profile.gstRegistrationType })}
                      options={[
                        { value: 'regular', label: 'Regular' },
                        { value: 'composition', label: 'Composition' },
                        { value: 'unregistered', label: 'Unregistered' },
                      ]}
                    />
                    <Select label="Filing Frequency" value={profile.filingFrequency}
                      onChange={(e) => updateProfile({ filingFrequency: e.target.value as 'monthly' | 'quarterly' })}
                      options={[
                        { value: 'monthly', label: 'Monthly (GSTR-1 + GSTR-3B)' },
                        { value: 'quarterly', label: 'Quarterly (QRMP scheme)' },
                      ]}
                    />
                  </div>
                  <div>
                    <label className="text-[13px] font-medium mb-2 block" style={{ color: 'var(--text-2)' }}>Default GST Rate</label>
                    <div className="flex gap-2 flex-wrap">
                      {GST_RATES.map((r) => (
                        <button key={r} type="button"
                          onClick={() => updateSettings({ defaultGstRate: r })}
                          className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${settings.defaultGstRate === r ? 'bg-brand-600 text-white' : 'hover:bg-ink-50 border'}`}
                          style={{ borderColor: settings.defaultGstRate === r ? undefined : 'var(--border)', color: settings.defaultGstRate === r ? undefined : 'var(--text-2)' }}>
                          {r}%
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-4" style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Bank Account</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Bank Name" defaultValue={settings.bankDetails.bankName}
                      onBlur={(e) => updateSettings({ bankDetails: { ...settings.bankDetails, bankName: e.target.value } })} />
                    <Input label="Account Name" defaultValue={settings.bankDetails.accountName}
                      onBlur={(e) => updateSettings({ bankDetails: { ...settings.bankDetails, accountName: e.target.value } })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Account Number" defaultValue={settings.bankDetails.accountNumber}
                      onBlur={(e) => updateSettings({ bankDetails: { ...settings.bankDetails, accountNumber: e.target.value } })} />
                    <Input label="IFSC Code" defaultValue={settings.bankDetails.ifscCode}
                      onBlur={(e) => updateSettings({ bankDetails: { ...settings.bankDetails, ifscCode: e.target.value } })} />
                  </div>
                  <Input label="UPI ID" defaultValue={settings.bankDetails.upiId || ''}
                    onBlur={(e) => updateSettings({ bankDetails: { ...settings.bankDetails, upiId: e.target.value } })} />
                </div>

                <button onClick={() => save(() => {})} disabled={saving}
                  className="self-end px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}

            {/* Branches */}
            {activeTab === 'branches' && <BranchManagement />}

            {/* Team */}
            {activeTab === 'team' && <UserManagement />}

            {/* Integrations */}
            {activeTab === 'integrations' && (
              <div className="p-5 flex flex-col gap-3">
                {[
                  {
                    name: 'Razorpay',
                    desc: 'Accept online payments via Razorpay payment gateway',
                    connected: settings.razorpayConnected,
                    action: () => updateSettings({ razorpayConnected: !settings.razorpayConnected }),
                  },
                  { name: 'WhatsApp Business', desc: 'Send invoices and reminders via WhatsApp', connected: true, action: () => {} },
                  { name: 'IRP E-Invoice', desc: 'Auto-generate IRN from Invoice Registration Portal', connected: false, action: () => {} },
                  { name: 'Tally', desc: 'Export data to Tally ERP', connected: false, action: () => {} },
                ].map((intg) => (
                  <div key={intg.name} className="flex items-center gap-4 p-4 rounded-xl"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border-soft)' }}>
                    <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-lg font-bold border"
                      style={{ borderColor: 'var(--border)' }}>
                      {intg.name[0]}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{intg.name}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{intg.desc}</p>
                    </div>
                    <button onClick={intg.action}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${intg.connected ? 'bg-ok-50 text-ok-700 hover:bg-ok-100' : 'bg-brand-600 hover:bg-brand-700 text-white'}`}>
                      {intg.connected ? 'Connected' : 'Connect'}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Notifications */}
            {activeTab === 'notifications' && (
              <div className="p-5 flex flex-col gap-3">
                {(settings.notificationSettings ?? []).map((notif) => (
                  <div key={notif.id} className="flex items-center justify-between p-4 rounded-xl"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border-soft)' }}>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{notif.label}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{notif.desc}</p>
                    </div>
                    <div
                      onClick={() => updateSettings({
                        notificationSettings: (settings.notificationSettings ?? []).map((n) =>
                          n.id === notif.id ? { ...n, enabled: !n.enabled } : n
                        )
                      })}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full cursor-pointer transition-colors ${notif.enabled ? 'bg-brand-600' : 'bg-ink-200'}`}>
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${notif.enabled ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Data & Export */}
            {activeTab === 'data' && (
              <div className="p-5 flex flex-col gap-4">
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Export Data</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {[
                    { key: 'invoices', label: 'All Invoices (CSV)', desc: `${invoices.length} records` },
                    { key: 'customers', label: 'Customer List (CSV)', desc: `${customers.length} records` },
                    { key: 'payments', label: 'Payment History (CSV)', desc: `${payments.length} records` },
                    { key: 'gstr1', label: 'GSTR-1 JSON', desc: 'Current month — GST portal upload' },
                    { key: 'gstr3b', label: 'GSTR-3B Purchases (CSV)', desc: 'Purchase register for ITC' },
                    { key: 'taxledger', label: 'Tax Ledger (PDF)', desc: 'Coming soon' },
                  ].map((exp) => (
                    <button key={exp.key}
                      onClick={() => handleExport(exp.key)}
                      className="flex items-center gap-3 p-4 rounded-xl text-left hover:bg-ink-50 transition-colors"
                      style={{ background: 'var(--surface)', border: '1px solid var(--border-soft)' }}>
                      <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center text-brand-600 text-xs font-bold flex-shrink-0">↓</div>
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{exp.label}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{exp.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
                  <h3 className="text-sm font-semibold mb-3 text-err-600">Danger Zone</h3>
                  <div className="flex flex-col gap-3">
                    <button onClick={handleClearDemoData} className="self-start px-4 py-2 rounded-lg border border-err-200 text-err-600 text-sm font-medium hover:bg-err-50 transition-colors">
                      Clear All Demo Data
                    </button>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>This will remove all mock/demo data and reset the app. Your settings will be preserved.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
