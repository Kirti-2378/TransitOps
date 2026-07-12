import { stateStore } from '../state.js';
import { showToast } from './login.js';

export function renderTrips(container, user) {
  const state = stateStore.state;
  const activeTrips = state.trips.filter(t => t.status !== 'Completed' && t.status !== 'Cancelled');
  const pastTrips = state.trips.filter(t => t.status === 'Completed' || t.status === 'Cancelled');

  // Business pool exclusions: Available and non-retired/non-in-shop vehicles
  const availVehicles = state.vehicles.filter(v => v.status === 'Available');
  // Available, non-expired, non-suspended drivers
  const today = new Date().toISOString().split('T')[0];
  const availDrivers = state.drivers.filter(d => 
    d.status === 'Available' && 
    d.licenseExpiryDate >= today
  );

  let html = `
    <div class="trips-view">
      
      <div class="tabs-container">
        <div class="tabs-list">
          <button class="tab-btn active" data-tab="tab-dispatch-workbench">Dispatch Workbench</button>
          <button class="tab-btn" data-tab="tab-trip-history">Trip History Archive</button>
        </div>
      </div>

      <!-- Tab 1: Dispatch Workbench -->
      <div class="tab-panel active" id="tab-dispatch-workbench">
        <div class="grid-3" style="grid-template-columns: 360px 1fr; gap: 24px;">
          
          <!-- Plan Dispatch Trip Form -->
          <div>
            <div class="chart-card">
              <h3>Plan Dispatch Trip</h3>
              <p style="font-size:0.8rem; color:var(--text-secondary); margin-bottom:16px;">
                Draft a new trip. Validates cargo weight limits and operator license status.
              </p>

              <form id="trip-dispatch-form">
                <div class="grid-2">
                  <div class="form-group">
                    <label for="trp-src">Source Location</label>
                    <input type="text" id="trp-src" class="form-control form-control-noicon" required placeholder="Warehouse Dallas">
                  </div>
                  <div class="form-group">
                    <label for="trp-dest">Destination</label>
                    <input type="text" id="trp-dest" class="form-control form-control-noicon" required placeholder="Houston Terminal">
                  </div>
                </div>

                <div class="form-group">
                  <label for="trp-vhc">Select Available Vehicle</label>
                  <select id="trp-vhc" class="select-control" style="width: 100%; height:42px;" required>
                    <option value="">-- Choose Vehicle --</option>
                    ${availVehicles.map(v => `<option value="${v.id}">${v.registrationNumber} - ${v.name} (Cap: ${v.maxLoadCapacity} kg)</option>`).join('')}
                  </select>
                </div>

                <div class="form-group">
                  <label for="trp-drv">Assign Available Operator</label>
                  <select id="trp-drv" class="select-control" style="width: 100%; height:42px;" required>
                    <option value="">-- Choose Driver --</option>
                    ${availDrivers.map(d => `<option value="${d.id}">${d.name} (Safety Score: ${d.safetyScore}/100)</option>`).join('')}
                  </select>
                </div>

                <div class="grid-3">
                  <div class="form-group">
                    <label for="trp-weight">Cargo Load (kg)</label>
                    <input type="number" id="trp-weight" class="form-control form-control-noicon" required placeholder="800" min="1">
                  </div>
                  <div class="form-group">
                    <label for="trp-dist">Distance (km)</label>
                    <input type="number" id="trp-dist" class="form-control form-control-noicon" required placeholder="320" min="1">
                  </div>
                  <div class="form-group">
                    <label for="trp-rev">Revenue ($)</label>
                    <input type="number" id="trp-rev" class="form-control form-control-noicon" required placeholder="1400" min="0">
                  </div>
                </div>

                <button type="submit" class="btn btn-primary" style="margin-top: 12px;">Create Trip Draft</button>
              </form>
            </div>
          </div>

          <!-- Active Dispatch List Queue -->
          <div>
            <div class="chart-card" style="min-height: 100%;">
              <h3>Active Dispatch Board</h3>
              <p style="font-size:0.8rem; color:var(--text-secondary); margin-bottom:16px;">
                Manage currently scheduled or dispatched trips in transit.
              </p>

              <div style="display:flex; flex-direction:column; gap:12px; max-height:480px; overflow-y:auto; padding-right:4px;">
                ${activeTrips.map(t => {
                  const vhc = state.vehicles.find(v => v.id === t.vehicleId);
                  const drv = state.drivers.find(d => d.id === t.driverId);
                  
                  let statColor = '#f59e0b'; // Draft
                  if (t.status === 'Dispatched') statColor = '#8b5cf6'; // Dispatched (transit)

                  return `
                    <div style="border:1px solid var(--border-color); padding:16px; border-radius:var(--radius-md); background:var(--bg-secondary); position:relative;">
                      <span style="font-size:0.75rem; color:var(--text-muted);"><code>${t.id.toUpperCase()}</code></span>
                      <h4 style="font-size:1rem; margin:2px 0;">${t.source} → ${t.destination}</h4>
                      
                      <div style="margin:8px 0; font-size:0.85rem; color:var(--text-secondary);">
                        <p><strong>Vehicle:</strong> ${vhc?.registrationNumber} (${vhc?.name})</p>
                        <p><strong>Operator:</strong> ${drv?.name} (Safety Score: ${drv?.safetyScore}/100)</p>
                        <p><strong>Cargo Load:</strong> ${t.cargoWeight} kg | <strong>Est. Distance:</strong> ${t.plannedDistance} km</p>
                      </div>

                      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:14px; border-top:1px solid var(--border-color); padding-top:12px;">
                        <span style="font-size:0.8rem; color:${statColor}; font-weight:700;">● ${t.status}</span>
                        <div style="display:flex; gap:8px;">
                          ${t.status === 'Draft' ? `
                            <button class="btn btn-primary btn-sm dispatch-btn" data-id="${t.id}" style="padding:4px 10px; width:auto;">Dispatch</button>
                            <button class="btn btn-secondary btn-sm cancel-btn" data-id="${t.id}" style="padding:4px 10px; width:auto; color:#ef4444; border-color:rgba(239,68,68,0.2)">Cancel</button>
                          ` : t.status === 'Dispatched' ? `
                            <button class="btn btn-success btn-sm complete-btn" data-id="${t.id}" style="padding:4px 10px; width:auto;">Complete Trip</button>
                            <button class="btn btn-secondary btn-sm cancel-btn" data-id="${t.id}" style="padding:4px 10px; width:auto; color:#ef4444; border-color:rgba(239,68,68,0.2)">Cancel</button>
                          ` : ''}
                        </div>
                      </div>
                    </div>
                  `;
                }).join('')}
                ${activeTrips.length === 0 ? `
                  <p style="text-align:center; padding:48px; color:var(--text-secondary);">No active dispatch trips on board.</p>
                ` : ''}
              </div>
            </div>
          </div>

        </div>
      </div>

      <!-- Tab 2: Trip History Archive -->
      <div class="tab-panel" id="tab-trip-history">
        <div class="directory-actions-bar">
          <h3>Completed Dispatches Archive</h3>
        </div>

        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Trip ID</th>
                <th>Source Destination</th>
                <th>Vehicle Reg</th>
                <th>Operator</th>
                <th>Cargo Load</th>
                <th>Actual Distance</th>
                <th>Revenue</th>
                <th>Fuel Consumed</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${pastTrips.map(t => {
                const vhc = state.vehicles.find(v => v.id === t.vehicleId);
                const drv = state.drivers.find(d => d.id === t.driverId);
                let statClass = 'available'; // Completed
                if (t.status === 'Cancelled') statClass = 'lost';

                return `
                  <tr>
                    <td><code><strong>${t.id.toUpperCase()}</strong></code></td>
                    <td><strong>${t.source} → ${t.destination}</strong></td>
                    <td><code>${vhc?.registrationNumber || 'N/A'}</code></td>
                    <td>${drv?.name || 'N/A'}</td>
                    <td>${t.cargoWeight} kg</td>
                    <td>${t.actualOdometerEnd ? (t.actualOdometerEnd - (vhc?.currentOdometer - t.plannedDistance)) : t.plannedDistance} km</td>
                    <td><span style="color:#10b981; font-weight:600;">$${t.estimatedRevenue.toLocaleString()}</span></td>
                    <td>${t.fuelConsumedLiters ? `${t.fuelConsumedLiters} Liters` : 'N/A'}</td>
                    <td><span class="badge badge-status-${statClass}">${t.status}</span></td>
                  </tr>
                `;
              }).join('')}
              ${pastTrips.length === 0 ? `
                <tr>
                  <td colspan="9" style="text-align:center; padding:32px; color:var(--text-secondary);">No historical records found.</td>
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

  // --- Draft trip dispatch submit ---
  document.getElementById('trip-dispatch-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const tripData = {
      source: document.getElementById('trp-src').value,
      destination: document.getElementById('trp-dest').value,
      vehicleId: document.getElementById('trp-vhc').value,
      driverId: document.getElementById('trp-drv').value,
      cargoWeight: document.getElementById('trp-weight').value,
      plannedDistance: document.getElementById('trp-dist').value,
      estimatedRevenue: document.getElementById('trp-rev').value
    };

    try {
      stateStore.createTrip(tripData);
      showToast('Trip draft created successfully.', 'success');
      renderTrips(container, user); // re-render
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // --- Dispatch triggers ---
  container.querySelectorAll('.dispatch-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tripId = e.target.getAttribute('data-id');
      try {
        stateStore.dispatchTrip(tripId);
        showToast('Trip dispatched successfully.', 'success');
        renderTrips(container, user);
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });

  // --- Cancel triggers ---
  container.querySelectorAll('.cancel-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tripId = e.target.getAttribute('data-id');
      if (confirm('Are you sure you want to cancel this trip? Statuses of vehicles and drivers will be restored.')) {
        try {
          stateStore.cancelTrip(tripId);
          showToast('Trip cancelled.', 'info');
          renderTrips(container, user);
        } catch (err) {
          showToast(err.message, 'error');
        }
      }
    });
  });

  // --- Complete triggers ---
  container.querySelectorAll('.complete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tripId = e.target.getAttribute('data-id');
      triggerCompleteTripModal(tripId, container, user);
    });
  });

  // --- Tab controls ---
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

function triggerCompleteTripModal(tripId, mainContainer, user) {
  const overlay = document.getElementById('modal-overlay');
  const body = document.getElementById('modal-body');
  const title = document.getElementById('modal-title');
  const state = stateStore.state;
  const trip = state.trips.find(t => t.id === tripId);
  const vhc = state.vehicles.find(v => v.id === trip.vehicleId);

  title.textContent = 'Complete Dispatch Trip';
  body.innerHTML = `
    <form id="trip-complete-form">
      <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:16px;">
        Finalize trip metrics for <strong>${trip.source} → ${trip.destination}</strong>. 
        Start Odometer was <strong>${vhc.currentOdometer.toLocaleString()} km</strong>.
      </p>

      <div class="form-group">
        <label for="comp-odom">Final Odometer Reading (km)</label>
        <input type="number" id="comp-odom" class="form-control form-control-noicon" required min="${vhc.currentOdometer}" value="${vhc.currentOdometer + trip.plannedDistance}">
      </div>

      <div class="grid-2">
        <div class="form-group">
          <label for="comp-fuel">Fuel Consumed (Liters)</label>
          <input type="number" id="comp-fuel" class="form-control form-control-noicon" required placeholder="e.g. 60" min="1">
        </div>
        <div class="form-group">
          <label for="comp-tolls">Road Tolls / Other costs ($)</label>
          <input type="number" id="comp-tolls" class="form-control form-control-noicon" value="0" min="0">
        </div>
      </div>

      <div style="display:flex; justify-content: flex-end; gap:12px; margin-top:24px;">
        <button type="button" class="btn btn-secondary" onclick="document.getElementById('modal-overlay').classList.remove('active')" style="width: auto;">Cancel</button>
        <button type="submit" class="btn btn-success" style="width: auto;">Complete Dispatch</button>
      </div>
    </form>
  `;

  overlay.classList.add('active');

  document.getElementById('trip-complete-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const finalOdom = document.getElementById('comp-odom').value;
    const fuel = document.getElementById('comp-fuel').value;
    const tolls = document.getElementById('comp-tolls').value;

    try {
      stateStore.completeTrip(tripId, finalOdom, fuel, tolls);
      overlay.classList.remove('active');
      showToast(`Trip completed successfully. Vehicle odometer updated to ${finalOdom} km.`, 'success');
      renderTrips(mainContainer, user);
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}
