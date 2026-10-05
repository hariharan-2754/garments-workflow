import { apiFetch, getUser, logout, showToast, BASE_URL } from './api.js';

// Redirect if not admin
const user = getUser();
if (!user || user.role !== 'ADMIN') {
  window.location.href = '/login.html';
}

// Initial Mock Garments matching the reference UI mockup
const INITIAL_PRODUCTS = [
  {
    id: 'prod-1',
    name: 'Tokyo Mist Jacket',
    description: 'Two-tone nylon outerwear bag built for city adventures.',
    price: 320.00,
    category: 'Jacket',
    department: 'Cutting',
    image: 'https://images.unsplash.com/photo-1548883354-7622d03aca27?auto=format&fit=crop&w=600&q=80',
    liked: false
  },
  {
    id: 'prod-2',
    name: 'Urban Trek Sling',
    description: 'Two-tone nylon shoulder bag built for city adventures.',
    price: 320.00,
    category: 'Outerwear',
    department: 'Stitching',
    image: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=600&q=80',
    liked: false
  },
  {
    id: 'prod-3',
    name: 'Kyoto Lavender Shirt',
    description: 'Subtle gloss finish with an elegant cut stand out, softly.',
    price: 360.00,
    category: 'Shirt',
    department: 'Printing',
    image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=600&q=80',
    liked: false
  },
  {
    id: 'prod-4',
    name: 'Black Sea Polo',
    description: 'Minimal matte polo tee designed for understated confidence.',
    price: 390.00,
    category: 'Polo',
    department: 'Stitching',
    image: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=600&q=80',
    liked: false
  },
  {
    id: 'prod-5',
    name: 'Osaka Grid Layer',
    description: 'Textured navy jacket with a geometric stitch detail smart & sleek.',
    price: 280.00,
    category: 'Layer',
    department: 'Embroidery',
    image: 'https://images.unsplash.com/photo-1516257984-b1b4d707412e?auto=format&fit=crop&w=600&q=80',
    liked: false
  },
  {
    id: 'prod-6',
    name: 'Street Camo Tee',
    description: 'Bold street camo made for modern urban rhythm.',
    price: 300.00,
    category: 'T-Shirt',
    department: 'Printing',
    image: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=600&q=80',
    liked: false
  },
  {
    id: 'prod-7',
    name: 'Snow Drift Hoodie',
    description: 'Cloud-soft fabric with clean lines and cozy warmth.',
    price: 320.00,
    category: 'Hoodie',
    department: 'Quality Check',
    image: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=600&q=80',
    liked: false
  },
  {
    id: 'prod-8',
    name: 'Charcoal Flex Sweatshirt',
    description: 'Effortless fit meets stretch comfort in this cool-season staple.',
    price: 300.00,
    category: 'Sweatshirt',
    department: 'Cutting',
    image: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?auto=format&fit=crop&w=600&q=80',
    liked: false
  },
  {
    id: 'prod-9',
    name: 'Desert Tone Chinos',
    description: 'Soft silk-linen blend with tailored stripes made for daily confidence.',
    price: 240.00,
    category: 'Pants',
    department: 'Stitching',
    image: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=600&q=80',
    liked: false
  },
  {
    id: 'prod-10',
    name: 'Ivory Bloom Shirt',
    description: 'Soft silk-linen blend polo with tailored stripes made for daily confidence.',
    price: 310.00,
    category: 'Shirt',
    department: 'Cutting',
    image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=600&q=80',
    liked: false
  },
  {
    id: 'prod-11',
    name: 'Zen Cream Tee',
    description: 'Soft silk-linen blend polo with tailored stripes made for daily confidence.',
    price: 180.00,
    category: 'T-Shirt',
    department: 'Packing',
    image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=600&q=80',
    liked: false
  },
  {
    id: 'prod-12',
    name: 'Sketch City Tee',
    description: 'Soft silk-linen blend polo with tailored stripes made for daily confidence.',
    price: 220.00,
    category: 'T-Shirt',
    department: 'Quality Check',
    image: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=600&q=80',
    liked: false
  }
];

let allProducts = [...INITIAL_PRODUCTS];
let liveTasks = [];
let currentSearch = '';
let maxPrice = 1100;
let selectedPriceRanges = [];

document.addEventListener('DOMContentLoaded', () => {
  // Populate user details
  if (user) {
    const nameEl = document.getElementById('user-name');
    const initialsEl = document.getElementById('user-avatar-initials');
    if (nameEl) nameEl.innerText = user.name || 'Admin User';
    if (initialsEl) {
      const initials = (user.name || 'Admin').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
      initialsEl.innerText = initials || 'AD';
    }
  }

  // Logout handler
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) logoutBtn.addEventListener('click', logout);

  // Mobile sidebar controls
  const sidebar = document.getElementById('sidebar');
  const openSidebarBtn = document.getElementById('open-mobile-sidebar');
  const closeSidebarBtn = document.getElementById('close-mobile-sidebar');

  if (openSidebarBtn) {
    openSidebarBtn.addEventListener('click', () => sidebar.classList.remove('-translate-x-full'));
  }
  if (closeSidebarBtn) {
    closeSidebarBtn.addEventListener('click', () => sidebar.classList.add('-translate-x-full'));
  }

  // View Switchers (Grid vs List)
  const navGridBtn = document.getElementById('nav-grid-btn');
  const navListBtn = document.getElementById('nav-list-btn');
  const gridView = document.getElementById('grid-view-container');
  const listView = document.getElementById('list-view-container');
  const viewTitle = document.getElementById('main-view-title');

  if (navGridBtn && navListBtn) {
    navGridBtn.addEventListener('click', () => {
      navGridBtn.className = 'w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-50 text-brand-500 transition-colors flex items-center justify-between';
      navListBtn.className = 'w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors';
      gridView.classList.remove('hidden');
      listView.classList.add('hidden');
      if (viewTitle) viewTitle.innerText = 'Product Grid';
    });

    navListBtn.addEventListener('click', () => {
      navListBtn.className = 'w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-50 text-brand-500 transition-colors flex items-center justify-between';
      navGridBtn.className = 'w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors';
      listView.classList.remove('hidden');
      gridView.classList.add('hidden');
      if (viewTitle) viewTitle.innerText = 'Task Monitoring (List View)';
    });
  }

  // Search input handlers
  const globalSearch = document.getElementById('global-search-input');
  const innerSearch = document.getElementById('inner-search-input');

  function handleSearch(val) {
    currentSearch = val.toLowerCase().trim();
    renderProducts();
  }

  if (globalSearch) {
    globalSearch.addEventListener('input', (e) => {
      if (innerSearch) innerSearch.value = e.target.value;
      handleSearch(e.target.value);
    });
  }

  if (innerSearch) {
    innerSearch.addEventListener('input', (e) => {
      if (globalSearch) globalSearch.value = e.target.value;
      handleSearch(e.target.value);
    });
  }

  // Range Slider handlers
  const priceSlider = document.getElementById('price-range-slider');
  const sliderBadge = document.getElementById('slider-badge');
  const sliderBoxMax = document.getElementById('slider-box-max');

  if (priceSlider) {
    priceSlider.addEventListener('input', (e) => {
      const val = e.target.value;
      if (sliderBadge) sliderBadge.innerText = `$${val}`;
      if (sliderBoxMax) sliderBoxMax.innerText = `$${val}`;
      maxPrice = parseFloat(val);
      renderProducts();
    });
  }

  // Price Filter Checkboxes
  const allPriceCb = document.getElementById('filter-all-price');
  const priceCbs = document.querySelectorAll('.filter-price-cb');

  if (allPriceCb) {
    allPriceCb.addEventListener('change', () => {
      if (allPriceCb.checked) {
        priceCbs.forEach(cb => cb.checked = false);
        maxPrice = 1100;
        if (priceSlider) priceSlider.value = 1000;
        if (sliderBadge) sliderBadge.innerText = '$1000';
        if (sliderBoxMax) sliderBoxMax.innerText = '$1000';
      }
      renderProducts();
    });
  }

  priceCbs.forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.checked && allPriceCb) {
        allPriceCb.checked = false;
      }
      renderProducts();
    });
  });

  const applyBtn = document.getElementById('apply-filter-btn');
  if (applyBtn) {
    applyBtn.addEventListener('click', () => {
      renderProducts();
      showToast('Filters applied successfully', 'success');
    });
  }

  // Create Order Modal Setup
  const createModal = document.getElementById('create-order-modal');
  const createBtn = document.getElementById('create-order-btn');
  const navCreateBtn = document.getElementById('nav-create-btn');
  const closeModalBtn = document.getElementById('close-modal-btn');
  const cancelModalBtn = document.getElementById('cancel-modal-btn');
  const createForm = document.getElementById('create-order-form');

  function openCreateModal() {
    if (createModal) createModal.classList.remove('hidden');
  }
  function closeCreateModal() {
    if (createModal) createModal.classList.add('hidden');
    if (createForm) createForm.reset();
  }

  if (createBtn) createBtn.addEventListener('click', openCreateModal);
  if (navCreateBtn) navCreateBtn.addEventListener('click', openCreateModal);
  if (closeModalBtn) closeModalBtn.addEventListener('click', closeCreateModal);
  if (cancelModalBtn) cancelModalBtn.addEventListener('click', closeCreateModal);

  if (createForm) {
    createForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = document.getElementById('order-title').value.trim();
      const desc = document.getElementById('order-desc').value.trim();
      const price = parseFloat(document.getElementById('order-price').value) || 299;
      const dept = document.getElementById('order-department').value;
      const dueDate = document.getElementById('order-due-date').value || new Date().toISOString().split('T')[0];
      const priority = document.getElementById('order-priority').value;

      // Add to local product list
      const newProduct = {
        id: `prod-${Date.now()}`,
        name: title,
        description: desc,
        price: price,
        category: dept,
        department: dept,
        image: 'https://images.unsplash.com/photo-1548883354-7622d03aca27?auto=format&fit=crop&w=600&q=80',
        liked: false
      };

      allProducts.unshift(newProduct);
      closeCreateModal();
      renderProducts();
      showToast(`Garment order "${title}" created!`, 'success');

      // Optionally sync to backend if available
      try {
        await apiFetch('/tasks', {
          method: 'POST',
          body: {
            title,
            description: desc,
            department: dept,
            dueDate,
            priority
          }
        });
        loadTasks();
      } catch (err) {
        // Soft fallback for offline/local JSON demo
        console.warn('Backend sync note:', err.message);
      }
    });
  }

  // Initial load
  renderProducts();
  loadTasks();
  setInterval(loadTasks, 6000);
});

// Render the 4-Column Product Grid
function renderProducts() {
  const container = document.getElementById('grid-view-container');
  const countEl = document.getElementById('results-count');
  if (!container) return;

  const allPriceCb = document.getElementById('filter-all-price');
  const isAllPrice = allPriceCb ? allPriceCb.checked : true;

  const checkedRanges = Array.from(document.querySelectorAll('.filter-price-cb:checked')).map(cb => ({
    min: cb.dataset.min ? parseFloat(cb.dataset.min) : 0,
    max: cb.dataset.max ? parseFloat(cb.dataset.max) : Infinity
  }));

  const filtered = allProducts.filter(p => {
    // Search keyword filter
    if (currentSearch) {
      const matchName = p.name.toLowerCase().includes(currentSearch);
      const matchDesc = p.description.toLowerCase().includes(currentSearch);
      const matchDept = p.department.toLowerCase().includes(currentSearch);
      if (!matchName && !matchDesc && !matchDept) return false;
    }

    // Price filtering
    if (!isAllPrice && checkedRanges.length > 0) {
      const inAnyRange = checkedRanges.some(r => p.price >= r.min && p.price <= r.max);
      if (!inAnyRange) return false;
    } else if (p.price > maxPrice) {
      return false;
    }

    return true;
  });

  if (countEl) countEl.innerText = filtered.length;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-16 text-center bg-white rounded-2xl border border-gray-100 p-8">
        <div class="text-4xl mb-2">🛍️</div>
        <h3 class="text-sm font-bold text-gray-800">No matching garments found</h3>
        <p class="text-xs text-gray-500 mt-1">Try adjusting your search keywords or price filters.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(p => {
    const isLiked = p.liked;
    return `
      <div class="bg-white rounded-2xl border border-gray-200/70 p-3 flex flex-col justify-between hover:shadow-md transition-all group">
        
        <!-- Product Image Container with stage badge & image -->
        <div class="relative w-full aspect-4/5 rounded-xl overflow-hidden bg-gray-100 mb-3">
          <img 
            src="${p.image}" 
            alt="${escapeHtml(p.name)}" 
            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
          <div class="absolute top-2 left-2 bg-white/90 backdrop-blur-xs text-[10px] font-bold text-gray-700 px-2 py-0.5 rounded-md shadow-2xs">
            ${escapeHtml(p.department || 'Production')}
          </div>
        </div>

        <!-- Details -->
        <div class="flex-1 flex flex-col justify-between">
          <div>
            <h3 class="text-xs font-bold text-gray-900 tracking-tight leading-snug group-hover:text-orange-600 transition-colors truncate">
              ${escapeHtml(p.name)}
            </h3>
            <p class="text-[10px] text-gray-500 line-clamp-2 mt-0.5 leading-tight font-normal">
              ${escapeHtml(p.description)}
            </p>
          </div>

          <!-- Bottom Row: Price & Action Icons -->
          <div class="flex items-center justify-between pt-3 mt-1 border-t border-gray-50">
            <div class="text-xs font-extrabold text-gray-900 font-mono">
              $${p.price.toFixed(2)}
            </div>

            <div class="flex items-center gap-1.5 text-gray-400">
              <!-- Like Button -->
              <button 
                onclick="window.toggleLike('${p.id}')" 
                class="p-1 rounded hover:bg-gray-100 hover:text-red-500 transition-colors ${isLiked ? 'text-red-500' : ''}" 
                title="Save Garment"
              >
                <svg class="w-3.5 h-3.5" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                </svg>
              </button>

              <!-- Assign / Cart Button -->
              <button 
                onclick="window.quickAssign('${p.id}')" 
                class="p-1 rounded hover:bg-gray-100 hover:text-orange-500 transition-colors" 
                title="Assign / Order"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
                </svg>
              </button>
            </div>
          </div>

        </div>

      </div>
    `;
  }).join('');
}

// Global actions
window.toggleLike = (id) => {
  const p = allProducts.find(item => item.id === id);
  if (p) {
    p.liked = !p.liked;
    renderProducts();
    showToast(p.liked ? 'Saved to collection' : 'Removed from collection', 'info');
  }
};

window.quickAssign = (id) => {
  const p = allProducts.find(item => item.id === id);
  if (p) {
    window.location.href = `assign-task.html?title=${encodeURIComponent(p.name)}&dept=${encodeURIComponent(p.department)}`;
  }
};

// Fetch and load live tasks into the table
async function loadTasks() {
  try {
    const tasks = await apiFetch('/tasks');
    liveTasks = tasks || [];
    renderTasksTable();
  } catch (_) {
    // In local JSON or offline, render available tasks
    renderTasksTable();
  }
}

function renderTasksTable() {
  const tbody = document.getElementById('tasks-table-body');
  if (!tbody) return;

  if (liveTasks.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="px-4 py-6 text-center text-gray-400">
          No active backend tasks recorded. Use <strong>+ Create Order</strong> to assign one.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = liveTasks.map(t => {
    return `
      <tr class="hover:bg-gray-50/70 transition-colors">
        <td class="px-4 py-3">
          <div class="font-bold text-gray-900">${escapeHtml(t.title)}</div>
          <div class="text-[11px] text-gray-400 truncate max-w-xs">${escapeHtml(t.description || '')}</div>
        </td>
        <td class="px-4 py-3 text-gray-700 font-medium">${escapeHtml(t.workerName || 'Unassigned')}</td>
        <td class="px-4 py-3 text-gray-600">${escapeHtml(t.department || 'General')}</td>
        <td class="px-4 py-3">
          <span class="px-2 py-0.5 rounded text-[10px] font-bold ${
            t.status === 'Completed' ? 'bg-green-100 text-green-700' :
            t.status === 'In Progress' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
          }">
            ${t.status || 'Pending'}
          </span>
        </td>
        <td class="px-4 py-3 text-gray-500 font-mono text-[11px]">${t.dueDate || '—'}</td>
        <td class="px-4 py-3 text-right">
          <button onclick="window.deleteTask('${t.id}')" class="text-red-500 hover:text-red-700 font-bold text-xs p-1">
            🗑
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

window.deleteTask = async (taskId) => {
  if (!confirm('Are you sure you want to delete this task?')) return;
  try {
    await apiFetch(`/tasks/${taskId}`, { method: 'DELETE' });
    showToast('Task removed', 'success');
    loadTasks();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
