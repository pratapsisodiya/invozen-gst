import type { NextApiRequest, NextApiResponse } from 'next'
import { createApp } from '../../../backend/app'

const app = createApp()

export const config = {
  api: {
    bodyParser: false, // Let Express/multer parse the request body natively
    externalResolver: true, // Suppress Next.js warning for unresolved async calls
  },
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return app(req, res)
}
