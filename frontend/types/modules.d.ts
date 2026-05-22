declare module 'resend' {
  export class Resend {
    constructor(apiKey: string | undefined)
    emails: {
      send(opts: { from: string; to: string; subject: string; html: string }): Promise<unknown>
    }
  }
}

declare module 'nodemailer' {
  interface Transporter {
    sendMail(opts: { from: string | undefined; to: string; subject: string; html: string }): Promise<unknown>
  }
  export function createTransport(opts: {
    host: string | undefined
    port: number
    secure: boolean
    auth: { user: string | undefined; pass: string | undefined }
  }): Transporter
}
