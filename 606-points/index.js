const groupList = document.getElementById("group-list");
const groupRankings = document.getElementById("group-rankings");
const addScore = document.getElementById("add-score");
const addScoreForm = document.getElementById("add-score-form");
const addScoreGroupSelect = document.getElementById("add-score-group-select");
const addScoreScoreInput = document.getElementById("add-score-score-input");
const addScoreReasonInput = document.getElementById("add-score-reason-input");
const addScoreRecords = document.getElementById("add-score-records");
const addGroup = document.getElementById("add-group");
const addGroupForm = document.getElementById("add-group-form");
const addGroupNameInput = document.getElementById("add-group-name-input");
const subGroupForm = document.getElementById("sub-group-form");
const subGroupNameInput = document.getElementById("sub-group-name-input");
const Version = 1;

//获取版本号
function getVersion() {
    const version = localStorage.getItem("version");
    // 如果没有版本号或解析失败，返回0
    try {
        return version ? parseInt(JSON.parse(version)) : 0;
    } catch (e) {
        return 0;
    }
}

// 获取小组数据
function getGroups() {
    const groups = localStorage.getItem("groups");
    return groups ? JSON.parse(groups) : {};
}

// 保存小组数据
function saveGroups(groups) {
    localStorage.setItem("groups", JSON.stringify(groups));
}

//getItem(小组ID)获取小组信息
function getItem(key) {
    const groups = getGroups();
    return groups[key];
}

//setItem(小组ID, 小组信息)更新小组信息
function setItem(key, value) {
    const groups = getGroups();
    groups[key] = value;
    saveGroups(groups);
}

//addScoreSubmit()添加积分
function addScoreSubmit(e){
    e.preventDefault(); // 阻止表单默认提交行为
    
    const groupName = addScoreGroupSelect.value;
    if (!groupName) return;
    
    const groups = getGroups();
    const groupId = Object.keys(groups).find(id => groups[id].name === groupName);
    if (!groupId) return;
    
    const score = parseInt(addScoreScoreInput.value) || 0;
    const currentScore = getItem(groupId).score;
    const newScore = currentScore + score;
    
    const reason = addScoreReasonInput.value;
    const record = {"reason": reason, "score": score, "time": Date.now()};
    
    // 获取当前小组的color字段，确保更新时保留
    const currentGroup = getItem(groupId);
    
    setItem(groupId, {
        "name": groupName, 
        "color": currentGroup.color || "#000000", // 保留原颜色，如果没有则设置默认值
        "score": newScore, 
        "records": getItem(groupId).records.concat(record)
    });
    
    window.location.reload();
}

//addGroupSubmit()添加小组
function addGroupSubmit(e){
    e.preventDefault(); // 阻止表单默认提交行为
    
    const groupName = addGroupNameInput.value.trim();
    // 获取用户选择的颜色值
    const groupColor = document.getElementById("add-group-color-input").value;
    
    if (!groupName) return;
    
    const groups = getGroups();
    const newGroupId = Object.keys(groups).length.toString();
    
    // 添加新小组时使用用户选择的颜色
    setItem(newGroupId, {"name": groupName, "color": groupColor, "score": 0, "records": []});
    
    window.location.reload();
}

//subGroupSubmit()删除小组
function subGroupSubmit(e){
    e.preventDefault(); // 阻止表单默认提交行为
    
    const subGroupSelect = document.getElementById("sub-group-select");
    const groupName = subGroupSelect.value;
    if (!groupName) return;
    
    const groups = getGroups();
    let updatedGroups = {};
    
    // 遍历所有小组，只保留名称不等于要删除的小组
    for(let groupId in groups){
        if(groups[groupId].name !== groupName){
            updatedGroups[groupId] = groups[groupId];
        }
    }
    
    // 如果小组数量发生变化，说明删除成功
    if(Object.keys(updatedGroups).length !== Object.keys(groups).length){
        saveGroups(updatedGroups);
        window.location.reload();
    } else {
        alert("未找到该小组！");
    }
}

// 初始化小组列表
function initGroupList(){
    const groups = getGroups();
    let groupsListHtml = "<table><tr><th>小组名称</th><th>积分</th></tr>";
    
    for(let groupId in groups){
        groupsListHtml += "<tr><td style='color:" + (groups[groupId].color || "#000000") + "'>" + groups[groupId].name + "</td><td>" + groups[groupId].score + "</td></tr>";
    }
    
    groupsListHtml += "</table>";
    groupList.innerHTML = groupsListHtml;
}

// 初始化小组积分榜
function initGroupRankings(){
    const groups = getGroups();
    
    // 将小组转换为数组并按积分降序排序
    const sortedGroups = Object.values(groups).sort((a, b) => b.score - a.score);
    
    let rankingsHtml = "";
    
    // 如果有小组，创建颁奖台
    if (sortedGroups.length > 0) {
        rankingsHtml += "<div class='podium-container'>";
        
        // 前三名显示为颁奖台
        if (sortedGroups.length >= 2) {
            // 第二名（左侧）
            rankingsHtml += `<div class='podium second-place'>
                <div class='rank'>2</div>
                <div class='group-name'>${sortedGroups[1].name}</div>
                <div class='score'>${sortedGroups[1].score}</div>
            </div>`;
        }
        
        if (sortedGroups.length >= 1) {
            // 第一名（中间，最高）
            rankingsHtml += `<div class='podium first-place'>
                <div class='rank'>1</div>
                <div class='group-name'>${sortedGroups[0].name}</div>
                <div class='score'>${sortedGroups[0].score}</div>
            </div>`;
        }
        
        if (sortedGroups.length >= 3) {
            // 第三名（右侧）
            rankingsHtml += `<div class='podium third-place'>
                <div class='rank'>3</div>
                <div class='group-name'>${sortedGroups[2].name}</div>
                <div class='score'>${sortedGroups[2].score}</div>
            </div>`;
        }
        
        rankingsHtml += "</div>";
        
        // 第四名及以后显示为列表
        if (sortedGroups.length > 3) {
            rankingsHtml += "<div class='remaining-groups'>";
            for (let i = 3; i < sortedGroups.length; i++) {
                rankingsHtml += `<div class='group-item'>
                    <span class='rank'>${i + 1}</span>
                    <span class='group-name'>${sortedGroups[i].name}</span>
                    <span class='score'>${sortedGroups[i].score}</span>
                </div>`;
            }
            rankingsHtml += "</div>";
        }
    } else {
        // 没有小组时显示提示
        rankingsHtml += "<div class='no-groups'>暂无小组数据</div>";
    }
    
    groupRankings.innerHTML = rankingsHtml;
}
// 初始化加分选项
function initAddScoreGroupSelect(){
    const groups = getGroups();
    let optionsHtml = "";
    for(let groupId in groups){
        optionsHtml += "<option value=\"" + groups[groupId].name + "\" style='color:" + (groups[groupId].color || "#000000") + "'>" + groups[groupId].name + "</option>";
    }
    addScoreGroupSelect.innerHTML = optionsHtml;
    
    // 设置选择框初始文字颜色为第一个选项的颜色
    if (addScoreGroupSelect.options.length > 0) {
        const firstOption = addScoreGroupSelect.options[0];
        addScoreGroupSelect.style.color = firstOption.style.color;
    }
    
    // 添加change事件监听，当选择变化时更新选择框文字颜色
    addScoreGroupSelect.addEventListener('change', function() {
        const selectedOption = this.options[this.selectedIndex];
        this.style.color = selectedOption.style.color;
    });
}

// 初始化删除小组选项
function initSubGroupSelect(){
    const groups = getGroups();
    let optionsHtml = "";
    for(let groupId in groups){
        optionsHtml += "<option value=\"" + groups[groupId].name + "\" style='color:" + (groups[groupId].color || "#000000") + "'>" + groups[groupId].name + "</option>";
    }
    const subGroupSelect = document.getElementById("sub-group-select");
    subGroupSelect.innerHTML = optionsHtml;
    
    // 设置选择框初始文字颜色为第一个选项的颜色
    if (subGroupSelect.options.length > 0) {
        const firstOption = subGroupSelect.options[0];
        subGroupSelect.style.color = firstOption.style.color;
    }
    
    // 添加change事件监听，当选择变化时更新选择框文字颜色
    subGroupSelect.addEventListener('change', function() {
        const selectedOption = this.options[this.selectedIndex];
        this.style.color = selectedOption.style.color;
    });
}

// 初始化加分减分记录
function initAddScoreRecords(){
    const groups = getGroups();
    let allRecords = [];
    
    // 遍历所有小组，收集所有记录
    for(let groupId in groups){
        const group = groups[groupId];
        if(group.records && group.records.length > 0){
            // 为每条记录添加小组名称
            const groupRecords = group.records.map(record => ({
                ...record,
                groupName: group.name
            }));
            allRecords = allRecords.concat(groupRecords);
        }
    }
    
    // 按时间戳降序排序，最新的记录在前
    allRecords.sort((a, b) => b.time - a.time);
    
    let recordsHtml = "<table class='records-table'><tr><th>小组名称</th><th>分数变化</th><th>原因</th><th>时间</th></tr>";
    
    // 遍历所有记录并生成HTML
    allRecords.forEach(record => {
        // 格式化时间
        const time = new Date(record.time).toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        // 根据分数正负添加不同样式
        const scoreClass = record.score >= 0 ? 'positive-score' : 'negative-score';
        const scoreText = record.score >= 0 ? `+${record.score}` : `${record.score}`;
        
        recordsHtml += `<tr><td>${record.groupName}</td><td class='${scoreClass}'>${scoreText}</td><td>${record.reason || '无'}</td><td>${time}</td></tr>`;
    });
    
    if (allRecords.length === 0) {
        recordsHtml += "<tr><td colspan='4'>暂无加/减分记录</td></tr>";
    }
    
    recordsHtml += "</table>";
    addScoreRecords.innerHTML += recordsHtml;
}

//检测更新
function checkVesion(){
    const version = getVersion();
    const skipVersion = localStorage.getItem("skipVersion");
    
    // 调试：输出当前版本信息
    console.log('当前版本:', version);
    console.log('最新版本:', Version);
    console.log('跳过版本:', skipVersion);
    
    // 如果已经跳过当前版本，则不显示更新提示
    if(skipVersion) {
        try {
            const skipVer = parseInt(JSON.parse(skipVersion));
            if(skipVer === Version) {
                console.log('已跳过此版本更新');
                return;
            }
        } catch(e) {
            console.error('跳过版本解析错误:', e);
            localStorage.removeItem("skipVersion");
        }
    }
    
    // 版本比较（确保是数字比较）
    if(version < Version){
        console.log('发现新版本，准备提示更新');
        if(confirm("发现新版本" + String(Version) + "，是否更新？")){
            // 清除跳过版本记录
            localStorage.removeItem("skipVersion");
            updateVersion();
        } else {
            // 记住用户不想更新的选择
            localStorage.setItem("skipVersion", JSON.stringify(Version));
            console.log('用户选择跳过版本:', Version);
        }
    } else {
        console.log('当前已是最新版本');
    }
}


// 更新
function updateVersion(){
    // 添加默认小组
    saveGroups({});
    localStorage.setItem("version", JSON.stringify(Version));
    window.location.reload();
}

//显示消息
function showMessage(message, type = "info"){
    const messageContainer = document.getElementById("message-container");
    messageContainer.innerHTML = `<div class="message ${type}">${message}</div>`;
}

// 初始化函数
function init(){
    addScoreForm.onsubmit = addScoreSubmit;
    addGroupForm.onsubmit = addGroupSubmit;
    subGroupForm.onsubmit = subGroupSubmit;
    checkVesion();
    initGroupList();
    initGroupRankings();
    initAddScoreGroupSelect();
    initSubGroupSelect(); // 初始化删除小组选择框
    initAddScoreRecords();
}

// 调用初始化函数
init();
