import { Suspense } from 'react'
import { VendorListClient } from '@/app/components/vendors/VendorListClient'

export default function VendorsPage() {
  return <Suspense><VendorListClient /></Suspense>
}
