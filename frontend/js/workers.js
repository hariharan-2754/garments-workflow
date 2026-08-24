import { apiFetch, getUser, logout, showToast } from './api.js';

const user = getUser();
if (!user || user.role !== 'ADMIN') {
  window.location.href = '/login.html';
}

document.addEventListener('DOMContentLoaded', async () => {
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

  // Load departments dropdown and workers table
  await loadDepartmentsDropdown();
  loadWorkers();

  // Add Worker Submit
  const form = document.getElementById('add-worker-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('worker-name').value.trim();
    const email = document.getElementById('worker-email').value.trim();
    const password = document.getElementById('worker-password').value;
    const department = document.getElementById('worker-dept').value;
    const phone = document.getElementById('worker-phone').value.trim();
    const btn = document.getElementById('add-btn');

    if (!name || !email || !password || !department || !phone) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    btn.disabled = true;
    btn.innerText = 'Adding...';

    try {
      await apiFetch('/workers', {
        method: 'POST',
        body: {
          name,
          email,
          password,
          department,
          phone,
          role: 'WORKER'
        }
      });

      showToast('Worker added successfully!', 'success');
      form.reset();
      loadWorkers();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerText = 'Add Worker';
    }
  });
});

async function loadDepartmentsDropdown() {
  const deptSelect = document.getElementById('worker-dept');
  try {
    const depts = await apiFetch('/departments');
    deptSelect.innerHTML = `
      <option value="">Select a department...</option>
      ${depts.map(d => `<option value="${escapeHtml(d.name)}">${escapeHtml(d.name)}</option>`).join('')}
    `;
  } catch (_) {
    showToast('Failed to load departments', 'error');
  }
}

async function loadWorkers() {
  const tbody = document.getElementById('workers-table-body');
  try {
    const workers = await apiFetch('/workers');
    
    if (workers.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="px-6 py-8 text-center text-gray-400">
            No workers registered yet. Use the form above to add one.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = workers.map(w => `
      <tr class="hover:bg-gray-50 transition-colors">
        <td class="px-6 py-4 text-gray-900 font-semibold">${escapeHtml(w.name)}</td>
        <td class="px-6 py-4 text-gray-700">${escapeHtml(w.department)}</td>
        <td class="px-6 py-4 text-gray-600">${escapeHtml(w.phone)}</td>
        <td class="px-6 py-4 text-gray-500">${escapeHtml(w.email)}</td>
        <td class="px-6 py-4 text-right">
          <span class="px-2 py-0.5 text-xs font-semibold rounded bg-green-50 text-green-700 border border-green-200">Active</span>
        </td>
      </tr>
    `).join('');

  } catch (err) {
    showToast(err.message, 'error');
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="px-6 py-8 text-center text-red-500 font-semibold">
          Failed to load workers.
        </td>
      </tr>
    `;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
