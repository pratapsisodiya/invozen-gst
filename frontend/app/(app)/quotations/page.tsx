import { Suspense } from 'react'
import { QuotationListClient } from '@/app/components/quotations/QuotationListClient'

export default function QuotationsPage() {
  return <Suspense><QuotationListClient /></Suspense>
}
