import { apiFetch, getUser, logout, showToast } from './api.js';

// Redirect if not logged in
const user = getUser();
if (!user || user.role !== 'ADMIN') {
  // Allow demo access or redirect
  if (!user) {
    window.location.href = '/login.html';
  }
}

// 4-Step Pipeline Stages Thumbnails
const PIPELINE_STEPS = [
  'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=150&q=80', // Fabric roll
  'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=150&q=80', // Cutting pattern
  'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=150&q=80', // Stitching machine
  'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=150&q=80', // Finished garment
];

// Initial Tasks matching the screenshot template & content
const MOCK_WORKER_CARDS = [
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
    price: 320
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
    price: 320
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
    price: 360
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
    price: 280
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
    price: 300
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
    price: 320
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
    price: 300
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
    price: 240
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
    price: 220
  }
];

let allCards = [...MOCK_WORKER_CARDS];
let activeModalCard = null;

document.addEventListener('DOMContentLoaded', () => {
  // Set user email in header
  if (user) {
    const emailHeader = document.getElementById('user-email-header');
    if (emailHeader) emailHeader.innerText = user.email || 'admin@garmentflow.com';
  }

  // Logout Handlers
  const headerLogout = document.getElementById('header-logout-btn');
  const sidebarLogout = document.getElementById('sidebar-logout-btn');
  if (headerLogout) headerLogout.addEventListener('click', logout);
  if (sidebarLogout) sidebarLogout.addEventListener('click', logout);

  // View Toggles (Grid vs List)
  const gridToggle = document.getElementById('view-grid-toggle');
  const listToggle = document.getElementById('view-list-toggle');
  const navGridBtn = document.getElementById('nav-grid-btn');
  const navListBtn = document.getElementById('nav-list-btn');
  const gridContainer = document.getElementById('cards-grid-container');
  const listContainer = document.getElementById('cards-list-container');

  function setGridView() {
    if (gridContainer) gridContainer.classList.remove('hidden');
    if (listContainer) listContainer.classList.add('hidden');
    if (gridToggle) {
      gridToggle.className = 'px-2.5 py-1 rounded bg-[#174953] text-white text-xs font-bold shadow-2xs';
      listToggle.className = 'px-2.5 py-1 rounded text-gray-500 hover:text-gray-800 text-xs font-bold';
    }
  }

  function setListView() {
    if (gridContainer) gridContainer.classList.add('hidden');
    if (listContainer) listContainer.classList.remove('hidden');
    if (listToggle) {
      listToggle.className = 'px-2.5 py-1 rounded bg-[#174953] text-white text-xs font-bold shadow-2xs';
      gridToggle.className = 'px-2.5 py-1 rounded text-gray-500 hover:text-gray-800 text-xs font-bold';
    }
    renderListView();
  }

  if (gridToggle) gridToggle.addEventListener('click', setGridView);
  if (listToggle) listToggle.addEventListener('click', setListView);
  if (navGridBtn) navGridBtn.addEventListener('click', setGridView);
  if (navListBtn) navListBtn.addEventListener('click', setListView);

  // Search and Filter Listeners
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
  const resetBtn = document.getElementById('reset-filter-btn');

  if (priceSlider) {
    priceSlider.addEventListener('input', (e) => {
      const val = e.target.value;
      if (priceBadge) priceBadge.innerText = `$${val}`;
      if (priceMaxText) priceMaxText.innerText = `$${val}`;
      applyFilters();
    });
  }

  if (topSearch) topSearch.addEventListener('input', applyFilters);
  if (workerNameInput) workerNameInput.addEventListener('input', applyFilters);
  if (taskTypeSelect) taskTypeSelect.addEventListener('change', applyFilters);
  if (jobStatusSelect) jobStatusSelect.addEventListener('change', applyFilters);
  if (pHigh) pHigh.addEventListener('change', applyFilters);
  if (pMed) pMed.addEventListener('change', applyFilters);
  if (pLow) pLow.addEventListener('change', applyFilters);

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (workerNameInput) workerNameInput.value = '';
      if (topSearch) topSearch.value = '';
      if (taskTypeSelect) taskTypeSelect.value = '';
      if (jobStatusSelect) jobStatusSelect.value = 'In Progress';
      if (priceSlider) {
        priceSlider.value = 500;
        if (priceBadge) priceBadge.innerText = '$500';
        if (priceMaxText) priceMaxText.innerText = '$500';
      }
      if (pHigh) pHigh.checked = true;
      if (pMed) pMed.checked = true;
      if (pLow) pLow.checked = true;
      applyFilters();
    });
  }

  // Update / Reassign Modal Setup
  const updateModal = document.getElementById('update-modal');
  const closeUpdateBtn = document.getElementById('close-update-modal');
  const cancelUpdateBtn = document.getElementById('cancel-update-btn');
  const updateForm = document.getElementById('update-task-form');

  function closeModal() {
    if (updateModal) updateModal.classList.add('hidden');
    activeModalCard = null;
  }

  if (closeUpdateBtn) closeUpdateBtn.addEventListener('click', closeModal);
  if (cancelUpdateBtn) cancelUpdateBtn.addEventListener('click', closeModal);

  if (updateForm) {
    updateForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!activeModalCard) return;

      const newWorker = document.getElementById('modal-worker-select').value;
      const newStatus = document.getElementById('modal-status-select').value;

      activeModalCard.workerName = newWorker;
      activeModalCard.task = `${newStatus} T-Shirt`;
      activeModalCard.department = newStatus;

      closeModal();
      renderCards();
      showToast(`Job ${activeModalCard.jobId} updated: Assigned to ${newWorker}`, 'success');
    });
  }

  // Initial Render & Backend Sync
  renderCards();
  syncBackendTasks();
});

// Filter logic
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
    if (topSearch && !c.task.toLowerCase().includes(topSearch) && !c.workerName.toLowerCase().includes(topSearch)) {
      return false;
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

  renderCards(filtered);
}

// Render 3-column Worker Task Cards matching the screenshot
function renderCards(cards = allCards) {
  const container = document.getElementById('cards-grid-container');
  if (!container) return;

  if (cards.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-12 text-center bg-white rounded-xl border border-gray-200 p-6">
        <p class="text-xs text-gray-500 font-bold">No tasks found matching your filter criteria.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = cards.map(c => {
    return `
      <div class="bg-white rounded-xl border border-gray-200/90 p-3 flex flex-col justify-between shadow-2xs hover:shadow-sm transition-all text-xs">
        
        <!-- Header: Worker Avatar & Info Block -->
        <div class="flex items-start gap-2.5 mb-2.5">
          <img 
            src="${c.workerAvatar}" 
            alt="${escapeHtml(c.workerName)}" 
            class="w-11 h-11 rounded-lg object-cover border border-gray-200 shrink-0"
          />
          <div class="flex-1 min-w-0 leading-tight">
            <div class="font-bold text-gray-900 truncate">
              Worker Name: <span class="text-gray-950">${escapeHtml(c.workerName)}</span>
            </div>
            <div class="text-[11px] text-gray-500 font-mono mt-0.5">
              Job ID: <span class="font-bold text-gray-700">${escapeHtml(c.jobId)}</span>
            </div>
            <div class="text-[11px] text-gray-700 font-semibold truncate mt-0.5">
              Assigned Task: <span class="text-teal-900">${escapeHtml(c.task)}</span>
            </div>
          </div>
        </div>

        <!-- Middle: Task Progress & 4-Stage Thumbnails Pipeline -->
        <div class="my-2">
          <div class="flex items-center justify-between text-[10px] font-bold text-gray-600 mb-1">
            <span>Task Progress</span>
          </div>

          <!-- Progress Bar -->
          <div class="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden flex mb-2.5">
            <div class="bg-[#174953] h-full" style="width: ${c.progress}%"></div>
            <div class="bg-[#f97316] h-full" style="width: 15%"></div>
          </div>

          <!-- 4-Stage Thumbnails Row -->
          <div class="grid grid-cols-4 gap-1 items-center bg-gray-50 p-1.5 rounded-lg border border-gray-100">
            <div class="relative group">
              <img src="${PIPELINE_STEPS[0]}" class="w-full aspect-square rounded object-cover border border-gray-200" title="Fabric Roll" />
              <span class="absolute -right-1 top-1/2 -translate-y-1/2 text-[9px] text-gray-400 font-bold hidden sm:inline">&gt;</span>
            </div>
            <div class="relative group">
              <img src="${PIPELINE_STEPS[1]}" class="w-full aspect-square rounded object-cover border border-gray-200" title="Pattern Cutting" />
              <span class="absolute -right-1 top-1/2 -translate-y-1/2 text-[9px] text-gray-400 font-bold hidden sm:inline">&gt;</span>
            </div>
            <div class="relative group">
              <img src="${PIPELINE_STEPS[2]}" class="w-full aspect-square rounded object-cover border border-gray-200" title="Machine Stitching" />
              <span class="absolute -right-1 top-1/2 -translate-y-1/2 text-[9px] text-gray-400 font-bold hidden sm:inline">&gt;</span>
            </div>
            <div class="relative group">
              <img src="${PIPELINE_STEPS[3]}" class="w-full aspect-square rounded object-cover border border-gray-200" title="Finished Garment" />
            </div>
          </div>
        </div>

        <!-- Footer: Admin Info & Action Button -->
        <div class="pt-2 border-t border-gray-100 flex items-center justify-between gap-1 text-[11px]">
          <div class="text-gray-500 truncate text-[10.5px]">
            Assigning Admin:<br />
            <span class="font-bold text-gray-800">Admin: ${escapeHtml(c.admin)}</span>
          </div>

          <!-- UPDATE / REASSIGN BUTTON (Matching Soft Teal in Screenshot) -->
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

// Global modal trigger
window.openUpdateModal = (cardId) => {
  const card = allCards.find(c => c.id === cardId);
  if (!card) return;
  activeModalCard = card;

  document.getElementById('modal-job-id').value = card.jobId;
  document.getElementById('modal-worker-select').value = card.workerName;
  document.getElementById('modal-status-select').value = card.department || 'Cutting';
  
  const modal = document.getElementById('update-modal');
  if (modal) modal.classList.remove('hidden');
};

function renderListView() {
  const tbody = document.getElementById('tasks-table-body');
  if (!tbody) return;

  tbody.innerHTML = allCards.map(c => `
    <tr class="hover:bg-gray-50">
      <td class="p-2.5 font-bold text-gray-900">${escapeHtml(c.workerName)}</td>
      <td class="p-2.5 font-mono text-gray-500">${escapeHtml(c.jobId)}</td>
      <td class="p-2.5 text-teal-900 font-semibold">${escapeHtml(c.task)}</td>
      <td class="p-2.5">
        <span class="px-2 py-0.5 bg-teal-50 text-teal-800 font-bold rounded text-[10px]">${c.progress}%</span>
      </td>
      <td class="p-2.5 text-gray-600">${escapeHtml(c.admin)}</td>
      <td class="p-2.5 text-right">
        <button onclick="window.openUpdateModal('${c.id}')" class="text-xs text-teal-800 font-bold hover:underline">
          Reassign
        </button>
      </td>
    </tr>
  `).join('');
}

// Sync with backend API
async function syncBackendTasks() {
  try {
    const tasks = await apiFetch('/tasks');
    if (tasks && tasks.length > 0) {
      tasks.forEach((t, i) => {
        allCards.unshift({
          id: t.id || `live-${i}`,
          workerName: t.workerName || 'Assigned Worker',
          workerAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80',
          jobId: `GF-${1020 + i}`,
          task: t.title || 'Cutting T-Shirt',
          department: t.department || 'Cutting',
          admin: 'Admin User',
          progress: t.status === 'Completed' ? 100 : 50,
          status: t.status || 'In Progress',
          priority: t.priority || 'High',
          price: 320
        });
      });
      renderCards();
    }
  } catch (_) {
    // Offline fallback uses MOCK_WORKER_CARDS cleanly
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
