import { Suspense } from 'react'
import { CustomerListClient } from '@/app/components/customers/CustomerListClient'

export default function CustomersPage() {
  return <Suspense><CustomerListClient /></Suspense>
}
