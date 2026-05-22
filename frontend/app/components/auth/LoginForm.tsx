'use client'

import { SignIn } from '@clerk/nextjs'

export function LoginForm() {
  return (
    <div className="rounded-2xl bg-white p-8" style={{ boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-2 mb-8">
        <span className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white text-sm font-bold">G</span>
        <span className="font-bold text-base" style={{ color: 'var(--text)' }}>Invozen GST</span>
      </div>

      <SignIn
        path="/login"
        routing="path"
        signUpUrl="/signup"
        fallbackRedirectUrl="/dashboard"
        signUpForceRedirectUrl="/onboarding"
      />

      <p className="text-[11px] text-center mt-3" style={{ color: 'var(--text-faint)' }}>
        Secure and encrypted. Trusted by Indian businesses.
      </p>
    </div>
  )
}
