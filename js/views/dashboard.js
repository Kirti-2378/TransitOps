import { stateStore } from '../state.js';
import { showToast } from './login.js';

export function renderDashboard(container, user) {
  const state = stateStore.state;
  const today = new Date().toISOString().split('T')[0];

  // 1. KPI Calculations
  const activeVehicles = state.vehicles.filter(v => v.status === 'On Trip').length;
  const availableVehicles = state.vehicles.filter(v => v.status === 'Available').length;
  const inShopVehicles = state.vehicles.filter(v => v.status === 'In Shop').length;
  
  const activeTrips = state.trips.filter(t => t.status === 'Dispatched').length;
  const pendingTrips = state.trips.filter(t => t.status === 'Draft').length;
  
  const driversOnDuty = state.drivers.filter(d => d.status === 'On Trip').length;

  // Fleet Utilization = (Active Vehicles / (Total Active Fleet Vehicles (Total - Retired))) * 100
  const activeFleetCount = state.vehicles.filter(v => v.status !== 'Retired').length;
  const fleetUtilization = activeFleetCount > 0 
    ? Math.round((activeVehicles / activeFleetCount) * 100) 
    : 0;

  // Expired / Alert Drivers
  const expiredDrivers = state.drivers.filter(d => d.licenseExpiryDate < today || d.status === 'Suspended' || d.safetyScore < 70);

  // Region and type filters arrays
  const uniqueTypes = [...new Set(state.vehicles.map(v => v.type))];
  const uniqueRegions = [...new Set(state.vehicles.filter(v => v.region).map(v => v.region))];

  const canDispatch = user.role === 'Fleet Manager' || user.role === 'Driver';
  const canRegister = user.role === 'Fleet Manager';
  const canExpense = user.role === 'Fleet Manager' || user.role === 'Financial Analyst' || user.role === 'Driver';

  let html = `
    <div class="dashboard-wrapper">
      
      <!-- Filters Toolbar -->
      <div class="directory-actions-bar" style="margin-bottom:24px;">
        <h3 style="font-size:1.25rem;">Fleet Operations Filter</h3>
        <div class="filters-wrapper">
          <select id="filter-dash-type" class="select-control">
            <option value="">All Vehicle Types</option>
            ${uniqueTypes.map(t => `<option value="${t}">${t}</option>`).join('')}
          </select>
          <select id="filter-dash-region" class="select-control">
            <option value="">All Regions</option>
            ${uniqueRegions.map(r => `<option value="${r}">${r}</option>`).join('')}
          </select>
        </div>
      </div>

      <!-- Warning Panel (Safety Warnings) -->
      ${expiredDrivers.length > 0 && (user.role === 'Safety Officer' || user.role === 'Fleet Manager') ? `
        <div class="alert-section" style="margin-bottom: 24px;">
          <i data-lucide="shield-alert" style="width: 28px; height: 28px; color: #ef4444;"></i>
          <div class="alert-content">
            <h4>Safety Officer Alerts: Driver Compliance Concerns (${expiredDrivers.length})</h4>
            <p>The following operators have safety violations, expired qualifications, or suspended profiles. Trip dispatch is blocked:</p>
            <div class="table-responsive" style="margin-top: 12px; background: transparent; border-color: rgba(239, 68, 68, 0.2);">
              <table style="background: transparent;">
                <thead>
                  <tr style="background: rgba(239, 68, 68, 0.05);">
                    <th style="color: #ef4444;">Driver Name</th>
                    <th style="color: #ef4444;">License Class</th>
                    <th style="color: #ef4444;">Safety Score</th>
                    <th style="color: #ef4444;">License Expiry</th>
                    <th style="color: #ef4444;">Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${expiredDrivers.map(drv => {
                    const isExpired = drv.licenseExpiryDate < today;
                    return `
                      <tr>
                        <td><strong>${drv.name}</strong></td>
                        <td>${drv.licenseCategory}</td>
                        <td><span style="font-weight:600; color:${drv.safetyScore < 70 ? '#ef4444' : '#10b981'}">${drv.safetyScore}/100</span></td>
                        <td><span style="color:${isExpired ? '#ef4444' : 'var(--text-secondary)'}; font-weight: 600;">${drv.licenseExpiryDate} ${isExpired ? '(EXPIRED)' : ''}</span></td>
                        <td><span class="badge badge-status-${drv.status.toLowerCase().replace(' ', '-')}">${drv.status}</span></td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- KPI Metrics Grid -->
      <div class="dashboard-grid">
        
        <div class="kpi-card" style="border-left: 4px solid #10b981;">
          <div class="kpi-icon" style="background-color: rgba(16, 185, 129, 0.1); color: #10b981;">
            <i data-lucide="check-circle"></i>
          </div>
          <div class="kpi-content">
            <div class="kpi-value" id="kpi-val-available">${availableVehicles}</div>
            <div class="kpi-label">Available Vehicles</div>
          </div>
        </div>

        <div class="kpi-card" style="border-left: 4px solid #6366f1;">
          <div class="kpi-icon" style="background-color: rgba(99, 102, 241, 0.1); color: #6366f1;">
            <i data-lucide="truck"></i>
          </div>
          <div class="kpi-content">
            <div class="kpi-value" id="kpi-val-active">${activeVehicles}</div>
            <div class="kpi-label">Active Vehicles</div>
          </div>
        </div>

        <div class="kpi-card" style="border-left: 4px solid #f59e0b;">
          <div class="kpi-icon" style="background-color: rgba(245, 158, 11, 0.1); color: #f59e0b;">
            <i data-lucide="tool"></i>
          </div>
          <div class="kpi-content">
            <div class="kpi-value" id="kpi-val-shop">${inShopVehicles}</div>
            <div class="kpi-label">Vehicles in Shop</div>
          </div>
        </div>

        <div class="kpi-card" style="border-left: 4px solid #8b5cf6;">
          <div class="kpi-icon" style="background-color: rgba(139, 92, 246, 0.1); color: #8b5cf6;">
            <i data-lucide="navigation"></i>
          </div>
          <div class="kpi-content">
            <div class="kpi-value" id="kpi-val-trips">${activeTrips}</div>
            <div class="kpi-label">Active Dispatch Trips</div>
          </div>
        </div>

        <div class="kpi-card" style="border-left: 4px solid #06b6d4;">
          <div class="kpi-icon" style="background-color: rgba(6, 182, 212, 0.1); color: #06b6d4;">
            <i data-lucide="user-check"></i>
          </div>
          <div class="kpi-content">
            <div class="kpi-value" id="kpi-val-drivers">${driversOnDuty}</div>
            <div class="kpi-label">Drivers On Duty</div>
          </div>
        </div>

        <div class="kpi-card" style="border-left: 4px solid #ec4899;">
          <div class="kpi-icon" style="background-color: rgba(236, 72, 153, 0.1); color: #ec4899;">
            <i data-lucide="gauge"></i>
          </div>
          <div class="kpi-content">
            <div class="kpi-value" id="kpi-val-util">${fleetUtilization}%</div>
            <div class="kpi-label">Fleet Utilization</div>
          </div>
        </div>

      </div>

      <!-- Quick Actions Grid -->
      <h3 style="margin-bottom: 16px;">Operational Actions</h3>
      <div class="dashboard-actions-row">
        
        ${canRegister ? `
          <div class="quick-action-card" id="qa-register-vehicle">
            <i data-lucide="plus-circle"></i>
            <h4>Register Vehicle</h4>
            <p style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 4px;">Add a new transport asset</p>
          </div>
        ` : ''}

        ${canDispatch ? `
          <div class="quick-action-card" id="qa-dispatch-trip">
            <i data-lucide="send"></i>
            <h4>Create Trip Dispatch</h4>
            <p style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 4px;">Assign driver & load capacity</p>
          </div>
        ` : ''}

        ${canExpense ? `
          <div class="quick-action-card" id="qa-record-expense">
            <i data-lucide="receipt"></i>
            <h4>Record Cost Logs</h4>
            <p style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 4px;">Log fuel fill or toll costs</p>
          </div>
        ` : ''}
        
      </div>

      <!-- Chart and Recent Log section -->
      <div class="grid-2" style="margin-top: 32px;">
        
        <!-- Status distribution chart -->
        <div class="chart-card">
          <h3>Fleet Vehicle Status</h3>
          <div class="chart-wrapper">
            <canvas id="vehicle-status-chart"></canvas>
          </div>
        </div>

        <!-- Recent Logs list -->
        <div class="chart-card">
          <h3>Recent Transit Records</h3>
          <div style="display: flex; flex-direction: column; gap: 12px; max-height: 250px; overflow-y: auto; padding-right: 8px;">
            ${state.trips.slice(0, 4).map(trp => {
              const vhc = state.vehicles.find(v => v.id === trp.vehicleId);
              const drv = state.drivers.find(d => d.id === trp.driverId);
              let statusColor = '#3b82f6';
              if (trp.status === 'Completed') statusColor = '#10b981';
              if (trp.status === 'Cancelled') statusColor = '#ef4444';

              return `
                <div style="display: flex; gap: 12px; border-bottom: 1px solid var(--border-color); padding-bottom: 12px;">
                  <div style="width: 8px; height: 8px; border-radius: 50%; background-color: ${statusColor}; margin-top: 6px;"></div>
                  <div style="flex: 1;">
                    <span style="font-size: 0.85rem; font-weight: 600;">Trip ${trp.source} → ${trp.destination}</span>
                    <p style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 2px;">
                      Vehicle: ${vhc?.registrationNumber} | Operator: ${drv?.name}
                    </p>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px;">
                      <span style="font-size: 0.75rem; color:${statusColor}; font-weight:600;">● ${trp.status}</span>
                      <span style="font-size: 0.7rem; color: var(--text-muted);">${trp.date}</span>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
            ${state.trips.length === 0 ? `<p style="text-align:center; padding:32px; color:var(--text-muted);">No logs.</p>` : ''}
          </div>
        </div>

      </div>

    </div>
  `;

  container.innerHTML = html;

  if (window.lucide) {
    window.lucide.createIcons();
  }

  // Draw chart
  renderStatusChart(state.vehicles);

  // Filters binding
  const typeFilter = document.getElementById('filter-dash-type');
  const regionFilter = document.getElementById('filter-dash-region');

  const processFilters = () => {
    const tVal = typeFilter.value;
    const rVal = regionFilter.value;

    const filteredVehicles = state.vehicles.filter(v => {
      const matchType = tVal === '' || v.type === tVal;
      const matchRegion = rVal === '' || v.region === rVal;
      return matchType && matchRegion;
    });

    // Update KPIs
    const active = filteredVehicles.filter(v => v.status === 'On Trip').length;
    const available = filteredVehicles.filter(v => v.status === 'Available').length;
    const shop = filteredVehicles.filter(v => v.status === 'In Shop').length;

    document.getElementById('kpi-val-available').textContent = available;
    document.getElementById('kpi-val-active').textContent = active;
    document.getElementById('kpi-val-shop').textContent = shop;

    const activeF = filteredVehicles.filter(v => v.status !== 'Retired').length;
    const util = activeF > 0 ? Math.round((active / activeF) * 100) : 0;
    document.getElementById('kpi-val-util').textContent = `${util}%`;

    // Redraw Chart
    renderStatusChart(filteredVehicles);
  };

  typeFilter.addEventListener('change', processFilters);
  regionFilter.addEventListener('change', processFilters);

  // Quick action listeners
  if (canRegister) {
    document.getElementById('qa-register-vehicle').addEventListener('click', () => {
      triggerRegisterVehicleModal(container, user);
    });
  }

  if (canDispatch) {
    document.getElementById('qa-dispatch-trip').addEventListener('click', () => {
      triggerDispatchTripModal(container, user);
    });
  }

  if (canExpense) {
    document.getElementById('qa-record-expense').addEventListener('click', () => {
      triggerRecordExpenseModal(container, user);
    });
  }
}

let activeChartInstance = null;

function renderStatusChart(vehicles) {
  const canvas = document.getElementById('vehicle-status-chart');
  if (!canvas) return;

  const statuses = { Available: 0, 'On Trip': 0, 'In Shop': 0, Retired: 0 };
  vehicles.forEach(v => {
    if (statuses[v.status] !== undefined) {
      statuses[v.status]++;
    }
  });

  if (activeChartInstance) {
    activeChartInstance.destroy();
  }

  activeChartInstance = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: Object.keys(statuses),
      datasets: [{
        data: Object.values(statuses),
        backgroundColor: [
          '#10b981', // Available
          '#3b82f6', // On Trip
          '#f59e0b', // In Shop
          '#6b7280'  // Retired
        ],
        borderWidth: 2,
        borderColor: 'var(--bg-card)'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: 'var(--text-secondary)',
            font: { size: 12 }
          }
        }
      }
    }
  });
}

function triggerRegisterVehicleModal(mainContainer, user) {
  const overlay = document.getElementById('modal-overlay');
  const body = document.getElementById('modal-body');
  const title = document.getElementById('modal-title');

  title.textContent = 'Register New Transport Asset';
  body.innerHTML = `
    <form id="qa-reg-vehicle-form">
      <div class="grid-2">
        <div class="form-group">
          <label for="v-reg">Registration Number (Unique)</label>
          <input type="text" id="v-reg" class="form-control form-control-noicon" required placeholder="e.g. TX-9912A">
        </div>
        <div class="form-group">
          <label for="v-name">Vehicle Name / Model</label>
          <input type="text" id="v-name" class="form-control form-control-noicon" required placeholder="e.g. Ford Transit Box Van">
        </div>
      </div>
      <div class="grid-2">
        <div class="form-group">
          <label for="v-type">Vehicle Type</label>
          <select id="v-type" class="select-control" style="width:100%; height:42px;" required>
            <option value="Van">Van</option>
            <option value="Truck">Truck</option>
            <option value="Semi-Truck">Semi-Truck</option>
            <option value="Flatbed Truck">Flatbed Truck</option>
            <option value="Box Truck">Box Truck</option>
            <option value="Sedan">Sedan</option>
          </select>
        </div>
        <div class="form-group">
          <label for="v-cap">Maximum Load Capacity (kg)</label>
          <input type="number" id="v-cap" class="form-control form-control-noicon" required placeholder="1500" min="1">
        </div>
      </div>
      <div class="grid-3">
        <div class="form-group">
          <label for="v-odom">Odometer (km)</label>
          <input type="number" id="v-odom" class="form-control form-control-noicon" required placeholder="12000" min="0">
        </div>
        <div class="form-group">
          <label for="v-cost">Acquisition Cost ($)</label>
          <input type="number" id="v-cost" class="form-control form-control-noicon" required placeholder="42000" min="0">
        </div>
        <div class="form-group">
          <label for="v-region">Operational Region</label>
          <input type="text" id="v-region" class="form-control form-control-noicon" required placeholder="e.g. North">
        </div>
      </div>

      <div style="display:flex; justify-content: flex-end; gap: 12px; margin-top: 20px;">
        <button type="button" class="btn btn-secondary" onclick="document.getElementById('modal-overlay').classList.remove('active')" style="width: auto;">Cancel</button>
        <button type="submit" class="btn btn-primary" style="width: auto;">Register Vehicle</button>
      </div>
    </form>
  `;

  overlay.classList.add('active');

  document.getElementById('qa-reg-vehicle-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const vehicleData = {
      registrationNumber: document.getElementById('v-reg').value,
      name: document.getElementById('v-name').value,
      type: document.getElementById('v-type').value,
      maxLoadCapacity: document.getElementById('v-cap').value,
      currentOdometer: document.getElementById('v-odom').value,
      acquisitionCost: document.getElementById('v-cost').value,
      region: document.getElementById('v-region').value
    };

    try {
      stateStore.createVehicle(vehicleData);
      overlay.classList.remove('active');
      showToast(`Vehicle ${vehicleData.registrationNumber} registered successfully.`, 'success');
      renderDashboard(mainContainer, user);
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

function triggerDispatchTripModal(mainContainer, user) {
  const overlay = document.getElementById('modal-overlay');
  const body = document.getElementById('modal-body');
  const title = document.getElementById('modal-title');

  // Business Rules: Only Available vehicles and Available drivers
  const availVehicles = stateStore.state.vehicles.filter(v => v.status === 'Available');
  const availDrivers = stateStore.state.drivers.filter(d => d.status === 'Available');

  title.textContent = 'Create Dispatch Trip';

  if (availVehicles.length === 0 || availDrivers.length === 0) {
    body.innerHTML = `
      <p style="text-align:center; padding: 24px 0; color:var(--text-secondary);">
        Dispatch Blocked: There must be at least one <strong>Available</strong> vehicle and <strong>Available</strong> driver in stock.
      </p>
      <div style="display:flex; justify-content:center;">
        <button class="btn btn-secondary" onclick="document.getElementById('modal-overlay').classList.remove('active')" style="width:auto;">Close</button>
      </div>
    `;
    overlay.classList.add('active');
    return;
  }

  body.innerHTML = `
    <form id="qa-dispatch-trip-form">
      <div class="grid-2">
        <div class="form-group">
          <label for="t-src">Source Location</label>
          <input type="text" id="t-src" class="form-control form-control-noicon" required placeholder="Warehouse Dallas">
        </div>
        <div class="form-group">
          <label for="t-dest">Destination Location</label>
          <input type="text" id="t-dest" class="form-control form-control-noicon" required placeholder="Houston Terminal">
        </div>
      </div>
      
      <div class="grid-2">
        <div class="form-group">
          <label for="t-vhc">Select Vehicle</label>
          <select id="t-vhc" class="select-control" style="width:100%; height:42px;" required>
            ${availVehicles.map(v => `<option value="${v.id}">${v.registrationNumber} - ${v.name} (Max Capacity: ${v.maxLoadCapacity} kg)</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label for="t-drv">Assign Driver</label>
          <select id="t-drv" class="select-control" style="width:100%; height:42px;" required>
            ${availDrivers.map(d => `<option value="${d.id}">${d.name} (Safety Score: ${d.safetyScore}/100)</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="grid-3">
        <div class="form-group">
          <label for="t-weight">Cargo Load Weight (kg)</label>
          <input type="number" id="t-weight" class="form-control form-control-noicon" required placeholder="e.g. 500" min="1">
        </div>
        <div class="form-group">
          <label for="t-dist">Planned Distance (km)</label>
          <input type="number" id="t-dist" class="form-control form-control-noicon" required placeholder="350" min="1">
        </div>
        <div class="form-group">
          <label for="t-rev">Estimated Revenue ($)</label>
          <input type="number" id="t-rev" class="form-control form-control-noicon" required placeholder="1200" min="0">
        </div>
      </div>

      <div style="display:flex; justify-content: flex-end; gap: 12px; margin-top: 24px;">
        <button type="button" class="btn btn-secondary" onclick="document.getElementById('modal-overlay').classList.remove('active')" style="width: auto;">Cancel</button>
        <button type="submit" class="btn btn-primary" style="width: auto;">Dispatch Immediately</button>
      </div>
    </form>
  `;

  overlay.classList.add('active');

  document.getElementById('qa-dispatch-trip-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const tripData = {
      source: document.getElementById('t-src').value,
      destination: document.getElementById('t-dest').value,
      vehicleId: document.getElementById('t-vhc').value,
      driverId: document.getElementById('t-drv').value,
      cargoWeight: document.getElementById('t-weight').value,
      plannedDistance: document.getElementById('t-dist').value,
      estimatedRevenue: document.getElementById('t-rev').value
    };

    try {
      const trip = stateStore.createTrip(tripData);
      // Auto-dispatch it immediately as per Quick Action intention
      stateStore.dispatchTrip(trip.id);
      overlay.classList.remove('active');
      showToast(`Trip ${trip.id} dispatched successfully. Driver and vehicle status set to On Trip.`, 'success');
      renderDashboard(mainContainer, user);
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

function triggerRecordExpenseModal(mainContainer, user) {
  const overlay = document.getElementById('modal-overlay');
  const body = document.getElementById('modal-body');
  const title = document.getElementById('modal-title');
  const activeVehicles = stateStore.state.vehicles.filter(v => v.status !== 'Retired');

  title.textContent = 'Record Expense Log';
  body.innerHTML = `
    <form id="qa-expense-form">
      <div class="form-group">
        <label for="exp-vhc-id">Vehicle Registration</label>
        <select id="exp-vhc-id" class="select-control" style="width:100%; height:42px;" required>
          ${activeVehicles.map(v => `<option value="${v.id}">${v.registrationNumber} - ${v.name}</option>`).join('')}
        </select>
      </div>

      <div class="grid-2">
        <div class="form-group">
          <label for="exp-type">Cost Type</label>
          <select id="exp-type" class="select-control" style="width:100%; height:42px;" required>
            <option value="Fuel">Fuel Cost Fill-up</option>
            <option value="Toll">Road / Bridge Tolls</option>
            <option value="Other">Other Expense</option>
          </select>
        </div>
        <div class="form-group">
          <label for="exp-cost">Cost Amount ($)</label>
          <input type="number" id="exp-cost" class="form-control form-control-noicon" required placeholder="120" min="1">
        </div>
      </div>

      <div id="dynamic-fuel-inputs">
        <div class="form-group">
          <label for="exp-liters">Fuel Volume (Liters)</label>
          <input type="number" id="exp-liters" class="form-control form-control-noicon" required placeholder="80" min="1">
        </div>
      </div>

      <div style="display:flex; justify-content: flex-end; gap: 12px; margin-top: 24px;">
        <button type="button" class="btn btn-secondary" onclick="document.getElementById('modal-overlay').classList.remove('active')" style="width: auto;">Cancel</button>
        <button type="submit" class="btn btn-primary" style="width: auto;">Save Expense</button>
      </div>
    </form>
  `;

  overlay.classList.add('active');

  const typeSel = document.getElementById('exp-type');
  const fuelInputs = document.getElementById('dynamic-fuel-inputs');

  typeSel.addEventListener('change', () => {
    if (typeSel.value === 'Fuel') {
      fuelInputs.style.display = 'block';
      document.getElementById('exp-liters').setAttribute('required', 'true');
    } else {
      fuelInputs.style.display = 'none';
      document.getElementById('exp-liters').removeAttribute('required');
    }
  });

  document.getElementById('qa-expense-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const vehicleId = document.getElementById('exp-vhc-id').value;
    const type = typeSel.value;
    const cost = document.getElementById('exp-cost').value;

    try {
      if (type === 'Fuel') {
        const liters = document.getElementById('exp-liters').value;
        stateStore.addFuelLog(vehicleId, liters, cost);
      } else {
        stateStore.addGeneralExpense(vehicleId, type, cost);
      }
      overlay.classList.remove('active');
      showToast('Expense log recorded successfully.', 'success');
      renderDashboard(mainContainer, user);
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}
