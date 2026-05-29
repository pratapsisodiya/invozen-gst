'use client'

import { SignIn } from '@clerk/nextjs'

export function LoginForm() {
  return (
    <div className="flex flex-col items-center">
      <SignIn
        path="/login"
        routing="path"
        signUpUrl="/signup"
        fallbackRedirectUrl="/dashboard"
        signUpForceRedirectUrl="/onboarding"
        appearance={{
          elements: {
            rootBox: "w-full",
            card: "shadow-2xl border border-neutral-200/60 rounded-2xl w-full",
            headerTitle: "text-2xl font-bold tracking-tight text-neutral-900",
            headerSubtitle: "text-neutral-500",
            socialButtonsBlockButton: "border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300 transition-colors shadow-sm",
            socialButtonsBlockButtonText: "font-medium text-neutral-700",
            dividerLine: "bg-neutral-200",
            dividerText: "text-neutral-400 font-medium",
            formFieldLabel: "text-neutral-700 font-medium",
            formFieldInput: "rounded-lg border-neutral-300 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 shadow-sm",
            formButtonPrimary: "bg-neutral-900 hover:bg-neutral-800 text-white font-medium rounded-lg py-2.5 shadow-sm transition-all",
            footerActionText: "text-neutral-500",
            footerActionLink: "text-brand-600 hover:text-brand-700 font-semibold",
          }
        }}
      />
      <p className="text-xs text-center mt-6 text-neutral-500 font-medium">
        Secure and encrypted. Trusted by Indian businesses.
      </p>
    </div>
  )
}
