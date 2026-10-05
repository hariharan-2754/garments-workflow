import { apiFetch, getUser, logout, showToast } from './api.js';

// Redirect if not logged in
const user = getUser();
if (!user || user.role !== 'ADMIN') {
  if (!user) {
    window.location.href = '/login.html';
  }
}

// Initial Mock Worker Task Cards exactly matching the screenshot
const INITIAL_WORKER_TASKS = [
  {
    id: 'gf-1010',
    workerName: 'Worker David Chen',
    workerAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    jobId: 'Job ID: GF-1010',
    actionImage: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=800&q=85',
    task: 'Stitching T-Shirt',
    progress: 75,
    admin: 'Marla Lopez'
  },
  {
    id: 'gf-1011-cut',
    workerName: 'Li Wei',
    workerAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
    jobId: 'Job ID: GF-1011',
    actionImage: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=800&q=85',
    task: 'Cutting',
    progress: 85,
    admin: 'Marla Lopez'
  },
  {
    id: 'gf-1011-print',
    workerName: 'Amara Okafor',
    workerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    jobId: 'Job ID: GF-1011',
    actionImage: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=85',
    task: 'Printing T-Shirt',
    progress: 40,
    admin: 'Marla Lopez'
  },
  {
    id: 'gf-1012',
    workerName: 'Worker Maria',
    workerAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80',
    jobId: 'Job ID: GF-1012',
    actionImage: 'https://images.unsplash.com/photo-1516257984-b1b4d707412e?auto=format&fit=crop&w=800&q=85',
    task: 'Assigns Cutting & Spreading',
    progress: 90,
    admin: 'Marla Lopez'
  },
  {
    id: 'gf-1013',
    workerName: 'Arjun Patel',
    workerAvatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=150&q=80',
    jobId: 'Job ID: GF-1013',
    actionImage: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?auto=format&fit=crop&w=800&q=85',
    task: 'Quality Inspection & Grading',
    progress: 60,
    admin: 'Marla Lopez'
  },
  {
    id: 'gf-1014',
    workerName: 'Priya Sharma',
    workerAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80',
    jobId: 'Job ID: GF-1014',
    actionImage: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=800&q=85',
    task: 'Collar & Hem Overlock Stitching',
    progress: 50,
    admin: 'Marla Lopez'
  },
  {
    id: 'gf-1015',
    workerName: 'Ravi Kumar',
    workerAvatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=150&q=80',
    jobId: 'Job ID: GF-1015',
    actionImage: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=800&q=85',
    task: 'Pattern CAD Plotting',
    progress: 80,
    admin: 'Marla Lopez'
  },
  {
    id: 'gf-1016',
    workerName: 'Elena Rostova',
    workerAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&q=80',
    jobId: 'Job ID: GF-1016',
    actionImage: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=800&q=85',
    task: 'Multi-head Embroidery Detailing',
    progress: 35,
    admin: 'Marla Lopez'
  },
  {
    id: 'gf-1017',
    workerName: 'Marcus Vance',
    workerAvatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=150&q=80',
    jobId: 'Job ID: GF-1017',
    actionImage: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=85',
    task: 'Steam Pressing & Export Packaging',
    progress: 95,
    admin: 'Marla Lopez'
  }
];

let tasksState = [];
try {
  const saved = localStorage.getItem('gf_dashboard_tasks');
  tasksState = saved ? JSON.parse(saved) : [...INITIAL_WORKER_TASKS];
} catch (_) {
  tasksState = [...INITIAL_WORKER_TASKS];
}

let activeTargetTaskId = null;

document.addEventListener('DOMContentLoaded', () => {
  // Update Profile Info
  if (user) {
    const nameEl = document.getElementById('user-display-name');
    const emailEl = document.getElementById('user-display-email');
    if (nameEl) nameEl.innerText = user.name || 'Admin User';
    if (emailEl) emailEl.innerText = user.email || 'admin@garmentflow.com';
  }

  // Profile Dropdown Toggle
  const profileTrigger = document.getElementById('profile-menu-trigger');
  const profileDropdown = document.getElementById('profile-dropdown');
  const dropdownLogoutBtn = document.getElementById('dropdown-logout-btn');

  if (profileTrigger && profileDropdown) {
    profileTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      profileDropdown.classList.toggle('hidden');
    });

    document.addEventListener('click', () => {
      profileDropdown.classList.add('hidden');
    });
  }

  if (dropdownLogoutBtn) {
    dropdownLogoutBtn.addEventListener('click', logout);
  }

  // Header "+ New Task" Button
  const headerNewBtn = document.getElementById('header-new-task-btn');
  const newModal = document.getElementById('new-task-modal');
  const closeNewBtn = document.getElementById('close-new-modal');
  const cancelNewBtn = document.getElementById('cancel-new-btn');
  const newForm = document.getElementById('new-task-form');

  function openNewModal() {
    if (newModal) newModal.classList.remove('hidden');
  }
  function closeNewModal() {
    if (newModal) newModal.classList.add('hidden');
    if (newForm) newForm.reset();
  }

  if (headerNewBtn) headerNewBtn.addEventListener('click', openNewModal);
  if (closeNewBtn) closeNewBtn.addEventListener('click', closeNewModal);
  if (cancelNewBtn) cancelNewBtn.addEventListener('click', closeNewModal);

  if (newForm) {
    newForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = document.getElementById('new-task-title').value.trim();
      const worker = document.getElementById('new-worker-select').value;
      const progress = parseInt(document.getElementById('new-progress-input').value, 10) || 30;

      const newTask = {
        id: `gf-${Date.now()}`,
        workerName: worker,
        workerAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
        jobId: `Job ID: GF-${Math.floor(1000 + Math.random() * 900)}`,
        actionImage: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=800&q=85',
        task: title,
        progress: progress,
        admin: 'Marla Lopez'
      };

      tasksState.unshift(newTask);
      saveState();
      closeNewModal();
      renderTasks();
      showToast(`Job ${newTask.jobId} created and assigned to ${worker}!`, 'success');
    });
  }

  // Assign Modal Handlers
  const assignModal = document.getElementById('assign-modal');
  const closeAssignBtn = document.getElementById('close-assign-modal');
  const cancelAssignBtn = document.getElementById('cancel-assign-btn');
  const assignForm = document.getElementById('assign-form');

  function closeAssignModal() {
    if (assignModal) assignModal.classList.add('hidden');
    activeTargetTaskId = null;
  }

  if (closeAssignBtn) closeAssignBtn.addEventListener('click', closeAssignModal);
  if (cancelAssignBtn) cancelAssignBtn.addEventListener('click', closeAssignModal);

  if (assignForm) {
    assignForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const task = tasksState.find(t => t.id === activeTargetTaskId);
      if (task) {
        const newWorker = document.getElementById('assign-worker-select').value;
        task.workerName = newWorker;
        saveState();
        closeAssignModal();
        renderTasks();
        showToast(`Task ${task.jobId} successfully reassigned to ${newWorker}`, 'success');
      }
    });
  }

  // Update Progress Modal Handlers
  const updateModal = document.getElementById('update-modal');
  const closeUpdateBtn = document.getElementById('close-update-modal');
  const cancelUpdateBtn = document.getElementById('cancel-update-btn');
  const updateForm = document.getElementById('update-form');

  function closeUpdateModal() {
    if (updateModal) updateModal.classList.add('hidden');
    activeTargetTaskId = null;
  }

  if (closeUpdateBtn) closeUpdateBtn.addEventListener('click', closeUpdateModal);
  if (cancelUpdateBtn) cancelUpdateBtn.addEventListener('click', closeUpdateModal);

  if (updateForm) {
    updateForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const task = tasksState.find(t => t.id === activeTargetTaskId);
      if (task) {
        const stage = document.getElementById('update-stage-select').value;
        const pct = parseInt(document.getElementById('update-progress-input').value, 10) || 50;
        task.task = stage;
        task.progress = Math.min(Math.max(pct, 0), 100);
        saveState();
        closeUpdateModal();
        renderTasks();
        showToast(`Updated progress for ${task.jobId} to ${task.progress}%`, 'success');
      }
    });
  }

  // Initial Render
  renderTasks();
  syncBackend();
});

// Render the 3-Column Large Cards Grid
function renderTasks() {
  const container = document.getElementById('worker-cards-grid');
  const countEl = document.getElementById('pipeline-count');
  if (!container) return;

  if (countEl) countEl.innerText = tasksState.length;

  container.innerHTML = tasksState.map(t => {
    return `
      <div class="bg-white rounded-2xl p-4 shadow-2xs border border-gray-100 flex flex-col justify-between hover:shadow-md transition-all group">
        
        <!-- Top: Worker Header (Compact) -->
        <div class="flex items-center gap-3">
          <img 
            src="${t.workerAvatar}" 
            alt="${escapeHtml(t.workerName)}" 
            class="w-10 h-10 rounded-xl object-cover border border-gray-100 shadow-2xs shrink-0"
          />
          <div class="flex-1 min-w-0">
            <h3 class="text-sm font-bold text-gray-950 tracking-tight leading-tight truncate">
              ${escapeHtml(t.workerName)}
            </h3>
            <p class="text-[10.5px] font-semibold text-gray-400 font-mono mt-0.5">
              ${escapeHtml(t.jobId)}
            </p>
          </div>
        </div>

        <!-- Center: Factory Action Production Image (Compact & Proportional) -->
        <div class="my-3 relative rounded-xl overflow-hidden bg-gray-100 h-40 sm:h-44 w-full shadow-2xs">
          <img 
            src="${t.actionImage}" 
            alt="${escapeHtml(t.task)}" 
            class="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
            loading="lazy"
          />
        </div>

        <!-- Details & Task Progress Section -->
        <div class="space-y-2.5">
          
          <!-- Assigned Task -->
          <div class="text-xs font-bold text-gray-900 leading-snug truncate">
            Assigned Task: <span class="font-bold text-gray-950">${escapeHtml(t.task)}</span>
          </div>

          <!-- Task Progress Bar -->
          <div>
            <div class="flex items-center justify-between text-[11px] font-medium text-gray-500 mb-1">
              <span>Task Progress</span>
              <span class="font-extrabold text-gray-950 font-mono">${t.progress}%</span>
            </div>
            <div class="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div class="bg-[#124b4f] h-full rounded-full transition-all duration-500" style="width: ${t.progress}%"></div>
            </div>
          </div>

          <!-- Footer: Assigning Admin & Action Buttons -->
          <div class="pt-2.5 border-t border-gray-100 flex items-center justify-between gap-1.5">
            <div class="text-[10.5px] text-gray-500 leading-tight">
              <span>Assigning Admin:</span><br />
              <span class="font-bold text-gray-800">Admin: ${escapeHtml(t.admin)}</span>
            </div>

            <!-- Action Buttons: [ ASSIGN ] and [ UPDATE ] -->
            <div class="flex flex-col items-end gap-1 shrink-0">
              <button 
                onclick="window.triggerAssign('${t.id}')"
                class="px-3.5 py-1 bg-[#124b4f] hover:bg-[#0c383b] text-white text-[10px] font-extrabold uppercase rounded-lg transition-all shadow-2xs active:scale-[0.98] cursor-pointer"
              >
                ASSIGN
              </button>
              <button 
                onclick="window.triggerUpdate('${t.id}')"
                class="px-3.5 py-1 bg-[#e4f2f3] hover:bg-[#d0ebed] text-[#124b4f] text-[10px] font-extrabold uppercase rounded-lg transition-all active:scale-[0.98] cursor-pointer"
              >
                UPDATE
              </button>
            </div>
          </div>

        </div>

      </div>
    `;
  }).join('');
}

// Global modal triggers
window.triggerAssign = (id) => {
  const task = tasksState.find(t => t.id === id);
  if (!task) return;
  activeTargetTaskId = id;

  document.getElementById('assign-job-id').value = task.jobId;
  document.getElementById('assign-worker-select').value = task.workerName;

  const modal = document.getElementById('assign-modal');
  if (modal) modal.classList.remove('hidden');
};

window.triggerUpdate = (id) => {
  const task = tasksState.find(t => t.id === id);
  if (!task) return;
  activeTargetTaskId = id;

  document.getElementById('update-job-id').value = task.jobId;
  document.getElementById('update-progress-input').value = task.progress;

  const modal = document.getElementById('update-modal');
  if (modal) modal.classList.remove('hidden');
};

function saveState() {
  try {
    localStorage.setItem('gf_dashboard_tasks', JSON.stringify(tasksState));
  } catch (_) {}
}

async function syncBackend() {
  try {
    const tasks = await apiFetch('/tasks');
    if (tasks && tasks.length > 0) {
      tasks.forEach(t => {
        if (!tasksState.some(item => item.id === t.id)) {
          tasksState.unshift({
            id: t.id,
            workerName: t.workerName || 'Worker David Chen',
            workerAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
            jobId: `Job ID: GF-${t.id.substring(0, 4)}`,
            actionImage: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=800&q=85',
            task: t.title,
            progress: t.status === 'Completed' ? 100 : 65,
            admin: 'Marla Lopez'
          });
        }
      });
      renderTasks();
    }
  } catch (_) {}
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
