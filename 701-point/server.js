const SUPABASE_URL = 'https://gmpirvdigtimpjpdvkqv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtcGlydmRpZ3RpbXBqcGR2a3F2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM5NjUxMTEsImV4cCI6MjEwOTU0MTExMX0.364vhbvh4P8RsrdJho1QnVhlrN4421b5-cKjsjjfsA0';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const PENDING_KEY = 'member_pending_sync';
const LOG_PENDING_KEY = 'point_log_pending';

function markPending() { localStorage.setItem(PENDING_KEY, '1'); }
function clearPending() { localStorage.removeItem(PENDING_KEY); }
function hasPending() { return localStorage.getItem(PENDING_KEY) === '1'; }

// 打开网页时：从云端拉取写入本地
async function loadMemberFromRemote() {
  const { data, error } = await supabaseClient.from('member').select('*');
  if (error) {
    console.error('loadMemberFromRemote error:', error);
    return false;
  }
  localStorage.setItem('member', JSON.stringify(data || []));
  return true;
}

// 读本地，同步返回
function getMember() {
  const raw = localStorage.getItem('member');
  if (!raw) return [];
  try { return JSON.parse(raw); } catch (e) { return []; }
}

function getLog() {
  const raw = localStorage.getItem('point_log');
  if (!raw) return [];
  try { return JSON.parse(raw); } catch (e) { return []; }
}

function getLogPending() {
  const raw = localStorage.getItem(LOG_PENDING_KEY);
  if (!raw) return [];
  try { return JSON.parse(raw); } catch (e) { return []; }
}

function clearLogPending() {
  localStorage.removeItem(LOG_PENDING_KEY);
}

function addLogLocal(log) {
  const entry = { ...log, created_at: new Date().toISOString() };

  const logs = getLog();
  logs.unshift(entry);
  if (logs.length > 10) logs.length = 10;
  localStorage.setItem('point_log', JSON.stringify(logs));

  const pending = getLogPending();
  pending.push(entry);
  localStorage.setItem(LOG_PENDING_KEY, JSON.stringify(pending));
}

async function loadLogFromRemote() {
  const { data, error } = await supabaseClient
    .from('point_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
  if (error) {
    console.error('loadLogFromRemote error:', error);
    return false;
  }
  localStorage.setItem('point_log', JSON.stringify(data || []));
  return true;
}

async function loadReasonsFromRemote() {
  const { data, error } = await supabaseClient
    .from('reason')
    .select('label')
    .order('label');
  if (error) {
    console.error('loadReasonsFromRemote error:', error);
    return false;
  }
  localStorage.setItem('reasons', JSON.stringify((data || []).map(r => r.label)));
  return true;
}

function getReasons() {
  const raw = localStorage.getItem('reasons');
  if (!raw) return [];
  try { return JSON.parse(raw); } catch (e) { return []; }
}

async function addReasonToRemote(label) {
  const { error } = await supabaseClient.from('reason').insert({ label });
  if (error) throw error;
}

async function flushLogToRemote() {
  const pending = getLogPending();
  if (pending.length === 0) return true;

  const { error } = await supabaseClient.from('point_log').insert(pending);
  if (error) throw error;
  clearLogPending();
  return true;
}

// 只写本地，标记待同步，不推云端
function saveItem(id, date) {
  if (id !== 'member') {
    console.warn('saveItem 目前只支持 "member" 表，收到:', id);
    return false;
  }
  localStorage.setItem('member', date);
  markPending();
  return true;
}

function getItem(id) { return localStorage.getItem(id); }

function clearItem() {
  localStorage.removeItem('member');
  localStorage.removeItem('point_log');
  localStorage.removeItem(LOG_PENDING_KEY);
  markPending();
  return true;
}

// 用 supabase-js 正常同步（页面还活着时用）
async function flushToRemote() {
  if (!hasPending() && getLogPending().length === 0) return true;
  const date = localStorage.getItem('member');
  const memberList = date ? JSON.parse(date) : [];

  // 空数组 = 用户清空了数据，走 delete
  if (memberList.length === 0) {
    const { error } = await supabaseClient.from('member').delete().neq('id', 0);
    if (error) throw error;
  } else {
    const { error } = await supabaseClient
      .from('member')
      .upsert(memberList, { onConflict: 'id' });
    if (error) throw error;
  }
  clearPending();
  return await flushLogToRemote();
}

// 页面卸载时用 fetch keepalive 走 REST，不依赖 supabase-js
function flushKeepalive() {
  const memberPending = hasPending();
  const logPending = getLogPending();

  if (!memberPending && logPending.length === 0) return;

  if (memberPending) {
    const date = localStorage.getItem('member');
    const memberList = date ? JSON.parse(date) : [];

    if (memberList.length === 0) {
      fetch(`${SUPABASE_URL}/rest/v1/member?id=neq.0`, {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        keepalive: true,
      }).catch(e => console.error('keepalive delete failed:', e));
    } else {
      fetch(`${SUPABASE_URL}/rest/v1/member?on_conflict=id`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates',
        },
        body: JSON.stringify(memberList),
        keepalive: true,
      }).catch(e => console.error('keepalive upsert failed:', e));
    }
  }

  if (logPending.length > 0) {
    fetch(`${SUPABASE_URL}/rest/v1/point_log`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(logPending),
      keepalive: true,
    }).catch(e => console.error('keepalive log insert failed:', e));
  }
}
