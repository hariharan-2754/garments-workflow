import { apiFetch, requireAuth, renderERPNavigation, formatCurrency, showToast } from './api.js';

let allSuppliers = [];

document.addEventListener('DOMContentLoaded', async () => {
  const user = requireAuth(['ADMIN', 'MANAGER']);
  if (!user) return;

  renderERPNavigation('purchasing');

  // Mobile menu toggle
  const mobileToggle = document.getElementById('mobile-menu-toggle');
  const sidebar = document.getElementById('erp-sidebar');
  if (mobileToggle && sidebar) {
    mobileToggle.addEventListener('click', () => {
      sidebar.classList.toggle('-translate-x-full');
    });
  }

  // Delivery date default +7 days
  const d = new Date();
  d.setDate(d.getDate() + 7);
  const delInput = document.getElementById('po-delivery-date');
  if (delInput) delInput.value = d.toISOString().split('T')[0];

  // Tabs
  const tabPos = document.getElementById('tab-pos');
  const tabSups = document.getElementById('tab-suppliers');
  const secPos = document.getElementById('pos-section');
  const secSups = document.getElementById('suppliers-section');

  tabPos.addEventListener('click', () => {
    tabPos.classList.add('border-[#124b4f]', 'text-[#124b4f]');
    tabPos.classList.remove('border-transparent', 'text-gray-500');
    tabSups.classList.add('border-transparent', 'text-gray-500');
    tabSups.classList.remove('border-[#124b4f]', 'text-[#124b4f]');
    secPos.classList.remove('hidden');
    secSups.classList.add('hidden');
    loadPOs();
  });

  tabSups.addEventListener('click', () => {
    tabSups.classList.add('border-[#124b4f]', 'text-[#124b4f]');
    tabSups.classList.remove('border-transparent', 'text-gray-500');
    tabPos.classList.add('border-transparent', 'text-gray-500');
    tabPos.classList.remove('border-[#124b4f]', 'text-[#124b4f]');
    secSups.classList.remove('hidden');
    secPos.classList.add('hidden');
    loadSuppliers();
  });

  // Modals
  const poModal = document.getElementById('po-modal');
  document.getElementById('open-po-modal')?.addEventListener('click', () => {
    populateSupplierSelect();
    poModal.classList.remove('hidden');
  });
  document.getElementById('close-po-modal')?.addEventListener('click', () => poModal.classList.add('hidden'));
  document.getElementById('cancel-po-btn')?.addEventListener('click', () => poModal.classList.add('hidden'));

  const supModal = document.getElementById('supplier-modal');
  document.getElementById('open-supplier-modal')?.addEventListener('click', () => supModal.classList.remove('hidden'));
  document.getElementById('close-sup-modal')?.addEventListener('click', () => supModal.classList.add('hidden'));
  document.getElementById('cancel-sup-btn')?.addEventListener('click', () => supModal.classList.add('hidden'));

  // Create PO Form
  document.getElementById('po-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const supId = document.getElementById('po-supplier-select').value;
    const sup = allSuppliers.find(s => s.id === supId);
    const qty = parseFloat(document.getElementById('po-item-qty').value);
    const price = parseFloat(document.getElementById('po-item-price').value);

    const payload = {
      supplierId: supId,
      supplierName: sup?.name || 'Supplier',
      expectedDeliveryDate: document.getElementById('po-delivery-date').value,
      items: [{
        materialName: document.getElementById('po-item-name').value,
        quantity: qty,
        unit: document.getElementById('po-item-unit').value,
        unitPrice: price,
        total: qty * price
      }],
      notes: document.getElementById('po-notes').value
    };

    try {
      await apiFetch('/purchases', { method: 'POST', body: payload });
      showToast('Purchase Order created successfully', 'success');
      poModal.classList.add('hidden');
      document.getElementById('po-form').reset();
      loadPOs();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Create Supplier Form
  document.getElementById('supplier-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      name: document.getElementById('sup-name').value,
      category: document.getElementById('sup-cat').value,
      paymentTerms: document.getElementById('sup-terms').value,
      contactPerson: document.getElementById('sup-person').value,
      phone: document.getElementById('sup-phone').value
    };

    try {
      await apiFetch('/suppliers', { method: 'POST', body: payload });
      showToast('Supplier registered', 'success');
      supModal.classList.add('hidden');
      document.getElementById('supplier-form').reset();
      loadSuppliers();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  await loadSuppliers();
  await loadPOs();
});

async function loadSuppliers() {
  const tbody = document.getElementById('suppliers-tbody');
  try {
    allSuppliers = await apiFetch('/suppliers');
    if (!tbody) return;

    if (!allSuppliers || allSuppliers.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="py-6 text-center text-gray-400">No vendors registered yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = allSuppliers.map(s => `
      <tr class="hover:bg-gray-50/70">
        <td class="py-3 px-4 font-bold text-gray-950">${s.name}</td>
        <td class="py-3 px-4 text-gray-700 font-semibold">${s.category}</td>
        <td class="py-3 px-4 font-semibold text-gray-900">${s.contactPerson || '-'}</td>
        <td class="py-3 px-4 text-gray-600 font-mono text-xs">${s.phone || '-'}</td>
        <td class="py-3 px-4 text-gray-700">${s.paymentTerms}</td>
        <td class="py-3 px-4 font-bold text-amber-600">⭐ ${s.rating}</td>
        <td class="py-3 px-4 font-mono font-bold text-gray-900">${s.totalOrdersCount} POs</td>
      </tr>
    `).join('');
  } catch (err) {
    if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="py-6 text-center text-red-500">Failed to load suppliers.</td></tr>`;
  }
}

function populateSupplierSelect() {
  const select = document.getElementById('po-supplier-select');
  if (!select) return;
  select.innerHTML = allSuppliers.map(s => `
    <option value="${s.id}">${s.name} (${s.category})</option>
  `).join('');
}

async function loadPOs() {
  const tbody = document.getElementById('pos-tbody');
  if (!tbody) return;

  try {
    const pos = await apiFetch('/purchases');
    if (!pos || pos.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="py-6 text-center text-gray-400">No purchase orders found.</td></tr>`;
      return;
    }

    tbody.innerHTML = pos.map(p => {
      const isReceived = p.status === 'Received';
      const statusBadge = isReceived 
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
        : p.status === 'Approved' || p.status === 'Ordered' 
        ? 'bg-blue-50 text-blue-700 border-blue-200' 
        : 'bg-amber-50 text-amber-700 border-amber-200';

      return `
        <tr class="hover:bg-gray-50/70">
          <td class="py-3 px-4 font-mono font-bold text-gray-900">${p.poNumber}</td>
          <td class="py-3 px-4 font-bold text-gray-950">${p.supplierName}</td>
          <td class="py-3 px-4 font-mono text-gray-600">${p.expectedDeliveryDate}</td>
          <td class="py-3 px-4 font-semibold text-gray-800">${p.items?.length || 0} Lines</td>
          <td class="py-3 px-4 font-black text-gray-900">${formatCurrency(p.totalAmount)}</td>
          <td class="py-3 px-4">
            <span class="px-2 py-0.5 rounded text-[11px] font-bold border ${statusBadge}">${p.status}</span>
          </td>
          <td class="py-3 px-4 text-right">
            ${!isReceived ? `
              <button data-id="${p.id}" class="receive-grn-btn px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[11px] font-bold transition-colors">
                Receive Goods (GRN)
              </button>
            ` : `
              <span class="text-emerald-700 font-bold text-[11px]">✓ In Inventory</span>
            `}
          </td>
        </tr>
      `;
    }).join('');

    document.querySelectorAll('.receive-grn-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const poId = btn.dataset.id;
        const targetPo = pos.find(x => x.id === poId);
        if (!targetPo) return;

        try {
          await apiFetch('/purchases/goods-receipt', {
            method: 'POST',
            body: {
              purchaseOrderId: poId,
              receivedItems: targetPo.items || [],
              qualityApproved: true,
              notes: 'Full consignment received at factory store'
            }
          });
          showToast('Goods received! Material stock updated & expense booked.', 'success');
          loadPOs();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="py-6 text-center text-red-500">Failed to load purchase orders.</td></tr>`;
  }
}
