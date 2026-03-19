const WEBHOOK_URL = 'https://epifanov.bitrix24.ru/rest/3501/ocir0h8kk3rm57na/crm.lead.add';

type LeadData = {
  name: string;
  phone: string;
  diagnosis: string;
  extendedDiagnosis: string;
  answers: string;
}

export async function sendLeadToBitrix(leadData: LeadData) {
  try {
    const response = await fetch(WEBHOOK_URL, {
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

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Bitrix HTTP ${response.status}: ${text}`);
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(`Bitrix API error: ${data.error}${data.error_description ? ' — ' + data.error_description : ''}`);
    }
  } catch (error) {
    console.error('Error sending message to Bitrix:', error);
    throw error;
  }
}