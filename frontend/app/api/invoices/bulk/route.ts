import { NextRequest, NextResponse } from 'next/server'
import { backendPost, APIError } from '@/lib/api'
import type { InvoiceStatus } from '@/types/invoice'

interface BulkRequest {
  action: 'updateStatus' | 'delete'
  ids: string[]
  status?: InvoiceStatus
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as BulkRequest
    if (!Array.isArray(body?.ids) || !body.ids.length) {
      return NextResponse.json({ error: 'ids array required' }, { status: 400 })
    }

    if (body.action === 'updateStatus' && !body.status) {
      return NextResponse.json({ error: 'status required' }, { status: 400 })
    }

    const result = await backendPost<{ updated?: number; deleted?: number }>('/bulk/invoices', body)
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof APIError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('[POST /api/invoices/bulk]', err)
    return NextResponse.json({ error: 'Bulk operation failed' }, { status: 500 })
  }
}
