import Groq from 'groq-sdk'
import { NextRequest } from 'next/server'

interface DraftReminderRequest {
  customerName: string
  invoiceNumber: string
  amount: number
  dueDate: string
  daysOverdue: number
  previousReminders: number
  businessName: string
}

export async function POST(req: NextRequest) {
  if (!process.env.GROQ_API_KEY) {
    return Response.json({ error: 'AI not configured' }, { status: 503 })
  }

  let body: DraftReminderRequest
  try {
    body = await req.json() as DraftReminderRequest
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  const tone = body.daysOverdue <= 0
    ? 'friendly pre-due reminder'
    : body.daysOverdue <= 7
    ? 'polite overdue reminder'
    : body.previousReminders >= 2
    ? 'firm final notice'
    : 'urgent overdue follow-up'

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const response = await groq.chat.completions.create({
      model: 'llama3-8b-8192',
      max_tokens: 300,
      messages: [
        {
          role: 'system',
          content: `You are a professional payment reminder writer for Indian businesses. Write WhatsApp messages in a ${tone} tone.
Rules:
- Write in English with Hindi honorifics where appropriate (ji, namaste)
- Use ₹ symbol, Indian number formatting
- Keep it under 200 words
- Include invoice number, amount, due date
- End with business name
- Be professional but warm for first reminders, firm for final notices
- No markdown formatting — plain text only for WhatsApp`,
        },
        {
          role: 'user',
          content: `Write a ${tone} for:
Customer: ${body.customerName}
Invoice: ${body.invoiceNumber}
Amount: ₹${body.amount.toLocaleString('en-IN')}
Due date: ${new Date(body.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
Days overdue: ${body.daysOverdue > 0 ? body.daysOverdue : 0}
Previous reminders sent: ${body.previousReminders}
Business name: ${body.businessName}`,
        },
      ],
    })

    const message = response.choices[0]?.message?.content ?? ''
    return Response.json({ message })
  } catch (err) {
    console.error('[AI/draft-reminder] Error:', err)
    return Response.json({ error: 'Could not draft reminder' }, { status: 503 })
  }
}
