import { addErrorMessage, disableFormElements, enableFormElements, removeErrorMessage } from "./disable-form-elements.js";
import { SITE_NAME } from "./utils.js";

export function addConsultationForm(diagnosis, answers, extendedDiagnosis = '') {
  const formWrap = document.createElement('article');
  formWrap.className = 'form-wrap';

  const form = document.createElement('form');
  form.id = 'consultationForm';
  form.innerHTML = `
      <h2>Запишитесь на консультацию с врачом</h2>
      <label for="nameConsultationInput">Укажите ваше имя</label>
      <input type="text" name="name" id="nameConsultationInput" autocomplete="given-name">

      <label for="telConsultationInput">Укажите ваш телефон</label>
      <input type="tel" name="tel" id="telConsultationInput" autocomplete="tel" required>

      <label for="cityConsultationInput">Укажите ваш город</label>
      <input type="text" name="city" id="cityConsultationInput" autocomplete="address-level2">

      <button type="submit">Записаться</button>

      <label for="terms">
        <input type="checkbox" id="terms" name="terms" checked />
        Согласен с условиями
        <a href="https://epifanov.clinic/privacy" target="_blank">политики конфиденциальности</a>
      </label>
  `;
  formWrap.appendChild(form);

  const mainElement = document.querySelector('main');
  mainElement.appendChild(formWrap);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    ym(98420996, 'reachGoal', 'doctor Appointment');
    handleConsultationFormSubmit(event, diagnosis, answers, extendedDiagnosis);
  });
}

async function handleConsultationFormSubmit(event, diagnosis, answers, extendedDiagnosis) {
  try {
    const form = event.target;
    const patientName = form.querySelector('#nameConsultationInput').value;
    const patientPhone = form.querySelector('#telConsultationInput').value;
    const patientCity = form.querySelector('#cityConsultationInput').value;

    disableFormElements('consultationForm');
    removeErrorMessage('consultationForm');

    const response = await fetch(`${SITE_NAME}/postConsultationData`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        patientName,
        patientPhone,
        patientCity,
        diagnosis,
        extendedDiagnosis,
        answers
      }),
    });

    if (response.ok) {
      const consultationForm = document.getElementById('consultationForm');
      const formWrap = consultationForm.parentElement;
      consultationForm.remove();
      formWrap.innerHTML = `
        <h2>Успешно отправлено</h2>
        <p>Мы вам перезвоним в течение рабочего дня</p>
      `;
    } else {
      throw new Error();
    }
  } catch (error) {
    enableFormElements('consultationForm');
    addErrorMessage('consultationForm');
  }
}
