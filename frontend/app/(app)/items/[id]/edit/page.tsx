import { ItemFormClient } from '@/app/components/items/ItemFormClient'

export default async function EditItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ItemFormClient editId={id} />
}
