import nodemailer from 'nodemailer'
import type { Db } from './db'

export type MailMessage = { to: string; subject: string; text: string }

export type SmtpConfig = {
  host: string
  port: number
  user: string
  pass: string
  from: string
}

/**
 * Every message is stored in email_outbox so invites and resets can be tested
 * without a mail provider. SMTP is used when SMTP_HOST is set.
 */
export function createMailer(db: Db, smtp: SmtpConfig | null) {
  const transport = smtp
    ? nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.port === 465,
        auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
      })
    : null

  return function send(message: MailMessage) {
    db.insertEmail({ to: message.to, subject: message.subject, body: message.text })
    if (!transport || !smtp) {
      console.log(`[mail] To ${message.to} — ${message.subject}\n${message.text}\n`)
      return
    }
    void transport.sendMail({ from: smtp.from, to: message.to, subject: message.subject, text: message.text }).catch((err: unknown) => {
      console.error('[mail] SMTP send failed:', err instanceof Error ? err.message : err)
    })
  }
}
