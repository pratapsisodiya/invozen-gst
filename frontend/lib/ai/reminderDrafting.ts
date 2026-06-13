import Groq from 'groq-sdk'
import type { CollectionsDecisionType } from '@/types/autopilot'

export interface ReminderDraftInput {
  customerName: string
  invoiceNumber: string
  amount: number
  dueDate: string
  daysOverdue: number
  previousReminders: number
  businessName: string
  decisionType?: CollectionsDecisionType
  riskSummary?: string
}

export interface ReminderDraftResult {
  message: string
  source: 'ai' | 'fallback'
}

function formatDueDate(date: string) {
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}

function getTone(input: ReminderDraftInput) {
  if (input.decisionType === 'send_first_reminder') return 'friendly pre-due reminder'
  if (input.decisionType === 'send_due_today_reminder') return 'polite due-today reminder'
  if (input.previousReminders >= 2 || input.daysOverdue > 14) return 'firm overdue follow-up'
  if (input.daysOverdue > 0) return 'polite overdue reminder'
  return 'friendly reminder'
}

export function buildFallbackReminderMessage(input: ReminderDraftInput): string {
  const dueDate = formatDueDate(input.dueDate)

  if (input.daysOverdue > 0) {
    return [
      `Namaste ${input.customerName} ji,`,
      '',
      `This is a reminder from ${input.businessName} for invoice ${input.invoiceNumber}.`,
      `An amount of Rs.${Math.round(input.amount).toLocaleString('en-IN')} was due on ${dueDate} and is now ${input.daysOverdue} day${input.daysOverdue === 1 ? '' : 's'} overdue.`,
      'Please arrange payment at the earliest. If payment has already been made, please share the reference.',
      '',
      `${input.businessName}`,
    ].join('\n')
  }

  return [
    `Namaste ${input.customerName} ji,`,
    '',
    `This is a reminder from ${input.businessName} for invoice ${input.invoiceNumber}.`,
    `An amount of Rs.${Math.round(input.amount).toLocaleString('en-IN')} is due on ${dueDate}.`,
    'Please arrange payment on time. If you need anything from our side, let us know.',
    '',
    `${input.businessName}`,
  ].join('\n')
}

export async function generateReminderDraft(input: ReminderDraftInput): Promise<ReminderDraftResult> {
  if (!process.env.GROQ_API_KEY) {
    return { message: buildFallbackReminderMessage(input), source: 'fallback' }
  }

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
    const response = await groq.chat.completions.create({
      model: 'llama3-8b-8192',
      max_tokens: 300,
      messages: [
        {
          role: 'system',
          content: `You write professional payment reminder WhatsApp messages for Indian small businesses.
Rules:
- Plain text only, no markdown
- English with occasional polite Hindi honorifics like ji or namaste
- Mention invoice number, amount, due date
- Keep it under 140 words
- Be warm for early reminders and firmer for overdue follow-ups
- End with the business name`,
        },
        {
          role: 'user',
          content: `Write a ${getTone(input)}.
Customer: ${input.customerName}
Invoice: ${input.invoiceNumber}
Amount: Rs.${Math.round(input.amount).toLocaleString('en-IN')}
Due date: ${formatDueDate(input.dueDate)}
Days overdue: ${Math.max(0, input.daysOverdue)}
Previous reminders sent: ${input.previousReminders}
Risk summary: ${input.riskSummary ?? 'Not provided'}
Business name: ${input.businessName}`,
        },
      ],
    })

    const message = response.choices[0]?.message?.content?.trim()
    if (!message) {
      return { message: buildFallbackReminderMessage(input), source: 'fallback' }
    }

    return { message, source: 'ai' }
  } catch (err) {
    console.error('[AI/reminderDrafting] Error:', err)
    return { message: buildFallbackReminderMessage(input), source: 'fallback' }
  }
}
