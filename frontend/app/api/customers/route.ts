import { NextRequest, NextResponse } from 'next/server'
import { backendGet, backendPost, APIError } from '@/lib/api'
import type { Customer } from '@/types/customer'

export async function GET() {
  try {
    const customers = await backendGet<Customer[]>('/customers')
    return NextResponse.json(customers)
  } catch (err) {
    if (err instanceof APIError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('[GET /api/customers]', err)
    return NextResponse.json({ error: 'Failed to load customers' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Customer
    if (!body?.id || !body?.name) {
      return NextResponse.json({ error: 'Invalid customer data' }, { status: 400 })
    }
    const created = await backendPost<Customer>('/customers', body)
    return NextResponse.json(created, { status: 201 })
  } catch (err) {
    if (err instanceof APIError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('[POST /api/customers]', err)
    return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 })
  }
}
