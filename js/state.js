// Central state store for TransitOps

const STORAGE_KEY = 'transitops_state';

// Pre-seeded mock data for logistics testing
const DEFAULT_STATE = {
  users: [
    { id: 'usr-001', name: 'Frank Miller', email: 'manager@transitops.com', password: 'manager123', role: 'Fleet Manager', status: 'Active' },
    { id: 'usr-002', name: 'Sarah Jenkins', email: 'safety@transitops.com', password: 'safety123', role: 'Safety Officer', status: 'Active' },
    { id: 'usr-003', name: 'David Vance', email: 'finance@transitops.com', password: 'finance123', role: 'Financial Analyst', status: 'Active' },
    { id: 'usr-004', name: 'John Doe', email: 'driver@transitops.com', password: 'driver123', role: 'Driver', status: 'Active' },
    { id: 'usr-005', name: 'Alex Cargo', email: 'alex@transitops.com', password: 'alex123', role: 'Driver', status: 'Active' }
  ],
  vehicles: [
    {
      id: 'vhc-001',
      registrationNumber: 'TX-99281',
      name: 'Ford Transit Cargo Van',
      type: 'Van',
      maxLoadCapacity: 1200, // kg
      currentOdometer: 45000, // km
      acquisitionCost: 35000, // $
      status: 'Available',
      region: 'North'
    },
    {
      id: 'vhc-002',
      registrationNumber: 'CA-83928',
      name: 'Freightliner M2 Flatbed',
      type: 'Flatbed Truck',
      maxLoadCapacity: 7500, // kg
      currentOdometer: 125000,
      acquisitionCost: 85000,
      status: 'Available',
      region: 'West'
    },
    {
      id: 'vhc-003',
      registrationNumber: 'NY-48291',
      name: 'Peterbilt 579 Semi-Truck',
      type: 'Semi-Truck',
      maxLoadCapacity: 22000, // kg
      currentOdometer: 380000,
      acquisitionCost: 140000,
      status: 'On Trip',
      region: 'East'
    },
    {
      id: 'vhc-004',
      registrationNumber: 'FL-28192',
      name: 'Chevrolet Express 3500',
      type: 'Van',
      maxLoadCapacity: 1500, // kg
      currentOdometer: 62000,
      acquisitionCost: 38000,
      status: 'In Shop',
      region: 'South'
    },
    {
      id: 'vhc-005',
      registrationNumber: 'IL-11223',
      name: 'Retired Isuzu Box Truck',
      type: 'Box Truck',
      maxLoadCapacity: 3500, // kg
      currentOdometer: 520000,
      acquisitionCost: 45000,
      status: 'Retired',
      region: 'Midwest'
    }
  ],
  drivers: [
    {
      id: 'drv-001',
      name: 'John Doe',
      licenseNumber: 'DL-99281X',
      licenseCategory: 'CDL Class A',
      licenseExpiryDate: '2027-12-31', // Valid
      contactNumber: '555-0199',
      safetyScore: 94, // Out of 100
      status: 'Available'
    },
    {
      id: 'drv-002',
      name: 'Alex Cargo',
      licenseNumber: 'DL-48291A',
      licenseCategory: 'CDL Class B',
      licenseExpiryDate: '2028-06-15', // Valid
      contactNumber: '555-0281',
      safetyScore: 88,
      status: 'Available'
    },
    {
      id: 'drv-003',
      name: 'Bob Hazard',
      licenseNumber: 'DL-11223C',
      licenseCategory: 'Regular Class C',
      licenseExpiryDate: '2026-06-01', // Expired! (Assuming current local time is July 2026)
      contactNumber: '555-0348',
      safetyScore: 65,
      status: 'Available'
    },
    {
      id: 'drv-004',
      name: 'Robert Swift',
      licenseNumber: 'DL-99381W',
      licenseCategory: 'CDL Class A',
      licenseExpiryDate: '2027-09-20',
      contactNumber: '555-0482',
      safetyScore: 98,
      status: 'On Trip'
    },
    {
      id: 'drv-005',
      name: 'Sam Suspended',
      licenseNumber: 'DL-88291B',
      licenseCategory: 'CDL Class B',
      licenseExpiryDate: '2029-01-10',
      contactNumber: '555-0582',
      safetyScore: 42,
      status: 'Suspended'
    }
  ],
  trips: [
    {
      id: 'trp-001',
      source: 'Warehouse Dallas',
      destination: 'Houston Terminal',
      vehicleId: 'vhc-003', // Peterbilt Semi
      driverId: 'drv-004', // Robert Swift
      cargoWeight: 18500, // kg (Valid: 18500 <= 22000)
      plannedDistance: 380, // km
      estimatedRevenue: 1500, // $
      status: 'Dispatched',
      date: '2026-07-12',
      actualOdometerEnd: null,
      fuelConsumedLiters: null
    },
    {
      id: 'trp-002',
      source: 'Chicago Hub',
      destination: 'Indianapolis Yard',
      vehicleId: 'vhc-001', // Ford Van
      driverId: 'drv-001', // John Doe
      cargoWeight: 800, // kg (Valid: 800 <= 1200)
      plannedDistance: 290, // km
      estimatedRevenue: 950, // $
      status: 'Completed',
      date: '2026-07-11',
      actualOdometerEnd: 45290,
      fuelConsumedLiters: 48 // Approx 6 km/l
    }
  ],
  maintenanceLogs: [
    {
      id: 'maint-001',
      vehicleId: 'vhc-004', // Chevrolet Express
      description: 'Regular 60k Mile Service - Brake pads replacement and oil change',
      cost: 450,
      date: '2026-07-11',
      status: 'Open'
    },
    {
      id: 'maint-002',
      vehicleId: 'vhc-003',
      description: 'Tire Rotations and alignment check',
      cost: 650,
      date: '2026-06-20',
      status: 'Closed'
    }
  ],
  fuelLogs: [
    { id: 'fuel-001', vehicleId: 'vhc-001', liters: 50, cost: 75, odometer: 45000, date: '2026-07-11' },
    { id: 'fuel-002', vehicleId: 'vhc-003', liters: 150, cost: 225, odometer: 380000, date: '2026-07-12' }
  ],
  expenses: [
    { id: 'exp-001', vehicleId: 'vhc-003', tripId: 'trp-001', type: 'Toll', cost: 45, date: '2026-07-12' }
  ],
  notifications: [
    { id: 'ntf-001', userId: 'usr-002', message: 'ALERT: Driver Bob Hazard has an expired CDL driving license (Expiry: 2026-06-01).', type: 'License Expired', date: '2026-07-12', read: false },
    { id: 'ntf-002', userId: 'all', message: 'Trip trp-001 dispatched. Driver Robert Swift and Vehicle TX-99281 set to On Trip.', type: 'Trip Dispatched', date: '2026-07-12', read: false }
  ],
  activityLogs: [
    { id: 'log-001', userId: 'usr-001', userName: 'Frank Miller', action: 'System Initialization', details: 'Pre-seeded vehicles and dispatch routes loaded.', date: '2026-07-12T10:00:00' }
  ],
  currentUser: null
};

class StateStore {
  constructor() {
    this.state = this._loadState();
    this.listeners = [];
  }

  _loadState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      this._saveState(DEFAULT_STATE);
      return JSON.parse(JSON.stringify(DEFAULT_STATE));
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.error('Failed to parse localStorage state. Resetting to defaults.', e);
      return JSON.parse(JSON.stringify(DEFAULT_STATE));
    }
  }

  _saveState(stateToSave) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave || this.state));
  }

  _emit() {
    this._saveState();
    this.listeners.forEach(fn => fn(this.state));
  }

  subscribe(fn) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter(x => x !== fn);
    };
  }

  // --- Auth API ---
  getCurrentUser() {
    return this.state.currentUser;
  }

  login(email, password) {
    const user = this.state.users.find(u => u.email.toLowerCase() === email.toLowerCase().trim() && u.password === password);
    if (!user) throw new Error('Invalid email or password.');
    if (user.status === 'Inactive') throw new Error('Your account is deactivated.');
    
    this.state.currentUser = user;
    this.addActivityLog(user.id, 'User Login', `${user.name} (${user.role}) logged in.`);
    this._emit();
    return user;
  }

  signup(name, email, password) {
    const exists = this.state.users.some(u => u.email.toLowerCase() === email.toLowerCase().trim());
    if (exists) throw new Error('Email address already registered.');
    
    const newUser = {
      id: `usr-${String(this.state.users.length + 1).padStart(3, '0')}`,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: 'Driver', // Default role at signup
      status: 'Active'
    };

    this.state.users.push(newUser);
    
    // Auto-create a Driver Profile too in the drivers list so they appear in drivers list!
    const newDriverProfile = {
      id: `drv-${Date.now()}`,
      name: newUser.name,
      licenseNumber: 'PENDING',
      licenseCategory: 'Regular Class C',
      licenseExpiryDate: new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0], // 1 year out
      contactNumber: '555-0000',
      safetyScore: 100, // initial perfect score
      status: 'Available'
    };
    this.state.drivers.push(newDriverProfile);

    this.addActivityLog(newUser.id, 'Account Signup', `Registered new profile as Driver.`);
    this.addNotification('all', `New driver profile registered: ${newUser.name}.`, 'Signup');
    this._emit();
    return newUser;
  }

  logout() {
    const user = this.state.currentUser;
    if (user) {
      this.addActivityLog(user.id, 'User Logout', `${user.name} logged out.`);
    }
    this.state.currentUser = null;
    this._emit();
  }

  promoteUserRole(userId, newRole) {
    const user = this.state.users.find(u => u.id === userId);
    if (!user) throw new Error('User profile not found.');
    const oldRole = user.role;
    user.role = newRole;

    this.addActivityLog(this.getCurrentUser()?.id, 'Role Promotion', `Promoted ${user.name} from ${oldRole} to ${newRole}`);
    this.addNotification(userId, `Your system role was changed to ${newRole}.`, 'Role Update');
    this._emit();
  }

  updateUserStatus(userId, status) {
    const user = this.state.users.find(u => u.id === userId);
    if (!user) throw new Error('User not found.');
    user.status = status;
    this.addActivityLog(this.getCurrentUser()?.id, 'User Status Update', `Set status of ${user.name} to ${status}`);
    this._emit();
  }

  // --- Vehicles API ---
  createVehicle(vehicleData) {
    // Unique registration check
    const regExists = this.state.vehicles.some(v => v.registrationNumber.toUpperCase() === vehicleData.registrationNumber.toUpperCase().trim());
    if (regExists) throw new Error(`Registration validation failure: Odometer ledger already contains Registration Number "${vehicleData.registrationNumber}"`);

    const id = `vhc-${String(this.state.vehicles.length + 1).padStart(3, '0')}`;
    const newVhc = {
      id,
      registrationNumber: vehicleData.registrationNumber.toUpperCase().trim(),
      name: vehicleData.name.trim(),
      type: vehicleData.type,
      maxLoadCapacity: Number(vehicleData.maxLoadCapacity),
      currentOdometer: Number(vehicleData.currentOdometer) || 0,
      acquisitionCost: Number(vehicleData.acquisitionCost) || 0,
      status: 'Available',
      region: vehicleData.region || 'HQ'
    };

    this.state.vehicles.push(newVhc);
    this.addActivityLog(this.getCurrentUser()?.id, 'Register Vehicle', `Registered vehicle ${newVhc.name} (${newVhc.registrationNumber})`);
    this._emit();
    return newVhc;
  }

  updateVehicle(id, data) {
    const vhc = this.state.vehicles.find(v => v.id === id);
    if (!vhc) throw new Error('Vehicle not found.');

    // Registration check if updated
    if (data.registrationNumber && data.registrationNumber.toUpperCase().trim() !== vhc.registrationNumber) {
      const regExists = this.state.vehicles.some(v => v.id !== id && v.registrationNumber.toUpperCase() === data.registrationNumber.toUpperCase().trim());
      if (regExists) throw new Error(`Registration Number "${data.registrationNumber}" already assigned to another vehicle.`);
    }

    Object.assign(vhc, data);
    this.addActivityLog(this.getCurrentUser()?.id, 'Update Vehicle', `Updated vehicle details for ${vhc.registrationNumber}`);
    this._emit();
  }

  deleteVehicle(id) {
    const vhc = this.state.vehicles.find(v => v.id === id);
    if (!vhc) throw new Error('Vehicle not found.');
    
    // Set to retired instead of hard deleting to preserve referential integrity for trips/costs
    vhc.status = 'Retired';
    this.addActivityLog(this.getCurrentUser()?.id, 'Retire Vehicle', `Retired vehicle ${vhc.registrationNumber}`);
    this._emit();
  }

  // --- Drivers API ---
  createDriver(driverData) {
    const id = `drv-${String(this.state.drivers.length + 1).padStart(3, '0')}`;
    const newDrv = {
      id,
      name: driverData.name.trim(),
      licenseNumber: driverData.licenseNumber.toUpperCase().trim(),
      licenseCategory: driverData.licenseCategory,
      licenseExpiryDate: driverData.licenseExpiryDate,
      contactNumber: driverData.contactNumber,
      safetyScore: Number(driverData.safetyScore) || 100,
      status: 'Available'
    };

    this.state.drivers.push(newDrv);
    this.addActivityLog(this.getCurrentUser()?.id, 'Register Driver', `Registered driver profile for ${newDrv.name}`);
    this._emit();
    return newDrv;
  }

  updateDriver(id, data) {
    const drv = this.state.drivers.find(d => d.id === id);
    if (!drv) throw new Error('Driver profile not found.');

    Object.assign(drv, data);
    this.addActivityLog(this.getCurrentUser()?.id, 'Update Driver', `Updated driver profile details for ${drv.name}`);
    this._emit();
  }

  deleteDriver(id) {
    const drv = this.state.drivers.find(d => d.id === id);
    if (!drv) throw new Error('Driver not found.');

    drv.status = 'Suspended'; // suspend instead of hard deleting to save trip logs
    this.addActivityLog(this.getCurrentUser()?.id, 'Suspend Driver', `Deactivated/Suspended driver profile of ${drv.name}`);
    this._emit();
  }

  // --- Trips Management ---
  createTrip(tripData) {
    const vehicle = this.state.vehicles.find(v => v.id === tripData.vehicleId);
    const driver = this.state.drivers.find(d => d.id === tripData.driverId);

    if (!vehicle) throw new Error('Vehicle asset not found.');
    if (!driver) throw new Error('Driver profile not found.');

    // 1. Dispatch pools exclusions
    if (vehicle.status === 'Retired' || vehicle.status === 'In Shop') {
      throw new Error(`Business Rule Violation: Vehicle "${vehicle.registrationNumber}" is ${vehicle.status} and cannot be dispatched.`);
    }
    
    // 2. Expired driver license checks
    const today = new Date().toISOString().split('T')[0];
    if (driver.licenseExpiryDate < today) {
      throw new Error(`Business Rule Violation: Driver ${driver.name} has an expired license (Expiry: ${driver.licenseExpiryDate}). Dispatch blocked.`);
    }

    if (driver.status === 'Suspended') {
      throw new Error(`Business Rule Violation: Driver ${driver.name} is currently Suspended. Dispatch blocked.`);
    }

    // 3. Double booking checks
    if (vehicle.status === 'On Trip') {
      throw new Error(`Business Rule Violation: Vehicle "${vehicle.registrationNumber}" is already active On Trip.`);
    }
    if (driver.status === 'On Trip') {
      throw new Error(`Business Rule Violation: Driver ${driver.name} is already active On Trip.`);
    }

    // 4. Weight capacity checks
    const weight = Number(tripData.cargoWeight);
    if (weight > vehicle.maxLoadCapacity) {
      throw new Error(`Business Rule Violation: Cargo weight (${weight} kg) exceeds maximum load capacity of vehicle (${vehicle.maxLoadCapacity} kg).`);
    }

    const id = `trp-${String(this.state.trips.length + 1).padStart(3, '0')}`;
    const newTrip = {
      id,
      source: tripData.source.trim(),
      destination: tripData.destination.trim(),
      vehicleId: tripData.vehicleId,
      driverId: tripData.driverId,
      cargoWeight: weight,
      plannedDistance: Number(tripData.plannedDistance) || 0,
      estimatedRevenue: Number(tripData.estimatedRevenue) || 0,
      status: 'Draft', // initial state
      date: tripData.date || today,
      actualOdometerEnd: null,
      fuelConsumedLiters: null
    };

    this.state.trips.push(newTrip);
    this.addActivityLog(this.getCurrentUser()?.id, 'Create Trip Draft', `Created trip draft ${id} from ${newTrip.source} to ${newTrip.destination}`);
    this._emit();
    return newTrip;
  }

  dispatchTrip(tripId) {
    const trip = this.state.trips.find(t => t.id === tripId);
    if (!trip) throw new Error('Trip not found.');
    if (trip.status !== 'Draft') throw new Error('Trip is already dispatched or finalized.');

    const vehicle = this.state.vehicles.find(v => v.id === trip.vehicleId);
    const driver = this.state.drivers.find(d => d.id === trip.driverId);

    // Business checks again at dispatch time (safety double checking)
    if (vehicle.status === 'On Trip' || vehicle.status === 'In Shop' || vehicle.status === 'Retired') {
      throw new Error('Vehicle is no longer available for dispatch.');
    }
    if (driver.status === 'On Trip' || driver.status === 'Suspended') {
      throw new Error('Driver is no longer available for dispatch.');
    }

    // Dispatch transition triggers
    trip.status = 'Dispatched';
    vehicle.status = 'On Trip';
    driver.status = 'On Trip';

    this.addNotification('all', `Trip dispatched: Driver ${driver.name} is operating vehicle ${vehicle.registrationNumber} to ${trip.destination}.`, 'Trip Dispatched');
    this.addActivityLog(this.getCurrentUser()?.id, 'Dispatch Trip', `Dispatched trip ${tripId} with vehicle ${vehicle.registrationNumber}`);
    this._emit();
  }

  completeTrip(tripId, finalOdometer, fuelConsumed, tollCost = 0) {
    const trip = this.state.trips.find(t => t.id === tripId);
    if (!trip) throw new Error('Trip not found.');
    if (trip.status !== 'Dispatched') throw new Error('Only dispatched trips can be completed.');

    const vehicle = this.state.vehicles.find(v => v.id === trip.vehicleId);
    const driver = this.state.drivers.find(d => d.id === trip.driverId);

    if (finalOdometer < vehicle.currentOdometer) {
      throw new Error(`Completion Error: Final odometer (${finalOdometer} km) cannot be less than start odometer (${vehicle.currentOdometer} km).`);
    }

    // Finalize trip stats
    trip.status = 'Completed';
    trip.actualOdometerEnd = Number(finalOdometer);
    trip.fuelConsumedLiters = Number(fuelConsumed);

    // Update vehicle odometer
    const actualDistance = finalOdometer - vehicle.currentOdometer;
    vehicle.currentOdometer = Number(finalOdometer);

    // Restore vehicle and driver to Available
    vehicle.status = 'Available';
    driver.status = 'Available';

    // Record Fuel Log & Toll logs automatically
    const fuelCost = Number(fuelConsumed) * 1.5; // assume standard $1.5 per liter
    this.state.fuelLogs.push({
      id: `fuel-${Date.now()}`,
      vehicleId: vehicle.id,
      liters: Number(fuelConsumed),
      cost: fuelCost,
      odometer: Number(finalOdometer),
      date: new Date().toISOString().split('T')[0]
    });

    if (Number(tollCost) > 0) {
      this.state.expenses.push({
        id: `exp-${Date.now()}`,
        vehicleId: vehicle.id,
        tripId: trip.id,
        type: 'Toll',
        cost: Number(tollCost),
        date: new Date().toISOString().split('T')[0]
      });
    }

    this.addNotification('all', `Trip ${trip.id} completed. Vehicle ${vehicle.registrationNumber} returned. Distance covered: ${actualDistance} km.`, 'Trip Completed');
    this.addActivityLog(this.getCurrentUser()?.id, 'Complete Trip', `Finalized trip ${tripId}. Recorded ${fuelConsumed}L fuel consumption.`);
    this._emit();
  }

  cancelTrip(tripId) {
    const trip = this.state.trips.find(t => t.id === tripId);
    if (!trip) throw new Error('Trip not found.');
    
    const wasDispatched = trip.status === 'Dispatched';
    trip.status = 'Cancelled';

    if (wasDispatched) {
      const vehicle = this.state.vehicles.find(v => v.id === trip.vehicleId);
      const driver = this.state.drivers.find(d => d.id === trip.driverId);
      
      // Restore vehicle and driver
      if (vehicle && vehicle.status === 'On Trip') vehicle.status = 'Available';
      if (driver && driver.status === 'On Trip') driver.status = 'Available';
    }

    this.addActivityLog(this.getCurrentUser()?.id, 'Cancel Trip', `Cancelled trip ${tripId}`);
    this._emit();
  }

  // --- Maintenance Logs ---
  createMaintenanceLog(vehicleId, description, cost) {
    const vehicle = this.state.vehicles.find(v => v.id === vehicleId);
    if (!vehicle) throw new Error('Vehicle not found.');

    // Automated transition: sets vehicle status to In Shop
    vehicle.status = 'In Shop';

    const newLog = {
      id: `maint-${Date.now()}`,
      vehicleId,
      description: description.trim(),
      cost: Number(cost) || 0,
      date: new Date().toISOString().split('T')[0],
      status: 'Open'
    };

    this.state.maintenanceRequests = this.state.maintenanceRequests || []; // back compatibility
    this.state.maintenanceLogs.push(newLog);

    // Save as general expense too
    this.state.expenses.push({
      id: `exp-${Date.now()}`,
      vehicleId,
      tripId: null,
      type: 'Maintenance',
      cost: Number(cost) || 0,
      date: new Date().toISOString().split('T')[0]
    });

    this.addNotification('all', `Vehicle ${vehicle.registrationNumber} sent to workshop: "${newLog.description}"`, 'Maintenance Scheduled');
    this.addActivityLog(this.getCurrentUser()?.id, 'Open Maintenance Log', `Sent vehicle ${vehicle.registrationNumber} in-shop.`);
    this._emit();
    return newLog;
  }

  closeMaintenanceLog(logId) {
    const log = this.state.maintenanceLogs.find(l => l.id === logId);
    if (!log) throw new Error('Maintenance record not found.');
    if (log.status === 'Closed') throw new Error('Maintenance is already resolved.');

    log.status = 'Closed';

    const vehicle = this.state.vehicles.find(v => v.id === log.vehicleId);
    // Restore vehicle status back to Available unless it is Retired
    if (vehicle && vehicle.status !== 'Retired') {
      vehicle.status = 'Available';
    }

    this.addNotification('all', `Vehicle ${vehicle?.registrationNumber || 'Asset'} service completed. Returned to dispatch pool.`, 'Maintenance Closed');
    this.addActivityLog(this.getCurrentUser()?.id, 'Close Maintenance Log', `Resolved servicing for vehicle ${vehicle?.registrationNumber}`);
    this._emit();
  }

  // --- Fuel & Expense Logging ---
  addFuelLog(vehicleId, liters, cost, odometer) {
    const vehicle = this.state.vehicles.find(v => v.id === vehicleId);
    if (!vehicle) throw new Error('Vehicle not found.');

    const newLog = {
      id: `fuel-${Date.now()}`,
      vehicleId,
      liters: Number(liters),
      cost: Number(cost),
      odometer: Number(odometer) || vehicle.currentOdometer,
      date: new Date().toISOString().split('T')[0]
    };

    // Update vehicle odometer if higher
    if (newLog.odometer > vehicle.currentOdometer) {
      vehicle.currentOdometer = newLog.odometer;
    }

    this.state.fuelLogs.push(newLog);

    // Add fuel cost to expenses ledger
    this.state.expenses.push({
      id: `exp-${Date.now()}`,
      vehicleId,
      tripId: null,
      type: 'Fuel',
      cost: Number(cost),
      date: new Date().toISOString().split('T')[0]
    });

    this.addActivityLog(this.getCurrentUser()?.id, 'Log Fuel', `Logged ${liters}L fuel fill for ${vehicle.registrationNumber}`);
    this._emit();
    return newLog;
  }

  addGeneralExpense(vehicleId, type, cost, details = '') {
    const newExp = {
      id: `exp-${Date.now()}`,
      vehicleId,
      tripId: null,
      type, // 'Toll', 'Maintenance', 'Fuel', 'Other'
      cost: Number(cost),
      date: new Date().toISOString().split('T')[0]
    };

    this.state.expenses.push(newExp);
    this.addActivityLog(this.getCurrentUser()?.id, 'Log Expense', `Recorded $${cost} ${type} expense.`);
    this._emit();
    return newExp;
  }

  // Compute total operational cost (Fuel + Maintenance) per vehicle
  getVehicleTotalCost(vehicleId) {
    const fuelCost = this.state.fuelLogs
      .filter(f => f.vehicleId === vehicleId)
      .reduce((sum, f) => sum + f.cost, 0);

    const maintenanceCost = this.state.maintenanceLogs
      .filter(l => l.vehicleId === vehicleId)
      .reduce((sum, l) => sum + l.cost, 0);

    const otherCost = this.state.expenses
      .filter(e => e.vehicleId === vehicleId && e.type !== 'Fuel' && e.type !== 'Maintenance')
      .reduce((sum, e) => sum + e.cost, 0);

    return fuelCost + maintenanceCost + otherCost;
  }

  // --- Notifications & Audit Logging ---
  getNotifications(userId) {
    if (!userId) return [];
    return this.state.notifications.filter(n => n.userId === userId || n.userId === 'all').sort((a,b) => new Date(b.date) - new Date(a.date));
  }

  markNotificationsRead(userId) {
    this.state.notifications.forEach(n => {
      if (n.userId === userId || n.userId === 'all') {
        n.read = true;
      }
    });
    this._emit();
  }

  addNotification(userId, message, type) {
    const newNtf = {
      id: `ntf-${Date.now()}-${Math.floor(Math.random()*1000)}`,
      userId,
      message,
      type,
      date: new Date().toISOString().split('T')[0],
      read: false
    };
    this.state.notifications.push(newNtf);
  }

  getActivityLogs() {
    return [...this.state.activityLogs].sort((a,b) => new Date(b.date) - new Date(a.date));
  }

  addActivityLog(userId, action, details) {
    const userName = this.state.users.find(u => u.id === userId)?.name || 'System';
    const newLog = {
      id: `log-${Date.now()}-${Math.floor(Math.random()*1000)}`,
      userId: userId || 'system',
      userName,
      action,
      details,
      date: new Date().toISOString()
    };
    this.state.activityLogs.push(newLog);
  }

  checkDriverLicenseAlerts() {
    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const thirtyDaysStr = thirtyDaysFromNow.toISOString().split('T')[0];

    let triggered = false;

    this.state.drivers.forEach(drv => {
      if (drv.licenseExpiryDate < today) {
        // Expired!
        const alertMsg = `EXPIRED LICENSE: Driver ${drv.name}'s CDL driving license has expired (Expiry: ${drv.licenseExpiryDate}).`;
        const alertExists = this.state.notifications.some(n => n.type === 'License Expired' && n.message.includes(drv.name));
        
        if (!alertExists) {
          triggered = true;
          this.addNotification('all', alertMsg, 'License Expired');
        }
      } else if (drv.licenseExpiryDate <= thirtyDaysStr) {
        // Expiring soon
        const alertMsg = `EXPIRING LICENSE: Driver ${drv.name}'s driving license will expire soon on ${drv.licenseExpiryDate}.`;
        const alertExists = this.state.notifications.some(n => n.type === 'License Expiring' && n.message.includes(drv.name));

        if (!alertExists) {
          triggered = true;
          this.addNotification('all', alertMsg, 'License Expiring');
        }
      }
    });

    if (triggered) {
      this._emit();
    }
  }
}

export const stateStore = new StateStore();
window.stateStore = stateStore;
stateStore.checkDriverLicenseAlerts();
