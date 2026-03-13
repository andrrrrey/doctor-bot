// Validate that all visible questions have been answered
export function validateForm() {
  const articles = document.querySelectorAll('#surveyForm article:not(.hidden)');
  let valid = true;
  let firstInvalid = null;

  articles.forEach((article) => {
    const questionId = article.id;
    let answered = false;

    const numberInput = article.querySelector('input[type="number"]');
    if (numberInput) {
      answered = numberInput.value.trim() !== '';
    } else {
      answered = article.querySelector('input:checked') !== null;
    }

    if (!answered) {
      article.classList.add('invalid');
      valid = false;
      if (!firstInvalid) firstInvalid = article;
    } else {
      article.classList.remove('invalid');
    }
  });

  if (firstInvalid) {
    firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  return valid;
}
