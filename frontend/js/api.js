const BASE_URL = 'https://garmentflow.onrender.com';

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

export async function apiFetch(path, options = {}) {
  const token = getToken();
  
  // Note: For FormData, browser automatically sets multipart boundary headers. Do NOT set Content-Type.
  const headers = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const config = {
    ...options,
    headers,
  };

  if (options.body && !(options.body instanceof FormData)) {
    config.body = JSON.stringify(options.body);
  }

  const res = await fetch(`${BASE_URL}${path}`, config);
  
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
    throw new Error(data.detail || 'Something went wrong');
  }
  
  return data;
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
  toast.className = `p-4 rounded shadow-lg text-white pointer-events-auto transition-opacity duration-300 flex items-center justify-between text-sm ${
    type === 'success' ? 'bg-green-600' : type === 'error' ? 'bg-red-600' : 'bg-blue-600'
  }`;
  
  toast.innerHTML = `
    <span>${message}</span>
    <button class="ml-4 font-bold focus:outline-none" onclick="this.parentElement.remove()">×</button>
  `;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}
