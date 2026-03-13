"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getQuestions = getQuestions;
exports.sendAnswers = sendAnswers;
exports.sendConsultationData = sendConsultationData;
const SERVER_URL = process.env.NODE_ENV === 'production'
    ? 'https://doctor.yurakoch.ru'
    : 'http://localhost:3000';
function getQuestions() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield fetch(`${SERVER_URL}/survey`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return yield response.json();
        }
        catch (error) {
            console.error('Ошибка при получении вопросов:', error);
            return null;
        }
    });
}
function sendAnswers(answers) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield fetch(`${SERVER_URL}/postTestResults`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(answers),
            });
            return yield response.json();
        }
        catch (error) {
            console.error('Error submitting survey:', error);
            return null;
        }
    });
}
function sendConsultationData(consultationData) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield fetch(`${SERVER_URL}/postConsultationData`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(consultationData),
            });
            return yield response.json();
        }
        catch (error) {
            console.error('Error submitting consultation data:', error);
            return null;
        }
    });
}
//# sourceMappingURL=api.js.map