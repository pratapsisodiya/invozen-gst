import { CustomerFormClient } from '@/app/components/customers/CustomerFormClient'

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <CustomerFormClient editId={id} />
}
