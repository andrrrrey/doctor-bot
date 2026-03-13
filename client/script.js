import { checkFormValidation } from "./validation.js";
import { collectAnswers } from "./collect-answers.js";
import { addErrorMessage, disableFormElements, enableFormElements, removeErrorMessage } from "./disable-form-elements.js";
import { addLoadingArticle, displaySurveyResults, SITE_NAME } from "./utils.js";
import { addConsultationForm } from "./consultation.js";
import { renderForm } from "./questions.js";

document.addEventListener('DOMContentLoaded', async () => {
  const article = addLoadingArticle();

  try {
    const response = await fetch(`${SITE_NAME}/survey`);
    const surveyData = await response.json();
    renderForm(surveyData);
    addSubmitButton();
    article.remove();
  } catch (error) {
    console.error('Error fetching data:', error);
  }
});

function addSubmitButton() {
  const formContainer = document.getElementById('surveyForm');
  const submitButton = document.createElement('button');
  submitButton.textContent = 'Получить результат';
  submitButton.id = 'surveyFormButton';
  submitButton.addEventListener('click', handleSubmit);
  formContainer.appendChild(submitButton);
}

function handleSubmit(event) {
  event.preventDefault();
  const valid = checkFormValidation();
  if (!valid) return;

  ym(98420996, 'reachGoal', 'getSurveyResult');

  const answers = collectAnswers();
  disableFormElements('surveyForm');
  removeErrorMessage('surveyForm');

  fetch(`${SITE_NAME}/postTestResults`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(answers),
  })
    .then(response => response.json())
    .then(responseJson => {
      displaySurveyResults(responseJson.html);

      if (responseJson.diagnosis && responseJson.answers) {
        addConsultationForm(responseJson.diagnosis, responseJson.answers, responseJson.extendedDiagnosis);
      }
    })
    .catch(error => {
      enableFormElements('surveyForm');
      addErrorMessage('surveyForm');
      console.error('Error submitting survey:', error);
    });
}