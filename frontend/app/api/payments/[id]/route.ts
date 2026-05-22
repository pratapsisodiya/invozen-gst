import { NextRequest, NextResponse } from 'next/server'
import { backendDelete, APIError } from '@/lib/api'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await backendDelete(`/payments/${id}`)
    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof APIError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('[DELETE /api/payments/[id]]', err)
    return NextResponse.json({ error: 'Failed to delete payment' }, { status: 500 })
  }
}
