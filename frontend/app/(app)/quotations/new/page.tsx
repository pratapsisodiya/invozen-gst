import { Suspense } from 'react'
import { QuotationFormClient } from '@/app/components/quotations/QuotationFormClient'

export default function NewQuotationPage() {
  return <Suspense><QuotationFormClient /></Suspense>
}
