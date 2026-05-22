import { ChallanDetailClient } from '@/app/components/challans/ChallanDetailClient'

export default function ChallanDetailPage({ params }: { params: { id: string } }) {
  return <ChallanDetailClient id={params.id} />
}
