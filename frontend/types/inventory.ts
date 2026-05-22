export type MovementType = 'in' | 'out' | 'adjustment'

export interface StockMovement {
  id: string
  itemId: string
  itemName: string
  type: MovementType
  quantity: number
  referenceType: 'invoice' | 'purchase' | 'manual'
  referenceId: string | null
  referenceNumber: string | null
  notes: string | null
  createdAt: string
}

export interface InventorySnapshot {
  itemId: string
  currentStock: number
  reorderPoint: number
  lastMovementAt: string | null
}
