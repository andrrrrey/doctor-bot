export const SITE_NAME = 'http://localhost:3000';
// export const SITE_NAME = 'https://doctor.yurakoch.ru';

export function displaySurveyResults(html) {
  removeSurveyFormButton();
  const textWrapDiv = addSurveyResultsTextBlock(html);
  setTimeout(() => textWrapDiv.scrollIntoView({ behavior: 'smooth' }), 0);
}

function removeSurveyFormButton() {
  const surveyFormButton = document.getElementById('surveyFormButton');
  surveyFormButton.remove();
}

function addSurveyResultsTextBlock(html) {
  const textWrapDiv = document.createElement('div');
  textWrapDiv.className = 'text-wrap';
  textWrapDiv.innerHTML = html;
  const mainElement = document.querySelector('main');
  mainElement.appendChild(textWrapDiv);
  return textWrapDiv;
}

export function addLoadingArticle() {
  const mainElement = document.querySelector('main');
  const article = document.createElement('article');
  article.setAttribute("aria-busy", "true");
  mainElement.appendChild(article);
  return article;
}