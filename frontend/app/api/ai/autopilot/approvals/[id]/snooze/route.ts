import { NextRequest } from 'next/server'
import { snoozeCollectionsTask } from '@/lib/ai/autopilot/approvalActions'
import type { ApprovalTask } from '@/types/autopilot'

interface SnoozeRequestBody {
  task: ApprovalTask
  snoozedUntil: string
}

export async function POST(req: NextRequest) {
  let body: SnoozeRequestBody
  try {
    body = await req.json() as SnoozeRequestBody
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  if (!body.task || !body.snoozedUntil) {
    return Response.json({ error: 'Task and snoozedUntil are required' }, { status: 400 })
  }

  return Response.json(snoozeCollectionsTask(body.task, body.snoozedUntil))
}
