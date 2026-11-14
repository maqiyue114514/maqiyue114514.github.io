async function sha256(text) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}

function isLoggedIn() {
    return sessionStorage.getItem("auth_ok") === "1";
}

function showLoading() {
    const el = document.getElementById("loading-overlay");
    if (el) el.classList.remove("hidden");
}

function hideLoading() {
    const el = document.getElementById("loading-overlay");
    if (el) el.classList.add("hidden");
}

async function tryLogin() {
    const input = document.getElementById("password-input");
    const errorEl = document.getElementById("auth-error");
    const pwd = input.value;

    if (!pwd) {
        errorEl.textContent = "请输入密码";
        return;
    }

    const hash = await sha256(pwd);
    if (hash === PASSWORD_HASH) {
        sessionStorage.setItem("auth_ok", "1");
        errorEl.textContent = "";
        document.getElementById("auth-overlay").classList.add("hidden");
        loadReport();
    } else {
        errorEl.textContent = "密码错误，请重试";
        input.value = "";
        input.focus();
    }
}

function logout() {
    sessionStorage.removeItem("auth_ok");
    location.reload();
}

document.getElementById("password-input").addEventListener("keydown", e => {
    if (e.key === "Enter") tryLogin();
});

function getWeekRange() {
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);
    const nextMonday = new Date(monday);
    nextMonday.setDate(monday.getDate() + 7);
    return { start: monday, end: nextMonday };
}

function formatDate(d) {
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

function showWeekRange(start, end) {
    const lastDay = new Date(end);
    lastDay.setDate(end.getDate() - 1);
    document.getElementById("week-range").textContent =
        `${formatDate(start)} — ${formatDate(lastDay)}`;
}

async function loadReport() {
    showLoading();
    try {
        const { start, end } = getWeekRange();
        showWeekRange(start, end);

        const { data, error } = await supabaseClient
            .from("point_log")
            .select("*")
            .gte("created_at", start.toISOString())
            .lt("created_at", end.toISOString())
            .order("created_at", { ascending: false });

        if (error) throw error;

        const members = aggregate(data || []);
        renderPlusRanking(members);
        renderMinusRanking(members);
    } catch (e) {
        console.error("loadReport error:", e);
        alert("加载周报失败：" + e.message);
    } finally {
        hideLoading();
    }
}

function aggregate(logs) {
    const map = new Map();
    for (const log of logs) {
        if (!map.has(log.member_id)) {
            map.set(log.member_id, {
                id: log.member_id,
                name: log.member_name,
                plus: 0,
                minus: 0,
            });
        }
        const item = map.get(log.member_id);
        if (log.delta > 0) item.plus += log.delta;
        else if (log.delta < 0) item.minus += Math.abs(log.delta);
    }
    return [...map.values()];
}

function renderPlusRanking(members) {
    const list = members.filter(m => m.plus > 0).sort((a, b) => b.plus - a.plus);
    const tbody = document.getElementById("plus-ranking-table");

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="empty-cell">本周暂无加分记录</td></tr>`;
        return;
    }

    let html = "";
    let rank = 0;
    let prev = null;
    list.forEach((m, i) => {
        if (prev === null || m.plus !== prev) {
            rank = i + 1;
            prev = m.plus;
        }
        const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : rank;
        html += `<tr>
            <td>${medal}</td>
            <td>${m.id}</td>
            <td>${m.name}</td>
            <td class="delta-plus">+${m.plus}</td>
        </tr>`;
    });
    tbody.innerHTML = html;
}

function renderMinusRanking(members) {
    const list = members.filter(m => m.minus > 0).sort((a, b) => b.minus - a.minus);
    const tbody = document.getElementById("minus-ranking-table");

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="empty-cell">本周暂无扣分记录</td></tr>`;
        return;
    }

    let html = "";
    let rank = 0;
    let prev = null;
    list.forEach((m, i) => {
        if (prev === null || m.minus !== prev) {
            rank = i + 1;
            prev = m.minus;
        }
        html += `<tr>
            <td>${rank}</td>
            <td>${m.id}</td>
            <td>${m.name}</td>
            <td class="delta-minus">-${m.minus}</td>
        </tr>`;
    });
    tbody.innerHTML = html;
}

if (isLoggedIn()) {
    document.getElementById("auth-overlay").classList.add("hidden");
    loadReport();
} else {
    document.getElementById("auth-overlay").classList.remove("hidden");
    document.getElementById("password-input").focus();
}
