import { stateStore } from '../state.js';
import { showToast } from './login.js';

export function renderVehicles(container, user) {
  const state = stateStore.state;
  const isManager = user.role === 'Fleet Manager' || user.role === 'Admin';

  let html = `
    <div class="vehicles-view">
      
      <!-- Create Vehicle Panel (Only for Fleet Managers/Admins) -->
      ${isManager ? `
        <div class="chart-card" id="add-vehicle-panel" style="display: none; margin-bottom: 24px; animation: fadeIn 0.3s ease;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px;">
            <h3>Add Fleet Vehicle</h3>
            <button class="btn-icon" id="btn-close-vehicle-reg" title="Collapse Form">
              <i data-lucide="chevron-up"></i>
            </button>
          </div>
          <form id="vehicle-reg-form">
            <div class="grid-2">
              <div class="form-group">
                <label for="reg-num">Registration Number (Unique)</label>
                <input type="text" id="reg-num" class="form-control form-control-noicon" required placeholder="e.g. TX-4829F">
              </div>
              <div class="form-group">
                <label for="name">Vehicle Model / Description</label>
                <input type="text" id="name" class="form-control form-control-noicon" required placeholder="e.g. Ford Transit Cargo Van">
              </div>
            </div>
            <div class="grid-2">
              <div class="form-group">
                <label for="type">Vehicle Type</label>
                <select id="type" class="select-control" style="width: 100%; height: 42px;" required>
                  <option value="Van">Van</option>
                  <option value="Truck">Truck</option>
                  <option value="Semi-Truck">Semi-Truck</option>
                  <option value="Flatbed Truck">Flatbed Truck</option>
                  <option value="Box Truck">Box Truck</option>
                  <option value="Sedan">Sedan</option>
                </select>
              </div>
              <div class="form-group">
                <label for="capacity">Maximum Load Capacity (kg)</label>
                <input type="number" id="capacity" class="form-control form-control-noicon" required placeholder="e.g. 1500" min="1">
              </div>
            </div>
            <div class="grid-3">
              <div class="form-group">
                <label for="odometer">Initial Odometer (km)</label>
                <input type="number" id="odometer" class="form-control form-control-noicon" required placeholder="45000" min="0">
              </div>
              <div class="form-group">
                <label for="cost">Acquisition Cost ($)</label>
                <input type="number" id="cost" class="form-control form-control-noicon" required placeholder="32000" min="0">
              </div>
              <div class="form-group">
                <label for="region">Operational Region</label>
                <input type="text" id="region" class="form-control form-control-noicon" required placeholder="e.g. North">
              </div>
            </div>

            <div style="display:flex; justify-content: flex-end; gap: 12px; margin-top: 24px;">
              <button type="reset" class="btn btn-secondary" style="width: auto;">Reset</button>
              <button type="submit" class="btn btn-primary" style="width: auto;">Register Vehicle</button>
            </div>
          </form>
        </div>
      ` : ''}

      <!-- Toolbar -->
      <div class="directory-actions-bar">
        <div class="filters-wrapper">
          <div class="search-input-group">
            <i data-lucide="search"></i>
            <input type="text" id="search-vhc" class="form-control search-control" placeholder="Search Registration or Model...">
          </div>
          <select id="filter-vhc-type" class="select-control">
            <option value="">All Types</option>
            <option value="Van">Van</option>
            <option value="Truck">Truck</option>
            <option value="Semi-Truck">Semi-Truck</option>
            <option value="Flatbed Truck">Flatbed Truck</option>
            <option value="Box Truck">Box Truck</option>
            <option value="Sedan">Sedan</option>
          </select>
          <select id="filter-vhc-status" class="select-control">
            <option value="">All Statuses</option>
            <option value="Available">Available</option>
            <option value="On Trip">On Trip</option>
            <option value="In Shop">In Shop</option>
            <option value="Retired">Retired</option>
          </select>
        </div>

        ${isManager ? `
          <button class="btn btn-primary" id="btn-toggle-vehicle-reg" style="width: auto;">
            <i data-lucide="plus"></i> Add Vehicle
          </button>
        ` : ''}
      </div>

      <!-- Vehicle Registry Table -->
      <div class="table-responsive">
        <table>
          <thead>
            <tr>
              <th>Reg Number</th>
              <th>Vehicle Model</th>
              <th>Type</th>
              <th>Region</th>
              <th>Max Capacity</th>
              <th>Odometer</th>
              <th>Status</th>
              <th style="text-align: right;">Manage</th>
            </tr>
          </thead>
          <tbody id="vehicles-table-body">
            <!-- Dynamic rows -->
          </tbody>
        </table>
      </div>

    </div>
  `;

  container.innerHTML = html;

  if (window.lucide) {
    window.lucide.createIcons();
  }

  // Bind Form Show/Hide Panel
  if (isManager) {
    const regPanel = document.getElementById('add-vehicle-panel');
    const toggleBtn = document.getElementById('btn-toggle-vehicle-reg');
    const closeBtn = document.getElementById('btn-close-vehicle-reg');

    const toggleReg = () => {
      const isHidden = regPanel.style.display === 'none';
      regPanel.style.display = isHidden ? 'block' : 'none';
      toggleBtn.innerHTML = isHidden 
        ? '<i data-lucide="chevron-up"></i> Hide Panel' 
        : '<i data-lucide="plus"></i> Add Vehicle';
      if (window.lucide) window.lucide.createIcons();
    };

    toggleBtn.addEventListener('click', toggleReg);
    closeBtn.addEventListener('click', toggleReg);

    // Form Submit
    document.getElementById('vehicle-reg-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const vehicleData = {
        registrationNumber: document.getElementById('reg-num').value,
        name: document.getElementById('name').value,
        type: document.getElementById('type').value,
        maxLoadCapacity: document.getElementById('capacity').value,
        currentOdometer: document.getElementById('odometer').value,
        acquisitionCost: document.getElementById('cost').value,
        region: document.getElementById('region').value
      };

      try {
        stateStore.createVehicle(vehicleData);
        showToast(`Vehicle ${vehicleData.registrationNumber} registered successfully.`, 'success');
        document.getElementById('vehicle-reg-form').reset();
        regPanel.style.display = 'none';
        toggleBtn.innerHTML = '<i data-lucide="plus"></i> Add Vehicle';
        if (window.lucide) window.lucide.createIcons();
        applyFilters();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  // Filtering & Sorting
  const searchInput = document.getElementById('search-vhc');
  const typeFilter = document.getElementById('filter-vhc-type');
  const statusFilter = document.getElementById('filter-vhc-status');

  const applyFilters = () => {
    const q = searchInput.value.toLowerCase().trim();
    const type = typeFilter.value;
    const stat = statusFilter.value;

    const filtered = state.vehicles.filter(v => {
      const matchSearch = v.registrationNumber.toLowerCase().includes(q) || v.name.toLowerCase().includes(q);
      const matchType = type === '' || v.type === type;
      const matchStatus = stat === '' || v.status === stat;
      return matchSearch && matchType && matchStatus;
    });

    renderTableRows(filtered, container, user);
  };

  searchInput.addEventListener('input', applyFilters);
  typeFilter.addEventListener('change', applyFilters);
  statusFilter.addEventListener('change', applyFilters);

  // Initial draw
  applyFilters();
}

function renderTableRows(vehiclesList, mainContainer, user) {
  const tbody = document.getElementById('vehicles-table-body');
  if (!tbody) return;

  if (vehiclesList.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center; padding:32px; color:var(--text-secondary);">
          No fleet vehicles match the search query.
        </td>
      </tr>
    `;
    return;
  }

  const isManager = user.role === 'Fleet Manager' || user.role === 'Admin';

  tbody.innerHTML = vehiclesList.map(v => {
    let statClass = v.status.toLowerCase().replace(' ', '-');
    if (statClass === 'in-shop') statClass = 'in-shop';
    if (statClass === 'on-trip') statClass = 'on-trip';
    
    return `
      <tr>
        <td><code><strong>${v.registrationNumber}</strong></code></td>
        <td>${v.name}</td>
        <td>${v.type}</td>
        <td><span class="text-secondary">${v.region || 'HQ'}</span></td>
        <td>${v.maxLoadCapacity.toLocaleString()} kg</td>
        <td>${v.currentOdometer.toLocaleString()} km</td>
        <td><span class="badge badge-status-${statClass}">${v.status}</span></td>
        <td style="text-align: right; white-space: nowrap;">
          <button class="btn btn-secondary btn-sm details-vhc-btn" data-id="${v.id}" style="padding:4px 8px; width:auto; margin-right:4px;">Details</button>
          ${isManager && v.status !== 'Retired' ? `
            <button class="btn btn-secondary btn-sm edit-vhc-btn" data-id="${v.id}" style="padding:4px 8px; width:auto; margin-right:4px;">Edit</button>
            <button class="btn btn-danger btn-sm retire-vhc-btn" data-id="${v.id}" style="padding:4px 8px; width:auto;">Retire</button>
          ` : ''}
        </td>
      </tr>
    `;
  }).join('');

  // Bind Actions
  tbody.querySelectorAll('.details-vhc-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.getAttribute('data-id');
      triggerVehicleDetailsModal(id);
    });
  });

  if (isManager) {
    tbody.querySelectorAll('.edit-vhc-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        triggerEditVehicleModal(id, mainContainer, user);
      });
    });

    tbody.querySelectorAll('.retire-vhc-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        if (confirm('Are you sure you want to retire this vehicle? It will be permanently removed from dispatch selection pools.')) {
          try {
            stateStore.deleteVehicle(id);
            showToast('Vehicle retired successfully.', 'info');
            renderVehicles(mainContainer, user); // re-render
          } catch (err) {
            showToast(err.message, 'error');
          }
        }
      });
    });
  }
}

function triggerVehicleDetailsModal(vehicleId) {
  const overlay = document.getElementById('modal-overlay');
  const body = document.getElementById('modal-body');
  const title = document.getElementById('modal-title');
  const state = stateStore.state;
  const vhc = state.vehicles.find(v => v.id === vehicleId);

  title.textContent = `Fleet Vehicle details: ${vhc.registrationNumber}`;

  // Calculate costs and ROI
  const totalCost = stateStore.getVehicleTotalCost(vhc.id);
  const revenue = state.trips
    .filter(t => t.vehicleId === vhc.id && t.status === 'Completed')
    .reduce((sum, t) => sum + t.estimatedRevenue, 0);

  const roi = vhc.acquisitionCost > 0
    ? (((revenue - totalCost) / vhc.acquisitionCost) * 100).toFixed(2)
    : '0.00';

  body.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:20px;">
      <div style="background-color: var(--bg-secondary); border: 1px solid var(--border-color); padding: 18px; border-radius: var(--radius-md);">
        <h4 style="margin-bottom:12px; color:var(--accent-primary);">${vhc.name}</h4>
        <div class="grid-2">
          <div>
            <p style="margin-bottom:8px;"><strong>Registration Number:</strong> <span class="text-secondary">${vhc.registrationNumber}</span></p>
            <p style="margin-bottom:8px;"><strong>Vehicle Type:</strong> <span class="text-secondary">${vhc.type}</span></p>
            <p style="margin-bottom:8px;"><strong>Operational Region:</strong> <span class="text-secondary">${vhc.region || 'HQ'}</span></p>
            <p style="margin-bottom:8px;"><strong>Odometer:</strong> <span class="text-secondary">${vhc.currentOdometer.toLocaleString()} km</span></p>
          </div>
          <div>
            <p style="margin-bottom:8px;"><strong>Max Cargo Capacity:</strong> <span class="text-secondary">${vhc.maxLoadCapacity.toLocaleString()} kg</span></p>
            <p style="margin-bottom:8px;"><strong>Acquisition Cost:</strong> <span class="text-secondary">$${vhc.acquisitionCost.toLocaleString()}</span></p>
            <p style="margin-bottom:8px;"><strong>Cumulative Expenses:</strong> <span class="text-secondary" style="color:#ef4444; font-weight:600;">$${totalCost.toLocaleString()}</span></p>
            <p style="margin-bottom:8px;"><strong>Vehicle ROI:</strong> <span class="text-secondary" style="color:${parseFloat(roi) >= 0 ? '#10b981' : '#ef4444'}; font-weight:700;">${roi}%</span></p>
          </div>
        </div>
      </div>

      <!-- Recent Trips list -->
      <div>
        <h4 style="margin-bottom:10px;">Recent Trips Handled</h4>
        <div style="display:flex; flex-direction:column; gap:8px; max-height:160px; overflow-y:auto;">
          ${state.trips.filter(t => t.vehicleId === vehicleId).map(t => {
            const drv = state.drivers.find(d => d.id === t.driverId)?.name || 'Unknown';
            return `
              <div style="border:1px solid var(--border-color); padding:10px; border-radius:var(--radius-sm); background:var(--bg-secondary); font-size:0.85rem; display:flex; justify-content:space-between; align-items:center;">
                <span><strong>${t.source} → ${t.destination}</strong> (${drv})</span>
                <span class="badge badge-status-${t.status.toLowerCase()}">${t.status}</span>
              </div>
            `;
          }).join('')}
          ${state.trips.filter(t => t.vehicleId === vehicleId).length === 0 ? `<p style="font-size:0.8rem; color:var(--text-muted);">No trip history.</p>` : ''}
        </div>
      </div>

      <div style="display:flex; justify-content: flex-end;">
        <button class="btn btn-secondary" onclick="document.getElementById('modal-overlay').classList.remove('active')" style="width: auto;">Close</button>
      </div>
    </div>
  `;

  overlay.classList.add('active');
  if (window.lucide) window.lucide.createIcons();
}

function triggerEditVehicleModal(vehicleId, mainContainer, user) {
  const overlay = document.getElementById('modal-overlay');
  const body = document.getElementById('modal-body');
  const title = document.getElementById('modal-title');
  const vhc = stateStore.state.vehicles.find(v => v.id === vehicleId);

  title.textContent = `Edit Fleet Vehicle details`;
  body.innerHTML = `
    <form id="edit-vhc-form">
      <div class="grid-2">
        <div class="form-group">
          <label for="edit-v-reg">Registration Number</label>
          <input type="text" id="edit-v-reg" class="form-control form-control-noicon" required value="${vhc.registrationNumber}">
        </div>
        <div class="form-group">
          <label for="edit-v-name">Vehicle Model Name</label>
          <input type="text" id="edit-v-name" class="form-control form-control-noicon" required value="${vhc.name}">
        </div>
      </div>
      <div class="grid-2">
        <div class="form-group">
          <label for="edit-v-type">Vehicle Type</label>
          <select id="edit-v-type" class="select-control" style="width: 100%; height: 42px;">
            <option value="Van" ${vhc.type === 'Van' ? 'selected' : ''}>Van</option>
            <option value="Truck" ${vhc.type === 'Truck' ? 'selected' : ''}>Truck</option>
            <option value="Semi-Truck" ${vhc.type === 'Semi-Truck' ? 'selected' : ''}>Semi-Truck</option>
            <option value="Flatbed Truck" ${vhc.type === 'Flatbed Truck' ? 'selected' : ''}>Flatbed Truck</option>
            <option value="Box Truck" ${vhc.type === 'Box Truck' ? 'selected' : ''}>Box Truck</option>
            <option value="Sedan" ${vhc.type === 'Sedan' ? 'selected' : ''}>Sedan</option>
          </select>
        </div>
        <div class="form-group">
          <label for="edit-v-cap">Maximum Capacity (kg)</label>
          <input type="number" id="edit-v-cap" class="form-control form-control-noicon" required value="${vhc.maxLoadCapacity}" min="1">
        </div>
      </div>
      <div class="grid-2">
        <div class="form-group">
          <label for="edit-v-region">Operational Region</label>
          <input type="text" id="edit-v-region" class="form-control form-control-noicon" required value="${vhc.region || 'HQ'}">
        </div>
        <div class="form-group">
          <label for="edit-v-status">Fleet Status</label>
          <select id="edit-v-status" class="select-control" style="width:100%; height:42px;">
            <option value="Available" ${vhc.status === 'Available' ? 'selected' : ''}>Available</option>
            <option value="On Trip" ${vhc.status === 'On Trip' ? 'selected' : ''}>On Trip</option>
            <option value="In Shop" ${vhc.status === 'In Shop' ? 'selected' : ''}>In Shop</option>
            <option value="Retired" ${vhc.status === 'Retired' ? 'selected' : ''}>Retired</option>
          </select>
        </div>
      </div>

      <div style="display:flex; justify-content: flex-end; gap: 12px; margin-top: 20px;">
        <button type="button" class="btn btn-secondary" onclick="document.getElementById('modal-overlay').classList.remove('active')" style="width: auto;">Cancel</button>
        <button type="submit" class="btn btn-primary" style="width: auto;">Save Changes</button>
      </div>
    </form>
  `;

  overlay.classList.add('active');

  document.getElementById('edit-vhc-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const updatedData = {
      registrationNumber: document.getElementById('edit-v-reg').value,
      name: document.getElementById('edit-v-name').value,
      type: document.getElementById('edit-v-type').value,
      maxLoadCapacity: document.getElementById('edit-v-cap').value,
      region: document.getElementById('edit-v-region').value,
      status: document.getElementById('edit-v-status').value
    };

    try {
      stateStore.updateVehicle(vehicleId, updatedData);
      overlay.classList.remove('active');
      showToast(`Vehicle ${updatedData.registrationNumber} details updated successfully.`, 'success');
      renderVehicles(mainContainer, user);
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}
