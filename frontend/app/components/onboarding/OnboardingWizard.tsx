'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store/authStore'
import { useBusinessStore } from '@/lib/store/businessStore'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { GSTINInput } from '../ui/GSTINInput'
import { cn } from '@/lib/utils/cn'
import { CheckCircle } from 'lucide-react'

const STEPS = ['Business Profile', 'GST Details', 'Address', 'Invoice Settings', 'Payment']

export function OnboardingWizard() {
  const [step, setStep] = useState(0)
  const { completeOnboarding } = useAuthStore()
  const { profile, settings, updateProfile, updateSettings } = useBusinessStore()
  const router = useRouter()

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1))
  const back = () => setStep((s) => Math.max(s - 1, 0))

  const finish = () => {
    completeOnboarding()
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-warm)' }}>
      <div className="w-full max-w-xl">
        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center gap-1 mb-2">
            {STEPS.map((s, i) => (
              <div key={i} className={cn('flex-1 h-1 rounded-full transition-colors', i <= step ? 'bg-brand-600' : 'bg-ink-200')} />
            ))}
          </div>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Step {step + 1} of {STEPS.length}: <strong style={{ color: 'var(--text)' }}>{STEPS[step]}</strong></p>
        </div>

        <div className="rounded-2xl bg-white p-8" style={{ boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)' }}>
          {step === 0 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Business Profile</h2>
              <Input label="Business / Trade Name" value={profile.businessName} onChange={(e) => updateProfile({ businessName: e.target.value })} required />
              <Input label="Legal Name" value={profile.legalName} onChange={(e) => updateProfile({ legalName: e.target.value })} helper="If different from trade name" />
              <Select label="Business Type" value={profile.businessType}
                onChange={(e) => updateProfile({ businessType: e.target.value })}
                options={[
                  { value: 'Sole Proprietor', label: 'Sole Proprietor' },
                  { value: 'Partnership', label: 'Partnership' },
                  { value: 'Pvt Ltd', label: 'Private Limited' },
                  { value: 'LLP', label: 'LLP' },
                  { value: 'Other', label: 'Other' },
                ]}
              />
              <Select label="Industry" value={profile.industry}
                onChange={(e) => updateProfile({ industry: e.target.value })}
                options={[
                  { value: 'Retail', label: 'Retail' },
                  { value: 'Wholesale', label: 'Wholesale' },
                  { value: 'Services', label: 'Services' },
                  { value: 'Manufacturing', label: 'Manufacturing' },
                  { value: 'Freelance', label: 'Freelance' },
                  { value: 'Other', label: 'Other' },
                ]}
              />
              <Input label="Business Phone" type="tel" value={profile.phone} onChange={(e) => updateProfile({ phone: e.target.value })} />
              <Input label="Business Email" type="email" value={profile.email} onChange={(e) => updateProfile({ email: e.target.value })} />
            </div>
          )}

          {step === 1 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-xl font-bold" style={{ color: 'var(--text)' }}>GST Details</h2>
              <GSTINInput value={profile.gstin} onChange={(v) => updateProfile({ gstin: v })} onValidated={(r) => { if (r.state) updateProfile({ state: r.state, stateCode: r.stateCode || '' }) }} required />
              <Select label="GST Registration Type" value={profile.gstRegistrationType}
                onChange={(e) => updateProfile({ gstRegistrationType: e.target.value as 'regular' | 'composition' | 'unregistered' })}
                options={[
                  { value: 'regular', label: 'Regular' },
                  { value: 'composition', label: 'Composition Scheme' },
                  { value: 'unregistered', label: 'Unregistered' },
                ]}
              />
              <Select label="Filing Frequency" value={profile.filingFrequency}
                onChange={(e) => updateProfile({ filingFrequency: e.target.value as 'monthly' | 'quarterly' })}
                options={[
                  { value: 'monthly', label: 'Monthly' },
                  { value: 'quarterly', label: 'Quarterly (QRMP)' },
                ]}
              />
              {profile.panNumber && (
                <div className="p-3 rounded-lg" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>PAN (derived from GSTIN)</p>
                  <p className="text-sm font-mono font-medium" style={{ color: 'var(--text)' }}>{profile.panNumber}</p>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Business Address</h2>
              <Input label="Address Line 1" value={profile.billingAddress.line1} onChange={(e) => updateProfile({ billingAddress: { ...profile.billingAddress, line1: e.target.value } })} required />
              <Input label="Address Line 2" value={profile.billingAddress.line2 || ''} onChange={(e) => updateProfile({ billingAddress: { ...profile.billingAddress, line2: e.target.value } })} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="City" value={profile.billingAddress.city} onChange={(e) => updateProfile({ billingAddress: { ...profile.billingAddress, city: e.target.value } })} required />
                <Input label="PIN Code" value={profile.billingAddress.pincode} onChange={(e) => updateProfile({ billingAddress: { ...profile.billingAddress, pincode: e.target.value } })} required />
              </div>
              <Input label="State" value={profile.billingAddress.state} onChange={(e) => updateProfile({ billingAddress: { ...profile.billingAddress, state: e.target.value } })} required />
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Invoice Settings</h2>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Invoice Prefix" value={settings.invoiceSettings.invoicePrefix} onChange={(e) => updateSettings({ invoiceSettings: { ...settings.invoiceSettings, invoicePrefix: e.target.value } })} placeholder="INV" />
                <Input label="Start Number" type="number" value={String(settings.invoiceSettings.invoiceStartNumber)} onChange={(e) => updateSettings({ invoiceSettings: { ...settings.invoiceSettings, invoiceStartNumber: Number(e.target.value) } })} />
              </div>
              <Select label="Default Due Period" value={String(settings.invoiceSettings.duePeriodDays)}
                onChange={(e) => updateSettings({ invoiceSettings: { ...settings.invoiceSettings, duePeriodDays: Number(e.target.value) } })}
                options={[
                  { value: '0', label: 'Due immediately' },
                  { value: '7', label: '7 days' },
                  { value: '14', label: '14 days' },
                  { value: '30', label: '30 days' },
                  { value: '45', label: '45 days' },
                  { value: '60', label: '60 days' },
                ]}
              />
              <div>
                <p className="text-[13px] font-medium mb-2" style={{ color: 'var(--text-2)' }}>Invoice Template</p>
                <div className="grid grid-cols-3 gap-2">
                  {(['standard', 'compact', 'detailed'] as const).map((t) => (
                    <button key={t} onClick={() => updateSettings({ invoiceSettings: { ...settings.invoiceSettings, defaultTemplate: t } })}
                      className={cn('p-3 rounded-lg border text-center text-xs font-medium transition-colors capitalize', settings.invoiceSettings.defaultTemplate === t ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-[var(--border)] hover:border-brand-300')}
                      style={{ color: settings.invoiceSettings.defaultTemplate === t ? undefined : 'var(--text)' }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Payment Settings</h2>
              <Input label="Bank Name" value={settings.bankDetails.bankName} onChange={(e) => updateSettings({ bankDetails: { ...settings.bankDetails, bankName: e.target.value } })} />
              <Input label="Account Number" value={settings.bankDetails.accountNumber} onChange={(e) => updateSettings({ bankDetails: { ...settings.bankDetails, accountNumber: e.target.value } })} />
              <Input label="IFSC Code" value={settings.bankDetails.ifscCode} onChange={(e) => updateSettings({ bankDetails: { ...settings.bankDetails, ifscCode: e.target.value } })} />
              <Input label="UPI ID" value={settings.bankDetails.upiId} onChange={(e) => updateSettings({ bankDetails: { ...settings.bankDetails, upiId: e.target.value } })} placeholder="name@upi" />
              <Input label="WhatsApp Number" type="tel" value={settings.whatsappNumber} onChange={(e) => updateSettings({ whatsappNumber: e.target.value })} helper="For sending payment reminders" />
            </div>
          )}

          <div className="flex items-center justify-between mt-8">
            <button
              onClick={back}
              disabled={step === 0}
              className="px-4 py-2 text-sm font-medium rounded-lg border hover:bg-ink-50 transition-colors disabled:opacity-30"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
            >
              Back
            </button>
            {step < STEPS.length - 1 ? (
              <button onClick={next} className="px-6 py-2 text-sm font-semibold rounded-lg bg-brand-600 hover:bg-brand-700 text-white transition-colors">
                Continue →
              </button>
            ) : (
              <button onClick={finish} className="px-6 py-2 text-sm font-semibold rounded-lg bg-brand-600 hover:bg-brand-700 text-white transition-colors flex items-center gap-2">
                <CheckCircle className="w-4 h-4" /> Complete Setup
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-sm mt-4" style={{ color: 'var(--text-muted)' }}>
          <button onClick={finish} className="hover:text-brand-600 transition-colors">Skip and go to dashboard →</button>
        </p>
      </div>
    </div>
  )
}
