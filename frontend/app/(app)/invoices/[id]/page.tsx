import { notFound } from 'next/navigation'
import { InvoiceDetailClient } from '@/app/components/invoices/InvoiceDetailClient'

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!id || !/^[\w-]+$/.test(id)) notFound()
  return <InvoiceDetailClient id={id} />
}
