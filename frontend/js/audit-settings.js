import { apiFetch, requireAuth, renderERPNavigation, showToast } from './api.js';

document.addEventListener('DOMContentLoaded', async () => {
  const user = requireAuth(['ADMIN', 'MANAGER']);
  if (!user) return;

  renderERPNavigation('settings');

  // Mobile menu toggle
  const mobileToggle = document.getElementById('mobile-menu-toggle');
  const sidebar = document.getElementById('erp-sidebar');
  if (mobileToggle && sidebar) {
    mobileToggle.addEventListener('click', () => {
      sidebar.classList.toggle('-translate-x-full');
    });
  }

  // Tabs
  const tabSet = document.getElementById('tab-settings');
  const tabAud = document.getElementById('tab-audit');
  const secSet = document.getElementById('settings-section');
  const secAud = document.getElementById('audit-section');

  tabSet.addEventListener('click', () => {
    tabSet.classList.add('border-[#124b4f]', 'text-[#124b4f]');
    tabSet.classList.remove('border-transparent', 'text-gray-500');
    tabAud.classList.add('border-transparent', 'text-gray-500');
    tabAud.classList.remove('border-[#124b4f]', 'text-[#124b4f]');
    secSet.classList.remove('hidden');
    secAud.classList.add('hidden');
    loadSettings();
  });

  tabAud.addEventListener('click', () => {
    tabAud.classList.add('border-[#124b4f]', 'text-[#124b4f]');
    tabAud.classList.remove('border-transparent', 'text-gray-500');
    tabSet.classList.add('border-transparent', 'text-gray-500');
    tabSet.classList.remove('border-[#124b4f]', 'text-[#124b4f]');
    secAud.classList.remove('hidden');
    secSet.classList.add('hidden');
    loadAuditLogs();
  });

  // Settings form submit
  document.getElementById('settings-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      shiftStartTime: document.getElementById('set-shift-start').value,
      shiftEndTime: document.getElementById('set-shift-end').value,
      gracePeriodMinutes: parseInt(document.getElementById('set-grace-mins').value, 10),
      overtimeThresholdHours: parseFloat(document.getElementById('set-ot-thresh').value),
      companyName: document.getElementById('set-company-name').value,
      companyAddress: document.getElementById('set-company-addr').value
    };

    try {
      await apiFetch('/settings', { method: 'PUT', body: payload });
      showToast('Factory shift settings updated successfully', 'success');
      loadSettings();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  await loadSettings();
});

async function loadSettings() {
  try {
    const s = await apiFetch('/settings');
    if (s) {
      if (document.getElementById('set-shift-start')) document.getElementById('set-shift-start').value = s.shiftStartTime || '09:00';
      if (document.getElementById('set-shift-end')) document.getElementById('set-shift-end').value = s.shiftEndTime || '18:00';
      if (document.getElementById('set-grace-mins')) document.getElementById('set-grace-mins').value = s.gracePeriodMinutes || 15;
      if (document.getElementById('set-ot-thresh')) document.getElementById('set-ot-thresh').value = s.overtimeThresholdHours || 8.5;
      if (document.getElementById('set-company-name')) document.getElementById('set-company-name').value = s.companyName || 'GarmentFlow Apparels Ltd.';
      if (document.getElementById('set-company-addr')) document.getElementById('set-company-addr').value = s.companyAddress || 'Tirupur, India';
    }
  } catch (err) {
    console.error('Error loading settings:', err);
  }
}

async function loadAuditLogs() {
  const tbody = document.getElementById('audit-tbody');
  if (!tbody) return;

  try {
    const logs = await apiFetch('/settings/audit-logs');
    if (!logs || logs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-gray-400">No system audit records logged yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = logs.map(l => `
      <tr class="hover:bg-gray-50/70">
        <td class="py-3 px-4 font-mono text-gray-600">${l.timestamp?.replace('T', ' ').split('.')[0] || '-'}</td>
        <td class="py-3 px-4 font-bold text-gray-950">${l.userName || 'System'}</td>
        <td class="py-3 px-4">
          <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-800">${l.userRole || 'SYSTEM'}</span>
        </td>
        <td class="py-3 px-4 font-bold text-[#124b4f]">${l.module}</td>
        <td class="py-3 px-4 font-medium text-gray-800">${l.action}</td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-red-500">Failed to load audit logs.</td></tr>`;
  }
}
