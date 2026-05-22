import { NextRequest, NextResponse } from 'next/server'
import { backendGet, backendPut, backendDelete, APIError } from '@/lib/api'
import type { Customer } from '@/types/customer'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const customer = await backendGet<Customer>(`/customers/${id}`)
    return NextResponse.json(customer)
  } catch (err) {
    if (err instanceof APIError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('[GET /api/customers/[id]]', err)
    return NextResponse.json({ error: 'Failed to load customer' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json() as Partial<Customer>
    const updated = await backendPut<Customer>(`/customers/${id}`, body)
    return NextResponse.json(updated)
  } catch (err) {
    if (err instanceof APIError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('[PUT /api/customers/[id]]', err)
    return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await backendDelete(`/customers/${id}`)
    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof APIError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('[DELETE /api/customers/[id]]', err)
    return NextResponse.json({ error: 'Failed to delete customer' }, { status: 500 })
  }
}
