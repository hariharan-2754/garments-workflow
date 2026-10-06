import { BASE_URL, getToken, requireAuth, renderERPNavigation, showToast } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
  const user = requireAuth(['ADMIN', 'MANAGER', 'SUPERVISOR']);
  if (!user) return;

  renderERPNavigation('reports');

  // Mobile menu toggle
  const mobileToggle = document.getElementById('mobile-menu-toggle');
  const sidebar = document.getElementById('erp-sidebar');
  if (mobileToggle && sidebar) {
    mobileToggle.addEventListener('click', () => {
      sidebar.classList.toggle('-translate-x-full');
    });
  }

  // Bind Export Buttons
  document.querySelectorAll('.export-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const reportType = btn.dataset.type;
      const token = getToken();
      showToast(`Generating ${reportType} report download...`, 'info');
      
      const downloadUrl = `${BASE_URL}/analytics/export-csv?reportType=${reportType}`;
      
      // Fetch with auth and trigger download
      fetch(downloadUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => {
        if (!res.ok) throw new Error('Export failed');
        return res.blob();
      })
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `GarmentFlow_${reportType}_report.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        showToast(`${reportType.toUpperCase()} CSV downloaded successfully`, 'success');
      })
      .catch(err => {
        showToast(err.message, 'error');
      });
    });
  });
});
