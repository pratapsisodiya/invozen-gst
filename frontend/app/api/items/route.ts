import { NextRequest, NextResponse } from 'next/server'
import { backendGet, backendPost, APIError } from '@/lib/api'
import type { Item } from '@/types/item'

export async function GET() {
  try {
    const items = await backendGet<Item[]>('/items')
    return NextResponse.json(items)
  } catch (err) {
    if (err instanceof APIError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('[GET /api/items]', err)
    return NextResponse.json({ error: 'Failed to load items' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Item
    if (!body?.id || !body?.name) {
      return NextResponse.json({ error: 'Invalid item data' }, { status: 400 })
    }
    const created = await backendPost<Item>('/items', body)
    return NextResponse.json(created, { status: 201 })
  } catch (err) {
    if (err instanceof APIError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('[POST /api/items]', err)
    return NextResponse.json({ error: 'Failed to create item' }, { status: 500 })
  }
}
