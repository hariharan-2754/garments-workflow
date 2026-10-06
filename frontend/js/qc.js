import { apiFetch, requireAuth, renderERPNavigation, showToast } from './api.js';

document.addEventListener('DOMContentLoaded', async () => {
  const user = requireAuth(['ADMIN', 'MANAGER', 'SUPERVISOR', 'WORKER']);
  if (!user) return;

  renderERPNavigation('qc');

  // Mobile menu toggle
  const mobileToggle = document.getElementById('mobile-menu-toggle');
  const sidebar = document.getElementById('erp-sidebar');
  if (mobileToggle && sidebar) {
    mobileToggle.addEventListener('click', () => {
      sidebar.classList.toggle('-translate-x-full');
    });
  }

  // Modals
  const qcModal = document.getElementById('qc-modal');
  document.getElementById('open-qc-modal')?.addEventListener('click', () => qcModal.classList.remove('hidden'));
  document.getElementById('close-qc-modal')?.addEventListener('click', () => qcModal.classList.add('hidden'));
  document.getElementById('cancel-qc-btn')?.addEventListener('click', () => qcModal.classList.add('hidden'));

  // Form submit
  document.getElementById('qc-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const defectCat = document.getElementById('qc-defect-cat').value;
    const defects = defectCat ? [{ category: defectCat, count: 1 }] : [];

    const payload = {
      productionOrderId: document.getElementById('qc-order-select').value,
      quantityInspected: parseInt(document.getElementById('qc-qty-inspected').value, 10),
      quantityPassed: parseInt(document.getElementById('qc-qty-passed').value, 10),
      quantityRework: parseInt(document.getElementById('qc-qty-rework').value, 10) || 0,
      quantityRejected: parseInt(document.getElementById('qc-qty-rejected').value, 10) || 0,
      result: document.getElementById('qc-result').value,
      defects: defects,
      remarks: document.getElementById('qc-remarks').value
    };

    try {
      await apiFetch('/qc', { method: 'POST', body: payload });
      showToast('QC Inspection submitted successfully', 'success');
      qcModal.classList.add('hidden');
      document.getElementById('qc-form').reset();
      loadQCLogs();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  await loadOrdersForQCSelect();
  await loadQCLogs();
});

async function loadOrdersForQCSelect() {
  const select = document.getElementById('qc-order-select');
  if (!select) return;

  try {
    const orders = await apiFetch('/production/orders');
    select.innerHTML = (orders || []).map(o => `
      <option value="${o.id}">${o.orderNumber} - ${o.productName} (${o.quantity} pcs - ${o.currentStage})</option>
    `).join('');
  } catch (err) {
    console.error('Error loading orders for QC select:', err);
  }
}

async function loadQCLogs() {
  const tbody = document.getElementById('qc-tbody');
  if (!tbody) return;

  try {
    const logs = await apiFetch('/qc');
    
    // Calculate aggregate stats
    const totalInspected = (logs || []).reduce((acc, l) => acc + (l.quantityInspected || 0), 0);
    const totalPassed = (logs || []).reduce((acc, l) => acc + (l.quantityPassed || 0), 0);
    const totalDefects = (logs || []).reduce((acc, l) => acc + (l.quantityRejected || 0) + (l.quantityRework || 0), 0);
    const fpy = totalInspected > 0 ? ((totalPassed / totalInspected) * 100).toFixed(1) : 98.5;

    document.getElementById('qc-stat-inspected').innerText = totalInspected;
    document.getElementById('qc-stat-passed').innerText = totalPassed;
    document.getElementById('qc-stat-defects').innerText = totalDefects;
    document.getElementById('qc-stat-fpy').innerText = fpy + '%';

    if (!logs || logs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" class="py-6 text-center text-gray-400">No QC inspection records submitted yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = logs.map(l => {
      const resultBadge = l.result === 'PASS' 
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
        : l.result === 'REWORK' 
        ? 'bg-amber-50 text-amber-700 border-amber-200' 
        : 'bg-red-50 text-red-700 border-red-200';

      return `
        <tr class="hover:bg-gray-50/70">
          <td class="py-3 px-4 font-mono text-gray-600">${l.createdAt?.split('T')[0] || '-'}</td>
          <td class="py-3 px-4 font-mono font-bold text-gray-900">${l.orderNumber || '-'}</td>
          <td class="py-3 px-4 font-bold text-gray-950">${l.productName || '-'}</td>
          <td class="py-3 px-4 text-gray-700 font-semibold">${l.inspectorName}</td>
          <td class="py-3 px-4 font-black text-gray-900">${l.quantityInspected}</td>
          <td class="py-3 px-4 font-black text-emerald-700">${l.quantityPassed}</td>
          <td class="py-3 px-4 font-black text-amber-700">${l.quantityRework}</td>
          <td class="py-3 px-4 font-bold ${l.defectRate > 5 ? 'text-red-600' : 'text-gray-700'}">${l.defectRate}%</td>
          <td class="py-3 px-4">
            <span class="px-2 py-0.5 rounded text-[11px] font-bold border ${resultBadge}">${l.result}</span>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="9" class="py-6 text-center text-red-500">Failed to load QC inspections: ${err.message}</td></tr>`;
  }
}
