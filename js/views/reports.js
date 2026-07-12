import { stateStore } from '../state.js';
import { showToast } from './login.js';

export function renderReports(container, user) {
  const state = stateStore.state;

  let html = `
    <div class="reports-view">
      
      <!-- Toolbar -->
      <div class="directory-actions-bar" style="margin-bottom:32px;">
        <h3>Operational Insights & Analytics</h3>
        <div style="display:flex; gap:12px;">
          <button class="btn btn-secondary" id="btn-export-fleet-csv" style="width:auto;">
            <i data-lucide="download" style="width:14px; height:14px; margin-right:4px;"></i> Export Fleet Details (CSV)
          </button>
          <button class="btn btn-secondary" id="btn-export-trips-csv" style="width:auto;">
            <i data-lucide="download" style="width:14px; height:14px; margin-right:4px;"></i> Export Dispatches (CSV)
          </button>
        </div>
      </div>

      <!-- Charts grid Row 1 -->
      <div class="reports-grid">
        
        <!-- Stacked Operational Cost per Vehicle -->
        <div class="chart-card">
          <h3>Cumulative Cost Breakdown per Vehicle</h3>
          <div class="chart-wrapper">
            <canvas id="cost-breakdown-chart"></canvas>
          </div>
        </div>

        <!-- Vehicle ROI -->
        <div class="chart-card">
          <h3>Vehicle Asset Return on Investment (ROI)</h3>
          <div class="chart-wrapper">
            <canvas id="vehicle-roi-chart"></canvas>
          </div>
        </div>

      </div>

      <!-- Charts grid Row 2 -->
      <div class="reports-grid" style="margin-top: 24px;">
        
        <!-- Fuel Efficiency Metrics -->
        <div class="chart-card">
          <h3>Fleet Fuel Efficiency Metrics</h3>
          <p style="font-size:0.8rem; color:var(--text-secondary); margin-bottom:16px;">
            Calculates average Fuel Efficiency (Kilometers driven per Liter of Fuel consumed). Higher is better.
          </p>
          <div style="display:flex; flex-direction:column; gap:12px; max-height:220px; overflow-y:auto; padding-right:4px;">
            ${state.vehicles.filter(v => v.status !== 'Retired').map(v => {
              // Gather total mileage & fuel consumed across completed trips
              const completedTrips = state.trips.filter(t => t.vehicleId === v.id && t.status === 'Completed');
              const totalDist = completedTrips.reduce((sum, t) => sum + t.plannedDistance, 0);
              const totalFuel = completedTrips.reduce((sum, t) => sum + (t.fuelConsumedLiters || 0), 0);
              
              const efficiency = totalFuel > 0 
                ? (totalDist / totalFuel).toFixed(2)
                : 'N/A (No Trip Data)';

              return `
                <div style="display:flex; justify-content:space-between; align-items:center; border:1px solid var(--border-color); padding:10px 14px; border-radius:var(--radius-md); background:var(--bg-secondary);">
                  <div>
                    <h5 style="font-size:0.85rem;">${v.name} (<code>${v.registrationNumber}</code>)</h5>
                    <span style="font-size:0.75rem; color:var(--text-muted);">Completed trips: ${completedTrips.length} | Miles Cover: ${totalDist} km</span>
                  </div>
                  <span style="font-weight:700; color:${efficiency !== 'N/A (No Trip Data)' ? '#10b981' : 'var(--text-muted)'}; font-size:0.9rem;">
                    ${efficiency !== 'N/A (No Trip Data)' ? `${efficiency} km/L` : efficiency}
                  </span>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Fleet Utilization Levels -->
        <div class="chart-card">
          <h3>Fleet Operations Capacity</h3>
          <div class="chart-wrapper">
            <canvas id="fleet-util-chart"></canvas>
          </div>
        </div>

      </div>

    </div>
  `;

  container.innerHTML = html;

  if (window.lucide) {
    window.lucide.createIcons();
  }

  // Draw Charts
  drawCostBreakdownChart(state);
  drawRoiChart(state);
  drawUtilizationChart(state);

  // Bind exports
  document.getElementById('btn-export-fleet-csv').addEventListener('click', () => {
    exportCSV('TransitOps_Fleet_Report.csv', [
      ['Registration', 'Model', 'Type', 'Region', 'Capacity (kg)', 'Odometer (km)', 'Acquisition Cost ($)', 'Cumulative Expenses ($)', 'Status'],
      ...state.vehicles.map(v => [
        v.registrationNumber,
        v.name,
        v.type,
        v.region,
        v.maxLoadCapacity,
        v.currentOdometer,
        v.acquisitionCost,
        stateStore.getVehicleTotalCost(v.id),
        v.status
      ])
    ]);
  });

  document.getElementById('btn-export-trips-csv').addEventListener('click', () => {
    exportCSV('TransitOps_Trips_Report.csv', [
      ['Trip ID', 'Source', 'Destination', 'Vehicle', 'Driver', 'Cargo Load (kg)', 'Planned Dist (km)', 'Revenue ($)', 'Fuel Consumed (L)', 'Status', 'Date'],
      ...state.trips.map(t => {
        const v = state.vehicles.find(vh => vh.id === t.vehicleId);
        const d = state.drivers.find(dr => dr.id === t.driverId);
        return [
          t.id,
          t.source,
          t.destination,
          v?.registrationNumber || 'N/A',
          d?.name || 'N/A',
          t.cargoWeight,
          t.plannedDistance,
          t.estimatedRevenue,
          t.fuelConsumedLiters || 'N/A',
          t.status,
          t.date
        ];
      })
    ]);
  });
}

function drawCostBreakdownChart(state) {
  const canvas = document.getElementById('cost-breakdown-chart');
  if (!canvas) return;

  const labels = [];
  const fuelData = [];
  const maintData = [];
  const otherData = [];

  state.vehicles.filter(v => v.status !== 'Retired').forEach(v => {
    labels.push(v.registrationNumber);
    
    const fuel = state.fuelLogs.filter(f => f.vehicleId === v.id).reduce((sum, f) => sum + f.cost, 0);
    const maint = state.maintenanceLogs.filter(l => l.vehicleId === v.id).reduce((sum, l) => sum + l.cost, 0);
    const other = state.expenses.filter(e => e.vehicleId === v.id && e.type !== 'Fuel' && e.type !== 'Maintenance').reduce((sum, e) => sum + e.cost, 0);
    
    fuelData.push(fuel);
    maintData.push(maint);
    otherData.push(other);
  });

  new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Fuel Costs', data: fuelData, backgroundColor: '#6366f1' },
        { label: 'Maintenance Workshop', data: maintData, backgroundColor: '#f59e0b' },
        { label: 'Tolls & Other', data: otherData, backgroundColor: '#a855f7' }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { stacked: true, ticks: { color: 'var(--text-secondary)' }, grid: { display: false } },
        y: { stacked: true, ticks: { color: 'var(--text-secondary)' }, grid: { color: 'var(--border-color)' } }
      },
      plugins: {
        legend: { labels: { color: 'var(--text-secondary)' } }
      }
    }
  });
}

function drawRoiChart(state) {
  const canvas = document.getElementById('vehicle-roi-chart');
  if (!canvas) return;

  const labels = [];
  const data = [];
  const colors = [];

  state.vehicles.filter(v => v.status !== 'Retired').forEach(v => {
    labels.push(v.registrationNumber);

    const totalCost = stateStore.getVehicleTotalCost(v.id);
    const revenue = state.trips
      .filter(t => t.vehicleId === v.id && t.status === 'Completed')
      .reduce((sum, t) => sum + t.estimatedRevenue, 0);

    const roi = v.acquisitionCost > 0
      ? parseFloat((((revenue - totalCost) / v.acquisitionCost) * 100).toFixed(2))
      : 0;

    data.push(roi);
    colors.push(roi >= 0 ? '#10b981' : '#ef4444'); // Green if positive, Red if negative
  });

  new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Return on Investment (ROI %)',
        data,
        backgroundColor: colors,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: { ticks: { color: 'var(--text-secondary)' }, grid: { display: false } },
        y: { ticks: { color: 'var(--text-secondary)' }, grid: { color: 'var(--border-color)' } }
      }
    }
  });
}

function drawUtilizationChart(state) {
  const canvas = document.getElementById('fleet-util-chart');
  if (!canvas) return;

  const active = state.vehicles.filter(v => v.status === 'On Trip').length;
  const avail = state.vehicles.filter(v => v.status === 'Available').length;
  const shop = state.vehicles.filter(v => v.status === 'In Shop').length;

  new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: ['On Road', 'Standby', 'Workshop Shop'],
      datasets: [{
        data: [active, avail, shop],
        backgroundColor: ['#6366f1', '#10b981', '#f59e0b'],
        borderWidth: 1,
        borderColor: 'var(--bg-card)'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { color: 'var(--text-secondary)' }
        }
      }
    }
  });
}

function exportCSV(filename, rows) {
  const content = rows.map(r => r.map(val => {
    let clean = String(val).replace(/"/g, '""');
    if (clean.includes(',') || clean.includes('\n')) {
      clean = `"${clean}"`;
    }
    return clean;
  }).join(',')).join('\n');

  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  showToast(`${filename} downloaded.`, 'success');
}
