import { apiFetch, getUser, logout, showToast } from './api.js';

const user = getUser();
if (!user || user.role !== 'ADMIN') {
  window.location.href = '/login.html';
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('user-name').innerText = user.name;
  document.getElementById('logout-btn').addEventListener('click', logout);

  const sidebar = document.getElementById('sidebar');
  const toggleBtn = document.getElementById('mobile-menu-toggle');
  const closeBtn = document.getElementById('mobile-menu-close');

  toggleBtn.addEventListener('click', () => {
    sidebar.classList.remove('-translate-x-full');
  });

  closeBtn.addEventListener('click', () => {
    sidebar.classList.add('-translate-x-full');
  });

  loadTasks();
  setInterval(loadTasks, 5000);
});

async function loadTasks() {
  try {
    const tasks = await apiFetch('/tasks');
    
    const total = tasks.length;
    const pending = tasks.filter(t => t.status === 'Pending').length;
    const completed = tasks.filter(t => t.status === 'Completed').length;
    const notCompleted = tasks.filter(t => t.status === 'Not Completed').length;

    document.getElementById('stat-total').innerText = total;
    document.getElementById('stat-pending').innerText = pending;
    document.getElementById('stat-completed').innerText = completed;
    document.getElementById('stat-not-completed').innerText = notCompleted;

    const tbody = document.getElementById('tasks-table-body');
    if (total === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="px-6 py-8 text-center text-gray-400">
            No tasks assigned yet. Go to <a href="assign-task.html" class="text-blue-600 font-semibold underline">Assign Task</a> to create one.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = tasks.map(t => {
      let statusClass = 'status-pending';
      if (t.status === 'Completed') statusClass = 'status-completed';
      if (t.status === 'Not Completed') statusClass = 'status-not-completed';
      if (t.status === 'Reviewed') statusClass = 'status-reviewed';

      let priorityClass = 'priority-medium';
      if (t.priority === 'Low') priorityClass = 'priority-low';
      if (t.priority === 'High') priorityClass = 'priority-high';

      let actionBtn = '';
      if (t.status === 'Completed' || t.status === 'Not Completed') {
        actionBtn = `
          <button onclick="updateTaskStatus('${t.id}', 'Reviewed')" 
            class="bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs px-2.5 py-1.5 rounded font-semibold border border-blue-200 transition-colors mr-2">
            ✓ Review
          </button>
        `;
      }

      const deleteBtn = `
        <button onclick="deleteTask('${t.id}')" 
          class="text-red-500 hover:text-red-700 text-xs px-2 py-1.5 rounded font-semibold hover:bg-red-50 transition-colors">
          🗑 Delete
        </button>
      `;

      return `
        <tr class="hover:bg-gray-50 transition-colors">
          <td class="px-6 py-4">
            <div class="font-semibold text-gray-900">${escapeHtml(t.title)}</div>
            <div class="text-xs text-gray-500 mt-0.5 max-w-xs truncate">${escapeHtml(t.description)}</div>
            ${t.image ? `<a href="http://localhost:8000${t.image}" target="_blank" class="text-xs text-blue-500 hover:underline flex items-center mt-1">🖼 View Reference</a>` : ''}
          </td>
          <td class="px-6 py-4 text-gray-700 font-medium">${escapeHtml(t.workerName || '—')}</td>
          <td class="px-6 py-4 text-gray-600">${escapeHtml(t.department)}</td>
          <td class="px-6 py-4">
            <span class="px-2.5 py-1 text-xs font-semibold rounded-full ${statusClass}">${t.status}</span>
            <span class="px-2 py-0.5 text-[10px] font-medium rounded ml-1 uppercase tracking-wider ${priorityClass}">${t.priority}</span>
          </td>
          <td class="px-6 py-4 text-gray-500 whitespace-nowrap">${t.dueDate}</td>
          <td class="px-6 py-4 text-xs text-gray-400 whitespace-nowrap">${formatTime(t.updatedAt)}</td>
          <td class="px-6 py-4 text-right whitespace-nowrap">${actionBtn}${deleteBtn}</td>
        </tr>
      `;
    }).join('');

  } catch (err) {
    showToast(err.message, 'error');
  }
}

window.updateTaskStatus = async (taskId, status) => {
  try {
    await apiFetch(`/tasks/${taskId}/status`, {
      method: 'PUT',
      body: { status }
    });
    showToast(`Task successfully marked as ${status}`, 'success');
    loadTasks();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

window.deleteTask = async (taskId) => {
  if (!confirm('Are you sure you want to delete this task?')) return;
  try {
    await apiFetch(`/tasks/${taskId}`, {
      method: 'DELETE'
    });
    showToast('Task deleted successfully', 'success');
    loadTasks();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

function formatTime(isoString) {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch (_) {
    return isoString;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
