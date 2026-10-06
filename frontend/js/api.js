const isLocalHost = Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname === '::1' ||
  window.location.hostname === '[::1]' ||
  window.location.hostname.endsWith('.local') ||
  window.location.port === '5500' ||
  window.location.port === '8080' ||
  window.location.port === '3000'
);

export const BASE_URL = isLocalHost
  ? 'http://localhost:8000'
  : 'https://garments-workflow.onrender.com';

export function getToken() {
  return localStorage.getItem('gf_token') || '';
}

export function getUser() {
  const u = localStorage.getItem('gf_user');
  return u ? JSON.parse(u) : null;
}

export function setSession(token, user) {
  localStorage.setItem('gf_token', token);
  localStorage.setItem('gf_user', JSON.stringify(user));
}

export function logout() {
  localStorage.removeItem('gf_token');
  localStorage.removeItem('gf_user');
  window.location.href = '/login.html';
}

export function requireAuth(allowedRoles = []) {
  const user = getUser();
  if (!user) {
    window.location.href = '/login.html';
    return null;
  }
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    if (user.role === 'WORKER') {
      window.location.href = '/worker-home.html';
    } else {
      window.location.href = '/dashboard.html';
    }
    return null;
  }
  return user;
}

export async function apiFetch(path, options = {}) {
  const token = getToken();
  
  const headers = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s max timeout

  const config = {
    ...options,
    headers,
    signal: controller.signal,
  };

  if (options.body && !(options.body instanceof FormData)) {
    config.body = JSON.stringify(options.body);
  }

  try {
    const res = await fetch(`${BASE_URL}${path}`, config);
    clearTimeout(timeoutId);
    
    if (res.status === 401) {
      localStorage.removeItem('gf_token');
      localStorage.removeItem('gf_user');
      if (!window.location.pathname.endsWith('login.html')) {
        window.location.href = '/login.html';
      }
      throw new Error('Session expired. Please log in again.');
    }

    const data = await res.json().catch(() => ({}));
    
    if (!res.ok) {
      throw new Error(data.detail || 'Request failed');
    }
    
    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Backend connection timed out. Ensure FastAPI server is running on port 8000.');
    }
    throw err;
  }
}

export function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  const bg = type === 'success' ? 'bg-emerald-700' : type === 'error' ? 'bg-red-700' : type === 'warning' ? 'bg-amber-700' : 'bg-slate-800';
  toast.className = `p-4 rounded-xl shadow-xl text-white pointer-events-auto transition-all duration-300 flex items-center justify-between text-xs font-semibold ${bg}`;
  
  toast.innerHTML = `
    <span>${message}</span>
    <button class="ml-4 font-bold opacity-80 hover:opacity-100 focus:outline-none" onclick="this.parentElement.remove()">✕</button>
  `;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

export function formatCurrency(num) {
  return '₹' + Number(num || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

export function renderERPNavigation(activeKey) {
  const user = getUser();
  const sidebar = document.getElementById('erp-sidebar');
  if (!sidebar) return;

  const links = [
    { section: 'COMMAND CENTER' },
    { key: 'dashboard', label: 'Dashboard', icon: '📊', href: 'dashboard.html', roles: ['ADMIN', 'MANAGER', 'SUPERVISOR'] },
    
    { section: 'WORKFORCE' },
    { key: 'attendance', label: 'Attendance & Leaves', icon: '⏱️', href: 'attendance.html', roles: ['ADMIN', 'MANAGER', 'SUPERVISOR'] },
    { key: 'workers', label: 'Employee Directory', icon: '👥', href: 'workers.html', roles: ['ADMIN', 'MANAGER', 'SUPERVISOR'] },
    { key: 'departments', label: 'Departments', icon: '🏢', href: 'departments.html', roles: ['ADMIN', 'MANAGER', 'SUPERVISOR'] },

    { section: 'OPERATIONS' },
    { key: 'assign-task', label: 'Assign Tasks / Jobs', icon: '✍️', href: 'assign-task.html', roles: ['ADMIN', 'MANAGER', 'SUPERVISOR'] },
    { key: 'machines', label: 'Machinery & Equipment', icon: '⚙️', href: 'machines.html', roles: ['ADMIN', 'MANAGER', 'SUPERVISOR'] },

    { section: 'INVENTORY & PROCUREMENT' },
    { key: 'inventory', label: 'Material & Inventory', icon: '📦', href: 'inventory.html', roles: ['ADMIN', 'MANAGER', 'SUPERVISOR'] },
    { key: 'purchasing', label: 'Suppliers & Purchases', icon: '🛒', href: 'purchasing.html', roles: ['ADMIN', 'MANAGER'] },

    { section: 'REPORTS' },
    { key: 'reports', label: 'Reports & Exports', icon: '📈', href: 'reports.html', roles: ['ADMIN', 'MANAGER', 'SUPERVISOR'] }
  ];

  let html = `
    <div class="p-5 border-b border-gray-100 flex items-center justify-between">
      <a href="dashboard.html" class="flex items-center space-x-2.5">
        <div class="w-9 h-9 rounded-xl bg-[#124b4f] flex items-center justify-center text-white text-lg font-bold shadow-md">
          🧵
        </div>
        <div class="flex flex-col">
          <span class="text-base font-extrabold text-gray-950 tracking-tight leading-none">GarmentFlow</span>
          <span class="text-[9px] font-bold uppercase tracking-widest text-[#124b4f] mt-1">Manufacturing ERP</span>
        </div>
      </a>
      <button id="mobile-menu-close" class="lg:hidden p-1.5 text-gray-400 hover:text-gray-900 font-bold">✕</button>
    </div>

    <nav class="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-160px)] text-xs font-semibold custom-scroll">
  `;

  for (const item of links) {
    if (item.section) {
      html += `<div class="px-3 pt-3 pb-1 text-[10px] font-extrabold tracking-wider text-gray-400 uppercase">${item.section}</div>`;
      continue;
    }
    if (item.roles && user && !item.roles.includes(user.role)) {
      continue;
    }
    const isActive = activeKey === item.key;
    const activeClass = isActive 
      ? 'bg-[#124b4f] text-white font-bold shadow-sm' 
      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-950';
    html += `
      <a href="${item.href}" class="flex items-center space-x-2.5 px-3 py-2 rounded-xl transition-all ${activeClass}">
        <span class="text-sm">${item.icon}</span>
        <span>${item.label}</span>
      </a>
    `;
  }

  // Worker Switch Link
  if (user && user.role === 'WORKER') {
    html += `
      <div class="pt-3 border-t border-gray-100">
        <a href="worker-home.html" class="flex items-center space-x-2.5 px-3 py-2 rounded-xl bg-teal-50 text-[#124b4f] font-bold">
          <span>📱</span>
          <span>My Worker Portal</span>
        </a>
      </div>
    `;
  }

  html += `
    </nav>

    <!-- User Profile & Logout -->
    <div class="p-3 border-t border-gray-100 bg-gray-50/50 mt-auto">
      <div class="px-3 py-2 bg-white border border-gray-200/70 rounded-xl flex items-center justify-between shadow-2xs">
        <div class="flex items-center space-x-2 truncate">
          <div class="w-7 h-7 rounded-lg bg-teal-100 text-[#124b4f] flex items-center justify-center font-bold text-xs uppercase">
            ${(user?.name || 'U').charAt(0)}
          </div>
          <div class="truncate">
            <p class="text-xs font-bold text-gray-900 truncate leading-tight">${user?.name || 'User'}</p>
            <p class="text-[10px] text-gray-500 capitalize leading-tight">${user?.role?.toLowerCase() || 'guest'}</p>
          </div>
        </div>
        <button id="logout-btn" title="Logout" class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer">
          🚪
        </button>
      </div>
    </div>
  `;

  sidebar.innerHTML = html;

  // Bind logout
  const btn = document.getElementById('logout-btn');
  if (btn) btn.addEventListener('click', logout);

  // Bind mobile close
  const closeBtn = document.getElementById('mobile-menu-close');
  if (closeBtn) closeBtn.addEventListener('click', () => {
    sidebar.classList.add('-translate-x-full');
  });
}
