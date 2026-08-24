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

  // Pre-fill today's date + 1 day as default due date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  document.getElementById('task-due-date').value = tomorrow.toISOString().split('T')[0];

  // Fetch departments dropdown data
  await loadDepartmentsDropdown();

  // Handle Form Submit
  const form = document.getElementById('assign-task-form');
  const deptSelect = document.getElementById('task-department');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = document.getElementById('task-title').value.trim();
    const description = document.getElementById('task-description').value.trim();
    const department = deptSelect.value;
    const priority = document.getElementById('task-priority').value;
    const dueDate = document.getElementById('task-due-date').value;
    const imageFile = document.getElementById('task-image').files[0];
    const submitBtn = document.getElementById('submit-btn');

    if (!title || !description || !department || !dueDate) {
      showToast('Please fill out all required fields', 'error');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerText = 'Assigning...';

    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('department', department);
    formData.append('priority', priority);
    formData.append('dueDate', dueDate);
    if (imageFile) {
      formData.append('image', imageFile);
    }

    try {
      await apiFetch('/tasks', {
        method: 'POST',
        body: formData
      });

      showToast('Task assigned successfully!', 'success');
      form.reset();
      document.getElementById('task-due-date').value = tomorrow.toISOString().split('T')[0];
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerText = 'Assign Task';
    }
  });
});

async function loadDepartmentsDropdown() {
  const deptSelect = document.getElementById('task-department');
  try {
    const depts = await apiFetch('/departments');
    deptSelect.innerHTML = `
      <option value="">Select a department...</option>
      ${depts.map(d => `<option value="${escapeHtml(d.name)}">${escapeHtml(d.name)}</option>`).join('')}
    `;
  } catch (err) {
    showToast('Failed to load departments', 'error');
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
