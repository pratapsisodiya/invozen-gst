import { Suspense } from 'react'
import { PurchaseListClient } from '@/app/components/purchases/PurchaseListClient'

export default function PurchasesPage() {
  return <Suspense><PurchaseListClient /></Suspense>
}
