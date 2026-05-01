import { Suspense } from 'react'
import { CreditNoteFormClient } from '@/app/components/creditNotes/CreditNoteFormClient'

export default function NewCreditNotePage() {
  return <Suspense><CreditNoteFormClient /></Suspense>
}
