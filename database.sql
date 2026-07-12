-- =====================================================================
-- TransitOps - Smart Transport Operations Platform
-- Database Schema (MySQL)
-- =====================================================================
-- Import this file first (phpMyAdmin -> Import, or:
--   mysql -u root -p < database.sql
-- =====================================================================

DROP DATABASE IF EXISTS transitops;
CREATE DATABASE transitops CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE transitops;

-- ---------------------------------------------------------------------
-- USERS  (Authentication + RBAC)
-- Roles: fleet_manager, driver, safety_officer, financial_analyst, customer
-- ---------------------------------------------------------------------
CREATE TABLE users (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(120) NOT NULL,
    email         VARCHAR(150) NOT NULL UNIQUE,
    password      VARCHAR(255) NOT NULL,
    role          ENUM('fleet_manager','driver','safety_officer','financial_analyst','customer') NOT NULL,
    contact       VARCHAR(30)  DEFAULT NULL,
    status        ENUM('active','inactive') NOT NULL DEFAULT 'active',
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- VEHICLES  (Vehicle Registry)
-- ---------------------------------------------------------------------
CREATE TABLE vehicles (
    id                 INT AUTO_INCREMENT PRIMARY KEY,
    reg_number         VARCHAR(40) NOT NULL UNIQUE,
    name               VARCHAR(120) NOT NULL,
    type               VARCHAR(60)  NOT NULL,
    max_load_capacity  DECIMAL(10,2) NOT NULL,
    odometer           DECIMAL(12,2) NOT NULL DEFAULT 0,
    acquisition_cost   DECIMAL(14,2) NOT NULL DEFAULT 0,
    region             VARCHAR(80)  DEFAULT NULL,
    status             ENUM('Available','On Trip','In Shop','Retired') NOT NULL DEFAULT 'Available',
    created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- DRIVERS  (Driver Management)
-- ---------------------------------------------------------------------
CREATE TABLE drivers (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    user_id           INT DEFAULT NULL,               -- optional link to a login account (role=driver)
    name              VARCHAR(120) NOT NULL,
    license_number    VARCHAR(60) NOT NULL UNIQUE,
    license_category  VARCHAR(30) NOT NULL,
    license_expiry    DATE NOT NULL,
    contact_number    VARCHAR(30) NOT NULL,
    safety_score      DECIMAL(5,2) NOT NULL DEFAULT 100,
    status            ENUM('Available','On Trip','Off Duty','Suspended') NOT NULL DEFAULT 'Available',
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- TRIPS  (Trip Management / Bookings)
-- Lifecycle: Draft -> Dispatched -> Completed / Cancelled
-- A trip may be created by a Customer (booking request) or directly by
-- a Driver / Fleet Manager.
-- ---------------------------------------------------------------------
CREATE TABLE trips (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    source            VARCHAR(150) NOT NULL,
    destination       VARCHAR(150) NOT NULL,
    vehicle_id        INT DEFAULT NULL,
    driver_id         INT DEFAULT NULL,
    cargo_weight      DECIMAL(10,2) NOT NULL,
    planned_distance  DECIMAL(10,2) NOT NULL,
    actual_distance   DECIMAL(10,2) DEFAULT NULL,
    fuel_consumed     DECIMAL(10,2) DEFAULT NULL,
    revenue           DECIMAL(14,2) NOT NULL DEFAULT 0,
    status            ENUM('Draft','Dispatched','Completed','Cancelled') NOT NULL DEFAULT 'Draft',
    customer_id       INT DEFAULT NULL,
    created_by        INT DEFAULT NULL,
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    dispatched_at     DATETIME DEFAULT NULL,
    completed_at      DATETIME DEFAULT NULL,
    FOREIGN KEY (vehicle_id)  REFERENCES vehicles(id) ON DELETE SET NULL,
    FOREIGN KEY (driver_id)   REFERENCES drivers(id)  ON DELETE SET NULL,
    FOREIGN KEY (customer_id) REFERENCES users(id)    ON DELETE SET NULL,
    FOREIGN KEY (created_by)  REFERENCES users(id)    ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- MAINTENANCE LOGS
-- ---------------------------------------------------------------------
CREATE TABLE maintenance_logs (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    vehicle_id    INT NOT NULL,
    title         VARCHAR(150) NOT NULL,
    description   TEXT,
    cost          DECIMAL(12,2) NOT NULL DEFAULT 0,
    status        ENUM('Active','Closed') NOT NULL DEFAULT 'Active',
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    closed_at     DATETIME DEFAULT NULL,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- FUEL LOGS
-- ---------------------------------------------------------------------
CREATE TABLE fuel_logs (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    vehicle_id    INT NOT NULL,
    trip_id       INT DEFAULT NULL,
    liters        DECIMAL(10,2) NOT NULL,
    cost          DECIMAL(12,2) NOT NULL,
    log_date      DATE NOT NULL,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
    FOREIGN KEY (trip_id)    REFERENCES trips(id)    ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- EXPENSES  (tolls, fines, misc costs - maintenance handled separately)
-- ---------------------------------------------------------------------
CREATE TABLE expenses (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    vehicle_id    INT NOT NULL,
    type          VARCHAR(60) NOT NULL,      -- Toll, Fine, Parking, Other...
    amount        DECIMAL(12,2) NOT NULL,
    expense_date  DATE NOT NULL,
    description   VARCHAR(255) DEFAULT NULL,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================================
-- SEED DATA
-- Demo LOGIN users are NOT inserted here (bcrypt hashes must be produced
-- by PHP so they are guaranteed to verify correctly). api.php auto-creates
-- the 5 demo accounts the very first time it runs against an empty users
-- table, all with the password:  Pass@123
--   fleetmanager@transitops.com  -> fleet_manager
--   driver@transitops.com        -> driver
--   safety@transitops.com        -> safety_officer
--   finance@transitops.com       -> financial_analyst
--   customer@transitops.com      -> customer
-- You can also just click "Create account" on the login screen.
-- =====================================================================

INSERT INTO vehicles (reg_number, name, type, max_load_capacity, odometer, acquisition_cost, region, status) VALUES
('VAN-05', 'Tata Ace Van',        'Van',    500.00,  12500.00, 650000.00, 'North', 'Available'),
('TRK-11', 'Ashok Leyland Truck', 'Truck',  5000.00, 40200.00, 2200000.00,'West',  'Available'),
('VAN-09', 'Mahindra Bolero Pickup','Pickup',1000.00, 8900.00, 800000.00, 'South', 'Available');

INSERT INTO drivers (name, license_number, license_category, license_expiry, contact_number, safety_score, status) VALUES
('Alex Driver',  'DL-1001', 'LMV', '2027-05-30', '9990000002', 96.5, 'Available'),
('Ravi Kumar',   'DL-1002', 'HMV', '2026-12-15', '9812345678', 89.0, 'Available'),
('Meena Shah',   'DL-1003', 'LMV', '2025-01-01', '9823456789', 91.2, 'Available');
