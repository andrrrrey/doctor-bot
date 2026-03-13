const WINDOW_BREAKPOINT = 700;

export function renderForm(surveyData) {
  const formContainer = document.getElementById('surveyForm');
  surveyData.questions.forEach(question => {
    const questionElement = createQuestionElement(question);
    formContainer.appendChild(questionElement);

    if (question.followUpQuestions) {
      question.followUpQuestions.forEach(followUpQuestion => {
        const followUpElement = createQuestionElement(followUpQuestion);
        followUpElement.classList.add('hidden');
        formContainer.appendChild(followUpElement);
      });
    }
  });
}

function createQuestionElement(question) {
  const article = document.createElement('article');
  article.id = question.id;
  const fieldset = document.createElement('fieldset');
  article.appendChild(fieldset);
  const questionLegend = document.createElement('legend');
  questionLegend.innerHTML = question.question;

  if (question.type === 'number') {
    fieldset.appendChild(questionLegend);
    appendNumberInput(fieldset, question);
  }
  else if (question.id === 'pain_scale' && question.type === 'radio') {
    fieldset.appendChild(questionLegend);
    appendOptions(fieldset, question, 'radio', window.innerWidth > WINDOW_BREAKPOINT);
  }
  else if (question.type === 'radio') {
    fieldset.appendChild(questionLegend);
    appendOptions(fieldset, question, 'radio');
  }
  else if (question.type === 'checkbox') {
    fieldset.appendChild(questionLegend);
    appendOptions(fieldset, question, 'checkbox');
  }

  const footer = document.createElement('footer');
  footer.innerText = 'Пожалуйста, ответьте на этот вопрос';
  article.appendChild(footer);
  return article;
}

function appendNumberInput(fieldset, question) {
  const input = document.createElement('input');
  input.type = 'number';
  input.id = `number_${question.id}`;
  input.name = `number_${question.id}`;
  input.addEventListener('change', () => clearQuestionValidation(question));
  fieldset.appendChild(input);
}

function appendOptions(fieldset, question, type, horizontal = false) {
  question.options.forEach((option, index) => {
    const label = document.createElement('label');
    label.htmlFor = `${question.id}_${option}`;
    const input = document.createElement('input');
    input.type = type;
    input.value = option;
    input.name = question.id;
    input.id = `${question.id}_${option}`;
    if (!horizontal) { label.appendChild(input); }

    if (question.id === "pain_image") {
      const optionLabelImage = document.createElement('img');
      optionLabelImage.src = `./images/${question.id}_${index}.svg`;
      optionLabelImage.alt = option;
      optionLabelImage.width = 300;
      const optionLabelText = document.createTextNode(option);
      const optionLabelContainer = document.createElement('div');
      optionLabelContainer.style.display = 'inline-block';;
      optionLabelContainer.appendChild(optionLabelText);
      const br = document.createElement('br');
      optionLabelContainer.appendChild(br);
      optionLabelContainer.appendChild(optionLabelImage);
      label.appendChild(optionLabelContainer);
    } else {
      const optionLabelText = document.createTextNode(option);
      label.appendChild(optionLabelText);
    }

    if (horizontal) { fieldset.appendChild(input); }
    fieldset.appendChild(label);
    if (question.followUpQuestions) {
      input.addEventListener('change', () => handleFollowUpQuestions(question, option));
    }
    input.addEventListener('change', () => clearQuestionValidation(question));
  });
}

function handleFollowUpQuestions(question) {
  const followUpQuestions = question.followUpQuestions || [];
  const inputs = document.querySelectorAll(`#${question.id} input`);
  const selectedValues = [];
  inputs.forEach(input => {
    if (input.checked) selectedValues.push(input.value)
  });

  followUpQuestions.forEach(followUp => {
    const followUpElement = document.getElementById(followUp.id);
    followUpElement?.classList.add('hidden');
    const shouldShowFollowUpQuestion = selectedValues.some(value => {
      return followUp.conditions.some(condition => condition === value)
    });
    if (shouldShowFollowUpQuestion) {
      followUpElement?.classList.remove('hidden');
    }
  });
}

function clearQuestionValidation(question) {
  const questionElement = document.getElementById(question.id);
  questionElement.classList.remove('invalid');
}