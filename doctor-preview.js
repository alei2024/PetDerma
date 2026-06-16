// ====== State ======
let TOKEN = localStorage.getItem('token') || '';
let USER = JSON.parse(localStorage.getItem('user') || '{}');
let ALL_CASES = [];
let CURRENT_FILTER = 'all';

// ====== Toast ======
function showToast(msg, duration) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.className = 'toast show';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.className = 'toast', duration || 2000);
}

function showLoading(show) {
  document.getElementById('loading').className = 'loading' + (show ? ' show' : '');
}

// ====== Page Nav ======
const PAGES = ['pageLogin', 'pageDashboard', 'pageCases', 'pageDetail'];
function showPage(id) {
  PAGES.forEach(p => document.getElementById(p).className = 'page-nav');
  document.getElementById(id).className = 'page-nav show';
  document.getElementById('backBtn').className = 'back' + (id !== 'pageDashboard' ? ' show' : '');
  const titles = { pageLogin: '宠医辅助台', pageDashboard: '宠医辅助台', pageCases: '授权病例', pageDetail: '病例详情' };
  const subs = { pageLogin: '登录以查看授权病例', pageDashboard: 'PetDerma 机构端工作台', pageCases: '查看所有授权病例', pageDetail: '详细诊断信息' };
  document.getElementById('headerTitle').textContent = titles[id] || '宠医辅助台';
  document.getElementById('headerSub').textContent = subs[id] || '';
}

// ====== Auth ======
async function doLogin() {
  const phone = document.getElementById('loginPhone').value;
  const pwd = document.getElementById('loginPassword').value;
  if (!phone || !pwd) { showToast('请填写手机号和密码'); return; }
  showLoading(true);
  try {
    const res = await fetch('/api/auth/phone-password-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: phone, password: pwd })
    });
    const data = await res.json();
    if (data.success) {
      TOKEN = data.data.token;
      USER = data.data.user;
      localStorage.setItem('token', TOKEN);
      localStorage.setItem('user', JSON.stringify(USER));
      showToast('登录成功');
      initDashboard();
    } else if (data.message === '用户不存在') {
      await tryDevToken();
    } else {
      showToast(data.message || '登录失败');
    }
  } catch (e) {
    await tryDevToken();
  }
  showLoading(false);
}

async function tryDevToken() {
  try {
    const r2 = await fetch('/api/auth/dev-token');
    const d2 = await r2.json();
    if (d2.success) {
      TOKEN = d2.data.token;
      USER = d2.data.user;
      localStorage.setItem('token', TOKEN);
      localStorage.setItem('user', JSON.stringify(USER));
      showToast('自动创建测试用户并登录');
      initDashboard();
      return;
    }
  } catch(e2) {}
  showToast('无法连接后端，请确认 npm start 已运行');
}

async function doRegister() {
  const phone = document.getElementById('regPhone').value;
  const nick = document.getElementById('regNick').value;
  const pwd = document.getElementById('regPassword').value;
  const confirm = document.getElementById('regConfirm').value;
  if (!phone || !nick || !pwd) { showToast('请填写完整信息'); return; }
  if (pwd.length < 6) { showToast('密码至少6位'); return; }
  if (pwd !== confirm) { showToast('两次密码不一致'); return; }
  showLoading(true);
  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: phone, nickName: nick, password: pwd, confirmPassword: confirm })
    });
    const data = await res.json();
    if (data.success) {
      TOKEN = data.data.token;
      USER = data.data.user;
      localStorage.setItem('token', TOKEN);
      localStorage.setItem('user', JSON.stringify(USER));
      showToast('注册成功');
      initDashboard();
    } else {
      showToast(data.message || '注册失败');
    }
  } catch (e) {
    showToast('无法连接后端');
  }
  showLoading(false);
}

function doLogout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  TOKEN = ''; USER = {};
  showPage('pageLogin');
  showToast('已退出');
}

// ====== Dashboard ======
function initDashboard() {
  document.getElementById('doctorName').textContent = USER.nickName || '合作医生';
  document.getElementById('doctorId').textContent = 'ID: ' + (USER.id || USER._id || '').substring(0,8) || '---';
  showPage('pageDashboard');
  if (!localStorage.getItem('doctorMockCases')) {
    generateMockCases();
  }
  loadCases();
}

async function loadCases() {
  if (!TOKEN) return;
  showLoading(true);
  try {
    const res = await fetch('/api/doctor/cases', {
      headers: { 'Authorization': 'Bearer ' + TOKEN }
    });
    const data = await res.json();
    if (data.success && data.data.cases && data.data.cases.length > 0) {
      ALL_CASES = data.data.cases;
      updateDashboard(data.data.stats);
      renderRecentCases();
    } else {
      loadMockCases();
    }
  } catch(e) {
    loadMockCases();
  }
  showLoading(false);
}

function loadMockCases() {
  const stored = localStorage.getItem('doctorMockCases');
  if (stored) {
    ALL_CASES = JSON.parse(stored);
    const total = ALL_CASES.length;
    const pending = ALL_CASES.filter(c => !c.aiSummary).length;
    const followup = ALL_CASES.filter(c => c.followUp?.needed && !c.followUp?.completed).length;
    updateDashboard({ total, pendingReview: pending, followUpNeeded: followup });
    renderRecentCases();
  }
}

function updateDashboard(stats) {
  document.getElementById('statTotal').textContent = stats.total || 0;
  document.getElementById('statPending').textContent = stats.pendingReview || 0;
  document.getElementById('statFollowup').textContent = stats.followUpNeeded || 0;
}

function renderRecentCases() {
  const el = document.getElementById('recentCases');
  if (!ALL_CASES.length) {
    el.innerHTML = '<div class="empty"><span class="icon">📭</span><span class="text">暂无数据</span></div>';
    return;
  }
  el.innerHTML = ALL_CASES.slice(0, 5).map(c => renderCaseItem(c)).join('');
}

function renderCaseItem(c) {
  const disease = c.skinDiseaseHistory?.[c.skinDiseaseHistory.length-1]?.diseaseName || '暂无诊断';
  const severity = c.severity || '';
  const sevClass = severity === '轻' ? 'light' : severity === '中' ? 'medium' : severity === '重' ? 'heavy' : '';
  const hasSummary = c.aiSummary ? '<span class="case-tag green">AI 摘要</span>' : '<span class="case-tag orange">待生成</span>';
  const hasFollowup = c.followUp?.needed && !c.followUp?.completed ? '<span class="case-tag red">待复诊</span>' : '';
  return `<div class="case-item" data-id="${c._id}">
    <div class="case-row">
      <div class="case-avatar">${c.petId?.name?.[0] || '🐾'}</div>
      <div class="case-info">
        <div class="case-name">${c.petId?.name || '未知宠物'} <span style="font-weight:normal;color:#999;font-size:12px;">${c.petId?.species || ''}</span></div>
        <div class="case-owner">宠主：${c.userId?.nickName || '未知'}</div>
        <div class="case-disease">${disease}</div>
        <div class="case-meta">${formatTime(c.createdAt)}</div>
      </div>
      ${severity ? `<span class="case-badge ${sevClass}">${severity}</span>` : ''}
    </div>
    <div class="case-tags">${hasSummary}${hasFollowup}</div>
  </div>`;
}

// ====== Cases List ======
function showCases(filter) {
  CURRENT_FILTER = filter;
  showPage('pageCases');
  renderCases();
  document.querySelectorAll('#pageCases .tab').forEach(t => {
    t.className = 'tab' + (t.dataset.filter === filter ? ' active' : '');
  });
}

function renderCases() {
  const el = document.getElementById('casesList');
  let filtered = ALL_CASES;
  if (CURRENT_FILTER === 'pending') filtered = ALL_CASES.filter(c => !c.aiSummary);
  if (CURRENT_FILTER === 'followup') filtered = ALL_CASES.filter(c => c.followUp?.needed && !c.followUp?.completed);
  if (!filtered.length) {
    el.innerHTML = '<div class="empty"><span class="icon">📋</span><span class="text">暂无病例</span></div>';
    return;
  }
  el.innerHTML = filtered.map(c => renderCaseItem(c)).join('');
}

// ====== Case Detail ======
async function viewDetail(id) {
  showLoading(true);
  if (TOKEN) {
    try {
      const res = await fetch('/api/doctor/cases/' + id, {
        headers: { 'Authorization': 'Bearer ' + TOKEN }
      });
      const data = await res.json();
      if (data.success) {
        showDetailPage(data.data);
        showLoading(false);
        return;
      }
    } catch(e) {}
  }
  const c = ALL_CASES.find(i => i._id === id);
  if (c) showDetailPage(c);
  showLoading(false);
}

function showDetailPage(c) {
  showPage('pageDetail');
  document.getElementById('headerTitle').textContent = '病例详情';
  document.getElementById('headerSub').textContent = (c.petId?.name || '未知宠物') + ' · ' + (c.userId?.nickName || '');

  const severity = c.severity || '';
  const sevClass = severity === '轻' ? 'light' : severity === '中' ? 'medium' : severity === '重' ? 'heavy' : '';
  const severityBadge = severity ? `<span class="case-badge ${sevClass}" style="font-size:13px;padding:4px 16px;">${severity}</span>` : '';

  const diseases = (c.skinDiseaseHistory || []).map(d => `
    <div class="disease-box">
      <div><span class="name">${d.diseaseName}</span><span class="status ${d.isCured === '是' ? 'cured' : 'uncured'}">${d.isCured === '是' ? '已痊愈' : '治疗中'}</span></div>
      ${d.symptoms?.length ? `<div class="detail">症状：${d.symptoms.join('、')}</div>` : ''}
      ${d.affectedAreas?.length ? `<div class="detail">部位：${d.affectedAreas.join('、')}</div>` : ''}
      ${d.medication ? `<div class="detail">用药：${d.medication}</div>` : ''}
      <div class="date">${d.startDate ? formatTime(d.startDate) : ''}</div>
    </div>
  `).join('') || '<div style="color:#bbb;padding:12px;text-align:center;">暂无诊断记录</div>';

  const followUp = c.followUp || {};
  const followupBadge = followUp.needed && !followUp.completed ? '<span class="case-tag red" style="font-size:13px;padding:4px 14px;">待复诊</span>' :
    followUp.completed ? '<span class="case-tag green" style="font-size:13px;padding:4px 14px;">已完成</span>' :
    '<span class="case-tag" style="background:#f0f0f0;color:#999;font-size:13px;padding:4px 14px;">未设置</span>';

  const summarySection = c.aiSummary ? `
    <div class="summary-box">
      <div class="text">${c.aiSummary}</div>
      ${c.trend ? `<div class="trend"><div class="trend-label">📈 病情趋势</div><div class="trend-text">${c.trend}</div></div>` : ''}
    </div>
  ` : `<div style="text-align:center;padding:16px 0;">
    <button class="btn btn-primary btn-sm" data-action="generateSummary" data-id="${c._id}">🤖 生成 AI 摘要</button>
    <div style="font-size:12px;color:#bbb;margin-top:6px;">点击按钮自动分析病例数据</div>
  </div>`;

  document.getElementById('detailContent').innerHTML = `
    <div class="card">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
        <div class="case-avatar" style="width:52px;height:52px;font-size:24px;">${c.petId?.name?.[0] || '🐾'}</div>
        <div style="flex:1">
          <div style="font-weight:bold;font-size:16px;">${c.petId?.name || '未知宠物'}</div>
          <div style="font-size:12px;color:#999;">${c.petId?.species || ''} ${c.petId?.breed || ''}</div>
        </div>
        ${severityBadge}
      </div>
      <div class="detail-row"><span class="detail-label">宠主</span><span class="detail-value">${c.userId?.nickName || '未知'}</span></div>
      <div class="detail-row"><span class="detail-label">电话</span><span class="detail-value">${c.userId?.phoneNumber || '未提供'}</span></div>
      ${c.weight ? `<div class="detail-row"><span class="detail-label">体重</span><span class="detail-value">${c.weight}kg</span></div>` : ''}
      <div class="detail-row"><span class="detail-label">建档</span><span class="detail-value">${formatTime(c.createdAt)}</span></div>
    </div>
    <div class="card">
      <div class="card-title">诊断记录</div>
      ${diseases}
    </div>
    <div class="card">
      <div class="card-title">🤖 AI 病例摘要</div>
      ${summarySection}
    </div>
    <div class="card">
      <div class="card-title">📅 复诊管理</div>
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div>${followupBadge} ${followUp.note ? `<span style="font-size:12px;color:#666;margin-left:8px;">${followUp.note}</span>` : ''}</div>
        <button class="btn btn-outline btn-sm" data-action="toggleFollowUp">设置</button>
      </div>
      ${followUp.needed && !followUp.completed ? `<button class="btn btn-success btn-sm" style="margin-top:10px;width:100%;" data-action="completeFollowUp" data-id="${c._id}">✓ 标记复诊已完成</button>` : ''}
      <div id="followUpForm" style="display:none;">
        <div class="followup-form">
          <label><input type="checkbox" id="fuNeeded" ${followUp.needed ? 'checked' : ''}> 需要复诊</label>
          <label style="margin-top:8px;">复诊日期</label>
          <input type="date" id="fuDate" value="${followUp.date ? followUp.date.substring(0,10) : ''}">
          <label>备注</label>
          <input type="text" id="fuNote" placeholder="复诊备注" value="${followUp.note || ''}">
          <div class="btn-row">
            <button class="btn btn-outline btn-sm" data-action="hideFollowUpForm">取消</button>
            <button class="btn btn-primary btn-sm" data-action="saveFollowUp" data-id="${c._id}">保存</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ====== AI Summary ======
async function generateSummary(id) {
  showLoading(true);
  const c = ALL_CASES.find(i => i._id === id);
  if (c) {
    const pet = c.petId || {};
    const history = c.skinDiseaseHistory || [];
    const latest = history[history.length - 1] || {};
    const lines = [];
    if (pet.name) lines.push('患宠：' + pet.name + '（' + (pet.species || '未知') + '）');
    if (c.userId?.nickName) lines.push('宠主：' + c.userId.nickName);
    if (c.weight) lines.push('体重：' + c.weight + 'kg');
    if (latest.diseaseName) lines.push('诊断疾病：' + latest.diseaseName);
    if (latest.symptoms?.length) lines.push('症状表现：' + latest.symptoms.join('、'));
    if (latest.affectedAreas?.length) lines.push('患病部位：' + latest.affectedAreas.join('、'));
    c.aiSummary = lines.join('；') || '暂无诊断数据。';
    c.trend = history.length > 1 ? '该宠物共有 ' + history.length + ' 次就诊记录，病情发展已追踪。' : '初次就诊，建议持续观察。';
    const symptomCount = (latest.symptoms?.length || 0) + (latest.affectedAreas?.length || 0);
    c.severity = symptomCount >= 4 ? '重' : symptomCount >= 2 ? '中' : '轻';
    showToast('摘要生成成功');
    viewDetail(id);
    renderRecentCases();
  }
  showLoading(false);
}

// ====== Follow Up ======
function saveFollowUp(id) {
  const needed = document.getElementById('fuNeeded').checked;
  const date = document.getElementById('fuDate').value;
  const note = document.getElementById('fuNote').value;
  const c = ALL_CASES.find(i => i._id === id);
  if (c) {
    c.followUp = { needed, date, note, completed: false };
    showToast('复诊提醒已更新');
    viewDetail(id);
  }
}

function completeFollowUp(id) {
  if (!confirm('确认该复诊已完成？')) return;
  const c = ALL_CASES.find(i => i._id === id);
  if (c) { c.followUp.completed = true; showToast('复诊已完成'); viewDetail(id); }
}

// ====== Seed Demo Data ======
function generateMockCases() {
  const mockCases = [
    {
      _id: 'mock_001', severity: '中', weight: 28.5, allergies: '花粉',
      userId: { nickName: '张女士', phoneNumber: '138****1234' },
      petId: { name: '豆豆', species: '犬', breed: '金毛' },
      skinDiseaseHistory: [{ diseaseName: '湿疹', symptoms: ['红斑','瘙痒','掉毛'], affectedAreas: ['背部','腹部'], medication: '红霉素软膏', isCured: '否', startDate: '2026-04-15' }],
      recentContact: '近期去过宠物公园', createdAt: '2026-04-15',
      aiSummary: '患宠：豆豆（犬）；宠主：张女士；体重：28.5kg；诊断疾病：湿疹；症状表现：红斑、瘙痒、掉毛；患病部位：背部、腹部。建议进行过敏原检测并保持环境干燥。',
      trend: '初次就诊，症状表现为中度的皮肤红斑和瘙痒，建议持续观察并按时用药。',
      followUp: { needed: true, date: '2026-05-20', note: '复查皮肤恢复情况', completed: false }
    },
    {
      _id: 'mock_002', severity: '轻', weight: 4.2,
      userId: { nickName: '李先生', phoneNumber: '139****5678' },
      petId: { name: '咪咪', species: '猫', breed: '英短' },
      skinDiseaseHistory: [{ diseaseName: '猫癣', symptoms: ['掉毛','结痂'], affectedAreas: ['面部'], medication: '特比萘芬', isCured: '是', startDate: '2026-03-01' }],
      createdAt: '2026-03-01',
      aiSummary: '患宠：咪咪（猫）；宠主：李先生；体重：4.2kg；诊断疾病：猫癣；症状表现：掉毛、结痂；患病部位：面部。已治愈，恢复良好。',
      trend: '1 次就诊记录，已痊愈。建议定期检查皮肤状态。',
      followUp: { needed: false, completed: false }
    },
    {
      _id: 'mock_003', severity: '重', weight: 12.0, allergies: '食物过敏',
      userId: { nickName: '王先生', phoneNumber: '137****9012' },
      petId: { name: '旺财', species: '犬', breed: '柯基' },
      skinDiseaseHistory: [
        { diseaseName: '脓皮症', symptoms: ['渗液','结痂','红斑','瘙痒'], affectedAreas: ['全身','爪缝'], medication: '抗生素+药浴', isCured: '否', startDate: '2026-05-01' },
        { diseaseName: '过敏性皮炎', symptoms: ['红斑','瘙痒'], affectedAreas: ['腹部'], medication: '抗组胺药', isCured: '是', startDate: '2026-01-10' }
      ],
      recentContact: '家中新养了一只猫', createdAt: '2026-05-01',
      aiSummary: '患宠：旺财（犬）；宠主：王先生；体重：12.0kg；诊断疾病：脓皮症；症状表现：渗液、结痂、红斑、瘙痒；患病部位：全身、爪缝。有食物过敏史，复发风险较高。建议进行过敏原排查。',
      trend: '该宠物共有 2 次就诊记录。既往过敏性皮炎已治愈，目前脓皮症正在治疗中，病情有复发趋势，需要持续关注。',
      followUp: { needed: true, date: '2026-05-25', note: '复查脓皮症恢复情况，建议做过敏原检测', completed: false }
    },
    {
      _id: 'mock_004', severity: '轻', weight: 5.8,
      userId: { nickName: '赵女士', phoneNumber: '136****3456' },
      petId: { name: '小白', species: '犬', breed: '比熊' },
      skinDiseaseHistory: [{ diseaseName: '泪痕炎', symptoms: ['红斑'], affectedAreas: ['面部'], medication: '氯霉素眼药水', isCured: '是', startDate: '2026-02-20' }],
      createdAt: '2026-02-20',
      aiSummary: '患宠：小白（犬）；宠主：赵女士；体重：5.8kg；诊断疾病：泪痕炎；症状表现：红斑；患病部位：面部。已治愈，情况良好。',
      trend: '初次就诊，已痊愈。建议定期清洁眼部。',
      followUp: { needed: false, completed: false }
    }
  ];
  localStorage.setItem('doctorMockCases', JSON.stringify(mockCases));
}

// ====== Utils ======
function formatTime(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return date;
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
  if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
  if (diff < 604800000) return Math.floor(diff / 86400000) + '天前';
  return (d.getMonth()+1) + '月' + d.getDate() + '日';
}

// ====== Event Delegation ======
document.addEventListener('DOMContentLoaded', function() {
  // Back button
  document.getElementById('backBtn').addEventListener('click', function() {
    const visible = PAGES.find(id => document.getElementById(id).className === 'page-nav show');
    if (visible === 'pageCases') showPage('pageDashboard');
    else if (visible === 'pageDetail') showPage('pageCases');
    else showPage('pageDashboard');
  });

  // Global click handler using event delegation
  document.addEventListener('click', function(e) {
    const target = e.target.closest('[data-action]');
    if (!target) return;
    const action = target.dataset.action;
    const id = target.dataset.id;

    switch (action) {
      case 'login': doLogin(); break;
      case 'register': doRegister(); break;
      case 'showRegister': showRegister(); break;
      case 'showLogin': showLogin(); break;
      case 'logout': doLogout(); break;
      case 'showCases': showCases(target.dataset.filter || 'all'); break;
      case 'dashboard': showPage('pageDashboard'); break;
      case 'seedDemo': generateMockCases(); showToast('已导入 4 个演示病例'); loadCases(); break;
      case 'switchFilter':
        document.querySelectorAll('#pageCases .tab').forEach(t => t.className = 'tab');
        target.className = 'tab active';
        CURRENT_FILTER = target.dataset.filter;
        renderCases();
        break;
      case 'viewCase': viewDetail(id || target.closest('[data-id]')?.dataset.id); break;
      case 'generateSummary': generateSummary(id); break;
      case 'toggleFollowUp':
        const form = document.getElementById('followUpForm');
        form.style.display = form.style.display === 'none' ? 'block' : 'none';
        break;
      case 'hideFollowUpForm':
        document.getElementById('followUpForm').style.display = 'none';
        break;
      case 'saveFollowUp': saveFollowUp(id); break;
      case 'completeFollowUp': completeFollowUp(id); break;
      case 'viewPending': showCases('pending'); break;
      case 'viewFollowup': showCases('followup'); break;
    }
  });

  // Case item click delegation (re-rendered content)
  document.addEventListener('click', function(e) {
    const item = e.target.closest('.case-item');
    if (item && item.dataset.id) {
      viewDetail(item.dataset.id);
    }
  });

  // Init
  (async function init() {
    if (TOKEN && USER?.nickName) {
      initDashboard();
      return;
    }
    try {
      const r = await fetch('/api/auth/dev-token');
      const d = await r.json();
      if (d.success) {
        TOKEN = d.data.token;
        USER = d.data.user;
        localStorage.setItem('token', TOKEN);
        localStorage.setItem('user', JSON.stringify(USER));
        initDashboard();
        showToast('自动登录成功（开发模式）');
        return;
      }
    } catch(e) {}
    showPage('pageLogin');
  })();
});

// Auth form visibility toggles
function showRegister() {
  document.getElementById('loginForm').style.display = 'none';
  document.getElementById('registerForm').style.display = 'block';
}
function showLogin() {
  document.getElementById('registerForm').style.display = 'none';
  document.getElementById('loginForm').style.display = 'block';
}
