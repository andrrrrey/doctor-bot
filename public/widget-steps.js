import { renderConsultationForm } from '/widget-consultation.js';

// ── URL parameters ──────────────────────────────────────────────────────────
const params   = new URLSearchParams(window.location.search);
const projectId = params.get('projectId') || 'default';
const theme     = params.get('theme')     || 'light';
const source    = params.get('source')    || '';

document.documentElement.setAttribute('data-theme', theme);

// ── State ───────────────────────────────────────────────────────────────────
let sessionId   = null;
let settings    = {};
let questions   = [];  // raw from API
let flatSteps   = [];  // computed: [{question, isFollowUp}]
let currentStep = -1;  // -1 = welcome
let answers     = new Map(); // questionId → string[]
let isTransitioning = false;
const AUTO_ADVANCE_DELAY = 600;

// ── postMessage helpers ─────────────────────────────────────────────────────
function notifyHeight() {
  const height = document.documentElement.scrollHeight;
  window.parent.postMessage({ type: 'doctor-bot-resize', height }, '*');
}

function notifyScrollTop() {
  [0, 200, 500, 1000].forEach((delay) => {
    setTimeout(() => {
      window.parent.postMessage({ type: 'doctor-bot-scroll-to-top' }, '*');
    }, delay);
  });
}

window.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'doctor-bot-scroll-top') {
    window.scrollTo(0, 0);
  }
});

if (window.ResizeObserver) {
  new ResizeObserver(notifyHeight).observe(document.body);
}

// ── Init ────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  const app = document.getElementById('app');
  app.innerHTML = '<div class="loading-screen"><div class="spinner"></div><span>Загрузка...</span></div>';
  notifyHeight();

  try {
    await Promise.all([loadSettings(), createSession()]);
    await loadQuestions();
    buildFlatSteps();
    showWelcome();
    window.parent.postMessage({ type: 'doctor-bot-ready' }, '*');
  } catch {
    app.innerHTML = '<div class="error-screen">Не удалось загрузить опросник. Попробуйте обновить страницу.</div>';
  }
  notifyHeight();
});

// ── API calls ───────────────────────────────────────────────────────────────
async function loadSettings() {
  try {
    const res = await fetch('/api/settings');
    if (!res.ok) return;
    settings = await res.json();

    const vars = {
      '--w-primary':  settings.primaryColor,
      '--w-bg':       settings.backgroundColor,
      '--w-text':     settings.textColor,
      '--w-radius':   settings.borderRadius,
      '--w-font':     settings.fontFamily,
    };
    Object.entries(vars).forEach(([prop, val]) => {
      if (val) document.documentElement.style.setProperty(prop, val);
    });

    window.__widgetSettings = settings;
  } catch { /* proceed with defaults */ }
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
  } catch { /* continue without session */ }
}

async function loadQuestions() {
  const res = await fetch('/api/questions');
  if (!res.ok) throw new Error('Failed to load questions');
  const data = await res.json();
  questions = data.questions;
}

// ── Build flat step list ────────────────────────────────────────────────────
function buildFlatSteps() {
  const steps = [];

  questions.forEach((q) => {
    steps.push({ question: q, isFollowUp: false });

    if (q.followUpQuestions && q.followUpQuestions.length > 0) {
      q.followUpQuestions.forEach((fu) => {
        const parentAnswers = answers.get(q.id) || [];
        const shouldShow = parentAnswers.some((val) =>
          fu.conditions.some((cond) => cond === val)
        );
        if (shouldShow) {
          steps.push({ question: fu, isFollowUp: true });
        } else {
          // Clear answers for hidden follow-ups
          answers.delete(fu.id);
        }
      });
    }
  });

  flatSteps = steps;
}

// ── Rendering ───────────────────────────────────────────────────────────────
function showWelcome() {
  currentStep = -1;
  const app = document.getElementById('app');
  const title   = settings.stepsWelcomeTitle  || settings.surveyTitle || 'Опросник по боли в спине';
  const text    = settings.stepsWelcomeText   || 'Ответьте на несколько вопросов, чтобы получить предварительную оценку';
  const time    = settings.stepsWelcomeTime   || 'Займёт 2\u20133 минуты';
  const btnText = settings.stepsWelcomeButton || 'Начать';

  app.innerHTML = `
    <div class="step-screen welcome-screen step-fade-in">
      <div class="welcome-icon">\uD83D\uDCCB</div>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(text)}</p>
      <div class="welcome-time">${escapeHtml(time)}</div>
      <button class="btn-primary" id="startBtn">${escapeHtml(btnText)}</button>
    </div>
  `;

  document.getElementById('startBtn').addEventListener('click', () => {
    goToStep(0, 'forward');
  });

  notifyHeight();
}

function renderProgressBar() {
  const total = flatSteps.length;
  const current = currentStep + 1;
  const pct = Math.round((current / total) * 100);

  return `
    <div class="progress-bar">
      <div class="progress-track">
        <div class="progress-fill" style="width: ${pct}%"></div>
      </div>
      <div class="progress-text">${current} / ${total}</div>
    </div>
  `;
}

function goToStep(index, direction) {
  if (isTransitioning) return;
  if (index < 0) { showWelcome(); return; }
  // Clamp to valid range if follow-ups were removed during navigation
  if (index > flatSteps.length) index = flatSteps.length;
  if (index >= flatSteps.length) { handleSubmit(); return; }

  const app = document.getElementById('app');
  const oldScreen = app.querySelector('.step-screen');

  currentStep = index;
  const step = flatSteps[currentStep];
  const html = renderProgressBar() + renderQuestion(step.question, direction);

  if (oldScreen && direction) {
    isTransitioning = true;
    const exitClass = direction === 'forward' ? 'step-exit' : 'step-exit-back';
    oldScreen.classList.add(exitClass);

    setTimeout(() => {
      app.innerHTML = html;
      bindQuestionEvents(step.question);
      isTransitioning = false;
      notifyHeight();
      window.scrollTo(0, 0);
    }, 280);
  } else {
    app.innerHTML = html;
    bindQuestionEvents(step.question);
    notifyHeight();
    window.scrollTo(0, 0);
  }
}

function renderQuestion(question, direction) {
  const enterClass = direction === 'back' ? 'step-enter-back' : 'step-enter';
  const needsNextBtn = question.type === 'checkbox' || question.type === 'number' || question.type === 'text';
  const currentAnswers = answers.get(question.id) || [];

  let optionsHtml = '';

  if (question.id === 'pain_scale' && question.type === 'radio') {
    optionsHtml = renderPainScale(question, currentAnswers);
  } else if (question.type === 'radio') {
    optionsHtml = renderRadioCards(question, currentAnswers);
  } else if (question.type === 'checkbox') {
    optionsHtml = renderCheckboxCards(question, currentAnswers);
  } else if (question.type === 'number') {
    optionsHtml = renderNumberInput(question, currentAnswers);
  } else if (question.type === 'text') {
    optionsHtml = renderTextInput(question, currentAnswers);
  } else {
    // Unknown type — render a minimal fallback so the user is not stuck
    optionsHtml = `<div class="form-error">Тип вопроса «${escapeHtml(question.type || '')}» не поддерживается.</div>`;
  }

  const backBtn = currentStep > 0 || currentStep === 0
    ? '<button class="btn-back" id="backBtn">Назад</button>'
    : '';

  const nextBtn = needsNextBtn
    ? `<button class="btn-next" id="nextBtn" ${currentAnswers.length === 0 ? 'disabled' : ''}>Далее</button>`
    : '';

  const navHtml = (backBtn || nextBtn)
    ? `<div class="step-nav">${backBtn}${nextBtn}</div>`
    : '';

  return `
    <div class="step-screen question-screen ${enterClass}">
      <div class="question-title">${question.question}</div>
      ${optionsHtml}
      ${navHtml}
    </div>
  `;
}

function renderRadioCards(question, selected) {
  const cards = question.options.map((option, index) => {
    const isSelected = selected.includes(option);
    const isPainImage = question.id === 'pain_image';
    let inner = '';

    if (isPainImage) {
      inner = `
        <div class="card-row"><div class="card-indicator"></div><span>${escapeHtml(option)}</span></div>
        <img src="/images/${question.id}_${index}.svg" alt="${escapeHtml(option)}" />
      `;
    } else {
      inner = `<div class="card-indicator"></div><span>${escapeHtml(option)}</span>`;
    }

    return `<button class="answer-card${isSelected ? ' selected' : ''}${isPainImage ? ' has-image' : ''}" data-value="${escapeAttr(option)}">${inner}</button>`;
  });

  return `<div class="answer-cards">${cards.join('')}</div>`;
}

function renderCheckboxCards(question, selected) {
  const cards = question.options.map((option) => {
    const isSelected = selected.includes(option);
    return `<button class="answer-card checkbox-card${isSelected ? ' selected' : ''}" data-value="${escapeAttr(option)}">
      <div class="card-indicator"></div><span>${escapeHtml(option)}</span>
    </button>`;
  });

  return `<div class="answer-cards">${cards.join('')}</div>`;
}

function renderPainScale(question, selected) {
  const buttons = question.options.map((option) => {
    const isSelected = selected.includes(option);
    return `<button class="pain-scale-btn${isSelected ? ' selected' : ''}" data-value="${escapeAttr(option)}">${escapeHtml(option)}</button>`;
  });

  return `<div class="pain-scale-grid">${buttons.join('')}</div>`;
}

function renderNumberInput(question, selected) {
  const value = selected.length > 0 ? selected[0] : '';
  return `
    <div class="number-input-wrap">
      <input type="number" id="numberInput" min="1" max="120" value="${escapeAttr(value)}" placeholder="Введите число" />
    </div>
  `;
}

function renderTextInput(question, selected) {
  const value = selected.length > 0 ? selected[0] : '';
  return `
    <div class="number-input-wrap">
      <input type="text" id="textInput" value="${escapeAttr(value)}" placeholder="Введите ответ" />
    </div>
  `;
}

// ── Event binding ───────────────────────────────────────────────────────────
function bindQuestionEvents(question) {
  // Back button
  const backBtn = document.getElementById('backBtn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      goToStep(currentStep - 1, 'back');
    });
  }

  // Next button (checkbox / number)
  const nextBtn = document.getElementById('nextBtn');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      advanceForward();
    });
  }

  if (question.id === 'pain_scale' && question.type === 'radio') {
    bindPainScale(question);
  } else if (question.type === 'radio') {
    bindRadioCards(question);
  } else if (question.type === 'checkbox') {
    bindCheckboxCards(question);
  } else if (question.type === 'number') {
    bindNumberInput(question);
  } else if (question.type === 'text') {
    bindTextInput(question);
  }
}

function bindRadioCards(question) {
  document.querySelectorAll('.answer-card').forEach((card) => {
    card.addEventListener('click', () => {
      const value = card.dataset.value;
      answers.set(question.id, [value]);

      // Visual feedback
      document.querySelectorAll('.answer-card').forEach((c) => c.classList.remove('selected'));
      card.classList.add('selected');

      // Rebuild steps (follow-ups may change)
      buildFlatSteps();

      // Auto-advance after delay
      setTimeout(() => advanceForward(), AUTO_ADVANCE_DELAY);
    });
  });
}

function bindPainScale(question) {
  document.querySelectorAll('.pain-scale-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const value = btn.dataset.value;
      answers.set(question.id, [value]);

      document.querySelectorAll('.pain-scale-btn').forEach((b) => b.classList.remove('selected'));
      btn.classList.add('selected');

      buildFlatSteps();
      setTimeout(() => advanceForward(), AUTO_ADVANCE_DELAY);
    });
  });
}

function bindCheckboxCards(question) {
  document.querySelectorAll('.answer-card').forEach((card) => {
    card.addEventListener('click', () => {
      const value = card.dataset.value;
      const current = answers.get(question.id) || [];

      if (current.includes(value)) {
        answers.set(question.id, current.filter((v) => v !== value));
        card.classList.remove('selected');
      } else {
        current.push(value);
        answers.set(question.id, current);
        card.classList.add('selected');
      }

      buildFlatSteps();

      // Enable/disable next button
      const nextBtn = document.getElementById('nextBtn');
      if (nextBtn) {
        nextBtn.disabled = (answers.get(question.id) || []).length === 0;
      }
    });
  });
}

function bindNumberInput(question) {
  const input = document.getElementById('numberInput');
  if (!input) return;

  input.addEventListener('input', () => {
    const val = input.value.trim();
    if (val) {
      answers.set(question.id, [val]);
    } else {
      answers.delete(question.id);
    }

    const nextBtn = document.getElementById('nextBtn');
    if (nextBtn) {
      nextBtn.disabled = !val;
    }
  });

  // Allow Enter key to advance
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && input.value.trim()) {
      advanceForward();
    }
  });

  input.focus();
}

function bindTextInput(question) {
  const input = document.getElementById('textInput');
  if (!input) return;

  input.addEventListener('input', () => {
    const val = input.value.trim();
    if (val) {
      answers.set(question.id, [val]);
    } else {
      answers.delete(question.id);
    }

    const nextBtn = document.getElementById('nextBtn');
    if (nextBtn) {
      nextBtn.disabled = !val;
    }
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && input.value.trim()) {
      e.preventDefault();
      advanceForward();
    }
  });

  input.focus();
}

function advanceForward() {
  if (isTransitioning) return;
  // Recalculate flat steps in case follow-ups changed
  buildFlatSteps();
  goToStep(currentStep + 1, 'forward');
}

// ── Submit ──────────────────────────────────────────────────────────────────
async function handleSubmit() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="step-screen processing-screen step-fade-in">
      <div class="spinner"></div>
      <p>Обрабатываем ваши ответы...</p>
    </div>
  `;
  notifyHeight();

  // Build answers array for API
  const answersArray = [];
  flatSteps.forEach(({ question }) => {
    const a = answers.get(question.id);
    if (a && a.length > 0) {
      answersArray.push({ questionId: question.id, questionAnswers: a });
    }
  });

  console.log('[widget-steps] submitting answers:', answersArray);

  let errorDetails = '';
  try {
    const res = await fetch('/postTestResults', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(answersArray),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      errorDetails = `HTTP ${res.status} ${res.statusText}${text ? ': ' + text.slice(0, 300) : ''}`;
      throw new Error(errorDetails);
    }
    const result = await res.json();
    console.log('[widget-steps] result:', result);

    showResults(result);
  } catch (err) {
    console.error('[widget-steps] submit failed:', err);
    const msg = errorDetails || (err && err.message) || 'Неизвестная ошибка';
    app.innerHTML = `
      <div class="step-screen processing-screen">
        <p style="color: var(--w-error)">Произошла ошибка при обработке. Попробуйте ещё раз.</p>
        <p style="font-size:0.8rem;color:var(--w-text-muted);max-width:480px;word-break:break-word">${escapeHtml(msg)}</p>
        <button class="btn-primary" id="retryBtn">Попробовать снова</button>
      </div>
    `;
    document.getElementById('retryBtn').addEventListener('click', handleSubmit);
    notifyHeight();
  }
}

function showResults(result) {
  const app = document.getElementById('app');
  const title = settings.stepsResultTitle || 'Ваш результат';
  const intro = settings.stepsResultText || '';

  app.innerHTML = `
    <div class="results-screen step-fade-in">
      <h1>${escapeHtml(title)}</h1>
      ${intro ? `<p>${escapeHtml(intro)}</p>` : ''}
      <div class="results-card">${result.html}</div>
    </div>
  `;

  // Show consultation form if diagnosis was made
  if (result.diagnosis && result.answers) {
    const s = window.__widgetSettings || {};
    renderConsultationForm({
      sessionId,
      diagnosis: result.diagnosis,
      answers: result.answers,
      extendedDiagnosis: result.extendedDiagnosis || '',
      diagnosisHtml: result.html || '',
      privacyPolicyUrl: s.privacyPolicyUrl || '#',
    });
  }

  notifyHeight();
  window.scrollTo(0, 0);
  notifyScrollTop();
}

// ── Utilities ───────────────────────────────────────────────────────────────
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function escapeAttr(str) {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
