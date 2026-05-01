import { Suspense } from 'react'
import { ItemListClient } from '@/app/components/items/ItemListClient'

export default function ItemsPage() {
  return <Suspense><ItemListClient /></Suspense>
}
