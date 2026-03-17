"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMailWithPDF = sendMailWithPDF;
const nodemailer_1 = __importDefault(require("nodemailer"));
const transporter = nodemailer_1.default.createTransport({
    host: 'smtp.yurakoch.ru',
    port: 587,
    secure: false,
    auth: {
        user: 'doctorbot@yurakoch.ru',
        pass: 'h2bDEd3ucT',
    },
    tls: {
        rejectUnauthorized: false,
    }
});
const mailOptions = {
    from: 'doctorbot@yurakoch.ru',
    to: 'web-iris@yandex.ru, info@epifanov.clinic',
    subject: 'Заявка с опросника',
    text: 'Текст письма',
};
function sendMailWithPDF(text, pdfBuffer) {
    const mailOptionsWithPDF = Object.assign(Object.assign({}, mailOptions), { text, attachments: [
            {
                filename: 'Результаты_опроса_пациента.pdf',
                content: pdfBuffer,
                contentType: 'application/pdf'
            }
        ] });
    return new Promise((resolve, reject) => {
        transporter.sendMail(mailOptionsWithPDF, (error) => {
            if (error) {
                console.error(error);
                reject(error);
            }
            else {
                resolve();
            }
        });
    });
}
//# sourceMappingURL=transporter.js.map