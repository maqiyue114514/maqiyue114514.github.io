const PASSWORD_HASH = "ae5a40cdc6c5273ba020ec4e3b06b5ee4c01b6156a46a3e620c9223b5c01d27a";

const showDateParagraph = document.getElementById("show-date");
const memberListTable = document.getElementById("member-list-table");
const memberRankingListTable = document.getElementById("member-ranking-list-table");
const podium = document.getElementById("podium");

async function sha256(text) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}

function isLoggedIn() {
    return sessionStorage.getItem("auth_ok") === "1";
}

let dataLoaded = false;

const dataReadyPromise = (async () => {
    try {
        if (hasPending() || getLogPending().length > 0) {
            await flushToRemote();
        }
        const ok = await loadMemberFromRemote();
        if (!ok) console.warn("云端拉取失败，使用本地缓存");
        await loadLogFromRemote();
        await loadReasonsFromRemote();
    } catch (e) {
        console.warn("预加载失败，使用本地缓存:", e);
    } finally {
        dataLoaded = true;
    }
})();

async function enterApp() {
    document.getElementById("auth-overlay").classList.add("hidden");

    if (!dataLoaded) showLoading();
    await dataReadyPromise;
    hideLoading();

    showDate();
    showMemberList();
    showMemberRankingList();
    showLog();
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
        enterApp();
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

function showDate() {
    const day = ["一", "二", "三", "四", "五", "六", "日"][new Date().getDay()];
    const date = new Date().getDate();
    const month = new Date().getMonth();
    const year = new Date().getFullYear();
    const text = `今天是${year}年${month}月${date}日星期${day}`;
    showDateParagraph.innerText = text;
}

function showMemberList() {
    const member = getMember();
    let html = "";
    member.sort((x, y) => x.id - y.id);

    for (let i = 0; i < member.length; i++) {
        if (member[i]) {
            html += `<tr>
                <td>${member[i].id}</td>
                <td>${member[i].name}</td>
                <td>${member[i].point}</td>
                <td>
                    <input type="number" id="add-point-input-${i}" value="0">
                    <button onclick="document.getElementById('add-point-input-${i}').value++">+1</button>
                    <button onclick="var e=document.getElementById('add-point-input-${i}');e.value=parseInt(e.value||0)+5">+5</button>
                    <button onclick="document.getElementById('add-point-input-${i}').value--">-1</button>
                    <button onclick="var e=document.getElementById('add-point-input-${i}');e.value=parseInt(e.value||0)-5">-5</button>
                    <details id="reason-picker-${member[i].id}" class="reason-picker row-reason-picker">
                        <summary class="reason-summary">理由</summary>
                        <div id="reason-options-${member[i].id}" class="reason-options"></div>
                    </details>
                    <button onclick="addPoint(${member[i].id}, document.getElementById('add-point-input-${i}').value)">添加</button>
                </td>
            </tr>\n`;
        }
    }
    memberListTable.innerHTML = html;
    for (const m of member) renderReasonOptions(m.id);
}

function showMemberRankingList() {
    const member = getMember();
    let html = "";
    let cnt = 4;
    member.sort((x, y) => y.point - x.point);
    showTop3RankingList();

    for (let i = 3; i < member.length; i++) {
        if (i != 3 && member[i].point != member[i - 1].point) {
            cnt++;
        }
        if (i >= 3) {
            html += `<tr>
                <td>${cnt}</td>
                <td>${member[i].id}</td>
                <td>${member[i].name}</td>
                <td>${member[i].point}</td>
            </tr>\n`;
        }
    }
    memberRankingListTable.innerHTML = html;
}

function showTop3RankingList() {
    const member = getMember();
    let cnt = 1;
    const medals = ["🥇", "🥈", "🥉"];
    member.sort((x, y) => y.point - x.point);

    const blocks = [];
    for (let i = 0; i < member.length && i < 3; i++) {
        if (i != 0 && member[i].point != member[i - 1].point) {
            cnt++;
        }
        if (member[i]) {
            blocks[i] = `<div class="podium-item place-${i + 1}">
                <div class="podium-avatar">${medals[cnt - 1] || cnt}</div>
                <div class="podium-name">${member[i].name}</div>
                <div class="podium-point">${member[i].point} 分</div>
                <div class="podium-base">${i + 1}</div>
            </div>\n`;
        }
    }
    podium.innerHTML = (blocks[1] || "") + (blocks[0] || "") + (blocks[2] || "");
}

function formatTime(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    const now = new Date();
    const pad = n => String(n).padStart(2, "0");
    const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    if (d.toDateString() === now.toDateString()) return hm;
    return `${d.getMonth() + 1}/${d.getDate()} ${hm}`;
}

function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, c => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
    }[c]));
}

function showLog() {
    const logs = getLog().slice(0, 10);
    const ul = document.getElementById("log-list-ul");
    if (!ul) return;

    let html = "";
    for (const log of logs) {
        const plus = log.delta >= 0;
        const sign = plus ? "+" : "";
        const cls = plus ? "plus" : "minus";
        const reason = log.reason ? `<span class="log-reason">${escapeHtml(log.reason)}</span>` : "";
        html += `<li>
            <span class="log-main">
                <span class="log-name">${log.member_name}</span>
                <span class="log-delta ${cls}">${sign}${log.delta}</span>
                <span class="log-point">→ ${log.point_after} 分</span>
                ${reason}
            </span>
            <span class="log-time">${formatTime(log.created_at)}</span>
        </li>`;
    }
    ul.innerHTML = html;
}

function addPoint(id, value) {
    const member = getMember();
    const delta = parseInt(value) || 0;
    const picker = document.getElementById("reason-picker-" + id);
    const reasons = picker ? getSelectedReasons(picker) : [];

    for (let i = 0; i < member.length; i++) {
        if (member[i].id === id) {
            member[i].point += delta;
            saveItem("member", JSON.stringify(member));

            addLogLocal({
                member_id: id,
                member_name: member[i].name,
                delta: delta,
                point_after: member[i].point,
                reason: reasons.join("、"),
            });

            showMemberList();
            showMemberRankingList();
            showLog();
            return;
        }
    }
}

function createSave() {
    const initial = [
        { id: 6, name: "mqy", point: 100 },
        { id: 8, name: "szh", point: -10 },
        { id: 5, name: "hr", point: 0 },
        { id: 78, name: "gm", point: 91 }
    ];
    saveItem("member", JSON.stringify(initial));
    location.reload();
}

function clearSave() {
    if (confirm("确认清空数据")) {
        clearItem();
        location.reload();
    }
}

function showLoading() {
    const el = document.getElementById("loading-overlay");
    if (el) el.classList.remove("hidden");
}

function hideLoading() {
    const el = document.getElementById("loading-overlay");
    if (el) el.classList.add("hidden");
}

function addMember() {
    const member = getMember();

    const idInput = document.getElementById("new-member-id");
    const nameInput = document.getElementById("new-member-name");
    const pointInput = document.getElementById("new-member-point");
    const errorEl = document.getElementById("add-member-error");

    const id = parseInt(idInput.value, 10);
    if (isNaN(id)) {
        errorEl.textContent = "学号必须是数字。";
        return;
    }
    if (member.some(m => m.id === id)) {
        errorEl.textContent = "学号 " + id + " 已存在，请勿重复添加。";
        return;
    }

    const name = nameInput.value.trim();
    if (!name) {
        errorEl.textContent = "姓名不能为空。";
        return;
    }

    let point = parseInt(pointInput.value, 10);
    if (isNaN(point)) point = 0;

    member.push({ id: id, name: name, point: point });
    saveItem("member", JSON.stringify(member));

    idInput.value = "";
    nameInput.value = "";
    pointInput.value = "0";
    errorEl.textContent = "";
    idInput.focus();

    showMemberList();
    showMemberRankingList();
}

function getSelectedReasons(picker) {
    return [...picker.querySelectorAll("input[type=\"checkbox\"]:checked")].map(cb => cb.value);
}

function updateReasonSummary(picker) {
    const picked = getSelectedReasons(picker);
    picker.querySelector("summary").textContent = picked.length ? picked.join("、") : "理由";
}

function renderReasonOptions(rowId) {
    const picker = document.getElementById("reason-picker-" + rowId);
    const box = document.getElementById("reason-options-" + rowId);
    if (!picker || !box) return;

    box.innerHTML = "";
    const reasons = getReasons();

    if (reasons.length === 0) {
        const empty = document.createElement("span");
        empty.className = "reason-empty";
        empty.textContent = "暂无理由";
        box.appendChild(empty);
    } else {
        for (const r of reasons) {
            const label = document.createElement("label");
            label.className = "reason-option";

            const cb = document.createElement("input");
            cb.type = "checkbox";
            cb.value = r;
            cb.addEventListener("change", () => updateReasonSummary(picker));

            label.appendChild(cb);
            label.appendChild(document.createTextNode(r));
            box.appendChild(label);
        }
    }
    updateReasonSummary(picker);
}

function renderAllReasonOptions() {
    for (const m of getMember()) renderReasonOptions(m.id);
}

async function addReason() {
    const input = document.getElementById("new-reason-label");
    const errorEl = document.getElementById("reason-error");
    const label = input.value.trim();

    if (!label) {
        errorEl.textContent = "理由不能为空。";
        return;
    }
    if (getReasons().includes(label)) {
        errorEl.textContent = "该理由已存在。";
        return;
    }

    try {
        await addReasonToRemote(label);
    } catch (e) {
        errorEl.textContent = "添加理由失败：" + e.message;
        return;
    }

    const reasons = getReasons();
    reasons.push(label);
    localStorage.setItem("reasons", JSON.stringify(reasons));

    input.value = "";
    errorEl.textContent = "";
    renderAllReasonOptions();
}

if (isLoggedIn()) {
    enterApp();
} else {
    document.getElementById("auth-overlay").classList.remove("hidden");
    document.getElementById("password-input").focus();
}
