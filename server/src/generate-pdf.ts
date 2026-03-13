import PDFDocument from 'pdfkit';
import { RusAnswers } from './process-answers';
import path from 'path';


export function generatePDF(questionsAndAnswers: RusAnswers[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const pdfDoc = new PDFDocument({
      size: 'A4',
      margins: {
        top: 30,
        bottom: 30,
        left: 30,
        right: 30
      }
    });
    const buffers: Buffer[] = [];

    const fontPath = path.resolve(__dirname, 'fonts', 'DejaVuSans.ttf');
    pdfDoc.registerFont('DejaVu', fontPath);

    pdfDoc.on('data', (chunk: Buffer) => buffers.push(chunk));

    pdfDoc.on('end', () => {
      const pdfBuffer = Buffer.concat(buffers);
      resolve(pdfBuffer);
    });

    pdfDoc.on('error', (err) => {
      reject(err);
    });

    questionsAndAnswers.forEach((item) => {
      pdfDoc.moveDown(0.5);
      pdfDoc.font('DejaVu').fontSize(9).text(`${item.question}`);
      pdfDoc.moveDown(0.2);
      pdfDoc.font('DejaVu').fontSize(9).text(`${item.answers.join(". ")}`, { indent: 10 });
    });

    pdfDoc.end();
  });
}