import { CustomerStatementClient } from '@/app/components/customers/CustomerStatementClient'

export default async function CustomerStatementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <CustomerStatementClient customerId={id} />
}
