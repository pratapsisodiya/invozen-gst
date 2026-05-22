import { NextRequest, NextResponse } from 'next/server'
import { backendGet, backendPost, APIError } from '@/lib/api'
import type { Invoice } from '@/types/invoice'

export async function GET() {
  try {
    const invoices = await backendGet<Invoice[]>('/invoices')
    return NextResponse.json(invoices)
  } catch (err) {
    if (err instanceof APIError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('[GET /api/invoices]', err)
    return NextResponse.json({ error: 'Failed to load invoices' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Invoice
    if (!body?.id || !body?.invoiceNumber) {
      return NextResponse.json({ error: 'Invalid invoice data' }, { status: 400 })
    }
    const created = await backendPost<Invoice>('/invoices', body)
    return NextResponse.json(created, { status: 201 })
  } catch (err) {
    if (err instanceof APIError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('[POST /api/invoices]', err)
    return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 })
  }
}
