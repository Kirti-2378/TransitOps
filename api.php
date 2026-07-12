<?php
/**
 * =====================================================================
 * TransitOps - Smart Transport Operations Platform
 * Single-file PHP backend / JSON API
 * =====================================================================
 * All requests hit this file:  api.php?action=xxxx
 * Responses are always JSON:   { "ok": true/false, "data": ..., "error": "" }
 *
 * SETUP:
 *  1. Create the database by importing database.sql
 *  2. Edit the DB_* constants below to match your MySQL credentials
 *  3. Put all 5 files in one folder on your PHP server (XAMPP/WAMP/LAMP)
 *  4. Open index.html through http://localhost/... (not file://)
 * =====================================================================
 */

// ---------------------------------------------------------------------
// CONFIG
// ---------------------------------------------------------------------
define('DB_HOST', 'localhost');
define('DB_NAME', 'transitops');
define('DB_USER', 'root');
define('DB_PASS', '');

error_reporting(E_ALL);
ini_set('display_errors', 0); // keep JSON clean; flip to 1 while debugging

header('Content-Type: application/json; charset=utf-8');
session_start();

// ---------------------------------------------------------------------
// DB CONNECTION (PDO)
// ---------------------------------------------------------------------
try {
    $pdo = new PDO(
        "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
        DB_USER,
        DB_PASS,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
    );
} catch (PDOException $e) {
    respond(false, null, 'Database connection failed: ' . $e->getMessage());
}

// ---------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------
function respond($ok, $data = null, $error = '') {
    echo json_encode(['ok' => $ok, 'data' => $data, 'error' => $error]);
    exit;
}

function input() {
    $raw = file_get_contents('php://input');
    $json = json_decode($raw, true);
    return is_array($json) ? $json : [];
}

function require_login() {
    if (empty($_SESSION['user_id'])) respond(false, null, 'Not authenticated. Please log in.');
}

function require_role(array $roles) {
    require_login();
    if (!in_array($_SESSION['role'], $roles)) {
        respond(false, null, 'Access denied for role "' . $_SESSION['role'] . '".');
    }
}

function current_user() {
    return [
        'id'    => $_SESSION['user_id'] ?? null,
        'name'  => $_SESSION['name'] ?? null,
        'email' => $_SESSION['email'] ?? null,
        'role'  => $_SESSION['role'] ?? null,
    ];
}

// Roles allowed to manage fleet/driver/maintenance/dispatch master data
define('OPS_ROLES', ['fleet_manager', 'driver', 'safety_officer']);
define('MGMT_ROLES', ['fleet_manager']);
define('FIN_ROLES', ['fleet_manager', 'financial_analyst']);

// ---------------------------------------------------------------------
// FIRST-RUN SEEDING: if the users table is empty, create the 5 demo
// accounts with a properly generated bcrypt hash for "Pass@123".
// ---------------------------------------------------------------------
function seed_demo_users($pdo) {
    $count = $pdo->query("SELECT COUNT(*) c FROM users")->fetch()['c'];
    if ($count > 0) return;
    $hash = password_hash('Pass@123', PASSWORD_DEFAULT);
    $demo = [
        ['Fleet Admin',   'fleetmanager@transitops.com', 'fleet_manager',     '9990000001'],
        ['Alex Driver',   'driver@transitops.com',       'driver',            '9990000002'],
        ['Sam Safety',    'safety@transitops.com',       'safety_officer',    '9990000003'],
        ['Fiona Finance', 'finance@transitops.com',      'financial_analyst', '9990000004'],
        ['Chloe Customer','customer@transitops.com',     'customer',          '9990000005'],
    ];
    $stmt = $pdo->prepare("INSERT INTO users (name, email, password, role, contact) VALUES (?,?,?,?,?)");
    foreach ($demo as $d) {
        $stmt->execute([$d[0], $d[1], $hash, $d[2], $d[3]]);
    }
    // link the demo driver login to the seeded driver record 'Alex Driver'
    $pdo->exec("UPDATE drivers SET user_id = (SELECT id FROM users WHERE email='driver@transitops.com') WHERE license_number='DL-1001'");
}
try { seed_demo_users($pdo); } catch (Exception $e) { /* ignore seeding errors */ }

// ---------------------------------------------------------------------
// ROUTER
// ---------------------------------------------------------------------
$action = $_GET['action'] ?? ($_POST['action'] ?? '');

switch ($action) {

    // ============================== AUTH ==============================
    case 'register': {
        $in = input();
        $name = trim($in['name'] ?? '');
        $email = strtolower(trim($in['email'] ?? ''));
        $password = $in['password'] ?? '';
        $role = $in['role'] ?? 'customer';
        $contact = trim($in['contact'] ?? '');
        $allowedRoles = ['fleet_manager','driver','safety_officer','financial_analyst','customer'];
        if (!$name || !$email || !$password) respond(false, null, 'Name, email and password are required.');
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) respond(false, null, 'Invalid email address.');
        if (strlen($password) < 6) respond(false, null, 'Password must be at least 6 characters.');
        if (!in_array($role, $allowedRoles)) $role = 'customer';

        $chk = $pdo->prepare("SELECT id FROM users WHERE email = ?");
        $chk->execute([$email]);
        if ($chk->fetch()) respond(false, null, 'An account with this email already exists.');

        $hash = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $pdo->prepare("INSERT INTO users (name, email, password, role, contact) VALUES (?,?,?,?,?)");
        $stmt->execute([$name, $email, $hash, $role, $contact]);

        // if registering as a driver, auto create a linked driver profile shell
        if ($role === 'driver') {
            $uid = $pdo->lastInsertId();
            $lic = 'PENDING-' . $uid;
            $stmt2 = $pdo->prepare("INSERT INTO drivers (user_id, name, license_number, license_category, license_expiry, contact_number, safety_score, status) VALUES (?,?,?,?,?,?,?,?)");
            $stmt2->execute([$uid, $name, $lic, 'N/A', '1970-01-01', $contact ?: '0000000000', 100, 'Off Duty']);
        }
        respond(true, ['message' => 'Account created. Please log in.']);
        break;
    }

    case 'login': {
        $in = input();
        $email = strtolower(trim($in['email'] ?? ''));
        $password = $in['password'] ?? '';
        if (!$email || !$password) respond(false, null, 'Email and password are required.');

        $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, $user['password'])) {
            respond(false, null, 'Invalid email or password.');
        }
        if ($user['status'] !== 'active') respond(false, null, 'This account has been deactivated.');

        $_SESSION['user_id'] = $user['id'];
        $_SESSION['name'] = $user['name'];
        $_SESSION['email'] = $user['email'];
        $_SESSION['role'] = $user['role'];

        respond(true, current_user());
        break;
    }

    case 'logout': {
        $_SESSION = [];
        session_destroy();
        respond(true, ['message' => 'Logged out.']);
        break;
    }

    case 'session': {
        if (empty($_SESSION['user_id'])) respond(true, null);
        respond(true, current_user());
        break;
    }

    // ============================ DASHBOARD ============================
    case 'dashboard': {
        require_login();
        $vehicleTotal = $pdo->query("SELECT COUNT(*) c FROM vehicles WHERE status <> 'Retired'")->fetch()['c'];
        $vehicleAvail = $pdo->query("SELECT COUNT(*) c FROM vehicles WHERE status='Available'")->fetch()['c'];
        $vehicleShop  = $pdo->query("SELECT COUNT(*) c FROM vehicles WHERE status='In Shop'")->fetch()['c'];
        $vehicleOnTrip= $pdo->query("SELECT COUNT(*) c FROM vehicles WHERE status='On Trip'")->fetch()['c'];
        $tripsActive  = $pdo->query("SELECT COUNT(*) c FROM trips WHERE status='Dispatched'")->fetch()['c'];
        $tripsPending  = $pdo->query("SELECT COUNT(*) c FROM trips WHERE status='Draft'")->fetch()['c'];
        $driversOnDuty= $pdo->query("SELECT COUNT(*) c FROM drivers WHERE status='On Trip'")->fetch()['c'];
        $utilization = $vehicleTotal > 0 ? round(($vehicleOnTrip / $vehicleTotal) * 100, 1) : 0;

        $recentTrips = $pdo->query("SELECT t.*, v.reg_number, d.name AS driver_name FROM trips t
            LEFT JOIN vehicles v ON v.id=t.vehicle_id LEFT JOIN drivers d ON d.id=t.driver_id
            ORDER BY t.id DESC LIMIT 8")->fetchAll();

        $expiring = $pdo->query("SELECT * FROM drivers WHERE license_expiry <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) ORDER BY license_expiry ASC")->fetchAll();

        respond(true, [
            'active_vehicles'      => (int)$vehicleTotal,
            'available_vehicles'   => (int)$vehicleAvail,
            'vehicles_in_maintenance' => (int)$vehicleShop,
            'active_trips'         => (int)$tripsActive,
            'pending_trips'        => (int)$tripsPending,
            'drivers_on_duty'      => (int)$driversOnDuty,
            'fleet_utilization'    => $utilization,
            'recent_trips'         => $recentTrips,
            'expiring_licenses'    => $expiring,
        ]);
        break;
    }

    // ============================ VEHICLES ============================
    case 'vehicles_list': {
        require_login();
        $type = $_GET['type'] ?? '';
        $status = $_GET['status'] ?? '';
        $region = $_GET['region'] ?? '';
        $sql = "SELECT * FROM vehicles WHERE 1=1";
        $params = [];
        if ($type)   { $sql .= " AND type = ?"; $params[] = $type; }
        if ($status) { $sql .= " AND status = ?"; $params[] = $status; }
        if ($region) { $sql .= " AND region = ?"; $params[] = $region; }
        $sql .= " ORDER BY id DESC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        respond(true, $stmt->fetchAll());
        break;
    }

    case 'vehicles_available': { // for dispatch dropdown - hides Retired/In Shop/On Trip
        require_login();
        respond(true, $pdo->query("SELECT * FROM vehicles WHERE status='Available' ORDER BY name")->fetchAll());
        break;
    }

    case 'vehicle_save': {
        require_role(MGMT_ROLES);
        $in = input();
        $id = $in['id'] ?? null;
        $reg = trim($in['reg_number'] ?? '');
        $name = trim($in['name'] ?? '');
        $type = trim($in['type'] ?? '');
        $maxLoad = floatval($in['max_load_capacity'] ?? 0);
        $odometer = floatval($in['odometer'] ?? 0);
        $cost = floatval($in['acquisition_cost'] ?? 0);
        $region = trim($in['region'] ?? '');
        $status = $in['status'] ?? 'Available';

        if (!$reg || !$name || !$type || $maxLoad <= 0) respond(false, null, 'Registration number, name, type and a valid max load are required.');
        $validStatus = ['Available','On Trip','In Shop','Retired'];
        if (!in_array($status, $validStatus)) respond(false, null, 'Invalid status.');

        $chk = $pdo->prepare("SELECT id FROM vehicles WHERE reg_number = ? AND id <> ?");
        $chk->execute([$reg, $id ?: 0]);
        if ($chk->fetch()) respond(false, null, 'Registration number must be unique. This one is already used.');

        if ($id) {
            $stmt = $pdo->prepare("UPDATE vehicles SET reg_number=?, name=?, type=?, max_load_capacity=?, odometer=?, acquisition_cost=?, region=?, status=? WHERE id=?");
            $stmt->execute([$reg, $name, $type, $maxLoad, $odometer, $cost, $region, $status, $id]);
        } else {
            $stmt = $pdo->prepare("INSERT INTO vehicles (reg_number, name, type, max_load_capacity, odometer, acquisition_cost, region, status) VALUES (?,?,?,?,?,?,?,?)");
            $stmt->execute([$reg, $name, $type, $maxLoad, $odometer, $cost, $region, $status]);
        }
        respond(true, ['message' => 'Vehicle saved.']);
        break;
    }

    case 'vehicle_delete': {
        require_role(MGMT_ROLES);
        $id = intval($_GET['id'] ?? 0);
        $inUse = $pdo->prepare("SELECT COUNT(*) c FROM trips WHERE vehicle_id=? AND status IN ('Draft','Dispatched')");
        $inUse->execute([$id]);
        if ($inUse->fetch()['c'] > 0) respond(false, null, 'Cannot delete a vehicle with active or draft trips.');
        $pdo->prepare("DELETE FROM vehicles WHERE id=?")->execute([$id]);
        respond(true, ['message' => 'Vehicle deleted.']);
        break;
    }

    // ============================= DRIVERS =============================
    case 'drivers_list': {
        require_login();
        respond(true, $pdo->query("SELECT * FROM drivers ORDER BY id DESC")->fetchAll());
        break;
    }

    case 'drivers_available': { // hides Suspended/On Trip/Off Duty/expired license
        require_login();
        $stmt = $pdo->query("SELECT * FROM drivers WHERE status='Available' AND license_expiry >= CURDATE() ORDER BY name");
        respond(true, $stmt->fetchAll());
        break;
    }

    case 'driver_save': {
        require_role(array_merge(MGMT_ROLES, ['safety_officer']));
        $in = input();
        $id = $in['id'] ?? null;
        $name = trim($in['name'] ?? '');
        $lic = trim($in['license_number'] ?? '');
        $cat = trim($in['license_category'] ?? '');
        $expiry = $in['license_expiry'] ?? '';
        $contact = trim($in['contact_number'] ?? '');
        $score = floatval($in['safety_score'] ?? 100);
        $status = $in['status'] ?? 'Available';

        if (!$name || !$lic || !$cat || !$expiry || !$contact) respond(false, null, 'All driver fields are required.');
        $validStatus = ['Available','On Trip','Off Duty','Suspended'];
        if (!in_array($status, $validStatus)) respond(false, null, 'Invalid status.');

        $chk = $pdo->prepare("SELECT id FROM drivers WHERE license_number=? AND id<>?");
        $chk->execute([$lic, $id ?: 0]);
        if ($chk->fetch()) respond(false, null, 'License number must be unique.');

        if ($id) {
            $stmt = $pdo->prepare("UPDATE drivers SET name=?, license_number=?, license_category=?, license_expiry=?, contact_number=?, safety_score=?, status=? WHERE id=?");
            $stmt->execute([$name, $lic, $cat, $expiry, $contact, $score, $status, $id]);
        } else {
            $stmt = $pdo->prepare("INSERT INTO drivers (name, license_number, license_category, license_expiry, contact_number, safety_score, status) VALUES (?,?,?,?,?,?,?)");
            $stmt->execute([$name, $lic, $cat, $expiry, $contact, $score, $status]);
        }
        respond(true, ['message' => 'Driver saved.']);
        break;
    }

    case 'driver_delete': {
        require_role(array_merge(MGMT_ROLES, ['safety_officer']));
        $id = intval($_GET['id'] ?? 0);
        $inUse = $pdo->prepare("SELECT COUNT(*) c FROM trips WHERE driver_id=? AND status IN ('Draft','Dispatched')");
        $inUse->execute([$id]);
        if ($inUse->fetch()['c'] > 0) respond(false, null, 'Cannot delete a driver with active or draft trips.');
        $pdo->prepare("DELETE FROM drivers WHERE id=?")->execute([$id]);
        respond(true, ['message' => 'Driver deleted.']);
        break;
    }

    // ============================== TRIPS ===============================
    case 'trips_list': {
        require_login();
        $sql = "SELECT t.*, v.reg_number, v.name AS vehicle_name, d.name AS driver_name
                FROM trips t
                LEFT JOIN vehicles v ON v.id = t.vehicle_id
                LEFT JOIN drivers d ON d.id = t.driver_id
                WHERE 1=1";
        $params = [];
        if ($_SESSION['role'] === 'customer') {
            $sql .= " AND t.customer_id = ?";
            $params[] = $_SESSION['user_id'];
        }
        if (!empty($_GET['status'])) { $sql .= " AND t.status = ?"; $params[] = $_GET['status']; }
        $sql .= " ORDER BY t.id DESC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        respond(true, $stmt->fetchAll());
        break;
    }

    case 'trip_create': {
        // Customers can create booking requests (Draft, no vehicle/driver yet).
        // Fleet manager / driver can create a trip and directly pick vehicle+driver.
        require_role(array_merge(OPS_ROLES, ['customer']));
        $in = input();
        $source = trim($in['source'] ?? '');
        $dest = trim($in['destination'] ?? '');
        $cargo = floatval($in['cargo_weight'] ?? 0);
        $distance = floatval($in['planned_distance'] ?? 0);
        $vehicleId = intval($in['vehicle_id'] ?? 0);
        $driverId = intval($in['driver_id'] ?? 0);

        if (!$source || !$dest || $cargo <= 0 || $distance <= 0) {
            respond(false, null, 'Source, destination, cargo weight and planned distance are required.');
        }

        $vehicleId = $vehicleId ?: null;
        $driverId = $driverId ?: null;

        // If a vehicle was chosen up front, validate cargo weight against capacity
        if ($vehicleId) {
            $v = $pdo->prepare("SELECT * FROM vehicles WHERE id=?");
            $v->execute([$vehicleId]);
            $vehicle = $v->fetch();
            if (!$vehicle) respond(false, null, 'Selected vehicle not found.');
            if ($vehicle['status'] !== 'Available') respond(false, null, 'Selected vehicle is not Available.');
            if ($cargo > $vehicle['max_load_capacity']) {
                respond(false, null, "Cargo weight ({$cargo}kg) exceeds vehicle's max load capacity ({$vehicle['max_load_capacity']}kg).");
            }
        }
        if ($driverId) {
            $d = $pdo->prepare("SELECT * FROM drivers WHERE id=?");
            $d->execute([$driverId]);
            $driver = $d->fetch();
            if (!$driver) respond(false, null, 'Selected driver not found.');
            if ($driver['status'] !== 'Available') respond(false, null, 'Selected driver is not Available.');
            if ($driver['license_expiry'] < date('Y-m-d')) respond(false, null, 'Selected driver license has expired.');
        }

        $customerId = $_SESSION['role'] === 'customer' ? $_SESSION['user_id'] : null;

        $stmt = $pdo->prepare("INSERT INTO trips (source, destination, vehicle_id, driver_id, cargo_weight, planned_distance, customer_id, created_by, status) VALUES (?,?,?,?,?,?,?,?, 'Draft')");
        $stmt->execute([$source, $dest, $vehicleId, $driverId, $cargo, $distance, $customerId, $_SESSION['user_id']]);
        respond(true, ['message' => 'Trip created as Draft.', 'id' => $pdo->lastInsertId()]);
        break;
    }

    case 'trip_assign': { // fleet manager/driver attaches or changes vehicle+driver on a Draft trip
        require_role(OPS_ROLES);
        $in = input();
        $id = intval($in['id'] ?? 0);
        $vehicleId = intval($in['vehicle_id'] ?? 0);
        $driverId = intval($in['driver_id'] ?? 0);

        $t = $pdo->prepare("SELECT * FROM trips WHERE id=?");
        $t->execute([$id]);
        $trip = $t->fetch();
        if (!$trip) respond(false, null, 'Trip not found.');
        if ($trip['status'] !== 'Draft') respond(false, null, 'Only Draft trips can be assigned.');

        $v = $pdo->prepare("SELECT * FROM vehicles WHERE id=?");
        $v->execute([$vehicleId]);
        $vehicle = $v->fetch();
        if (!$vehicle) respond(false, null, 'Vehicle not found.');
        if ($vehicle['status'] !== 'Available') respond(false, null, 'Vehicle must be Available (Retired/In Shop/On Trip vehicles cannot be assigned).');
        if ($trip['cargo_weight'] > $vehicle['max_load_capacity']) {
            respond(false, null, "Cargo weight ({$trip['cargo_weight']}kg) exceeds vehicle's max load capacity ({$vehicle['max_load_capacity']}kg).");
        }

        $d = $pdo->prepare("SELECT * FROM drivers WHERE id=?");
        $d->execute([$driverId]);
        $driver = $d->fetch();
        if (!$driver) respond(false, null, 'Driver not found.');
        if ($driver['status'] !== 'Available') respond(false, null, 'Driver must be Available (Suspended/On Trip/Off Duty drivers cannot be assigned).');
        if ($driver['license_expiry'] < date('Y-m-d')) respond(false, null, 'Driver license has expired.');

        $pdo->prepare("UPDATE trips SET vehicle_id=?, driver_id=? WHERE id=?")->execute([$vehicleId, $driverId, $id]);
        respond(true, ['message' => 'Vehicle and driver assigned to trip.']);
        break;
    }

    case 'trip_dispatch': {
        require_role(OPS_ROLES);
        $id = intval((input())['id'] ?? 0);
        $t = $pdo->prepare("SELECT * FROM trips WHERE id=?");
        $t->execute([$id]);
        $trip = $t->fetch();
        if (!$trip) respond(false, null, 'Trip not found.');
        if ($trip['status'] !== 'Draft') respond(false, null, 'Only Draft trips can be dispatched.');
        if (!$trip['vehicle_id'] || !$trip['driver_id']) respond(false, null, 'Assign a vehicle and driver before dispatching.');

        $v = $pdo->prepare("SELECT * FROM vehicles WHERE id=?"); $v->execute([$trip['vehicle_id']]); $vehicle = $v->fetch();
        $d = $pdo->prepare("SELECT * FROM drivers WHERE id=?"); $d->execute([$trip['driver_id']]); $driver = $d->fetch();

        if (!$vehicle || $vehicle['status'] !== 'Available') respond(false, null, 'Vehicle is no longer Available.');
        if (!$driver || $driver['status'] !== 'Available') respond(false, null, 'Driver is no longer Available.');
        if ($driver['license_expiry'] < date('Y-m-d')) respond(false, null, 'Driver license has expired.');
        if ($trip['cargo_weight'] > $vehicle['max_load_capacity']) respond(false, null, 'Cargo weight exceeds vehicle max load capacity.');

        $pdo->beginTransaction();
        try {
            $pdo->prepare("UPDATE trips SET status='Dispatched', dispatched_at=NOW() WHERE id=?")->execute([$id]);
            $pdo->prepare("UPDATE vehicles SET status='On Trip' WHERE id=?")->execute([$vehicle['id']]);
            $pdo->prepare("UPDATE drivers SET status='On Trip' WHERE id=?")->execute([$driver['id']]);
            $pdo->commit();
        } catch (Exception $e) {
            $pdo->rollBack();
            respond(false, null, 'Dispatch failed: ' . $e->getMessage());
        }
        respond(true, ['message' => 'Trip dispatched. Vehicle and driver are now On Trip.']);
        break;
    }

    case 'trip_complete': {
        require_role(OPS_ROLES);
        $in = input();
        $id = intval($in['id'] ?? 0);
        $finalOdometer = floatval($in['final_odometer'] ?? 0);
        $fuelConsumed = floatval($in['fuel_consumed'] ?? 0);
        $revenue = floatval($in['revenue'] ?? 0);

        $t = $pdo->prepare("SELECT * FROM trips WHERE id=?");
        $t->execute([$id]);
        $trip = $t->fetch();
        if (!$trip) respond(false, null, 'Trip not found.');
        if ($trip['status'] !== 'Dispatched') respond(false, null, 'Only Dispatched trips can be completed.');

        $v = $pdo->prepare("SELECT * FROM vehicles WHERE id=?"); $v->execute([$trip['vehicle_id']]); $vehicle = $v->fetch();
        if ($finalOdometer && $finalOdometer < $vehicle['odometer']) {
            respond(false, null, 'Final odometer cannot be less than the current odometer (' . $vehicle['odometer'] . ').');
        }
        $actualDistance = $finalOdometer ? round($finalOdometer - $vehicle['odometer'], 2) : $trip['planned_distance'];

        $pdo->beginTransaction();
        try {
            $pdo->prepare("UPDATE trips SET status='Completed', completed_at=NOW(), actual_distance=?, fuel_consumed=?, revenue=? WHERE id=?")
                ->execute([$actualDistance, $fuelConsumed ?: null, $revenue, $id]);

            if ($finalOdometer) {
                $pdo->prepare("UPDATE vehicles SET status='Available', odometer=? WHERE id=?")->execute([$finalOdometer, $trip['vehicle_id']]);
            } else {
                $pdo->prepare("UPDATE vehicles SET status='Available' WHERE id=?")->execute([$trip['vehicle_id']]);
            }
            $pdo->prepare("UPDATE drivers SET status='Available' WHERE id=?")->execute([$trip['driver_id']]);

            if ($fuelConsumed > 0) {
                // auto log fuel usage against the vehicle for this trip (cost estimated at 100/L if not provided)
                $fuelCost = floatval($in['fuel_cost'] ?? ($fuelConsumed * 100));
                $pdo->prepare("INSERT INTO fuel_logs (vehicle_id, trip_id, liters, cost, log_date) VALUES (?,?,?,?,CURDATE())")
                    ->execute([$trip['vehicle_id'], $id, $fuelConsumed, $fuelCost]);
            }
            $pdo->commit();
        } catch (Exception $e) {
            $pdo->rollBack();
            respond(false, null, 'Completion failed: ' . $e->getMessage());
        }
        respond(true, ['message' => 'Trip completed. Vehicle and driver are now Available.']);
        break;
    }

    case 'trip_cancel': {
        require_role(array_merge(OPS_ROLES, ['customer']));
        $id = intval((input())['id'] ?? 0);
        $t = $pdo->prepare("SELECT * FROM trips WHERE id=?");
        $t->execute([$id]);
        $trip = $t->fetch();
        if (!$trip) respond(false, null, 'Trip not found.');
        if ($_SESSION['role'] === 'customer' && $trip['customer_id'] != $_SESSION['user_id']) respond(false, null, 'You can only cancel your own bookings.');
        if (!in_array($trip['status'], ['Draft', 'Dispatched'])) respond(false, null, 'Only Draft or Dispatched trips can be cancelled.');

        $pdo->beginTransaction();
        try {
            $pdo->prepare("UPDATE trips SET status='Cancelled' WHERE id=?")->execute([$id]);
            if ($trip['status'] === 'Dispatched') {
                if ($trip['vehicle_id']) $pdo->prepare("UPDATE vehicles SET status='Available' WHERE id=?")->execute([$trip['vehicle_id']]);
                if ($trip['driver_id']) $pdo->prepare("UPDATE drivers SET status='Available' WHERE id=?")->execute([$trip['driver_id']]);
            }
            $pdo->commit();
        } catch (Exception $e) {
            $pdo->rollBack();
            respond(false, null, 'Cancel failed: ' . $e->getMessage());
        }
        respond(true, ['message' => 'Trip cancelled.']);
        break;
    }

    // ============================ MAINTENANCE ============================
    case 'maintenance_list': {
        require_login();
        $sql = "SELECT m.*, v.reg_number, v.name AS vehicle_name FROM maintenance_logs m
                JOIN vehicles v ON v.id = m.vehicle_id ORDER BY m.id DESC";
        respond(true, $pdo->query($sql)->fetchAll());
        break;
    }

    case 'maintenance_create': {
        require_role(array_merge(MGMT_ROLES, ['safety_officer']));
        $in = input();
        $vehicleId = intval($in['vehicle_id'] ?? 0);
        $title = trim($in['title'] ?? '');
        $desc = trim($in['description'] ?? '');
        $cost = floatval($in['cost'] ?? 0);
        if (!$vehicleId || !$title) respond(false, null, 'Vehicle and title are required.');

        $v = $pdo->prepare("SELECT * FROM vehicles WHERE id=?"); $v->execute([$vehicleId]); $vehicle = $v->fetch();
        if (!$vehicle) respond(false, null, 'Vehicle not found.');
        if ($vehicle['status'] === 'On Trip') respond(false, null, 'Cannot log maintenance while vehicle is On Trip.');
        if ($vehicle['status'] === 'Retired') respond(false, null, 'Cannot log maintenance for a Retired vehicle.');

        $pdo->beginTransaction();
        try {
            $pdo->prepare("INSERT INTO maintenance_logs (vehicle_id, title, description, cost, status) VALUES (?,?,?,?, 'Active')")
                ->execute([$vehicleId, $title, $desc, $cost]);
            // Adding an active maintenance record automatically switches vehicle to In Shop
            $pdo->prepare("UPDATE vehicles SET status='In Shop' WHERE id=?")->execute([$vehicleId]);
            $pdo->commit();
        } catch (Exception $e) {
            $pdo->rollBack();
            respond(false, null, 'Failed: ' . $e->getMessage());
        }
        respond(true, ['message' => 'Maintenance logged. Vehicle moved to In Shop and hidden from dispatch.']);
        break;
    }

    case 'maintenance_close': {
        require_role(array_merge(MGMT_ROLES, ['safety_officer']));
        $id = intval((input())['id'] ?? 0);
        $m = $pdo->prepare("SELECT * FROM maintenance_logs WHERE id=?"); $m->execute([$id]); $rec = $m->fetch();
        if (!$rec) respond(false, null, 'Record not found.');
        if ($rec['status'] === 'Closed') respond(false, null, 'Already closed.');

        $pdo->beginTransaction();
        try {
            $pdo->prepare("UPDATE maintenance_logs SET status='Closed', closed_at=NOW() WHERE id=?")->execute([$id]);
            $v = $pdo->prepare("SELECT status FROM vehicles WHERE id=?"); $v->execute([$rec['vehicle_id']]); $vs = $v->fetch();
            // Closing maintenance restores vehicle to Available UNLESS it was Retired
            if ($vs && $vs['status'] !== 'Retired') {
                // only restore if no other active maintenance remains on this vehicle
                $chk = $pdo->prepare("SELECT COUNT(*) c FROM maintenance_logs WHERE vehicle_id=? AND status='Active'");
                $chk->execute([$rec['vehicle_id']]);
                if ($chk->fetch()['c'] == 0) {
                    $pdo->prepare("UPDATE vehicles SET status='Available' WHERE id=?")->execute([$rec['vehicle_id']]);
                }
            }
            $pdo->commit();
        } catch (Exception $e) {
            $pdo->rollBack();
            respond(false, null, 'Failed: ' . $e->getMessage());
        }
        respond(true, ['message' => 'Maintenance closed.']);
        break;
    }

    // ============================= FUEL LOGS =============================
    case 'fuel_list': {
        require_login();
        $sql = "SELECT f.*, v.reg_number, v.name AS vehicle_name FROM fuel_logs f
                JOIN vehicles v ON v.id=f.vehicle_id ORDER BY f.id DESC";
        respond(true, $pdo->query($sql)->fetchAll());
        break;
    }

    case 'fuel_create': {
        require_role(array_merge(OPS_ROLES, FIN_ROLES));
        $in = input();
        $vehicleId = intval($in['vehicle_id'] ?? 0);
        $liters = floatval($in['liters'] ?? 0);
        $cost = floatval($in['cost'] ?? 0);
        $date = $in['log_date'] ?? date('Y-m-d');
        if (!$vehicleId || $liters <= 0 || $cost <= 0) respond(false, null, 'Vehicle, liters and cost are required.');
        $pdo->prepare("INSERT INTO fuel_logs (vehicle_id, liters, cost, log_date) VALUES (?,?,?,?)")
            ->execute([$vehicleId, $liters, $cost, $date]);
        respond(true, ['message' => 'Fuel log recorded.']);
        break;
    }

    // ============================= EXPENSES =============================
    case 'expenses_list': {
        require_login();
        $sql = "SELECT e.*, v.reg_number, v.name AS vehicle_name FROM expenses e
                JOIN vehicles v ON v.id=e.vehicle_id ORDER BY e.id DESC";
        respond(true, $pdo->query($sql)->fetchAll());
        break;
    }

    case 'expense_create': {
        require_role(array_merge(OPS_ROLES, FIN_ROLES));
        $in = input();
        $vehicleId = intval($in['vehicle_id'] ?? 0);
        $type = trim($in['type'] ?? '');
        $amount = floatval($in['amount'] ?? 0);
        $date = $in['expense_date'] ?? date('Y-m-d');
        $desc = trim($in['description'] ?? '');
        if (!$vehicleId || !$type || $amount <= 0) respond(false, null, 'Vehicle, type and amount are required.');
        $pdo->prepare("INSERT INTO expenses (vehicle_id, type, amount, expense_date, description) VALUES (?,?,?,?,?)")
            ->execute([$vehicleId, $type, $amount, $date, $desc]);
        respond(true, ['message' => 'Expense recorded.']);
        break;
    }

    // ============================== REPORTS ==============================
    case 'reports': {
        require_role(array_merge(FIN_ROLES, ['safety_officer', 'driver']));
        $vehicles = $pdo->query("SELECT * FROM vehicles")->fetchAll();
        $report = [];
        foreach ($vehicles as $v) {
            $fuel = $pdo->prepare("SELECT COALESCE(SUM(liters),0) l, COALESCE(SUM(cost),0) c FROM fuel_logs WHERE vehicle_id=?");
            $fuel->execute([$v['id']]);
            $fuelRow = $fuel->fetch();

            $maint = $pdo->prepare("SELECT COALESCE(SUM(cost),0) c FROM maintenance_logs WHERE vehicle_id=?");
            $maint->execute([$v['id']]);
            $maintCost = $maint->fetch()['c'];

            $exp = $pdo->prepare("SELECT COALESCE(SUM(amount),0) c FROM expenses WHERE vehicle_id=?");
            $exp->execute([$v['id']]);
            $expCost = $exp->fetch()['c'];

            $dist = $pdo->prepare("SELECT COALESCE(SUM(actual_distance),0) d, COALESCE(SUM(revenue),0) r, COUNT(*) trips FROM trips WHERE vehicle_id=? AND status='Completed'");
            $dist->execute([$v['id']]);
            $distRow = $dist->fetch();

            $fuelEfficiency = $fuelRow['l'] > 0 ? round($distRow['d'] / $fuelRow['l'], 2) : 0;
            $operationalCost = round($fuelRow['c'] + $maintCost + $expCost, 2);
            $roi = $v['acquisition_cost'] > 0
                ? round((($distRow['r'] - ($maintCost + $fuelRow['c'])) / $v['acquisition_cost']) * 100, 2)
                : 0;

            $report[] = [
                'vehicle_id' => $v['id'],
                'reg_number' => $v['reg_number'],
                'name' => $v['name'],
                'status' => $v['status'],
                'total_distance' => (float)$distRow['d'],
                'total_fuel_liters' => (float)$fuelRow['l'],
                'fuel_cost' => (float)$fuelRow['c'],
                'fuel_efficiency_km_per_l' => $fuelEfficiency,
                'maintenance_cost' => (float)$maintCost,
                'other_expenses' => (float)$expCost,
                'operational_cost' => $operationalCost,
                'revenue' => (float)$distRow['r'],
                'completed_trips' => (int)$distRow['trips'],
                'roi_percent' => $roi,
            ];
        }

        $totalVehicles = count($vehicles);
        $onTrip = count(array_filter($vehicles, fn($v) => $v['status'] === 'On Trip'));
        $fleetUtilization = $totalVehicles > 0 ? round(($onTrip / $totalVehicles) * 100, 1) : 0;

        respond(true, ['vehicles' => $report, 'fleet_utilization' => $fleetUtilization]);
        break;
    }

    case 'reports_csv': {
        require_role(array_merge(FIN_ROLES, ['safety_officer', 'driver']));
        // Reuse the same aggregation as 'reports'
        $vehicles = $pdo->query("SELECT * FROM vehicles")->fetchAll();
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="transitops_report.csv"');
        $out = fopen('php://output', 'w');
        fputcsv($out, ['Reg Number','Name','Status','Total Distance (km)','Fuel (L)','Fuel Cost','Fuel Efficiency (km/L)','Maintenance Cost','Other Expenses','Operational Cost','Revenue','Completed Trips','ROI (%)']);
        foreach ($vehicles as $v) {
            $fuel = $pdo->prepare("SELECT COALESCE(SUM(liters),0) l, COALESCE(SUM(cost),0) c FROM fuel_logs WHERE vehicle_id=?");
            $fuel->execute([$v['id']]); $fuelRow = $fuel->fetch();
            $maint = $pdo->prepare("SELECT COALESCE(SUM(cost),0) c FROM maintenance_logs WHERE vehicle_id=?");
            $maint->execute([$v['id']]); $maintCost = $maint->fetch()['c'];
            $exp = $pdo->prepare("SELECT COALESCE(SUM(amount),0) c FROM expenses WHERE vehicle_id=?");
            $exp->execute([$v['id']]); $expCost = $exp->fetch()['c'];
            $dist = $pdo->prepare("SELECT COALESCE(SUM(actual_distance),0) d, COALESCE(SUM(revenue),0) r, COUNT(*) trips FROM trips WHERE vehicle_id=? AND status='Completed'");
            $dist->execute([$v['id']]); $distRow = $dist->fetch();
            $fuelEfficiency = $fuelRow['l'] > 0 ? round($distRow['d'] / $fuelRow['l'], 2) : 0;
            $operationalCost = round($fuelRow['c'] + $maintCost + $expCost, 2);
            $roi = $v['acquisition_cost'] > 0 ? round((($distRow['r'] - ($maintCost + $fuelRow['c'])) / $v['acquisition_cost']) * 100, 2) : 0;
            fputcsv($out, [$v['reg_number'], $v['name'], $v['status'], $distRow['d'], $fuelRow['l'], $fuelRow['c'], $fuelEfficiency, $maintCost, $expCost, $operationalCost, $distRow['r'], $distRow['trips'], $roi]);
        }
        fclose($out);
        exit;
    }

    // ============================== USERS (fleet manager admin) ============
    case 'users_list': {
        require_role(MGMT_ROLES);
        respond(true, $pdo->query("SELECT id, name, email, role, contact, status, created_at FROM users ORDER BY id DESC")->fetchAll());
        break;
    }

    case 'user_status': {
        require_role(MGMT_ROLES);
        $in = input();
        $id = intval($in['id'] ?? 0);
        $status = $in['status'] ?? 'active';
        if (!in_array($status, ['active','inactive'])) respond(false, null, 'Invalid status.');
        $pdo->prepare("UPDATE users SET status=? WHERE id=?")->execute([$status, $id]);
        respond(true, ['message' => 'User status updated.']);
        break;
    }

    default:
        respond(false, null, 'Unknown action: ' . htmlspecialchars($action));
}
