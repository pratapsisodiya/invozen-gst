import { NextRequest, NextResponse } from 'next/server'
import { backendGet, backendPut, backendDelete, APIError } from '@/lib/api'
import type { Item } from '@/types/item'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const item = await backendGet<Item>(`/items/${id}`)
    return NextResponse.json(item)
  } catch (err) {
    if (err instanceof APIError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('[GET /api/items/[id]]', err)
    return NextResponse.json({ error: 'Failed to load item' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json() as Partial<Item>
    const updated = await backendPut<Item>(`/items/${id}`, body)
    return NextResponse.json(updated)
  } catch (err) {
    if (err instanceof APIError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('[PUT /api/items/[id]]', err)
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await backendDelete(`/items/${id}`)
    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof APIError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('[DELETE /api/items/[id]]', err)
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 })
  }
}
