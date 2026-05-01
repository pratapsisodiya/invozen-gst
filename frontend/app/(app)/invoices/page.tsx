import { Suspense } from 'react'
import { InvoiceListClient } from '@/app/components/invoices/InvoiceListClient'

export default function InvoicesPage() {
  return <Suspense><InvoiceListClient /></Suspense>
}
