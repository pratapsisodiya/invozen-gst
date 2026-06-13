import { NextRequest } from 'next/server'
import { approveCollectionsTask } from '@/lib/ai/autopilot/approvalActions'
import type { ApprovalTask } from '@/types/autopilot'

interface ApproveRequestBody {
  task: ApprovalTask
  finalMessage?: string
}

export async function POST(req: NextRequest) {
  let body: ApproveRequestBody
  try {
    body = await req.json() as ApproveRequestBody
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  if (!body.task) {
    return Response.json({ error: 'Task is required' }, { status: 400 })
  }

  return Response.json(approveCollectionsTask(body.task, body.finalMessage))
}
