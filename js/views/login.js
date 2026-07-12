import { stateStore } from '../state.js';
import { router } from '../router.js';

export function renderLogin(container) {
  container.innerHTML = `
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-header">
          <div class="logo-icon auth-logo">
            <i data-lucide="truck"></i>
          </div>
          <h2>Welcome to TransitOps</h2>
          <p>Sign in to manage fleet assets, dispatches, and diagnostics</p>
        </div>

        <form id="login-form">
          <div class="form-group">
            <label for="email">Email Address</label>
            <div class="input-wrapper">
              <i data-lucide="mail"></i>
              <input type="email" id="email" class="form-control" placeholder="manager@transitops.com" required value="manager@transitops.com">
            </div>
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <div class="input-wrapper">
              <i data-lucide="lock"></i>
              <input type="password" id="password" class="form-control" placeholder="••••••••" required value="manager123">
            </div>
          </div>

          <div class="form-actions">
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: var(--text-secondary);">
              <input type="checkbox" id="remember-me" style="accent-color: var(--accent-primary)"> Remember me
            </label>
            <button type="button" class="btn-link" id="btn-forgot-password">Forgot Password?</button>
          </div>

          <div class="error-msg" id="login-error" style="color: #ef4444; font-size: 0.9rem; margin-bottom: 16px; display: none;"></div>

          <button type="submit" class="btn btn-primary">
            Authenticate <i data-lucide="arrow-right"></i>
          </button>
        </form>

        <div class="auth-footer">
          New operator? <a href="#/signup" class="btn-link">Register Profile</a>
        </div>
      </div>
    </div>
  `;

  if (window.lucide) {
    window.lucide.createIcons();
  }

  const form = document.getElementById('login-form');
  const errorDiv = document.getElementById('login-error');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    errorDiv.style.display = 'none';

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
      stateStore.login(email, password);
      router.navigate('#/dashboard');
      showToast('Welcome, ' + stateStore.getCurrentUser().name + '!', 'success');
    } catch (err) {
      errorDiv.textContent = err.message;
      errorDiv.style.display = 'block';
      showToast(err.message, 'error');
    }
  });

  document.getElementById('btn-forgot-password').addEventListener('click', () => {
    showForgotPasswordModal();
  });
}

export function renderSignup(container) {
  container.innerHTML = `
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-header">
          <div class="logo-icon auth-logo">
            <i data-lucide="truck"></i>
          </div>
          <h2>Join TransitOps</h2>
          <p>Register as a new driver/dispatcher profile</p>
        </div>

        <form id="signup-form">
          <div class="form-group">
            <label for="fullname">Full Name</label>
            <div class="input-wrapper">
              <i data-lucide="user"></i>
              <input type="text" id="fullname" class="form-control" placeholder="Alex Cargo" required>
            </div>
          </div>

          <div class="form-group">
            <label for="signup-email">Email Address</label>
            <div class="input-wrapper">
              <i data-lucide="mail"></i>
              <input type="email" id="signup-email" class="form-control" placeholder="alex@transitops.com" required>
            </div>
          </div>

          <div class="form-group">
            <label for="signup-password">Password</label>
            <div class="input-wrapper">
              <i data-lucide="lock"></i>
              <input type="password" id="signup-password" class="form-control" placeholder="••••••••" required minlength="6">
            </div>
          </div>

          <div class="form-group">
            <label style="display: flex; align-items: flex-start; gap: 8px; cursor: pointer; color: var(--text-secondary); font-size: 0.85rem;">
              <input type="checkbox" required style="accent-color: var(--accent-primary); margin-top: 3px;">
              <span>I confirm that registering a profile defaults to Driver status. Administrators can promote roles from the directory.</span>
            </label>
          </div>

          <div class="error-msg" id="signup-error" style="color: #ef4444; font-size: 0.9rem; margin-bottom: 16px; display: none;"></div>

          <button type="submit" class="btn btn-primary">
            Register Driver Profile <i data-lucide="user-plus"></i>
          </button>
        </form>

        <div class="auth-footer">
          Already registered? <a href="#/login" class="btn-link">Sign In</a>
        </div>
      </div>
    </div>
  `;

  if (window.lucide) {
    window.lucide.createIcons();
  }

  const form = document.getElementById('signup-form');
  const errorDiv = document.getElementById('signup-error');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    errorDiv.style.display = 'none';

    const name = document.getElementById('fullname').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;

    try {
      stateStore.signup(name, email, password);
      stateStore.login(email, password);
      router.navigate('#/dashboard');
      showToast('Registration successful! Welcome to TransitOps.', 'success');
    } catch (err) {
      errorDiv.textContent = err.message;
      errorDiv.style.display = 'block';
      showToast(err.message, 'error');
    }
  });
}

function showForgotPasswordModal() {
  const overlay = document.getElementById('modal-overlay');
  const body = document.getElementById('modal-body');
  const title = document.getElementById('modal-title');

  title.textContent = 'TransitOps Testing Accounts';
  body.innerHTML = `
    <p style="margin-bottom: 20px; font-size: 0.95rem; color: var(--text-secondary);">
      For testing roles and RBAC validations, pre-seeded accounts are:
      <code style="display:block; margin: 12px 0; background: var(--bg-input); padding: 12px; border-radius: 6px; line-height: 1.6;">
        <strong>Fleet Manager</strong>: manager@transitops.com (pass: manager123)<br>
        <strong>Safety Officer</strong>: safety@transitops.com (pass: safety123)<br>
        <strong>Financial Analyst</strong>: finance@transitops.com (pass: finance123)<br>
        <strong>Driver</strong>: driver@transitops.com (pass: driver123)
      </code>
    </p>
    <div style="display:flex; justify-content: flex-end;">
      <button class="btn btn-secondary" onclick="document.getElementById('modal-overlay').classList.remove('active')" style="width: auto;">Close</button>
    </div>
  `;

  overlay.classList.add('active');
}

export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let icon = 'info';
  if (type === 'success') icon = 'check-circle';
  if (type === 'error') icon = 'alert-triangle';

  toast.innerHTML = `
    <i data-lucide="${icon}"></i>
    <div class="toast-msg">${message}</div>
  `;

  container.appendChild(toast);
  if (window.lucide) {
    window.lucide.createIcons();
  }

  setTimeout(() => {
    toast.style.transition = 'all 0.5s ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-20px)';
    setTimeout(() => {
      toast.remove();
    }, 500);
  }, 4000);
}

window.showToast = showToast;
