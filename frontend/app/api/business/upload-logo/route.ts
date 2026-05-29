import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'

export async function POST(req: NextRequest) {
  try {
    const { userId, getToken } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = await getToken()
    const reqFormData = await req.formData()
    const file = reqFormData.get('logo') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const backendFormData = new FormData()
    const blob = new Blob([buffer], { type: file.type })
    backendFormData.append('logo', blob, file.name)

    const res = await fetch(`${API_BASE_URL}/business/upload-logo`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: backendFormData,
    })

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Upload failed' }))
      return NextResponse.json({ error: errorData.error || `HTTP ${res.status}` }, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (err: any) {
    console.error('[POST /api/business/upload-logo]', err)
    return NextResponse.json({ error: err.message || 'Failed to upload logo' }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const { userId, getToken } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = await getToken()

    const res = await fetch(`${API_BASE_URL}/business/logo`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Delete failed' }))
      return NextResponse.json({ error: errorData.error || `HTTP ${res.status}` }, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (err: any) {
    console.error('[DELETE /api/business/logo]', err)
    return NextResponse.json({ error: err.message || 'Failed to delete logo' }, { status: 500 })
  }
}
