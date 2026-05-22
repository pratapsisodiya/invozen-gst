import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { StockMovement, InventorySnapshot, MovementType } from '@/types/inventory'
import { generateId } from '../utils/ids'

interface InventoryState {
  movements: StockMovement[]
  snapshots: InventorySnapshot[]
  addMovement: (movement: Omit<StockMovement, 'id' | 'createdAt'>) => void
  getStockLevel: (itemId: string) => number
  getMovementsByItem: (itemId: string) => StockMovement[]
  getSnapshot: (itemId: string) => InventorySnapshot | undefined
  setReorderPoint: (itemId: string, reorderPoint: number) => void
  getLowStockItems: (itemIds: string[], itemMap: Record<string, { name: string; reorderPoint?: number }>) => Array<{ itemId: string; name: string; stock: number; reorderPoint: number }>
}

export const useInventoryStore = create<InventoryState>()(
  persist(
    immer((set, get) => ({
      movements: [],
      snapshots: [],

      addMovement: (movement) =>
        set((state) => {
          const id = generateId()
          const now = new Date().toISOString()
          state.movements.unshift({ ...movement, id, createdAt: now })

          // Update snapshot
          const snapIdx = state.snapshots.findIndex((s) => s.itemId === movement.itemId)
          const currentStock = get().getStockLevel(movement.itemId)
          const delta = movement.type === 'in' ? movement.quantity : movement.type === 'out' ? -movement.quantity : movement.quantity
          const newStock = Math.max(0, currentStock + delta)

          if (snapIdx !== -1) {
            state.snapshots[snapIdx].currentStock = newStock
            state.snapshots[snapIdx].lastMovementAt = now
          } else {
            state.snapshots.push({
              itemId: movement.itemId,
              currentStock: newStock,
              reorderPoint: 5,
              lastMovementAt: now,
            })
          }
        }),

      getStockLevel: (itemId) => {
        const snap = get().snapshots.find((s) => s.itemId === itemId)
        return snap?.currentStock ?? 0
      },

      getMovementsByItem: (itemId) =>
        get().movements.filter((m) => m.itemId === itemId),

      getSnapshot: (itemId) => get().snapshots.find((s) => s.itemId === itemId),

      setReorderPoint: (itemId, reorderPoint) =>
        set((state) => {
          const snap = state.snapshots.find((s) => s.itemId === itemId)
          if (snap) {
            snap.reorderPoint = reorderPoint
          } else {
            state.snapshots.push({ itemId, currentStock: 0, reorderPoint, lastMovementAt: null })
          }
        }),

      getLowStockItems: (itemIds, itemMap) => {
        const { snapshots } = get()
        return itemIds
          .map((itemId) => {
            const snap = snapshots.find((s) => s.itemId === itemId)
            const stock = snap?.currentStock ?? 0
            const reorderPoint = snap?.reorderPoint ?? 5
            const name = itemMap[itemId]?.name ?? itemId
            return { itemId, name, stock, reorderPoint }
          })
          .filter((item) => item.stock <= item.reorderPoint)
      },
    })),
    { name: 'invozen-inventory' }
  )
)
