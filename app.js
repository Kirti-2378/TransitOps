/* =====================================================================
   TransitOps - Frontend Application Logic
   Talks to api.php (JSON) for everything. No page reloads.
   ===================================================================== */

const API = 'api.php';
let CURRENT_USER = null;

/* ------------------------------------------------------------------ */
/* Generic helpers                                                     */
/* ------------------------------------------------------------------ */
function toast(msg, type = '') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast show ' + type;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('show'), 3200);
}

async function api(action, { method = 'GET', body = null, qs = {} } = {}) {
  const params = new URLSearchParams({ action, ...qs });
  const opts = { method, credentials: 'same-origin', headers: {} };
  if (body) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  let res, json;
  try {
    res = await fetch(`${API}?${params.toString()}`, opts);
    json = await res.json();
  } catch (e) {
    toast('Network / server error. Is PHP + MySQL running?', 'error');
    throw e;
  }
  if (!json.ok) {
    toast(json.error || 'Something went wrong.', 'error');
    throw new Error(json.error || 'API error');
  }
  return json.data;
}

function fmtMoney(n) { return '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 }); }
function fmtDate(d) { if (!d) return '-'; return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
function badge(status) { return `<span class="badge badge-${String(status).replace(/\s+/g, '')}">${status}</span>`; }
function el(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }

/* ------------------------------------------------------------------ */
/* Navigation config (per role)                                        */
/* ------------------------------------------------------------------ */
const NAV = [
  { id: 'dashboard',   label: '📊 Dashboard',      roles: ['fleet_manager', 'driver', 'safety_officer', 'financial_analyst', 'customer'] },
  { id: 'vehicles',    label: '🚚 Vehicles',        roles: ['fleet_manager', 'driver', 'safety_officer', 'financial_analyst'] },
  { id: 'drivers',     label: '🧑\u200d✈️ Drivers', roles: ['fleet_manager', 'safety_officer', 'driver'] },
  { id: 'trips',       label: '🗺️ Trips',           roles: ['fleet_manager', 'driver', 'safety_officer'] },
  { id: 'bookings',    label: '📦 My Bookings',     roles: ['customer'] },
  { id: 'maintenance', label: '🔧 Maintenance',     roles: ['fleet_manager', 'safety_officer'] },
  { id: 'fuel',        label: '⛽ Fuel & Expenses', roles: ['fleet_manager', 'financial_analyst'] },
  { id: 'reports',     label: '📈 Reports',         roles: ['fleet_manager', 'financial_analyst', 'safety_officer'] },
  { id: 'users',       label: '👥 Users',           roles: ['fleet_manager'] },
];
const TITLES = {
  dashboard: 'Dashboard', vehicles: 'Vehicle Registry', drivers: 'Driver Management',
  trips: 'Trip Management', bookings: 'My Bookings', maintenance: 'Maintenance',
  fuel: 'Fuel & Expense Management', reports: 'Reports & Analytics', users: 'User Management'
};

function buildNav() {
  const nav = document.getElementById('sideNav');
  nav.innerHTML = '';
  NAV.filter(n => n.roles.includes(CURRENT_USER.role)).forEach(n => {
    const item = el(`<div class="nav-item" data-view="${n.id}">${n.label}</div>`);
    item.addEventListener('click', () => showView(n.id));
    nav.appendChild(item);
  });
}

function showView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.view === id));
  document.getElementById('view-' + id).classList.remove('hidden');
  document.getElementById('pageTitle').textContent = TITLES[id] || id;
  document.getElementById('sidebarEl')?.classList.remove('open');
  LOADERS[id] && LOADERS[id]();
}

/* ------------------------------------------------------------------ */
/* Auth flow                                                           */
/* ------------------------------------------------------------------ */
document.getElementById('showRegister').onclick = (e) => { e.preventDefault(); toggleAuthForm('register'); };
document.getElementById('showLogin').onclick = (e) => { e.preventDefault(); toggleAuthForm('login'); };
function toggleAuthForm(which) {
  document.getElementById('loginForm').classList.toggle('hidden', which !== 'login');
  document.getElementById('registerForm').classList.toggle('hidden', which !== 'register');
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  try {
    const user = await api('login', { method: 'POST', body: { email, password } });
    initApp(user);
    toast('Welcome back, ' + user.name + '!', 'success');
  } catch (e) { /* toast already shown */ }
});

document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = {
    name: document.getElementById('regName').value.trim(),
    email: document.getElementById('regEmail').value.trim(),
    contact: document.getElementById('regContact').value.trim(),
    role: document.getElementById('regRole').value,
    password: document.getElementById('regPassword').value,
  };
  try {
    await api('register', { method: 'POST', body });
    toast('Account created! Please sign in.', 'success');
    toggleAuthForm('login');
    document.getElementById('registerForm').reset();
  } catch (e) {}
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  try { await api('logout', { method: 'POST' }); } catch (e) {}
  CURRENT_USER = null;
  document.getElementById('appShell').classList.add('hidden');
  document.getElementById('authScreen').classList.remove('hidden');
  toggleAuthForm('login');
});

document.getElementById('menuToggle').addEventListener('click', () => {
  document.querySelector('.sidebar').classList.toggle('open');
});

function initApp(user) {
  CURRENT_USER = user;
  document.getElementById('authScreen').classList.add('hidden');
  document.getElementById('appShell').classList.remove('hidden');
  document.getElementById('userName').textContent = user.name;
  document.getElementById('userRole').textContent = user.role.replace('_', ' ');
  document.getElementById('userAvatar').textContent = user.name.charAt(0).toUpperCase();
  buildNav();
  const firstView = NAV.find(n => n.roles.includes(user.role)).id;
  showView(firstView);
}

(async function boot() {
  try {
    const user = await api('session');
    if (user) initApp(user);
  } catch (e) {}
})();

/* ------------------------------------------------------------------ */
/* Modal helper                                                        */
/* ------------------------------------------------------------------ */
const modalOverlay = document.getElementById('modalOverlay');
const modalBody = document.getElementById('modalBody');
document.getElementById('modalClose').onclick = closeModal;
modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });
function openModal(title, bodyHtml) {
  document.getElementById('modalTitle').textContent = title;
  modalBody.innerHTML = bodyHtml;
  modalOverlay.classList.remove('hidden');
}
function closeModal() { modalOverlay.classList.add('hidden'); modalBody.innerHTML = ''; }

/* ====================================================================
   DASHBOARD
   ==================================================================== */
async function loadDashboard() {
  const d = await api('dashboard');
  const kpis = [
    ['Active Vehicles', d.active_vehicles], ['Available Vehicles', d.available_vehicles],
    ['Vehicles In Maintenance', d.vehicles_in_maintenance], ['Active Trips', d.active_trips],
    ['Pending Trips', d.pending_trips], ['Drivers On Duty', d.drivers_on_duty],
    ['Fleet Utilization', d.fleet_utilization + '%'],
  ];
  document.getElementById('kpiGrid').innerHTML = kpis.map(([label, val]) =>
    `<div class="kpi-card"><div class="kpi-label">${label}</div><div class="kpi-value">${val}</div></div>`).join('');

  const rt = document.querySelector('#recentTripsTable tbody');
  rt.innerHTML = d.recent_trips.length ? d.recent_trips.map(t => `<tr>
      <td>#${t.id}</td><td>${t.source} → ${t.destination}</td>
      <td>${t.reg_number || '-'}</td><td>${t.driver_name || '-'}</td><td>${badge(t.status)}</td>
    </tr>`).join('') : `<tr><td colspan="5" style="text-align:center;color:#999;">No trips yet</td></tr>`;

  const ex = document.querySelector('#expiringTable tbody');
  ex.innerHTML = d.expiring_licenses.length ? d.expiring_licenses.map(dr => `<tr>
      <td>${dr.name}</td><td>${dr.license_number}</td><td>${fmtDate(dr.license_expiry)}</td>
    </tr>`).join('') : `<tr><td colspan="3" style="text-align:center;color:#999;">Nothing expiring soon</td></tr>`;
}

/* ====================================================================
   VEHICLES
   ==================================================================== */
const CAN_MANAGE_FLEET = () => CURRENT_USER.role === 'fleet_manager';

async function loadVehicles() {
  const type = document.getElementById('vFilterType').value;
  const status = document.getElementById('vFilterStatus').value;
  const region = document.getElementById('vFilterRegion').value;
  const list = await api('vehicles_list', { qs: { type, status, region } });

  // populate type filter options once
  const typeSel = document.getElementById('vFilterType');
  if (typeSel.options.length <= 1) {
    const types = [...new Set(list.map(v => v.type))];
    types.forEach(t => typeSel.appendChild(el(`<option value="${t}">${t}</option>`)));
  }

  const canManage = CAN_MANAGE_FLEET();
  document.getElementById('addVehicleBtn').classList.toggle('hidden', !canManage);

  document.querySelector('#vehiclesTable tbody').innerHTML = list.length ? list.map(v => `<tr>
      <td>${v.reg_number}</td><td>${v.name}</td><td>${v.type}</td>
      <td>${v.max_load_capacity} kg</td><td>${v.odometer} km</td><td>${fmtMoney(v.acquisition_cost)}</td>
      <td>${v.region || '-'}</td><td>${badge(v.status)}</td>
      <td class="row-actions">
        ${canManage ? `<button class="btn btn-sm btn-light" onclick="editVehicle(${v.id})">Edit</button>
        <button class="btn btn-sm btn-danger" onclick="deleteVehicle(${v.id})">Delete</button>` : '-'}
      </td>
    </tr>`).join('') : `<tr><td colspan="9" style="text-align:center;color:#999;">No vehicles found</td></tr>`;

  window._vehicles = list;
}
document.getElementById('vFilterApply').addEventListener('click', loadVehicles);
document.getElementById('addVehicleBtn').addEventListener('click', () => openVehicleForm());

function vehicleFormHtml(v) {
  return `
    <div class="form-row">
      <div><label>Registration Number</label><input id="fRegNumber" value="${v?.reg_number ?? ''}" placeholder="VAN-05"></div>
      <div><label>Type</label><input id="fType" value="${v?.type ?? ''}" placeholder="Van / Truck / Pickup"></div>
    </div>
    <label>Vehicle Name / Model</label>
    <input id="fName" value="${v?.name ?? ''}" placeholder="Tata Ace Van">
    <div class="form-row">
      <div><label>Max Load Capacity (kg)</label><input id="fMaxLoad" type="number" value="${v?.max_load_capacity ?? ''}"></div>
      <div><label>Odometer (km)</label><input id="fOdometer" type="number" value="${v?.odometer ?? 0}"></div>
    </div>
    <div class="form-row">
      <div><label>Acquisition Cost</label><input id="fCost" type="number" value="${v?.acquisition_cost ?? ''}"></div>
      <div><label>Region</label><input id="fRegion" value="${v?.region ?? ''}"></div>
    </div>
    <label>Status</label>
    <select id="fStatus">
      ${['Available', 'On Trip', 'In Shop', 'Retired'].map(s => `<option ${v?.status === s ? 'selected' : ''}>${s}</option>`).join('')}
    </select>
    <div class="form-error" id="fError"></div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" id="fSave">Save Vehicle</button>
    </div>`;
}
function openVehicleForm(v) {
  openModal(v ? 'Edit Vehicle' : 'Add Vehicle', vehicleFormHtml(v));
  document.getElementById('fSave').onclick = async () => {
    const body = {
      id: v?.id, reg_number: document.getElementById('fRegNumber').value.trim(),
      name: document.getElementById('fName').value.trim(), type: document.getElementById('fType').value.trim(),
      max_load_capacity: document.getElementById('fMaxLoad').value, odometer: document.getElementById('fOdometer').value,
      acquisition_cost: document.getElementById('fCost').value, region: document.getElementById('fRegion').value.trim(),
      status: document.getElementById('fStatus').value,
    };
    try { await api('vehicle_save', { method: 'POST', body }); closeModal(); toast('Vehicle saved.', 'success'); loadVehicles(); }
    catch (e) { document.getElementById('fError').textContent = e.message; document.getElementById('fError').style.display = 'block'; }
  };
}
function editVehicle(id) { openVehicleForm(window._vehicles.find(v => v.id === id)); }
async function deleteVehicle(id) {
  if (!confirm('Delete this vehicle? This cannot be undone.')) return;
  try { await api('vehicle_delete', { method: 'POST', qs: { id } }); toast('Vehicle deleted.', 'success'); loadVehicles(); } catch (e) {}
}

/* ====================================================================
   DRIVERS
   ==================================================================== */
const CAN_MANAGE_DRIVERS = () => ['fleet_manager', 'safety_officer'].includes(CURRENT_USER.role);

async function loadDrivers() {
  const list = await api('drivers_list');
  const canManage = CAN_MANAGE_DRIVERS();
  document.getElementById('addDriverBtn').classList.toggle('hidden', !canManage);
  document.querySelector('#driversTable tbody').innerHTML = list.length ? list.map(d => {
    const expired = new Date(d.license_expiry) < new Date();
    return `<tr>
      <td>${d.name}</td><td>${d.license_number}</td><td>${d.license_category}</td>
      <td>${fmtDate(d.license_expiry)} ${expired ? '<span class="badge badge-Suspended">Expired</span>' : ''}</td>
      <td>${d.contact_number}</td><td>${d.safety_score}</td><td>${badge(d.status)}</td>
      <td class="row-actions">
        ${canManage ? `<button class="btn btn-sm btn-light" onclick="editDriver(${d.id})">Edit</button>
        <button class="btn btn-sm btn-danger" onclick="deleteDriver(${d.id})">Delete</button>` : '-'}
      </td>
    </tr>`;
  }).join('') : `<tr><td colspan="8" style="text-align:center;color:#999;">No drivers found</td></tr>`;
  window._drivers = list;
}
document.getElementById('addDriverBtn').addEventListener('click', () => openDriverForm());

function driverFormHtml(d) {
  return `
    <label>Full Name</label><input id="fName" value="${d?.name ?? ''}">
    <div class="form-row">
      <div><label>License Number</label><input id="fLic" value="${d?.license_number ?? ''}"></div>
      <div><label>License Category</label><input id="fCat" value="${d?.license_category ?? ''}" placeholder="LMV / HMV"></div>
    </div>
    <div class="form-row">
      <div><label>License Expiry</label><input id="fExpiry" type="date" value="${d?.license_expiry ?? ''}"></div>
      <div><label>Contact Number</label><input id="fContact" value="${d?.contact_number ?? ''}"></div>
    </div>
    <div class="form-row">
      <div><label>Safety Score</label><input id="fScore" type="number" step="0.1" value="${d?.safety_score ?? 100}"></div>
      <div><label>Status</label><select id="fStatus">
        ${['Available', 'On Trip', 'Off Duty', 'Suspended'].map(s => `<option ${d?.status === s ? 'selected' : ''}>${s}</option>`).join('')}
      </select></div>
    </div>
    <div class="form-error" id="fError"></div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" id="fSave">Save Driver</button>
    </div>`;
}
function openDriverForm(d) {
  openModal(d ? 'Edit Driver' : 'Add Driver', driverFormHtml(d));
  document.getElementById('fSave').onclick = async () => {
    const body = {
      id: d?.id, name: document.getElementById('fName').value.trim(), license_number: document.getElementById('fLic').value.trim(),
      license_category: document.getElementById('fCat').value.trim(), license_expiry: document.getElementById('fExpiry').value,
      contact_number: document.getElementById('fContact').value.trim(), safety_score: document.getElementById('fScore').value,
      status: document.getElementById('fStatus').value,
    };
    try { await api('driver_save', { method: 'POST', body }); closeModal(); toast('Driver saved.', 'success'); loadDrivers(); }
    catch (e) { document.getElementById('fError').textContent = e.message; document.getElementById('fError').style.display = 'block'; }
  };
}
function editDriver(id) { openDriverForm(window._drivers.find(d => d.id === id)); }
async function deleteDriver(id) {
  if (!confirm('Delete this driver?')) return;
  try { await api('driver_delete', { method: 'POST', qs: { id } }); toast('Driver deleted.', 'success'); loadDrivers(); } catch (e) {}
}

/* ====================================================================
   TRIPS  (ops roles: fleet_manager, driver, safety_officer)
   ==================================================================== */
async function loadTrips() {
  const status = document.getElementById('tFilterStatus').value;
  const list = await api('trips_list', { qs: { status } });
  document.querySelector('#tripsTable tbody').innerHTML = list.length ? list.map(t => `<tr>
      <td>#${t.id}</td><td>${t.source} → ${t.destination}</td><td>${t.cargo_weight}</td>
      <td>${t.planned_distance} km</td><td>${t.reg_number || '<em>unassigned</em>'}</td><td>${t.driver_name || '<em>unassigned</em>'}</td>
      <td>${badge(t.status)}</td>
      <td class="row-actions">${tripActions(t)}</td>
    </tr>`).join('') : `<tr><td colspan="8" style="text-align:center;color:#999;">No trips found</td></tr>`;
  window._trips = list;
}
document.getElementById('tFilterApply').addEventListener('click', loadTrips);
document.getElementById('addTripBtn').addEventListener('click', () => openTripForm());

function tripActions(t) {
  const btns = [];
  if (t.status === 'Draft') {
    if (!t.vehicle_id || !t.driver_id) btns.push(`<button class="btn btn-sm btn-light" onclick="openAssignForm(${t.id})">Assign</button>`);
    else btns.push(`<button class="btn btn-sm btn-success" onclick="dispatchTrip(${t.id})">Dispatch</button>
                     <button class="btn btn-sm btn-light" onclick="openAssignForm(${t.id})">Reassign</button>`);
    btns.push(`<button class="btn btn-sm btn-danger" onclick="cancelTrip(${t.id})">Cancel</button>`);
  } else if (t.status === 'Dispatched') {
    btns.push(`<button class="btn btn-sm btn-success" onclick="openCompleteForm(${t.id})">Complete</button>`);
    btns.push(`<button class="btn btn-sm btn-danger" onclick="cancelTrip(${t.id})">Cancel</button>`);
  } else {
    btns.push('-');
  }
  return btns.join(' ');
}

async function tripFormOptions() {
  const [vehicles, drivers] = await Promise.all([api('vehicles_available'), api('drivers_available')]);
  return { vehicles, drivers };
}

function openTripForm() {
  tripFormOptions().then(({ vehicles, drivers }) => {
    openModal('New Trip', `
      <div class="form-row">
        <div><label>Source</label><input id="fSource" placeholder="Delhi"></div>
        <div><label>Destination</label><input id="fDest" placeholder="Jaipur"></div>
      </div>
      <div class="form-row">
        <div><label>Cargo Weight (kg)</label><input id="fCargo" type="number"></div>
        <div><label>Planned Distance (km)</label><input id="fDistance" type="number"></div>
      </div>
      <label>Vehicle (optional now, can assign later)</label>
      <select id="fVehicle"><option value="">-- choose later --</option>
        ${vehicles.map(v => `<option value="${v.id}" data-load="${v.max_load_capacity}">${v.reg_number} — ${v.name} (max ${v.max_load_capacity}kg)</option>`).join('')}
      </select>
      <label>Driver (optional now, can assign later)</label>
      <select id="fDriver"><option value="">-- choose later --</option>
        ${drivers.map(d => `<option value="${d.id}">${d.name} — ${d.license_number}</option>`).join('')}
      </select>
      <div class="form-error" id="fError"></div>
      <div class="modal-actions">
        <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" id="fSave">Create Trip</button>
      </div>`);
    document.getElementById('fSave').onclick = async () => {
      const body = {
        source: document.getElementById('fSource').value.trim(), destination: document.getElementById('fDest').value.trim(),
        cargo_weight: document.getElementById('fCargo').value, planned_distance: document.getElementById('fDistance').value,
        vehicle_id: document.getElementById('fVehicle').value, driver_id: document.getElementById('fDriver').value,
      };
      try { await api('trip_create', { method: 'POST', body }); closeModal(); toast('Trip created.', 'success'); loadTrips(); }
      catch (e) { document.getElementById('fError').textContent = e.message; document.getElementById('fError').style.display = 'block'; }
    };
  });
}

function openAssignForm(tripId) {
  tripFormOptions().then(({ vehicles, drivers }) => {
    openModal('Assign Vehicle & Driver', `
      <label>Vehicle</label>
      <select id="fVehicle"><option value="">Select vehicle…</option>
        ${vehicles.map(v => `<option value="${v.id}">${v.reg_number} — ${v.name} (max ${v.max_load_capacity}kg)</option>`).join('')}
      </select>
      <label>Driver</label>
      <select id="fDriver"><option value="">Select driver…</option>
        ${drivers.map(d => `<option value="${d.id}">${d.name} — ${d.license_number}</option>`).join('')}
      </select>
      <div class="form-error" id="fError"></div>
      <div class="modal-actions">
        <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" id="fSave">Assign</button>
      </div>`);
    document.getElementById('fSave').onclick = async () => {
      const body = { id: tripId, vehicle_id: document.getElementById('fVehicle').value, driver_id: document.getElementById('fDriver').value };
      try { await api('trip_assign', { method: 'POST', body }); closeModal(); toast('Assigned.', 'success'); loadTrips(); }
      catch (e) { document.getElementById('fError').textContent = e.message; document.getElementById('fError').style.display = 'block'; }
    };
  });
}

async function dispatchTrip(id) {
  try { await api('trip_dispatch', { method: 'POST', body: { id } }); toast('Trip dispatched.', 'success'); loadTrips(); } catch (e) {}
}
async function cancelTrip(id) {
  if (!confirm('Cancel this trip?')) return;
  try { await api('trip_cancel', { method: 'POST', body: { id } }); toast('Trip cancelled.', 'success'); loadTrips(); loadBookings(); } catch (e) {}
}

function openCompleteForm(tripId) {
  openModal('Complete Trip', `
    <label>Final Odometer Reading (km)</label><input id="fOdo" type="number">
    <div class="form-row">
      <div><label>Fuel Consumed (L)</label><input id="fFuel" type="number"></div>
      <div><label>Fuel Cost (₹, optional)</label><input id="fFuelCost" type="number"></div>
    </div>
    <label>Trip Revenue (₹, optional — used for ROI)</label><input id="fRevenue" type="number">
    <div class="form-error" id="fError"></div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" id="fSave">Complete Trip</button>
    </div>`);
  document.getElementById('fSave').onclick = async () => {
    const body = {
      id: tripId, final_odometer: document.getElementById('fOdo').value, fuel_consumed: document.getElementById('fFuel').value,
      fuel_cost: document.getElementById('fFuelCost').value, revenue: document.getElementById('fRevenue').value,
    };
    try { await api('trip_complete', { method: 'POST', body }); closeModal(); toast('Trip completed.', 'success'); loadTrips(); }
    catch (e) { document.getElementById('fError').textContent = e.message; document.getElementById('fError').style.display = 'block'; }
  };
}

/* ====================================================================
   MY BOOKINGS (customer)
   ==================================================================== */
async function loadBookings() {
  if (!CURRENT_USER || CURRENT_USER.role !== 'customer') return;
  const list = await api('trips_list');
  document.querySelector('#bookingsTable tbody').innerHTML = list.length ? list.map(t => `<tr>
      <td>#${t.id}</td><td>${t.source} → ${t.destination}</td><td>${t.cargo_weight}</td>
      <td>${t.planned_distance} km</td><td>${badge(t.status)}</td>
      <td>${t.status === 'Completed' ? fmtMoney(t.revenue) : '-'}</td>
      <td>${['Draft', 'Dispatched'].includes(t.status) ? `<button class="btn btn-sm btn-danger" onclick="cancelTrip(${t.id})">Cancel</button>` : '-'}</td>
    </tr>`).join('') : `<tr><td colspan="7" style="text-align:center;color:#999;">No bookings yet</td></tr>`;
}
document.getElementById('addBookingBtn').addEventListener('click', () => {
  openModal('New Booking Request', `
    <div class="form-row">
      <div><label>Source</label><input id="fSource" placeholder="Delhi"></div>
      <div><label>Destination</label><input id="fDest" placeholder="Jaipur"></div>
    </div>
    <div class="form-row">
      <div><label>Cargo Weight (kg)</label><input id="fCargo" type="number"></div>
      <div><label>Planned Distance (km)</label><input id="fDistance" type="number"></div>
    </div>
    <p class="form-hint">A fleet manager will assign a vehicle & driver and dispatch your booking.</p>
    <div class="form-error" id="fError"></div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" id="fSave">Submit Booking</button>
    </div>`);
  document.getElementById('fSave').onclick = async () => {
    const body = {
      source: document.getElementById('fSource').value.trim(), destination: document.getElementById('fDest').value.trim(),
      cargo_weight: document.getElementById('fCargo').value, planned_distance: document.getElementById('fDistance').value,
    };
    try { await api('trip_create', { method: 'POST', body }); closeModal(); toast('Booking submitted.', 'success'); loadBookings(); }
    catch (e) { document.getElementById('fError').textContent = e.message; document.getElementById('fError').style.display = 'block'; }
  };
});

/* ====================================================================
   MAINTENANCE
   ==================================================================== */
async function loadMaintenance() {
  const list = await api('maintenance_list');
  const canManage = ['fleet_manager', 'safety_officer'].includes(CURRENT_USER.role);
  document.getElementById('addMaintenanceBtn').classList.toggle('hidden', !canManage);
  document.querySelector('#maintenanceTable tbody').innerHTML = list.length ? list.map(m => `<tr>
      <td>#${m.id}</td><td>${m.reg_number} — ${m.vehicle_name}</td><td>${m.title}</td>
      <td>${fmtMoney(m.cost)}</td><td>${badge(m.status)}</td><td>${fmtDate(m.created_at)}</td>
      <td>${m.status === 'Active' && canManage ? `<button class="btn btn-sm btn-success" onclick="closeMaintenance(${m.id})">Close</button>` : '-'}</td>
    </tr>`).join('') : `<tr><td colspan="7" style="text-align:center;color:#999;">No maintenance records</td></tr>`;
}
document.getElementById('addMaintenanceBtn').addEventListener('click', async () => {
  const vehicles = await api('vehicles_list');
  const eligible = vehicles.filter(v => v.status !== 'On Trip' && v.status !== 'Retired');
  openModal('Log Maintenance', `
    <label>Vehicle</label>
    <select id="fVehicle">${eligible.map(v => `<option value="${v.id}">${v.reg_number} — ${v.name} (${v.status})</option>`).join('')}</select>
    <label>Title</label><input id="fTitle" placeholder="Oil Change">
    <label>Description</label><textarea id="fDesc"></textarea>
    <label>Cost (₹)</label><input id="fCost" type="number">
    <div class="form-error" id="fError"></div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" id="fSave">Log Maintenance</button>
    </div>`);
  document.getElementById('fSave').onclick = async () => {
    const body = {
      vehicle_id: document.getElementById('fVehicle').value, title: document.getElementById('fTitle').value.trim(),
      description: document.getElementById('fDesc').value.trim(), cost: document.getElementById('fCost').value,
    };
    try { await api('maintenance_create', { method: 'POST', body }); closeModal(); toast('Maintenance logged.', 'success'); loadMaintenance(); loadVehicles(); }
    catch (e) { document.getElementById('fError').textContent = e.message; document.getElementById('fError').style.display = 'block'; }
  };
});
async function closeMaintenance(id) {
  try { await api('maintenance_close', { method: 'POST', body: { id } }); toast('Maintenance closed.', 'success'); loadMaintenance(); loadVehicles(); } catch (e) {}
}

/* ====================================================================
   FUEL & EXPENSES
   ==================================================================== */
async function loadFuelExpenses() {
  const [fuel, expenses] = await Promise.all([api('fuel_list'), api('expenses_list')]);
  document.querySelector('#fuelTable tbody').innerHTML = fuel.length ? fuel.map(f => `<tr>
      <td>${f.reg_number} — ${f.vehicle_name}</td><td>${f.liters} L</td><td>${fmtMoney(f.cost)}</td><td>${fmtDate(f.log_date)}</td>
    </tr>`).join('') : `<tr><td colspan="4" style="text-align:center;color:#999;">No fuel logs</td></tr>`;
  document.querySelector('#expensesTable tbody').innerHTML = expenses.length ? expenses.map(x => `<tr>
      <td>${x.reg_number} — ${x.vehicle_name}</td><td>${x.type}</td><td>${fmtMoney(x.amount)}</td><td>${fmtDate(x.expense_date)}</td>
    </tr>`).join('') : `<tr><td colspan="4" style="text-align:center;color:#999;">No expenses</td></tr>`;
}
document.getElementById('addFuelBtn').addEventListener('click', async () => {
  const vehicles = await api('vehicles_list');
  openModal('Add Fuel Log', `
    <label>Vehicle</label><select id="fVehicle">${vehicles.map(v => `<option value="${v.id}">${v.reg_number} — ${v.name}</option>`).join('')}</select>
    <div class="form-row">
      <div><label>Liters</label><input id="fLiters" type="number"></div>
      <div><label>Cost (₹)</label><input id="fCost" type="number"></div>
    </div>
    <label>Date</label><input id="fDate" type="date" value="${new Date().toISOString().slice(0,10)}">
    <div class="form-error" id="fError"></div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" id="fSave">Save</button>
    </div>`);
  document.getElementById('fSave').onclick = async () => {
    const body = { vehicle_id: document.getElementById('fVehicle').value, liters: document.getElementById('fLiters').value, cost: document.getElementById('fCost').value, log_date: document.getElementById('fDate').value };
    try { await api('fuel_create', { method: 'POST', body }); closeModal(); toast('Fuel log added.', 'success'); loadFuelExpenses(); }
    catch (e) { document.getElementById('fError').textContent = e.message; document.getElementById('fError').style.display = 'block'; }
  };
});
document.getElementById('addExpenseBtn').addEventListener('click', async () => {
  const vehicles = await api('vehicles_list');
  openModal('Add Expense', `
    <label>Vehicle</label><select id="fVehicle">${vehicles.map(v => `<option value="${v.id}">${v.reg_number} — ${v.name}</option>`).join('')}</select>
    <label>Type</label><input id="fType" placeholder="Toll / Fine / Parking">
    <div class="form-row">
      <div><label>Amount (₹)</label><input id="fAmount" type="number"></div>
      <div><label>Date</label><input id="fDate" type="date" value="${new Date().toISOString().slice(0,10)}"></div>
    </div>
    <label>Description</label><textarea id="fDesc"></textarea>
    <div class="form-error" id="fError"></div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" id="fSave">Save</button>
    </div>`);
  document.getElementById('fSave').onclick = async () => {
    const body = { vehicle_id: document.getElementById('fVehicle').value, type: document.getElementById('fType').value.trim(), amount: document.getElementById('fAmount').value, expense_date: document.getElementById('fDate').value, description: document.getElementById('fDesc').value.trim() };
    try { await api('expense_create', { method: 'POST', body }); closeModal(); toast('Expense added.', 'success'); loadFuelExpenses(); }
    catch (e) { document.getElementById('fError').textContent = e.message; document.getElementById('fError').style.display = 'block'; }
  };
});

/* ====================================================================
   REPORTS
   ==================================================================== */
async function loadReports() {
  const d = await api('reports');
  document.getElementById('reportUtilization').textContent = d.fleet_utilization + '%';
  document.querySelector('#reportsTable tbody').innerHTML = d.vehicles.map(v => `<tr>
      <td>${v.reg_number} — ${v.name}</td><td>${badge(v.status)}</td><td>${v.total_distance} km</td>
      <td>${v.total_fuel_liters} L</td><td>${fmtMoney(v.fuel_cost)}</td><td>${v.fuel_efficiency_km_per_l}</td>
      <td>${fmtMoney(v.maintenance_cost)}</td><td>${fmtMoney(v.other_expenses)}</td><td>${fmtMoney(v.operational_cost)}</td>
      <td>${fmtMoney(v.revenue)}</td><td>${v.completed_trips}</td><td>${v.roi_percent}%</td>
    </tr>`).join('');
}
document.getElementById('exportCsvBtn').addEventListener('click', () => { window.location.href = `${API}?action=reports_csv`; });

/* ====================================================================
   USERS (fleet manager)
   ==================================================================== */
async function loadUsers() {
  const list = await api('users_list');
  document.querySelector('#usersTable tbody').innerHTML = list.map(u => `<tr>
      <td>${u.name}</td><td>${u.email}</td><td style="text-transform:capitalize;">${u.role.replace('_', ' ')}</td>
      <td>${u.contact || '-'}</td><td>${badge(u.status)}</td>
      <td>${u.status === 'active'
        ? `<button class="btn btn-sm btn-danger" onclick="toggleUserStatus(${u.id}, 'inactive')">Deactivate</button>`
        : `<button class="btn btn-sm btn-success" onclick="toggleUserStatus(${u.id}, 'active')">Activate</button>`}</td>
    </tr>`).join('');
}
async function toggleUserStatus(id, status) {
  try { await api('user_status', { method: 'POST', body: { id, status } }); toast('User updated.', 'success'); loadUsers(); } catch (e) {}
}

/* ------------------------------------------------------------------ */
const LOADERS = {
  dashboard: loadDashboard, vehicles: loadVehicles, drivers: loadDrivers, trips: loadTrips,
  bookings: loadBookings, maintenance: loadMaintenance, fuel: loadFuelExpenses, reports: loadReports, users: loadUsers,
};
