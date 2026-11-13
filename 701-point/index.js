const showDateParagraph = document.getElementById("show-date");
const memberList = document.getElementById("member-list");
const memberListTable = document.getElementById("member-list-table");
const memberRankingList = document.getElementById("member-ranking-list");
const memberRankingListTable = document.getElementById("member-ranking-list-table");
const top3MemberRankingList = document.getElementById("top3-ranking-list");
const podium = document.getElementById("podium");

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

function addPoint(id, value) {
    const member = getMember();
    const delta = parseInt(value) || 0;

    for (let i = 0; i < member.length; i++) {
        if (member[i].id === id) {
            member[i].point += delta;
            saveItem("member", JSON.stringify(member));
            showMemberList();
            showMemberRankingList();
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

async function mainloop() {
    showLoading();
    try {
        showDate();

        if (hasPending()) {
            try {
                await flushToRemote();
            } catch (e) {
                console.warn("上次未同步数据推送失败，使用本地缓存渲染:", e);
                showMemberList();
                showMemberRankingList();
                return;
            }
        }

        const ok = await loadMemberFromRemote();
        if (!ok) console.warn("云端拉取失败，使用本地缓存");

        showMemberList();
        showMemberRankingList();
    } finally {
        hideLoading();
    }
}

mainloop();
