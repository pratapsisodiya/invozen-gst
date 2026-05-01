import { Suspense } from 'react'
import { CreditNoteListClient } from '@/app/components/creditNotes/CreditNoteListClient'

export default function CreditNotesPage() {
  return <Suspense><CreditNoteListClient /></Suspense>
}
