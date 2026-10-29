/* ============================================================
   Session 管理
   ============================================================ */

const SESSION_KEY = 'leofoo_session_id';
const GROUP_KEY = 'leofoo_assigned_group';
const PROGRESS_KEY = 'leofoo_progress';

// 產生 UUID v4
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// 取得當前 session_id（如無則建立新的）
async function getOrCreateSession() {
  // 等待 Supabase 連線就緒
  if (!window.LEOFOO_SUPABASE_READY) {
    await window.waitForSupabase();
  }

  let sessionId = sessionStorage.getItem(SESSION_KEY);

  if (sessionId) {
    return sessionId;
  }

  // 建立新的 session
  sessionId = generateUUID();
  sessionStorage.setItem(SESSION_KEY, sessionId);

  // 偵測裝置
  const ua = navigator.userAgent;
  let device = 'desktop';
  if (/Mobile|Android|iPhone|iPad/.test(ua)) {
    device = /iPad/.test(ua) ? 'tablet' : 'mobile';
  }

  // 寫入 sessions 表
  const { error } = await window.LEOFOO_SUPABASE.from('sessions').insert({
    session_id: sessionId,
    user_agent: ua,
    device: device,
    locale: navigator.language || 'zh-TW',
    scenario: window.LEOFOO_SCENARIO,
    completed: false
  });

  if (error) {
    console.error('建立 session 失敗:', error);
  }

  return sessionId;
}

// 取得當前 session_id（不建立新的）
function getCurrentSessionId() {
  return sessionStorage.getItem(SESSION_KEY);
}

// 取得當前分組
function getCurrentGroup() {
  return sessionStorage.getItem(GROUP_KEY);
}

// 設定分組（隨機分配 A/B/C/D/E）
async function assignRandomGroup() {
  let group = sessionStorage.getItem(GROUP_KEY);
  if (group) return group;

  const groups = ['A', 'B', 'C', 'D', 'E'];
  group = groups[Math.floor(Math.random() * 5)];
  sessionStorage.setItem(GROUP_KEY, group);

  // 更新 sessions 表
  const sessionId = getCurrentSessionId();
  if (sessionId) {
    await window.LEOFOO_SUPABASE
      .from('sessions')
      .update({ assigned_group: group })
      .eq('session_id', sessionId);

    // 記錄分組事件
    await trackEvent('T1', 'group_assigned', { group: group });
  }

  return group;
}

// 標記 session 完成
async function markSessionCompleted() {
  const sessionId = getCurrentSessionId();
  if (!sessionId) return;

  await window.LEOFOO_SUPABASE
    .from('sessions')
    .update({
      completed: true,
      completed_at: new Date().toISOString()
    })
    .eq('session_id', sessionId);
}

// 進度管理（防止跳關）
function saveProgress(step) {
  sessionStorage.setItem(PROGRESS_KEY, step);
}

function getProgress() {
  return sessionStorage.getItem(PROGRESS_KEY) || 'start';
}

// 進度檢查與重定向
const PROGRESS_PAGES = {
  'start': 'index.html',
  't1_page': 't1.html',
  't1_survey': 't1-survey.html',
  'filler': 'filler.html',
  't2_page': 't2.html',
  't2_survey': 't2-survey.html',
  't3_page': 't3.html',
  't3_survey': 't3-survey.html',
  'final': 'final.html',
  'complete': 'complete.html'
};

// 頁面順序（僅供參考；2026/10/29 起進度檢查改為「目前進度＝這一頁」才放行）
const PROGRESS_ORDER = [
  'start', 't1_page', 't1_survey', 'filler',
  't2_page', 't2_survey', 't3_page', 't3_survey',
  'final', 'complete'
];

// ------------------------------------------------------------
// 2026/10/29 修正（版本 session_20261029）：防止「往回走」改寫答案
// 舊版只擋「往前跳關」，受試者在 T2 看到漲價後按返回鍵回到 T1，
// 可以重新作答並用 upsert 蓋掉原本的 T1 答案。
// 新規則：每一頁只有在「目前進度＝這一頁」時才能作答；
// 不論往前跳或往回走，一律帶回目前該填的那一頁。
// ------------------------------------------------------------

// 目前這一頁的進度代碼（給「返回鍵快取還原」時重新檢查用）
let currentPageKey = null;

// 帶回目前進度該在的頁面（用 replace，不在瀏覽紀錄多留一頁）
function redirectToProgressPage(progress) {
  const target = PROGRESS_PAGES[progress] || 'index.html';
  document.documentElement.style.visibility = 'hidden';
  window.location.replace(target);
  return target;
}

function checkProgress(currentPage) {
  currentPageKey = currentPage;
  const progress = getProgress();

  if (progress === currentPage) {
    return true;
  }

  // 進度不符（往回走、往前跳、或還沒從首頁開始）→ 帶回正確頁面，
  // 並中止這一頁後面的程式，避免記錄瀏覽、出題或綁定送出按鈕。
  const target = redirectToProgressPage(progress);
  throw new Error('[Leofoo] 進度為「' + progress + '」，已帶回 ' + target);
}

// 手機瀏覽器按返回鍵時，可能直接從快取還原舊頁面、不重新執行程式，
// 所以在頁面被還原時再檢查一次進度。
window.addEventListener('pageshow', (event) => {
  if (!event.persisted || !currentPageKey) return;
  const progress = getProgress();
  if (progress !== currentPageKey) {
    redirectToProgressPage(progress);
  }
});

// 首頁「立即購票」用：已經開始填的人，直接帶回目前進度，不把進度倒回 T1
function resumeIfStarted() {
  const progress = getProgress();
  if (getCurrentSessionId() && progress !== 'start' && PROGRESS_PAGES[progress]) {
    redirectToProgressPage(progress);
    return true;
  }
  return false;
}

// 暴露給全域
window.leofooSession = {
  getOrCreateSession,
  getCurrentSessionId,
  getCurrentGroup,
  assignRandomGroup,
  markSessionCompleted,
  saveProgress,
  getProgress,
  checkProgress,
  redirectToProgressPage,
  resumeIfStarted
};
