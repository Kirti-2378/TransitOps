import { stateStore } from '../state.js';
import { showToast } from './login.js';

export function renderBookings(container, user) {
  const state = stateStore.state;
  const bookableAssets = state.assets.filter(a => a.isBookable);
  const activeBookings = state.bookings.filter(b => b.status !== 'Cancelled').sort((a,b) => new Date(a.startTime) - new Date(b.startTime));

  // Determine current calendar month/year context
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0-indexed

  let html = `
    <div class="bookings-wrapper">
      
      <div class="grid-3" style="grid-template-columns: 320px 1fr; gap:24px;">
        
        <!-- Booking Form Panel -->
        <div>
          <div class="chart-card">
            <h3>Book Shared Resource</h3>
            <p style="font-size:0.8rem; color:var(--text-secondary); margin-bottom:16px;">
              Reserve rooms, vehicles, or equipment. Overlapping bookings will be rejected.
            </p>

            <form id="booking-submit-form">
              <div class="form-group">
                <label for="book-asset-id">Resource</label>
                <select id="book-asset-id" class="select-control" style="width:100%; height:42px;" required>
                  <option value="">-- Choose Resource --</option>
                  ${bookableAssets.map(a => `<option value="${a.id}">${a.name} (${a.location})</option>`).join('')}
                </select>
              </div>

              <div class="form-group">
                <label for="book-date">Date</label>
                <input type="date" id="book-date" class="form-control form-control-noicon" required min="${today.toISOString().split('T')[0]}" value="${today.toISOString().split('T')[0]}">
              </div>

              <div class="grid-2">
                <div class="form-group">
                  <label for="book-start-time">Start Time</label>
                  <input type="time" id="book-start-time" class="form-control form-control-noicon" required value="09:00">
                </div>
                <div class="form-group">
                  <label for="book-end-time">End Time</label>
                  <input type="time" id="book-end-time" class="form-control form-control-noicon" required value="10:00">
                </div>
              </div>

              ${user.role === 'Department Head' ? `
                <div class="form-group" style="margin-top: 8px;">
                  <label style="display:flex; align-items:center; gap:8px;">
                    <input type="checkbox" id="book-dept-behalf" style="accent-color: var(--accent-primary); width:18px; height:18px;">
                    <span>Book on behalf of my Department</span>
                  </label>
                </div>
              ` : ''}

              <button type="submit" class="btn btn-primary" style="margin-top: 16px;">Confirm Reservation</button>
            </form>
          </div>

          <!-- Existing Bookings Status List -->
          <div class="chart-card" style="margin-top: 24px;">
            <h3>My Bookings & Status</h3>
            <div style="display:flex; flex-direction:column; gap:12px; max-height:250px; overflow-y:auto; padding-right:4px;">
              ${state.bookings.filter(b => b.bookedById === user.id || (user.role === 'Admin' || user.role === 'Asset Manager')).map(b => {
                const asset = state.assets.find(a => a.id === b.assetId);
                const booker = state.users.find(u => u.id === b.bookedById)?.name || 'Someone';
                let statColor = '#3b82f6';
                if (b.status === 'Ongoing') statColor = '#10b981';
                if (b.status === 'Cancelled') statColor = '#6b7280';
                if (b.status === 'Completed') statColor = '#9ca3af';

                return `
                  <div style="border: 1px solid var(--border-color); padding: 10px 14px; border-radius: var(--radius-md); background: var(--bg-secondary); position:relative;">
                    <h5 style="font-size:0.9rem; margin-bottom:2px;">${asset?.name || 'Deleted Resource'}</h5>
                    <span style="font-size:0.75rem; color:var(--text-secondary); display:block;">
                      ${formatBookingTime(b.startTime, b.endTime)}
                    </span>
                    <span style="font-size:0.7rem; color:var(--text-muted); display:block;">Booked by: ${booker}</span>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
                      <span style="font-size:0.75rem; color:${statColor}; font-weight:600;">● ${b.status}</span>
                      ${(b.status === 'Upcoming' || b.status === 'Ongoing') ? `
                        <button class="btn btn-secondary btn-sm cancel-bkg-btn" data-id="${b.id}" style="padding: 2px 6px; font-size:0.75rem; border-color: rgba(239,68,68,0.2); color:#ef4444;">
                          Cancel
                        </button>
                      ` : ''}
                    </div>
                  </div>
                `;
              }).join('')}
              ${state.bookings.length === 0 ? `
                <p style="text-align:center; padding:20px; color:var(--text-secondary); font-size:0.8rem;">No bookings scheduled.</p>
              ` : ''}
            </div>
          </div>
        </div>

        <!-- Interactive Monthly Calendar View -->
        <div>
          <div class="calendar-view" style="margin-top: 0; min-height: 100%;">
            <div class="calendar-header">
              <h3 id="calendar-month-title">${today.toLocaleString('default', { month: 'long' })} ${currentYear}</h3>
              <div style="display:flex; gap:12px; align-items:center;">
                <label for="calendar-resource-filter" style="font-size:0.85rem; color:var(--text-secondary); font-weight:500;">Filter Resource:</label>
                <select id="calendar-resource-filter" class="select-control" style="padding: 6px 12px; font-size:0.85rem;">
                  <option value="">All Shared Resources</option>
                  ${bookableAssets.map(a => `<option value="${a.id}">${a.name}</option>`).join('')}
                </select>
              </div>
            </div>

            <div class="calendar-grid" id="calendar-grid-cells">
              <!-- Grid Header -->
              <div class="calendar-day-label">Sun</div>
              <div class="calendar-day-label">Mon</div>
              <div class="calendar-day-label">Tue</div>
              <div class="calendar-day-label">Wed</div>
              <div class="calendar-day-label">Thu</div>
              <div class="calendar-day-label">Fri</div>
              <div class="calendar-day-label">Sat</div>

              <!-- Cells rendered by JS -->
            </div>

            <!-- Daily Timeline Heatmap visualization -->
            <div class="booking-timeline-container">
              <h4 style="margin-bottom:12px;">Visual Booking Timeline (Today)</h4>
              <div id="timeline-rows-container">
                <!-- Timelines rendered by JS -->
              </div>
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

  // --- Render Calendar Grid Cells ---
  const resourceFilter = document.getElementById('calendar-resource-filter');
  
  const drawCalendar = () => {
    const filterAssetId = resourceFilter.value;
    const grid = document.getElementById('calendar-grid-cells');
    
    // Clear dynamic cells but keep header labels
    const labels = grid.querySelectorAll('.calendar-day-label');
    grid.innerHTML = '';
    labels.forEach(l => grid.appendChild(l));

    // Get first day of the month
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();

    // Previous month padding
    const prevMonthTotalDays = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = firstDay - 1; i >= 0; i--) {
      const cell = document.createElement('div');
      cell.className = 'calendar-cell other-month';
      cell.innerHTML = `<span class="calendar-date-number">${prevMonthTotalDays - i}</span>`;
      grid.appendChild(cell);
    }

    // Current month days
    for (let day = 1; day <= totalDays; day++) {
      const cell = document.createElement('div');
      cell.className = 'calendar-cell';
      
      const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
      if (isToday) cell.classList.add('today');

      cell.innerHTML = `<span class="calendar-date-number">${day}</span>`;

      // Filter and append events for this day
      const dayDateStr = `${currentYear}-${String(currentMonth + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      
      const dayBookings = activeBookings.filter(b => {
        const startDayStr = b.startTime.split('T')[0];
        const matchAsset = !filterAssetId || b.assetId === filterAssetId;
        return startDayStr === dayDateStr && matchAsset;
      });

      const eventsWrapper = document.createElement('div');
      eventsWrapper.className = 'calendar-events';

      dayBookings.forEach(b => {
        const asset = state.assets.find(a => a.id === b.assetId);
        const startHour = b.startTime.split('T')[1];
        
        const pill = document.createElement('div');
        pill.className = 'calendar-event-pill';
        pill.textContent = `${startHour} - ${asset?.name || 'Asset'}`;
        pill.title = `${asset?.name} booked by ${state.users.find(u=>u.id===b.bookedById)?.name || 'Someone'} (${formatBookingTime(b.startTime, b.endTime)})`;
        eventsWrapper.appendChild(pill);
      });

      cell.appendChild(eventsWrapper);
      grid.appendChild(cell);
    }
  };

  // --- Render Visual Timeline ---
  const drawTimeline = () => {
    const containerRows = document.getElementById('timeline-rows-container');
    containerRows.innerHTML = '';
    
    // Header row showing ticks for 08:00 - 18:00
    const headerRow = document.createElement('div');
    headerRow.className = 'timeline-row';
    headerRow.innerHTML = `
      <div class="timeline-resource-header" style="background:transparent; font-size:0.8rem; color:var(--text-muted);">Resource</div>
      <div class="timeline-slots">
        ${Array.from({length: 11}, (_, i) => `<div class="timeline-slot-tick">${String(i + 8).padStart(2,'0')}:00</div>`).join('')}
      </div>
    `;
    containerRows.appendChild(headerRow);

    const filterAssetId = resourceFilter.value;
    const targetResources = filterAssetId 
      ? bookableAssets.filter(a => a.id === filterAssetId)
      : bookableAssets;

    const todayDateStr = today.toISOString().split('T')[0];

    targetResources.forEach(res => {
      const row = document.createElement('div');
      row.className = 'timeline-row';
      
      const label = document.createElement('div');
      label.className = 'timeline-resource-header';
      label.innerHTML = `<span style="font-size:0.85rem;">${res.name}</span><br><span style="font-size:0.7rem; color:var(--text-muted);">${res.location}</span>`;
      row.appendChild(label);

      const slotsWrapper = document.createElement('div');
      slotsWrapper.className = 'timeline-slots';
      slotsWrapper.style.gridTemplateColumns = 'repeat(10, 1fr)'; // 8:00 to 18:00 is 10 hours

      // Filter bookings of today for this resource
      const resBookingsToday = activeBookings.filter(b => {
        return b.assetId === res.id && b.startTime.split('T')[0] === todayDateStr;
      });

      resBookingsToday.forEach(b => {
        const bStart = new Date(b.startTime);
        const bEnd = new Date(b.endTime);

        const startHour = bStart.getHours() + (bStart.getMinutes() / 60);
        const endHour = bEnd.getHours() + (bEnd.getMinutes() / 60);

        // Map to 8:00 - 18:00 grid boundary
        if (endHour > 8 && startHour < 18) {
          const leftPercent = Math.max(0, ((startHour - 8) / 10) * 100);
          const rightPercent = Math.min(100, ((endHour - 8) / 10) * 100);
          const widthPercent = rightPercent - leftPercent;

          const pill = document.createElement('div');
          pill.className = 'timeline-active-booking';
          pill.style.left = `${leftPercent}%`;
          pill.style.width = `${widthPercent}%`;
          
          const booker = state.users.find(u => u.id === b.bookedById)?.name || 'Someone';
          pill.textContent = `${booker} (${bStart.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})})`;
          pill.title = `${res.name} booked by ${booker} (${bStart.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} - ${bEnd.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})})`;
          slotsWrapper.appendChild(pill);
        }
      });

      row.appendChild(slotsWrapper);
      containerRows.appendChild(row);
    });
  };

  // Wire filters
  resourceFilter.addEventListener('change', () => {
    drawCalendar();
    drawTimeline();
  });

  // Initial draw
  drawCalendar();
  drawTimeline();

  // --- Form submission with overlap validations ---
  document.getElementById('booking-submit-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const assetId = document.getElementById('book-asset-id').value;
    const date = document.getElementById('book-date').value;
    const startTime = document.getElementById('book-start-time').value;
    const endTime = document.getElementById('book-end-time').value;
    
    let deptId = null;
    const behalfChecked = document.getElementById('book-dept-behalf')?.checked;
    if (behalfChecked && user.role === 'Department Head') {
      const myDept = state.departments.find(d => d.headEmployeeId === user.id);
      if (myDept) deptId = myDept.id;
    }

    const isoStart = `${date}T${startTime}`;
    const isoEnd = `${date}T${endTime}`;

    try {
      stateStore.createBooking(assetId, user.id, deptId, isoStart, isoEnd);
      showToast('Booking reservation completed successfully!', 'success');
      renderBookings(container, user); // re-render view
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // --- Cancel bookings list bind ---
  container.querySelectorAll('.cancel-bkg-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const bkgId = e.target.getAttribute('data-id');
      try {
        stateStore.cancelBooking(bkgId);
        showToast('Booking has been cancelled.', 'info');
        renderBookings(container, user);
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });
}

function formatBookingTime(startIso, endIso) {
  const dStart = new Date(startIso);
  const dEnd = new Date(endIso);
  
  const dateStr = dStart.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  const timeStart = dStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const timeEnd = dEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  return `${dateStr} | ${timeStart} - ${timeEnd}`;
}
