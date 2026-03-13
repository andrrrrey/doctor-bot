import nodemailer from 'nodemailer';

type MailOptions = {
  from: string;
  to: string;
  subject: string;
  text: string;
  attachments?: Attachment[];
}

type Attachment = {
  filename: string;
  content: Buffer;
  contentType: string;
}


const transporter = nodemailer.createTransport({
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

const mailOptions: MailOptions = {
  from: 'doctorbot@yurakoch.ru',
  to: 'web-iris@yandex.ru, info@epifanov.clinic',
  subject: 'Заявка с опросника',
  text: 'Текст письма',
};

export function sendMailWithPDF(text: string, pdfBuffer: Buffer): Promise<void> {
  const mailOptionsWithPDF = {
    ...mailOptions,
    text,
    attachments: [
      {
        filename: 'Результаты_опроса_пациента.pdf',
        content: pdfBuffer,
        contentType: 'application/pdf'
      }
    ]
  };

  return new Promise((resolve, reject) => {
    transporter.sendMail(mailOptionsWithPDF, (error) => {
      if (error) {
        console.error(error);
        reject(error);
      } else {
        resolve();
      }
    });
  });
}