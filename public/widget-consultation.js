// Render consultation form and file upload section
export function renderConsultationForm({ sessionId, diagnosis, answers, extendedDiagnosis, privacyPolicyUrl }) {
  const section = document.createElement('div');
  section.className = 'consultation-section';
  section.id = 'consultationSection';

  section.innerHTML = `
    <h2>Запишитесь на консультацию с врачом</h2>
    <form id="consultationForm" novalidate>
      <div class="form-field">
        <label for="nameInput">Ваше имя</label>
        <input type="text" id="nameInput" name="name" autocomplete="given-name" />
      </div>
      <div class="form-field">
        <label for="telInput">Телефон <span style="color:var(--w-error)">*</span></label>
        <input type="tel" id="telInput" name="tel" autocomplete="tel" required />
      </div>
      <div class="form-field">
        <label for="cityInput">Город</label>
        <input type="text" id="cityInput" name="city" autocomplete="address-level2" />
      </div>
      <label class="privacy-label">
        <input type="checkbox" id="termsCheck" name="terms" checked />
        Согласен с условиями
        <a href="${privacyPolicyUrl || '#'}" target="_blank" rel="noopener">политики конфиденциальности</a>
      </label>
      <button type="submit" class="btn-submit">Записаться</button>
      <div id="consultError" class="form-error" style="display:none">Произошла ошибка. Попробуйте ещё раз.</div>
    </form>
  `;

  const main = document.querySelector('main');
  main.appendChild(section);

  const form = document.getElementById('consultationForm');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    handleConsultSubmit({ sessionId, diagnosis, answers, extendedDiagnosis });
  });
}

async function handleConsultSubmit({ sessionId, diagnosis, answers, extendedDiagnosis }) {
  const form = document.getElementById('consultationForm');
  const btn = form.querySelector('button[type="submit"]');
  const errEl = document.getElementById('consultError');

  const patientName = document.getElementById('nameInput').value.trim();
  const patientPhone = document.getElementById('telInput').value.trim();
  const patientCity = document.getElementById('cityInput').value.trim();

  if (!patientPhone) {
    errEl.textContent = 'Пожалуйста, укажите телефон';
    errEl.style.display = 'block';
    return;
  }

  btn.disabled = true;
  errEl.style.display = 'none';

  try {
    const res = await fetch('/api/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        patientName,
        patientPhone,
        patientCity,
        diagnosis,
        extendedDiagnosis,
        answers,
      }),
    });

    if (!res.ok) throw new Error('Server error');
    const data = await res.json();

    // Replace form with success + file upload
    const section = document.getElementById('consultationSection');
    section.innerHTML = `
      <div class="success-message">
        <h2>Заявка отправлена!</h2>
        <p>Мы вам перезвоним в течение рабочего дня</p>
      </div>
    `;
    section.id = '';

    // Show file upload block
    renderFileUpload(data.id);

  } catch {
    btn.disabled = false;
    errEl.textContent = 'Произошла ошибка. Попробуйте ещё раз.';
    errEl.style.display = 'block';
  }
}

function renderFileUpload(submissionId) {
  const section = document.createElement('div');
  section.className = 'file-upload-section';
  section.innerHTML = `
    <h3>Прикрепите снимок или документ (необязательно)</h3>
    <p>Форматы: PDF, JPG, PNG — до 10 МБ</p>
    <div class="file-input-wrap">
      <input type="file" id="fileInput" accept=".pdf,.jpg,.jpeg,.png" />
      <button class="btn-upload" id="uploadBtn">Загрузить файл</button>
      <div id="uploadStatus" class="upload-status"></div>
    </div>
  `;

  const main = document.querySelector('main');
  main.appendChild(section);

  document.getElementById('uploadBtn').addEventListener('click', () => {
    handleFileUpload(submissionId);
  });
}

async function handleFileUpload(submissionId) {
  const fileInput = document.getElementById('fileInput');
  const uploadBtn = document.getElementById('uploadBtn');
  const statusEl = document.getElementById('uploadStatus');

  const file = fileInput.files[0];
  if (!file) {
    statusEl.textContent = 'Выберите файл';
    statusEl.className = 'upload-status error';
    return;
  }

  const formData = new FormData();
  formData.append('file', file);

  uploadBtn.disabled = true;
  statusEl.textContent = 'Загружаю...';
  statusEl.className = 'upload-status';

  try {
    const res = await fetch(`/api/submissions/${submissionId}/file`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Upload failed');
    }

    statusEl.textContent = 'Файл успешно загружен';
    statusEl.className = 'upload-status success';
    uploadBtn.style.display = 'none';
    fileInput.disabled = true;

  } catch (err) {
    uploadBtn.disabled = false;
    statusEl.textContent = err.message || 'Ошибка загрузки файла';
    statusEl.className = 'upload-status error';
  }
}
