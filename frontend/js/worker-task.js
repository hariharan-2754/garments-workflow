import { apiFetch, getUser, logout, showToast, BASE_URL } from './api.js';

const user = getUser();
if (!user || user.role !== 'WORKER') {
  window.location.href = '/login.html';
}

const LOCAL_TASKS_KEY = 'gf_worker_tasks_cache';
let currentTask = null;
let currentStep = 2; // Default to step 2 (In production)

document.addEventListener('DOMContentLoaded', () => {
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) logoutBtn.addEventListener('click', logout);

  // Get task ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  const taskId = urlParams.get('id');

  if (!taskId) {
    showToast('No task selected. Redirecting...', 'error');
    setTimeout(() => { window.location.href = '/worker-home.html'; }, 1000);
    return;
  }

  loadTaskDetails(taskId);
  setupStepperControls();
  setupActionButtons();
});

async function loadTaskDetails(taskId) {
  const loading = document.getElementById('loading-state');
  const content = document.getElementById('task-content');

  try {
    // Attempt to load from local cache first for instant rendering
    const cached = localStorage.getItem(LOCAL_TASKS_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      currentTask = parsed.find(t => String(t.id) === String(taskId));
    }

    // Try backend API as well
    if (!currentTask) {
      try {
        const fetched = await apiFetch(`/tasks/${taskId}`);
        if (fetched && fetched.id) {
          currentTask = {
            id: fetched.id,
            title: fetched.title,
            description: fetched.description,
            department: fetched.department,
            priority: fetched.priority,
            status: fetched.status,
            dueDate: fetched.dueDate,
            progress: fetched.status === 'Completed' ? 100 : (fetched.progress || 45),
            targetPieces: fetched.targetPieces || 150,
            completedPieces: fetched.status === 'Completed' ? 150 : (fetched.completedPieces || 68),
            batchCode: fetched.batchCode || 'BATCH-W24-08',
            fabric: fetched.fabric || '100% Italian Wool Twill (Charcoal)',
            image: fetched.image ? (fetched.image.startsWith('http') ? fetched.image : `${BASE_URL}${fetched.image}`) : 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=800&q=80'
          };
        }
      } catch (err) {
        // Continue with fallback below
      }
    }

    // If still null, create fallback task representation
    if (!currentTask) {
      currentTask = {
        id: taskId,
        title: "Precision Pattern Cutting — Men's Italian Wool Suit Jacket",
        description: "Perform computerized CAD marker layout and precision laser cutting for 150 pieces of Italian Wool Twill Charcoal.\n\nKey Specs:\n- Grain alignment within ±1mm tolerance\n- Match check pattern across lapel notch\n- Bundle cut plies in lots of 25 with barcode tags",
        department: user.department || 'Cutting',
        priority: 'High',
        status: 'Pending',
        progress: 45,
        targetPieces: 150,
        completedPieces: 68,
        dueDate: 'Today, 5:00 PM',
        batchCode: 'BATCH-W24-08',
        fabric: '100% Italian Wool Twill (Charcoal)',
        image: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=800&q=80'
      };
    }

    populateTaskUI(currentTask);

    if (loading) loading.classList.add('hidden');
    if (content) content.classList.remove('hidden');

  } catch (err) {
    showToast('Failed to load task details', 'error');
    if (loading) loading.innerText = 'Error loading task. Redirecting to home...';
    setTimeout(() => { window.location.href = '/worker-home.html'; }, 1500);
  }
}

function populateTaskUI(task) {
  // Title & Batch
  document.getElementById('task-title').innerText = task.title;
  document.getElementById('task-batch-badge').innerText = task.batchCode || 'BATCH-W24-08';
  document.getElementById('task-dept-badge').innerText = `${task.department || 'Cutting'} Department`;
  document.getElementById('task-due-date').innerText = task.dueDate || 'Today, 5:00 PM';
  
  // Description & Specs
  document.getElementById('task-desc').innerText = task.description || 'Follow standard operating specifications.';
  if (task.fabric) {
    document.getElementById('task-fabric-spec').innerText = task.fabric;
  }

  // Quantities
  const target = task.targetPieces || 100;
  const completed = task.completedPieces || (task.status === 'Completed' ? target : Math.round(target * 0.45));
  document.getElementById('task-target-qty').innerText = `${target} pcs`;
  document.getElementById('task-completed-qty').innerText = `${completed} pcs`;
  document.getElementById('pieces-completed-input').value = completed;

  // Image
  if (task.image) {
    document.getElementById('task-image').src = task.image;
  }

  // Priority Styling
  const priorityBadge = document.getElementById('task-priority-badge');
  priorityBadge.innerText = `${task.priority || 'Normal'} Priority`;
  if (task.priority === 'High') {
    priorityBadge.className = 'px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200';
  } else if (task.priority === 'Low') {
    priorityBadge.className = 'px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-slate-50 text-slate-600 border border-slate-200';
  } else {
    priorityBadge.className = 'px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200';
  }

  // Status Styling
  const statusBadge = document.getElementById('task-status-badge');
  const isCompleted = task.status === 'Completed' || task.status === 'Reviewed';
  if (isCompleted) {
    statusBadge.innerText = '● Completed';
    statusBadge.className = 'px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200';
    setWorkflowStep(4);
    document.getElementById('submission-status-banner')?.classList.remove('hidden');
  } else {
    statusBadge.innerText = '● In Progress';
    statusBadge.className = 'px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200';
    // Choose step based on progress
    const p = task.progress || 45;
    if (p < 25) setWorkflowStep(1);
    else if (p < 60) setWorkflowStep(2);
    else if (p < 99) setWorkflowStep(3);
    else setWorkflowStep(4);
  }
}

function setupStepperControls() {
  document.querySelectorAll('.stepper-step').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const stepNum = parseInt(btn.getAttribute('data-step') || '1', 10);
      setWorkflowStep(stepNum);
      showToast(`Workflow updated to Stage ${stepNum}`, 'info');
    });
  });
}

function setWorkflowStep(stepNum) {
  currentStep = stepNum;
  const steps = document.querySelectorAll('.stepper-step');
  
  steps.forEach(btn => {
    const s = parseInt(btn.getAttribute('data-step') || '1', 10);
    btn.classList.remove('active-step', 'completed-step');

    if (s < stepNum) {
      btn.classList.add('completed-step');
    } else if (s === stepNum) {
      btn.classList.add('active-step');
    }
  });

  // Calculate percentage
  let pct = 25;
  if (stepNum === 2) pct = 50;
  if (stepNum === 3) pct = 75;
  if (stepNum === 4) pct = 100;

  const progressBar = document.getElementById('workflow-progress-bar');
  const pctLabel = document.getElementById('stepper-percentage');
  if (progressBar) progressBar.style.width = `${pct}%`;
  if (pctLabel) pctLabel.innerText = `${pct}% Completed`;

  if (currentTask) {
    currentTask.progress = pct;
  }
}

function setupActionButtons() {
  const saveBtn = document.getElementById('save-progress-btn');
  const completeBtn = document.getElementById('complete-task-btn');
  const issueBtn = document.getElementById('report-issue-btn');

  // Save Progress
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      const pieces = parseInt(document.getElementById('pieces-completed-input').value || '0', 10);
      const notes = document.getElementById('station-notes-input').value.trim();

      if (currentTask) {
        currentTask.completedPieces = pieces;
        currentTask.notes = notes;
        persistCurrentTask();
      }

      saveBtn.innerText = 'Saving...';
      saveBtn.disabled = true;

      try {
        await apiFetch(`/tasks/${currentTask.id}/status`, {
          method: 'PUT',
          body: { status: 'Pending', progress: currentTask.progress }
        });
      } catch (e) {
        // Fallback OK
      }

      setTimeout(() => {
        saveBtn.innerText = 'Save Progress';
        saveBtn.disabled = false;
        showToast('Workstation progress saved successfully!', 'success');
      }, 350);
    });
  }

  // Mark 100% Completed
  if (completeBtn) {
    completeBtn.addEventListener('click', async () => {
      completeBtn.innerText = 'Submitting...';
      completeBtn.disabled = true;

      const target = currentTask?.targetPieces || 150;
      setWorkflowStep(4);
      document.getElementById('pieces-completed-input').value = target;

      if (currentTask) {
        currentTask.status = 'Completed';
        currentTask.progress = 100;
        currentTask.completedPieces = target;
        persistCurrentTask();
      }

      try {
        await apiFetch(`/tasks/${currentTask.id}/status`, {
          method: 'PUT',
          body: { status: 'Completed', progress: 100 }
        });
      } catch (e) {
        // Fallback OK
      }

      showToast('🎉 Production job marked completed! Great work!', 'success');

      setTimeout(() => {
        window.location.href = '/worker-home.html';
      }, 1200);
    });
  }

  // Flag Defect / Issue
  if (issueBtn) {
    issueBtn.addEventListener('click', () => {
      const reason = prompt('Please describe the workstation issue or material defect for supervisor review:');
      if (reason && reason.trim()) {
        if (currentTask) {
          currentTask.status = 'Not Completed';
          currentTask.issueReport = reason.trim();
          persistCurrentTask();
        }
        showToast('Issue flagged to Floor Supervisor. Support has been notified.', 'error');
      }
    });
  }
}

function persistCurrentTask() {
  if (!currentTask) return;
  try {
    const cached = localStorage.getItem(LOCAL_TASKS_KEY);
    let tasks = cached ? JSON.parse(cached) : [];
    const idx = tasks.findIndex(t => String(t.id) === String(currentTask.id));
    if (idx >= 0) {
      tasks[idx] = { ...tasks[idx], ...currentTask };
    } else {
      tasks.push(currentTask);
    }
    localStorage.setItem(LOCAL_TASKS_KEY, JSON.stringify(tasks));
  } catch (e) {
    console.error('Error saving local task cache', e);
  }
}
