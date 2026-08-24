import { apiFetch, getUser, logout, showToast } from './api.js';

const user = getUser();
if (!user || user.role !== 'WORKER') {
  window.location.href = '/login.html';
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('logout-btn').addEventListener('click', logout);

  // Get task ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  const taskId = urlParams.get('id');

  if (!taskId) {
    showToast('No task ID specified', 'error');
    setTimeout(() => { window.location.href = '/worker-home.html'; }, 1500);
    return;
  }

  loadTaskDetails(taskId);

  // Action Button Handlers
  const completeBtn = document.getElementById('complete-btn');
  const notCompletedBtn = document.getElementById('not-completed-btn');

  completeBtn.addEventListener('click', () => submitStatus(taskId, 'Completed'));
  notCompletedBtn.addEventListener('click', () => submitStatus(taskId, 'Not Completed'));
});

async function loadTaskDetails(taskId) {
  const loading = document.getElementById('loading-state');
  const content = document.getElementById('task-content');

  try {
    const task = await apiFetch(`/tasks/${taskId}`);
    
    // Set text elements
    document.getElementById('task-title').innerText = task.title;
    document.getElementById('task-desc').innerText = task.description;
    document.getElementById('task-dept').innerText = task.department;
    document.getElementById('task-due-date').innerText = task.dueDate;

    // Badges styling
    const priorityBadge = document.getElementById('task-priority');
    priorityBadge.innerText = task.priority;
    priorityBadge.className = 'px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded';
    if (task.priority === 'Low') priorityBadge.classList.add('priority-low');
    else if (task.priority === 'High') priorityBadge.classList.add('priority-high');
    else priorityBadge.classList.add('priority-medium');

    const statusBadge = document.getElementById('task-status');
    statusBadge.innerText = task.status;
    statusBadge.className = 'px-2 py-0.5 text-xs font-semibold rounded-full';
    if (task.status === 'Completed') statusBadge.classList.add('status-completed');
    else if (task.status === 'Not Completed') statusBadge.classList.add('status-not-completed');
    else if (task.status === 'Reviewed') statusBadge.classList.add('status-reviewed');
    else statusBadge.classList.add('status-pending');

    // Reference Image
    if (task.image) {
      document.getElementById('task-image').src = `http://localhost:8000${task.image}`;
      document.getElementById('image-container').classList.remove('hidden');
    }

    // Determine Action layout based on status
    const actionsContainer = document.getElementById('actions-container');
    const submissionStatus = document.getElementById('submission-status');

    if (task.status === 'Pending') {
      actionsContainer.classList.remove('hidden');
      submissionStatus.classList.add('hidden');
    } else {
      actionsContainer.classList.add('hidden');
      submissionStatus.classList.remove('hidden');
      // Style submission status according to completion state
      if (task.status === 'Completed' || task.status === 'Reviewed') {
        submissionStatus.className = 'p-4 rounded-lg text-center font-bold text-sm bg-green-50 text-green-700 border border-green-200';
        submissionStatus.innerText = 'Response Submitted (Completed)';
      } else {
        submissionStatus.className = 'p-4 rounded-lg text-center font-bold text-sm bg-red-50 text-red-700 border border-red-200';
        submissionStatus.innerText = 'Response Submitted (Not Completed)';
      }
    }

    // Reveal main content and hide loader
    loading.classList.add('hidden');
    content.classList.remove('hidden');

  } catch (err) {
    showToast(err.message, 'error');
    loading.innerText = 'Failed to load task details. Redirecting...';
    setTimeout(() => { window.location.href = '/worker-home.html'; }, 2000);
  }
}

async function submitStatus(taskId, status) {
  const completeBtn = document.getElementById('complete-btn');
  const notCompletedBtn = document.getElementById('not-completed-btn');
  const actionsContainer = document.getElementById('actions-container');
  const submissionStatus = document.getElementById('submission-status');

  // Disable buttons & show loader state
  completeBtn.disabled = true;
  notCompletedBtn.disabled = true;
  if (status === 'Completed') {
    completeBtn.innerText = 'Submitting...';
  } else {
    notCompletedBtn.innerText = 'Submitting...';
  }

  try {
    await apiFetch(`/tasks/${taskId}/status`, {
      method: 'PUT',
      body: { status }
    });

    showToast('Response submitted successfully!', 'success');
    
    // Switch button layout to submitted state
    actionsContainer.classList.add('hidden');
    submissionStatus.classList.remove('hidden');
    
    if (status === 'Completed') {
      submissionStatus.className = 'p-4 rounded-lg text-center font-bold text-sm bg-green-50 text-green-700 border border-green-200';
      submissionStatus.innerText = 'Response Submitted (Completed)';
    } else {
      submissionStatus.className = 'p-4 rounded-lg text-center font-bold text-sm bg-red-50 text-red-700 border border-red-200';
      submissionStatus.innerText = 'Response Submitted (Not Completed)';
    }

    // Update the header status badge dynamically
    const statusBadge = document.getElementById('task-status');
    statusBadge.innerText = status;
    statusBadge.className = 'px-2 py-0.5 text-xs font-semibold rounded-full';
    if (status === 'Completed') statusBadge.classList.add('status-completed');
    else statusBadge.classList.add('status-not-completed');

    // Automatically navigate back to home task list after successful submit
    setTimeout(() => {
      window.location.href = '/worker-home.html';
    }, 1500);

  } catch (err) {
    showToast(err.message, 'error');
    completeBtn.disabled = false;
    notCompletedBtn.disabled = false;
    completeBtn.innerText = '✅ Complete';
    notCompletedBtn.innerText = '❌ Not Completed';
  }
}
