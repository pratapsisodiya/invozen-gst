import { Suspense } from 'react'
import { PurchaseFormClient } from '@/app/components/purchases/PurchaseFormClient'

export default function NewPurchasePage() {
  return <Suspense><PurchaseFormClient /></Suspense>
}
