import { Questions, AnswersRequest, AnswersResponse, ConsultationDataRequest } from './types';

const SERVER_URL = process.env.NODE_ENV === 'production'
  ? 'https://doctor.yurakoch.ru'
  : 'http://localhost:3000';

export async function getQuestions(): Promise<Questions | null> {
  try {
    const response = await fetch(`${SERVER_URL}/survey`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Ошибка при получении вопросов:', error);
    return null;
  }
}

export async function sendAnswers(answers: AnswersRequest): Promise<AnswersResponse | null> {
  try {
    const response = await fetch(`${SERVER_URL}/postTestResults`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(answers),
    });

    return await response.json();
  } catch (error) {
    console.error('Error submitting survey:', error);
    return null;
  }
}

export async function sendConsultationData(consultationData: ConsultationDataRequest): Promise<any> {
  try {
    const response = await fetch(`${SERVER_URL}/postConsultationData`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(consultationData),
    });

    return await response.json();
  } catch (error) {
    console.error('Error submitting consultation data:', error);
    return null;
  }
}