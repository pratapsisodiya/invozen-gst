'use client'
import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import type { Invoice } from '@/types/invoice'
import { MONTH_NAMES } from '@/lib/gst/constants'

interface RevenueChartProps {
  invoices: Invoice[]
}

export function RevenueChart({ invoices }: RevenueChartProps) {
  const data = useMemo(() => {
    const now = new Date()
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
      const m = d.getMonth() + 1
      const y = d.getFullYear()
      const monthInvoices = invoices.filter((inv) => {
        const id = new Date(inv.invoiceDate)
        return id.getMonth() + 1 === m && id.getFullYear() === y && inv.status !== 'void'
      })
      const revenue = monthInvoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.grandTotal, 0)
      const gst = monthInvoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.totalTax, 0)
      return { month: MONTH_NAMES[m - 1].slice(0, 3), revenue, gst }
    })
  }, [invoices])

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false}
          tickFormatter={(v) => v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : v >= 1000 ? `₹${(v / 1000).toFixed(0)}K` : `₹${v}`}
        />
        <Tooltip
          contentStyle={{ background: 'white', border: '1px solid var(--border)', borderRadius: '8px', fontSize: 12 }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(value: any, name: any) => [`₹${Number(value ?? 0).toLocaleString('en-IN')}`, name === 'revenue' ? 'Revenue' : 'GST'] as any}
          cursor={{ fill: 'rgba(0,0,0,0.04)' }}
        />
        <Bar dataKey="revenue" fill="#0d9488" radius={[3, 3, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  )
}
