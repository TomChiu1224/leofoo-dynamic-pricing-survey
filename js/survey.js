/* ============================================================
   問卷渲染與提交模組
   ============================================================ */

// Fisher-Yates 洗牌
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Likert 7 點量表標籤
const LIKERT_LABELS = ['非常不同意', '不同意', '有點不同意', '普通', '有點同意', '同意', '非常同意'];

// 渲染 Likert 7 點題目
function renderLikertQuestion(qid, questionText, displayNumber) {
  return `
    <div class="question-item" data-qid="${qid}">
      <div class="question-text">
        <span class="question-number">${displayNumber}</span>${questionText}
      </div>
      <div class="likert-scale">
        ${[1, 2, 3, 4, 5, 6, 7].map(n => `
          <div class="likert-option">
            <input type="radio" name="${qid}" id="${qid}_${n}" value="${n}">
            <label for="${qid}_${n}">
              <span class="likert-number">${n}</span>
              <span>${LIKERT_LABELS[n - 1]}</span>
            </label>
          </div>
        `).join('')}
      </div>
      <div class="likert-labels">
        <span>← 非常不同意</span>
        <span>非常同意 →</span>
      </div>
    </div>
  `;
}

// 渲染單選題（自定義選項）
function renderSingleChoice(qid, questionText, displayNumber, options) {
  return `
    <div class="question-item" data-qid="${qid}">
      <div class="question-text">
        <span class="question-number">${displayNumber}</span>${questionText}
      </div>
      <div class="choice-list">
        ${options.map((opt, idx) => `
          <div class="choice-option">
            <input type="radio" name="${qid}" id="${qid}_${idx + 1}" value="${idx + 1}" data-text="${opt}">
            <label for="${qid}_${idx + 1}">${opt}</label>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// 渲染複選題
function renderMultipleChoice(qid, questionText, displayNumber, options, requiredCount) {
  return `
    <div class="question-item" data-qid="${qid}">
      <div class="question-text">
        <span class="question-number">${displayNumber}</span>${questionText}
        ${requiredCount ? `<span style="color: var(--accent); font-size: 12px; margin-left: 8px;">（請選 ${requiredCount} 項）</span>` : ''}
      </div>
      <div class="choice-list">
        ${options.map((opt, idx) => `
          <div class="choice-option choice-checkbox">
            <input type="checkbox" name="${qid}" id="${qid}_${idx + 1}" value="${opt.value}" data-text="${opt.label}">
            <label for="${qid}_${idx + 1}">${opt.label}</label>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// 渲染是非題
function renderYesNo(qid, questionText, displayNumber) {
  return `
    <div class="question-item" data-qid="${qid}">
      <div class="question-text">
        <span class="question-number">${displayNumber}</span>${questionText}
      </div>
      <div class="choice-list">
        <div class="choice-option">
          <input type="radio" name="${qid}" id="${qid}_yes" value="1" data-text="是">
          <label for="${qid}_yes">是</label>
        </div>
        <div class="choice-option">
          <input type="radio" name="${qid}" id="${qid}_no" value="0" data-text="否">
          <label for="${qid}_no">否</label>
        </div>
      </div>
    </div>
  `;
}

// 渲染文字輸入題
function renderTextInput(qid, questionText, displayNumber, placeholder = '', required = false) {
  return `
    <div class="question-item" data-qid="${qid}">
      <div class="question-text">
        <span class="question-number">${displayNumber}</span>${questionText}
        ${!required ? '<span style="color: var(--text-muted); font-size: 12px; margin-left: 8px;">（選填）</span>' : ''}
      </div>
      <input type="text" class="text-input" name="${qid}" placeholder="${placeholder}" ${required ? 'required' : ''}>
    </div>
  `;
}

// 監聽答題狀態（已答的會變綠）
function setupAnswerWatcher() {
  document.querySelectorAll('.question-item').forEach(item => {
    const qid = item.dataset.qid;
    const inputs = item.querySelectorAll('input');

    inputs.forEach(input => {
      input.addEventListener('change', () => {
        const isAnswered = checkQuestionAnswered(item);
        item.classList.toggle('answered', isAnswered);
        item.classList.remove('error');
        updateProgress();
      });
    });

    // 文字輸入監聽
    const textInput = item.querySelector('input[type="text"]');
    if (textInput) {
      textInput.addEventListener('input', () => {
        const isAnswered = textInput.value.trim().length > 0;
        item.classList.toggle('answered', isAnswered);
        item.classList.remove('error');
        updateProgress();
      });
    }
  });
}

// ============================================================
// 守門機制：進度顯示 + 按鈕自動 enable/disable
// ============================================================

function setupGatekeeping(submitBtnId, options = {}) {
  const {
    skipOptional = ['dem_email'],
    customLabel = '提交',
    multiSelectRules = {}  // { qid: requiredCount }
  } = options;

  // 在問卷上方插入進度指示器
  insertProgressIndicator();

  // 初始禁用按鈕
  const btn = document.getElementById(submitBtnId);
  if (btn) {
    btn.disabled = true;
    btn.dataset.originalText = customLabel + ' →';
    updateButtonState(btn);
  }

  // 將設定存到全域供 updateProgress 使用
  window._gatekeepingConfig = {
    submitBtnId,
    skipOptional,
    customLabel,
    multiSelectRules
  };

  // 首次計算進度
  updateProgress();
}

function insertProgressIndicator() {
  // 如果已存在則不重複插入
  if (document.querySelector('.progress-indicator')) return;

  const list = document.getElementById('question-list');
  if (!list) return;

  const indicator = document.createElement('div');
  indicator.className = 'progress-indicator';
  indicator.id = 'progress-indicator';
  indicator.innerHTML = `
    <span class="progress-indicator-text" id="progress-text">0 / 0 題</span>
    <div class="progress-indicator-bar">
      <div class="progress-indicator-fill" id="progress-fill"></div>
    </div>
  `;

  list.parentNode.insertBefore(indicator, list);
}

function updateProgress() {
  const config = window._gatekeepingConfig;
  if (!config) return;

  const items = document.querySelectorAll('.question-item');
  let total = 0;
  let answered = 0;

  items.forEach(item => {
    const qid = item.dataset.qid;
    if (config.skipOptional.includes(qid)) return;

    total++;

    // 檢查是否符合複選數量要求
    if (config.multiSelectRules[qid]) {
      const checked = item.querySelectorAll('input[type="checkbox"]:checked');
      if (checked.length === config.multiSelectRules[qid]) {
        answered++;
      }
    } else if (checkQuestionAnswered(item)) {
      answered++;
    }
  });

  // 更新進度顯示
  const textEl = document.getElementById('progress-text');
  const fillEl = document.getElementById('progress-fill');
  const indicator = document.getElementById('progress-indicator');

  if (textEl) {
    if (answered === total) {
      textEl.textContent = `✓ 全部完成（${total}/${total}）`;
    } else {
      textEl.textContent = `${answered} / ${total} 題`;
    }
  }

  if (fillEl) {
    const percent = total > 0 ? (answered / total) * 100 : 0;
    fillEl.style.width = percent + '%';
  }

  if (indicator) {
    indicator.classList.toggle('complete', answered === total && total > 0);
  }

  // 更新按鈕狀態
  const btn = document.getElementById(config.submitBtnId);
  if (btn) {
    if (answered === total && total > 0) {
      btn.disabled = false;
      btn.textContent = config.customLabel + ' →';
    } else {
      btn.disabled = true;
      const remaining = total - answered;
      btn.innerHTML = `還有 <strong>${remaining}</strong> 題未完成`;
    }
  }
}

function updateButtonState(btn) {
  if (btn.disabled) {
    btn.innerHTML = `請完成所有題目`;
  }
}

function checkQuestionAnswered(item) {
  const radios = item.querySelectorAll('input[type="radio"]');
  if (radios.length > 0) {
    return Array.from(radios).some(r => r.checked);
  }

  const checkboxes = item.querySelectorAll('input[type="checkbox"]');
  if (checkboxes.length > 0) {
    return Array.from(checkboxes).some(c => c.checked);
  }

  const text = item.querySelector('input[type="text"]');
  if (text) {
    return text.value.trim().length > 0;
  }

  return false;
}

// 驗證所有題目都有答（除選填題外）
function validateAllAnswered(skipOptional = ['dem_email']) {
  const items = document.querySelectorAll('.question-item');
  let allValid = true;
  let firstError = null;

  items.forEach(item => {
    const qid = item.dataset.qid;
    if (skipOptional.includes(qid)) return;

    const isAnswered = checkQuestionAnswered(item);
    if (!isAnswered) {
      item.classList.add('error');
      allValid = false;
      if (!firstError) firstError = item;
    } else {
      item.classList.remove('error');
    }
  });

  if (!allValid && firstError) {
    firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  return allValid;
}

// 驗證複選題的選項數量
function validateMultiCount(qid, requiredCount) {
  const item = document.querySelector(`.question-item[data-qid="${qid}"]`);
  if (!item) return true;

  const checked = item.querySelectorAll('input[type="checkbox"]:checked');
  if (checked.length !== requiredCount) {
    item.classList.add('error');
    item.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return false;
  }

  item.classList.remove('error');
  return true;
}

// 收集表單資料
function collectAnswers(questionOrder) {
  const sessionId = window.leofooSession.getCurrentSessionId();
  const answers = [];
  const items = document.querySelectorAll('.question-item');

  items.forEach(item => {
    const qid = item.dataset.qid;
    const itemOrder = questionOrder ? questionOrder.indexOf(qid) + 1 : null;

    // 處理 radio
    const checkedRadio = item.querySelector('input[type="radio"]:checked');
    if (checkedRadio) {
      answers.push({
        session_id: sessionId,
        qid: qid,
        answer_numeric: parseInt(checkedRadio.value),
        answer_text: checkedRadio.dataset.text || null,
        item_order: itemOrder,
        ts: new Date().toISOString()
      });
      return;
    }

    // 處理 checkbox（多選）
    const checkedBoxes = item.querySelectorAll('input[type="checkbox"]:checked');
    if (checkedBoxes.length > 0) {
      const values = Array.from(checkedBoxes).map(c => c.value);
      const texts = Array.from(checkedBoxes).map(c => c.dataset.text);
      answers.push({
        session_id: sessionId,
        qid: qid,
        answer_numeric: checkedBoxes.length,
        answer_text: JSON.stringify({ values: values, labels: texts }),
        item_order: itemOrder,
        ts: new Date().toISOString()
      });
      return;
    }

    // 處理文字
    const textInput = item.querySelector('input[type="text"]');
    if (textInput && textInput.value.trim()) {
      answers.push({
        session_id: sessionId,
        qid: qid,
        answer_numeric: null,
        answer_text: textInput.value.trim(),
        item_order: itemOrder,
        ts: new Date().toISOString()
      });
    }
  });

  return answers;
}

// 提交答案到 Supabase（含 step 標記）
// 2026/10/29 新增：每個作答階段只能在對應的進度送出（第二層防護）
// 就算頁面從返回鍵快取還原、或同一人開了兩個分頁，也不會用舊頁面蓋掉已送出的答案。
const STEP_REQUIRED_PROGRESS = {
  T1: 't1_page',
  filler: 'filler',
  T2: 't2_page',
  T3: 't3_page',
  final: 'final'
};

async function submitAnswers(answers, step) {
  const requiredProgress = STEP_REQUIRED_PROGRESS[step];
  if (requiredProgress && window.leofooSession) {
    const progress = window.leofooSession.getProgress();
    if (progress !== requiredProgress) {
      console.warn('[Leofoo] 進度為「' + progress + '」，不接受「' + step + '」的答案，已帶回目前頁面');
      window.leofooSession.redirectToProgressPage(progress);
      // 不寫入、也不回傳結果：讓頁面停在「處理中」直到跳轉完成，後續的寫入都不會執行
      return new Promise(() => {});
    }
  }

  // 等待 Supabase 連線就緒
  if (!window.LEOFOO_SUPABASE_READY) {
    await window.waitForSupabase();
  }

  const enriched = answers.map(a => ({ ...a, step: step }));

  // 過濾掉沒答的（select 改 upsert 避免重複）
  const { error } = await window.LEOFOO_SUPABASE
    .from('surveys')
    .upsert(enriched, { onConflict: 'session_id,qid' });

  if (error) {
    console.error('提交問卷失敗:', error);
    return false;
  }

  return true;
}

// 顯示載入畫面
function showLoading(message = '處理中...') {
  let overlay = document.getElementById('loading-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'loading-overlay';
    overlay.className = 'loading-overlay';
    overlay.innerHTML = `
      <div class="spinner"></div>
      <p id="loading-message">${message}</p>
    `;
    document.body.appendChild(overlay);
  } else {
    document.getElementById('loading-message').textContent = message;
    overlay.style.display = 'flex';
  }
}

function hideLoading() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) overlay.style.display = 'none';
}

// 暴露
window.leofooSurvey = {
  shuffle,
  renderLikertQuestion,
  renderSingleChoice,
  renderMultipleChoice,
  renderYesNo,
  renderTextInput,
  setupAnswerWatcher,
  setupGatekeeping,
  updateProgress,
  validateAllAnswered,
  validateMultiCount,
  collectAnswers,
  submitAnswers,
  showLoading,
  hideLoading
};
