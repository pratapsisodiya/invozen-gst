import { Suspense } from 'react'
import { DebitNoteListClient } from '@/app/components/creditNotes/DebitNoteListClient'

export default function DebitNotesPage() {
  return <Suspense><DebitNoteListClient /></Suspense>
}
