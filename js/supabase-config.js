/* ============================================================
   Supabase 連線配置（強化版，含防呆等待）
   ============================================================ */

const SUPABASE_URL = 'https://qcjlygebapjudvzgkdlq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_FIZN90eWphusFptX5AT7xA__rdsfaH3';

// 全域變數
window.LEOFOO_SCENARIO = 'leofoo_v22';
window.LEOFOO_SUPABASE_READY = false;

// 等待 Supabase SDK 載入完成後才建立 client
function initSupabase() {
  if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
    console.warn('[Leofoo] Supabase SDK 尚未載入，500ms 後重試');
    setTimeout(initSupabase, 500);
    return;
  }

  try {
    window.LEOFOO_SUPABASE = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    window.LEOFOO_SUPABASE_READY = true;
    console.log('[Leofoo] Supabase 已連線', SUPABASE_URL);

    // 通知所有等待中的元件
    window.dispatchEvent(new CustomEvent('supabase-ready'));
  } catch (err) {
    console.error('[Leofoo] Supabase 初始化失敗', err);
  }
}

// 立刻嘗試初始化
initSupabase();

// 提供等待函式給其他 JS
window.waitForSupabase = function() {
  return new Promise((resolve) => {
    if (window.LEOFOO_SUPABASE_READY) {
      resolve(window.LEOFOO_SUPABASE);
    } else {
      window.addEventListener('supabase-ready', () => {
        resolve(window.LEOFOO_SUPABASE);
      }, { once: true });
    }
  });
};
