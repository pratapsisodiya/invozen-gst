import { NextRequest } from 'next/server'
import { evaluateCollectionsAutopilot } from '@/lib/ai/autopilot/collections'
import type { CollectionsAutopilotEvaluationRequest } from '@/types/autopilot'

export async function POST(req: NextRequest) {
  let body: CollectionsAutopilotEvaluationRequest
  try {
    body = await req.json() as CollectionsAutopilotEvaluationRequest
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  try {
    const result = await evaluateCollectionsAutopilot(body)
    return Response.json(result)
  } catch (err) {
    console.error('[AI/autopilot/collections/evaluate] Error:', err)
    return Response.json({ error: 'Could not evaluate collections autopilot' }, { status: 500 })
  }
}
