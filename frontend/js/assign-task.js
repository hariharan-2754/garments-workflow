import { apiFetch, requireAuth, renderERPNavigation, showToast } from './api.js';

document.addEventListener('DOMContentLoaded', async () => {
  const user = requireAuth(['ADMIN', 'MANAGER', 'SUPERVISOR']);
  if (!user) return;

  renderERPNavigation('assign-task');

  // Mobile menu toggle
  const mobileToggle = document.getElementById('mobile-menu-toggle');
  const sidebar = document.getElementById('erp-sidebar');
  if (mobileToggle && sidebar) {
    mobileToggle.addEventListener('click', () => {
      sidebar.classList.toggle('-translate-x-full');
    });
  }

  // Set default due date +7 days
  const d = new Date();
  d.setDate(d.getDate() + 7);
  const dueInput = document.getElementById('task-duedate');
  if (dueInput) dueInput.value = d.toISOString().split('T')[0];

  // Populate departments
  await loadDepartments();

  // Form submit
  document.getElementById('assign-task-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('title', document.getElementById('task-title').value);
    formData.append('description', document.getElementById('task-desc').value);
    formData.append('department', document.getElementById('task-dept').value);
    formData.append('priority', document.getElementById('task-priority').value);
    formData.append('dueDate', document.getElementById('task-duedate').value);

    const fileInput = document.getElementById('task-image');
    if (fileInput && fileInput.files[0]) {
      formData.append('image', fileInput.files[0]);
    }

    try {
      await apiFetch('/tasks', {
        method: 'POST',
        body: formData
      });
      showToast('Task dispatched to factory department!', 'success');
      window.location.href = 'production.html';
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
});

async function loadDepartments() {
  const select = document.getElementById('task-dept');
  if (!select) return;

  try {
    const depts = await apiFetch('/departments');
    select.innerHTML = (depts || []).map(d => `
      <option value="${d.name}">${d.name}</option>
    `).join('');
  } catch (err) {
    console.error('Error loading departments:', err);
  }
}
