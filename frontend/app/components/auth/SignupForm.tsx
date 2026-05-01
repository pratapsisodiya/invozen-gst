'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store/authStore'
import { seedMockData } from '@/lib/mock/seed'
import { Input } from '../ui/Input'

export function SignupForm() {
  const [form, setForm] = useState({ name: '', businessName: '', phone: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const { login } = useAuthStore()
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      login({
        id: 'user-01',
        name: form.name || 'New User',
        email: form.email,
        phone: form.phone,
        role: 'owner',
        avatarInitials: form.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() || 'NU',
        createdAt: new Date().toISOString(),
      })
      seedMockData()
      setLoading(false)
      router.push('/onboarding')
    }, 1000)
  }

  return (
    <div className="rounded-2xl bg-white p-8" style={{ boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-2 mb-6">
        <span className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white text-sm font-bold">G</span>
        <span className="font-bold text-base" style={{ color: 'var(--text)' }}>Invozen GST</span>
      </div>
      <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text)' }}>Create account</h1>
      <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Start your free trial today</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input label="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Prakash Agarwal" required />
        <Input label="Business Name" value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} placeholder="My Business Pvt. Ltd." required />
        <Input label="Mobile Number" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="9876543210" maxLength={10} required />
        <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" required />
        <Input label="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min. 8 characters" minLength={8} required />
        <button
          type="submit"
          disabled={loading}
          className="w-full h-10 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 mt-1"
        >
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

      <div className="mt-4 pt-4 border-t text-center" style={{ borderColor: 'var(--border)' }}>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Already have an account?{' '}
          <Link href="/login" className="text-brand-600 font-medium hover:text-brand-700">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
