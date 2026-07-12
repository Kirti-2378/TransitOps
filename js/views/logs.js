import { stateStore } from '../state.js';

export function renderLogs(container, user) {
  const state = stateStore.state;
  const isManagerOrOfficer = user.role === 'Fleet Manager' || user.role === 'Safety Officer' || user.role === 'Admin';

  // Mark read
  stateStore.markNotificationsRead(user.id);

  // Filter logs by user role permissions
  const logs = isManagerOrOfficer
    ? stateStore.getActivityLogs()
    : stateStore.getActivityLogs().filter(log => log.userId === user.id);

  const notifications = stateStore.getNotifications(user.id);

  let html = `
    <div class="logs-view">
      
      <div class="tabs-container">
        <div class="tabs-list">
          <button class="tab-btn active" data-tab="tab-notif-alerts">System Alerts</button>
          <button class="tab-btn" data-tab="tab-system-trail">Action Logs Trail</button>
        </div>
      </div>

      <!-- Tab A: System Notifications Alerts -->
      <div class="tab-panel active" id="tab-notif-alerts">
        <div class="directory-actions-bar">
          <h3>Fleet Notifications</h3>
          <p style="font-size:0.8rem; color:var(--text-secondary);">
            Review safety notifications, trip updates, and deactivation details.
          </p>
        </div>

        <div style="display:flex; flex-direction:column; gap:12px; max-width:800px;">
          ${notifications.map(n => {
            let statClass = 'available'; // Green
            if (n.type.includes('Expired') || n.type.includes('Suspended') || n.type.includes('Alert') || n.type.includes('Denied')) {
              statClass = 'lost'; // Red
            } else if (n.type.includes('Scheduled') || n.type.includes('Dispatched')) {
              statClass = 'maint'; // Yellow/Orange
            }

            return `
              <div class="notification-item" style="border-left-width: 4px; display:flex; gap:16px; align-items:flex-start; background:var(--bg-card); border-color:var(--border-color); padding:16px; border-radius:var(--radius-md);">
                <div style="margin-top:2px;">
                  <span class="badge badge-status-${statClass}">${n.type}</span>
                </div>
                <div style="flex:1;">
                  <p class="notification-text" style="font-size:0.9rem; font-weight:500;">${n.message}</p>
                  <span class="notification-date" style="font-size:0.75rem; color:var(--text-muted); display:block; margin-top:6px;">${n.date}</span>
                </div>
              </div>
            `;
          }).join('')}
          ${notifications.length === 0 ? `
            <div class="chart-card" style="text-align:center; padding:48px; color:var(--text-secondary);">
              <i data-lucide="bell-off" style="width:36px; height:36px; margin-bottom:12px; color:var(--text-muted);"></i>
              <p>No operational alerts scheduled.</p>
            </div>
          ` : ''}
        </div>
      </div>

      <!-- Tab B: Action Logs Trail -->
      <div class="tab-panel" id="tab-system-trail">
        <div class="directory-actions-bar">
          <h3>Security & Operational Audit Trail</h3>
          <p style="font-size:0.8rem; color:var(--text-secondary);">
            ${isManagerOrOfficer ? 'Full organization-wide operation trail.' : 'Your personal operator activity ledger.'}
          </p>
        </div>

        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Action ID</th>
                <th>Timestamp</th>
                <th>Operator</th>
                <th>Trigger Event</th>
                <th>Details Description</th>
              </tr>
            </thead>
            <tbody>
              ${logs.map(log => {
                const dateStr = new Date(log.date).toLocaleString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                });
                return `
                  <tr>
                    <td><code>#OPR-${log.id.split('-')[1] || '00'}</code></td>
                    <td><span class="text-secondary">${dateStr}</span></td>
                    <td><strong>${log.userName}</strong><br><span style="font-size:0.75rem; color:var(--text-muted);">ID: ${log.userId}</span></td>
                    <td><span class="badge badge-status-reserved" style="background:transparent; border:1px solid var(--border-color); color:var(--text-primary); text-transform:none;">${log.action}</span></td>
                    <td><span class="text-secondary">${log.details}</span></td>
                  </tr>
                `;
              }).join('')}
              ${logs.length === 0 ? `
                <tr>
                  <td colspan="5" style="text-align:center; padding:32px; color:var(--text-secondary);">No action history.</td>
                </tr>
              ` : ''}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `;

  container.innerHTML = html;

  if (window.lucide) {
    window.lucide.createIcons();
  }

  // Bind Tabs
  const tabs = container.querySelectorAll('.tab-btn');
  const panels = container.querySelectorAll('.tab-panel');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      const panelId = tab.getAttribute('data-tab');
      document.getElementById(panelId).classList.add('active');
    });
  });
}
