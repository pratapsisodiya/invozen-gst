import { NextRequest, NextResponse } from 'next/server'
import { backendGet, backendPut, APIError } from '@/lib/api'
import type { BusinessProfile, AppSettings } from '@/types/business'

export async function GET() {
  try {
    const data = await backendGet<{ profile: BusinessProfile; settings: AppSettings }>('/business')
    return NextResponse.json(data)
  } catch (err) {
    if (err instanceof APIError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('[GET /api/business]', err)
    return NextResponse.json({ error: 'Failed to load business profile' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json() as { profile: BusinessProfile; settings: AppSettings }
    if (!body?.profile || !body?.settings) {
      return NextResponse.json({ error: 'Invalid business data' }, { status: 400 })
    }
    const updated = await backendPut('/business', body)
    return NextResponse.json(updated)
  } catch (err) {
    if (err instanceof APIError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('[PUT /api/business]', err)
    return NextResponse.json({ error: 'Failed to update business profile' }, { status: 500 })
  }
}
