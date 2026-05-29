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
    <div className="flex flex-col items-center">
      <div className="w-full shadow-2xl border border-neutral-200/60 rounded-2xl bg-white p-8">
        
        {step === 1 && (
          <>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 mb-1">Reset password</h1>
            <p className="text-sm text-neutral-500 mb-6">Enter your registered mobile number</p>
            <div className="flex flex-col gap-4">
              <Input label="Mobile Number" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="9876543210" maxLength={10} className="rounded-lg border-neutral-300 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 shadow-sm" />
              <button onClick={handleStep1} disabled={loading || phone.length !== 10} className="w-full h-11 mt-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white font-medium shadow-sm transition-all disabled:opacity-50">
                {loading ? 'Sending...' : 'Send OTP'}
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 mb-1">Enter OTP</h1>
            <p className="text-sm text-neutral-500 mb-6">OTP sent to +91 {phone}</p>
            <div className="flex flex-col gap-4">
              <Input label="6-digit OTP" value={otp} onChange={(e) => setOtp(e.target.value.slice(0, 6))} placeholder="XXXXXX" className="rounded-lg border-neutral-300 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 shadow-sm" />
              <button onClick={handleStep2} disabled={loading || otp.length !== 6} className="w-full h-11 mt-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white font-medium shadow-sm transition-all disabled:opacity-50">
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 mb-1">New password</h1>
            <p className="text-sm text-neutral-500 mb-6">Set a new password for your account</p>
            <div className="flex flex-col gap-4">
              <Input label="New Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 8 characters" minLength={8} className="rounded-lg border-neutral-300 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 shadow-sm" />
              <button onClick={handleStep3} disabled={loading || password.length < 8} className="w-full h-11 mt-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white font-medium shadow-sm transition-all disabled:opacity-50">
                {loading ? 'Saving...' : 'Set New Password'}
              </button>
            </div>
          </>
        )}

        <div className="mt-8 text-center border-t border-neutral-100 pt-6">
          <Link href="/login" className="text-sm text-brand-600 hover:text-brand-700 font-semibold transition-colors">← Back to login</Link>
        </div>
      </div>
      
      <p className="text-xs text-center mt-6 text-neutral-500 font-medium">
        Secure and encrypted. Trusted by Indian businesses.
      </p>
    </div>
  )
}
