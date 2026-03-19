"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMailWithPDF = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const db_1 = require("./db");
const BEGET_DEFAULTS = {
    host: 'mail.beget.com',
    port: 465,
    secure: true,
};
async function getSmtpSettings() {
    const rows = await db_1.prisma.setting.findMany({
        where: { key: { in: ['smtpHost', 'smtpPort', 'smtpSecure', 'smtpUser', 'smtpPass', 'emailRecipients'] } }
    });
    const s = {};
    rows.forEach((r) => { s[r.key] = r.value; });
    return s;
}
async function sendMailWithPDF(text, pdfBuffer) {
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
    const transporter = nodemailer_1.default.createTransport({
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
            },
        ],
    });
}
exports.sendMailWithPDF = sendMailWithPDF;
//# sourceMappingURL=transporter.js.map
