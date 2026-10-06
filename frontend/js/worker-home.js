import { apiFetch, getUser, logout, showToast, formatCurrency, BASE_URL } from './api.js';

const user = getUser();
if (!user || user.role !== 'WORKER') {
  window.location.href = '/login.html';
}

const LOCAL_TASKS_KEY = 'gf_worker_tasks_cache';
let allWorkerTasks = [];
let currentFilter = 'all';
let searchQuery = '';
let todayAttendance = null;

document.addEventListener('DOMContentLoaded', () => {
  setupWorkerUI();
  setupEventListeners();
  loadAttendanceStatus();
  loadPieceRateEarnings();
  loadWorkerTasks();
});

function setupWorkerUI() {
  const headerName = document.getElementById('worker-header-name');
  const greetingName = document.getElementById('worker-greeting-name');
  const deptBadge = document.getElementById('worker-dept-badge');
  const deptText = document.getElementById('worker-dept-text');
  const avatarInitial = document.getElementById('worker-avatar-initial');

  if (user) {
    if (headerName) headerName.innerText = user.name || 'Worker';
    if (greetingName) greetingName.innerText = (user.name || 'Operator').split(' ')[0];
    
    const dept = user.department || 'Cutting';
    if (deptText) deptText.innerText = `${dept} Station`;
    if (deptBadge) deptBadge.title = `Assigned to ${dept} Department`;

    if (avatarInitial) {
      avatarInitial.innerText = (user.name || 'W').charAt(0).toUpperCase();
    }
  }

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }
}

function setupEventListeners() {
  // Tabs
  const tabAll = document.getElementById('tab-all');
  const tabPending = document.getElementById('tab-pending');
  const tabCompleted = document.getElementById('tab-completed');

  if (tabAll) tabAll.addEventListener('click', () => switchTab('all'));
  if (tabPending) tabPending.addEventListener('click', () => switchTab('pending'));
  if (tabCompleted) tabCompleted.addEventListener('click', () => switchTab('completed'));

  // Search
  const searchInput = document.getElementById('task-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase().trim();
      renderTaskList();
    });
  }

  // Attendance Clock In / Out
  const btnClockIn = document.getElementById('btn-clockin');
  const btnClockOut = document.getElementById('btn-clockout');

  if (btnClockIn) {
    btnClockIn.addEventListener('click', handleClockIn);
  }
  if (btnClockOut) {
    btnClockOut.addEventListener('click', handleClockOut);
  }

  // Leave Modal
  const openLeaveBtn = document.getElementById('open-leave-modal');
  const closeLeaveBtn = document.getElementById('close-leave-modal');
  const cancelLeaveBtn = document.getElementById('cancel-leave-btn');
  const leaveModal = document.getElementById('leave-modal');
  const leaveForm = document.getElementById('leave-form');

  if (openLeaveBtn && leaveModal) {
    openLeaveBtn.addEventListener('click', () => {
      // Set default dates
      const today = new Date().toISOString().split('T')[0];
      const startInp = document.getElementById('leave-start');
      const endInp = document.getElementById('leave-end');
      if (startInp) startInp.value = today;
      if (endInp) endInp.value = today;
      leaveModal.classList.remove('hidden');
    });
  }

  const hideLeaveModal = () => {
    if (leaveModal) leaveModal.classList.add('hidden');
  };

  if (closeLeaveBtn) closeLeaveBtn.addEventListener('click', hideLeaveModal);
  if (cancelLeaveBtn) cancelLeaveBtn.addEventListener('click', hideLeaveModal);

  if (leaveForm) {
    leaveForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const leaveType = document.getElementById('leave-type')?.value;
      const startDate = document.getElementById('leave-start')?.value;
      const endDate = document.getElementById('leave-end')?.value;
      const reason = document.getElementById('leave-reason')?.value;

      try {
        await apiFetch('/attendance/leaves/apply', {
          method: 'POST',
          body: { leaveType, startDate, endDate, reason }
        });
        showToast('Leave application submitted for supervisor approval!', 'success');
        hideLeaveModal();
        leaveForm.reset();
      } catch (err) {
        showToast(err.message || 'Failed to submit leave application', 'error');
      }
    });
  }
}

async function loadAttendanceStatus() {
  const badge = document.getElementById('att-status-badge');
  const timeInfo = document.getElementById('att-time-info');
  const btnClockIn = document.getElementById('btn-clockin');
  const btnClockOut = document.getElementById('btn-clockout');

  try {
    const res = await apiFetch('/attendance/today/my-status');
    todayAttendance = res;

    if (res && res.record) {
      const rec = res.record;
      if (rec.checkOutTime) {
        if (badge) {
          badge.innerText = 'Checked Out';
          badge.className = 'px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-700 border border-slate-200';
        }
        if (timeInfo) timeInfo.innerText = `In: ${rec.checkInTime} | Out: ${rec.checkOutTime} (${rec.workingHours || 0} hrs)`;
        if (btnClockIn) btnClockIn.disabled = true;
        if (btnClockOut) btnClockOut.disabled = true;
      } else if (rec.checkInTime) {
        const isLate = rec.status === 'Late';
        if (badge) {
          badge.innerText = isLate ? 'Late (Active Shift)' : 'Clocked In (Active)';
          badge.className = isLate 
            ? 'px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-200' 
            : 'px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200';
        }
        if (timeInfo) timeInfo.innerText = `Clocked in at ${rec.checkInTime}`;
        if (btnClockIn) btnClockIn.disabled = true;
        if (btnClockOut) btnClockOut.disabled = false;
      }
    } else {
      if (badge) {
        badge.innerText = 'Not Checked In';
        badge.className = 'px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-50 text-rose-700 border border-rose-200';
      }
      if (timeInfo) timeInfo.innerText = 'Shift: 09:00 AM - 06:00 PM';
      if (btnClockIn) btnClockIn.disabled = false;
      if (btnClockOut) btnClockOut.disabled = true;
    }
  } catch (err) {
    if (badge) {
      badge.innerText = 'Offline Mode';
      badge.className = 'px-2 py-0.5 text-[10px] font-bold rounded-full bg-gray-100 text-gray-700 border border-gray-200';
    }
  }
}

async function handleClockIn() {
  const btnClockIn = document.getElementById('btn-clockin');
  if (btnClockIn) btnClockIn.disabled = true;

  try {
    const res = await apiFetch('/attendance/check-in', {
      method: 'POST',
      body: {}
    });
    showToast(res.message || 'Clocked in successfully!', 'success');
    await loadAttendanceStatus();
  } catch (err) {
    showToast(err.message || 'Failed to clock in', 'error');
    if (btnClockIn) btnClockIn.disabled = false;
  }
}

async function handleClockOut() {
  const btnClockOut = document.getElementById('btn-clockout');
  if (btnClockOut) btnClockOut.disabled = true;

  try {
    const res = await apiFetch('/attendance/check-out', {
      method: 'POST',
      body: {}
    });
    showToast(res.message || 'Clocked out successfully!', 'success');
    await loadAttendanceStatus();
  } catch (err) {
    showToast(err.message || 'Failed to clock out', 'error');
    if (btnClockOut) btnClockOut.disabled = false;
  }
}

async function loadPieceRateEarnings() {
  const earningsEl = document.getElementById('stat-earnings');
  if (!earningsEl) return;

  try {
    const res = await apiFetch('/transactions/piece-rate/ledger');
    if (Array.isArray(res)) {
      // Find entries for this worker or today
      const workerId = user._id || user.id;
      const workerEntries = res.filter(r => String(r.workerId) === String(workerId) || r.workerName === user.name);
      const totalEarnings = workerEntries.reduce((sum, item) => sum + (Number(item.totalAmount) || 0), 0);
      earningsEl.innerText = formatCurrency(totalEarnings);
    }
  } catch (err) {
    earningsEl.innerText = '₹0';
  }
}

function switchTab(filterName) {
  currentFilter = filterName;
  document.querySelectorAll('.filter-tab').forEach(tab => tab.classList.remove('active'));

  if (filterName === 'all') document.getElementById('tab-all')?.classList.add('active');
  if (filterName === 'pending') document.getElementById('tab-pending')?.classList.add('active');
  if (filterName === 'completed') document.getElementById('tab-completed')?.classList.add('active');

  renderTaskList();
}

async function loadWorkerTasks() {
  try {
    // 1. Fetch tasks assigned to worker
    let fetched = await apiFetch('/tasks');
    
    // 2. Also fetch active job cards in worker department
    let jobCards = [];
    try {
      jobCards = await apiFetch(`/production/job-cards?department=${encodeURIComponent(user.department || 'Cutting')}`);
    } catch (e) {}

    let combined = [];

    if (Array.isArray(fetched) && fetched.length > 0) {
      combined = fetched.map(t => ({
        id: t.id || `task-${Math.random()}`,
        title: t.title || 'Garment Production Job',
        description: t.description || 'Follow standard operating procedure and quality specifications.',
        department: t.department || user.department || 'Production',
        priority: t.priority || 'Medium',
        status: t.status || 'Pending',
        progress: t.status === 'Completed' ? 100 : (t.progress || 30),
        targetPieces: t.targetPieces || 100,
        completedPieces: t.status === 'Completed' ? 100 : (t.completedPieces || 30),
        dueDate: t.dueDate || 'Today, 5:00 PM',
        batchCode: t.batchCode || 'BATCH-STD-01',
        fabric: t.fabric || 'Standard Fabric',
        image: t.image ? (t.image.startsWith('http') ? t.image : `${BASE_URL}${t.image}`) : 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=800&q=80'
      }));
    }

    if (Array.isArray(jobCards) && jobCards.length > 0) {
      const jcMapped = jobCards.map(jc => ({
        id: jc.id,
        title: `Job Card: ${jc.stage} — Order #${jc.orderNumber || ''}`,
        description: `Execute ${jc.stage} for production run. Target: ${jc.targetQuantity} units at piece rate ₹${jc.pieceRate || 0}/pc.`,
        department: jc.department || user.department || 'Production',
        priority: 'High',
        status: jc.status === 'Completed' ? 'Completed' : 'Pending',
        progress: jc.status === 'Completed' ? 100 : Math.round(((jc.completedQuantity || 0) / (jc.targetQuantity || 1)) * 100),
        targetPieces: jc.targetQuantity || 100,
        completedPieces: jc.completedQuantity || 0,
        dueDate: 'Today, 6:00 PM',
        batchCode: jc.jobCardNumber || `JC-${jc.stage.substring(0, 3).toUpperCase()}`,
        fabric: 'Work Order Spec',
        image: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=800&q=80'
      }));
      combined = [...combined, ...jcMapped];
    }

    if (combined.length > 0) {
      allWorkerTasks = combined;
      saveTasksToCache();
    } else {
      loadFallbackTasks();
    }
  } catch (err) {
    loadFallbackTasks();
  }

  updateMetrics();
  renderTaskList();
}

function loadFallbackTasks() {
  const cached = localStorage.getItem(LOCAL_TASKS_KEY);
  if (cached) {
    try {
      allWorkerTasks = JSON.parse(cached);
      return;
    } catch (e) {}
  }

  const dept = user.department || 'Cutting';
  allWorkerTasks = [
    {
      id: 'task-c1',
      title: "Precision Pattern Cutting — Men's Italian Wool Suit Jacket",
      description: "Perform computerized CAD marker layout and precision laser cutting for 150 pieces of Italian Wool Twill Charcoal.",
      department: dept,
      priority: 'High',
      status: 'Pending',
      progress: 45,
      targetPieces: 150,
      completedPieces: 68,
      dueDate: 'Today, 5:00 PM',
      batchCode: 'BATCH-W24-08',
      fabric: '100% Italian Wool Twill (Charcoal)',
      image: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=800&q=80'
    }
  ];
  saveTasksToCache();
}

export function saveTasksToCache() {
  localStorage.setItem(LOCAL_TASKS_KEY, JSON.stringify(allWorkerTasks));
}

function updateMetrics() {
  const total = allWorkerTasks.length;
  const pending = allWorkerTasks.filter(t => t.status === 'Pending' || t.status === 'In Progress').length;
  const completed = allWorkerTasks.filter(t => t.status === 'Completed' || t.status === 'Reviewed').length;

  const statPending = document.getElementById('stat-pending');
  const statCompleted = document.getElementById('stat-completed');
  const countAll = document.getElementById('count-all');
  const countPending = document.getElementById('count-pending');
  const countCompleted = document.getElementById('count-completed');

  if (statPending) statPending.innerText = pending;
  if (statCompleted) statCompleted.innerText = completed;
  if (countAll) countAll.innerText = total;
  if (countPending) countPending.innerText = pending;
  if (countCompleted) countCompleted.innerText = completed;
}

function renderTaskList() {
  const container = document.getElementById('worker-tasks-list');
  if (!container) return;

  let filtered = allWorkerTasks.filter(task => {
    if (currentFilter === 'pending') {
      if (task.status === 'Completed' || task.status === 'Reviewed') return false;
    }
    if (currentFilter === 'completed') {
      if (task.status !== 'Completed' && task.status !== 'Reviewed') return false;
    }

    if (searchQuery) {
      const matchTitle = (task.title || '').toLowerCase().includes(searchQuery);
      const matchDesc = (task.description || '').toLowerCase().includes(searchQuery);
      const matchDept = (task.department || '').toLowerCase().includes(searchQuery);
      const matchBatch = (task.batchCode || '').toLowerCase().includes(searchQuery);
      if (!matchTitle && !matchDesc && !matchDept && !matchBatch) return false;
    }

    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="col-span-full bg-white rounded-3xl border border-gray-200/80 shadow-2xs p-10 text-center text-gray-500 my-4">
        <div class="text-4xl mb-3">✨</div>
        <h3 class="font-bold text-base text-gray-900">No tasks found</h3>
        <p class="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
          ${searchQuery ? 'No production tasks match your search filter.' : 'You have no assigned tasks in this view.'}
        </p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(task => {
    const isCompleted = task.status === 'Completed' || task.status === 'Reviewed';
    const progressVal = task.progress !== undefined ? task.progress : (isCompleted ? 100 : 35);
    
    let priorityBadge = 'bg-amber-50 text-amber-700 border-amber-200';
    if (task.priority === 'High') priorityBadge = 'bg-rose-50 text-rose-700 border-rose-200';
    if (task.priority === 'Low') priorityBadge = 'bg-slate-50 text-slate-600 border-slate-200';

    let statusClass = 'bg-amber-50 text-amber-800 border-amber-200';
    let statusLabel = 'In Progress';
    if (isCompleted) {
      statusClass = 'bg-emerald-50 text-emerald-800 border-emerald-200';
      statusLabel = 'Completed';
    } else if (task.status === 'Not Completed') {
      statusClass = 'bg-rose-50 text-rose-800 border-rose-200';
      statusLabel = 'Needs Attention';
    }

    const taskImage = task.image || 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=800&q=80';

    return `
      <div class="bg-white rounded-3xl border border-gray-200/90 shadow-2xs p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
        
        <div class="space-y-3.5">
          <!-- Top Tag Row -->
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-md border ${priorityBadge}">
                ${task.priority || 'Normal'}
              </span>
              <span class="px-2.5 py-0.5 text-[11px] font-bold rounded-full border ${statusClass}">
                ${statusLabel}
              </span>
            </div>
            ${task.batchCode ? `
              <span class="text-[10px] font-mono font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                ${task.batchCode}
              </span>
            ` : ''}
          </div>

          <!-- Garment Thumbnail & Title -->
          <div class="flex items-start gap-3">
            <img 
              src="${taskImage}" 
              alt="Garment Spec" 
              class="w-14 h-14 rounded-2xl object-cover ring-1 ring-gray-100 shrink-0"
            />
            <div class="flex-1 min-w-0">
              <h3 class="font-extrabold text-gray-950 text-sm leading-snug line-clamp-2">
                ${escapeHtml(task.title)}
              </h3>
              <div class="text-[11px] text-gray-500 font-medium flex items-center gap-2 mt-1">
                <span>🏢 ${escapeHtml(task.department)}</span>
                <span>•</span>
                <span>📅 ${task.dueDate}</span>
              </div>
            </div>
          </div>

          <!-- Progress Bar & Piece Counter -->
          <div class="bg-gray-50/90 rounded-2xl p-3 border border-gray-100 space-y-1.5">
            <div class="flex justify-between items-center text-[11px] font-bold">
              <span class="text-gray-500">Output Target</span>
              <span class="text-[#124b4f]">${task.completedPieces || 0} / ${task.targetPieces || 100} pcs</span>
            </div>
            <div class="w-full bg-gray-200/80 rounded-full h-2 overflow-hidden">
              <div 
                class="h-full rounded-full transition-all duration-500 ${isCompleted ? 'bg-emerald-500' : 'bg-[#124b4f]'}" 
                style="width: ${progressVal}%"
              ></div>
            </div>
          </div>
        </div>

        <!-- Action Button -->
        <div class="mt-4 pt-3 border-t border-gray-100">
          <a 
            href="worker-task.html?id=${encodeURIComponent(task.id)}" 
            class="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl text-xs font-extrabold transition-all cursor-pointer ${
              isCompleted 
                ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' 
                : 'bg-[#124b4f] hover:bg-[#0c383b] text-white shadow-xs'
            }"
          >
            <span>${isCompleted ? 'Review Job Summary' : 'View Spec & Update'}</span>
            <span>→</span>
          </a>
        </div>

      </div>
    `;
  }).join('');
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
