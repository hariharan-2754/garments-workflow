import { apiFetch, requireAuth, renderERPNavigation, showToast } from './api.js';

let allEmployees = [];

document.addEventListener('DOMContentLoaded', async () => {
  const user = requireAuth(['ADMIN', 'MANAGER', 'SUPERVISOR']);
  if (!user) return;

  renderERPNavigation('workers');

  // Mobile menu toggle
  const mobileToggle = document.getElementById('mobile-menu-toggle');
  const sidebar = document.getElementById('erp-sidebar');
  if (mobileToggle && sidebar) {
    mobileToggle.addEventListener('click', () => {
      sidebar.classList.toggle('-translate-x-full');
    });
  }

  // Filters
  document.getElementById('search-worker')?.addEventListener('input', filterAndRender);
  document.getElementById('filter-dept')?.addEventListener('change', filterAndRender);
  document.getElementById('filter-role')?.addEventListener('change', filterAndRender);

  // Modal
  const modal = document.getElementById('worker-modal');
  document.getElementById('open-worker-modal')?.addEventListener('click', () => modal.classList.remove('hidden'));
  document.getElementById('close-worker-modal')?.addEventListener('click', () => modal.classList.add('hidden'));
  document.getElementById('cancel-worker-btn')?.addEventListener('click', () => modal.classList.add('hidden'));

  // Form submit
  document.getElementById('worker-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      name: document.getElementById('emp-name').value,
      email: document.getElementById('emp-email').value,
      password: document.getElementById('emp-password').value,
      phone: document.getElementById('emp-phone').value,
      department: document.getElementById('emp-department').value,
      designation: document.getElementById('emp-designation').value,
      role: document.getElementById('emp-role').value,
      shift: document.getElementById('emp-shift').value,
      salary: parseFloat(document.getElementById('emp-salary').value || 0),
      employmentType: 'Full-Time',
      status: 'Active'
    };

    try {
      await apiFetch('/employees', { method: 'POST', body: payload });
      showToast('Employee registered successfully', 'success');
      modal.classList.add('hidden');
      document.getElementById('worker-form').reset();
      loadEmployees();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  await loadEmployees();
});

async function loadEmployees() {
  const tbody = document.getElementById('workers-tbody');
  if (!tbody) return;

  try {
    allEmployees = await apiFetch('/employees');
    filterAndRender();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="py-6 text-center text-red-500">Failed to load employees: ${err.message}</td></tr>`;
  }
}

function filterAndRender() {
  const tbody = document.getElementById('workers-tbody');
  if (!tbody) return;

  const search = document.getElementById('search-worker')?.value.toLowerCase().trim() || '';
  const dept = document.getElementById('filter-dept')?.value || '';
  const role = document.getElementById('filter-role')?.value || '';

  const filtered = allEmployees.filter(e => {
    if (search && !e.name.toLowerCase().includes(search) && !e.email.toLowerCase().includes(search) && !(e.phone || '').includes(search)) return false;
    if (dept && e.department !== dept) return false;
    if (role && e.role !== role) return false;
    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="py-6 text-center text-gray-400">No employees match filters.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(e => {
    const roleBadge = e.role === 'ADMIN' 
      ? 'bg-rose-50 text-rose-700 border-rose-200' 
      : e.role === 'MANAGER' 
      ? 'bg-purple-50 text-purple-700 border-purple-200' 
      : e.role === 'SUPERVISOR' 
      ? 'bg-blue-50 text-blue-700 border-blue-200' 
      : 'bg-teal-50 text-teal-800 border-teal-200';

    return `
      <tr class="hover:bg-gray-50/70">
        <td class="py-3 px-4">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center font-bold text-[#124b4f] text-xs">
              ${e.name.charAt(0)}
            </div>
            <div>
              <p class="font-bold text-gray-950">${e.name}</p>
              <p class="text-[11px] text-gray-500 font-mono">${e.email}</p>
            </div>
          </div>
        </td>
        <td class="py-3 px-4 font-bold text-gray-800">${e.designation || 'Staff'}</td>
        <td class="py-3 px-4 text-gray-700 font-semibold">${e.department || 'General'}</td>
        <td class="py-3 px-4">
          <span class="px-2 py-0.5 rounded text-[10px] font-bold border ${roleBadge}">${e.role}</span>
        </td>
        <td class="py-3 px-4 text-gray-600 text-xs">${e.shift || 'General'} / ${e.employmentType || 'Full-Time'}</td>
        <td class="py-3 px-4 font-mono text-gray-700 text-xs">${e.phone || '-'}</td>
        <td class="py-3 px-4">
          <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            ${e.status || 'Active'}
          </span>
        </td>
      </tr>
    `;
  }).join('');
}
