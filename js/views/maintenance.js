import { stateStore } from '../state.js';
import { showToast } from './login.js';

export function renderMaintenance(container, user) {
  const state = stateStore.state;
  const isManager = user.role === 'Fleet Manager' || user.role === 'Admin';
  
  // Available vehicles to send in-shop
  const activeVehicles = state.vehicles.filter(v => v.status === 'Available');

  let html = `
    <div class="maintenance-view">
      
      <div class="grid-3" style="grid-template-columns: 320px 1fr; gap: 24px;">
        
        <!-- Log Maintenance Form (Only for Fleet Managers) -->
        <div>
          <div class="chart-card">
            <h3>Schedule Servicing</h3>
            <p style="font-size:0.8rem; color:var(--text-secondary); margin-bottom:16px;">
              Submit a vehicle to the maintenance workshop. Its dispatch status will set to In Shop immediately.
            </p>

            ${isManager ? `
              <form id="maint-log-form">
                <div class="form-group">
                  <label for="maint-vhc-id">Select Vehicle</label>
                  <select id="maint-vhc-id" class="select-control" style="width:100%; height:42px;" required>
                    <option value="">-- Choose Vehicle --</option>
                    ${activeVehicles.map(v => `<option value="${v.id}">${v.registrationNumber} - ${v.name}</option>`).join('')}
                  </select>
                </div>

                <div class="form-group">
                  <label for="maint-cost">Estimated Service Cost ($)</label>
                  <input type="number" id="maint-cost" class="form-control form-control-noicon" required placeholder="e.g. 500" min="0">
                </div>

                <div class="form-group">
                  <label for="maint-desc">Description of Work</label>
                  <textarea id="maint-desc" class="form-control form-control-noicon" rows="4" placeholder="Detail standard servicing (e.g. oil filter change, tire replacement)..." required></textarea>
                </div>

                <button type="submit" class="btn btn-primary" style="margin-top:12px;">Send to Workshop</button>
              </form>
            ` : `
              <p style="text-align:center; padding:24px 0; color:var(--text-muted); border:1px dashed var(--border-color); border-radius:6px;">
                Fleet Managers only.
              </p>
            `}
          </div>
        </div>

        <!-- Servicing Queue Tables -->
        <div>
          
          <!-- Open Workshop Tickets -->
          <div class="chart-card" style="margin-bottom:24px;">
            <h3>Active Servicing Queue</h3>
            <p style="font-size:0.8rem; color:var(--text-secondary); margin-bottom:12px;">
              Currently in-shop vehicles undergoing maintenance repairs.
            </p>

            <div class="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Log ID</th>
                    <th>Vehicle Reg</th>
                    <th>Model</th>
                    <th>Work Details</th>
                    <th>Cost Cost</th>
                    <th>Date Scheduled</th>
                    <th style="text-align: right;">Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${state.maintenanceLogs.filter(l => l.status === 'Open').map(l => {
                    const v = state.vehicles.find(vhc => vhc.id === l.vehicleId);
                    return `
                      <tr>
                        <td><code><strong>MNT-${l.id.split('-')[1] || '00'}</strong></code></td>
                        <td><code><strong>${v?.registrationNumber || 'N/A'}</strong></code></td>
                        <td>${v?.name || 'Deleted'}</td>
                        <td style="max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${l.description}">${l.description}</td>
                        <td><span style="font-weight:600;">$${l.cost.toLocaleString()}</span></td>
                        <td>${l.date}</td>
                        <td style="text-align: right;">
                          ${isManager ? `
                            <button class="btn btn-success btn-sm resolve-service-btn" data-id="${l.id}" style="padding:4px 8px; width:auto;">
                              Complete Service
                            </button>
                          ` : `
                            <span class="badge badge-status-in-shop">In Shop</span>
                          `}
                        </td>
                      </tr>
                    `;
                  }).join('')}
                  ${state.maintenanceLogs.filter(l => l.status === 'Open').length === 0 ? `
                    <tr>
                      <td colspan="7" style="text-align:center; padding:24px; color:var(--text-secondary);">No vehicles currently in workshop.</td>
                    </tr>
                  ` : ''}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Archived Servicing Records -->
          <div class="chart-card">
            <h3>Completed Diagnostics Archive</h3>
            <div class="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Log ID</th>
                    <th>Vehicle Reg</th>
                    <th>Model</th>
                    <th>Servicing Description</th>
                    <th>Total Cost</th>
                    <th>Resolution Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${state.maintenanceLogs.filter(l => l.status === 'Closed').map(l => {
                    const v = state.vehicles.find(vhc => vhc.id === l.vehicleId);
                    return `
                      <tr>
                        <td><code><strong>MNT-${l.id.split('-')[1] || '00'}</strong></code></td>
                        <td><code>${v?.registrationNumber || 'N/A'}</code></td>
                        <td>${v?.name || 'N/A'}</td>
                        <td style="max-width:220px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${l.description}">${l.description}</td>
                        <td><span style="color:#10b981; font-weight:600;">$${l.cost.toLocaleString()}</span></td>
                        <td>${l.date}</td>
                        <td><span class="badge badge-status-available">Resolved</span></td>
                      </tr>
                    `;
                  }).join('')}
                  ${state.maintenanceLogs.filter(l => l.status === 'Closed').length === 0 ? `
                    <tr>
                      <td colspan="7" style="text-align:center; padding:24px; color:var(--text-secondary);">No archived servicing records.</td>
                    </tr>
                  ` : ''}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>

    </div>
  `;

  container.innerHTML = html;

  if (window.lucide) {
    window.lucide.createIcons();
  }

  // --- Log Maintenance Submit ---
  if (isManager) {
    document.getElementById('maint-log-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const vehicleId = document.getElementById('maint-vhc-id').value;
      const cost = document.getElementById('maint-cost').value;
      const desc = document.getElementById('maint-desc').value;

      try {
        stateStore.createMaintenanceLog(vehicleId, desc, cost);
        showToast('Vehicle sent to workshop. Status updated to In Shop.', 'success');
        renderMaintenance(container, user); // re-render
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    // --- Complete Maintenance Resolve ---
    container.querySelectorAll('.resolve-service-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const logId = e.target.getAttribute('data-id');
        if (confirm('Resolve maintenance service and restore vehicle status to Available?')) {
          try {
            stateStore.closeMaintenanceLog(logId);
            showToast('Service completed. Vehicle returned to dispatch pool.', 'success');
            renderMaintenance(container, user);
          } catch (err) {
            showToast(err.message, 'error');
          }
        }
      });
    });
  }
}
