'use client'
import { useState } from 'react'
import { useBusinessStore } from '@/lib/store/businessStore'
import { useUIStore } from '@/lib/store/uiStore'
import { TopBar } from '../app/TopBar'
import { Tabs } from '../ui/Tabs'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { GST_RATES, STATE_CODES } from '@/lib/gst/constants'

const STATE_OPTIONS = Object.entries(STATE_CODES).map(([code, name]) => ({ value: code, label: name }))

const TABS = [
  { key: 'profile', label: 'Business Profile' },
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
  const [activeTab, setActiveTab] = useState('profile')
  const [saving, setSaving] = useState(false)
  const [notifSettings, setNotifSettings] = useState([
    { id: 'n1', label: 'Invoice paid notification', desc: 'Get notified when a customer pays an invoice', enabled: true },
    { id: 'n2', label: 'Payment overdue alert', desc: 'Alert when invoices become overdue', enabled: true },
    { id: 'n3', label: 'GST filing reminder', desc: 'Reminder before GST due dates', enabled: true },
    { id: 'n4', label: 'WhatsApp reminder sent', desc: 'Confirmation when reminder is delivered', enabled: false },
    { id: 'n5', label: 'New accountant access', desc: 'When accountant logs in to your portal', enabled: true },
    { id: 'n6', label: 'Weekly summary', desc: 'Weekly email digest of business activity', enabled: false },
  ])

  const save = (fn: () => void) => {
    setSaving(true)
    setTimeout(() => {
      fn()
      setSaving(false)
      addToast({ type: 'success', title: 'Settings saved' })
    }, 500)
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

            {/* Team */}
            {activeTab === 'team' && (
              <div className="p-5 flex flex-col gap-4">
                <div className="rounded-xl p-4 flex items-center justify-between"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border-soft)' }}>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Prakash Agarwal</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>prakash@example.com · Owner</p>
                  </div>
                  <span className="px-2 py-1 rounded text-[11px] font-medium bg-brand-50 text-brand-700">Owner</span>
                </div>
                <button className="self-start px-4 py-2 rounded-lg border text-sm font-medium hover:bg-ink-50 transition-colors"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
                  + Invite Team Member
                </button>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Invite accountants or staff members with read-only or limited access. Team members can be assigned roles: Owner, Admin, Accountant, Staff.
                </p>
              </div>
            )}

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
                {notifSettings.map((notif) => (
                  <div key={notif.id} className="flex items-center justify-between p-4 rounded-xl"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border-soft)' }}>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{notif.label}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{notif.desc}</p>
                    </div>
                    <div
                      onClick={() => setNotifSettings((prev) => prev.map((n) => n.id === notif.id ? { ...n, enabled: !n.enabled } : n))}
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
                    { label: 'All Invoices (Excel)', desc: 'Export complete invoice data' },
                    { label: 'Customer List (CSV)', desc: 'Export all customer records' },
                    { label: 'Payment History (Excel)', desc: 'All payment transactions' },
                    { label: 'GSTR-1 JSON', desc: 'GST return data for upload' },
                    { label: 'GSTR-3B Excel', desc: 'Summary return worksheet' },
                    { label: 'Tax Ledger (PDF)', desc: 'Complete tax summary report' },
                  ].map((exp) => (
                    <button key={exp.label}
                      onClick={() => addToast({ type: 'success', title: 'Export started', message: exp.label })}
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
                    <button className="self-start px-4 py-2 rounded-lg border border-err-200 text-err-600 text-sm font-medium hover:bg-err-50 transition-colors">
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
