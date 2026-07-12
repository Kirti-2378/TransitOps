import { stateStore } from '../state.js';
import { showToast } from './login.js';

export function renderAudits(container, user) {
  const state = stateStore.state;
  const isManagerOrAdmin = user.role === 'Admin' || user.role === 'Asset Manager';
  const activeCycles = state.auditCycles.filter(c => c.status === 'Active');
  const closedCycles = state.auditCycles.filter(c => c.status === 'Closed');

  let html = `
    <div class="audits-wrapper">
      
      <div class="tabs-container">
        <div class="tabs-list">
          <button class="tab-btn active" data-tab="tab-active-audits">Active Audit Cycles</button>
          ${isManagerOrAdmin ? `<button class="tab-btn" data-tab="tab-create-audit">Launch Audit Cycle</button>` : ''}
          <button class="tab-btn" data-tab="tab-audit-history">Historical Audit Runs</button>
        </div>
      </div>

      <!-- Tab 1: Active Audits checklist -->
      <div class="tab-panel active" id="tab-active-audits">
        <div class="grid-3" style="grid-template-columns: 280px 1fr; gap: 24px;">
          
          <!-- Cycles Selection list -->
          <div>
            <div class="chart-card">
              <h3>Active Audit Runs</h3>
              <p style="font-size:0.8rem; color:var(--text-secondary); margin-bottom:12px;">
                Select an ongoing audit cycle to record results.
              </p>
              
              <div style="display:flex; flex-direction:column; gap:10px;" id="active-cycles-sidebar-list">
                ${activeCycles.map(c => {
                  const dept = state.departments.find(d => d.id === c.departmentId)?.name || 'All Departments';
                  const isAssigned = c.auditorIds.includes(user.id) || isManagerOrAdmin;
                  return `
                    <div class="active-cycle-item" data-id="${c.id}" style="border:1px solid var(--border-color); padding:12px; border-radius:var(--radius-md); background:var(--bg-secondary); cursor:pointer; transition:all var(--transition-fast);">
                      <h4 style="font-size:0.9rem; margin-bottom:2px;">${c.name}</h4>
                      <span style="font-size:0.75rem; color:var(--text-secondary); display:block;">Scope: ${dept}</span>
                      ${c.location ? `<span style="font-size:0.75rem; color:var(--text-secondary); display:block;">Location: ${c.location}</span>` : ''}
                      <span style="font-size:0.7rem; color:${isAssigned ? '#10b981' : 'var(--text-muted)'}; font-weight:600; display:block; margin-top:6px;">
                        ${isAssigned ? '✓ Assigned to you' : 'Auditor access only'}
                      </span>
                    </div>
                  `;
                }).join('')}
                ${activeCycles.length === 0 ? `
                  <p style="text-align:center; padding:20px; font-size:0.8rem; color:var(--text-secondary);">No active audits.</p>
                ` : ''}
              </div>
            </div>
          </div>

          <!-- Active Audit Checklist Workstation (Renders when a cycle is clicked) -->
          <div id="audit-workstation">
            <div class="chart-card" style="display:flex; align-items:center; justify-content:center; min-height:300px; color:var(--text-secondary);">
              <div style="text-align:center;">
                <i data-lucide="clipboard-check" style="width:48px; height:48px; color:var(--text-muted); margin-bottom:12px;"></i>
                <p>Select an Active Audit Cycle from the sidebar to begin checking assets.</p>
              </div>
            </div>
          </div>

        </div>
      </div>

      <!-- Tab 2: Create Audit Cycle -->
      ${isManagerOrAdmin ? `
        <div class="tab-panel" id="tab-create-audit">
          <div class="chart-card" style="max-width: 600px;">
            <h3>Configure Audit Schedule</h3>
            <p style="font-size:0.8rem; color:var(--text-secondary); margin-bottom:20px;">
              Specify the target department and location criteria, then assign auditors to run verification cycles.
            </p>

            <form id="create-audit-form">
              <div class="form-group">
                <label for="aud-name">Audit Cycle Name</label>
                <input type="text" id="aud-name" class="form-control form-control-noicon" required placeholder="e.g. Q3 Electronics Audit">
              </div>

              <div class="grid-2">
                <div class="form-group">
                  <label for="aud-dept">Scope Department</label>
                  <select id="aud-dept" class="select-control" style="width: 100%; height: 42px;">
                    <option value="">-- All Departments --</option>
                    ${state.departments.filter(d => d.status === 'Active').map(d => `<option value="${d.id}">${d.name}</option>`).join('')}
                  </select>
                </div>
                <div class="form-group">
                  <label for="aud-loc">Scope Location Filter</label>
                  <input type="text" id="aud-loc" class="form-control form-control-noicon" placeholder="e.g. HQ Floor 3">
                </div>
              </div>

              <div class="grid-2">
                <div class="form-group">
                  <label for="aud-start">Start Date</label>
                  <input type="date" id="aud-start" class="form-control form-control-noicon" required value="${new Date().toISOString().split('T')[0]}">
                </div>
                <div class="form-group">
                  <label for="aud-end">End Date</label>
                  <input type="date" id="aud-end" class="form-control form-control-noicon" required value="${new Date(Date.now() + 10*24*60*60*1000).toISOString().split('T')[0]}">
                </div>
              </div>

              <div class="form-group">
                <label>Assign Auditors</label>
                <div style="max-height: 120px; overflow-y: auto; border: 1px solid var(--border-color); padding: 12px; border-radius: var(--radius-md); display:flex; flex-direction:column; gap:8px;">
                  ${state.users.filter(u => u.status === 'Active').map(u => `
                    <label style="display:flex; align-items:center; gap:8px; font-size:0.9rem; cursor:pointer;">
                      <input type="checkbox" name="aud-auditor" value="${u.id}" style="width:16px; height:16px; accent-color:var(--accent-primary)">
                      <span>${u.name} (${u.role})</span>
                    </label>
                  `).join('')}
                </div>
              </div>

              <button type="submit" class="btn btn-primary" style="margin-top:12px;">Launch Audit Cycle</button>
            </form>
          </div>
        </div>
      ` : ''}

      <!-- Tab 3: Historical Audit Runs -->
      <div class="tab-panel" id="tab-audit-history">
        <div class="directory-actions-bar">
          <h3>Completed Audits Archive</h3>
        </div>

        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Audit Run</th>
                <th>Target Scope</th>
                <th>Run Dates</th>
                <th>Auditors</th>
                <th>Verified</th>
                <th>Missing</th>
                <th>Damaged</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${closedCycles.map(c => {
                const dept = state.departments.find(d => d.id === c.departmentId)?.name || 'All Departments';
                const audNames = c.auditorIds.map(id => state.users.find(u => u.id === id)?.name || 'Unknown').join(', ');
                
                // Count results
                let verified = 0;
                let missing = 0;
                let damaged = 0;
                Object.values(c.results).forEach(r => {
                  if (r.status === 'Verified') verified++;
                  if (r.status === 'Missing') missing++;
                  if (r.status === 'Damaged') damaged++;
                });

                return `
                  <tr>
                    <td><strong>${c.name}</strong></td>
                    <td>${dept} ${c.location ? ` | ${c.location}` : ''}</td>
                    <td>${c.startDate} to ${c.endDate}</td>
                    <td>${audNames}</td>
                    <td><span style="color:#10b981; font-weight:600;">${verified}</span></td>
                    <td><span style="color:#ef4444; font-weight:600;">${missing}</span></td>
                    <td><span style="color:#f59e0b; font-weight:600;">${damaged}</span></td>
                    <td><span class="badge badge-status-disposed">Closed</span></td>
                  </tr>
                `;
              }).join('')}
              ${closedCycles.length === 0 ? `
                <tr>
                  <td colspan="8" style="text-align:center; padding:32px; color:var(--text-secondary);">No completed audits in archive.</td>
                </tr>
              ` : ''}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `;

  container.innerHTML = html;

  if (window.lucide) {
    window.lucide.createIcons();
  }

  // --- Bind Tab Navigation ---
  const tabs = container.querySelectorAll('.tab-btn');
  const panels = container.querySelectorAll('.tab-panel');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      const panelId = tab.getAttribute('data-tab');
      document.getElementById(panelId).classList.add('active');
    });
  });

  // --- Launch Audit Run submission ---
  if (isManagerOrAdmin) {
    document.getElementById('create-audit-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('aud-name').value;
      const deptId = document.getElementById('aud-dept').value || null;
      const location = document.getElementById('aud-loc').value || '';
      const start = document.getElementById('aud-start').value;
      const end = document.getElementById('aud-end').value;
      
      const auditors = [];
      document.querySelectorAll('input[name="aud-auditor"]:checked').forEach(cb => {
        auditors.push(cb.value);
      });

      if (auditors.length === 0) {
        showToast('Please select at least one assigned Auditor.', 'error');
        return;
      }

      try {
        stateStore.createAuditCycle(name, deptId, location, start, end, auditors);
        showToast('Audit Cycle initiated successfully.', 'success');
        renderAudits(container, user); // re-render
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  // --- Bind Active Cycle Sidebar clicking ---
  const cycleItems = container.querySelectorAll('.active-cycle-item');
  cycleItems.forEach(item => {
    item.addEventListener('click', (e) => {
      cycleItems.forEach(x => x.style.borderColor = 'var(--border-color)');
      item.style.borderColor = 'var(--accent-primary)';

      const cycleId = item.getAttribute('data-id');
      loadAuditChecklist(cycleId, container, user);
    });
  });
}

function loadAuditChecklist(cycleId, mainContainer, user) {
  const state = stateStore.state;
  const cycle = state.auditCycles.find(c => c.id === cycleId);
  const target = document.getElementById('audit-workstation');
  if (!target) return;

  const isAssigned = cycle.auditorIds.includes(user.id) || user.role === 'Admin' || user.role === 'Asset Manager';
  const assetsInScope = stateStore.getAssetsInScope(cycle.departmentId, cycle.location);

  // Compute live verification ratios
  let verified = 0;
  let missing = 0;
  let damaged = 0;
  let pending = 0;

  assetsInScope.forEach(a => {
    const res = cycle.results[a.id];
    if (res) {
      if (res.status === 'Verified') verified++;
      if (res.status === 'Missing') missing++;
      if (res.status === 'Damaged') damaged++;
    } else {
      pending++;
    }
  });

  const total = assetsInScope.length;

  let html = `
    <div class="chart-card" style="animation: fadeIn 0.25s ease;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 20px; flex-wrap:wrap; gap:16px;">
        <div>
          <h3 style="margin-bottom:4px;">${cycle.name}</h3>
          <span style="font-size:0.8rem; color:var(--text-secondary);">Start: ${cycle.startDate} | Target End: ${cycle.endDate}</span>
        </div>
        ${isAssigned ? `
          <button class="btn btn-success btn-sm" id="btn-close-audit-cycle" style="width:auto; padding: 8px 16px;">
            <i data-lucide="lock" style="width:14px; height:14px; margin-right:4px;"></i> Close & Lock Run
          </button>
        ` : ''}
      </div>

      <!-- Discrepancy Statistics Card -->
      <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; background:var(--bg-secondary); padding:16px; border-radius:var(--radius-md); border:1px solid var(--border-color);">
        <div style="text-align:center;">
          <span style="font-size:0.75rem; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.03em;">Assets In Scope</span>
          <div style="font-size:1.4rem; font-weight:700; color:var(--text-primary); margin-top:2px;">${total}</div>
        </div>
        <div style="text-align:center; border-left:1px solid var(--border-color)">
          <span style="font-size:0.75rem; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.03em;">Verified</span>
          <div style="font-size:1.4rem; font-weight:700; color:#10b981; margin-top:2px;">${verified}</div>
        </div>
        <div style="text-align:center; border-left:1px solid var(--border-color)">
          <span style="font-size:0.75rem; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.03em;">Missing / Flagged</span>
          <div style="font-size:1.4rem; font-weight:700; color:#ef4444; margin-top:2px;">${missing}</div>
        </div>
        <div style="text-align:center; border-left:1px solid var(--border-color)">
          <span style="font-size:0.75rem; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.03em;">Damaged</span>
          <div style="font-size:1.4rem; font-weight:700; color:#f59e0b; margin-top:2px;">${damaged}</div>
        </div>
      </div>

      <!-- Discrepancy Flag Banner -->
      ${(missing > 0 || damaged > 0) ? `
        <div style="background:rgba(239,68,68,0.06); border:1px solid rgba(239,68,68,0.2); border-radius:var(--radius-md); padding:12px; margin-bottom:20px; font-size:0.85rem; color:#ef4444; display:flex; align-items:center; gap:8px;">
          <i data-lucide="alert-triangle" style="width:18px; height:18px;"></i>
          <span><strong>Discrepancy Warning</strong>: ${missing} missing item(s) and ${damaged} damaged item(s) identified. Closing this cycle will automatically lock these statuses in the central directory.</span>
        </div>
      ` : ''}

      <!-- Verification checklist list -->
      <h4 style="margin-bottom:12px;">Auditor Checklist (${pending} remaining)</h4>
      <div style="display:flex; flex-direction:column; gap:12px; max-height: 380px; overflow-y:auto; padding-right:4px;">
        ${assetsInScope.map(asset => {
          const res = cycle.results[asset.id];
          const curStatus = res ? res.status : '';
          const curNotes = res ? res.notes : '';
          const holder = stateStore.getAssetHolderName(asset);

          return `
            <div class="audit-asset-item" style="${res ? 'opacity: 0.8;' : ''}">
              <div style="flex:1;">
                <div style="display:flex; align-items:center; gap:8px;">
                  <code><strong>${asset.assetTag}</strong></code>
                  <span style="font-size:0.9rem; font-weight:600;">${asset.name}</span>
                </div>
                <p style="font-size:0.75rem; color:var(--text-secondary); margin-top:4px;">
                  Current Location: ${asset.location} | Holder: ${holder} (${asset.status})
                </p>
                <input type="text" class="form-control form-control-noicon audit-notes-input" data-asset-id="${asset.id}" placeholder="Add check notes..." value="${curNotes}" style="padding: 6px 10px; font-size:0.8rem; margin-top:8px;" ${!isAssigned ? 'disabled' : ''}>
              </div>
              <div class="audit-action-picker">
                <button class="audit-btn verified ${curStatus === 'Verified' ? 'active' : ''}" data-asset-id="${asset.id}" data-status="Verified" ${!isAssigned ? 'disabled' : ''}>Verified</button>
                <button class="audit-btn damaged ${curStatus === 'Damaged' ? 'active' : ''}" data-asset-id="${asset.id}" data-status="Damaged" ${!isAssigned ? 'disabled' : ''}>Damaged</button>
                <button class="audit-btn missing ${curStatus === 'Missing' ? 'active' : ''}" data-asset-id="${asset.id}" data-status="Missing" ${!isAssigned ? 'disabled' : ''}>Missing</button>
              </div>
            </div>
          `;
        }).join('')}
        ${assetsInScope.length === 0 ? `
          <p style="text-align:center; padding:32px; color:var(--text-secondary);">No assets are found matching the scope of this cycle.</p>
        ` : ''}
      </div>

    </div>
  `;

  target.innerHTML = html;

  if (window.lucide) window.lucide.createIcons();

  // Bind auditor check inputs
  if (isAssigned) {
    // Buttons toggling
    target.querySelectorAll('.audit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const assetId = btn.getAttribute('data-asset-id');
        const status = btn.getAttribute('data-status');
        
        // Find corresponding notes input
        const notesInput = target.querySelector(`.audit-notes-input[data-asset-id="${assetId}"]`);
        const notesValue = notesInput ? notesInput.value : '';

        // Save
        try {
          stateStore.recordAuditResult(cycleId, assetId, status, notesValue);
          // Reload workstation checklist to update counters
          loadAuditChecklist(cycleId, mainContainer, user);
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });

    // Notes typing change listener to auto-record if button clicked
    target.querySelectorAll('.audit-notes-input').forEach(inp => {
      inp.addEventListener('change', () => {
        const assetId = inp.getAttribute('data-asset-id');
        const res = cycle.results[assetId];
        if (res) {
          // If already checked, update notes
          stateStore.recordAuditResult(cycleId, assetId, res.status, inp.value);
        }
      });
    });

    // Bind Close & Lock button
    const closeBtn = document.getElementById('btn-close-audit-cycle');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        if (pending > 0) {
          if (!confirm(`Warning: There are ${pending} unchecked assets remaining. Do you wish to close and lock the cycle anyway?`)) {
            return;
          }
        } else {
          if (!confirm('Are you sure you want to close and lock this audit cycle? This will lock the ledger and auto-adjust statuses.')) {
            return;
          }
        }

        try {
          stateStore.closeAuditCycle(cycleId);
          showToast(`Audit cycle "${cycle.name}" closed. Assets registry reconciled.`, 'success');
          renderAudits(mainContainer, user); // full re-render
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    }
  }
}
