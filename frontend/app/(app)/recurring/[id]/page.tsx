import { RecurringDetailClient } from '@/app/components/recurring/RecurringDetailClient'

export default async function RecurringDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <RecurringDetailClient id={id} />
}
