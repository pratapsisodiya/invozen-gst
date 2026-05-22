import { NextRequest, NextResponse } from 'next/server'
import { backendGet, backendPut, backendDelete, APIError } from '@/lib/api'
import type { Invoice } from '@/types/invoice'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const invoice = await backendGet<Invoice>(`/invoices/${id}`)
    return NextResponse.json(invoice)
  } catch (err) {
    if (err instanceof APIError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('[GET /api/invoices/[id]]', err)
    return NextResponse.json({ error: 'Failed to load invoice' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json() as Invoice
    const updated = await backendPut<Invoice>(`/invoices/${id}`, body)
    return NextResponse.json(updated)
  } catch (err) {
    if (err instanceof APIError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('[PUT /api/invoices/[id]]', err)
    return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await backendDelete(`/invoices/${id}`)
    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof APIError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('[DELETE /api/invoices/[id]]', err)
    return NextResponse.json({ error: 'Failed to delete invoice' }, { status: 500 })
  }
}
