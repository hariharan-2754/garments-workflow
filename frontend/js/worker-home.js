import { apiFetch, getUser, logout, showToast } from './api.js';

const user = getUser();
if (!user || user.role !== 'WORKER') {
  window.location.href = '/login.html';
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('worker-header-name').innerText = user.name;
  document.getElementById('logout-btn').addEventListener('click', logout);

  loadWorkerTasks();
  
  // Refresh tasks every 15 seconds
  setInterval(loadWorkerTasks, 15000);
});

async function loadWorkerTasks() {
  const container = document.getElementById('worker-tasks-list');
  try {
    const tasks = await apiFetch('/tasks');

    // Count stats
    const total = tasks.length;
    const pending = tasks.filter(t => t.status === 'Pending').length;
    const completed = tasks.filter(t => t.status === 'Completed').length;
    const notCompleted = tasks.filter(t => t.status === 'Not Completed').length;

    document.getElementById('tasks-count').innerText = `${total} Assigned`;
    document.getElementById('stat-pending').innerText = pending;
    document.getElementById('stat-completed').innerText = completed;
    document.getElementById('stat-not-completed').innerText = notCompleted;

    if (total === 0) {
      container.innerHTML = `
        <div class="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center text-gray-500">
          <div class="text-3xl mb-2">🎉</div>
          <h3 class="font-semibold text-base text-gray-900">All caught up!</h3>
          <p class="text-sm text-gray-500 mt-1">No tasks have been assigned to you yet.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = tasks.map(t => {
      let statusClass = 'status-pending';
      if (t.status === 'Completed') statusClass = 'status-completed';
      if (t.status === 'Not Completed') statusClass = 'status-not-completed';
      if (t.status === 'Reviewed') statusClass = 'status-reviewed';

      let priorityClass = 'priority-medium';
      if (t.priority === 'Low') priorityClass = 'priority-low';
      if (t.priority === 'High') priorityClass = 'priority-high';

      return `
        <div class="bg-white rounded-lg border border-gray-200 shadow-sm p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover-effect">
          <div class="space-y-1.5 flex-1 min-w-0">
            <div class="flex items-center flex-wrap gap-2">
              <span class="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded ${priorityClass}">${t.priority}</span>
              <span class="px-2 py-0.5 text-xs font-semibold rounded-full ${statusClass}">${t.status}</span>
            </div>
            <h3 class="font-bold text-gray-900 text-base truncate">${escapeHtml(t.title)}</h3>
            <div class="text-xs text-gray-500 flex flex-wrap gap-3">
              <span>🏢 ${escapeHtml(t.department)}</span>
              <span>📅 Due: ${t.dueDate}</span>
            </div>
          </div>
          <div class="flex items-center">
            <a href="worker-task.html?id=${t.id}" 
              class="w-full md:w-auto text-center bg-blue-50 text-blue-600 hover:bg-blue-100 px-5 py-2 rounded-lg text-sm font-semibold border border-blue-200 transition-colors">
              View Task
            </a>
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    showToast(err.message, 'error');
    container.innerHTML = `
      <div class="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center text-red-500 font-semibold">
        Failed to load tasks. Please refresh.
      </div>
    `;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
