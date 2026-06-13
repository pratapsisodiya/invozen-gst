import { NextRequest } from 'next/server'
import { generateReminderDraft } from '@/lib/ai/reminderDrafting'

interface DraftReminderRequest {
  customerName: string
  invoiceNumber: string
  amount: number
  dueDate: string
  daysOverdue: number
  previousReminders?: number
  previousReminderCount?: number
  businessName: string
}

export async function POST(req: NextRequest) {
  let body: DraftReminderRequest
  try {
    body = await req.json() as DraftReminderRequest
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  try {
    const result = await generateReminderDraft({
      customerName: body.customerName,
      invoiceNumber: body.invoiceNumber,
      amount: body.amount,
      dueDate: body.dueDate,
      daysOverdue: body.daysOverdue,
      previousReminders: body.previousReminders ?? body.previousReminderCount ?? 0,
      businessName: body.businessName,
    })

    return Response.json(result)
  } catch (err) {
    console.error('[AI/draft-reminder] Error:', err)
    return Response.json({ error: 'Could not draft reminder' }, { status: 503 })
  }
}
