import { apiFetch, requireAuth, renderERPNavigation, showToast } from './api.js';

document.addEventListener('DOMContentLoaded', async () => {
  const user = requireAuth(['ADMIN', 'MANAGER', 'SUPERVISOR']);
  if (!user) return;

  renderERPNavigation('departments');

  // Mobile menu toggle
  const mobileToggle = document.getElementById('mobile-menu-toggle');
  const sidebar = document.getElementById('erp-sidebar');
  if (mobileToggle && sidebar) {
    mobileToggle.addEventListener('click', () => {
      sidebar.classList.toggle('-translate-x-full');
    });
  }

  // Modals
  const modal = document.getElementById('dept-modal');
  document.getElementById('open-dept-modal')?.addEventListener('click', () => modal.classList.remove('hidden'));
  document.getElementById('close-dept-modal')?.addEventListener('click', () => modal.classList.add('hidden'));
  document.getElementById('cancel-dept-btn')?.addEventListener('click', () => modal.classList.add('hidden'));

  // Form submit
  document.getElementById('dept-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('dept-name').value;
    try {
      await apiFetch('/departments', { method: 'POST', body: { name } });
      showToast('Department added successfully', 'success');
      modal.classList.add('hidden');
      document.getElementById('dept-form').reset();
      loadDepartments();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  await loadDepartments();
});

async function loadDepartments() {
  const container = document.getElementById('departments-grid');
  if (!container) return;

  try {
    const depts = await apiFetch('/departments');
    if (!depts || depts.length === 0) {
      container.innerHTML = `<div class="p-8 text-center text-gray-400 col-span-3">No departments configured.</div>`;
      return;
    }

    container.innerHTML = depts.map(d => `
      <div class="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4 flex flex-col justify-between">
        <div class="space-y-2">
          <div class="flex justify-between items-start">
            <span class="text-2xl">🏢</span>
            <span class="px-2.5 py-0.5 bg-teal-50 text-[#124b4f] border border-teal-200 rounded-full text-xs font-bold">
              ${d.workerCount || 0} Workers
            </span>
          </div>
          <h3 class="font-extrabold text-gray-950 text-base">${d.name}</h3>
          <p class="text-xs text-gray-500 font-medium">Core factory manufacturing division</p>
        </div>

        <div class="pt-3 border-t border-gray-100 flex items-center justify-between">
          <a href="assign-task.html" class="text-xs font-bold text-[#124b4f] hover:underline">Assign Tasks →</a>
          <a href="workers.html" class="text-xs font-semibold text-gray-500 hover:text-gray-900">Roster →</a>
        </div>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = `<p class="text-red-500 text-xs">Failed to load departments: ${err.message}</p>`;
  }
}
