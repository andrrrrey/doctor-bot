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
exports.sendLeadToBitrix = void 0;
const WEBHOOK_URL = 'https://epifanov.bitrix24.ru/rest/3501/ocir0h8kk3rm57na/crm.lead.add';
function sendLeadToBitrix(leadData) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield fetch(WEBHOOK_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    fields: {
                        TITLE: 'Лид из бота про боль в спине',
                        NAME: leadData.name,
                        PHONE: [
                            { VALUE: leadData.phone, VALUE_TYPE: 'WORK' }
                        ],
                        COMMENTS: 'Диагноз: \n' + leadData.diagnosis + '\n\n\n' + 'Расширенный диагноз: \n' + leadData.extendedDiagnosis + '\n\n\n' + 'Ответы: \n' + leadData.answers
                    }
                })
            });
        }
        catch (error) {
            console.error('Error sending message to Bitrix:', error);
        }
    });
}
exports.sendLeadToBitrix = sendLeadToBitrix;
//# sourceMappingURL=bitrix.js.map