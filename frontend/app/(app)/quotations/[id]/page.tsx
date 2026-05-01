import { QuotationDetailClient } from '@/app/components/quotations/QuotationDetailClient'

export default async function QuotationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <QuotationDetailClient id={id} />
}
