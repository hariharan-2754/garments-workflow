import { apiFetch, getUser, logout, showToast } from './api.js';

const user = getUser();
if (!user || user.role !== 'ADMIN') {
  window.location.href = '/login.html';
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('user-name').innerText = user.name;
  document.getElementById('logout-btn').addEventListener('click', logout);

  // Mobile Menu Controls
  const sidebar = document.getElementById('sidebar');
  const toggleBtn = document.getElementById('mobile-menu-toggle');
  const closeBtn = document.getElementById('mobile-menu-close');

  toggleBtn.addEventListener('click', () => {
    sidebar.classList.remove('-translate-x-full');
  });

  closeBtn.addEventListener('click', () => {
    sidebar.classList.add('-translate-x-full');
  });

  loadDepartments();

  // Add Department Submit
  const form = document.getElementById('add-dept-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('dept-name');
    const name = input.value.trim();
    const btn = document.getElementById('add-btn');

    if (!name) return;

    btn.disabled = true;
    btn.innerText = 'Adding...';

    try {
      await apiFetch('/departments', {
        method: 'POST',
        body: { name }
      });

      showToast('Department added successfully!', 'success');
      input.value = '';
      loadDepartments();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerText = 'Add Department';
    }
  });
});

async function loadDepartments() {
  const tbody = document.getElementById('departments-table-body');
  try {
    const depts = await apiFetch('/departments');
    
    if (depts.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="2" class="px-6 py-8 text-center text-gray-400">
            No departments created yet. Enter a name above to add one.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = depts.map(d => `
      <tr class="hover:bg-gray-50 transition-colors">
        <td class="px-6 py-4 text-gray-900 font-semibold">${escapeHtml(d.name)}</td>
        <td class="px-6 py-4 text-right font-medium text-gray-600">${d.workerCount}</td>
      </tr>
    `).join('');

  } catch (err) {
    showToast(err.message, 'error');
    tbody.innerHTML = `
      <tr>
        <td colspan="2" class="px-6 py-8 text-center text-red-500 font-semibold">
          Failed to load departments.
        </td>
      </tr>
    `;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
