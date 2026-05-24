'use client'
import { useMemo } from 'react'
import { useInventoryStore } from '@/lib/store/inventoryStore'
import { useItemStore } from '@/lib/store/itemStore'
import { TopBar } from '../app/TopBar'
import { AlertTriangle, Package, TrendingDown, TrendingUp } from 'lucide-react'
import { formatDate } from '@/lib/utils/formatters'

export function InventoryClient() {
  const { snapshots, movements, setReorderPoint } = useInventoryStore()
  const { items } = useItemStore()

  const itemMap = useMemo(() => {
    const m: Record<string, { name: string; unit: string }> = {}
    items.forEach((item) => { m[item.id] = { name: item.name, unit: item.unit || 'Nos' } })
    return m
  }, [items])

  const stockItems = useMemo(() => {
    return items
      .filter((item) => item.trackInventory)
      .map((item) => {
        const snap = snapshots.find((s) => s.itemId === item.id)
        const stock = snap?.currentStock ?? 0
        const reorderPoint = snap?.reorderPoint ?? item.lowStockThreshold ?? 5
        return {
          id: item.id,
          name: item.name,
          unit: item.unit || 'Nos',
          stock,
          reorderPoint,
          isLow: stock <= reorderPoint,
          lastMovementAt: snap?.lastMovementAt,
        }
      })
  }, [items, snapshots])

  const lowStockCount = stockItems.filter((i) => i.isLow).length
  const totalItems = stockItems.length
  const recentMovements = movements.slice(0, 20)

  return (
    <div className="flex flex-col flex-1">
      <TopBar title="Inventory" breadcrumb={[{ label: 'Items', href: '/items' }]} />

      <div className="flex-1 p-4 lg:p-6 flex flex-col gap-5">
        {/* KPIs */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {[
            { label: 'Tracked Items', value: totalItems, icon: Package, color: 'text-brand-600' },
            { label: 'Low Stock Alerts', value: lowStockCount, icon: AlertTriangle, color: lowStockCount > 0 ? 'text-err-600' : 'text-ok-600' },
            { label: 'Recent Movements', value: movements.length, icon: TrendingUp, color: 'text-brand-600' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-xl p-4 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <Icon className={`w-5 h-5 mx-auto mb-1 ${color}`} />
              <p className={`text-xl font-bold ${color}`}>{value}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
            </div>
          ))}
        </div>

        {stockItems.length === 0 ? (
          <div className="rounded-xl p-8 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <Package className="w-10 h-10 mx-auto mb-3 text-brand-600 opacity-40" />
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>No inventory items tracked</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Enable &ldquo;Track Inventory&rdquo; on items to see stock levels here</p>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            <div className="px-4 py-3" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Stock Levels</h3>
            </div>
            <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Item', 'Current Stock', 'Reorder Point', 'Status', 'Last Movement'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stockItems.map((item) => (
                  <tr key={item.id} className={`h-11 border-t ${item.isLow ? 'bg-err-50/30' : ''}`} style={{ borderColor: 'var(--border-soft)' }}>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        {item.isLow && <AlertTriangle className="w-3.5 h-3.5 text-err-600 flex-shrink-0" />}
                        <span className="text-[13px] font-medium" style={{ color: 'var(--text)' }}>{item.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-[13px] font-bold tabular-nums ${item.isLow ? 'text-err-600' : 'text-ok-600'}`}>
                        {item.stock} {item.unit}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <input
                        type="number"
                        defaultValue={item.reorderPoint}
                        onBlur={(e) => setReorderPoint(item.id, parseInt(e.target.value) || 5)}
                        className="w-16 h-7 border rounded px-2 text-[12px] outline-none"
                        style={{ borderColor: 'var(--border)' }}
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${item.isLow ? 'bg-err-50 text-err-700' : 'bg-ok-50 text-ok-700'}`}>
                        {item.isLow ? 'Low Stock' : 'In Stock'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-[13px]" style={{ color: 'var(--text-muted)' }}>
                      {item.lastMovementAt ? formatDate(item.lastMovementAt) : 'No movements'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}

        {/* Recent movements */}
        {recentMovements.length > 0 && (
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            <div className="px-4 py-3" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Recent Movements</h3>
            </div>
            <div className="flex flex-col">
              {recentMovements.map((m) => (
                <div key={m.id} className="flex items-center gap-3 px-4 py-2.5 border-t" style={{ borderColor: 'var(--border-soft)' }}>
                  {m.type === 'in'
                    ? <TrendingUp className="w-4 h-4 text-ok-600 flex-shrink-0" />
                    : <TrendingDown className="w-4 h-4 text-err-600 flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium" style={{ color: 'var(--text)' }}>{m.itemName}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {m.referenceType === 'invoice' ? 'Sold' : m.referenceType === 'purchase' ? 'Purchased' : 'Manual'} ·
                      {m.referenceNumber && ` ${m.referenceNumber} ·`} {formatDate(m.createdAt)}
                    </p>
                  </div>
                  <span className={`text-[13px] font-bold tabular-nums ${m.type === 'in' ? 'text-ok-600' : 'text-err-600'}`}>
                    {m.type === 'in' ? '+' : '-'}{m.quantity}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
