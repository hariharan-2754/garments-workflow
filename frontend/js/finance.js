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

  // Tabs
  const tabTxns = document.getElementById('tab-txns');
  const tabPiece = document.getElementById('tab-piecerate');
  const secTxns = document.getElementById('txns-section');
  const secPiece = document.getElementById('piecerate-section');

  tabTxns.addEventListener('click', () => {
    tabTxns.classList.add('border-[#124b4f]', 'text-[#124b4f]');
    tabTxns.classList.remove('border-transparent', 'text-gray-500');
    tabPiece.classList.add('border-transparent', 'text-gray-500');
    tabPiece.classList.remove('border-[#124b4f]', 'text-[#124b4f]');
    secTxns.classList.remove('hidden');
    secPiece.classList.add('hidden');
    loadTransactions();
  });

  tabPiece.addEventListener('click', () => {
    tabPiece.classList.add('border-[#124b4f]', 'text-[#124b4f]');
    tabPiece.classList.remove('border-transparent', 'text-gray-500');
    tabTxns.classList.add('border-transparent', 'text-gray-500');
    tabTxns.classList.remove('border-[#124b4f]', 'text-[#124b4f]');
    secPiece.classList.remove('hidden');
    secTxns.classList.add('hidden');
    loadPieceRateLedger();
  });

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

async function loadPieceRateLedger() {
  const tbody = document.getElementById('piecerate-tbody');
  if (!tbody) return;

  try {
    const records = await apiFetch('/transactions/piece-rate/ledger');
    if (!records || records.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" class="py-6 text-center text-gray-400">No piece-rate production logs recorded.</td></tr>`;
      return;
    }

    tbody.innerHTML = records.map(r => {
      const isAccrued = r.status === 'Accrued';
      return `
        <tr class="hover:bg-gray-50/70">
          <td class="py-3 px-4 font-bold text-gray-950">${r.workerName}</td>
          <td class="py-3 px-4 font-mono font-bold text-teal-900">${r.jobNumber || '-'}</td>
          <td class="py-3 px-4 text-gray-700">${r.department}</td>
          <td class="py-3 px-4 font-mono font-bold text-gray-800">${r.completedQuantity} pcs</td>
          <td class="py-3 px-4 font-mono font-black text-emerald-700">${r.acceptedQuantity} pcs</td>
          <td class="py-3 px-4 font-mono text-gray-600">${formatCurrency(r.ratePerPiece)}/pc</td>
          <td class="py-3 px-4 font-mono font-black text-gray-950">${formatCurrency(r.payoutAmount)}</td>
          <td class="py-3 px-4">
            <span class="px-2 py-0.5 rounded text-[10px] font-bold ${isAccrued ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}">
              ${r.status}
            </span>
          </td>
          <td class="py-3 px-4 text-right">
            ${isAccrued ? `
              <button data-worker="${r.workerId}" class="settle-worker-btn px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[11px] font-bold">
                Settle Payout
              </button>
            ` : `<span class="text-gray-400 font-bold text-[11px]">Paid</span>`}
          </td>
        </tr>
      `;
    }).join('');

    document.querySelectorAll('.settle-worker-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const workerId = btn.dataset.worker;
        try {
          await apiFetch(`/transactions/piece-rate/settle-payout?workerId=${workerId}`, { method: 'POST' });
          showToast('Piece-rate payout settled successfully', 'success');
          loadSummary();
          loadPieceRateLedger();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="9" class="py-6 text-center text-red-500">Failed to load piece-rate ledger: ${err.message}</td></tr>`;
  }
}
