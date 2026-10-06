import { apiFetch, requireAuth, renderERPNavigation, showToast } from './api.js';

let allJobCards = [];
let allWorkers = [];
let allMachines = [];

document.addEventListener('DOMContentLoaded', async () => {
  const user = requireAuth(['ADMIN', 'MANAGER', 'SUPERVISOR']);
  if (!user) return;

  renderERPNavigation('production');

  // Mobile menu toggle
  const mobileToggle = document.getElementById('mobile-menu-toggle');
  const sidebar = document.getElementById('erp-sidebar');
  if (mobileToggle && sidebar) {
    mobileToggle.addEventListener('click', () => {
      sidebar.classList.toggle('-translate-x-full');
    });
  }

  // Due date default +14 days
  const d = new Date();
  d.setDate(d.getDate() + 14);
  const dueInput = document.getElementById('order-due');
  if (dueInput) dueInput.value = d.toISOString().split('T')[0];

  // Tabs
  const tabOrders = document.getElementById('tab-orders');
  const tabJc = document.getElementById('tab-jobcards');
  const secOrders = document.getElementById('orders-section');
  const secJc = document.getElementById('jobcards-section');

  tabOrders.addEventListener('click', () => {
    tabOrders.classList.add('border-[#124b4f]', 'text-[#124b4f]');
    tabOrders.classList.remove('border-transparent', 'text-gray-500');
    tabJc.classList.add('border-transparent', 'text-gray-500');
    tabJc.classList.remove('border-[#124b4f]', 'text-[#124b4f]');
    secOrders.classList.remove('hidden');
    secJc.classList.add('hidden');
    loadOrders();
  });

  tabJc.addEventListener('click', () => {
    tabJc.classList.add('border-[#124b4f]', 'text-[#124b4f]');
    tabJc.classList.remove('border-transparent', 'text-gray-500');
    tabOrders.classList.add('border-transparent', 'text-gray-500');
    tabOrders.classList.remove('border-[#124b4f]', 'text-[#124b4f]');
    secJc.classList.remove('hidden');
    secOrders.classList.add('hidden');
    loadJobCards();
  });

  // Filter Job Cards
  document.getElementById('filter-jc-dept')?.addEventListener('change', renderJobCards);

  // Modals
  const orderModal = document.getElementById('order-modal');
  document.getElementById('open-order-modal')?.addEventListener('click', () => orderModal.classList.remove('hidden'));
  document.getElementById('close-order-modal')?.addEventListener('click', () => orderModal.classList.add('hidden'));
  document.getElementById('cancel-order-btn')?.addEventListener('click', () => orderModal.classList.add('hidden'));

  const assignModal = document.getElementById('assign-modal');
  document.getElementById('close-assign-modal')?.addEventListener('click', () => assignModal.classList.add('hidden'));
  document.getElementById('cancel-assign-btn')?.addEventListener('click', () => assignModal.classList.add('hidden'));

  // Create Order Form
  document.getElementById('order-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      customerName: document.getElementById('order-customer').value,
      productName: document.getElementById('order-product').value,
      quantity: parseInt(document.getElementById('order-qty').value, 10),
      priority: document.getElementById('order-priority').value,
      dueDate: document.getElementById('order-due').value,
      notes: document.getElementById('order-notes').value
    };

    try {
      await apiFetch('/production/orders', { method: 'POST', body: payload });
      showToast('Production order launched successfully', 'success');
      orderModal.classList.add('hidden');
      document.getElementById('order-form').reset();
      loadOrders();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Assign Form
  document.getElementById('assign-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const jobId = document.getElementById('assign-job-id').value;
    const workerId = document.getElementById('assign-worker-select').value;
    const machineId = document.getElementById('assign-machine-select').value || '';

    try {
      await apiFetch(`/production/job-cards/${jobId}/assign?workerId=${workerId}&machineId=${machineId}`, {
        method: 'PUT'
      });
      showToast('Job card assigned to worker', 'success');
      assignModal.classList.add('hidden');
      loadJobCards();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  await loadStaffAndMachines();
  await loadOrders();
});

async function loadStaffAndMachines() {
  try {
    allWorkers = await apiFetch('/workers');
    allMachines = await apiFetch('/machines');

    const workerSelect = document.getElementById('assign-worker-select');
    if (workerSelect) {
      workerSelect.innerHTML = allWorkers.map(w => `
        <option value="${w.id}">${w.name} (${w.department || 'General'})</option>
      `).join('');
    }

    const machSelect = document.getElementById('assign-machine-select');
    if (machSelect) {
      machSelect.innerHTML = `<option value="">No machine assigned</option>` + allMachines.map(m => `
        <option value="${m.id}">${m.machineCode} - ${m.name} (${m.status})</option>
      `).join('');
    }
  } catch (err) {
    console.error('Error preloading workers/machines:', err);
  }
}

async function loadOrders() {
  const tbody = document.getElementById('orders-tbody');
  if (!tbody) return;

  try {
    const orders = await apiFetch('/production/orders');
    if (!orders || orders.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" class="py-6 text-center text-gray-400">No production orders found.</td></tr>`;
      return;
    }

    tbody.innerHTML = orders.map(o => {
      const priorityBadge = o.priority === 'High' 
        ? 'bg-red-50 text-red-700 border-red-200' 
        : o.priority === 'Medium' 
        ? 'bg-amber-50 text-amber-700 border-amber-200' 
        : 'bg-blue-50 text-blue-700 border-blue-200';

      const statusBadge = o.status === 'Completed' 
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
        : 'bg-teal-50 text-teal-800 border-teal-200';

      return `
        <tr class="hover:bg-gray-50/70">
          <td class="py-3 px-4 font-mono font-bold text-gray-900">${o.orderNumber}</td>
          <td class="py-3 px-4 font-semibold text-gray-800">${o.customerName}</td>
          <td class="py-3 px-4 font-bold text-gray-950">${o.productName}</td>
          <td class="py-3 px-4 font-black text-gray-900">${o.quantity} pcs</td>
          <td class="py-3 px-4">
            <span class="px-2 py-0.5 rounded text-[11px] font-bold border ${priorityBadge}">${o.priority}</span>
          </td>
          <td class="py-3 px-4">
            <span class="px-2.5 py-1 bg-teal-50 text-[#124b4f] font-bold rounded-lg border border-teal-200 text-xs">
              ${o.currentStage}
            </span>
          </td>
          <td class="py-3 px-4">
            <div class="flex items-center gap-2">
              <div class="w-16 bg-gray-100 rounded-full h-1.5">
                <div class="bg-emerald-600 h-1.5 rounded-full" style="width: ${o.progressPercent}%"></div>
              </div>
              <span class="text-[11px] font-bold text-gray-600">${o.progressPercent}%</span>
            </div>
          </td>
          <td class="py-3 px-4 font-mono text-gray-600">${o.dueDate}</td>
          <td class="py-3 px-4">
            <span class="px-2 py-0.5 rounded text-[11px] font-bold border ${statusBadge}">${o.status}</span>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="9" class="py-6 text-center text-red-500">Failed to load orders: ${err.message}</td></tr>`;
  }
}

async function loadJobCards() {
  try {
    allJobCards = await apiFetch('/production/job-cards');
    renderJobCards();
  } catch (err) {
    console.error('Error loading job cards:', err);
  }
}

function renderJobCards() {
  const container = document.getElementById('jobcards-cards-grid');
  if (!container) return;

  const dept = document.getElementById('filter-jc-dept')?.value || '';
  const filtered = allJobCards.filter(j => !dept || j.department === dept);

  if (filtered.length === 0) {
    container.innerHTML = `<div class="p-8 text-center text-gray-400 col-span-3">No job cards found for selected department.</div>`;
    return;
  }

  container.innerHTML = filtered.map(j => {
    const isCompleted = j.status === 'Completed';
    const isAssigned = j.status === 'Assigned' || j.status === 'In Progress';
    const isPending = j.status === 'Pending';
    const isRework = j.status === 'Rework';

    const statusBadge = isCompleted 
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
      : isRework 
      ? 'bg-rose-50 text-rose-700 border-rose-200'
      : isAssigned 
      ? 'bg-blue-50 text-blue-700 border-blue-200' 
      : 'bg-amber-50 text-amber-700 border-amber-200';

    return `
      <div class="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3">
        <div class="flex justify-between items-start">
          <div>
            <span class="font-mono text-xs font-black text-gray-900">${j.jobNumber}</span>
            <p class="text-xs text-gray-500 font-medium">Order: <span class="font-mono font-bold text-gray-700">${j.orderNumber}</span></p>
          </div>
          <span class="px-2 py-0.5 rounded text-[11px] font-bold border ${statusBadge}">${j.status}</span>
        </div>

        <div class="space-y-1">
          <h4 class="font-black text-gray-950 text-sm">${j.productName}</h4>
          <p class="text-xs font-bold text-[#124b4f]">Department: ${j.department}</p>
        </div>

        <div class="grid grid-cols-2 gap-2 bg-gray-50 p-2.5 rounded-xl text-xs font-semibold">
          <div>
            <span class="text-[10px] text-gray-500 block">Planned Qty</span>
            <span class="font-black text-gray-900">${j.plannedQuantity} pcs</span>
          </div>
          <div>
            <span class="text-[10px] text-gray-500 block">Completed Qty</span>
            <span class="font-black text-emerald-700">${j.completedQuantity || 0} pcs</span>
          </div>
        </div>

        <div class="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
          <span class="text-gray-600 font-medium">Worker: <strong class="text-gray-900 font-bold">${j.workerName || 'Unassigned'}</strong></span>
          ${!isCompleted ? `
            <button data-id="${j.id}" class="open-assign-btn px-3 py-1 bg-[#124b4f] hover:bg-[#0c383b] text-white text-[11px] font-bold rounded-lg transition-colors cursor-pointer">
              ${j.workerName ? 'Reassign' : 'Assign Worker'}
            </button>
          ` : `
            <span class="text-emerald-700 text-[11px] font-bold">✓ Stage Finished</span>
          `}
        </div>
      </div>
    `;
  }).join('');

  document.querySelectorAll('.open-assign-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('assign-job-id').value = btn.dataset.id;
      document.getElementById('assign-modal').classList.remove('hidden');
    });
  });
}
