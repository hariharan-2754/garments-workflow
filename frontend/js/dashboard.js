import { apiFetch, requireAuth, renderERPNavigation, formatCurrency, showToast } from './api.js';

document.addEventListener('DOMContentLoaded', async () => {
  const user = requireAuth(['ADMIN', 'MANAGER', 'SUPERVISOR']);
  if (!user) return;

  renderERPNavigation('dashboard');

  // Set greeting and role badge
  const greetingEl = document.getElementById('user-display-name');
  if (greetingEl) {
    greetingEl.innerText = `${user.name} (${user.role}${user.department ? ' — ' + user.department : ''})`;
  }

  // Mobile drawer toggle
  const mobileToggle = document.getElementById('mobile-menu-toggle');
  const sidebar = document.getElementById('erp-sidebar');
  if (mobileToggle && sidebar) {
    mobileToggle.addEventListener('click', () => {
      sidebar.classList.toggle('-translate-x-full');
    });
  }

  // Hide financial P&L card for supervisors
  if (user.role === 'SUPERVISOR') {
    const profitCard = document.getElementById('stat-net-profit')?.closest('.kpi-card-container') || document.getElementById('stat-net-profit')?.parentElement;
    if (profitCard) {
      profitCard.classList.add('hidden');
    }
    const financeSection = document.getElementById('recent-txns-tbody')?.closest('section') || document.getElementById('recent-txns-tbody')?.closest('.bg-white');
    if (financeSection) {
      financeSection.classList.add('hidden');
    }
  }

  await loadDashboardKPIs(user);
  await loadDispatchedTasks();
  await loadStockAlerts();
  if (user.role !== 'SUPERVISOR') {
    await loadRecentTransactions();
  }
});

async function loadDashboardKPIs(user) {
  try {
    const kpis = await apiFetch('/analytics/dashboard');
    if (!kpis) return;
    
    const pendingEl = document.getElementById('stat-pending-tasks');
    if (pendingEl) pendingEl.innerText = kpis.pendingTasks || 0;

    const presentEl = document.getElementById('stat-present-workers');
    if (presentEl) presentEl.innerText = kpis.presentToday || 0;

    const attRateEl = document.getElementById('stat-att-rate');
    if (attRateEl) attRateEl.innerText = (kpis.attendanceRate || 0) + '% Rate';

    const stockEl = document.getElementById('stat-low-stock');
    if (stockEl) stockEl.innerText = kpis.lowStockCount || 0;

    const machEl = document.getElementById('stat-machines-down');
    if (machEl) machEl.innerText = kpis.machinesDown || 0;
    
    const profitEl = document.getElementById('stat-net-profit');
    if (profitEl && user.role !== 'SUPERVISOR') {
      profitEl.innerText = formatCurrency(kpis.netProfit || 0);
    }

    // Render Department Throughput
    const deptContainer = document.getElementById('dept-throughput-container');
    if (deptContainer && kpis.departmentThroughput) {
      const maxJobs = Math.max(1, ...kpis.departmentThroughput.map(d => d.completedJobs || 0));
      deptContainer.innerHTML = kpis.departmentThroughput.map(d => {
        const pct = Math.round(((d.completedJobs || 0) / maxJobs) * 100);
        return `
          <div class="space-y-1">
            <div class="flex justify-between text-xs font-bold">
              <span class="text-gray-700">${d.department}</span>
              <span class="text-gray-900">${d.completedJobs || 0} Jobs</span>
            </div>
            <div class="w-full bg-gray-100 rounded-full h-2">
              <div class="bg-[#124b4f] h-2 rounded-full transition-all duration-500" style="width: ${Math.max(5, pct)}%"></div>
            </div>
          </div>
        `;
      }).join('');
    }
  } catch (err) {
    console.error('Error loading dashboard KPIs:', err);
  }
}

async function loadDispatchedTasks() {
  const tbody = document.getElementById('dashboard-tasks-tbody');
  if (!tbody) return;

  try {
    const tasks = await apiFetch('/tasks');
    if (!tasks || tasks.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="py-6 text-center text-gray-400">No factory tasks dispatched yet. Click "+ Assign Task" above.</td></tr>`;
      return;
    }

    tbody.innerHTML = tasks.slice(0, 8).map(t => {
      const priorityClass = t.priority === 'High' || t.priority === 'Urgent' 
        ? 'bg-red-50 text-red-700 border-red-200' 
        : t.priority === 'Medium' 
        ? 'bg-amber-50 text-amber-700 border-amber-200' 
        : 'bg-blue-50 text-blue-700 border-blue-200';

      const isCompleted = t.status === 'Completed' || t.status === 'Reviewed';
      const statusClass = isCompleted 
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
        : t.status === 'In Progress'
        ? 'bg-sky-50 text-sky-700 border-sky-200'
        : 'bg-amber-50 text-amber-700 border-amber-200';

      return `
        <tr class="hover:bg-gray-50/70 transition-colors">
          <td class="py-3 px-4">
            <div class="font-bold text-gray-950">${t.title}</div>
            <div class="text-[11px] text-gray-400 truncate max-w-xs">${t.description || ''}</div>
          </td>
          <td class="py-3 px-4">
            <span class="px-2 py-0.5 bg-teal-50 text-[#124b4f] font-bold rounded-lg border border-teal-200/80 text-[11px]">
              ${t.department}
            </span>
          </td>
          <td class="py-3 px-4">
            <span class="px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${priorityClass}">
              ${t.priority}
            </span>
          </td>
          <td class="py-3 px-4 font-mono text-gray-600 text-xs">${t.dueDate || 'No date'}</td>
          <td class="py-3 px-4">
            <span class="px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${statusClass}">
              ${t.status || 'Pending'}
            </span>
          </td>
          <td class="py-3 px-4 text-right">
            <a href="assign-task.html" class="px-2.5 py-1 bg-gray-100 hover:bg-[#124b4f] hover:text-white rounded-lg text-[11px] font-bold text-gray-700 transition-colors">
              Dispatch +
            </a>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="py-6 text-center text-red-500">Failed to load tasks: ${err.message}</td></tr>`;
  }
}

async function loadStockAlerts() {
  const container = document.getElementById('inventory-alerts-container');
  if (!container) return;

  try {
    const mats = await apiFetch('/materials');
    const lowStock = (mats || []).filter(m => m.isLowStock || Number(m.currentQuantity) <= Number(m.minimumStock));
    
    if (lowStock.length === 0) {
      container.innerHTML = `
        <div class="p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-2">
          <span>✅</span>
          <span>All material stocks are healthy and above reorder levels.</span>
        </div>
      `;
      return;
    }

    container.innerHTML = lowStock.slice(0, 4).map(m => `
      <div class="p-3 bg-red-50/70 border border-red-200/80 rounded-xl flex items-center justify-between text-xs">
        <div class="space-y-0.5">
          <p class="font-bold text-red-950">${m.name}</p>
          <p class="text-[11px] text-red-700 font-medium">SKU: <span class="font-mono font-bold">${m.sku}</span> | Category: ${m.category}</p>
        </div>
        <div class="text-right">
          <span class="font-black text-red-700 text-sm">${m.currentQuantity} ${m.unit}</span>
          <p class="text-[10px] text-red-500 font-bold">Min: ${m.minimumStock} ${m.unit}</p>
        </div>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = `<p class="text-xs text-gray-400">Unable to load inventory alerts.</p>`;
  }
}

async function loadRecentTransactions() {
  const tbody = document.getElementById('recent-txns-tbody');
  if (!tbody) return;

  try {
    const txns = await apiFetch('/transactions/ledger');
    if (!txns || txns.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="py-4 text-center text-gray-400">No recorded financial transactions yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = txns.slice(0, 5).map(t => {
      const isInc = t.type === 'Income';
      return `
        <tr class="hover:bg-gray-50/70">
          <td class="py-2.5 px-4 font-mono font-bold text-gray-900">${t.transactionNumber}</td>
          <td class="py-2.5 px-4 text-gray-600">${t.date}</td>
          <td class="py-2.5 px-4">
            <span class="px-2 py-0.5 text-[10px] font-extrabold rounded-md ${isInc ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}">
              ${t.type}
            </span>
          </td>
          <td class="py-2.5 px-4 font-medium text-gray-700">${t.category}</td>
          <td class="py-2.5 px-4 font-semibold text-gray-900">${t.partyName || '-'}</td>
          <td class="py-2.5 px-4 text-right font-black ${isInc ? 'text-emerald-700' : 'text-gray-900'}">
            ${isInc ? '+' : '-'}${formatCurrency(t.amount)}
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="py-4 text-center text-gray-400">No transactions to display.</td></tr>`;
  }
}
