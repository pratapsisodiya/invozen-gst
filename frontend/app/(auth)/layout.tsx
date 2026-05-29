import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()

  if (userId) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white">
      {/* Left side - Artwork / Branding */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-neutral-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-brand-600 via-neutral-900 to-neutral-950"></div>
        
        <Link href="/" className="z-10 flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white text-lg font-bold shadow-lg">G</div>
          <span className="font-bold text-xl tracking-tight">Invozen GST</span>
        </Link>

        <div className="z-10 mt-auto">
          <blockquote className="mb-8">
            <p className="text-3xl font-medium leading-tight text-white mb-4">
              "The most intuitive GST compliance platform we've used. It reduced our monthly filing time by 80%."
            </p>
            <footer className="text-neutral-400">
              <strong className="text-white">Rajiv Sharma</strong> — Managing Director, Sharma Traders
            </footer>
          </blockquote>
          
          <div className="flex gap-4 text-sm text-neutral-400 border-t border-neutral-800 pt-6">
            <span>✓ Auto-GSTR 1/3B</span>
            <span>✓ E-Invoicing Ready</span>
            <span>✓ Smart ITC matching</span>
          </div>
        </div>
      </div>

      {/* Right side - Forms wrapper */}
      <div className="flex items-center justify-center p-4 lg:p-12" style={{ background: 'var(--bg-warm)' }}>
        <div className="w-full max-w-[420px]">
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <span className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white text-sm font-bold shadow-sm">G</span>
            <span className="font-bold text-lg" style={{ color: 'var(--text)' }}>Invozen GST</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
