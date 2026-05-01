'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store/authStore'
import { seedMockData } from '@/lib/mock/seed'

export function LoginForm() {
  const [phone, setPhone] = useState('9876543210')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const { login, completeOnboarding } = useAuthStore()
  const router = useRouter()

  const sendOtp = () => {
    setLoading(true)
    setTimeout(() => {
      setOtpSent(true)
      setLoading(false)
      setCountdown(30)
      const timer = setInterval(() => {
        setCountdown((c) => { if (c <= 1) { clearInterval(timer); return 0 } return c - 1 })
      }, 1000)
    }, 800)
  }

  const handleVerify = () => {
    setLoading(true)
    setTimeout(() => {
      login({
        id: 'user-01',
        name: 'Prakash Agarwal',
        email: 'prakash@example.com',
        phone,
        role: 'owner',
        avatarInitials: 'PA',
        createdAt: '2024-04-01T00:00:00Z',
      })
      completeOnboarding()
      seedMockData()
      setLoading(false)
      router.push('/dashboard')
    }, 800)
  }

  return (
    <div className="rounded-2xl bg-white p-8" style={{ boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)' }}>
      {/* Logo */}
      <div className="flex items-center gap-2 mb-8">
        <span className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white text-sm font-bold">G</span>
        <span className="font-bold text-base" style={{ color: 'var(--text)' }}>Invozen GST</span>
      </div>

      <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text)' }}>Welcome back</h1>
      <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Sign in to your workspace</p>

      <div className="flex flex-col gap-4">
        <div>
          <label className="text-[13px] font-medium mb-1 block" style={{ color: 'var(--text-2)' }}>Mobile Number</label>
          <div className="flex gap-2">
            <span className="flex items-center px-3 h-10 rounded-lg border text-sm font-medium" style={{ borderColor: 'var(--border)', color: 'var(--text-2)' }}>🇮🇳 +91</span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="9876543210"
              maxLength={10}
              className="flex-1 h-10 rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
            />
          </div>
        </div>

        {!otpSent ? (
          <button
            onClick={sendOtp}
            disabled={loading || phone.length !== 10}
            className="w-full h-10 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {loading ? 'Sending OTP...' : 'Send OTP'}
          </button>
        ) : (
          <>
            <div>
              <label className="text-[13px] font-medium mb-1 block" style={{ color: 'var(--text-2)' }}>Enter OTP</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.slice(0, 6))}
                placeholder="6-digit OTP"
                className="w-full h-10 rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600 tracking-widest text-center"
                style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
              />
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>OTP sent to +91 {phone}</p>
                {countdown > 0
                  ? <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Resend in {countdown}s</span>
                  : <button onClick={sendOtp} className="text-xs font-medium text-brand-600 hover:text-brand-700">Resend OTP</button>
                }
              </div>
            </div>
            <button
              onClick={handleVerify}
              disabled={loading || otp.length !== 6}
              className="w-full h-10 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify & Sign In'}
            </button>
          </>
        )}
      </div>

      <div className="mt-4 pt-4 border-t text-center" style={{ borderColor: 'var(--border)' }}>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-brand-600 font-medium hover:text-brand-700">Sign up</Link>
        </p>
      </div>

      <p className="text-[11px] text-center mt-3" style={{ color: 'var(--text-faint)' }}>
        🔒 Secure & encrypted · Trusted by 4,000+ businesses
      </p>
    </div>
  )
}
