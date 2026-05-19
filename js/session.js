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

const PROGRESS_ORDER = [
  'start', 't1_page', 't1_survey', 'filler',
  't2_page', 't2_survey', 't3_page', 't3_survey',
  'final', 'complete'
];

function checkProgress(currentPage) {
  const progress = getProgress();
  const expectedIdx = PROGRESS_ORDER.indexOf(currentPage);
  const currentIdx = PROGRESS_ORDER.indexOf(progress);

  // 如果使用者跳關（試圖進入未到達的頁面）→ 重定向回應該的頁面
  if (currentIdx >= 0 && expectedIdx > currentIdx + 1) {
    const correctPage = PROGRESS_PAGES[progress] || 'index.html';
    window.location.href = correctPage;
    return false;
  }

  return true;
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
  checkProgress
};
