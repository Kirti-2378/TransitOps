import { stateStore } from './state.js';
import { router } from './router.js';

// View imports
import { renderLogin, renderSignup } from './views/login.js';
import { renderDashboard } from './views/dashboard.js';
import { renderVehicles } from './views/vehicles.js';
import { renderDrivers } from './views/drivers.js';
import { renderTrips } from './views/trips.js';
import { renderMaintenance } from './views/maintenance.js';
import { renderExpenses } from './views/expenses.js';
import { renderReports } from './views/reports.js';
import { renderLogs } from './views/logs.js';

// Add route definitions
router.addRoute('#/login', renderLogin);
router.addRoute('#/signup', renderSignup);
router.addRoute('#/dashboard', renderDashboard);
router.addRoute('#/vehicles', renderVehicles);
router.addRoute('#/drivers', renderDrivers);
router.addRoute('#/trips', renderTrips);
router.addRoute('#/maintenance', renderMaintenance);
router.addRoute('#/expenses', renderExpenses);
router.addRoute('#/reports', renderReports);
router.addRoute('#/logs', renderLogs);

// Global UI Synchronization
function syncUIState(state) {
  const user = state.currentUser;
  const hash = window.location.hash || '#/dashboard';
  const isAuthPage = hash === '#/login' || hash === '#/signup';

  const layout = document.getElementById('app-layout');
  if (layout) {
    if (isAuthPage) {
      layout.classList.add('auth-layout');
    } else {
      layout.classList.remove('auth-layout');
    }
  }

  // Handle Header & Sidebar UI updates if logged in
  if (user && !isAuthPage) {
    // 1. Sidebar Nav RBAC displays for TransitOps
    const dispatchNav = document.querySelector('.trip-dispatch-nav');
    const maintNav = document.querySelector('.maint-nav');
    const expNav = document.querySelector('.expenses-nav');
    const reportsNav = document.querySelector('.reports-nav');

    if (dispatchNav) dispatchNav.style.display = (user.role === 'Fleet Manager' || user.role === 'Driver') ? 'block' : 'none';
    if (maintNav) maintNav.style.display = (user.role === 'Fleet Manager') ? 'block' : 'none';
    if (expNav) expNav.style.display = (user.role === 'Fleet Manager' || user.role === 'Financial Analyst' || user.role === 'Driver') ? 'block' : 'none';
    if (reportsNav) reportsNav.style.display = (user.role === 'Fleet Manager' || user.role === 'Financial Analyst') ? 'block' : 'none';

    // 2. Profile Box details
    const profileBox = document.getElementById('sidebar-profile');
    if (profileBox) {
      profileBox.style.display = 'flex';
      document.getElementById('user-profile-name').textContent = user.name;
      document.getElementById('user-profile-role').textContent = user.role;
      document.getElementById('user-avatar-letter').textContent = user.name.charAt(0).toUpperCase();
    }

    // 3. Mobile Header Logout
    const mobLogout = document.getElementById('btn-logout-header');
    if (mobLogout) mobLogout.style.display = 'inline-flex';

    // 4. Page Title Map
    const activeRoute = router.currentHash || '#/dashboard';
    const pageTitle = document.getElementById('page-title');
    if (pageTitle) {
      if (activeRoute === '#/dashboard') pageTitle.textContent = `Fleet Status Overview`;
      else if (activeRoute === '#/vehicles') pageTitle.textContent = 'Vehicle Registry Management';
      else if (activeRoute === '#/drivers') pageTitle.textContent = 'Active Operator Directory';
      else if (activeRoute === '#/trips') pageTitle.textContent = 'Trip Schedule & Dispatch';
      else if (activeRoute === '#/maintenance') pageTitle.textContent = 'Servicing & Fleet Maintenance';
      else if (activeRoute === '#/expenses') pageTitle.textContent = 'Fuel Logging & Trip Expenses';
      else if (activeRoute === '#/reports') pageTitle.textContent = 'Analytics & Fleet ROI';
      else if (activeRoute === '#/logs') pageTitle.textContent = 'System Activity Ledger';
    }

    // 5. Notifications Bell & Drawer
    const notifications = stateStore.getNotifications(user.id);
    const unreadCount = notifications.filter(n => !n.read).length;
    const badge = document.getElementById('notification-badge');
    
    if (badge) {
      if (unreadCount > 0) {
        badge.textContent = unreadCount;
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    }

    const notifList = document.getElementById('notification-list');
    if (notifList) {
      if (notifications.length === 0) {
        notifList.innerHTML = '<div class="empty-state">No notifications.</div>';
      } else {
        notifList.innerHTML = notifications.map(n => `
          <div class="notification-item ${!n.read ? 'unread' : ''} ${n.type.replace(' ', '-')}">
            <span class="notification-text">${n.message}</span>
            <span class="notification-date">${n.date}</span>
          </div>
        `).join('');
      }
    }
  } else {
    const profileBox = document.getElementById('sidebar-profile');
    if (profileBox) profileBox.style.display = 'none';
    const mobLogout = document.getElementById('btn-logout-header');
    if (mobLogout) mobLogout.style.display = 'none';
  }

  // Refresh Lucide Icons on layout
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// Subscribe to state updates
stateStore.subscribe(syncUIState);

// Bind global controls
document.addEventListener('DOMContentLoaded', () => {
  syncUIState(stateStore.state);

  // Theme Toggler
  const themeToggle = document.getElementById('theme-toggle');
  const savedTheme = localStorage.getItem('theme') || 'dark';
  if (savedTheme === 'light') {
    document.body.classList.remove('dark-mode');
    document.body.classList.add('light-mode');
  } else {
    document.body.classList.remove('light-mode');
    document.body.classList.add('dark-mode');
  }

  themeToggle.addEventListener('click', () => {
    const isDark = document.body.classList.contains('dark-mode');
    if (isDark) {
      document.body.classList.remove('dark-mode');
      document.body.classList.add('light-mode');
      localStorage.setItem('theme', 'light');
    } else {
      document.body.classList.remove('light-mode');
      document.body.classList.add('dark-mode');
      localStorage.setItem('theme', 'dark');
    }
  });

  // Hamburger Sidebar toggle (Mobile viewport)
  const sidebar = document.getElementById('app-sidebar');
  const toggleSidebarBtn = document.getElementById('sidebar-toggle');
  
  toggleSidebarBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    sidebar.classList.toggle('active');
  });

  document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768) {
      if (sidebar.classList.contains('active') && !sidebar.contains(e.target)) {
        sidebar.classList.remove('active');
      }
    }
  });

  // Notifications bell & drawer
  const bell = document.getElementById('notification-bell');
  const drawer = document.getElementById('notification-drawer');
  const overlay = document.getElementById('notification-overlay');
  const closeDrawerBtn = document.getElementById('btn-close-drawer');
  const markReadBtn = document.getElementById('btn-mark-all-read');

  const toggleDrawer = () => {
    const isActive = drawer.classList.contains('active');
    if (isActive) {
      drawer.classList.remove('active');
      overlay.classList.remove('active');
    } else {
      drawer.classList.add('active');
      overlay.classList.add('active');
      const user = stateStore.getCurrentUser();
      if (user) {
        stateStore.markNotificationsRead(user.id);
      }
    }
  };

  bell.addEventListener('click', toggleDrawer);
  closeDrawerBtn.addEventListener('click', toggleDrawer);
  overlay.addEventListener('click', toggleDrawer);
  
  markReadBtn.addEventListener('click', () => {
    const user = stateStore.getCurrentUser();
    if (user) {
      stateStore.markNotificationsRead(user.id);
    }
  });

  // Logout triggers
  const processLogout = () => {
    if (confirm('Are you sure you want to sign out?')) {
      stateStore.logout();
      router.navigate('#/login');
    }
  };

  document.getElementById('btn-logout-sidebar').addEventListener('click', processLogout);
  document.getElementById('btn-logout-header').addEventListener('click', processLogout);

  // Reusable modal dismissal
  const modalOverlay = document.getElementById('modal-overlay');
  document.getElementById('modal-btn-close').addEventListener('click', () => {
    modalOverlay.classList.remove('active');
  });
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      modalOverlay.classList.remove('active');
    }
  });

  // Start route matching
  router.handleRoute();
});
