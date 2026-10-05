import { apiFetch, getUser, logout, showToast } from './api.js';

// Redirect if not logged in
const user = getUser();
if (!user || user.role !== 'ADMIN') {
  if (!user) {
    window.location.href = '/login.html';
  }
}

// 4-Step Pipeline Stage Thumbnails
const PIPELINE_STEPS = [
  { name: 'Fabric Roll', stage: 'Cutting', progress: 25, img: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=150&q=80' },
  { name: 'Pattern Cutting', stage: 'Stitching', progress: 50, img: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=150&q=80' },
  { name: 'Machine Stitching', stage: 'Printing', progress: 75, img: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=150&q=80' },
  { name: 'Finished Garment', stage: 'Completed', progress: 100, img: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=150&q=80' }
];

// Initial Tasks matching the screenshot template & content
const DEFAULT_CARDS = [
  {
    id: 'gf-1',
    workerName: 'David Chen',
    workerAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80',
    jobId: 'GF-1011',
    task: 'Stitching T-Shirt',
    department: 'Stitching',
    admin: 'Maria Lopez',
    progress: 75,
    status: 'In Progress',
    priority: 'High',
    price: 320,
    dueDate: '2026-10-06'
  },
  {
    id: 'gf-2',
    workerName: 'Li Wei',
    workerAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80',
    jobId: 'GF-1011',
    task: 'Cutting T-Shirt',
    department: 'Cutting',
    admin: 'Maria Lopez',
    progress: 50,
    status: 'In Progress',
    priority: 'High',
    price: 320,
    dueDate: '2026-10-07'
  },
  {
    id: 'gf-3',
    workerName: 'Amara Okafor',
    workerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
    jobId: 'GF-1011',
    task: 'Printing T-Shirt',
    department: 'Printing',
    admin: 'Maria Lopez',
    progress: 40,
    status: 'In Progress',
    priority: 'High',
    price: 360,
    dueDate: '2026-10-08'
  },
  {
    id: 'gf-4',
    workerName: 'Li Wei',
    workerAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80',
    jobId: 'GF-1010',
    task: 'Cutting',
    department: 'Cutting',
    admin: 'Maria Lopez',
    progress: 85,
    status: 'In Progress',
    priority: 'High',
    price: 280,
    dueDate: '2026-10-06'
  },
  {
    id: 'gf-5',
    workerName: 'Okafor',
    workerAvatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=120&q=80',
    jobId: 'GF-1010',
    task: 'Stitching',
    department: 'Stitching',
    admin: 'Maria Lopez',
    progress: 60,
    status: 'In Progress',
    priority: 'Medium',
    price: 300,
    dueDate: '2026-10-09'
  },
  {
    id: 'gf-6',
    workerName: 'Worker Maria',
    workerAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=120&q=80',
    jobId: 'GF-1011',
    task: 'Assigns Cutting',
    department: 'Cutting',
    admin: 'Maria Lopez',
    progress: 90,
    status: 'In Progress',
    priority: 'High',
    price: 320,
    dueDate: '2026-10-06'
  },
  {
    id: 'gf-7',
    workerName: 'Li Wei',
    workerAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80',
    jobId: 'GF-1011',
    task: 'Embroidery T-Shirt',
    department: 'Embroidery',
    admin: 'Maria Lopez',
    progress: 35,
    status: 'In Progress',
    priority: 'Medium',
    price: 300,
    dueDate: '2026-10-10'
  },
  {
    id: 'gf-8',
    workerName: 'Li Wei',
    workerAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80',
    jobId: 'GF-1011',
    task: 'Cutting',
    department: 'Cutting',
    admin: 'Maria Lopez',
    progress: 70,
    status: 'In Progress',
    priority: 'High',
    price: 240,
    dueDate: '2026-10-07'
  },
  {
    id: 'gf-9',
    workerName: 'Amara Okafor',
    workerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
    jobId: 'GF-1011',
    task: 'Assigned Printing',
    department: 'Printing',
    admin: 'Maria Lopez',
    progress: 45,
    status: 'In Progress',
    priority: 'Low',
    price: 220,
    dueDate: '2026-10-12'
  }
];

// Persistent local state
let allCards = [];
try {
  const saved = localStorage.getItem('gf_worker_cards');
  allCards = saved ? JSON.parse(saved) : [...DEFAULT_CARDS];
} catch (_) {
  allCards = [...DEFAULT_CARDS];
}

let historyLogs = [
  { action: 'Recent Action: David Chen', time: 'Just now' },
  { action: 'Recent Action: Stitching T-Shirt', time: '1 minute ago' },
  { action: 'Recent Action: Cutting T-Shirt', time: '3 minutes ago' },
  { action: 'Recent Action: Quality Check Batch', time: '5 minutes ago' }
];

let activeModalCard = null;
let currentTab = 'orders';

document.addEventListener('DOMContentLoaded', () => {
  // Populate user email
  if (user) {
    const emailHeader = document.getElementById('user-email-header');
    if (emailHeader) emailHeader.innerText = user.email || 'admin@garmentflow.com';
  }

  // Logout Handlers
  const headerLogout = document.getElementById('header-logout-btn');
  const sidebarLogout = document.getElementById('sidebar-logout-btn');
  if (headerLogout) headerLogout.addEventListener('click', logout);
  if (sidebarLogout) sidebarLogout.addEventListener('click', logout);

  // Sub-Navigation Tabs Switching (Dashboard, Orders, Queue, Workers, Analytics)
  const navTabs = document.querySelectorAll('.nav-sub-tab');
  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      setActiveTab(target);
    });
  });

  // Ribbon buttons
  const ribbonBtns = document.querySelectorAll('[data-ribbon]');
  ribbonBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.ribbon;
      if (target === 'create') {
        openCreateModal();
      } else {
        setActiveTab(target);
      }
    });
  });

  // Sidebar Menu Toggles
  const productToggle = document.getElementById('product-tree-toggle');
  const productSubmenu = document.getElementById('product-submenu');
  const productChevron = document.getElementById('product-chevron');
  if (productToggle && productSubmenu) {
    productToggle.addEventListener('click', () => {
      productSubmenu.classList.toggle('hidden');
      if (productChevron) productChevron.innerText = productSubmenu.classList.contains('hidden') ? '▼' : '▲';
    });
  }

  // Sidebar Action Buttons
  const navListBtn = document.getElementById('nav-list-btn');
  const navGridBtn = document.getElementById('nav-grid-btn');
  const navCreateBtn = document.getElementById('nav-create-btn');
  const quickCreateBtn = document.getElementById('quick-create-btn');
  const viewGridToggle = document.getElementById('view-grid-toggle');
  const viewListToggle = document.getElementById('view-list-toggle');

  if (navListBtn) navListBtn.addEventListener('click', () => setViewMode('list'));
  if (navGridBtn) navGridBtn.addEventListener('click', () => setViewMode('grid'));
  if (viewGridToggle) viewGridToggle.addEventListener('click', () => setViewMode('grid'));
  if (viewListToggle) viewListToggle.addEventListener('click', () => setViewMode('list'));
  if (navCreateBtn) navCreateBtn.addEventListener('click', openCreateModal);
  if (quickCreateBtn) quickCreateBtn.addEventListener('click', openCreateModal);

  // Search and Filter Listeners (Real-Time Reactive Updates)
  const topSearch = document.getElementById('top-search-input');
  const workerNameInput = document.getElementById('filter-worker-name');
  const taskTypeSelect = document.getElementById('filter-task-type');
  const jobStatusSelect = document.getElementById('filter-job-status');
  const priceSlider = document.getElementById('price-range');
  const priceBadge = document.getElementById('price-badge');
  const priceMaxText = document.getElementById('price-max-text');
  const pHigh = document.getElementById('priority-high');
  const pMed = document.getElementById('priority-medium');
  const pLow = document.getElementById('priority-low');
  const dueDateSelect = document.getElementById('filter-due-date');
  const resetBtn = document.getElementById('reset-filter-btn');

  function triggerLiveFilter() {
    applyFilters();
  }

  if (priceSlider) {
    priceSlider.addEventListener('input', (e) => {
      const val = e.target.value;
      if (priceBadge) priceBadge.innerText = `$${val}`;
      if (priceMaxText) priceMaxText.innerText = `$${val}`;
      triggerLiveFilter();
    });
  }

  if (topSearch) topSearch.addEventListener('input', triggerLiveFilter);
  if (workerNameInput) workerNameInput.addEventListener('input', triggerLiveFilter);
  if (taskTypeSelect) taskTypeSelect.addEventListener('change', triggerLiveFilter);
  if (jobStatusSelect) jobStatusSelect.addEventListener('change', triggerLiveFilter);
  if (pHigh) pHigh.addEventListener('change', triggerLiveFilter);
  if (pMed) pMed.addEventListener('change', triggerLiveFilter);
  if (pLow) pLow.addEventListener('change', triggerLiveFilter);
  if (dueDateSelect) dueDateSelect.addEventListener('change', triggerLiveFilter);

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (workerNameInput) workerNameInput.value = '';
      if (topSearch) topSearch.value = '';
      if (taskTypeSelect) taskTypeSelect.value = '';
      if (jobStatusSelect) jobStatusSelect.value = 'In Progress';
      if (dueDateSelect) dueDateSelect.value = '';
      if (priceSlider) {
        priceSlider.value = 500;
        if (priceBadge) priceBadge.innerText = '$500';
        if (priceMaxText) priceMaxText.innerText = '$500';
      }
      if (pHigh) pHigh.checked = true;
      if (pMed) pMed.checked = true;
      if (pLow) pLow.checked = true;
      triggerLiveFilter();
      showToast('Filters reset to default', 'info');
    });
  }

  // Update / Reassign Modal Setup
  const updateModal = document.getElementById('update-modal');
  const closeUpdateBtn = document.getElementById('close-update-modal');
  const cancelUpdateBtn = document.getElementById('cancel-update-btn');
  const updateForm = document.getElementById('update-task-form');

  function closeUpdateModal() {
    if (updateModal) updateModal.classList.add('hidden');
    activeModalCard = null;
  }

  if (closeUpdateBtn) closeUpdateBtn.addEventListener('click', closeUpdateModal);
  if (cancelUpdateBtn) cancelUpdateBtn.addEventListener('click', closeUpdateModal);

  if (updateForm) {
    updateForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!activeModalCard) return;

      const newWorker = document.getElementById('modal-worker-select').value;
      const newStatus = document.getElementById('modal-status-select').value;
      const newPriority = document.getElementById('modal-priority-select').value;

      activeModalCard.workerName = newWorker;
      activeModalCard.department = newStatus;
      activeModalCard.task = `${newStatus} T-Shirt`;
      activeModalCard.priority = newPriority;

      if (newStatus === 'Cutting') activeModalCard.progress = 25;
      else if (newStatus === 'Stitching') activeModalCard.progress = 50;
      else if (newStatus === 'Printing') activeModalCard.progress = 75;
      else if (newStatus === 'Quality Check') activeModalCard.progress = 90;
      else if (newStatus === 'Completed') activeModalCard.progress = 100;

      // Log to history
      logAdminAction(`Reassigned ${activeModalCard.jobId} to ${newWorker} (${newStatus})`);

      saveCardsState();
      closeUpdateModal();
      applyFilters();
      updateDynamicMetrics();
      showToast(`Job ${activeModalCard.jobId} updated and reassigned to ${newWorker}`, 'success');
    });
  }

  // Create Task Modal Setup
  const createModal = document.getElementById('create-modal');
  const closeCreateBtn = document.getElementById('close-create-modal');
  const cancelCreateBtn = document.getElementById('cancel-create-btn');
  const createForm = document.getElementById('create-task-form');

  function openCreateModal() {
    if (createModal) createModal.classList.remove('hidden');
  }
  function closeCreateModal() {
    if (createModal) createModal.classList.add('hidden');
    if (createForm) createForm.reset();
  }

  if (closeCreateBtn) closeCreateBtn.addEventListener('click', closeCreateModal);
  if (cancelCreateBtn) cancelCreateBtn.addEventListener('click', closeCreateModal);

  if (createForm) {
    createForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('new-task-name').value.trim();
      const worker = document.getElementById('new-task-worker').value;
      const dept = document.getElementById('new-task-dept').value;
      const price = parseFloat(document.getElementById('new-task-price').value) || 300;
      const priority = document.getElementById('new-task-priority').value;

      const newCard = {
        id: `gf-${Date.now()}`,
        workerName: worker,
        workerAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80',
        jobId: `GF-${Math.floor(1000 + Math.random() * 900)}`,
        task: name,
        department: dept,
        admin: user ? user.name || 'Admin' : 'Maria Lopez',
        progress: 25,
        status: 'In Progress',
        priority: priority,
        price: price,
        dueDate: new Date().toISOString().split('T')[0]
      };

      allCards.unshift(newCard);
      saveCardsState();
      logAdminAction(`Created Task: ${name} assigned to ${worker}`);
      closeCreateModal();
      applyFilters();
      updateDynamicMetrics();
      showToast(`Task "${name}" successfully created and dispatched!`, 'success');
    });
  }

  // Initial Load
  applyFilters();
  updateDynamicMetrics();
  renderHistory();
});

// Switch Active Top Sub-Navigation Tabs
function setActiveTab(tabKey) {
  currentTab = tabKey;
  const navTabs = document.querySelectorAll('.nav-sub-tab');
  navTabs.forEach(t => {
    if (t.dataset.tab === tabKey) {
      t.className = 'nav-sub-tab py-2.5 px-2 border-b-2 border-[#174953] text-[#174953] flex items-center gap-1.5 font-extrabold cursor-pointer';
    } else {
      t.className = 'nav-sub-tab py-2.5 px-2 border-b-2 border-transparent hover:text-teal-800 flex items-center gap-1.5 transition-colors cursor-pointer';
    }
  });

  const titleEl = document.getElementById('main-section-title');
  const subtitleEl = document.getElementById('main-section-subtitle');

  if (tabKey === 'dashboard') {
    setViewMode('overview');
    if (titleEl) titleEl.innerText = 'GarmentFlow: Factory Production Overview';
    if (subtitleEl) subtitleEl.innerText = 'Real-time production KPIs, factory output, and stage throughput';
  } else if (tabKey === 'orders') {
    setViewMode('grid');
    if (titleEl) titleEl.innerText = 'GarmentFlow: Worker Task Dashboard';
    if (subtitleEl) subtitleEl.innerText = `Showing ${allCards.length} active worker jobs in production pipeline`;
  } else if (tabKey === 'queue') {
    setViewMode('list');
    if (titleEl) titleEl.innerText = 'GarmentFlow: Live Task Queue';
    if (subtitleEl) subtitleEl.innerText = 'Tabular production log with real-time status transitions';
  } else if (tabKey === 'workers') {
    setViewMode('list');
    if (titleEl) titleEl.innerText = 'GarmentFlow: Workforce & Machine Operators';
    if (subtitleEl) subtitleEl.innerText = 'Department roster, live capacity, and active worker assignments';
  } else if (tabKey === 'analytics') {
    setViewMode('overview');
    if (titleEl) titleEl.innerText = 'GarmentFlow: Production Workflow Analytics';
    if (subtitleEl) subtitleEl.innerText = 'Department efficiency breakdown, on-time delivery metrics, and defect rates';
  }
}

// Switch between Grid, List, and Overview view modes
function setViewMode(mode) {
  const gridContainer = document.getElementById('cards-grid-container');
  const listContainer = document.getElementById('cards-list-container');
  const overviewContainer = document.getElementById('overview-container');
  const viewGridToggle = document.getElementById('view-grid-toggle');
  const viewListToggle = document.getElementById('view-list-toggle');

  if (gridContainer) gridContainer.classList.add('hidden');
  if (listContainer) listContainer.classList.add('hidden');
  if (overviewContainer) overviewContainer.classList.add('hidden');

  if (mode === 'grid') {
    if (gridContainer) gridContainer.classList.remove('hidden');
    if (viewGridToggle) viewGridToggle.className = 'px-2.5 py-1 rounded bg-[#174953] text-white text-xs font-bold shadow-2xs cursor-pointer';
    if (viewListToggle) viewListToggle.className = 'px-2.5 py-1 rounded text-gray-500 hover:text-gray-800 text-xs font-bold cursor-pointer';
  } else if (mode === 'list') {
    if (listContainer) listContainer.classList.remove('hidden');
    if (viewListToggle) viewListToggle.className = 'px-2.5 py-1 rounded bg-[#174953] text-white text-xs font-bold shadow-2xs cursor-pointer';
    if (viewGridToggle) viewGridToggle.className = 'px-2.5 py-1 rounded text-gray-500 hover:text-gray-800 text-xs font-bold cursor-pointer';
    renderListView();
  } else if (mode === 'overview') {
    if (overviewContainer) overviewContainer.classList.remove('hidden');
  }
}

// Filter Cards logic with real-time feedback
function applyFilters() {
  const topSearch = document.getElementById('top-search-input')?.value.toLowerCase().trim() || '';
  const workerQuery = document.getElementById('filter-worker-name')?.value.toLowerCase().trim() || '';
  const taskType = document.getElementById('filter-task-type')?.value || '';
  const jobStatus = document.getElementById('filter-job-status')?.value || '';
  const maxPrice = parseFloat(document.getElementById('price-range')?.value) || 1000;

  const pHigh = document.getElementById('priority-high')?.checked;
  const pMed = document.getElementById('priority-medium')?.checked;
  const pLow = document.getElementById('priority-low')?.checked;

  const filtered = allCards.filter(c => {
    if (topSearch) {
      const matchTask = c.task.toLowerCase().includes(topSearch);
      const matchWorker = c.workerName.toLowerCase().includes(topSearch);
      const matchJob = c.jobId.toLowerCase().includes(topSearch);
      if (!matchTask && !matchWorker && !matchJob) return false;
    }
    if (workerQuery && !c.workerName.toLowerCase().includes(workerQuery)) {
      return false;
    }
    if (taskType && c.department !== taskType) {
      return false;
    }
    if (jobStatus && jobStatus !== 'All' && c.status !== jobStatus) {
      return false;
    }
    if (c.price > maxPrice) {
      return false;
    }
    if (c.priority === 'High' && !pHigh) return false;
    if (c.priority === 'Medium' && !pMed) return false;
    if (c.priority === 'Low' && !pLow) return false;

    return true;
  });

  const countEl = document.getElementById('active-tasks-count');
  if (countEl) countEl.innerText = filtered.length;

  renderCards(filtered);
  renderListView(filtered);
}

// Render 3-column Worker Task Cards
function renderCards(cards = allCards) {
  const container = document.getElementById('cards-grid-container');
  if (!container) return;

  if (cards.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-12 text-center bg-white rounded-xl border border-gray-200 p-6">
        <p class="text-xs text-gray-500 font-bold">No tasks found matching your filter criteria.</p>
        <button onclick="document.getElementById('reset-filter-btn').click()" class="mt-2 text-xs text-teal-800 font-bold underline">
          Reset filters to show all tasks
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = cards.map(c => {
    return `
      <div class="bg-white rounded-xl border border-gray-200/90 p-3 flex flex-col justify-between shadow-2xs hover:shadow-sm transition-all text-xs group">
        
        <!-- Header: Worker Avatar & Info Block -->
        <div class="flex items-start gap-2.5 mb-2">
          <img 
            src="${c.workerAvatar}" 
            alt="${escapeHtml(c.workerName)}" 
            class="w-10 h-10 rounded-lg object-cover border border-gray-200 shrink-0"
          />
          <div class="flex-1 min-w-0 leading-tight">
            <div class="font-bold text-gray-900 truncate">
              Worker Name: <span class="text-gray-950 font-extrabold">${escapeHtml(c.workerName)}</span>
            </div>
            <div class="text-[11px] text-gray-500 font-mono mt-0.5">
              Job ID: <span class="font-bold text-gray-800">${escapeHtml(c.jobId)}</span>
            </div>
            <div class="text-[11px] text-gray-700 font-semibold truncate mt-0.5">
              Assigned Task: <span class="text-teal-900 font-bold">${escapeHtml(c.task)}</span>
            </div>
          </div>
        </div>

        <!-- Middle: Task Progress & Interactive 4-Stage Thumbnails Pipeline -->
        <div class="my-2">
          <div class="flex items-center justify-between text-[10px] font-bold text-gray-600 mb-1">
            <span>Task Progress</span>
            <span class="font-mono text-teal-800 font-bold">${c.progress}%</span>
          </div>

          <!-- Dynamic Progress Bar -->
          <div class="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden flex mb-2.5">
            <div class="bg-[#174953] h-full transition-all duration-300" style="width: ${c.progress}%"></div>
            <div class="bg-[#f97316] h-full transition-all duration-300" style="width: ${c.progress < 100 ? '15%' : '0%'}"></div>
          </div>

          <!-- 4-Stage Interactive Thumbnails Row (Clickable to advance stage dynamically!) -->
          <div class="grid grid-cols-4 gap-1 items-center bg-gray-50 p-1.5 rounded-lg border border-gray-100">
            ${PIPELINE_STEPS.map((step, idx) => `
              <div 
                onclick="window.advanceStage('${c.id}', ${step.progress}, '${step.stage}')"
                class="relative group cursor-pointer transition-transform hover:scale-105" 
                title="Click to set stage to: ${step.name} (${step.progress}%)"
              >
                <img 
                  src="${step.img}" 
                  class="w-full aspect-square rounded object-cover border ${c.progress >= step.progress ? 'border-teal-700 ring-1 ring-teal-600' : 'border-gray-200 opacity-60'}" 
                />
                ${idx < 3 ? `<span class="absolute -right-1 top-1/2 -translate-y-1/2 text-[9px] text-gray-400 font-bold hidden sm:inline">&gt;</span>` : ''}
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Footer: Admin Info & UPDATE/REASSIGN Button -->
        <div class="pt-2 border-t border-gray-100 flex items-center justify-between gap-1 text-[11px]">
          <div class="text-gray-500 truncate text-[10.5px]">
            Assigning Admin:<br />
            <span class="font-bold text-gray-800">Admin: ${escapeHtml(c.admin)}</span>
          </div>

          <!-- UPDATE / REASSIGN BUTTON (Matching Soft Teal) -->
          <div class="flex items-center gap-1 shrink-0">
            <span class="text-[10px] text-gray-400 hidden sm:inline">Action</span>
            <button 
              onclick="window.openUpdateModal('${c.id}')"
              class="px-2 py-1 bg-[#dff1f2] hover:bg-[#c9e8ea] text-[#174953] border border-[#b2dcdc] text-[10px] font-extrabold uppercase rounded shadow-2xs transition-colors cursor-pointer"
            >
              UPDATE/REASSIGN
            </button>
          </div>
        </div>

      </div>
    `;
  }).join('');
}

// Global action to advance stage directly from the 4-thumbnail pipeline
window.advanceStage = (cardId, progress, stageName) => {
  const card = allCards.find(c => c.id === cardId);
  if (!card) return;

  card.progress = progress;
  card.department = stageName;
  card.task = `${stageName} T-Shirt`;
  if (progress === 100) card.status = 'Completed';
  else card.status = 'In Progress';

  logAdminAction(`Advanced ${card.jobId} (${card.workerName}) to ${stageName} (${progress}%)`);
  saveCardsState();
  applyFilters();
  updateDynamicMetrics();
  showToast(`Updated ${card.jobId} to ${stageName} stage (${progress}%)`, 'success');
};

// Global modal trigger for update/reassign
window.openUpdateModal = (cardId) => {
  const card = allCards.find(c => c.id === cardId);
  if (!card) return;
  activeModalCard = card;

  document.getElementById('modal-job-id').value = card.jobId;
  document.getElementById('modal-worker-select').value = card.workerName;
  document.getElementById('modal-status-select').value = card.department || 'Cutting';
  document.getElementById('modal-priority-select').value = card.priority || 'High';
  
  const modal = document.getElementById('update-modal');
  if (modal) modal.classList.remove('hidden');
};

// Render Table List View
function renderListView(cards = allCards) {
  const tbody = document.getElementById('tasks-table-body');
  if (!tbody) return;

  if (cards.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-gray-400">No active tasks in queue.</td></tr>`;
    return;
  }

  tbody.innerHTML = cards.map(c => `
    <tr class="hover:bg-gray-50/80 transition-colors">
      <td class="p-2.5 font-bold text-gray-900">${escapeHtml(c.workerName)}</td>
      <td class="p-2.5 font-mono text-gray-500">${escapeHtml(c.jobId)}</td>
      <td class="p-2.5 text-teal-900 font-semibold">${escapeHtml(c.task)}</td>
      <td class="p-2.5">
        <div class="flex items-center gap-2">
          <div class="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div class="bg-[#174953] h-full" style="width: ${c.progress}%"></div>
          </div>
          <span class="font-bold text-teal-800 text-[10px]">${c.progress}%</span>
        </div>
      </td>
      <td class="p-2.5 text-gray-600">${escapeHtml(c.admin)}</td>
      <td class="p-2.5 text-right">
        <button onclick="window.openUpdateModal('${c.id}')" class="px-2 py-0.5 bg-teal-50 text-teal-800 font-bold hover:bg-teal-100 rounded text-[10.5px] cursor-pointer">
          Reassign
        </button>
      </td>
    </tr>
  `).join('');
}

// Dynamically Calculate Right-Side Production Metrics
function updateDynamicMetrics() {
  const total = allCards.length;
  const activeCount = allCards.filter(c => c.status !== 'Completed').length;
  const urgentCount = allCards.filter(c => c.priority === 'High').length;
  const completedCount = allCards.filter(c => c.status === 'Completed').length;
  
  const onTimePct = total > 0 ? Math.round(((total - Math.floor(urgentCount * 0.2)) / total) * 100) : 92;

  // Key metrics
  const activeEl = document.getElementById('metric-active-count');
  const activeBar = document.getElementById('metric-active-bar');
  const onTimeEl = document.getElementById('metric-ontime-text');
  const onTimeBar = document.getElementById('metric-ontime-bar');
  const urgentEl = document.getElementById('metric-urgent-count');
  const overviewProd = document.getElementById('overview-in-prod');

  if (activeEl) activeEl.innerText = `(${activeCount})`;
  if (activeBar) activeBar.style.width = `${Math.min(activeCount * 10, 100)}%`;
  if (onTimeEl) onTimeEl.innerText = `(${onTimePct}%)`;
  if (onTimeBar) onTimeBar.style.width = `${onTimePct}%`;
  if (urgentEl) urgentEl.innerText = `(${urgentCount})`;
  if (overviewProd) overviewProd.innerText = `${activeCount} jobs`;

  // Department Workflow Progress Bars
  const depts = ['Cutting', 'Stitching', 'Printing', 'Embroidery', 'Quality Check', 'Packing'];
  const deptContainer = document.getElementById('department-bars-container');
  if (!deptContainer) return;

  deptContainer.innerHTML = depts.map(d => {
    const deptTasks = allCards.filter(c => c.department.toLowerCase().includes(d.toLowerCase()));
    const count = deptTasks.length;
    const pct = total > 0 ? Math.round((count / total) * 100) + 30 : 50;
    const clampedPct = Math.min(pct, 95);

    return `
      <div>
        <div class="flex justify-between text-[11px] font-bold text-gray-700 mb-1">
          <span>${d.toUpperCase()}</span>
          <span class="text-teal-700 font-mono">${clampedPct}%</span>
        </div>
        <div class="w-full h-2 bg-gray-100 rounded-full overflow-hidden flex">
          <div class="bg-[#174953] h-full transition-all duration-500" style="width: ${clampedPct * 0.7}%"></div>
          <div class="bg-[#f97316] h-full transition-all duration-500" style="width: ${clampedPct * 0.2}%"></div>
          <div class="bg-green-500 h-full transition-all duration-500" style="width: ${clampedPct * 0.1}%"></div>
        </div>
      </div>
    `;
  }).join('') + `
    <div class="pt-1 text-center">
      <button onclick="window.toggleMoreDepts()" class="text-[11px] font-bold text-teal-800 hover:text-teal-950 cursor-pointer">
        MORE ▾
      </button>
    </div>
  `;
}

window.toggleMoreDepts = () => {
  showToast('All 6 primary factory production stages are live.', 'info');
};

// Activity Log Feed
function logAdminAction(actionText) {
  historyLogs.unshift({ action: actionText, time: 'Just now' });
  if (historyLogs.length > 5) historyLogs.pop();
  renderHistory();
}

function renderHistory() {
  const feed = document.getElementById('assignment-history-feed');
  if (!feed) return;

  feed.innerHTML = historyLogs.map(item => `
    <div class="p-2 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100/70 transition-colors">
      <div class="text-[11px] font-bold text-gray-800">${escapeHtml(item.action)}</div>
      <div class="text-[10px] text-gray-500 mt-0.5">${escapeHtml(item.time)}</div>
    </div>
  `).join('');
}

function saveCardsState() {
  try {
    localStorage.setItem('gf_worker_cards', JSON.stringify(allCards));
  } catch (_) {}
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
