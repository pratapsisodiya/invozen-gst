import { InvoiceFormClient } from '@/app/components/invoices/InvoiceFormClient'

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <InvoiceFormClient editId={id} />
}
