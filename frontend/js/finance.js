import { apiFetch, requireAuth, renderERPNavigation, formatCurrency, showToast } from './api.js';

document.addEventListener('DOMContentLoaded', async () => {
  const user = requireAuth(['ADMIN', 'MANAGER']);
  if (!user) return;

  renderERPNavigation('finance');

  // Mobile menu toggle
  const mobileToggle = document.getElementById('mobile-menu-toggle');
  const sidebar = document.getElementById('erp-sidebar');
  if (mobileToggle && sidebar) {
    mobileToggle.addEventListener('click', () => {
      sidebar.classList.toggle('-translate-x-full');
    });
  }

  // Modal
  const txnModal = document.getElementById('txn-modal');
  document.getElementById('open-txn-modal')?.addEventListener('click', () => txnModal.classList.remove('hidden'));
  document.getElementById('close-txn-modal')?.addEventListener('click', () => txnModal.classList.add('hidden'));
  document.getElementById('cancel-txn-btn')?.addEventListener('click', () => txnModal.classList.add('hidden'));

  // Form submit
  document.getElementById('txn-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      type: document.getElementById('txn-type').value,
      category: document.getElementById('txn-cat').value,
      amount: parseFloat(document.getElementById('txn-amount').value),
      paymentMethod: document.getElementById('txn-method').value,
      partyName: document.getElementById('txn-party').value,
      description: document.getElementById('txn-desc').value
    };

    try {
      await apiFetch('/transactions', { method: 'POST', body: payload });
      showToast('Transaction recorded successfully', 'success');
      txnModal.classList.add('hidden');
      document.getElementById('txn-form').reset();
      loadSummary();
      loadTransactions();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  await loadSummary();
  await loadTransactions();
});

async function loadSummary() {
  try {
    const summary = await apiFetch('/transactions/summary/pnl');
    document.getElementById('pnl-income').innerText = formatCurrency(summary.totalIncome || 0);
    document.getElementById('pnl-expense').innerText = formatCurrency(summary.totalExpense || 0);
    document.getElementById('pnl-profit').innerText = formatCurrency(summary.netProfit || 0);
  } catch (err) {
    console.error('Error loading P&L summary:', err);
  }
}

async function loadTransactions() {
  const tbody = document.getElementById('txns-tbody');
  if (!tbody) return;

  try {
    const txns = await apiFetch('/transactions');
    if (!txns || txns.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="py-6 text-center text-gray-400">No financial transactions recorded.</td></tr>`;
      return;
    }

    tbody.innerHTML = txns.map(t => {
      const isInc = t.type === 'Income';
      return `
        <tr class="hover:bg-gray-50/70">
          <td class="py-3 px-4 font-mono font-bold text-gray-900">${t.transactionNumber}</td>
          <td class="py-3 px-4 font-mono text-gray-600">${t.date}</td>
          <td class="py-3 px-4">
            <span class="px-2 py-0.5 rounded text-[10px] font-bold ${isInc ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}">
              ${t.type}
            </span>
          </td>
          <td class="py-3 px-4 font-bold text-gray-950">${t.category}</td>
          <td class="py-3 px-4 font-semibold text-gray-800">${t.partyName || '-'}</td>
          <td class="py-3 px-4 text-gray-700">${t.paymentMethod}</td>
          <td class="py-3 px-4 text-right font-black ${isInc ? 'text-emerald-700' : 'text-gray-900'}">
            ${isInc ? '+' : '-'}${formatCurrency(t.amount)}
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="py-6 text-center text-red-500">Failed to load transactions: ${err.message}</td></tr>`;
  }
}
