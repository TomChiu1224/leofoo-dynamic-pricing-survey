/* ============================================================
   Supabase 連線配置
   ============================================================ */

const SUPABASE_URL = 'https://qcjlygebapjudvzgkdlq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_FIZN90eWphusFptX5AT7xA__rdsfaH3';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 提供給其他 JS 檔使用
window.LEOFOO_SUPABASE = supabase;
window.LEOFOO_SCENARIO = 'leofoo_v22';
