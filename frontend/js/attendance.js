import { apiFetch, requireAuth, renderERPNavigation, showToast } from './api.js';

document.addEventListener('DOMContentLoaded', async () => {
  const user = requireAuth(['ADMIN', 'MANAGER', 'SUPERVISOR']);
  if (!user) return;

  renderERPNavigation('attendance');

  // Mobile menu toggle
  const mobileToggle = document.getElementById('mobile-menu-toggle');
  const sidebar = document.getElementById('erp-sidebar');
  if (mobileToggle && sidebar) {
    mobileToggle.addEventListener('click', () => {
      sidebar.classList.toggle('-translate-x-full');
    });
  }

  // Set default filter date to today
  const todayStr = new Date().toISOString().split('T')[0];
  const filterDateInput = document.getElementById('filter-date');
  if (filterDateInput) {
    filterDateInput.value = todayStr;
  }
  const modalDate = document.getElementById('modal-date');
  if (modalDate) {
    modalDate.value = todayStr;
  }

  // Tab switcher
  const tabAtt = document.getElementById('tab-attendance');
  const tabLvs = document.getElementById('tab-leaves');
  const secAtt = document.getElementById('attendance-section');
  const secLvs = document.getElementById('leaves-section');

  tabAtt.addEventListener('click', () => {
    tabAtt.classList.add('border-[#124b4f]', 'text-[#124b4f]');
    tabAtt.classList.remove('border-transparent', 'text-gray-500');
    tabLvs.classList.add('border-transparent', 'text-gray-500');
    tabLvs.classList.remove('border-[#124b4f]', 'text-[#124b4f]');
    secAtt.classList.remove('hidden');
    secLvs.classList.add('hidden');
    loadAttendance();
  });

  tabLvs.addEventListener('click', () => {
    tabLvs.classList.add('border-[#124b4f]', 'text-[#124b4f]');
    tabLvs.classList.remove('border-transparent', 'text-gray-500');
    tabAtt.classList.add('border-transparent', 'text-gray-500');
    tabAtt.classList.remove('border-[#124b4f]', 'text-[#124b4f]');
    secLvs.classList.remove('hidden');
    secAtt.classList.add('hidden');
    loadLeaves();
  });

  // Filter bindings
  document.getElementById('filter-date')?.addEventListener('change', loadAttendance);
  document.getElementById('filter-dept')?.addEventListener('change', loadAttendance);
  document.getElementById('filter-status')?.addEventListener('change', loadAttendance);
  document.getElementById('reset-filters')?.addEventListener('click', () => {
    document.getElementById('filter-date').value = '';
    document.getElementById('filter-dept').value = '';
    document.getElementById('filter-status').value = '';
    loadAttendance();
  });

  // Modal bindings
  const markModal = document.getElementById('mark-modal');
  document.getElementById('open-mark-modal')?.addEventListener('click', () => {
    markModal.classList.remove('hidden');
  });
  document.getElementById('close-mark-modal')?.addEventListener('click', () => {
    markModal.classList.add('hidden');
  });
  document.getElementById('cancel-mark-btn')?.addEventListener('click', () => {
    markModal.classList.add('hidden');
  });

  // Form submission
  document.getElementById('mark-attendance-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      employeeId: document.getElementById('modal-employee-select').value,
      date: document.getElementById('modal-date').value,
      status: document.getElementById('modal-status').value,
      checkInTime: document.getElementById('modal-checkin').value,
      checkOutTime: document.getElementById('modal-checkout').value,
      remarks: document.getElementById('modal-remarks').value
    };

    try {
      await apiFetch('/attendance/admin-mark', {
        method: 'POST',
        body: payload
      });
      showToast('Attendance recorded successfully', 'success');
      markModal.classList.add('hidden');
      loadAttendance();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  await loadEmployeesForSelect();
  await loadAttendance();
  await checkPendingLeaves();
});

async function loadEmployeesForSelect() {
  const select = document.getElementById('modal-employee-select');
  if (!select) return;

  try {
    const emps = await apiFetch('/employees');
    select.innerHTML = (emps || []).map(e => `
      <option value="${e.id}">${e.name} (${e.department || 'General'} - ${e.role})</option>
    `).join('');
  } catch (err) {
    console.error('Error loading employee dropdown:', err);
  }
}

async function loadAttendance() {
  const tbody = document.getElementById('attendance-tbody');
  if (!tbody) return;

  const date = document.getElementById('filter-date')?.value || '';
  const dept = document.getElementById('filter-dept')?.value || '';
  const status = document.getElementById('filter-status')?.value || '';

  let qs = [];
  if (date) qs.push(`date=${encodeURIComponent(date)}`);
  if (dept) qs.push(`department=${encodeURIComponent(dept)}`);
  if (status) qs.push(`status=${encodeURIComponent(status)}`);
  const path = '/attendance' + (qs.length ? '?' + qs.join('&') : '');

  try {
    const records = await apiFetch(path);
    if (!records || records.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" class="py-6 text-center text-gray-400">No attendance records found for selected filters.</td></tr>`;
      return;
    }

    tbody.innerHTML = records.map(r => {
      const badgeClass = r.status === 'Present' 
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
        : r.status === 'Late' 
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : r.status === 'Absent' 
        ? 'bg-red-50 text-red-700 border-red-200'
        : 'bg-blue-50 text-blue-700 border-blue-200';

      return `
        <tr class="hover:bg-gray-50/70">
          <td class="py-3 px-4 font-bold text-gray-900">${r.employeeName}</td>
          <td class="py-3 px-4 text-gray-700 font-semibold">${r.department || '-'}</td>
          <td class="py-3 px-4 font-mono text-gray-600">${r.date}</td>
          <td class="py-3 px-4 font-mono font-bold text-gray-900">${r.checkInTime || '--:--'}</td>
          <td class="py-3 px-4 font-mono font-bold text-gray-900">${r.checkOutTime || '--:--'}</td>
          <td class="py-3 px-4 font-bold text-gray-800">${r.workingHours || 0} hrs</td>
          <td class="py-3 px-4 font-bold ${r.overtimeHours > 0 ? 'text-amber-700' : 'text-gray-400'}">${r.overtimeHours || 0} hrs</td>
          <td class="py-3 px-4">
            <span class="px-2 py-0.5 rounded text-[11px] font-bold border ${badgeClass}">
              ${r.status}
            </span>
          </td>
          <td class="py-3 px-4 text-gray-500 font-medium text-[11px]">${r.markedBy || 'Self'}</td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="9" class="py-6 text-center text-red-500">Failed to load attendance records: ${err.message}</td></tr>`;
  }
}

async function loadLeaves() {
  const tbody = document.getElementById('leaves-tbody');
  if (!tbody) return;

  try {
    const leaves = await apiFetch('/attendance/leaves');
    if (!leaves || leaves.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="py-6 text-center text-gray-400">No leave requests in the queue.</td></tr>`;
      return;
    }

    tbody.innerHTML = leaves.map(l => {
      const isPending = l.status === 'Pending';
      const statusBadge = isPending 
        ? 'bg-amber-50 text-amber-700 border-amber-200' 
        : l.status === 'Approved' 
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
        : 'bg-red-50 text-red-700 border-red-200';

      return `
        <tr class="hover:bg-gray-50/70">
          <td class="py-3 px-4 font-bold text-gray-900">${l.employeeName}</td>
          <td class="py-3 px-4 text-gray-700 font-semibold">${l.department || '-'}</td>
          <td class="py-3 px-4 font-bold text-teal-900">${l.leaveType}</td>
          <td class="py-3 px-4 font-mono text-gray-600">${l.startDate} → ${l.endDate}</td>
          <td class="py-3 px-4 text-gray-700">${l.reason}</td>
          <td class="py-3 px-4">
            <span class="px-2 py-0.5 rounded text-[11px] font-bold border ${statusBadge}">${l.status}</span>
          </td>
          <td class="py-3 px-4 text-right">
            ${isPending ? `
              <div class="flex items-center justify-end gap-1.5">
                <button data-id="${l.id}" data-action="Approved" class="leave-action-btn px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[11px] font-bold">Approve</button>
                <button data-id="${l.id}" data-action="Rejected" class="leave-action-btn px-2.5 py-1 bg-red-700 hover:bg-red-800 text-white rounded-lg text-[11px] font-bold">Reject</button>
              </div>
            ` : `<span class="text-gray-400 text-[11px] font-bold">Resolved</span>`}
          </td>
        </tr>
      `;
    }).join('');

    document.querySelectorAll('.leave-action-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const leaveId = btn.dataset.id;
        const action = btn.dataset.action;
        try {
          await apiFetch(`/attendance/leaves/${leaveId}/status`, {
            method: 'PUT',
            body: { status: action, remarks: `Processed by supervisor` }
          });
          showToast(`Leave request ${action.toLowerCase()}`, 'success');
          loadLeaves();
          checkPendingLeaves();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="py-6 text-center text-red-500">Failed to load leaves: ${err.message}</td></tr>`;
  }
}

async function checkPendingLeaves() {
  try {
    const leaves = await apiFetch('/attendance/leaves?status=Pending');
    const badge = document.getElementById('pending-leaves-badge');
    if (badge && leaves && leaves.length > 0) {
      badge.innerText = leaves.length;
      badge.classList.remove('hidden');
    } else if (badge) {
      badge.classList.add('hidden');
    }
  } catch (err) {}
}
