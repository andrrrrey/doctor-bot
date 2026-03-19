import nodemailer from 'nodemailer';
import { prisma } from './db';

type Attachment = {
  filename: string;
  content: Buffer;
  contentType: string;
}

const BEGET_DEFAULTS = {
  host: 'mail.beget.com',
  port: 465,
  secure: true,
};

async function getSmtpSettings() {
  const rows = await prisma.setting.findMany({
    where: { key: { in: ['smtpHost', 'smtpPort', 'smtpSecure', 'smtpUser', 'smtpPass', 'emailRecipients'] } }
  });
  const s: Record<string, string> = {};
  rows.forEach((r) => { s[r.key] = r.value; });
  return s;
}

export async function sendMailWithPDF(text: string, pdfBuffer: Buffer): Promise<void> {
  const s = await getSmtpSettings();

  const host = s.smtpHost || BEGET_DEFAULTS.host;
  const port = s.smtpPort ? Number(s.smtpPort) : BEGET_DEFAULTS.port;
  const secure = s.smtpSecure !== undefined ? s.smtpSecure === 'true' : BEGET_DEFAULTS.secure;
  const user = s.smtpUser || '';
  const pass = s.smtpPass || '';
  const recipients = s.emailRecipients || '';

  if (!user || !pass) {
    console.warn('SMTP credentials not configured, skipping email');
    return;
  }

  if (!recipients) {
    console.warn('No email recipients configured, skipping email');
    return;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: user,
    to: recipients,
    subject: 'Заявка с опросника',
    text,
    attachments: [
      {
        filename: 'Результаты_опроса_пациента.pdf',
        content: pdfBuffer,
        contentType: 'application/pdf',
      } as Attachment,
    ],
  });
}
