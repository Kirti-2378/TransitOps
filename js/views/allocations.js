import { stateStore } from '../state.js';
import { showToast } from './login.js';

export function renderAllocations(container, user) {
  const state = stateStore.state;
  const isManagerOrAdmin = user.role === 'Admin' || user.role === 'Asset Manager';
  const isDeptHead = user.role === 'Department Head';

  // Get active departments and employees for select lists
  const activeDepts = state.departments.filter(d => d.status === 'Active');
  const activeEmps = state.users.filter(u => u.status === 'Active');

  let html = `
    <div class="allocations-wrapper">
      
      <div class="tabs-container">
        <div class="tabs-list">
          <button class="tab-btn active" data-tab="tab-allocate">Asset Allocation & Return</button>
          <button class="tab-btn" data-tab="tab-transfers">Transfer Requests</button>
        </div>
      </div>

      <!-- Tab 1: Allocation and Returns -->
      <div class="tab-panel active" id="tab-allocate">
        <div class="grid-2">
          
          <!-- Allocation Form Panel (Only for Managers/Admins to perform. Employees see holdings) -->
          <div>
            <div class="chart-card">
              <h3>Allocate Asset</h3>
              <p style="font-size:0.8rem; color:var(--text-secondary); margin-bottom:16px;">
                Assign an asset to an employee or department. Selecting an already allocated asset will trigger transfer workflow options.
              </p>
              
              <form id="allocation-form">
                <div class="form-group">
                  <label for="alloc-asset">Select Asset</label>
                  <select id="alloc-asset" class="select-control" style="width: 100%; height: 42px;" required>
                    <option value="">-- Choose Asset --</option>
                    ${state.assets.filter(a => a.status !== 'Retired' && a.status !== 'Disposed').map(a => `
                      <option value="${a.id}">${a.assetTag} - ${a.name} (${a.status})</option>
                    `).join('')}
                  </select>
                </div>

                <!-- Collision Warning Box (Hidden by default) -->
                <div class="alert-section" id="collision-warning-box" style="display: none; background: rgba(245, 158, 11, 0.08); border-color: rgba(245, 158, 11, 0.2); padding: 12px 16px; margin-bottom: 20px;">
                  <i data-lucide="alert-triangle" style="color: #f59e0b;"></i>
                  <div class="alert-content">
                    <h4 style="color: #f59e0b; font-size: 0.9rem;">Asset Already Allocated</h4>
                    <p style="font-size: 0.8rem;" id="collision-warning-text">Currently held by Priya. You cannot allocate it directly.</p>
                    <button type="button" class="btn btn-secondary btn-sm" id="btn-trigger-transfer" style="margin-top: 10px; border-color: rgba(245, 158, 11, 0.3); color: #f59e0b;">
                      Initiate Transfer Request
                    </button>
                  </div>
                </div>

                <div id="allocation-inputs">
                  <div class="grid-2">
                    <div class="form-group">
                      <label for="alloc-type">Assign Target Type</label>
                      <select id="alloc-type" class="select-control" style="width:100%; height:42px;">
                        <option value="Employee" selected>Employee</option>
                        <option value="Department">Department</option>
                      </select>
                    </div>
                    <div class="form-group">
                      <label for="alloc-target" id="target-label">Assignee Employee</label>
                      <select id="alloc-target" class="select-control" style="width:100%; height:42px;" required>
                        <!-- Loaded dynamically based on target type -->
                      </select>
                    </div>
                  </div>

                  <div class="form-group">
                    <label for="alloc-return">Expected Return Date (Optional)</label>
                    <input type="date" id="alloc-return" class="form-control form-control-noicon" min="${new Date().toISOString().split('T')[0]}">
                  </div>

                  <button type="submit" class="btn btn-primary" id="btn-submit-alloc" ${!isManagerOrAdmin ? 'disabled' : ''}>
                    ${isManagerOrAdmin ? 'Allocate Asset' : 'Asset Managers Only'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <!-- Active Holdings Directory -->
          <div>
            <div class="chart-card" style="min-height: 100%;">
              <h3>Active Corporate Holdings</h3>
              <p style="font-size:0.8rem; color:var(--text-secondary); margin-bottom:16px;">
                Review currently allocated gear and space. Click check-in to process returns.
              </p>
              
              <div style="display:flex; flex-direction:column; gap:12px; max-height:400px; overflow-y:auto; padding-right:6px;">
                ${state.assets.filter(a => a.status === 'Allocated').map(a => {
                  const holderName = stateStore.getAssetHolderName(a);
                  return `
                    <div style="display:flex; justify-content:space-between; align-items:center; border:1px solid var(--border-color); padding:14px; border-radius:var(--radius-md); background:var(--bg-secondary);">
                      <div>
                        <span style="font-size:0.75rem; color:var(--text-muted);"><code>${a.assetTag}</code></span>
                        <h4 style="font-size:0.95rem; margin:2px 0;">${a.name}</h4>
                        <span style="font-size:0.8rem; color:var(--text-secondary);">Held by: <strong>${holderName}</strong> (${a.allocatedToType})</span>
                        ${a.expectedReturnDate ? `<span style="font-size:0.75rem; display:block; color:${new Date(a.expectedReturnDate) < new Date() ? '#ef4444' : 'var(--text-muted)'}; margin-top:4px;">
                          Return Date: ${a.expectedReturnDate} ${new Date(a.expectedReturnDate) < new Date() ? '(OVERDUE)' : ''}
                        </span>` : ''}
                      </div>
                      ${isManagerOrAdmin ? `
                        <button class="btn btn-secondary btn-sm return-btn" data-id="${a.id}">Check In</button>
                      ` : ''}
                    </div>
                  `;
                }).join('')}
                ${state.assets.filter(a => a.status === 'Allocated').length === 0 ? `
                  <p style="text-align:center; padding:32px; color:var(--text-secondary);">No active allocations.</p>
                ` : ''}
              </div>
            </div>
          </div>

        </div>
      </div>

      <!-- Tab 2: Transfer Requests -->
      <div class="tab-panel" id="tab-transfers">
        <div class="directory-actions-bar">
          <h3>Asset Re-Allocation & Transfer Queue</h3>
        </div>

        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Asset Code</th>
                <th>Asset Name</th>
                <th>Current Owner</th>
                <th>Requested By</th>
                <th>Target Assignee</th>
                <th>Request Date</th>
                <th>Status</th>
                <th style="text-align: right;">Authorization</th>
              </tr>
            </thead>
            <tbody>
              ${state.transfers.map(tr => {
                const asset = state.assets.find(a => a.id === tr.assetId);
                const current = tr.currentHolderId ? (state.users.find(u => u.id === tr.currentHolderId)?.name || 'Unknown') : 'Department';
                const requester = state.users.find(u => u.id === tr.requestedById)?.name || 'System';
                
                const targetName = tr.targetEmployeeId 
                  ? (state.users.find(u => u.id === tr.targetEmployeeId)?.name || 'Unknown')
                  : (state.departments.find(d => d.id === tr.targetDepartmentId)?.name || 'Unknown');
                const targetType = tr.targetEmployeeId ? 'Employee' : 'Department';

                // Determine if active user can approve this transfer
                // Asset Manager or Admin can approve any transfer.
                // Department Head can approve if it's within their department.
                let canApprove = isManagerOrAdmin;
                if (isDeptHead && asset.allocatedToType === 'Department') {
                  const dept = state.departments.find(d => d.id === asset.allocatedToId);
                  if (dept && dept.headEmployeeId === user.id) {
                    canApprove = true;
                  }
                }

                return `
                  <tr>
                    <td><code><strong>${asset?.assetTag || 'N/A'}</strong></code></td>
                    <td>${asset?.name || 'Deleted Asset'}</td>
                    <td>${current}</td>
                    <td>${requester}</td>
                    <td>${targetName} (${targetType})</td>
                    <td>${tr.date}</td>
                    <td>
                      <span class="badge ${tr.status === 'Pending' ? 'badge-status-maint' : tr.status === 'Approved' ? 'badge-status-available' : 'badge-status-lost'}">
                        ${tr.status}
                      </span>
                    </td>
                    <td style="text-align: right;">
                      ${tr.status === 'Pending' ? `
                        ${canApprove ? `
                          <button class="btn btn-success btn-sm approve-trsf-btn" data-id="${tr.id}" style="padding:4px 8px; width:auto; margin-right:4px;">Approve</button>
                          <button class="btn btn-danger btn-sm reject-trsf-btn" data-id="${tr.id}" style="padding:4px 8px; width:auto;">Reject</button>
                        ` : `
                          <span style="font-size:0.75rem; color:var(--text-muted);">Pending Review</span>
                        `}
                      ` : `
                        <span style="font-size:0.75rem; color:var(--text-muted);">${tr.status}</span>
                      `}
                    </td>
                  </tr>
                `;
              }).join('')}
              ${state.transfers.length === 0 ? `
                <tr>
                  <td colspan="8" style="text-align:center; padding:32px; color:var(--text-secondary);">No transfer requests.</td>
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

  // --- Dynamic Target Selection Binding ---
  const typeSelect = document.getElementById('alloc-type');
  const targetSelect = document.getElementById('alloc-target');
  const targetLabel = document.getElementById('target-label');

  const populateTargets = () => {
    const val = typeSelect.value;
    targetSelect.innerHTML = '';
    if (val === 'Employee') {
      targetLabel.textContent = 'Assignee Employee';
      activeEmps.forEach(emp => {
        targetSelect.innerHTML += `<option value="${emp.id}">${emp.name} (${emp.role})</option>`;
      });
    } else {
      targetLabel.textContent = 'Assignee Department';
      activeDepts.forEach(dept => {
        targetSelect.innerHTML += `<option value="${dept.id}">${dept.name}</option>`;
      });
    }
  };

  typeSelect.addEventListener('change', populateTargets);
  populateTargets(); // initial loading

  // --- Dynamic Collision Checking Binding ---
  const assetSelect = document.getElementById('alloc-asset');
  const warningBox = document.getElementById('collision-warning-box');
  const warningText = document.getElementById('collision-warning-text');
  const inputsBlock = document.getElementById('allocation-inputs');
  const transferTriggerBtn = document.getElementById('btn-trigger-transfer');

  assetSelect.addEventListener('change', () => {
    const assetId = assetSelect.value;
    if (!assetId) {
      warningBox.style.display = 'none';
      inputsBlock.style.opacity = '1';
      inputsBlock.style.pointerEvents = 'auto';
      return;
    }

    const assetObj = state.assets.find(a => a.id === assetId);
    if (assetObj && assetObj.status === 'Allocated') {
      const holder = stateStore.getAssetHolderName(assetObj);
      warningText.textContent = `This asset is currently Allocated (held by ${holder}). You cannot allocate it directly.`;
      warningBox.style.display = 'flex';
      inputsBlock.style.opacity = '0.3';
      inputsBlock.style.pointerEvents = 'none';
      if (window.lucide) window.lucide.createIcons();
    } else {
      warningBox.style.display = 'none';
      inputsBlock.style.opacity = '1';
      inputsBlock.style.pointerEvents = 'auto';
    }
  });

  // --- Initiate Transfer Request Click ---
  transferTriggerBtn.addEventListener('click', () => {
    const assetId = assetSelect.value;
    const assetObj = state.assets.find(a => a.id === assetId);
    if (!assetObj) return;

    triggerTransferRequestModal(assetObj, container, user);
  });

  // --- Form Allocation submit ---
  document.getElementById('allocation-form').addEventListener('submit', (e) => {
    e.preventDefault();
    if (!isManagerOrAdmin) {
      showToast('Only Asset Managers or Admins can perform allocations.', 'error');
      return;
    }

    const assetId = assetSelect.value;
    const targetId = targetSelect.value;
    const targetType = typeSelect.value;
    const returnDate = document.getElementById('alloc-return').value;

    try {
      stateStore.allocateAsset(assetId, targetId, targetType, returnDate);
      showToast('Asset allocated successfully.', 'success');
      renderAllocations(container, user); // re-render
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // --- Check In returns trigger ---
  container.querySelectorAll('.return-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const assetId = e.target.getAttribute('data-id');
      triggerReturnNotesModal(assetId, container, user);
    });
  });

  // --- Tab controls ---
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

  // --- Transfer Queue Approvals Bind ---
  container.querySelectorAll('.approve-trsf-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const trId = e.target.getAttribute('data-id');
      try {
        stateStore.approveTransfer(trId);
        showToast('Transfer request approved. Asset re-allocated.', 'success');
        renderAllocations(container, user);
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });

  container.querySelectorAll('.reject-trsf-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const trId = e.target.getAttribute('data-id');
      try {
        stateStore.rejectTransfer(trId);
        showToast('Transfer request rejected.', 'info');
        renderAllocations(container, user);
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });
}

function triggerReturnNotesModal(assetId, mainContainer, user) {
  const overlay = document.getElementById('modal-overlay');
  const body = document.getElementById('modal-body');
  const title = document.getElementById('modal-title');
  const asset = stateStore.state.assets.find(a => a.id === assetId);

  title.textContent = `Check-In Return: ${asset.assetTag}`;
  body.innerHTML = `
    <form id="return-submit-form">
      <div class="form-group">
        <label>Asset Name</label>
        <input type="text" class="form-control form-control-noicon" value="${asset.name}" disabled>
      </div>
      <div class="form-group">
        <label for="check-in-notes">Condition Check-In Notes</label>
        <textarea id="check-in-notes" class="form-control form-control-noicon" rows="3" placeholder="Describe the physical condition of the asset (e.g. any minor scratches, fully functional)..." required></textarea>
      </div>
      <div class="form-group">
        <label for="check-in-condition">Updated Condition Status</label>
        <select id="check-in-condition" class="select-control" style="width:100%; height:42px;">
          <option value="New" ${asset.condition === 'New' ? 'selected' : ''}>New</option>
          <option value="Good" ${asset.condition === 'Good' ? 'selected' : ''}>Good</option>
          <option value="Fair" ${asset.condition === 'Fair' ? 'selected' : ''}>Fair</option>
          <option value="Poor" ${asset.condition === 'Poor' ? 'selected' : ''}>Poor</option>
        </select>
      </div>
      <div style="display:flex; justify-content: flex-end; gap: 12px; margin-top: 20px;">
        <button type="button" class="btn btn-secondary" onclick="document.getElementById('modal-overlay').classList.remove('active')" style="width: auto;">Cancel</button>
        <button type="submit" class="btn btn-primary" style="width: auto;">Complete Check-In</button>
      </div>
    </form>
  `;

  overlay.classList.add('active');

  document.getElementById('return-submit-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const notes = document.getElementById('check-in-notes').value;
    const cond = document.getElementById('check-in-condition').value;

    try {
      // Revert status to Available
      stateStore.returnAsset(assetId, notes);
      // Update condition
      const assetObj = stateStore.state.assets.find(a => a.id === assetId);
      if (assetObj) {
        assetObj.condition = cond;
        stateStore._emit();
      }

      overlay.classList.remove('active');
      showToast('Asset returned to stock.', 'success');
      renderAllocations(mainContainer, user);
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

function triggerTransferRequestModal(asset, mainContainer, user) {
  const overlay = document.getElementById('modal-overlay');
  const body = document.getElementById('modal-body');
  const title = document.getElementById('modal-title');
  const state = stateStore.state;
  const currentHolderName = stateStore.getAssetHolderName(asset);

  title.textContent = `Raise Transfer Request: ${asset.assetTag}`;
  body.innerHTML = `
    <form id="transfer-request-submit-form">
      <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:16px;">
        This will raise a request in the Transfer Queue for <strong>${asset.name}</strong>, currently held by <strong>${currentHolderName}</strong>. 
        Once approved by an Asset Manager or Department Head, the asset will be re-assigned.
      </p>

      <div class="form-group">
        <label for="tr-type">Target Assignee Type</label>
        <select id="tr-type" class="select-control" style="width:100%; height:42px;">
          <option value="Employee" selected>Employee</option>
          <option value="Department">Department</option>
        </select>
      </div>

      <div class="form-group">
        <label for="tr-target" id="tr-target-label">Target Employee</label>
        <select id="tr-target" class="select-control" style="width:100%; height:42px;" required>
          <!-- Loaded dynamically -->
        </select>
      </div>

      <div style="display:flex; justify-content: flex-end; gap: 12px; margin-top: 24px;">
        <button type="button" class="btn btn-secondary" onclick="document.getElementById('modal-overlay').classList.remove('active')" style="width: auto;">Cancel</button>
        <button type="submit" class="btn btn-primary" style="width: auto;">Request Transfer</button>
      </div>
    </form>
  `;

  overlay.classList.add('active');

  const typeSel = document.getElementById('tr-type');
  const targetSel = document.getElementById('tr-target');
  const labelText = document.getElementById('tr-target-label');

  const populateTrTargets = () => {
    const val = typeSel.value;
    targetSel.innerHTML = '';
    if (val === 'Employee') {
      labelText.textContent = 'Target Employee';
      state.users.filter(u => u.status === 'Active' && u.id !== asset.allocatedToId).forEach(emp => {
        targetSel.innerHTML += `<option value="${emp.id}">${emp.name}</option>`;
      });
    } else {
      labelText.textContent = 'Target Department';
      state.departments.filter(d => d.status === 'Active' && d.id !== asset.allocatedToId).forEach(dept => {
        targetSel.innerHTML += `<option value="${dept.id}">${dept.name}</option>`;
      });
    }
  };

  typeSel.addEventListener('change', populateTrTargets);
  populateTrTargets();

  document.getElementById('transfer-request-submit-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const type = typeSel.value;
    const target = targetSel.value;

    const targetEmp = type === 'Employee' ? target : null;
    const targetDept = type === 'Department' ? target : null;

    try {
      stateStore.transferAssetRequest(asset.id, targetEmp, targetDept);
      overlay.classList.remove('active');
      showToast('Transfer request submitted to queue.', 'success');
      renderAllocations(mainContainer, user);
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}
