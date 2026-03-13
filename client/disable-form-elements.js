export function disableFormElements(formId) {
  const form = document.getElementById(formId);

  const button = form.getElementsByTagName('button')[0];
  button.setAttribute("aria-busy", "true");

  const inputs = form.getElementsByTagName('input');
  for (let i = 0; i < inputs.length; i++) {
    inputs[i].setAttribute("disabled", "true");
  }

  const labeles = form.getElementsByTagName('label');
  for (let i = 0; i < labeles.length; i++) {
    labeles[i].setAttribute("aria-disabled", "true");
  }
}

export function enableFormElements(formId) {
  const form = document.getElementById(formId);

  const button = form.getElementsByTagName('button')[0];
  button.setAttribute("aria-busy", "false");

  const inputs = form.getElementsByTagName('input');
  for (let i = 0; i < inputs.length; i++) {
    inputs[i].setAttribute("disabled", "false");
  }

  const labeles = form.getElementsByTagName('label');
  for (let i = 0; i < labeles.length; i++) {
    labeles[i].setAttribute("aria-disabled", "false");
  }
}

export function addErrorMessage(formId) {
  const formContainer = document.getElementById(formId);
  const messageBlock = document.createElement('small');
  messageBlock.textContent = 'Что-то пошло не так. Попробуйте еще раз.';
  messageBlock.id = 'surveyFormButtonErrorMessage';
  messageBlock.classList.add('error-message');
  formContainer.appendChild(messageBlock);
}

export function removeErrorMessage(formId) {
  const formContainer = document.getElementById(formId);
  const errorMessage = formContainer.querySelector('#surveyFormButtonErrorMessage');
  errorMessage?.remove();
}