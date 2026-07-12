import { stateStore } from '../state.js';
import { showToast } from './login.js';

export function renderDrivers(container, user) {
  const state = stateStore.state;
  const isSafetyOfficerOrManager = user.role === 'Safety Officer' || user.role === 'Fleet Manager' || user.role === 'Admin';
  const today = new Date().toISOString().split('T')[0];

  let html = `
    <div class="drivers-view">
      
      <!-- Create Driver Panel (Only for Safety Officer/Managers) -->
      ${isSafetyOfficerOrManager ? `
        <div class="chart-card" id="add-driver-panel" style="display: none; margin-bottom: 24px; animation: fadeIn 0.3s ease;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px;">
            <h3>Add Driver Profile</h3>
            <button class="btn-icon" id="btn-close-driver-reg" title="Collapse Form">
              <i data-lucide="chevron-up"></i>
            </button>
          </div>
          <form id="driver-reg-form">
            <div class="grid-2">
              <div class="form-group">
                <label for="drv-name">Driver Full Name</label>
                <input type="text" id="drv-name" class="form-control form-control-noicon" required placeholder="John Doe">
              </div>
              <div class="form-group">
                <label for="drv-contact">Contact Number</label>
                <input type="text" id="drv-contact" class="form-control form-control-noicon" required placeholder="e.g. 555-0199">
              </div>
            </div>
            
            <div class="grid-3">
              <div class="form-group">
                <label for="drv-lic-num">License Number</label>
                <input type="text" id="drv-lic-num" class="form-control form-control-noicon" required placeholder="DL-XXXXX">
              </div>
              <div class="form-group">
                <label for="drv-lic-cat">License Class / Category</label>
                <select id="drv-lic-cat" class="select-control" style="width: 100%; height: 42px;" required>
                  <option value="CDL Class A">CDL Class A (Commercial Heavy Semi)</option>
                  <option value="CDL Class B">CDL Class B (Commercial Single Heavy)</option>
                  <option value="Regular Class C">Regular Class C (Standard Passenger)</option>
                </select>
              </div>
              <div class="form-group">
                <label for="drv-lic-exp">License Expiry Date</label>
                <input type="date" id="drv-lic-exp" class="form-control form-control-noicon" required>
              </div>
            </div>

            <div class="grid-2">
              <div class="form-group">
                <label for="drv-safety">Initial Safety Compliance Score (0-100)</label>
                <input type="number" id="drv-safety" class="form-control form-control-noicon" required placeholder="100" min="0" max="100" value="100">
              </div>
              <div class="form-group" style="display:flex; align-items:center; margin-top:20px;">
                <span style="font-size:0.8rem; color:var(--text-secondary);">Registered operators default to Available status once saved.</span>
              </div>
            </div>

            <div style="display:flex; justify-content: flex-end; gap: 12px; margin-top: 24px;">
              <button type="reset" class="btn btn-secondary" style="width: auto;">Reset</button>
              <button type="submit" class="btn btn-primary" style="width: auto;">Register Operator</button>
            </div>
          </form>
        </div>
      ` : ''}

      <!-- Filters -->
      <div class="directory-actions-bar">
        <div class="filters-wrapper">
          <div class="search-input-group">
            <i data-lucide="search"></i>
            <input type="text" id="search-drv" class="form-control search-control" placeholder="Search Operator Name or License...">
          </div>
          <select id="filter-drv-status" class="select-control">
            <option value="">All Statuses</option>
            <option value="Available">Available</option>
            <option value="On Trip">On Trip</option>
            <option value="Off Duty">Off Duty</option>
            <option value="Suspended">Suspended</option>
          </select>
        </div>

        ${isSafetyOfficerOrManager ? `
          <button class="btn btn-primary" id="btn-toggle-driver-reg" style="width: auto;">
            <i data-lucide="plus"></i> Add Driver
          </button>
        ` : ''}
      </div>

      <!-- Drivers List Table -->
      <div class="table-responsive">
        <table>
          <thead>
            <tr>
              <th>Operator Name</th>
              <th>License Number</th>
              <th>License Category</th>
              <th>License Expiry</th>
              <th>Safety Score</th>
              <th>Status</th>
              <th style="text-align: right;">Manage</th>
            </tr>
          </thead>
          <tbody id="drivers-table-body">
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

  // Toggle Panel Bindings
  if (isSafetyOfficerOrManager) {
    const regPanel = document.getElementById('add-driver-panel');
    const toggleBtn = document.getElementById('btn-toggle-driver-reg');
    const closeBtn = document.getElementById('btn-close-driver-reg');

    const toggleReg = () => {
      const isHidden = regPanel.style.display === 'none';
      regPanel.style.display = isHidden ? 'block' : 'none';
      toggleBtn.innerHTML = isHidden 
        ? '<i data-lucide="chevron-up"></i> Hide Panel' 
        : '<i data-lucide="plus"></i> Add Driver';
      if (window.lucide) window.lucide.createIcons();
    };

    toggleBtn.addEventListener('click', toggleReg);
    closeBtn.addEventListener('click', toggleReg);

    // Form Submit
    document.getElementById('driver-reg-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const driverData = {
        name: document.getElementById('drv-name').value,
        contactNumber: document.getElementById('drv-contact').value,
        licenseNumber: document.getElementById('drv-lic-num').value,
        licenseCategory: document.getElementById('drv-lic-cat').value,
        licenseExpiryDate: document.getElementById('drv-lic-exp').value,
        safetyScore: document.getElementById('drv-safety').value
      };

      try {
        stateStore.createDriver(driverData);
        showToast(`Driver ${driverData.name} profile registered successfully.`, 'success');
        document.getElementById('driver-reg-form').reset();
        regPanel.style.display = 'none';
        toggleBtn.innerHTML = '<i data-lucide="plus"></i> Add Driver';
        if (window.lucide) window.lucide.createIcons();
        applyFilters();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  // Filtering
  const searchInput = document.getElementById('search-drv');
  const statusFilter = document.getElementById('filter-drv-status');

  const applyFilters = () => {
    const q = searchInput.value.toLowerCase().trim();
    const stat = statusFilter.value;

    const filtered = state.drivers.filter(d => {
      const matchSearch = d.name.toLowerCase().includes(q) || d.licenseNumber.toLowerCase().includes(q);
      const matchStatus = stat === '' || d.status === stat;
      return matchSearch && matchStatus;
    });

    renderTableRows(filtered, container, user);
  };

  searchInput.addEventListener('input', applyFilters);
  statusFilter.addEventListener('change', applyFilters);

  // Initial draw
  applyFilters();
}

function renderTableRows(driversList, mainContainer, user) {
  const tbody = document.getElementById('drivers-table-body');
  if (!tbody) return;

  if (driversList.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; padding:32px; color:var(--text-secondary);">
          No operators found matching the criteria.
        </td>
      </tr>
    `;
    return;
  }

  const isSafetyOfficerOrManager = user.role === 'Safety Officer' || user.role === 'Fleet Manager' || user.role === 'Admin';
  const today = new Date().toISOString().split('T')[0];

  tbody.innerHTML = driversList.map(d => {
    const isExpired = d.licenseExpiryDate < today;
    const scoreColor = d.safetyScore >= 90 ? '#10b981' : d.safetyScore >= 70 ? '#f59e0b' : '#ef4444';
    let statusClass = d.status.toLowerCase().replace(' ', '-');
    if (statusClass === 'suspended') statusClass = 'suspended';
    
    return `
      <tr>
        <td><strong>${d.name}</strong></td>
        <td><code>${d.licenseNumber}</code></td>
        <td>${d.licenseCategory}</td>
        <td><span style="color:${isExpired ? '#ef4444' : 'var(--text-secondary)'}; font-weight:${isExpired ? '700' : 'normal'};">
          ${d.licenseExpiryDate} ${isExpired ? '(EXPIRED)' : ''}
        </span></td>
        <td><span style="color:${scoreColor}; font-weight:700;">${d.safetyScore}/100</span></td>
        <td><span class="badge badge-status-${statusClass}">${d.status}</span></td>
        <td style="text-align: right; white-space: nowrap;">
          <button class="btn btn-secondary btn-sm details-drv-btn" data-id="${d.id}" style="padding:4px 8px; width:auto; margin-right:4px;">History</button>
          ${isSafetyOfficerOrManager && d.status !== 'Suspended' ? `
            <button class="btn btn-secondary btn-sm edit-drv-btn" data-id="${d.id}" style="padding:4px 8px; width:auto; margin-right:4px;">Edit</button>
            <button class="btn btn-danger btn-sm suspend-drv-btn" data-id="${d.id}" style="padding:4px 8px; width:auto;">Suspend</button>
          ` : ''}
        </td>
      </tr>
    `;
  }).join('');

  // Actions click bindings
  tbody.querySelectorAll('.details-drv-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.getAttribute('data-id');
      triggerDriverHistoryModal(id);
    });
  });

  if (isSafetyOfficerOrManager) {
    tbody.querySelectorAll('.edit-drv-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        triggerEditDriverModal(id, mainContainer, user);
      });
    });

    tbody.querySelectorAll('.suspend-drv-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        if (confirm('Are you sure you want to suspend this driver? Suspended drivers cannot be assigned to trips.')) {
          try {
            stateStore.deleteDriver(id);
            showToast('Driver status suspended.', 'info');
            renderDrivers(mainContainer, user); // re-render
          } catch (err) {
            showToast(err.message, 'error');
          }
        }
      });
    });
  }
}

function triggerDriverHistoryModal(driverId) {
  const overlay = document.getElementById('modal-overlay');
  const body = document.getElementById('modal-body');
  const title = document.getElementById('modal-title');
  const state = stateStore.state;
  const drv = state.drivers.find(d => d.id === driverId);

  title.textContent = `Operator Profile & History: ${drv.name}`;

  const operatorTrips = state.trips.filter(t => t.driverId === driverId);

  body.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:20px;">
      <div style="background-color: var(--bg-secondary); border: 1px solid var(--border-color); padding: 18px; border-radius: var(--radius-md);">
        <h4 style="margin-bottom:12px; color:var(--accent-primary);">${drv.name}</h4>
        <div class="grid-2">
          <div>
            <p style="margin-bottom:8px;"><strong>License Number:</strong> <span class="text-secondary">${drv.licenseNumber}</span></p>
            <p style="margin-bottom:8px;"><strong>License Category:</strong> <span class="text-secondary">${drv.licenseCategory}</span></p>
            <p style="margin-bottom:8px;"><strong>License Expiry:</strong> <span class="text-secondary">${drv.licenseExpiryDate}</span></p>
          </div>
          <div>
            <p style="margin-bottom:8px;"><strong>Contact Number:</strong> <span class="text-secondary">${drv.contactNumber}</span></p>
            <p style="margin-bottom:8px;"><strong>Safety score:</strong> <span class="text-secondary" style="font-weight:700; color:${drv.safetyScore >= 90 ? '#10b981' : drv.safetyScore >= 70 ? '#f59e0b' : '#ef4444'}">${drv.safetyScore}/100</span></p>
            <p style="margin-bottom:8px;"><strong>Status:</strong> <span class="badge badge-status-${drv.status.toLowerCase()}">${drv.status}</span></p>
          </div>
        </div>
      </div>

      <!-- History list -->
      <div>
        <h4 style="margin-bottom:10px;">Trips Operated (${operatorTrips.length})</h4>
        <div style="display:flex; flex-direction:column; gap:8px; max-height:160px; overflow-y:auto;">
          ${operatorTrips.map(t => {
            const vhc = state.vehicles.find(v => v.id === t.vehicleId);
            return `
              <div style="border:1px solid var(--border-color); padding:10px; border-radius:var(--radius-sm); background:var(--bg-secondary); font-size:0.85rem; display:flex; justify-content:space-between; align-items:center;">
                <span><strong>${t.source} → ${t.destination}</strong> (${vhc?.registrationNumber})</span>
                <span class="badge badge-status-${t.status.toLowerCase()}">${t.status}</span>
              </div>
            `;
          }).join('')}
          ${operatorTrips.length === 0 ? `<p style="font-size:0.8rem; color:var(--text-muted);">No trips completed yet.</p>` : ''}
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

function triggerEditDriverModal(driverId, mainContainer, user) {
  const overlay = document.getElementById('modal-overlay');
  const body = document.getElementById('modal-body');
  const title = document.getElementById('modal-title');
  const drv = stateStore.state.drivers.find(d => d.id === driverId);

  title.textContent = `Edit Operator profile`;
  body.innerHTML = `
    <form id="edit-drv-form">
      <div class="grid-2">
        <div class="form-group">
          <label for="edit-d-name">Driver Full Name</label>
          <input type="text" id="edit-d-name" class="form-control form-control-noicon" required value="${drv.name}">
        </div>
        <div class="form-group">
          <label for="edit-d-contact">Contact Number</label>
          <input type="text" id="edit-d-contact" class="form-control form-control-noicon" required value="${drv.contactNumber}">
        </div>
      </div>
      <div class="grid-3">
        <div class="form-group">
          <label for="edit-d-lic-num">License Number</label>
          <input type="text" id="edit-d-lic-num" class="form-control form-control-noicon" required value="${drv.licenseNumber}">
        </div>
        <div class="form-group">
          <label for="edit-d-lic-cat">License Class</label>
          <select id="edit-d-lic-cat" class="select-control" style="width: 100%; height: 42px;">
            <option value="CDL Class A" ${drv.licenseCategory === 'CDL Class A' ? 'selected' : ''}>CDL Class A</option>
            <option value="CDL Class B" ${drv.licenseCategory === 'CDL Class B' ? 'selected' : ''}>CDL Class B</option>
            <option value="Regular Class C" ${drv.licenseCategory === 'Regular Class C' ? 'selected' : ''}>Regular Class C</option>
          </select>
        </div>
        <div class="form-group">
          <label for="edit-d-lic-exp">License Expiry Date</label>
          <input type="date" id="edit-d-lic-exp" class="form-control form-control-noicon" required value="${drv.licenseExpiryDate}">
        </div>
      </div>
      <div class="grid-2">
        <div class="form-group">
          <label for="edit-d-safety">Safety Score (0-100)</label>
          <input type="number" id="edit-d-safety" class="form-control form-control-noicon" required value="${drv.safetyScore}" min="0" max="100">
        </div>
        <div class="form-group">
          <label for="edit-d-status">Driver Status</label>
          <select id="edit-d-status" class="select-control" style="width:100%; height:42px;">
            <option value="Available" ${drv.status === 'Available' ? 'selected' : ''}>Available</option>
            <option value="On Trip" ${drv.status === 'On Trip' ? 'selected' : ''}>On Trip</option>
            <option value="Off Duty" ${drv.status === 'Off Duty' ? 'selected' : ''}>Off Duty</option>
            <option value="Suspended" ${drv.status === 'Suspended' ? 'selected' : ''}>Suspended</option>
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

  document.getElementById('edit-drv-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const updatedData = {
      name: document.getElementById('edit-d-name').value,
      contactNumber: document.getElementById('edit-d-contact').value,
      licenseNumber: document.getElementById('edit-d-lic-num').value,
      licenseCategory: document.getElementById('edit-d-lic-cat').value,
      licenseExpiryDate: document.getElementById('edit-d-lic-exp').value,
      safetyScore: Number(document.getElementById('edit-d-safety').value),
      status: document.getElementById('edit-d-status').value
    };

    try {
      stateStore.updateDriver(driverId, updatedData);
      overlay.classList.remove('active');
      showToast(`Driver ${updatedData.name} profile updated successfully.`, 'success');
      renderDrivers(mainContainer, user);
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}
