import { NextRequest, NextResponse } from 'next/server'
import { backendPost, APIError } from '@/lib/api'

interface SendEmailBody {
  to: string
  subject?: string
  message?: string
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json() as SendEmailBody

    if (!body?.to) {
      return NextResponse.json({ error: 'Recipient email required' }, { status: 400 })
    }

    const result = await backendPost<{ sent: boolean; reason?: string }>(`/invoices/${id}/send-email`, body)
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof APIError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('[POST /api/invoices/[id]/send-email]', err)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
