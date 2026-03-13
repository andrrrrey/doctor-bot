// Collect answers from visible form questions
export function collectAnswers() {
  const answers = [];
  const articles = document.querySelectorAll('#surveyForm article:not(.hidden)');

  articles.forEach((article) => {
    const questionId = article.id;
    const questionAnswers = [];

    const numberInput = article.querySelector('input[type="number"]');
    if (numberInput) {
      if (numberInput.value) questionAnswers.push(numberInput.value);
    } else {
      article.querySelectorAll('input:checked').forEach((inp) => {
        questionAnswers.push(inp.value);
      });
    }

    answers.push({ questionId, questionAnswers });
  });

  return answers;
}
