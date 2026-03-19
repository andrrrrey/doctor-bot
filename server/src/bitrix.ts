import { prisma } from './db';

type LeadData = {
  name: string;
  phone: string;
  diagnosis: string;
  extendedDiagnosis: string;
  answers: string;
}

export async function sendLeadToBitrix(leadData: LeadData) {
  const settings = await prisma.setting.findMany({
    where: { key: { in: ['bitrixWebhookUrl', 'bitrixLeadTitle'] } },
  });
  const get = (key: string) => settings.find((s: { key: string; value: string }) => s.key === key)?.value ?? '';

  const webhookUrl = get('bitrixWebhookUrl');
  if (!webhookUrl) throw new Error('bitrixWebhookUrl не задан в настройках');

  const title = get('bitrixLeadTitle') || 'Лид из бота про боль в спине';

  try {
    const response = await fetch(`${webhookUrl.replace(/\/$/, '')}/crm.lead.add.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          TITLE: title,
          NAME: leadData.name,
          PHONE: [{ VALUE: leadData.phone, VALUE_TYPE: 'WORK' }],
          COMMENTS: 'Диагноз: \n' + leadData.diagnosis + '\n\n\n' + 'Расширенный диагноз: \n' + leadData.extendedDiagnosis + '\n\n\n' + 'Ответы: \n' + leadData.answers,
        },
      }),
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
