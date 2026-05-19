/* ============================================================
   事件追蹤模組（含 Supabase 等待機制）
   ============================================================ */

let pageLoadTime = Date.now();

// 記錄頁面瀏覽事件
async function trackPageView(step, props = {}) {
  pageLoadTime = Date.now();

  // 等待 Supabase 連線就緒
  if (!window.LEOFOO_SUPABASE_READY) {
    await window.waitForSupabase();
  }

  const sessionId = window.leofooSession ? window.leofooSession.getCurrentSessionId() : null;
  if (!sessionId) return;

  const { error } = await window.LEOFOO_SUPABASE.from('events').insert({
    session_id: sessionId,
    step: step,
    name: 'page_view',
    ts: new Date().toISOString(),
    props: props
  });

  if (error) console.warn('[Leofoo] trackPageView 寫入失敗', error);
}

// 記錄一般事件
async function trackEvent(step, name, props = {}) {
  if (!window.LEOFOO_SUPABASE_READY) {
    await window.waitForSupabase();
  }

  const sessionId = window.leofooSession ? window.leofooSession.getCurrentSessionId() : null;
  if (!sessionId) return;

  const dwellTime = Math.floor((Date.now() - pageLoadTime) / 1000);

  const { error } = await window.LEOFOO_SUPABASE.from('events').insert({
    session_id: sessionId,
    step: step,
    name: name,
    ts: new Date().toISOString(),
    dwell_time: dwellTime,
    price_shown: props.price_shown || null,
    inventory_shown: props.inventory_shown || null,
    props: props
  });

  if (error) console.warn('[Leofoo] trackEvent 寫入失敗', error);
}

// 記錄離開頁面（用於計算停留時間）
function trackDwellTime(step) {
  window.addEventListener('beforeunload', () => {
    const dwellTime = Math.floor((Date.now() - pageLoadTime) / 1000);
    const sessionId = window.leofooSession ? window.leofooSession.getCurrentSessionId() : null;
    if (!sessionId) return;

    const data = JSON.stringify({
      session_id: sessionId,
      step: step,
      name: 'page_leave',
      ts: new Date().toISOString(),
      dwell_time: dwellTime
    });

    fetch(`${SUPABASE_URL}/rest/v1/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: data,
      keepalive: true
    }).catch(err => console.warn('beacon failed', err));
  });
}

window.leofooTrack = {
  trackPageView,
  trackEvent,
  trackDwellTime
};
