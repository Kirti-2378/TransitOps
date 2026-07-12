import { stateStore } from './state.js';

// TransitOps Route Definitions
export const ROUTES = [
  { hash: '#/login', title: 'Login', roles: [] },
  { hash: '#/signup', title: 'Sign Up', roles: [] },
  { hash: '#/dashboard', title: 'Dashboard', roles: null },
  { hash: '#/vehicles', title: 'Fleet Vehicles', roles: null }, // Anyone can view, buttons restricted in view
  { hash: '#/drivers', title: 'Driver Registry', roles: null },   // Anyone can view
  { hash: '#/trips', title: 'Trip Dispatch Workbench', roles: ['Fleet Manager', 'Driver'] },
  { hash: '#/maintenance', title: 'Maintenance Logs', roles: ['Fleet Manager'] },
  { hash: '#/expenses', title: 'Fuel & Expenses', roles: ['Fleet Manager', 'Financial Analyst', 'Driver'] },
  { hash: '#/reports', title: 'Analytics & ROI', roles: ['Fleet Manager', 'Financial Analyst'] },
  { hash: '#/logs', title: 'Audit Ledger', roles: null }
];

class Router {
  constructor() {
    this.routes = {};
    this.currentHash = '';
    window.addEventListener('hashchange', () => this.handleRoute());
  }

  addRoute(hash, renderFn) {
    this.routes[hash] = renderFn;
  }

  navigate(hash) {
    window.location.hash = hash;
  }

  async handleRoute() {
    let hash = window.location.hash || '#/dashboard';
    
    if (hash === '#/') hash = '#/dashboard';
    this.currentHash = hash;

    const user = stateStore.getCurrentUser();
    const routeConfig = ROUTES.find(r => r.hash === hash) || ROUTES.find(r => r.hash === '#/dashboard');
    
    // 1. Authentication Check
    if (!user && (routeConfig.roles === null || routeConfig.roles.length > 0)) {
      this.navigate('#/login');
      return;
    }

    // 2. Already logged in check
    if (user && routeConfig.roles !== null && routeConfig.roles.length === 0) {
      this.navigate('#/dashboard');
      return;
    }

    // 3. Authorization (RBAC) Check
    if (user && routeConfig.roles !== null && routeConfig.roles.length > 0) {
      if (!routeConfig.roles.includes(user.role)) {
        stateStore.addNotification(user.id, `Access Denied to ${routeConfig.title}. Required role: ${routeConfig.roles.join(' or ')}.`, 'Access Denied');
        this.navigate('#/dashboard');
        return;
      }
    }

    document.title = `TransitOps | ${routeConfig ? routeConfig.title : 'Operations'}`;

    this.updateNavigationUI(hash);

    const renderFn = this.routes[hash] || this.routes['#/dashboard'];
    if (renderFn) {
      try {
        const container = document.getElementById('main-content');
        if (container) {
          container.innerHTML = `<div class="loading-spinner">Loading ${routeConfig.title}...</div>`;
          await renderFn(container, user);
        }
      } catch (err) {
        console.error('Error rendering view:', err);
        const container = document.getElementById('main-content');
        if (container) {
          container.innerHTML = `
            <div class="error-container">
              <h3>Error loading view</h3>
              <p>${err.message}</p>
              <button onclick="window.location.reload()" class="btn btn-primary">Retry</button>
            </div>
          `;
        }
      }
    }
  }

  updateNavigationUI(activeHash) {
    const navItems = document.querySelectorAll('.nav-link');
    navItems.forEach(item => {
      const href = item.getAttribute('href');
      if (href === activeHash) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    const layout = document.getElementById('app-layout');
    const isAuthPage = activeHash === '#/login' || activeHash === '#/signup';
    
    if (layout) {
      if (isAuthPage) {
        layout.classList.add('auth-layout');
      } else {
        layout.classList.remove('auth-layout');
      }
    }
  }
}

export const router = new Router();
