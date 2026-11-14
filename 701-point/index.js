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
                    <button onclick="addPoint(${member[i].id}, document.getElementById('add-point-input-${i}').value)">添加</button>
                </td>
            </tr>\n`;
        }
    }
    memberListTable.innerHTML = html;
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

function showLog() {
    const logs = getLog().slice(0, 10);
    const ul = document.getElementById("log-list-ul");
    if (!ul) return;

    let html = "";
    for (const log of logs) {
        const plus = log.delta >= 0;
        const sign = plus ? "+" : "";
        const cls = plus ? "plus" : "minus";
        html += `<li>
            <span class="log-main">
                <span class="log-name">${log.member_name}</span>
                <span class="log-delta ${cls}">${sign}${log.delta}</span>
                <span class="log-point">→ ${log.point_after} 分</span>
            </span>
            <span class="log-time">${formatTime(log.created_at)}</span>
        </li>`;
    }
    ul.innerHTML = html;
}

function addPoint(id, value) {
    const member = getMember();
    const delta = parseInt(value) || 0;

    for (let i = 0; i < member.length; i++) {
        if (member[i].id === id) {
            member[i].point += delta;
            saveItem("member", JSON.stringify(member));

            addLogLocal({
                member_id: id,
                member_name: member[i].name,
                delta: delta,
                point_after: member[i].point,
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

    const idInput = prompt("请输入学号（数字）：");
    if (idInput === null) return;
    const id = parseInt(idInput, 10);
    if (isNaN(id)) {
        alert("学号必须是数字。");
        return;
    }
    if (member.some(m => m.id === id)) {
        alert("学号 " + id + " 已存在，请勿重复添加。");
        return;
    }

    const nameInput = prompt("请输入姓名：");
    if (nameInput === null) return;
    const name = nameInput.trim();
    if (!name) {
        alert("姓名不能为空。");
        return;
    }

    const pointInput = prompt("请输入初始积分（可留空，默认 0）：", "0");
    if (pointInput === null) return;
    let point = parseInt(pointInput, 10);
    if (isNaN(point)) point = 0;

    member.push({ id: id, name: name, point: point });
    saveItem("member", JSON.stringify(member));
    showMemberList();
    showMemberRankingList();
}

if (isLoggedIn()) {
    enterApp();
} else {
    document.getElementById("auth-overlay").classList.remove("hidden");
    document.getElementById("password-input").focus();
}
