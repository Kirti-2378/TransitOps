TransitOps - Smart Transport Operations Platform
==================================================
Stack: HTML + CSS + JavaScript (frontend) + PHP (API) + MySQL (database)
Files (put all 5 in the SAME folder):
  1. index.html   - the whole UI (login + app)
  2. style.css     - all styling
  3. app.js        - all frontend logic (fetch calls to api.php)
  4. api.php       - the entire backend (auth, RBAC, business rules, CRUD, reports)
  5. database.sql  - MySQL schema

HOW TO RUN (XAMPP / WAMP / LAMP / any PHP+MySQL server)
---------------------------------------------------------
1. Install XAMPP (or similar) and start Apache + MySQL.
2. Copy this whole folder into your server's web root, e.g.:
     Windows (XAMPP): C:\xampp\htdocs\TransitOps
     Linux/Mac:        /var/www/html/TransitOps
3. Create the database:
     - Open phpMyAdmin -> Import -> choose database.sql -> Go
       (or run:  mysql -u root -p < database.sql)
4. Open api.php and check the DB_* constants match your MySQL setup
   (defaults: host=localhost, db=transitops, user=root, pass="").
5. In your browser, go to:  http://localhost/TransitOps/index.html
   (Do NOT open index.html directly as a file:// URL - PHP needs a server.)
6. The first time api.php runs it auto-creates 5 demo logins (password: Pass@123):
     fleetmanager@transitops.com   -> Fleet Manager
     driver@transitops.com          -> Driver
     safety@transitops.com          -> Safety Officer
     finance@transitops.com         -> Financial Analyst
     customer@transitops.com        -> Customer
   You can also click "Create account" on the login screen to sign up as any role.

ROLES & WHAT THEY CAN DO
---------------------------------------------------------
Fleet Manager      - full access: vehicles, drivers, trips, maintenance, fuel/expenses,
                      reports, user management.
Driver              - create trips, assign vehicle/driver, dispatch/complete trips,
                      view vehicles & drivers.
Safety Officer      - manage drivers, log/close maintenance, monitor license expiry
                      and safety scores.
Financial Analyst   - log fuel & expenses, view reports/CSV export.
Customer (NEW)      - submit booking requests (source/destination/cargo/distance),
                      track status of own bookings, cancel own Draft/Dispatched bookings.
                      A Fleet Manager / Driver then assigns a vehicle & driver and
                      dispatches the booking on the customer's behalf.

BUSINESS RULES ENFORCED IN api.php
---------------------------------------------------------
- Vehicle registration number is unique.
- Retired / In Shop vehicles never appear in dispatch dropdowns.
- Suspended drivers or drivers with an expired license cannot be assigned.
- A vehicle/driver already On Trip cannot be assigned to another trip.
- Cargo weight cannot exceed the vehicle's max load capacity.
- Dispatch -> vehicle & driver become "On Trip".
- Complete -> vehicle & driver become "Available" again (+ odometer updated).
- Cancel a Dispatched trip -> restores vehicle & driver to "Available".
- Creating maintenance -> vehicle becomes "In Shop" (hidden from dispatch).
- Closing maintenance -> vehicle becomes "Available" again (unless Retired).
- Reports: Fuel Efficiency (km/L), Fleet Utilization (%), Operational Cost
  (Fuel + Maintenance + Expenses), and Vehicle ROI = (Revenue - (Maintenance+Fuel)) / Acquisition Cost.
- CSV export available from the Reports page.

NOTES
---------------------------------------------------------
- All passwords are hashed with PHP's password_hash() (bcrypt) - never stored in plain text.
- Sessions are used for login state (PHP native sessions + RBAC checks on every API call).
- All database access uses PDO prepared statements (SQL-injection safe).
