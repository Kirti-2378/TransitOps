import { stateStore } from '../state.js';
import { showToast } from './login.js';

export function renderAssets(container, user) {
  const state = stateStore.state;
  const categories = state.categories;
  const isManagerOrAdmin = user.role === 'Admin' || user.role === 'Asset Manager';

  let html = `
    <div class="assets-wrapper">
      
      <!-- Quick Registration Panel (Toggled by actions) -->
      ${isManagerOrAdmin ? `
        <div class="chart-card" id="registration-panel" style="display: none; margin-bottom: 24px; animation: fadeIn 0.3s ease;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px;">
            <h3>Register Corporate Asset</h3>
            <button class="btn-icon" id="btn-close-reg" title="Collapse Form">
              <i data-lucide="chevron-up"></i>
            </button>
          </div>
          <form id="asset-reg-form">
            <div class="grid-3">
              <div class="form-group">
                <label for="name">Asset Name</label>
                <input type="text" id="name" class="form-control form-control-noicon" required placeholder="e.g. ThinkPad T14 Gen 4">
              </div>
              <div class="form-group">
                <label for="category">Category</label>
                <select id="category" class="select-control" style="width: 100%; height: 42px;" required>
                  <option value="">-- Select Category --</option>
                  ${categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label for="serial">Serial Number</label>
                <input type="text" id="serial" class="form-control form-control-noicon" required placeholder="e.g. S192A0281F">
              </div>
            </div>

            <div class="grid-3">
              <div class="form-group">
                <label for="acq-date">Acquisition Date</label>
                <input type="date" id="acq-date" class="form-control form-control-noicon" required value="${new Date().toISOString().split('T')[0]}">
              </div>
              <div class="form-group">
                <label for="acq-cost">Acquisition Cost ($)</label>
                <input type="number" id="acq-cost" class="form-control form-control-noicon" required placeholder="e.g. 1499" min="0">
              </div>
              <div class="form-group">
                <label for="location">Initial Location</label>
                <input type="text" id="location" class="form-control form-control-noicon" required placeholder="e.g. Floor 2 Storeroom">
              </div>
            </div>

            <div class="grid-2">
              <div class="form-group">
                <label for="condition">Condition</label>
                <select id="condition" class="select-control" style="width: 100%; height: 42px;">
                  <option value="New" selected>New</option>
                  <option value="Good">Good</option>
                  <option value="Fair">Fair</option>
                  <option value="Poor">Poor</option>
                </select>
              </div>
              <div class="form-group" style="display:flex; align-items:center; margin-top:20px;">
                <label style="display:flex; align-items:center; gap:8px;">
                  <input type="checkbox" id="bookable" style="accent-color: var(--accent-primary); width:18px; height:18px;">
                  <span>Shared Bookable Resource (available in booking calendar)</span>
                </label>
              </div>
            </div>

            <!-- Dynamic Category-Specific Fields -->
            <div id="dynamic-fields-container" style="margin-top: 12px; display:grid; grid-template-columns:1fr 1fr; gap:24px;"></div>

            <div style="display:flex; justify-content: flex-end; gap: 12px; margin-top: 24px;">
              <button type="reset" class="btn btn-secondary" style="width: auto;">Reset</button>
              <button type="submit" class="btn btn-primary" style="width: auto;">Complete Registration</button>
            </div>
          </form>
        </div>
      ` : ''}

      <!-- Search & Filters Toolbar -->
      <div class="directory-actions-bar">
        <div class="filters-wrapper">
          <div class="search-input-group">
            <i data-lucide="search"></i>
            <input type="text" id="search-query" class="form-control search-control" placeholder="Search Tag, Serial, or Asset Name...">
          </div>
          
          <select id="filter-cat" class="select-control">
            <option value="">All Categories</option>
            ${categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
          </select>

          <select id="filter-status" class="select-control">
            <option value="">All Statuses</option>
            <option value="Available">Available</option>
            <option value="Allocated">Allocated</option>
            <option value="Reserved">Reserved</option>
            <option value="Under Maintenance">Under Maintenance</option>
            <option value="Lost">Lost</option>
            <option value="Retired">Retired</option>
            <option value="Disposed">Disposed</option>
          </select>
        </div>

        ${isManagerOrAdmin ? `
          <button class="btn btn-primary" id="btn-toggle-reg-panel" style="width: auto;">
            <i data-lucide="plus"></i> Register Asset
          </button>
        ` : ''}
      </div>

      <!-- Assets Table List -->
      <div class="table-responsive">
        <table id="assets-table">
          <thead>
            <tr>
              <th>Asset Tag</th>
              <th>Asset Name</th>
              <th>Category</th>
              <th>Condition</th>
              <th>Location</th>
              <th>Status</th>
              <th style="text-align: right;">Activity Log</th>
            </tr>
          </thead>
          <tbody id="assets-table-body">
            <!-- Rendered dynamically -->
          </tbody>
        </table>
      </div>

    </div>
  `;

  container.innerHTML = html;

  if (window.lucide) {
    window.lucide.createIcons();
  }

  // Bind register panel toggle
  if (isManagerOrAdmin) {
    const regPanel = document.getElementById('registration-panel');
    const toggleBtn = document.getElementById('btn-toggle-reg-panel');
    const closeBtn = document.getElementById('btn-close-reg');

    const toggleReg = () => {
      const isHidden = regPanel.style.display === 'none';
      regPanel.style.display = isHidden ? 'block' : 'none';
      if (isHidden) {
        document.getElementById('name').focus();
        toggleBtn.innerHTML = '<i data-lucide="chevron-up"></i> Hide Panel';
      } else {
        toggleBtn.innerHTML = '<i data-lucide="plus"></i> Register Asset';
      }
      if (window.lucide) window.lucide.createIcons();
    };

    toggleBtn.addEventListener('click', toggleReg);
    closeBtn.addEventListener('click', toggleReg);

    // Bind Category dynamic fields trigger
    const catSelect = document.getElementById('category');
    const dynamicContainer = document.getElementById('dynamic-fields-container');

    catSelect.addEventListener('change', () => {
      const selCatId = catSelect.value;
      const categoryObj = categories.find(c => c.id === selCatId);
      
      dynamicContainer.innerHTML = '';
      if (categoryObj && categoryObj.fields && categoryObj.fields.length > 0) {
        categoryObj.fields.forEach(field => {
          const formGrp = document.createElement('div');
          formGrp.className = 'form-group';
          formGrp.innerHTML = `
            <label for="custom-${field.name}">${field.label}</label>
            <input type="${field.type}" id="custom-${field.name}" class="form-control form-control-noicon" required>
          `;
          dynamicContainer.appendChild(formGrp);
        });
      }
    });

    // Form Submission
    document.getElementById('asset-reg-form').addEventListener('submit', (e) => {
      e.preventDefault();
      
      const categoryId = catSelect.value;
      const categoryObj = categories.find(c => c.id === categoryId);
      const customValues = {};
      
      if (categoryObj && categoryObj.fields) {
        categoryObj.fields.forEach(f => {
          const inp = document.getElementById(`custom-${f.name}`);
          if (inp) {
            customValues[f.name] = f.type === 'number' ? Number(inp.value) : inp.value;
          }
        });
      }

      const assetData = {
        name: document.getElementById('name').value,
        categoryId,
        serialNumber: document.getElementById('serial').value,
        acquisitionDate: document.getElementById('acq-date').value,
        acquisitionCost: Number(document.getElementById('acq-cost').value),
        condition: document.getElementById('condition').value,
        location: document.getElementById('location').value,
        isBookable: document.getElementById('bookable').checked,
        customFields: customValues
      };

      try {
        stateStore.registerAsset(assetData);
        showToast(`Asset registered successfully. Tag: AF-${String(stateStore.state.assets.length).padStart(4, '0')}`, 'success');
        document.getElementById('asset-reg-form').reset();
        dynamicContainer.innerHTML = '';
        regPanel.style.display = 'none';
        toggleBtn.innerHTML = '<i data-lucide="plus"></i> Register Asset';
        if (window.lucide) window.lucide.createIcons();
        
        applyFilters(); // refresh table
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  // Search and filter logic
  const searchInput = document.getElementById('search-query');
  const catFilter = document.getElementById('filter-cat');
  const statusFilter = document.getElementById('filter-status');

  const applyFilters = () => {
    const q = searchInput.value.toLowerCase().trim();
    const cat = catFilter.value;
    const stat = statusFilter.value;

    const filtered = state.assets.filter(a => {
      const matchSearch = a.name.toLowerCase().includes(q) || 
                          a.assetTag.toLowerCase().includes(q) || 
                          a.serialNumber.toLowerCase().includes(q);
      const matchCat = cat === '' || a.categoryId === cat;
      const matchStatus = stat === '' || a.status === stat;

      return matchSearch && matchCat && matchStatus;
    });

    renderTableRows(filtered);
  };

  searchInput.addEventListener('input', applyFilters);
  catFilter.addEventListener('change', applyFilters);
  statusFilter.addEventListener('change', applyFilters);

  // Initial draw
  applyFilters();
}

function renderTableRows(assetsList) {
  const tbody = document.getElementById('assets-table-body');
  if (!tbody) return;

  if (assetsList.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; color: var(--text-secondary); padding: 32px 0;">
          No assets found matching the filter criteria.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = assetsList.map(a => {
    const catName = stateStore.state.categories.find(c => c.id === a.categoryId)?.name || 'Unknown';
    let statusClass = a.status.toLowerCase().replace(' ', '-');
    if (statusClass === 'under-maintenance') statusClass = 'maint';
    
    return `
      <tr>
        <td><code><strong>${a.assetTag}</strong></code></td>
        <td>${a.name} ${a.isBookable ? '<span style="font-size:0.7rem; background:rgba(99,102,241,0.15); color:var(--accent-primary); padding:2px 6px; border-radius:4px; margin-left:6px; font-weight:500;">Shared</span>' : ''}</td>
        <td>${catName}</td>
        <td>${a.condition}</td>
        <td><span class="text-secondary">${a.location}</span></td>
        <td><span class="badge badge-status-${statusClass}">${a.status}</span></td>
        <td style="text-align: right;">
          <button class="btn btn-secondary btn-sm details-btn" data-id="${a.id}">
            View Details
          </button>
        </td>
      </tr>
    `;
  }).join('');

  // Bind Details buttons
  tbody.querySelectorAll('.details-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const assetId = e.target.getAttribute('data-id');
      triggerAssetDetailsModal(assetId);
    });
  });
}

function triggerAssetDetailsModal(assetId) {
  const overlay = document.getElementById('modal-overlay');
  const body = document.getElementById('modal-body');
  const title = document.getElementById('modal-title');
  
  const state = stateStore.state;
  const asset = state.assets.find(a => a.id === assetId);
  const cat = state.categories.find(c => c.id === asset.categoryId);
  const holder = stateStore.getAssetHolderName(asset);
  
  const history = state.assetHistory.filter(h => h.assetId === assetId).sort((a,b) => new Date(b.date) - new Date(a.date));

  title.textContent = `Asset Profile: ${asset.assetTag}`;

  let customFieldsHtml = '';
  if (cat && cat.fields) {
    customFieldsHtml = cat.fields.map(f => {
      const val = asset.customFields && asset.customFields[f.name] !== undefined ? asset.customFields[f.name] : 'N/A';
      return `<p style="margin-bottom:8px;"><strong>${f.label}:</strong> <span class="text-secondary">${val}</span></p>`;
    }).join('');
  }

  body.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:20px;">
      
      <!-- Specifications Header Card -->
      <div style="background-color: var(--bg-secondary); border: 1px solid var(--border-color); padding: 18px; border-radius: var(--radius-md);">
        <h4 style="margin-bottom:12px; color:var(--accent-primary);">${asset.name}</h4>
        <div class="grid-2">
          <div>
            <p style="margin-bottom:8px;"><strong>Category:</strong> <span class="text-secondary">${cat?.name || 'Unknown'}</span></p>
            <p style="margin-bottom:8px;"><strong>Serial Number:</strong> <span class="text-secondary">${asset.serialNumber}</span></p>
            <p style="margin-bottom:8px;"><strong>Status:</strong> <span class="badge badge-status-${asset.status.toLowerCase().replace(' ', '-') === 'under-maintenance' ? 'maint' : asset.status.toLowerCase().replace(' ', '-')}">${asset.status}</span></p>
            <p style="margin-bottom:8px;"><strong>Holder:</strong> <span class="text-secondary">${holder} (${asset.allocatedToType || 'None'})</span></p>
          </div>
          <div>
            <p style="margin-bottom:8px;"><strong>Location:</strong> <span class="text-secondary">${asset.location}</span></p>
            <p style="margin-bottom:8px;"><strong>Acquisition Cost:</strong> <span class="text-secondary">$${asset.acquisitionCost.toLocaleString()}</span></p>
            <p style="margin-bottom:8px;"><strong>Acquisition Date:</strong> <span class="text-secondary">${asset.acquisitionDate}</span></p>
            ${customFieldsHtml}
          </div>
        </div>
      </div>

      <!-- Historical Logs Timeline -->
      <div>
        <h4 style="margin-bottom:12px; display:flex; align-items:center; gap:8px;">
          <i data-lucide="history" style="width:18px; height:18px;"></i> Lifecycle & Action History
        </h4>
        <div style="display:flex; flex-direction:column; gap:12px; max-height:220px; overflow-y:auto; padding-right:6px;">
          ${history.length === 0 ? `
            <p style="font-size:0.85rem; color:var(--text-secondary); text-align:center; padding:12px;">No historical activities registered.</p>
          ` : history.map(h => {
            const performer = state.users.find(u => u.id === h.performedById)?.name || 'System';
            return `
              <div style="border-left: 2px solid var(--accent-primary); padding-left:14px; position:relative; margin-left:6px; padding-bottom:4px;">
                <div style="position:absolute; left:-6px; top:4px; width:10px; height:10px; border-radius:50%; background-color:var(--accent-primary);"></div>
                <span style="font-size:0.8rem; color:var(--text-secondary); font-weight:600;">${h.type}</span>
                <p style="font-size:0.85rem; margin-top:2px;">${h.description}</p>
                <span style="font-size:0.75rem; color:var(--text-muted); display:block; margin-top:4px;">${h.date} by ${performer}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <div style="display:flex; justify-content: flex-end; margin-top: 10px;">
        <button class="btn btn-secondary" onclick="document.getElementById('modal-overlay').classList.remove('active')" style="width: auto;">Close Profile</button>
      </div>

    </div>
  `;

  overlay.classList.add('active');
  if (window.lucide) window.lucide.createIcons();
}
