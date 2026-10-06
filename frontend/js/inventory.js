import { apiFetch, requireAuth, renderERPNavigation, formatCurrency, showToast } from './api.js';

let allMaterials = [];

document.addEventListener('DOMContentLoaded', async () => {
  const user = requireAuth(['ADMIN', 'MANAGER', 'SUPERVISOR']);
  if (!user) return;

  renderERPNavigation('inventory');

  // Mobile menu toggle
  const mobileToggle = document.getElementById('mobile-menu-toggle');
  const sidebar = document.getElementById('erp-sidebar');
  if (mobileToggle && sidebar) {
    mobileToggle.addEventListener('click', () => {
      sidebar.classList.toggle('-translate-x-full');
    });
  }

  // Tabs
  const tabMats = document.getElementById('tab-materials');
  const tabLed = document.getElementById('tab-ledger');
  const tabBom = document.getElementById('tab-bom');
  const secMats = document.getElementById('materials-section');
  const secLed = document.getElementById('ledger-section');
  const secBom = document.getElementById('bom-section');

  tabMats.addEventListener('click', () => {
    switchTab(tabMats, [tabLed, tabBom]);
    secMats.classList.remove('hidden');
    secLed.classList.add('hidden');
    secBom.classList.add('hidden');
    loadMaterials();
  });

  tabLed.addEventListener('click', () => {
    switchTab(tabLed, [tabMats, tabBom]);
    secLed.classList.remove('hidden');
    secMats.classList.add('hidden');
    secBom.classList.add('hidden');
    loadLedger();
  });

  tabBom.addEventListener('click', () => {
    switchTab(tabBom, [tabMats, tabLed]);
    secBom.classList.remove('hidden');
    secMats.classList.add('hidden');
    secLed.classList.add('hidden');
    loadBOMs();
  });

  function switchTab(active, others) {
    active.classList.add('border-[#124b4f]', 'text-[#124b4f]');
    active.classList.remove('border-transparent', 'text-gray-500');
    others.forEach(o => {
      o.classList.add('border-transparent', 'text-gray-500');
      o.classList.remove('border-[#124b4f]', 'text-[#124b4f]');
    });
  }

  // Filters
  document.getElementById('search-material')?.addEventListener('input', filterAndRenderMaterials);
  document.getElementById('filter-category')?.addEventListener('change', filterAndRenderMaterials);
  document.getElementById('filter-lowstock')?.addEventListener('change', filterAndRenderMaterials);

  // Modals
  const matModal = document.getElementById('material-modal');
  const moveModal = document.getElementById('movement-modal');

  document.getElementById('open-material-modal')?.addEventListener('click', () => matModal.classList.remove('hidden'));
  document.getElementById('close-mat-modal')?.addEventListener('click', () => matModal.classList.add('hidden'));
  document.getElementById('cancel-mat-btn')?.addEventListener('click', () => matModal.classList.add('hidden'));

  document.getElementById('open-movement-modal')?.addEventListener('click', () => {
    populateMovementDropdown();
    moveModal.classList.remove('hidden');
  });
  document.getElementById('close-move-modal')?.addEventListener('click', () => moveModal.classList.add('hidden'));
  document.getElementById('cancel-move-btn')?.addEventListener('click', () => moveModal.classList.add('hidden'));

  // Add Material Form
  document.getElementById('material-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      sku: document.getElementById('mat-sku').value,
      category: document.getElementById('mat-category').value,
      name: document.getElementById('mat-name').value,
      unit: document.getElementById('mat-unit').value,
      currentQuantity: parseFloat(document.getElementById('mat-qty').value),
      costPerUnit: parseFloat(document.getElementById('mat-cost').value),
      minimumStock: parseFloat(document.getElementById('mat-min').value),
      reorderLevel: parseFloat(document.getElementById('mat-reorder').value),
      warehouseLocation: document.getElementById('mat-location').value,
      supplierName: document.getElementById('mat-supplier').value
    };

    try {
      await apiFetch('/materials', { method: 'POST', body: payload });
      showToast('Material SKU created successfully', 'success');
      matModal.classList.add('hidden');
      document.getElementById('material-form').reset();
      loadMaterials();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Movement Form
  document.getElementById('movement-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      materialId: document.getElementById('move-material-select').value,
      type: document.getElementById('move-type').value,
      quantity: parseFloat(document.getElementById('move-qty').value),
      reason: document.getElementById('move-reason').value
    };

    try {
      await apiFetch('/materials/movement', { method: 'POST', body: payload });
      showToast('Stock movement recorded', 'success');
      moveModal.classList.add('hidden');
      loadMaterials();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  await loadMaterials();
});

async function loadMaterials() {
  const tbody = document.getElementById('materials-tbody');
  if (!tbody) return;

  try {
    allMaterials = await apiFetch('/materials');
    filterAndRenderMaterials();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="9" class="py-6 text-center text-red-500">Failed to load materials: ${err.message}</td></tr>`;
  }
}

function filterAndRenderMaterials() {
  const tbody = document.getElementById('materials-tbody');
  if (!tbody) return;

  const search = document.getElementById('search-material')?.value.toLowerCase().trim() || '';
  const category = document.getElementById('filter-category')?.value || '';
  const lowStockOnly = document.getElementById('filter-lowstock')?.checked || false;

  let filtered = allMaterials.filter(m => {
    if (search && !m.name.toLowerCase().includes(search) && !m.sku.toLowerCase().includes(search)) return false;
    if (category && m.category !== category) return false;
    if (lowStockOnly && !m.isLowStock && m.currentQuantity > m.minimumStock) return false;
    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="py-6 text-center text-gray-400">No materials match selected filters.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(m => {
    const isLow = m.isLowStock || m.currentQuantity <= m.minimumStock;
    const isReorder = !isLow && m.currentQuantity <= m.reorderLevel;

    return `
      <tr class="hover:bg-gray-50/70">
        <td class="py-3 px-4 font-mono font-bold text-gray-900">${m.sku}</td>
        <td class="py-3 px-4 font-bold text-gray-950">${m.name}</td>
        <td class="py-3 px-4 text-gray-700 font-semibold">${m.category}</td>
        <td class="py-3 px-4 font-black ${isLow ? 'text-red-600' : 'text-gray-900'}">${m.currentQuantity}</td>
        <td class="py-3 px-4 text-gray-600 font-semibold">${m.unit}</td>
        <td class="py-3 px-4 text-gray-600 font-mono text-xs">${m.minimumStock} / ${m.reorderLevel}</td>
        <td class="py-3 px-4 font-bold text-gray-800">${formatCurrency(m.costPerUnit)}</td>
        <td class="py-3 px-4 text-gray-600 text-xs">${m.warehouseLocation || '-'}</td>
        <td class="py-3 px-4">
          ${isLow ? `
            <span class="px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded text-[10px] font-bold">LOW STOCK</span>
          ` : isReorder ? `
            <span class="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[10px] font-bold">REORDER</span>
          ` : `
            <span class="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold">OPTIMAL</span>
          `}
        </td>
      </tr>
    `;
  }).join('');
}

function populateMovementDropdown() {
  const select = document.getElementById('move-material-select');
  if (!select) return;
  select.innerHTML = allMaterials.map(m => `
    <option value="${m.id}">${m.sku} - ${m.name} (${m.currentQuantity} ${m.unit} in stock)</option>
  `).join('');
}

async function loadLedger() {
  const tbody = document.getElementById('ledger-tbody');
  if (!tbody) return;

  try {
    const ledger = await apiFetch('/materials/ledger/history');
    if (!ledger || ledger.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="py-6 text-center text-gray-400">No inventory movements recorded yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = ledger.map(l => {
      const isOut = l.type.includes('Out') || l.type.includes('Consumption') || l.type.includes('Reservation');
      return `
        <tr class="hover:bg-gray-50/70 text-xs">
          <td class="py-3 px-4 font-mono text-gray-600">${l.timestamp?.split('T')[0] || '-'}</td>
          <td class="py-3 px-4 font-bold text-gray-950">${l.materialSku} — ${l.materialName}</td>
          <td class="py-3 px-4">
            <span class="px-2 py-0.5 rounded text-[10px] font-bold ${isOut ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}">
              ${l.type}
            </span>
          </td>
          <td class="py-3 px-4 font-black ${isOut ? 'text-rose-700' : 'text-emerald-700'}">
            ${isOut ? '-' : '+'}${l.quantity}
          </td>
          <td class="py-3 px-4 font-bold text-gray-900">${l.balanceAfter}</td>
          <td class="py-3 px-4 text-gray-700">${l.reason} ${l.referenceId ? `(${l.referenceId})` : ''}</td>
          <td class="py-3 px-4 text-gray-500 font-medium">${l.performedBy || 'System'}</td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="py-6 text-center text-red-500">Failed to load ledger: ${err.message}</td></tr>`;
  }
}

async function loadBOMs() {
  const container = document.getElementById('bom-cards-container');
  if (!container) return;

  try {
    const boms = await apiFetch('/materials/bom/list');
    if (!boms || boms.length === 0) {
      container.innerHTML = `<div class="p-6 text-center text-gray-400 col-span-2">No BOM configurations defined yet.</div>`;
      return;
    }

    container.innerHTML = boms.map(b => `
      <div class="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3">
        <div class="flex justify-between items-start">
          <div>
            <h4 class="font-black text-gray-950 text-sm">${b.productName}</h4>
            <span class="font-mono text-[11px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded">${b.productCode}</span>
          </div>
          <span class="text-xs font-bold text-gray-500">${b.items?.length || 0} Material Items</span>
        </div>

        <div class="space-y-1.5 border-t border-gray-100 pt-2.5">
          ${(b.items || []).map(item => `
            <div class="flex justify-between items-center text-xs">
              <span class="text-gray-800 font-medium">${item.materialName}</span>
              <span class="font-mono font-bold text-gray-950">${item.requiredQuantity} ${item.unit} <span class="text-gray-400 font-normal">(+${item.wastagePercentage}% waste)</span></span>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = `<p class="text-red-500 text-xs">Failed to load BOM list.</p>`;
  }
}
