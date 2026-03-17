"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePDF = generatePDF;
const pdfkit_1 = __importDefault(require("pdfkit"));
const path_1 = __importDefault(require("path"));
function generatePDF(questionsAndAnswers) {
    return new Promise((resolve, reject) => {
        const pdfDoc = new pdfkit_1.default({
            size: 'A4',
            margins: {
                top: 30,
                bottom: 30,
                left: 30,
                right: 30
            }
        });
        const buffers = [];
        const fontPath = path_1.default.resolve(__dirname, 'fonts', 'DejaVuSans.ttf');
        pdfDoc.registerFont('DejaVu', fontPath);
        pdfDoc.on('data', (chunk) => buffers.push(chunk));
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
//# sourceMappingURL=generate-pdf.js.map