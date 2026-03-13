import { renderForm } from '/widget-questions.js';
import { collectAnswers } from '/widget-collect.js';
import { validateForm } from '/widget-validate.js';
import { renderConsultationForm } from '/widget-consultation.js';

// ── Read URL parameters ──────────────────────────────────────────────────────
const params = new URLSearchParams(window.location.search);
const projectId = params.get('projectId') || 'default';
const theme     = params.get('theme')     || 'light';
const source    = params.get('source')    || '';

// Apply theme
document.documentElement.setAttribute('data-theme', theme);

// ── postMessage helper for iframe height ─────────────────────────────────────
function notifyHeight() {
  const height = document.documentElement.scrollHeight;
  window.parent.postMessage({ type: 'doctor-bot-resize', height }, '*');
}

// Observe DOM changes to keep parent iframe height in sync
if (window.ResizeObserver) {
  new ResizeObserver(notifyHeight).observe(document.body);
}

// ── State ────────────────────────────────────────────────────────────────────
let sessionId = null;
let surveyResult = null; // { html, diagnosis, extendedDiagnosis, answers }

// ── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  await createSession();
  await loadQuestions();
});

async function loadSettings() {
  try {
    const res = await fetch('/api/settings');
    if (!res.ok) return;
    const settings = await res.json();

    // Update title and disclaimer
    if (settings.surveyTitle) {
      document.getElementById('widgetTitle').textContent = settings.surveyTitle;
    }
    if (settings.surveyDisclaimer) {
      const el = document.getElementById('widgetDisclaimer');
      el.textContent = settings.surveyDisclaimer;
      el.style.display = 'block';
    }

    // Apply custom CSS variables from settings
    const vars = {
      '--w-primary':    settings.primaryColor,
      '--w-bg':         settings.backgroundColor,
      '--w-text':       settings.textColor,
      '--w-radius':     settings.borderRadius,
      '--w-font':       settings.fontFamily,
    };
    Object.entries(vars).forEach(([prop, val]) => {
      if (val) document.documentElement.style.setProperty(prop, val);
    });

    // Store for consultation form
    window.__widgetSettings = settings;
  } catch {
    // settings endpoint may not be available, proceed with defaults
  }
}

async function createSession() {
  try {
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, source, theme }),
    });
    if (res.ok) {
      const data = await res.json();
      sessionId = data.id;
    }
  } catch {
    // continue without session tracking
  }
}

async function loadQuestions() {
  const form = document.getElementById('surveyForm');

  // Show loading indicator
  const loader = document.createElement('div');
  loader.className = 'loading-article';
  loader.innerHTML = '<div class="spinner"></div><span>Загрузка вопросов...</span>';
  form.appendChild(loader);
  notifyHeight();

  try {
    const res = await fetch('/api/questions');
    if (!res.ok) throw new Error('Failed to load questions');
    const data = await res.json();

    loader.remove();
    renderForm(data);
    addSubmitButton();
    notifyHeight();
  } catch {
    loader.innerHTML = '<span style="color:var(--w-error)">Не удалось загрузить опросник. Попробуйте обновить страницу.</span>';
    notifyHeight();
  }
}

function addSubmitButton() {
  const form = document.getElementById('surveyForm');
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = 'Получить результат';
  btn.className = 'btn-submit';
  btn.id = 'submitBtn';
  btn.addEventListener('click', handleSubmit);
  form.appendChild(btn);
}

async function handleSubmit() {
  if (!validateForm()) return;

  const answers = collectAnswers();
  const btn = document.getElementById('submitBtn');
  btn.disabled = true;
  btn.textContent = 'Обрабатываем...';

  try {
    const res = await fetch('/postTestResults', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(answers),
    });
    if (!res.ok) throw new Error('Server error');
    const result = await res.json();

    surveyResult = result;
    displayResults(result);
    hideSurveyForm();

    // Show consultation form if diagnosis was made
    if (result.diagnosis && result.answers) {
      const settings = window.__widgetSettings || {};
      renderConsultationForm({
        sessionId,
        diagnosis: result.diagnosis,
        answers: result.answers,
        extendedDiagnosis: result.extendedDiagnosis || '',
        privacyPolicyUrl: settings.privacyPolicyUrl || '#',
      });
    }

    notifyHeight();
  } catch {
    btn.disabled = false;
    btn.textContent = 'Получить результат';
    showFormError('Произошла ошибка при обработке. Попробуйте ещё раз.');
  }
}

function displayResults(result) {
  const section = document.createElement('div');
  section.className = 'results-section';
  section.innerHTML = result.html;
  document.querySelector('main').appendChild(section);
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function hideSurveyForm() {
  const form = document.getElementById('surveyForm');
  form.style.display = 'none';
  // Also hide H1 and disclaimer to keep results view clean
  const title = document.getElementById('widgetTitle');
  const disclaimer = document.getElementById('widgetDisclaimer');
  if (title) title.style.display = 'none';
  if (disclaimer) disclaimer.style.display = 'none';
}

function showFormError(msg) {
  let errEl = document.getElementById('surveyFormError');
  if (!errEl) {
    errEl = document.createElement('div');
    errEl.id = 'surveyFormError';
    errEl.className = 'form-error';
    const form = document.getElementById('surveyForm');
    form.insertAdjacentElement('afterend', errEl);
  }
  errEl.textContent = msg;
}
