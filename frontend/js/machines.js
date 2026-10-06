import { apiFetch, requireAuth, renderERPNavigation, showToast } from './api.js';

let allMachines = [];

document.addEventListener('DOMContentLoaded', async () => {
  const user = requireAuth(['ADMIN', 'MANAGER', 'SUPERVISOR']);
  if (!user) return;

  renderERPNavigation('machines');

  // Mobile menu toggle
  const mobileToggle = document.getElementById('mobile-menu-toggle');
  const sidebar = document.getElementById('erp-sidebar');
  if (mobileToggle && sidebar) {
    mobileToggle.addEventListener('click', () => {
      sidebar.classList.toggle('-translate-x-full');
    });
  }

  // Tabs
  const tabMach = document.getElementById('tab-machines');
  const tabTick = document.getElementById('tab-tickets');
  const secMach = document.getElementById('machines-section');
  const secTick = document.getElementById('tickets-section');

  tabMach.addEventListener('click', () => {
    tabMach.classList.add('border-[#124b4f]', 'text-[#124b4f]');
    tabMach.classList.remove('border-transparent', 'text-gray-500');
    tabTick.classList.add('border-transparent', 'text-gray-500');
    tabTick.classList.remove('border-[#124b4f]', 'text-[#124b4f]');
    secMach.classList.remove('hidden');
    secTick.classList.add('hidden');
    loadMachines();
  });

  tabTick.addEventListener('click', () => {
    tabTick.classList.add('border-[#124b4f]', 'text-[#124b4f]');
    tabTick.classList.remove('border-transparent', 'text-gray-500');
    tabMach.classList.add('border-transparent', 'text-gray-500');
    tabMach.classList.remove('border-[#124b4f]', 'text-[#124b4f]');
    secTick.classList.remove('hidden');
    secMach.classList.add('hidden');
    loadTickets();
  });

  // Modals
  const machModal = document.getElementById('machine-modal');
  document.getElementById('open-machine-modal')?.addEventListener('click', () => machModal.classList.remove('hidden'));
  document.getElementById('close-mach-modal')?.addEventListener('click', () => machModal.classList.add('hidden'));
  document.getElementById('cancel-mach-btn')?.addEventListener('click', () => machModal.classList.add('hidden'));

  const ticketModal = document.getElementById('ticket-modal');
  document.getElementById('open-ticket-modal')?.addEventListener('click', () => {
    populateTicketSelect();
    ticketModal.classList.remove('hidden');
  });
  document.getElementById('close-ticket-modal')?.addEventListener('click', () => ticketModal.classList.add('hidden'));
  document.getElementById('cancel-ticket-btn')?.addEventListener('click', () => ticketModal.classList.add('hidden'));

  // Machine Form
  document.getElementById('machine-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      machineCode: document.getElementById('mach-code').value,
      machineType: document.getElementById('mach-type').value,
      name: document.getElementById('mach-name').value,
      department: document.getElementById('mach-dept').value,
      productionLine: document.getElementById('mach-line').value,
      status: 'Idle'
    };

    try {
      await apiFetch('/machines', { method: 'POST', body: payload });
      showToast('Machine registered successfully', 'success');
      machModal.classList.add('hidden');
      document.getElementById('machine-form').reset();
      loadMachines();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Ticket Form
  document.getElementById('ticket-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      machineId: document.getElementById('ticket-mach-select').value,
      maintenanceType: document.getElementById('ticket-type').value,
      issue: document.getElementById('ticket-issue').value,
      assignedTechnician: document.getElementById('ticket-technician').value
    };

    try {
      await apiFetch('/machines/maintenance/tickets', { method: 'POST', body: payload });
      showToast('Maintenance ticket filed', 'warning');
      ticketModal.classList.add('hidden');
      document.getElementById('ticket-form').reset();
      loadMachines();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  await loadMachines();
});

async function loadMachines() {
  const container = document.getElementById('machines-cards-grid');
  if (!container) return;

  try {
    allMachines = await apiFetch('/machines');
    if (!allMachines || allMachines.length === 0) {
      container.innerHTML = `<div class="p-8 text-center text-gray-400 col-span-3">No machines registered in the factory floor yet.</div>`;
      return;
    }

    container.innerHTML = allMachines.map(m => {
      const isRunning = m.status === 'Running';
      const isDown = m.status === 'Breakdown' || m.status === 'Maintenance';

      const statusBadge = isRunning 
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
        : isDown 
        ? 'bg-rose-50 text-rose-700 border-rose-200' 
        : 'bg-gray-100 text-gray-700 border-gray-200';

      return `
        <div class="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3">
          <div class="flex justify-between items-start">
            <div>
              <span class="font-mono text-sm font-black text-gray-900">${m.machineCode}</span>
              <p class="text-xs text-gray-500 font-medium">${m.department} — <span class="font-bold text-gray-700">${m.productionLine || 'Line 1'}</span></p>
            </div>
            <span class="px-2 py-0.5 rounded text-[10px] font-bold border ${statusBadge}">${m.status}</span>
          </div>

          <div class="space-y-1">
            <h4 class="font-extrabold text-gray-950 text-sm">${m.name}</h4>
            <p class="text-xs font-semibold text-gray-600">Type: ${m.machineType}</p>
          </div>

          <div class="bg-gray-50 p-2.5 rounded-xl text-xs space-y-1">
            <div class="flex justify-between text-gray-600">
              <span>Operator:</span>
              <span class="font-bold text-gray-900">${m.assignedOperator || 'None'}</span>
            </div>
            <div class="flex justify-between text-gray-600">
              <span>Total Downtime:</span>
              <span class="font-mono font-bold text-rose-700">${m.totalDowntimeHours || 0} hrs</span>
            </div>
          </div>

          <div class="pt-2 border-t border-gray-100 flex items-center justify-between">
            <span class="text-[11px] text-gray-400 font-medium">Last Maint: ${m.lastMaintenanceDate || 'Recent'}</span>
            <select data-id="${m.id}" class="status-change-select px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-[11px] font-bold text-gray-700 focus:outline-none">
              <option value="Running" ${isRunning ? 'selected' : ''}>Running</option>
              <option value="Idle" ${m.status === 'Idle' ? 'selected' : ''}>Idle</option>
              <option value="Breakdown" ${m.status === 'Breakdown' ? 'selected' : ''}>Breakdown</option>
              <option value="Maintenance" ${m.status === 'Maintenance' ? 'selected' : ''}>Maintenance</option>
            </select>
          </div>
        </div>
      `;
    }).join('');

    document.querySelectorAll('.status-change-select').forEach(sel => {
      sel.addEventListener('change', async () => {
        const machId = sel.dataset.id;
        const newStatus = sel.value;
        try {
          await apiFetch(`/machines/${machId}/status?status=${newStatus}`, { method: 'PUT' });
          showToast(`Machine status updated to ${newStatus}`, 'success');
          loadMachines();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });

  } catch (err) {
    container.innerHTML = `<p class="text-red-500 text-xs">Failed to load machines: ${err.message}</p>`;
  }
}

function populateTicketSelect() {
  const select = document.getElementById('ticket-mach-select');
  if (!select) return;
  select.innerHTML = allMachines.map(m => `
    <option value="${m.id}">${m.machineCode} - ${m.name} (${m.department})</option>
  `).join('');
}

async function loadTickets() {
  const tbody = document.getElementById('tickets-tbody');
  if (!tbody) return;

  try {
    const tickets = await apiFetch('/machines/maintenance/tickets');
    if (!tickets || tickets.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="py-6 text-center text-gray-400">No maintenance tickets reported.</td></tr>`;
      return;
    }

    tbody.innerHTML = tickets.map(t => {
      const isOpen = t.status === 'Open' || t.status === 'In Progress';
      const statusBadge = isOpen 
        ? 'bg-rose-50 text-rose-700 border-rose-200' 
        : 'bg-emerald-50 text-emerald-700 border-emerald-200';

      return `
        <tr class="hover:bg-gray-50/70">
          <td class="py-3 px-4 font-mono font-bold text-gray-900">${t.ticketNumber}</td>
          <td class="py-3 px-4 font-mono font-bold text-gray-800">${t.machineCode}</td>
          <td class="py-3 px-4 text-gray-700 font-semibold">${t.department}</td>
          <td class="py-3 px-4 text-gray-900 font-medium">${t.issue}</td>
          <td class="py-3 px-4 font-bold text-teal-900">${t.maintenanceType}</td>
          <td class="py-3 px-4 font-mono text-gray-600">${t.reportedDate?.split('T')[0] || '-'}</td>
          <td class="py-3 px-4">
            <span class="px-2 py-0.5 rounded text-[11px] font-bold border ${statusBadge}">${t.status}</span>
          </td>
          <td class="py-3 px-4 text-right">
            ${isOpen ? `
              <button data-id="${t.id}" class="resolve-ticket-btn px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[11px] font-bold">Resolve</button>
            ` : `<span class="text-gray-400 font-bold text-[11px]">Closed</span>`}
          </td>
        </tr>
      `;
    }).join('');

    document.querySelectorAll('.resolve-ticket-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const ticketId = btn.dataset.id;
        try {
          await apiFetch(`/machines/maintenance/tickets/${ticketId}/resolve`, {
            method: 'PUT',
            body: { status: 'Resolved', downtimeHours: 1.5, cost: 500, resolutionNotes: 'Fixed and restored to operations' }
          });
          showToast('Ticket resolved and machine restored', 'success');
          loadTickets();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" class="py-6 text-center text-red-500">Failed to load tickets: ${err.message}</td></tr>`;
  }
}
