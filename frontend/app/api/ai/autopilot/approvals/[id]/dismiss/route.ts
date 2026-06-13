import { NextRequest } from 'next/server'
import { dismissCollectionsTask } from '@/lib/ai/autopilot/approvalActions'
import type { ApprovalTask } from '@/types/autopilot'

interface DismissRequestBody {
  task: ApprovalTask
}

export async function POST(req: NextRequest) {
  let body: DismissRequestBody
  try {
    body = await req.json() as DismissRequestBody
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  if (!body.task) {
    return Response.json({ error: 'Task is required' }, { status: 400 })
  }

  return Response.json(dismissCollectionsTask(body.task))
}
