import { YES, NO, START_DIAGNOSIS, QUESTIONS } from "./constants";

export type Answer = {
  questionId: string;
  questionAnswers: string[];
}

export type OptionWeights = {
  neurosis?: number;
  muscles?: number;
  hernia?: number;
  arthrosis?: number;
  stenosis?: number;
  inflammation?: number;
};

// key: `${questionId}::${optionValue}`
export type OptionWeightsMap = Map<string, OptionWeights>;

export type RusAnswers = {
  question: string;
  answers: string[];
};

export type ConsultationAnswer = {
  patientName: string;
  patientPhone: string;
  patientCity: string;
  diagnosis: string;
  extendedDiagnosis: string;
  answers: RusAnswers[];
}

type Diagnosis = {
  neurosis: number,
  muscles: number,
  hernia: number,
  arthrosis: number,
  stenosis: number,
  inflammation: number,
}

type DiagnosisKey = Extract<keyof Diagnosis, 'muscles' | 'hernia' | 'arthrosis' | 'stenosis'>;

export function processAnswers(startDiagnosis: Diagnosis, answers: Answer[], optionWeights?: OptionWeightsMap) {
  const diagnosis = { ...startDiagnosis };

  answers.forEach(({ questionId, questionAnswers }) => {
    if (questionId === "age") {
      processAge(diagnosis, Number(questionAnswers[0]), answers);
    }
    else if (questionId === "pain_scale") {
      processPainScale(diagnosis, Number(questionAnswers[0]));
    }
    else if (questionId === "pain_location") {
      processPainLocation(diagnosis, questionAnswers);
    }
    else if (questionId === "leg_pain" && hadPainLacationinOneLeg(answers)) {
      processLegPain(diagnosis, questionAnswers[0]);
    }
    else if (questionId === "pain_image") {
      processPainImage(diagnosis, questionAnswers[0]);
    }
    else if (questionId === "morning_pain") {
      processMorningPain(diagnosis, questionAnswers[0]);
    }
    else if (questionId === "night_pain") {
      processNightPain(diagnosis, questionAnswers[0], answers);
    }
    else if (questionId === "pain_nature") {
      processPainNature(diagnosis, questionAnswers[0]);
    }
    else if (questionId === "dn4") {
      processDN4(diagnosis, questionAnswers);
    }
    else if (questionId === "walking") {
      processWalking(diagnosis, questionAnswers[0]);
    }
    else if (questionId === "walk_frequency") {
      processWalkFrequency(diagnosis, questionAnswers[0]);
    }
    else if (questionId === "pain_while_walking") {
      processPainWhileWalking(diagnosis, questionAnswers[0]);
    }
    else if (questionId === "sit_without_pain") {
      processSitWithoutPain(diagnosis, questionAnswers[0], answers);
    }
    else if (questionId === "stand_without_pain") {
      processStandWithoutPain(diagnosis, questionAnswers[0]);
    }
    else if (questionId === "lift_groceries") {
      processLiftGroceries(diagnosis, questionAnswers[0]);
    }
    else if (questionId === "symptoms_duration") {
      processSymptomsDuration(diagnosis, questionAnswers[0]);
    }
    else if (questionId === "spine_operation") {
      processSpineOperation(diagnosis, questionAnswers[0]);
    }
    else if (questionId === "current_flare_duration") {
      processCurrentFlareDuration(diagnosis, questionAnswers[0]);
    }
    else if (questionId === "researches") {
      processResearches(diagnosis, questionAnswers);
    }
    else if (questionId === "lumbar_mri_count") {
      processLumbarMriCount(diagnosis, questionAnswers[0]);
    }
    else if (questionId === "neurosurgeon_consultation") {
      processNeurosurgeonConsultation(diagnosis, questionAnswers[0]);
    }
    else if (questionId === "trauma_or_sudden_onset") {
      processTraumaOrSuddenOnset(diagnosis, questionAnswers[0], answers);
    }
    else if (questionId === "stress_related_flare") {
      processStressRelatedFlare(diagnosis, questionAnswers[0]);
    }
    else if (questionId === "neurosis_symptoms") {
      processNeurosisSymptoms(diagnosis, questionAnswers, answers);
    }
  });

  if (optionWeights) {
    answers.forEach(({ questionId, questionAnswers }) => {
      questionAnswers.forEach((value) => {
        const w = optionWeights.get(`${questionId}::${value}`);
        if (w) {
          if (w.neurosis) diagnosis.neurosis += w.neurosis;
          if (w.muscles) diagnosis.muscles += w.muscles;
          if (w.hernia) diagnosis.hernia += w.hernia;
          if (w.arthrosis) diagnosis.arthrosis += w.arthrosis;
          if (w.stenosis) diagnosis.stenosis += w.stenosis;
          if (w.inflammation) diagnosis.inflammation += w.inflammation;
        }
      });
    });
  }

  return diagnosis;
}

export function secondProcessAnswers(firstDiagnosis: Diagnosis, answers: Answer[], optionWeights?: OptionWeightsMap) {
  if (firstDiagnosis.neurosis === 0) {
    const updatedAnswers = answers.map(answer => {
      if (answer.questionId === "pain_scale") {
        return {
          ...answer,
          questionAnswers: [String(Number(answer.questionAnswers[0]) + 2)]
        };
      } else {
        return {
          ...answer,
          questionAnswers: [...answer.questionAnswers],
        };
      }
    });

    const startDiagnosis = { ...START_DIAGNOSIS };

    return processAnswers(startDiagnosis, updatedAnswers, optionWeights);
  }
  else if (firstDiagnosis.neurosis < 4) {
    return firstDiagnosis;
  }
  else if (firstDiagnosis.neurosis <= 7) {
    return {
      ...firstDiagnosis,
      neurosis: firstDiagnosis.neurosis - 2,
      muscles: firstDiagnosis.muscles + 2,
      hernia: firstDiagnosis.hernia - 2,
      arthrosis: firstDiagnosis.arthrosis - 2,
      stenosis: firstDiagnosis.stenosis - 2,
    };
  }
  else {
    const startDiagnosis = {
      ...START_DIAGNOSIS,
      muscles: 4,
    };

    const updatedAnswers = answers.map(answer => {
      if (answer.questionId === "pain_scale") {
        return {
          ...answer,
          questionAnswers: [String(Number(answer.questionAnswers[0]) - 2)]
        };
      } else {
        return {
          ...answer,
          questionAnswers: [...answer.questionAnswers],
        }
      }
    });

    return processAnswers(startDiagnosis, updatedAnswers, optionWeights);
  }
}

function processAge(diagnosis: Diagnosis, answer: number, allAnswers: Answer[]) {
  let age = answer;

  const sportAnswer = allAnswers.find(answer => answer.questionId === "sport");
  if (sportAnswer && sportAnswer.questionAnswers[0] === YES) {
    age += 7;
  }

  if (age <= 25) {
    diagnosis.muscles += 2;
  }
  else if (age >= 26 && age < 35) {
    diagnosis.hernia += 2;
    diagnosis.muscles += 1;
  }
  else if (age >= 35 && age < 40) {
    diagnosis.arthrosis += 1;
  }
  else if (age >= 40 && age < 48) {
    diagnosis.arthrosis += 1;
    diagnosis.hernia += 1;
    diagnosis.muscles -= 1;
  }
  else if (age >= 48 && age < 60) {
    diagnosis.arthrosis += 2;
    diagnosis.stenosis += 1;
    diagnosis.muscles -= 2;
  }
  else if (age >= 60) {
    diagnosis.arthrosis += 3;
    diagnosis.stenosis += 2;
    diagnosis.hernia -= 1;
    diagnosis.muscles -= 3;
  }

}

function processPainScale(diagnosis: Diagnosis, answer: number) {
  if (answer >= 6) diagnosis.hernia += 1;
}

function processPainLocation(diagnosis: Diagnosis, answers: string[]) {
  if (
    answers.length == 6 &&
    answers.indexOf("В пояснице больше справа") !== -1 &&
    answers.indexOf("В пояснице больше слева") !== -1 &&
    answers.indexOf("В пояснице по центру") !== -1 &&
    answers.indexOf("В ягодице больше справа") !== -1 &&
    answers.indexOf("В ягодице больше слева") !== -1 &&
    answers.indexOf("В крестце") !== -1
  ) {
    diagnosis.hernia += 1;
  }
  else if (answers.indexOf("В паху") !== -1) {
    diagnosis.arthrosis += 2;
  }
  else if (
    answers.indexOf("В правой ноге (бедро, икра, ступня)") !== -1 &&
    answers.indexOf("В левой ноге (бедро, икра, ступня)") !== -1
  ) {
    diagnosis.hernia -= 2;
    diagnosis.muscles += 1;
  }
  else if (
    (
      answers.indexOf("В правой ноге (бедро, икра, ступня)") !== -1 &&
      answers.indexOf("В левой ноге (бедро, икра, ступня)") === -1
    ) ||
    (
      answers.indexOf("В левой ноге (бедро, икра, ступня)") !== -1 &&
      answers.indexOf("В правой ноге (бедро, икра, ступня)") === -1
    )
  ) {
    diagnosis.hernia += 2;
  }
  else if (
    (
      answers.indexOf("В ягодице больше справа") !== -1 &&
      answers.indexOf("В ягодице больше слева") === -1
    ) ||
    (
      answers.indexOf("В ягодице больше слева") !== -1 &&
      answers.indexOf("В ягодице больше справа") === -1
    )
  ) {
    diagnosis.hernia += 1;
  }
  else if (
    (
      answers.indexOf("В пояснице больше справа") !== -1 ||
      answers.indexOf("В пояснице больше слева") !== -1
    ) &&
    answers.indexOf("В правой ноге (бедро, икра, ступня)") === -1 &&
    answers.indexOf("В левой ноге (бедро, икра, ступня)") === -1
  ) {
    diagnosis.arthrosis += 1;
  } else if (answers.indexOf("В пояснице по центру") !== -1) {
    diagnosis.hernia += 1;
  }
}

function hadPainLacationinOneLeg(allAnswers: Answer[]) {
  const painLocationAnswer = allAnswers.find(answer => answer.questionId === "pain_location");

  if (!painLocationAnswer) return false;

  const answers = painLocationAnswer.questionAnswers;

  return (
    answers.indexOf("В правой ноге (бедро, икра, ступня)") !== -1 &&
    answers.indexOf("В левой ноге (бедро, икра, ступня)") === -1
  ) ||
    (
      answers.indexOf("В левой ноге (бедро, икра, ступня)") !== -1 &&
      answers.indexOf("В правой ноге (бедро, икра, ступня)") === -1
    );
}

function processLegPain(diagnosis: Diagnosis, answer: string) {
  if (answer === YES) diagnosis.hernia += 3;
}

function processPainImage(diagnosis: Diagnosis, answer: string) {
  if (answer === "Разовая и не проходящая") {
    diagnosis.hernia += 1;
    diagnosis.muscles -= 2;
  }
  else if (answer === "Нарастающая со временем") {
    diagnosis.arthrosis += 2;
    diagnosis.stenosis += 2;
  }
  else if (answer === "Скачкообразная, то есть, то нет") {
    diagnosis.muscles += 2;
    diagnosis.arthrosis && (diagnosis.arthrosis += 1);
  }
}

function processMorningPain(diagnosis: Diagnosis, answer: string) {
  if (answer === NO) {
    diagnosis.hernia -= 1;
    diagnosis.arthrosis -= 1;
  }
  else if (answer === YES) {
    diagnosis.hernia && (diagnosis.hernia += 2);
    diagnosis.arthrosis && (diagnosis.arthrosis += 2);
    diagnosis.stenosis && (diagnosis.stenosis += 2);
    diagnosis.inflammation += 1;
  }
}

function processNightPain(diagnosis: Diagnosis, answer: string, allAnswers: Answer[]) {
  if (answer === "Да, только когда переварачиваюсь") {
    diagnosis.hernia += 1;
    diagnosis.arthrosis += 1;
    return;
  }

  if (answer === YES) diagnosis.inflammation += 1;
  const morningPainAnswer = allAnswers.find(answer => answer.questionId === "morning_pain");
  if (morningPainAnswer && morningPainAnswer.questionAnswers[0] === YES) return;

  if (answer === YES) {
    diagnosis.hernia && (diagnosis.hernia += 2);
    diagnosis.arthrosis && (diagnosis.arthrosis += 2);
    diagnosis.stenosis && (diagnosis.stenosis += 2);
  }
}

function processPainNature(diagnosis: Diagnosis, answer: string) {
  if (answer === "Спонтанная, возникает в состоянии покоя") {
    diagnosis.hernia += 2;
    diagnosis.arthrosis += 2;
    diagnosis.inflammation += 1;
  }
  else if (answer === "Механическая, провоцируется движением") {
    diagnosis.muscles += 2;
  }
}

function processDN4(diagnosis: Diagnosis, answers: string[]) {
  if (answers.indexOf("Ничего из вышеперечисленного") !== -1) {
    diagnosis.hernia -= 4;
  }
  else if (
    answers.indexOf("Пощипывание, ощущение мурашек") !== -1 ||
    answers.indexOf("Онемение") !== -1
  ) {
    diagnosis.hernia += 2;
  }
  else if (answers.length >= 2) {
    diagnosis.hernia += 2;
  }
}

function processWalking(diagnosis: Diagnosis, answer: string) {
  if (answer === NO) {
    diagnosis.stenosis += 4;
  }
}

function processWalkFrequency(diagnosis: Diagnosis, answer: string) {
  if (answer === NO) {
    diagnosis.stenosis && (diagnosis.stenosis += 1);
    diagnosis.hernia && (diagnosis.hernia += 1);
  }
  else if (answer === YES) {
    diagnosis.stenosis -= 6;
  }
}

function processPainWhileWalking(diagnosis: Diagnosis, answer: string) {
  if (answer === YES) {
    diagnosis.stenosis += 1;
  }
}

function processSitWithoutPain(diagnosis: Diagnosis, answer: string, allAnswers: Answer[]) {
  const walkingAnswer = allAnswers.find(answer => answer.questionId === "walking");
  if (walkingAnswer?.questionAnswers[0] === YES) {
    if (answer === NO) {
      diagnosis.hernia += 2;
      diagnosis.muscles += 3;
    }
    else if (answer === YES) {
      diagnosis.arthrosis += 1;
      diagnosis.muscles -= 3;
    }
  }
  else if (walkingAnswer?.questionAnswers[0] === NO) {
    if (answer === NO) {
      diagnosis.hernia += 2;
      diagnosis.stenosis -= 3;
    }
    else if (answer === YES) {
      diagnosis.stenosis += 2;
      diagnosis.muscles -= 2;
    }
  }
}

function processStandWithoutPain(diagnosis: Diagnosis, answer: string) {
  if (answer === NO) {
    diagnosis.muscles && (diagnosis.muscles += 1);
    diagnosis.stenosis += 1;
    diagnosis.hernia += 1;
  }
  else if (answer === YES) {
    diagnosis.arthrosis && (diagnosis.arthrosis += 1);
  }
}

function processLiftGroceries(diagnosis: Diagnosis, answer: string) {
  if (answer === NO) {
    diagnosis.muscles += 2;
    diagnosis.hernia += 2;
  }
  else if (answer === YES) {
    diagnosis.arthrosis && (diagnosis.arthrosis += 1);
    diagnosis.stenosis && (diagnosis.stenosis += 1);
    diagnosis.muscles -= 1;
  }
}

function processSymptomsDuration(diagnosis: Diagnosis, answer: string) {
  if (answer === "До месяца") {
    diagnosis.hernia += 2;
    diagnosis.stenosis -= 2;
    diagnosis.arthrosis -= 2;
  }
  else if (answer === "До полугода") {
    diagnosis.hernia += 2;
    diagnosis.stenosis -= 2;
    diagnosis.arthrosis -= 1;
  }
  else if (answer === "Больше года") {
    diagnosis.muscles && (diagnosis.muscles += 2);
    diagnosis.hernia && (diagnosis.hernia += 2);
    diagnosis.arthrosis && (diagnosis.arthrosis += 2);
    diagnosis.stenosis && (diagnosis.stenosis += 2);
    diagnosis.neurosis && (diagnosis.neurosis += 2);
  }
  else if (answer === "Больше трех лет") {
    diagnosis.arthrosis && (diagnosis.arthrosis += 2);
    diagnosis.stenosis && (diagnosis.stenosis += 2);
    diagnosis.muscles += 2;
  }
}

function processSpineOperation(diagnosis: Diagnosis, answer: string) {
  if (answer === YES) {
    diagnosis.muscles && (diagnosis.muscles += 2);
    diagnosis.hernia && (diagnosis.hernia += 2);
    diagnosis.arthrosis && (diagnosis.arthrosis += 2);
    diagnosis.stenosis && (diagnosis.stenosis += 2);
  }
}

function processCurrentFlareDuration(diagnosis: Diagnosis, answer: string) {
  if (answer === "До недели") {
    diagnosis.muscles += 2;
    diagnosis.arthrosis += 1;
    diagnosis.hernia -= 3;
  }
  else if (answer === "До трех недель") {
    diagnosis.arthrosis += 2;
  }
  else if (answer === "До 5 месяцев") {
    diagnosis.hernia += 2;
    diagnosis.stenosis += 2;
  }
}

function processResearches(diagnosis: Diagnosis, answers: string[]) {
  if (answers.indexOf("Не делали никаких исследований") !== -1) {
    return;
  }
  else if (answers.indexOf("Рентген с функциональными пробами") !== -1) {
    diagnosis.arthrosis += 2;
    diagnosis.stenosis += 2;
    diagnosis.hernia -= 1;
  }
  else if (answers.length >= 4) {
    diagnosis.neurosis += 2;
    diagnosis.muscles && (diagnosis.muscles += 2);
    diagnosis.hernia && (diagnosis.hernia += 2);
    diagnosis.arthrosis && (diagnosis.arthrosis += 2);
    diagnosis.stenosis && (diagnosis.stenosis += 2);
  }
}

function processLumbarMriCount(diagnosis: Diagnosis, answer: string) {
  if (answer === YES) {
    diagnosis.hernia += 2;
    diagnosis.muscles -= 1;
  }
}

function processNeurosurgeonConsultation(diagnosis: Diagnosis, answer: string) {
  if (answer === YES) {
    diagnosis.hernia += 1;
    diagnosis.stenosis += 1;
    diagnosis.muscles -= 2;
  }
}

function processTraumaOrSuddenOnset(diagnosis: Diagnosis, answer: string, allAnswers: Answer[]) {
  const symptomsDurationAnswer = allAnswers.find(answer => answer.questionId === "symptoms_duration");
  if (symptomsDurationAnswer?.questionAnswers[0] === "Больше трех лет") return;

  const suddenOnsetAnswer = allAnswers.find(answer => answer.questionId === "sudden_onset")?.questionAnswers[0];
  if (answer === YES || suddenOnsetAnswer === YES) {
    diagnosis.hernia && (diagnosis.hernia += 2);
    diagnosis.muscles && (diagnosis.muscles += 1);
    diagnosis.arthrosis && (diagnosis.arthrosis += 1);
  } else {
    diagnosis.stenosis && (diagnosis.stenosis += 1);
    diagnosis.arthrosis && (diagnosis.arthrosis += 1);
    diagnosis.muscles && (diagnosis.muscles += 1);
  }
}

function processStressRelatedFlare(diagnosis: Diagnosis, answer: string) {
  if (answer === NO) {
    diagnosis.hernia && (diagnosis.hernia += 1);
    diagnosis.stenosis && (diagnosis.stenosis += 1);
    diagnosis.arthrosis && (diagnosis.arthrosis += 1);
  }
  else if (answer === YES) {
    diagnosis.muscles += 2;
  }
}

function processNeurosisSymptoms(diagnosis: Diagnosis, answer: string[], allAnswers: Answer[]) {
  let count = answer.length;
  if (answer.indexOf("Ничего из вышеперечисленного") !== -1) count--;

  const headMriAnswer = allAnswers.find(answer => answer.questionId === "head_mri");
  if (headMriAnswer?.questionAnswers[0] === YES) count++;

  if (count >= 4) diagnosis.neurosis += 9;
}

export function getPainScale(answers: Answer[]) {
  const painAnswer = answers.find(({ questionId }) => questionId === "pain_scale");
  return Number(painAnswer?.questionAnswers[0] || 0);
}

export function processResultDiagnosis(diagnosis: Diagnosis): DiagnosisKey[] {
  const diagnosisArray: DiagnosisKey[] = ['muscles', 'hernia', 'arthrosis', 'stenosis'];

  const sortedDiagnosisArray = diagnosisArray.sort((a, b) => diagnosis[b] - diagnosis[a]);
  sortedDiagnosisArray.pop();

  const sum = sortedDiagnosisArray.reduce((acc, current) => {
    const value = diagnosis[current] < 0 ? 0 : diagnosis[current];
    return acc + value;
  }, 0);
  const averageValue = sum / sortedDiagnosisArray.length;
  const resultDiagnosisArray = sortedDiagnosisArray.filter(current => diagnosis[current] > averageValue);

  // специальный случай для грыжи, артроза и мышц
  if (resultDiagnosisArray.length === 2 && resultDiagnosisArray.includes('hernia') && resultDiagnosisArray.includes('arthrosis')) {
    if (sortedDiagnosisArray.includes('muscles')) {
      return ['hernia', 'muscles'];
    }
    return ['hernia'];
  }

  // специальный случай для стеноза
  if (resultDiagnosisArray.includes('stenosis')) {
    if (resultDiagnosisArray.length === 1 && sortedDiagnosisArray[1] === 'hernia' || sortedDiagnosisArray[1] === 'arthrosis') return ['stenosis', sortedDiagnosisArray[1]];
    if (resultDiagnosisArray.length === 1 && sortedDiagnosisArray[2] === 'hernia' || sortedDiagnosisArray[2] === 'arthrosis') return ['stenosis', sortedDiagnosisArray[2]];
    if (resultDiagnosisArray.length === 2 && resultDiagnosisArray.includes('muscles')) return ['stenosis', sortedDiagnosisArray[2]];
  }


  // на случай, если окажется три ответа с одинаковым значением
  if (resultDiagnosisArray.length === 3 && resultDiagnosisArray.includes('hernia')) return ['hernia'];
  if (resultDiagnosisArray.length === 3) return [resultDiagnosisArray[0]];

  return resultDiagnosisArray;
}

export function getRusQuestionsAndAnswers(answers: Answer[]) {
  return answers.map(answer => ({
    question: getRusQuestionById(answer.questionId),
    answers: answer.questionAnswers,
  }));
}

function getRusQuestionById(questionId: string) {
  let dirtyQuestion = QUESTIONS.find(question => question.id === questionId)?.question;
  if (!dirtyQuestion) {
    const followUpQuestions = QUESTIONS.find(question => question.followUpQuestions?.some(fQuestion => fQuestion.id === questionId))?.followUpQuestions;
    dirtyQuestion = followUpQuestions?.find(question => question.id === questionId)?.question || '';
  }
  return cleanQuestion(dirtyQuestion);
}

function cleanQuestion(question: string) {
  if (question.startsWith("Оцените вашу боль")) return "Оцените вашу боль";

  const result = question.replace(/<\/?[^>]+(>|$)/g, "");
  return result.replace(/\(.*?\)/g, "").trim();
}