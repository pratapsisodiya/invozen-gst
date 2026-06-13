import Groq from 'groq-sdk'
import { NextRequest } from 'next/server'
import { buildActionDeskResponse, type ActionDeskSnapshot } from '@/lib/ai/actionDesk'
import type { AgentAction } from '@/types/agentAction'

function stripJsonFences(text: string): string {
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
}

export async function POST(req: NextRequest) {
  let snapshot: ActionDeskSnapshot
  try {
    snapshot = await req.json() as ActionDeskSnapshot
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  const base = buildActionDeskResponse(snapshot)
  if (!process.env.GROQ_API_KEY || base.actions.length === 0) {
    return Response.json(base)
  }

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 800,
      messages: [
        {
          role: 'system',
          content: `You are an operations copilot for an Indian GST business. Refine action queue copy for clarity and urgency without inventing new facts.

Return ONLY valid JSON:
{
  "actions": [
    {
      "id": "same id",
      "summary": "tight 1 sentence, max 18 words",
      "reason": "practical explanation, max 24 words",
      "urgency": "high|medium|low"
    }
  ]
}

Rules:
- Keep every id exactly unchanged
- Do not add or remove actions
- Do not change amounts, counts, dates, or routes
- Only improve summary, reason, and urgency wording`
        },
        {
          role: 'user',
          content: JSON.stringify({
            businessName: snapshot.profile.businessName,
            actions: base.actions.map((action) => ({
              id: action.id,
              type: action.type,
              title: action.title,
              summary: action.summary,
              urgency: action.urgency,
              reason: action.reason,
              impactLabel: action.impactLabel,
              impactValue: action.impactValue,
            })),
          }),
        },
      ],
    })

    const raw = stripJsonFences(response.choices[0]?.message?.content ?? '{}')
    const parsed = JSON.parse(raw) as { actions?: Array<Pick<AgentAction, 'id' | 'summary' | 'reason' | 'urgency'>> }
    const rewrites = new Map((parsed.actions ?? []).map((action) => [action.id, action]))

    return Response.json({
      ...base,
      source: 'ai_enriched' as const,
      actions: base.actions.map((action) => {
        const rewrite = rewrites.get(action.id)
        if (!rewrite) return action
        return {
          ...action,
          summary: rewrite.summary || action.summary,
          reason: rewrite.reason || action.reason,
          urgency: rewrite.urgency || action.urgency,
        }
      }),
    })
  } catch (err) {
    console.error('[AI/action-desk] Error:', err)
    return Response.json(base)
  }
}
