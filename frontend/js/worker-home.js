import { apiFetch, getUser, logout, showToast, BASE_URL } from './api.js';

const user = getUser();
if (!user || user.role !== 'WORKER') {
  window.location.href = '/login.html';
}

// Local cache key for offline / demo task persistence
const LOCAL_TASKS_KEY = 'gf_worker_tasks_cache';

// Rich department specific initial seed tasks for smooth demo experience
const DEMO_TASKS_BY_DEPT = {
  'Cutting': [
    {
      id: 'task-c1',
      title: "Precision Pattern Cutting — Men's Italian Wool Suit Jacket",
      description: "Perform computerized CAD marker layout and precision laser cutting for 150 pieces of Italian Wool Twill Charcoal.\n\nKey Specs:\n- Grain alignment within ±1mm tolerance\n- Match check pattern across lapel notch\n- Bundle cut plies in lots of 25 with barcode tags",
      department: 'Cutting',
      priority: 'High',
      status: 'Pending',
      progress: 45,
      targetPieces: 150,
      completedPieces: 68,
      dueDate: 'Today, 5:00 PM',
      batchCode: 'BATCH-W24-08',
      fabric: '100% Italian Wool Twill (Charcoal)',
      image: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=800&q=80'
    },
    {
      id: 'task-c2',
      title: "Collar & Lapel Interlining Slicing — Linen Slim Blazer",
      description: "Cut fusible canvas interlining and lapel chest canvas for summer linen collection.\n\nSpecs:\n- Cut on 45° true bias\n- Fuse sample test piece before batch processing",
      department: 'Cutting',
      priority: 'Medium',
      status: 'Pending',
      progress: 10,
      targetPieces: 200,
      completedPieces: 20,
      dueDate: 'Tomorrow, 12:00 PM',
      batchCode: 'BATCH-L24-19',
      fabric: 'Pure Italian Linen (Khaki)',
      image: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80'
    },
    {
      id: 'task-c3',
      title: "Silk Jacquard Tuxedo Lining Sizing & Bundling",
      description: "Batch cutting completed with zero fabric pull. Inspected and dispatched to stitching department.",
      department: 'Cutting',
      priority: 'Low',
      status: 'Completed',
      progress: 100,
      targetPieces: 80,
      completedPieces: 80,
      dueDate: 'Yesterday',
      batchCode: 'BATCH-T24-03',
      fabric: 'Silk Jacquard (Midnight Blue)',
      image: 'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?auto=format&fit=crop&w=800&q=80'
    }
  ],
  'Stitching': [
    {
      id: 'task-s1',
      title: "Double-Stitch Armhole Seaming — Formal Navy Blazer",
      description: "Join sleeve crown to shoulder with sleeve head roll padding. Ensure clean lockstitch without puckering.\n\nSpecs:\n- 12-14 stitches per inch\n- Thread #40 Poly Core Navy",
      department: 'Stitching',
      priority: 'High',
      status: 'Pending',
      progress: 60,
      targetPieces: 120,
      completedPieces: 72,
      dueDate: 'Today, 6:00 PM',
      batchCode: 'BATCH-N24-11',
      fabric: 'Navy Worsted Wool Blend',
      image: 'https://images.unsplash.com/photo-1598808503746-f34c53b9323e?auto=format&fit=crop&w=800&q=80'
    },
    {
      id: 'task-s2',
      title: "Buttonhole & Lapel Top-Stitching — British Tweed Jacket",
      description: "Execute keyhole boutonnière buttonhole on left lapel and 4 sleeve kissing buttons.\n\nSpecs:\n- Silk twist thread contrast edging",
      department: 'Stitching',
      priority: 'Medium',
      status: 'Pending',
      progress: 25,
      targetPieces: 90,
      completedPieces: 22,
      dueDate: 'Tomorrow, 3:00 PM',
      batchCode: 'BATCH-B24-05',
      fabric: 'Scottish Tweed Wool',
      image: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=800&q=80'
    },
    {
      id: 'task-s3',
      title: "Waistcoat Lining Assembly & Edge Piping",
      description: "Front darts and back adjustment cinch strap stitching completed and pressed.",
      department: 'Stitching',
      priority: 'Low',
      status: 'Completed',
      progress: 100,
      targetPieces: 100,
      completedPieces: 100,
      dueDate: 'Oct 04, 2026',
      batchCode: 'BATCH-V24-02',
      fabric: 'Emerald Velvet Satin',
      image: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80'
    }
  ],
  'Quality Check': [
    {
      id: 'task-q1',
      title: "Final Seam & Symmetry QC — Italian Slim-Fit Tuxedo",
      description: "Comprehensive 24-point garment audit:\n1. Lapel symmetry and roll curvature\n2. Shoulder slope balance\n3. Vent alignment and hem level\n4. Button security and thread trimming",
      department: 'Quality Check',
      priority: 'High',
      status: 'Pending',
      progress: 75,
      targetPieces: 50,
      completedPieces: 38,
      dueDate: 'Today, 4:30 PM',
      batchCode: 'BATCH-QC-09',
      fabric: 'Super 150s Black Wool',
      image: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80'
    },
    {
      id: 'task-q2',
      title: "Tensile Strength & Color Fastness Inspection",
      description: "Sample test 10 random units from batch for seam pull strength (min 250N) and rub fastness.",
      department: 'Quality Check',
      priority: 'Medium',
      status: 'Pending',
      progress: 0,
      targetPieces: 250,
      completedPieces: 0,
      dueDate: 'Tomorrow, 11:00 AM',
      batchCode: 'BATCH-QC-14',
      fabric: 'Premium Shirting Twill',
      image: 'https://images.unsplash.com/photo-1598808503746-f34c53b9323e?auto=format&fit=crop&w=800&q=80'
    }
  ]
};

let allWorkerTasks = [];
let currentFilter = 'all';
let searchQuery = '';

document.addEventListener('DOMContentLoaded', () => {
  setupWorkerUI();
  setupEventListeners();
  loadWorkerTasks();
});

function setupWorkerUI() {
  const headerName = document.getElementById('worker-header-name');
  const greetingName = document.getElementById('worker-greeting-name');
  const deptBadge = document.getElementById('worker-dept-badge');
  const deptText = document.getElementById('worker-dept-text');
  const avatarImg = document.getElementById('worker-avatar-img');

  if (user) {
    if (headerName) headerName.innerText = user.name || 'Worker';
    if (greetingName) greetingName.innerText = (user.name || 'Operator').split(' ')[0];
    
    const dept = user.department || 'Cutting';
    if (deptText) deptText.innerText = `${dept} Station`;
    if (deptBadge) deptBadge.title = `Assigned to ${dept} Department`;

    // Personalized avatar based on name
    if (avatarImg) {
      if (user.email && user.email.includes('priya')) {
        avatarImg.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80';
      } else if (user.email && user.email.includes('arjun')) {
        avatarImg.src = 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80';
      } else {
        avatarImg.src = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80';
      }
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
  const container = document.getElementById('worker-tasks-list');
  
  try {
    // Attempt backend fetch with fast timeout
    let fetched = await apiFetch('/tasks');
    
    // Normalize backend task data to include standard properties
    if (Array.isArray(fetched) && fetched.length > 0) {
      allWorkerTasks = fetched.map(t => ({
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
        fabric: t.fabric || 'Standard Wool Blend',
        image: t.image ? (t.image.startsWith('http') ? t.image : `${BASE_URL}${t.image}`) : 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=800&q=80'
      }));
    } else {
      loadFallbackTasks();
    }
  } catch (err) {
    // Offline or demo fallback
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
  const seed = DEMO_TASKS_BY_DEPT[dept] || DEMO_TASKS_BY_DEPT['Cutting'];
  allWorkerTasks = JSON.parse(JSON.stringify(seed));
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
    // Filter tab
    if (currentFilter === 'pending') {
      if (task.status === 'Completed' || task.status === 'Reviewed') return false;
    }
    if (currentFilter === 'completed') {
      if (task.status !== 'Completed' && task.status !== 'Reviewed') return false;
    }

    // Search query
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
    const isPending = !isCompleted;
    
    const progressVal = task.progress !== undefined ? task.progress : (isCompleted ? 100 : 35);
    
    // Priority Tag styling
    let priorityBadge = 'bg-amber-50 text-amber-700 border-amber-200';
    if (task.priority === 'High') priorityBadge = 'bg-rose-50 text-rose-700 border-rose-200';
    if (task.priority === 'Low') priorityBadge = 'bg-slate-50 text-slate-600 border-slate-200';

    // Status Tag styling
    let statusClass = 'status-pill-pending';
    let statusLabel = 'In Progress';
    if (isCompleted) {
      statusClass = 'status-pill-completed';
      statusLabel = 'Completed';
    } else if (task.status === 'Not Completed') {
      statusClass = 'status-pill-not-completed';
      statusLabel = 'Needs Attention';
    }

    const taskImage = task.image || 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=800&q=80';

    return `
      <div class="bg-white rounded-3xl border border-gray-200/90 shadow-2xs p-5 flex flex-col justify-between task-card-hover group">
        
        <div class="space-y-3.5">
          <!-- Top Tag Row -->
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-md border ${priorityBadge}">
                ${task.priority || 'Normal'}
              </span>
              <span class="px-2.5 py-0.5 text-[11px] font-bold rounded-full ${statusClass}">
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
              class="w-14 h-14 rounded-2xl object-cover ring-1 ring-gray-100 shrink-0 group-hover:scale-105 transition-transform"
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
              <span class="text-[#124b4f]">${task.completedPieces || (isCompleted ? task.targetPieces : Math.round(task.targetPieces * 0.45))} / ${task.targetPieces || 100} pcs</span>
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
            href="worker-task.html?id=${task.id}" 
            class="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl text-xs font-extrabold transition-all cursor-pointer ${
              isCompleted 
                ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' 
                : 'bg-[#124b4f] hover:bg-[#0c383b] text-white shadow-sm hover:shadow'
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
