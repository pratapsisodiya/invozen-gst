import { NextRequest, NextResponse } from 'next/server'
import { backendFetch, backendPost, APIError } from '@/lib/api'
import type { Payment } from '@/types/payment'

export async function GET(req: NextRequest) {
  try {
    const invoiceId = req.nextUrl.searchParams.get('invoiceId')
    const endpoint = invoiceId ? `/payments?invoiceId=${invoiceId}` : '/payments'
    const response = await backendFetch(endpoint)
    const payments = await response.json()
    return NextResponse.json(payments)
  } catch (err) {
    if (err instanceof APIError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('[GET /api/payments]', err)
    return NextResponse.json({ error: 'Failed to load payments' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Payment
    if (!body?.id || !body?.invoiceId || typeof body?.amount !== 'number') {
      return NextResponse.json({ error: 'Invalid payment data' }, { status: 400 })
    }
    const created = await backendPost<Payment>('/payments', body)
    return NextResponse.json(created, { status: 201 })
  } catch (err) {
    if (err instanceof APIError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('[POST /api/payments]', err)
    return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 })
  }
}
