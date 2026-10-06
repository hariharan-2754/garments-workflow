import { apiFetch, requireAuth, renderERPNavigation, formatCurrency, showToast } from './api.js';

let allCustomers = [];
let allSalesOrders = [];

document.addEventListener('DOMContentLoaded', async () => {
  const user = requireAuth(['ADMIN', 'MANAGER', 'SUPERVISOR']);
  if (!user) return;

  renderERPNavigation('orders-dispatch');

  // Mobile menu toggle
  const mobileToggle = document.getElementById('mobile-menu-toggle');
  const sidebar = document.getElementById('erp-sidebar');
  if (mobileToggle && sidebar) {
    mobileToggle.addEventListener('click', () => {
      sidebar.classList.toggle('-translate-x-full');
    });
  }

  // Delivery date default +14 days
  const d = new Date();
  d.setDate(d.getDate() + 14);
  const delInput = document.getElementById('sales-delivery-date');
  if (delInput) delInput.value = d.toISOString().split('T')[0];

  // Tabs
  const tabOrders = document.getElementById('tab-orders');
  const tabDisp = document.getElementById('tab-dispatch');
  const tabCust = document.getElementById('tab-customers');
  const secOrders = document.getElementById('orders-section');
  const secDisp = document.getElementById('dispatch-section');
  const secCust = document.getElementById('customers-section');

  tabOrders.addEventListener('click', () => {
    switchTab(tabOrders, [tabDisp, tabCust]);
    secOrders.classList.remove('hidden');
    secDisp.classList.add('hidden');
    secCust.classList.add('hidden');
    loadSalesOrders();
  });

  tabDisp.addEventListener('click', () => {
    switchTab(tabDisp, [tabOrders, tabCust]);
    secDisp.classList.remove('hidden');
    secOrders.classList.add('hidden');
    secCust.classList.add('hidden');
    loadDispatches();
  });

  tabCust.addEventListener('click', () => {
    switchTab(tabCust, [tabOrders, tabDisp]);
    secCust.classList.remove('hidden');
    secOrders.classList.add('hidden');
    secDisp.classList.add('hidden');
    loadCustomers();
  });

  function switchTab(active, others) {
    active.classList.add('border-[#124b4f]', 'text-[#124b4f]');
    active.classList.remove('border-transparent', 'text-gray-500');
    others.forEach(o => {
      o.classList.add('border-transparent', 'text-gray-500');
      o.classList.remove('border-[#124b4f]', 'text-[#124b4f]');
    });
  }

  // Modals
  const salesModal = document.getElementById('sales-modal');
  document.getElementById('open-sales-modal')?.addEventListener('click', () => {
    populateCustomerSelect();
    salesModal.classList.remove('hidden');
  });
  document.getElementById('close-sales-modal')?.addEventListener('click', () => salesModal.classList.add('hidden'));
  document.getElementById('cancel-sales-btn')?.addEventListener('click', () => salesModal.classList.add('hidden'));

  const dispModal = document.getElementById('dispatch-modal');
  document.getElementById('close-disp-modal')?.addEventListener('click', () => dispModal.classList.add('hidden'));
  document.getElementById('cancel-disp-btn')?.addEventListener('click', () => dispModal.classList.add('hidden'));

  // Sales Order Form
  document.getElementById('sales-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const custId = document.getElementById('sales-cust-select').value;
    const cust = allCustomers.find(c => c.id === custId);
    const qty = parseInt(document.getElementById('sales-item-qty').value, 10);
    const price = parseFloat(document.getElementById('sales-item-price').value);

    const payload = {
      customerId: custId,
      customerName: cust?.name || 'Customer',
      deliveryDate: document.getElementById('sales-delivery-date').value,
      priority: document.getElementById('sales-priority').value,
      autoCreateProductionOrder: document.getElementById('sales-auto-prod').checked,
      items: [{
        productName: document.getElementById('sales-item-name').value,
        quantity: qty,
        unitPrice: price,
        total: qty * price
      }]
    };

    try {
      await apiFetch('/customers/orders', { method: 'POST', body: payload });
      showToast('Sales order booked and production order created!', 'success');
      salesModal.classList.add('hidden');
      document.getElementById('sales-form').reset();
      loadSalesOrders();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Dispatch Form
  document.getElementById('dispatch-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      customerOrderId: document.getElementById('disp-order-id').value,
      courierName: document.getElementById('disp-courier').value,
      trackingNumber: document.getElementById('disp-awb').value,
      shippingAddress: document.getElementById('disp-address').value
    };

    try {
      await apiFetch('/dispatch/create', { method: 'POST', body: payload });
      showToast('Consignment dispatched and in transit!', 'success');
      dispModal.classList.add('hidden');
      document.getElementById('dispatch-form').reset();
      loadSalesOrders();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  await loadCustomers();
  await loadSalesOrders();
});

async function loadCustomers() {
  const tbody = document.getElementById('customers-tbody');
  try {
    allCustomers = await apiFetch('/customers');
    if (!tbody) return;

    if (!allCustomers || allCustomers.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-gray-400">No client accounts found.</td></tr>`;
      return;
    }

    tbody.innerHTML = allCustomers.map(c => `
      <tr class="hover:bg-gray-50/70">
        <td class="py-3 px-4 font-bold text-gray-950">${c.name}</td>
        <td class="py-3 px-4 text-gray-700 font-semibold">${c.customerType || 'Brand'}</td>
        <td class="py-3 px-4 font-semibold text-gray-900">${c.contactPerson || '-'}</td>
        <td class="py-3 px-4 font-mono text-gray-600 text-xs">${c.phone || c.email || '-'}</td>
        <td class="py-3 px-4 text-gray-600 text-xs">${c.address || '-'}</td>
      </tr>
    `).join('');
  } catch (err) {
    if (tbody) tbody.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-red-500">Failed to load customers.</td></tr>`;
  }
}

function populateCustomerSelect() {
  const select = document.getElementById('sales-cust-select');
  if (!select) return;
  select.innerHTML = allCustomers.map(c => `
    <option value="${c.id}">${c.name} (${c.customerType || 'Brand'})</option>
  `).join('');
}

async function loadSalesOrders() {
  const tbody = document.getElementById('sales-orders-tbody');
  if (!tbody) return;

  try {
    allSalesOrders = await apiFetch('/customers/orders/list');
    if (!allSalesOrders || allSalesOrders.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="py-6 text-center text-gray-400">No sales orders found.</td></tr>`;
      return;
    }

    tbody.innerHTML = allSalesOrders.map(o => {
      const isDelivered = o.deliveryStatus === 'Delivered';
      const isTransit = o.deliveryStatus === 'In Transit';

      return `
        <tr class="hover:bg-gray-50/70">
          <td class="py-3 px-4 font-mono font-bold text-gray-900">${o.orderNumber}</td>
          <td class="py-3 px-4 font-bold text-gray-950">${o.customerName}</td>
          <td class="py-3 px-4 font-mono text-gray-600">${o.deliveryDate}</td>
          <td class="py-3 px-4 font-black text-gray-900">${o.totalQuantity} pcs</td>
          <td class="py-3 px-4 font-black text-gray-900">${formatCurrency(o.totalAmount)}</td>
          <td class="py-3 px-4">
            <span class="px-2 py-0.5 rounded text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200">${o.productionStatus}</span>
          </td>
          <td class="py-3 px-4">
            <span class="px-2 py-0.5 rounded text-[11px] font-bold ${isDelivered ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : isTransit ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-gray-100 text-gray-700'}">
              ${o.deliveryStatus}
            </span>
          </td>
          <td class="py-3 px-4 text-right">
            ${o.deliveryStatus === 'Pending' || o.deliveryStatus === 'Ready to Dispatch' ? `
              <button data-id="${o.id}" data-name="${o.customerName}" class="open-disp-modal-btn px-2.5 py-1 bg-[#124b4f] hover:bg-[#0c383b] text-white rounded-lg text-[11px] font-bold">
                Dispatch 🚚
              </button>
            ` : `
              <span class="text-gray-400 font-bold text-[11px]">Dispatched</span>
            `}
          </td>
        </tr>
      `;
    }).join('');

    document.querySelectorAll('.open-disp-modal-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('disp-order-id').value = btn.dataset.id;
        document.getElementById('dispatch-modal').classList.remove('hidden');
      });
    });

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" class="py-6 text-center text-red-500">Failed to load sales orders.</td></tr>`;
  }
}

async function loadDispatches() {
  const tbody = document.getElementById('dispatch-tbody');
  if (!tbody) return;

  try {
    const dispatches = await apiFetch('/dispatch/list');
    if (!dispatches || dispatches.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="py-6 text-center text-gray-400">No active dispatches found.</td></tr>`;
      return;
    }

    tbody.innerHTML = dispatches.map(d => `
      <tr class="hover:bg-gray-50/70">
        <td class="py-3 px-4 font-mono font-bold text-gray-900">${d.dispatchNumber}</td>
        <td class="py-3 px-4 font-mono font-semibold text-gray-800">${d.orderNumber || '-'}</td>
        <td class="py-3 px-4 font-bold text-gray-950">${d.customerName || '-'}</td>
        <td class="py-3 px-4 font-semibold text-teal-900">${d.courierName}</td>
        <td class="py-3 px-4 font-mono font-bold text-gray-900">${d.trackingNumber}</td>
        <td class="py-3 px-4 font-mono text-gray-600">${d.dispatchDate}</td>
        <td class="py-3 px-4">
          <span class="px-2 py-0.5 rounded text-[11px] font-bold ${d.status === 'Delivered' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-purple-50 text-purple-700 border border-purple-200'}">
            ${d.status}
          </span>
        </td>
        <td class="py-3 px-4 text-right">
          ${d.status !== 'Delivered' ? `
            <button data-id="${d.id}" class="mark-delivered-btn px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[11px] font-bold">
              Mark Delivered
            </button>
          ` : `
            <span class="text-emerald-700 font-bold text-[11px]">✓ Delivered</span>
          `}
        </td>
      </tr>
    `).join('');

    document.querySelectorAll('.mark-delivered-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const dispId = btn.dataset.id;
        try {
          await apiFetch(`/dispatch/${dispId}/status`, {
            method: 'PUT',
            body: { status: 'Delivered', location: 'Customer Destination Address', remarks: 'Delivered and signed by consignee' }
          });
          showToast('Consignment marked as delivered!', 'success');
          loadDispatches();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" class="py-6 text-center text-red-500">Failed to load dispatches: ${err.message}</td></tr>`;
  }
}
