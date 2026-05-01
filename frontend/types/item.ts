export type ItemType = 'product' | 'service'

export interface Item {
  id: string
  name: string
  description: string | null
  type: ItemType
  hsnCode: string | null
  sacCode: string | null
  unit: string
  defaultRate: number
  defaultGstRate: number
  isActive: boolean
  trackInventory: boolean
  stockQuantity: number | null
  lowStockThreshold: number | null
  createdAt: string
}

export const UNITS = [
  'NOS', 'KGS', 'MTR', 'LTR', 'HRS', 'DAYS', 'PCS', 'BOX', 'SET', 'PAIR',
  'SQM', 'CBM', 'TON', 'GM', 'ML', 'KM', 'BAG', 'PKT', 'ROLL', 'SHEET'
] as const

export type Unit = typeof UNITS[number]
