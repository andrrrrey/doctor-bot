export enum ConsultationStep {
  WAITING_FOR_BUTTON = 'waiting_for_button',
  WAITING_FOR_NAME = 'waiting_for_name',
  WAITING_FOR_PHONE = 'waiting_for_phone',
  WAITING_FOR_CITY = 'waiting_for_city',
  COMPLETED = 'completed'
}

export type UserStates = Map<number, UserState>;

export type UserState = {
  questions: Question[];
  finished?: boolean;
  consultationState?: ConsultationState;
  diagnosisState?: DiagnosisState;
};

export type DiagnosisState = {
  diagnosis?: string;
  extendedDiagnosis?: string;
  answers?: CleanAnswer[];
};

export type ConsultationState = {
  isActive: boolean;
  step: ConsultationStep;
  name?: string;
  phone?: string;
  city?: string;
};

export type Questions = {
  questions: Question[];
};

export type Question = {
  id: string;
  question: string;
  text: string;
  type: string;
  options: string[];
  conditions?: string[];
  followUpQuestions?: Question[];
  dependencyId?: string;
  messageId?: number;
  isDone?: boolean;
  answers?: Set<string>;
};

export type Answer = {
  questionId: string;
  questionAnswers: Set<string>;
};

export type AnswersRequest = {
  questionId: string;
  questionAnswers: string[];
}[];

export type AnswersResponse = {
  html: string;
  diagnosis: string;
  extendedDiagnosis: string;
  answers: string[];
};

export type CleanAnswer = {
  question: string;
  answers: string[];
};

export type ConsultationDataRequest = {
  patientName: string;
  patientPhone: string;
  patientCity: string;
  diagnosis: string;
  extendedDiagnosis: string;
  answers: CleanAnswer[];
}

