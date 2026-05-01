'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Input } from '../ui/Input'

export function ForgotPasswordForm() {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleStep1 = () => {
    setLoading(true)
    setTimeout(() => { setLoading(false); setStep(2) }, 800)
  }
  const handleStep2 = () => {
    setLoading(true)
    setTimeout(() => { setLoading(false); setStep(3) }, 800)
  }
  const handleStep3 = () => {
    setLoading(true)
    setTimeout(() => { setLoading(false); window.location.href = '/login' }, 800)
  }

  return (
    <div className="rounded-2xl bg-white p-8" style={{ boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-2 mb-6">
        <span className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white text-sm font-bold">G</span>
        <span className="font-bold text-base" style={{ color: 'var(--text)' }}>Invozen GST</span>
      </div>

      {step === 1 && (
        <>
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text)' }}>Reset password</h1>
          <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Enter your registered mobile number</p>
          <div className="flex flex-col gap-4">
            <Input label="Mobile Number" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="9876543210" maxLength={10} />
            <button onClick={handleStep1} disabled={loading || phone.length !== 10} className="w-full h-10 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold disabled:opacity-50">
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text)' }}>Enter OTP</h1>
          <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>OTP sent to +91 {phone}</p>
          <div className="flex flex-col gap-4">
            <Input label="6-digit OTP" value={otp} onChange={(e) => setOtp(e.target.value.slice(0, 6))} placeholder="XXXXXX" />
            <button onClick={handleStep2} disabled={loading || otp.length !== 6} className="w-full h-10 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold disabled:opacity-50">
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text)' }}>New password</h1>
          <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Set a new password for your account</p>
          <div className="flex flex-col gap-4">
            <Input label="New Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 8 characters" minLength={8} />
            <button onClick={handleStep3} disabled={loading || password.length < 8} className="w-full h-10 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold disabled:opacity-50">
              {loading ? 'Saving...' : 'Set New Password'}
            </button>
          </div>
        </>
      )}

      <div className="mt-4 text-center">
        <Link href="/login" className="text-sm text-brand-600 hover:text-brand-700 font-medium">← Back to login</Link>
      </div>
    </div>
  )
}
