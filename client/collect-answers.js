export function collectAnswers() {
  const formContainer = document.getElementById('surveyForm');
  const articles = formContainer.querySelectorAll('article');
  const answers = [];

  articles.forEach(article => {
    if (article.classList.contains('hidden')) return;
    const questionId = article.id;
    const inputs = article.querySelectorAll('input');
    const questionAnswers = [];

    inputs.forEach(input => {
      if (input.type === 'checkbox' || input.type === 'radio') {
        if (input.checked) {
          questionAnswers.push(input.value);
        }
      } else if (input.value) {
        questionAnswers.push(input.value);
      }
    });

    if (questionAnswers.length > 0) {
      answers.push({
        questionId,
        questionAnswers,
      });
    }
  });

  return answers;
}