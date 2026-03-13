// Render the survey form from questions data returned by the API
export function renderForm(data) {
  const formContainer = document.getElementById('surveyForm');
  const questions = data.questions;

  questions.forEach((question) => {
    const el = createQuestionElement(question);
    formContainer.appendChild(el);

    if (question.followUpQuestions && question.followUpQuestions.length > 0) {
      question.followUpQuestions.forEach((followUp) => {
        const followUpEl = createQuestionElement(followUp);
        followUpEl.classList.add('hidden');
        formContainer.appendChild(followUpEl);
      });
    }
  });
}

function createQuestionElement(question) {
  const article = document.createElement('article');
  article.id = question.id;

  const fieldset = document.createElement('fieldset');
  const legend = document.createElement('legend');
  legend.innerHTML = question.question;
  fieldset.appendChild(legend);

  if (question.type === 'number') {
    appendNumberInput(fieldset, question);
  } else if (question.id === 'pain_scale' && question.type === 'radio') {
    appendPainScale(fieldset, question);
  } else if (question.type === 'radio' || question.type === 'checkbox') {
    appendOptions(fieldset, question, question.type);
  }

  article.appendChild(fieldset);

  const footer = document.createElement('footer');
  footer.textContent = 'Пожалуйста, ответьте на этот вопрос';
  article.appendChild(footer);

  return article;
}

function appendNumberInput(fieldset, question) {
  const input = document.createElement('input');
  input.type = 'number';
  input.id = `number_${question.id}`;
  input.name = `number_${question.id}`;
  input.min = '1';
  input.max = '120';
  input.addEventListener('change', () => clearValidation(question.id));
  fieldset.appendChild(input);
}

function appendPainScale(fieldset, question) {
  const wrap = document.createElement('div');
  wrap.className = 'pain-scale-wrap';

  question.options.forEach((option) => {
    const input = document.createElement('input');
    input.type = 'radio';
    input.value = option;
    input.name = question.id;
    input.id = `${question.id}_${option}`;
    input.addEventListener('change', () => clearValidation(question.id));

    const label = document.createElement('label');
    label.htmlFor = `${question.id}_${option}`;
    label.textContent = option;

    wrap.appendChild(input);
    wrap.appendChild(label);
  });

  fieldset.appendChild(wrap);
}

function appendOptions(fieldset, question, type) {
  question.options.forEach((option, index) => {
    const label = document.createElement('label');
    label.htmlFor = `${question.id}_${option}`;

    const input = document.createElement('input');
    input.type = type;
    input.value = option;
    input.name = question.id;
    input.id = `${question.id}_${option}`;
    input.addEventListener('change', () => clearValidation(question.id));

    if (question.followUpQuestions && question.followUpQuestions.length > 0) {
      input.addEventListener('change', () => handleFollowUps(question));
    }

    label.appendChild(input);

    if (question.id === 'pain_image') {
      label.classList.add('pain-image-label');
      const img = document.createElement('img');
      img.src = `/images/${question.id}_${index}.svg`;
      img.alt = option;
      const text = document.createTextNode(option);
      label.appendChild(text);
      const br = document.createElement('br');
      label.appendChild(br);
      label.appendChild(img);
    } else {
      label.appendChild(document.createTextNode(option));
    }

    fieldset.appendChild(label);
  });
}

function handleFollowUps(question) {
  const inputs = document.querySelectorAll(`#${question.id} input`);
  const selected = [];
  inputs.forEach((inp) => { if (inp.checked) selected.push(inp.value); });

  question.followUpQuestions.forEach((followUp) => {
    const el = document.getElementById(followUp.id);
    if (!el) return;
    el.classList.add('hidden');
    const shouldShow = selected.some((val) =>
      followUp.conditions.some((cond) => cond === val)
    );
    if (shouldShow) el.classList.remove('hidden');
  });
}

function clearValidation(questionId) {
  document.getElementById(questionId)?.classList.remove('invalid');
}
