import { Suspense } from 'react'
import { RecurringListClient } from '@/app/components/recurring/RecurringListClient'

export default function RecurringPage() {
  return <Suspense><RecurringListClient /></Suspense>
}
