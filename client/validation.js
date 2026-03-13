export function checkFormValidation() {
  const formContainer = document.getElementById('surveyForm');
  const articles = formContainer.querySelectorAll('article');

  return [...articles].every(article => {
    if (article.classList.contains('hidden')) return true;
    const isValid = isQuestionValid(article);
    if (!isValid) {
      article.classList.add('invalid');
      scrollToQuestion(article);
    }
    return isValid;
  });
}

function isQuestionValid(questionElement) {
  const inputs = questionElement.querySelectorAll('input');
  return [...inputs].some(input => {
    if (input.type === 'number' && input.value.trim() !== '') return true;
    if ((input.type === 'radio' || input.type === 'checkbox') && input.checked) return true;
  });
}

function scrollToQuestion(questionElement) {
  questionElement.scrollIntoView({ behavior: 'smooth' });
}