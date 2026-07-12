import { stateStore } from '../state.js';
import { showToast } from './login.js';

export function renderExpenses(container, user) {
  const state = stateStore.state;
  const activeVehicles = state.vehicles.filter(v => v.status !== 'Retired');

  let html = `
    <div class="expenses-view">
      
      <div class="grid-3" style="grid-template-columns: 340px 1fr; gap:24px;">
        
        <!-- Record Expense/Fuel Forms -->
        <div>
          <!-- Tab selector for forms -->
          <div class="chart-card">
            <h3 style="margin-bottom:12px;">Log Fleet Expense</h3>
            
            <div style="display:flex; border-bottom:1px solid var(--border-color); gap:8px; margin-bottom:16px;">
              <button class="btn-text form-toggle-btn active" id="form-toggle-fuel" style="font-weight:600; padding:8px 12px; font-size:0.85rem;">Fuel Refill</button>
              <button class="btn-text form-toggle-btn" id="form-toggle-general" style="font-weight:600; padding:8px 12px; font-size:0.85rem;">Other Expenses</button>
            </div>

            <!-- Form A: Fuel Fills -->
            <form id="exp-fuel-form">
              <div class="form-group">
                <label for="f-vhc">Select Vehicle</label>
                <select id="f-vhc" class="select-control" style="width:100%; height:42px;" required>
                  <option value="">-- Select Vehicle --</option>
                  ${activeVehicles.map(v => `<option value="${v.id}">${v.registrationNumber} - ${v.name}</option>`).join('')}
                </select>
              </div>

              <div class="form-group">
                <label for="f-liters">Refill Volume (Liters)</label>
                <input type="number" id="f-liters" class="form-control form-control-noicon" required placeholder="80" min="1">
              </div>

              <div class="form-group">
                <label for="f-cost">Refill Cost ($)</label>
                <input type="number" id="f-cost" class="form-control form-control-noicon" required placeholder="120" min="1">
              </div>

              <div class="form-group">
                <label for="f-odom">Odometer Value (km)</label>
                <input type="number" id="f-odom" class="form-control form-control-noicon" required placeholder="e.g. 45800" min="0">
              </div>

              <button type="submit" class="btn btn-primary">Save Fuel Fill Log</button>
            </form>

            <!-- Form B: Tolls / Other -->
            <form id="exp-general-form" style="display:none;">
              <div class="form-group">
                <label for="g-vhc">Select Vehicle</label>
                <select id="g-vhc" class="select-control" style="width:100%; height:42px;" required>
                  <option value="">-- Select Vehicle --</option>
                  ${activeVehicles.map(v => `<option value="${v.id}">${v.registrationNumber} - ${v.name}</option>`).join('')}
                </select>
              </div>

              <div class="form-group">
                <label for="g-type">Expense Type</label>
                <select id="g-type" class="select-control" style="width:100%; height:42px;" required>
                  <option value="Toll">Road / Bridge Tolls</option>
                  <option value="Maintenance">Servicing Fees</option>
                  <option value="Other">Other Expenses</option>
                </select>
              </div>

              <div class="form-group">
                <label for="g-cost">Amount ($)</label>
                <input type="number" id="g-cost" class="form-control form-control-noicon" required placeholder="e.g. 45" min="1">
              </div>

              <button type="submit" class="btn btn-primary">Save Expense Log</button>
            </form>
          </div>
        </div>

        <!-- Expense Ledger and Fleet Totals -->
        <div>
          
          <!-- Summary card: Fleet Cumulative Cost -->
          <div class="chart-card" style="margin-bottom:24px;">
            <h3>Fleet Cumulative Operations Cost</h3>
            <p style="font-size:0.8rem; color:var(--text-secondary); margin-bottom:12px;">
              Displays cumulative expenses (Fuel + Workshop Services + Tolls) sorted per vehicle.
            </p>
            <div class="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Registration</th>
                    <th>Model Name</th>
                    <th>Fuel Cost</th>
                    <th>Maintenance Cost</th>
                    <th>Other Cost</th>
                    <th>Total Cost</th>
                  </tr>
                </thead>
                <tbody>
                  ${state.vehicles.filter(v => v.status !== 'Retired').map(v => {
                    const fuel = state.fuelLogs.filter(f => f.vehicleId === v.id).reduce((sum, f) => sum + f.cost, 0);
                    const maint = state.maintenanceLogs.filter(l => l.vehicleId === v.id).reduce((sum, l) => sum + l.cost, 0);
                    const other = state.expenses.filter(e => e.vehicleId === v.id && e.type !== 'Fuel' && e.type !== 'Maintenance').reduce((sum, e) => sum + e.cost, 0);
                    const total = fuel + maint + other;

                    return `
                      <tr>
                        <td><code><strong>${v.registrationNumber}</strong></code></td>
                        <td>${v.name}</td>
                        <td>$${fuel.toLocaleString()}</td>
                        <td>$${maint.toLocaleString()}</td>
                        <td>$${other.toLocaleString()}</td>
                        <td><span style="font-weight:700; color:#ef4444;">$${total.toLocaleString()}</span></td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Chronological Expense Ledger -->
          <div class="chart-card">
            <h3>Chronological Expense Ledger</h3>
            <div class="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Opr ID</th>
                    <th>Reg Number</th>
                    <th>Cost Category</th>
                    <th>Amount</th>
                    <th>Details</th>
                    <th>Date Logged</th>
                  </tr>
                </thead>
                <tbody>
                  ${state.expenses.map(e => {
                    const vhc = state.vehicles.find(v => v.id === e.vehicleId);
                    let labelClass = 'disposed';
                    if (e.type === 'Fuel') labelClass = 'reserved';
                    if (e.type === 'Maintenance') labelClass = 'maint';
                    if (e.type === 'Toll') labelClass = 'allocated';

                    return `
                      <tr>
                        <td><code><strong>#EXP-${e.id.split('-')[1] || '00'}</strong></code></td>
                        <td><code>${vhc?.registrationNumber || 'N/A'}</code></td>
                        <td><span class="badge badge-status-${labelClass}">${e.type}</span></td>
                        <td><span style="font-weight:600; color:#ef4444;">$${e.cost.toLocaleString()}</span></td>
                        <td><span class="text-secondary">${vhc?.name || 'N/A'} - ${e.type} Cost</span></td>
                        <td>${e.date}</td>
                      </tr>
                    `;
                  }).join('')}
                  ${state.expenses.length === 0 ? `
                    <tr>
                      <td colspan="6" style="text-align:center; padding:32px; color:var(--text-secondary);">No expenses recorded.</td>
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

  // --- Toggle forms bindings ---
  const toggleFuel = document.getElementById('form-toggle-fuel');
  const toggleGen = document.getElementById('form-toggle-general');
  const fuelForm = document.getElementById('exp-fuel-form');
  const genForm = document.getElementById('exp-general-form');

  toggleFuel.addEventListener('click', () => {
    toggleFuel.classList.add('active');
    toggleGen.classList.remove('active');
    fuelForm.style.display = 'block';
    genForm.style.display = 'none';
  });

  toggleGen.addEventListener('click', () => {
    toggleFuel.classList.remove('active');
    toggleGen.classList.add('active');
    fuelForm.style.display = 'none';
    genForm.style.display = 'block';
  });

  // Automatically fetch vehicle current odometer for convenience on selection
  const fVhcSelect = document.getElementById('f-vhc');
  const fOdomInp = document.getElementById('f-odom');

  fVhcSelect.addEventListener('change', () => {
    const vhcId = fVhcSelect.value;
    if (vhcId) {
      const vhc = state.vehicles.find(v => v.id === vhcId);
      if (vhc) {
        fOdomInp.value = vhc.currentOdometer;
        fOdomInp.setAttribute('min', vhc.currentOdometer);
      }
    }
  });

  // --- Fuel log submission ---
  fuelForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const vehicleId = fVhcSelect.value;
    const liters = document.getElementById('f-liters').value;
    const cost = document.getElementById('f-cost').value;
    const odom = fOdomInp.value;

    try {
      stateStore.addFuelLog(vehicleId, liters, cost, odom);
      showToast('Fuel fill-up logged successfully.', 'success');
      renderExpenses(container, user); // re-render
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // --- General Expense submission ---
  genForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const vehicleId = document.getElementById('g-vhc').value;
    const type = document.getElementById('g-type').value;
    const cost = document.getElementById('g-cost').value;

    try {
      stateStore.addGeneralExpense(vehicleId, type, cost);
      showToast('Expense log saved successfully.', 'success');
      renderExpenses(container, user); // re-render
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}
