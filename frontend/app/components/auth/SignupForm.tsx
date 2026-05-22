'use client'

import { SignUp } from '@clerk/nextjs'

export function SignupForm() {
  return (
    <div className="rounded-2xl bg-white p-8" style={{ boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-2 mb-6">
        <span className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white text-sm font-bold">G</span>
        <span className="font-bold text-base" style={{ color: 'var(--text)' }}>Invozen GST</span>
      </div>

      <SignUp
        path="/signup"
        routing="path"
        signInUrl="/login"
        forceRedirectUrl="/onboarding"
        signInFallbackRedirectUrl="/dashboard"
      />
    </div>
  )
}
