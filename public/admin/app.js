/* ═══════════════════════════════════════════════════════════════
   Admin Panel App — Doctor Bot
   Vanilla JS, no build step required
   ═══════════════════════════════════════════════════════════════ */

'use strict';

// ── State ────────────────────────────────────────────────────────
let token = localStorage.getItem('admin_token') || null;
let allQuestions = [];
let submissionsPage = 1;
let submissionsFilters = {};

// ── API helpers ──────────────────────────────────────────────────
async function api(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body !== undefined) opts.body = JSON.stringify(body);

  const res = await fetch(`/api/admin${path}`, opts);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data;
}

function get(path) { return api('GET', path); }
function post(path, body) { return api('POST', path, body); }
function put(path, body) { return api('PUT', path, body); }
function patch(path, body) { return api('PATCH', path, body); }
function del(path) { return api('DELETE', path); }

// ── Toast ────────────────────────────────────────────────────────
function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast toast-${type}`;
  el.classList.remove('hidden');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.add('hidden'), 3500);
}

// ── Init ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (token) {
    validateToken();
  } else {
    showLogin();
  }
  setupNavigation();
  setupLoginForm();
  setupLogout();
  setupModalClose();
  setupQuestionModal();
  setupSubmissionFilters();
  setupStatsFilters();
  setupSettings();
});

// ── Auth ─────────────────────────────────────────────────────────
async function validateToken() {
  try {
    await get('/auth/me');
    showApp();
  } catch {
    token = null;
    localStorage.removeItem('admin_token');
    showLogin();
  }
}

function showLogin() {
  document.getElementById('login-page').classList.remove('hidden');
  document.getElementById('app').classList.add('hidden');
}

function showApp() {
  document.getElementById('login-page').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  navigateTo(location.hash.replace('#', '') || 'questions');
}

function setupLoginForm() {
  const form = document.getElementById('login-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const login = document.getElementById('login-input').value.trim();
    const password = document.getElementById('password-input').value;
    const errEl = document.getElementById('login-error');
    const btn = document.getElementById('login-btn');

    errEl.classList.add('hidden');
    btn.disabled = true;
    btn.textContent = 'Вход...';

    try {
      const data = await post('/auth/login', { login, password });
      token = data.token;
      localStorage.setItem('admin_token', token);
      showApp();
    } catch (err) {
      errEl.textContent = err.message === 'Invalid credentials'
        ? 'Неверный логин или пароль'
        : 'Ошибка авторизации: ' + err.message;
      errEl.classList.remove('hidden');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Войти';
    }
  });
}

function setupLogout() {
  document.getElementById('logout-btn').addEventListener('click', () => {
    token = null;
    localStorage.removeItem('admin_token');
    showLogin();
  });
}

// ── Navigation ───────────────────────────────────────────────────
function setupNavigation() {
  document.querySelectorAll('.nav-item').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const section = link.dataset.section;
      navigateTo(section);
    });
  });
  window.addEventListener('hashchange', () => {
    navigateTo(location.hash.replace('#', '') || 'questions');
  });
}

function navigateTo(section) {
  const valid = ['questions', 'submissions', 'stats', 'settings'];
  if (!valid.includes(section)) section = 'questions';

  history.replaceState(null, '', `#${section}`);

  document.querySelectorAll('.section').forEach((s) => s.classList.add('hidden'));
  document.getElementById(`section-${section}`).classList.remove('hidden');

  document.querySelectorAll('.nav-item').forEach((l) => {
    l.classList.toggle('active', l.dataset.section === section);
  });

  // Load section data
  if (section === 'questions') loadQuestions();
  else if (section === 'submissions') loadSubmissions();
  else if (section === 'stats') loadStats();
  else if (section === 'settings') loadSettings();
}

// ── Modal helpers ────────────────────────────────────────────────
function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

function setupModalClose() {
  document.querySelectorAll('[data-close]').forEach((btn) => {
    btn.addEventListener('click', () => closeModal(btn.dataset.close));
  });
  document.querySelectorAll('.modal-overlay').forEach((overlay) => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });
}

// ═══════════════════════════════════════════════════════════════════
// QUESTIONS SECTION
// ═══════════════════════════════════════════════════════════════════

async function loadQuestions() {
  const tbody = document.getElementById('questions-tbody');
  tbody.innerHTML = '<tr><td colspan="6" class="loading-cell">Загрузка...</td></tr>';

  try {
    const data = await get('/questions');
    allQuestions = data.questions;
    renderQuestions(allQuestions);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="loading-cell" style="color:var(--danger)">Ошибка: ${esc(err.message)}</td></tr>`;
  }
}

function renderQuestions(questions) {
  const tbody = document.getElementById('questions-tbody');

  if (!questions.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="loading-cell">Вопросов нет</td></tr>';
    return;
  }

  tbody.innerHTML = questions.map((q) => {
    const parent = q.parentId ? allQuestions.find((p) => p.id === q.parentId) : null;
    const optCount = q.options?.length ?? 0;
    return `
      <tr data-id="${esc(q.id)}" draggable="true">
        <td>
          <span class="drag-handle" title="Перетащить для сортировки">⠿</span>
          <span style="color:var(--gray-400);font-size:12px">${q.order}</span>
        </td>
        <td>
          <div style="font-weight:500;color:var(--gray-800)">${stripHTML(q.question)}</div>
          ${optCount ? `<div style="font-size:11px;color:var(--gray-400);margin-top:2px">${optCount} вариант(ов) ответа</div>` : ''}
          ${q.conditions?.length ? `<div style="font-size:11px;color:var(--gray-400)">Условия: ${esc(q.conditions.join(', '))}</div>` : ''}
        </td>
        <td><span class="type-badge">${esc(q.type)}</span></td>
        <td style="font-size:12px;color:var(--gray-500)">${parent ? esc(stripHTML(parent.question).slice(0, 30)) : '—'}</td>
        <td>
          <span class="badge ${q.isActive ? 'badge-active' : 'badge-inactive'}">
            ${q.isActive ? 'Активен' : 'Скрыт'}
          </span>
        </td>
        <td>
          <div style="display:flex;gap:4px;flex-wrap:wrap">
            <button class="btn btn-ghost btn-sm" onclick="editQuestion('${esc(q.id)}')">Ред.</button>
            <button class="btn btn-ghost btn-sm" onclick="toggleQuestion('${esc(q.id)}')" style="color:var(--gray-500)">
              ${q.isActive ? 'Скрыть' : 'Показать'}
            </button>
            <button class="btn btn-ghost btn-sm" onclick="deleteQuestion('${esc(q.id)}')" style="color:var(--danger)">Удалить</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  setupDragSort();
}

function setupDragSort() {
  const tbody = document.getElementById('questions-tbody');
  let dragSrc = null;

  tbody.querySelectorAll('tr[draggable]').forEach((row) => {
    row.addEventListener('dragstart', () => {
      dragSrc = row;
      row.classList.add('dragging');
    });
    row.addEventListener('dragend', () => {
      row.classList.remove('dragging');
      tbody.querySelectorAll('tr').forEach((r) => r.classList.remove('drag-over'));
      saveSortOrder();
    });
    row.addEventListener('dragover', (e) => {
      e.preventDefault();
      tbody.querySelectorAll('tr').forEach((r) => r.classList.remove('drag-over'));
      if (row !== dragSrc) row.classList.add('drag-over');
    });
    row.addEventListener('drop', (e) => {
      e.preventDefault();
      if (dragSrc && dragSrc !== row) {
        const rows = [...tbody.querySelectorAll('tr')];
        const srcIdx = rows.indexOf(dragSrc);
        const tgtIdx = rows.indexOf(row);
        if (srcIdx < tgtIdx) {
          row.after(dragSrc);
        } else {
          row.before(dragSrc);
        }
      }
    });
  });
}

async function saveSortOrder() {
  const rows = [...document.getElementById('questions-tbody').querySelectorAll('tr[data-id]')];
  const items = rows.map((r, i) => ({ id: r.dataset.id, order: i + 1 }));
  try {
    await patch('/questions/reorder', { items });
    // Update local order display
    rows.forEach((r, i) => {
      const orderSpan = r.querySelector('span[style*="color:var(--gray-400)"]');
      if (orderSpan) orderSpan.textContent = i + 1;
    });
    toast('Порядок сохранён');
  } catch (err) {
    toast('Ошибка сохранения порядка: ' + err.message, 'error');
  }
}

async function toggleQuestion(id) {
  try {
    const data = await patch(`/questions/${id}/toggle`, {});
    toast(data.isActive ? 'Вопрос активирован' : 'Вопрос скрыт');
    loadQuestions();
  } catch (err) {
    toast('Ошибка: ' + err.message, 'error');
  }
}

async function deleteQuestion(id) {
  const q = allQuestions.find((q) => q.id === id);
  const text = q ? stripHTML(q.question).slice(0, 60) : id;
  if (!confirm(`Удалить вопрос?\n"${text}"\n\nЭто действие необратимо.`)) return;

  try {
    await del(`/questions/${id}`);
    toast('Вопрос удалён');
    loadQuestions();
  } catch (err) {
    toast('Ошибка: ' + err.message, 'error');
  }
}

// ── Question Form Modal ──────────────────────────────────────────

// Описание захардкоженной логики для существующих вопросов.
// options: веса по каждому конкретному варианту ответа (справочно, не редактируются здесь).
// note: текстовое описание условной логики, которую нельзя свести к простым весам.
const HARDCODED_LOGIC = {
  age: {
    note: 'Условная логика по возрасту пациента: ≤25 → Мышцы+2; 26–34 → Грыжа+2, Мышцы+1; 35–39 → Артроз+1; 40–47 → Артроз+1, Грыжа+1, Мышцы-1; 48–59 → Артроз+2, Стеноз+1, Мышцы-2; ≥60 → Артроз+3, Стеноз+2, Грыжа-1, Мышцы-3. Если занимался спортом 10+ лет — к возрасту прибавляется 7.',
  },
  pain_scale: {
    note: 'Боль ≥6 → Грыжа+1.',
  },
  pain_location: {
    note: 'Условная логика по комбинации выбранных мест боли: все 6 поясничных/крестцовых → Грыжа+1; боль в паху → Артроз+2; обе ноги → Грыжа-2, Мышцы+1; одна нога → Грыжа+2; одна ягодица → Грыжа+1; поясница без ног → Артроз+1; центр поясницы → Грыжа+1.',
  },
  leg_pain: {
    options: {
      'Да': { hernia: 3 },
    },
  },
  pain_image: {
    options: {
      'Разовая и не проходящая':        { hernia: 1, muscles: -2 },
      'Нарастающая со временем':        { arthrosis: 2, stenosis: 2 },
      'Скачкообразная, то есть, то нет': { muscles: 2 },
    },
  },
  morning_pain: {
    note: 'Баллы Грыжа/Артроз/Стеноз прибавляются только если они уже >0.',
    options: {
      'Да':  { hernia: 2, arthrosis: 2, stenosis: 2, inflammation: 1 },
      'Нет': { hernia: -1, arthrosis: -1 },
    },
  },
  night_pain: {
    note: 'Если утром боль тоже "Да" — блок Грыжа/Артроз/Стеноз+2 пропускается.',
    options: {
      'Да, только когда переварачиваюсь': { hernia: 1, arthrosis: 1 },
      'Да':                               { inflammation: 1, hernia: 2, arthrosis: 2, stenosis: 2 },
    },
  },
  pain_nature: {
    options: {
      'Спонтанная, возникает в состоянии покоя': { hernia: 2, arthrosis: 2, inflammation: 1 },
      'Механическая, провоцируется движением':   { muscles: 2 },
    },
  },
  dn4: {
    note: '"Ничего из вышеперечисленного" → Грыжа-4; онемение или мурашки → Грыжа+2; 2 и более симптомов → Грыжа+2.',
  },
  walking: {
    options: {
      'Нет': { stenosis: 4 },
    },
  },
  walk_frequency: {
    note: 'Стеноз+1 и Грыжа+1 применяются только если их текущий балл >0.',
    options: {
      'Нет': { stenosis: 1, hernia: 1 },
      'Да':  { stenosis: -6 },
    },
  },
  pain_while_walking: {
    options: {
      'Да': { stenosis: 1 },
    },
  },
  sit_without_pain: {
    note: 'Условная логика: зависит от ответа на вопрос "Можете ли пройти остановку". Если "Да" + сидеть нет → Грыжа+2, Мышцы+3; сидеть да → Артроз+1, Мышцы-3. Если "Нет" + сидеть нет → Грыжа+2, Стеноз-3; сидеть да → Стеноз+2, Мышцы-2.',
  },
  stand_without_pain: {
    note: 'Мышцы+1 и Артроз+1 применяются только если их текущий балл >0.',
    options: {
      'Нет': { muscles: 1, stenosis: 1, hernia: 1 },
      'Да':  { arthrosis: 1 },
    },
  },
  lift_groceries: {
    note: 'Артроз+1 и Стеноз+1 при "Да" применяются только если их текущий балл >0.',
    options: {
      'Нет': { muscles: 2, hernia: 2 },
      'Да':  { arthrosis: 1, stenosis: 1, muscles: -1 },
    },
  },
  symptoms_duration: {
    note: 'При "Больше года" и "Больше трёх лет" — баллы применяются только если текущий показатель >0.',
    options: {
      'До месяца':        { hernia: 2, stenosis: -2, arthrosis: -2 },
      'До полугода':      { hernia: 2, stenosis: -2, arthrosis: -1 },
      'Больше года':      { muscles: 2, hernia: 2, arthrosis: 2, stenosis: 2, neurosis: 2 },
      'Больше трех лет':  { arthrosis: 2, stenosis: 2, muscles: 2 },
    },
  },
  spine_operation: {
    note: 'Баллы применяются только если текущий показатель >0.',
    options: {
      'Да': { muscles: 2, hernia: 2, arthrosis: 2, stenosis: 2 },
    },
  },
  current_flare_duration: {
    options: {
      'До недели':    { muscles: 2, arthrosis: 1, hernia: -3 },
      'До трех недель': { arthrosis: 2 },
      'До 5 месяцев': { hernia: 2, stenosis: 2 },
    },
  },
  researches: {
    note: '"Рентген с функциональными пробами" → Артроз+2, Стеноз+2, Грыжа-1. Если выбрано 4+ исследования → Стресс+2 и все показатели +2 (только если >0).',
  },
  lumbar_mri_count: {
    options: {
      'Да': { hernia: 2, muscles: -1 },
    },
  },
  neurosurgeon_consultation: {
    options: {
      'Да': { hernia: 1, stenosis: 1, muscles: -2 },
    },
  },
  trauma_or_sudden_onset: {
    note: 'Условная логика: если симптомы "Больше трёх лет" — блок пропускается. При травме/внезапном начале → Грыжа+2, Мышцы+1, Артроз+1 (если >0). Иначе → Стеноз+1, Артроз+1, Мышцы+1 (если >0).',
  },
  sudden_onset: {
    note: 'Используется совместно с вопросом о травме (trauma_or_sudden_onset).',
  },
  stress_related_flare: {
    note: 'Грыжа+1, Стеноз+1, Артроз+1 при "Нет" применяются только если их текущий балл >0.',
    options: {
      'Нет': { hernia: 1, stenosis: 1, arthrosis: 1 },
      'Да':  { muscles: 2 },
    },
  },
  neurosis_symptoms: {
    note: 'Считается количество выбранных симптомов (без пункта "Ничего"). Если делали МРТ головы — счётчик +1. При 4+ симптомах → Стресс+9.',
  },
  head_mri: {
    note: 'Используется внутри логики вопроса "neurosis_symptoms": при ответе "Да" счётчик стресс-симптомов увеличивается на 1.',
  },
};

const WEIGHT_KEYS = [
  { key: 'neurosis',    label: 'Стресс' },
  { key: 'muscles',     label: 'Мышцы' },
  { key: 'hernia',      label: 'Грыжа' },
  { key: 'arthrosis',   label: 'Артроз' },
  { key: 'stenosis',    label: 'Стеноз' },
  { key: 'inflammation', label: 'Воспал.' },
];

function fmtBaseWeight(val) {
  if (!val) return '<span class="bw-zero">0</span>';
  return val > 0
    ? `<span class="bw-pos">+${val}</span>`
    : `<span class="bw-neg">${val}</span>`;
}

function makeOptionRow(value = '', weights = {}, baseWeights = null) {
  const row = document.createElement('div');
  row.className = 'option-row';

  // — text + remove button —
  const textRow = document.createElement('div');
  textRow.className = 'option-text-row';
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'opt-value';
  input.placeholder = 'Текст варианта';
  input.value = value;
  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'btn btn-ghost btn-sm';
  removeBtn.style.color = 'var(--danger)';
  removeBtn.title = 'Удалить вариант';
  removeBtn.textContent = '✕';
  removeBtn.addEventListener('click', () => row.remove());
  textRow.appendChild(input);
  textRow.appendChild(removeBtn);
  row.appendChild(textRow);

  // — base weights reference row (read-only) —
  if (baseWeights) {
    const baseRow = document.createElement('div');
    baseRow.className = 'option-base-row';
    baseRow.innerHTML = '<span class="base-row-label">Базовая логика:</span>' +
      WEIGHT_KEYS.map(({ key, label }) =>
        `<span class="base-cell"><span class="base-cell-label">${label}</span>${fmtBaseWeight(baseWeights[key] || 0)}</span>`
      ).join('');
    row.appendChild(baseRow);
  }

  // — editable extra weights —
  const weightsWrap = document.createElement('div');
  weightsWrap.className = 'option-weights-wrap';
  if (baseWeights) {
    const lbl = document.createElement('span');
    lbl.className = 'option-weights-wrap-label';
    lbl.textContent = 'Доп. веса из админки:';
    weightsWrap.appendChild(lbl);
  }
  const weightsRow = document.createElement('div');
  weightsRow.className = 'option-weights-row';
  WEIGHT_KEYS.forEach(({ key, label }) => {
    const cell = document.createElement('div');
    cell.className = 'option-weight-cell';
    const span = document.createElement('span');
    span.textContent = label;
    const numInput = document.createElement('input');
    numInput.type = 'number';
    numInput.className = `opt-w opt-${key}`;
    numInput.value = weights[key] ?? 0;
    numInput.step = '1';
    cell.appendChild(span);
    cell.appendChild(numInput);
    weightsRow.appendChild(cell);
  });
  weightsWrap.appendChild(weightsRow);
  row.appendChild(weightsWrap);

  return row;
}

function getOptionsFromList() {
  const list = document.getElementById('qf-options-list');
  const rows = list.querySelectorAll('.option-row');
  const result = [];
  rows.forEach((row) => {
    const value = row.querySelector('.opt-value').value.trim();
    if (!value) return;
    const weights = {};
    let hasWeight = false;
    WEIGHT_KEYS.forEach(({ key }) => {
      const v = Number(row.querySelector(`.opt-${key}`).value) || 0;
      weights[key] = v;
      if (v !== 0) hasWeight = true;
    });
    result.push({ value, weights: hasWeight ? weights : {} });
  });
  return result;
}

function setupQuestionModal() {
  document.getElementById('add-question-btn').addEventListener('click', () => {
    openQuestionModal(null);
  });

  document.getElementById('save-question-btn').addEventListener('click', saveQuestion);

  // Show/hide options section based on type
  document.getElementById('qf-type').addEventListener('change', () => {
    updateOptionsVisibility();
  });

  // Show/hide conditions based on parent selection
  document.getElementById('qf-parent').addEventListener('change', () => {
    const hasParent = document.getElementById('qf-parent').value !== '';
    document.getElementById('qf-conditions-row').classList.toggle('hidden', !hasParent);
  });

  document.getElementById('qf-add-option').addEventListener('click', () => {
    document.getElementById('qf-options-list').appendChild(makeOptionRow());
  });
}

function updateOptionsVisibility() {
  const type = document.getElementById('qf-type').value;
  const showOptions = ['radio', 'checkbox'].includes(type);
  document.getElementById('qf-options-section').classList.toggle('hidden', !showOptions);
}

function renderHardcodedBanner(questionId) {
  const el = document.getElementById('qf-hardcoded-note');
  if (!el) return;

  if (!questionId) {
    // New question
    el.innerHTML = `
      <div class="hardcoded-banner hardcoded-banner-info">
        <strong>Новый вопрос</strong> — диагноз будет формироваться <strong>только на основе весов из таблицы ниже</strong>.
        Захардкоженной логики для него нет. Убедитесь, что задали нужные веса для каждого варианта ответа.
      </div>`;
    return;
  }

  const hInfo = HARDCODED_LOGIC[questionId];
  if (!hInfo) {
    // Existing question without hardcoded logic (e.g., added via admin)
    el.innerHTML = `
      <div class="hardcoded-banner hardcoded-banner-info">
        Этот вопрос не имеет встроенной логики. Диагноз определяется <strong>только весами ниже</strong>.
      </div>`;
    return;
  }

  const hasPerOption = Boolean(hInfo.options);
  let html = `<div class="hardcoded-banner hardcoded-banner-warn">
    <div class="hardcoded-banner-title">⚙ Встроенная логика</div>`;

  if (hInfo.note) {
    html += `<div class="hardcoded-banner-note">${esc(hInfo.note)}</div>`;
  }

  if (hasPerOption) {
    html += `<div class="hardcoded-banner-note" style="margin-top:4px">
      Базовые баллы для каждого варианта показаны в строке <em>«Базовая логика»</em> ниже — только для справки, не редактируются здесь.
      <strong>Доп. веса</strong> из таблицы суммируются с ними.
    </div>`;
  } else {
    html += `<div class="hardcoded-banner-note" style="margin-top:4px">
      Логика условная и не сводится к простым весам per-option — управлять ею через таблицу невозможно.
      <strong>Доп. веса</strong> из таблицы всё равно суммируются с результатом.
    </div>`;
  }

  html += '</div>';
  el.innerHTML = html;
}

function openQuestionModal(questionId) {
  const isEdit = questionId !== null;
  document.getElementById('question-modal-title').textContent = isEdit ? 'Редактировать вопрос' : 'Новый вопрос';

  const form = document.getElementById('question-form');
  form.reset();
  document.getElementById('qf-id-original').value = '';
  document.getElementById('qf-conditions-row').classList.add('hidden');
  document.getElementById('qf-options-list').innerHTML = '';
  const noteEl = document.getElementById('qf-hardcoded-note');
  if (noteEl) noteEl.innerHTML = '';

  // Populate parent select
  const parentSelect = document.getElementById('qf-parent');
  parentSelect.innerHTML = '<option value="">— нет (главный вопрос) —</option>';
  allQuestions.forEach((q) => {
    if (q.id !== questionId) {
      const opt = document.createElement('option');
      opt.value = q.id;
      opt.textContent = `[${q.id}] ${stripHTML(q.question).slice(0, 50)}`;
      parentSelect.appendChild(opt);
    }
  });

  if (isEdit) {
    const q = allQuestions.find((q) => q.id === questionId);
    if (!q) return;

    document.getElementById('qf-id-original').value = q.id;
    document.getElementById('qf-id').value = q.id;
    document.getElementById('qf-id').disabled = true;
    document.getElementById('qf-question').value = q.question;
    document.getElementById('qf-type').value = q.type;
    document.getElementById('qf-order').value = q.order;
    document.getElementById('qf-active').value = String(q.isActive);

    if (q.parentId) {
      parentSelect.value = q.parentId;
      document.getElementById('qf-conditions-row').classList.remove('hidden');
      document.getElementById('qf-conditions').value = (q.conditions || []).join('\n');
    }

    // Show hardcoded logic banner
    renderHardcodedBanner(q.id);

    const optList = document.getElementById('qf-options-list');
    optList.innerHTML = '';
    if (q.options?.length) {
      const hInfo = HARDCODED_LOGIC[q.id];
      q.options.forEach((o) => {
        const baseWeights = hInfo?.options?.[o.value] || null;
        optList.appendChild(makeOptionRow(o.value, o.weights || {}, baseWeights));
      });
    }
  } else {
    document.getElementById('qf-id').disabled = false;
    // New question — show informational note
    renderHardcodedBanner(null);
  }

  updateOptionsVisibility();
  openModal('question-modal');
}

function editQuestion(id) { openQuestionModal(id); }

async function saveQuestion() {
  const btn = document.getElementById('save-question-btn');
  btn.disabled = true;
  btn.textContent = 'Сохранение...';

  const originalId = document.getElementById('qf-id-original').value;
  const isEdit = Boolean(originalId);

  const id = document.getElementById('qf-id').value.trim();
  const question = document.getElementById('qf-question').value.trim();
  const type = document.getElementById('qf-type').value;
  const order = Number(document.getElementById('qf-order').value) || undefined;
  const isActive = document.getElementById('qf-active').value === 'true';
  const parentId = document.getElementById('qf-parent').value || null;
  const conditionsRaw = document.getElementById('qf-conditions').value.trim();
  const conditions = conditionsRaw ? conditionsRaw.split('\n').map((s) => s.trim()).filter(Boolean) : [];
  const options = getOptionsFromList();

  if (!id || !question) {
    toast('Заполните обязательные поля', 'error');
    btn.disabled = false;
    btn.textContent = 'Сохранить';
    return;
  }

  try {
    if (isEdit) {
      await put(`/questions/${originalId}`, { question, type, order, isActive, parentId, conditions });
      if (['radio', 'checkbox'].includes(type)) {
        await put(`/questions/${originalId}/options`, { options });
      }
      toast('Вопрос обновлён');
    } else {
      await post('/questions', { id, question, type, order, isActive, parentId, conditions, options });
      toast('Вопрос создан');
    }
    closeModal('question-modal');
    loadQuestions();
  } catch (err) {
    toast('Ошибка: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Сохранить';
  }
}

// ═══════════════════════════════════════════════════════════════════
// SUBMISSIONS SECTION
// ═══════════════════════════════════════════════════════════════════

function setupSubmissionFilters() {
  document.getElementById('sub-filter-btn').addEventListener('click', () => {
    submissionsPage = 1;
    submissionsFilters = {
      dateFrom: document.getElementById('sub-date-from').value,
      dateTo: document.getElementById('sub-date-to').value,
      bitrixStatus: document.getElementById('sub-bitrix-filter').value,
      hasFile: document.getElementById('sub-file-filter').value,
    };
    loadSubmissions();
  });
}

async function loadSubmissions() {
  const tbody = document.getElementById('submissions-tbody');
  tbody.innerHTML = '<tr><td colspan="8" class="loading-cell">Загрузка...</td></tr>';

  const params = new URLSearchParams({ page: submissionsPage, limit: 20 });
  if (submissionsFilters.dateFrom) params.set('dateFrom', submissionsFilters.dateFrom);
  if (submissionsFilters.dateTo) params.set('dateTo', submissionsFilters.dateTo);
  if (submissionsFilters.bitrixStatus) params.set('bitrixStatus', submissionsFilters.bitrixStatus);
  if (submissionsFilters.hasFile) params.set('hasFile', submissionsFilters.hasFile);

  try {
    const data = await get(`/submissions?${params}`);
    renderSubmissions(data.submissions);
    renderPagination(data.pagination);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" class="loading-cell" style="color:var(--danger)">Ошибка: ${esc(err.message)}</td></tr>`;
  }
}

function renderSubmissions(submissions) {
  const tbody = document.getElementById('submissions-tbody');

  if (!submissions.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="loading-cell">Заявок нет</td></tr>';
    return;
  }

  tbody.innerHTML = submissions.map((s) => {
    const dt = new Date(s.createdAt);
    const dateStr = dt.toLocaleDateString('ru-RU') + ' ' + dt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    const bitrixClass = { sent: 'badge-sent', error: 'badge-error', pending: 'badge-pending' }[s.bitrixStatus] || 'badge-pending';
    const bitrixLabel = { sent: 'Отправлено', error: 'Ошибка', pending: 'Ожидание' }[s.bitrixStatus] || s.bitrixStatus;
    const diagShort = s.diagnosis ? s.diagnosis.slice(0, 30) + (s.diagnosis.length > 30 ? '…' : '') : '—';

    return `
      <tr>
        <td style="white-space:nowrap;color:var(--gray-500);font-size:12px">${esc(dateStr)}</td>
        <td style="font-weight:500">${esc(s.patientName || '—')}</td>
        <td>${esc(s.patientPhone || '—')}</td>
        <td style="font-size:12px;color:var(--gray-500)">${esc(s.patientCity || '—')}</td>
        <td style="font-size:12px;color:var(--gray-600)">${esc(diagShort)}</td>
        <td style="text-align:center">
          ${s.fileUrl
            ? `<a href="${esc(s.fileUrl)}" target="_blank" title="${esc(s.fileName || 'файл')}" style="color:var(--primary)">📎</a>`
            : '<span style="color:var(--gray-300)">—</span>'}
        </td>
        <td><span class="badge ${bitrixClass}">${esc(bitrixLabel)}</span></td>
        <td>
          <button class="btn btn-ghost btn-sm" onclick="viewSubmission('${esc(s.id)}')">Открыть</button>
        </td>
      </tr>
    `;
  }).join('');
}

function renderPagination({ page, pages }) {
  const el = document.getElementById('submissions-pagination');
  if (pages <= 1) { el.innerHTML = ''; return; }

  let html = '';
  html += `<button class="page-btn" onclick="goPage(${page - 1})" ${page <= 1 ? 'disabled' : ''}>‹</button>`;

  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - page) <= 2) {
      html += `<button class="page-btn ${i === page ? 'active' : ''}" onclick="goPage(${i})">${i}</button>`;
    } else if (Math.abs(i - page) === 3) {
      html += '<span style="padding:0 4px;color:var(--gray-400)">…</span>';
    }
  }

  html += `<button class="page-btn" onclick="goPage(${page + 1})" ${page >= pages ? 'disabled' : ''}>›</button>`;
  el.innerHTML = html;
}

function goPage(p) {
  submissionsPage = p;
  loadSubmissions();
}

async function viewSubmission(id) {
  const detail = document.getElementById('submission-detail');
  detail.innerHTML = '<p class="loading-cell">Загрузка...</p>';
  openModal('submission-modal');

  try {
    const data = await get(`/submissions/${id}`);
    const s = data.submission;
    const dt = new Date(s.createdAt);
    const dateStr = dt.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
      + ' ' + dt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

    const bitrixClass = { sent: 'badge-sent', error: 'badge-error', pending: 'badge-pending' }[s.bitrixStatus] || 'badge-pending';
    const bitrixLabel = { sent: 'Отправлено', error: 'Ошибка', pending: 'Ожидание' }[s.bitrixStatus] || s.bitrixStatus;

    const answers = Array.isArray(s.answers) ? s.answers : [];

    detail.innerHTML = `
      <div class="detail-grid">
        <div class="detail-field"><label>Дата и время</label><p>${esc(dateStr)}</p></div>
        <div class="detail-field"><label>ID заявки</label><p style="font-size:11px;font-family:monospace">${esc(s.id)}</p></div>
        <div class="detail-field"><label>Имя</label><p>${esc(s.patientName || '—')}</p></div>
        <div class="detail-field"><label>Телефон</label><p>${esc(s.patientPhone || '—')}</p></div>
        <div class="detail-field"><label>Город</label><p>${esc(s.patientCity || '—')}</p></div>
        <div class="detail-field"><label>Статус Bitrix</label>
          <p><span class="badge ${bitrixClass}">${esc(bitrixLabel)}</span>
          ${s.bitrixError ? `<br><small style="color:var(--danger)">${esc(s.bitrixError)}</small>` : ''}</p>
        </div>
        ${s.fileUrl ? `
        <div class="detail-field full-width"><label>Прикреплённый файл</label>
          <p><a href="${esc(s.fileUrl)}" target="_blank" style="color:var(--primary)">${esc(s.fileName || s.fileUrl)}</a></p>
        </div>` : ''}
        <div class="detail-field" style="grid-column:1/-1"><label>Диагноз</label><p>${esc(s.diagnosis || '—')}</p></div>
      </div>

      ${answers.length ? `
      <h4 style="margin-bottom:10px;font-size:14px;color:var(--gray-600)">Ответы на вопросы (${answers.length})</h4>
      <div class="answers-list">
        ${answers.map((a) => `
          <div class="answer-item">
            <div class="answer-q">${esc(a.question)}</div>
            <div class="answer-a">${esc(Array.isArray(a.answers) ? a.answers.join(', ') : String(a.answers))}</div>
          </div>
        `).join('')}
      </div>` : ''}
    `;
  } catch (err) {
    detail.innerHTML = `<p style="color:var(--danger)">Ошибка: ${esc(err.message)}</p>`;
  }
}

// ═══════════════════════════════════════════════════════════════════
// STATS SECTION
// ═══════════════════════════════════════════════════════════════════

function setupStatsFilters() {
  document.getElementById('stats-filter-btn').addEventListener('click', loadStats);
}

async function loadStats() {
  const grid = document.getElementById('stats-grid');
  const funnel = document.getElementById('funnel');
  grid.innerHTML = '<div class="stat-card"><p class="loading-cell">Загрузка...</p></div>';
  funnel.innerHTML = '';

  const params = new URLSearchParams();
  const dateFrom = document.getElementById('stats-date-from').value;
  const dateTo = document.getElementById('stats-date-to').value;
  if (dateFrom) params.set('dateFrom', dateFrom);
  if (dateTo) params.set('dateTo', dateTo);

  try {
    const data = await get(`/stats?${params}`);

    grid.innerHTML = `
      <div class="stat-card">
        <div class="stat-label">Всего прохождений</div>
        <div class="stat-value">${data.sessions.total}</div>
        <div class="stat-sub">сессий запущено</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Завершили опрос</div>
        <div class="stat-value">${data.sessions.completed}</div>
        <div class="stat-sub">${data.sessions.completionRate}% конверсия</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Оставили контакты</div>
        <div class="stat-value">${data.submissions.total}</div>
        <div class="stat-sub">заявок получено</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Отправлено в Bitrix</div>
        <div class="stat-value">${data.bitrix.sent}</div>
        <div class="stat-sub">${data.bitrix.sentRate}% от заявок</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Ошибки Bitrix</div>
        <div class="stat-value" style="color:var(--danger)">${data.bitrix.error}</div>
        <div class="stat-sub">не отправлено</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">С прикреплённым файлом</div>
        <div class="stat-value">${data.submissions.withFile}</div>
        <div class="stat-sub">загрузок файлов</div>
      </div>
    `;

    funnel.innerHTML = data.conversions.map((step) => `
      <div class="funnel-step">
        <div class="funnel-label">${esc(step.stage)}</div>
        <div class="funnel-bar-wrap">
          <div class="funnel-bar" style="width:${step.rate}%">${step.rate}%</div>
        </div>
        <div class="funnel-count">${step.count}</div>
      </div>
    `).join('');

  } catch (err) {
    grid.innerHTML = `<div class="stat-card"><p style="color:var(--danger)">Ошибка: ${esc(err.message)}</p></div>`;
  }
}

// ═══════════════════════════════════════════════════════════════════
// SETTINGS SECTION
// ═══════════════════════════════════════════════════════════════════

function setupSettings() {
  document.getElementById('save-settings-btn').addEventListener('click', saveSettings);
  document.getElementById('change-password-btn').addEventListener('click', changePassword);

  // Sync color pickers with hex inputs
  const colorFields = [
    ['primaryColor', 'primaryColorHex'],
    ['backgroundColor', 'backgroundColorHex'],
    ['textColor', 'textColorHex'],
  ];

  colorFields.forEach(([pickerName, hexName]) => {
    const picker = document.querySelector(`input[name="${pickerName}"]`);
    const hex = document.querySelector(`input[name="${hexName}"]`);
    if (!picker || !hex) return;

    picker.addEventListener('input', () => { hex.value = picker.value; });
    hex.addEventListener('input', () => {
      const val = hex.value.trim();
      if (/^#[0-9a-fA-F]{6}$/.test(val)) picker.value = val;
    });
  });
}

async function loadSettings() {
  try {
    const settings = await get('/settings');
    const form = document.getElementById('settings-form');

    Object.entries(settings).forEach(([key, value]) => {
      const input = form.querySelector(`[name="${key}"]`);
      if (input) input.value = value;

      // Sync color picker
      const hexInput = form.querySelector(`[name="${key}Hex"]`);
      if (hexInput) hexInput.value = value;
    });
  } catch (err) {
    toast('Ошибка загрузки настроек: ' + err.message, 'error');
  }
}

async function saveSettings() {
  const btn = document.getElementById('save-settings-btn');
  btn.disabled = true;
  btn.textContent = 'Сохранение...';

  const form = document.getElementById('settings-form');
  const settingsKeys = [
    'primaryColor', 'backgroundColor', 'textColor',
    'borderRadius', 'fontFamily', 'surveyTitle', 'surveyDisclaimer',
    'privacyPolicyUrl', 'bitrixWebhookUrl', 'bitrixLeadTitle', 'emailRecipients',
  ];

  const data = {};
  settingsKeys.forEach((key) => {
    const el = form.querySelector(`[name="${key}"]`);
    if (el) data[key] = el.value;
  });

  try {
    await put('/settings', data);
    toast('Настройки сохранены');
    showSettingsMsg('Настройки успешно сохранены', 'success');
  } catch (err) {
    toast('Ошибка: ' + err.message, 'error');
    showSettingsMsg('Ошибка сохранения: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Сохранить';
  }
}

function showSettingsMsg(text, type) {
  const el = document.getElementById('settings-msg');
  el.textContent = text;
  el.className = type === 'success' ? 'success-msg' : 'error-msg';
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 4000);
}

async function changePassword() {
  const current = document.getElementById('cp-current').value;
  const newPwd = document.getElementById('cp-new').value;
  const confirm = document.getElementById('cp-confirm').value;
  const msgEl = document.getElementById('cp-msg');

  msgEl.className = '';
  msgEl.classList.remove('hidden');

  if (!current || !newPwd || !confirm) {
    msgEl.textContent = 'Заполните все поля';
    msgEl.className = 'error-msg';
    return;
  }

  if (newPwd !== confirm) {
    msgEl.textContent = 'Новые пароли не совпадают';
    msgEl.className = 'error-msg';
    return;
  }

  if (newPwd.length < 6) {
    msgEl.textContent = 'Пароль должен быть не менее 6 символов';
    msgEl.className = 'error-msg';
    return;
  }

  const btn = document.getElementById('change-password-btn');
  btn.disabled = true;

  try {
    await post('/auth/change-password', { currentPassword: current, newPassword: newPwd });
    msgEl.textContent = 'Пароль успешно изменён';
    msgEl.className = 'success-msg';
    document.getElementById('cp-current').value = '';
    document.getElementById('cp-new').value = '';
    document.getElementById('cp-confirm').value = '';
    toast('Пароль изменён');
  } catch (err) {
    const msg = err.message === 'Current password is incorrect'
      ? 'Текущий пароль неверен'
      : 'Ошибка: ' + err.message;
    msgEl.textContent = msg;
    msgEl.className = 'error-msg';
  } finally {
    btn.disabled = false;
  }
}

// ── Helpers ──────────────────────────────────────────────────────
function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function stripHTML(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}
