/* ============================================================
   事件追蹤模組
   ============================================================ */

let pageLoadTime = Date.now();

// 記錄頁面瀏覽事件
async function trackPageView(step, props = {}) {
  pageLoadTime = Date.now();
  const sessionId = window.leofooSession.getCurrentSessionId();
  if (!sessionId) return;

  await window.LEOFOO_SUPABASE.from('events').insert({
    session_id: sessionId,
    step: step,
    name: 'page_view',
    ts: new Date().toISOString(),
    props: props
  });
}

// 記錄一般事件
async function trackEvent(step, name, props = {}) {
  const sessionId = window.leofooSession.getCurrentSessionId();
  if (!sessionId) return;

  const dwellTime = Math.floor((Date.now() - pageLoadTime) / 1000);

  await window.LEOFOO_SUPABASE.from('events').insert({
    session_id: sessionId,
    step: step,
    name: name,
    ts: new Date().toISOString(),
    dwell_time: dwellTime,
    price_shown: props.price_shown || null,
    inventory_shown: props.inventory_shown || null,
    props: props
  });
}

// 記錄離開頁面（用於計算停留時間）
function trackDwellTime(step) {
  window.addEventListener('beforeunload', () => {
    const dwellTime = Math.floor((Date.now() - pageLoadTime) / 1000);
    const sessionId = window.leofooSession.getCurrentSessionId();
    if (!sessionId) return;

    // 使用 sendBeacon 確保即使頁面關閉也能送出
    const data = JSON.stringify({
      session_id: sessionId,
      step: step,
      name: 'page_leave',
      ts: new Date().toISOString(),
      dwell_time: dwellTime
    });

    // 注意：sendBeacon 直接呼叫 Supabase REST API 較複雜，這裡用 fetch keepalive
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
