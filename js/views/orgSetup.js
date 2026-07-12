import { stateStore } from '../state.js';
import { showToast } from './login.js';

export function renderOrgSetup(container, user) {
  const state = stateStore.state;

  let html = `
    <div class="org-setup-wrapper">
      <div class="tabs-container">
        <div class="tabs-list">
          <button class="tab-btn active" data-tab="tab-departments">Departments</button>
          <button class="tab-btn" data-tab="tab-categories">Asset Categories</button>
          <button class="tab-btn" data-tab="tab-employees">Employee Directory</button>
        </div>
      </div>

      <!-- Tab A: Departments -->
      <div class="tab-panel active" id="tab-departments">
        <div class="directory-actions-bar">
          <h3>Department Hierarchy</h3>
          <button class="btn btn-primary" id="btn-add-dept" style="width: auto;">
            <i data-lucide="plus"></i> Add Department
          </button>
        </div>

        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Department Name</th>
                <th>Department Head</th>
                <th>Parent Department</th>
                <th>Status</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${state.departments.map(dept => {
                const head = state.users.find(u => u.id === dept.headEmployeeId)?.name || 'Not Assigned';
                const parent = state.departments.find(d => d.id === dept.parentDepartmentId)?.name || 'None (Root)';
                return `
                  <tr>
                    <td><strong>${dept.name}</strong></td>
                    <td>${head}</td>
                    <td><span class="text-secondary">${parent}</span></td>
                    <td>
                      <span class="badge ${dept.status === 'Active' ? 'badge-status-available' : 'badge-status-retired'}">
                        ${dept.status}
                      </span>
                    </td>
                    <td style="text-align: right;">
                      <button class="btn btn-secondary btn-sm edit-dept-btn" data-id="${dept.id}">Edit</button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Tab B: Asset Categories -->
      <div class="tab-panel" id="tab-categories">
        <div class="directory-actions-bar">
          <h3>Asset Categories & Custom Fields</h3>
          <button class="btn btn-primary" id="btn-add-category" style="width: auto;">
            <i data-lucide="plus"></i> Create Category
          </button>
        </div>

        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Category Name</th>
                <th>Category Code</th>
                <th>Category-Specific Fields</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${state.categories.map(cat => {
                const fields = cat.fields && cat.fields.length > 0 
                  ? cat.fields.map(f => `${f.label} (${f.type})`).join(', ')
                  : 'No custom fields';
                return `
                  <tr>
                    <td><strong>${cat.name}</strong></td>
                    <td><code>${cat.id}</code></td>
                    <td><span class="text-secondary">${fields}</span></td>
                    <td style="text-align: right;">
                      <button class="btn btn-secondary btn-sm edit-cat-btn" data-id="${cat.id}">Edit</button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Tab C: Employee Directory -->
      <div class="tab-panel" id="tab-employees">
        <div class="directory-actions-bar">
          <h3>Employee Directory & RBAC</h3>
        </div>

        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Employee Name</th>
                <th>Email</th>
                <th>Department</th>
                <th>Role</th>
                <th>Status</th>
                <th style="text-align: right;">Manage</th>
              </tr>
            </thead>
            <tbody>
              ${state.users.map(emp => {
                const dept = state.departments.find(d => d.id === emp.departmentId)?.name || 'General';
                return `
                  <tr>
                    <td><strong>${emp.name}</strong></td>
                    <td>${emp.email}</td>
                    <td>${dept}</td>
                    <td>
                      <span class="badge badge-status-allocated" style="background-color: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-primary);">
                        ${emp.role}
                      </span>
                    </td>
                    <td>
                      <span class="badge ${emp.status === 'Active' ? 'badge-status-available' : 'badge-status-lost'}">
                        ${emp.status}
                      </span>
                    </td>
                    <td style="text-align: right;">
                      <button class="btn btn-secondary btn-sm edit-emp-btn" data-id="${emp.id}">Edit / Promote</button>
                    </td>
                  </tr>
                `;
              }).join('')}
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

  // Bind Tab switching
  const tabs = container.querySelectorAll('.tab-btn');
  const panels = container.querySelectorAll('.tab-panel');
  tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      const panelId = tab.getAttribute('data-tab');
      document.getElementById(panelId).classList.add('active');
    });
  });

  // Bind Department buttons
  document.getElementById('btn-add-dept').addEventListener('click', () => {
    triggerAddDeptModal(container, user);
  });

  container.querySelectorAll('.edit-dept-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const deptId = e.target.getAttribute('data-id');
      triggerEditDeptModal(deptId, container, user);
    });
  });

  // Bind Category buttons
  document.getElementById('btn-add-category').addEventListener('click', () => {
    triggerAddCategoryModal(container, user);
  });

  container.querySelectorAll('.edit-cat-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const catId = e.target.getAttribute('data-id');
      triggerEditCategoryModal(catId, container, user);
    });
  });

  // Bind Employee edit button
  container.querySelectorAll('.edit-emp-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const empId = e.target.getAttribute('data-id');
      triggerEditEmployeeModal(empId, container, user);
    });
  });
}

// Modal implementations
function triggerAddDeptModal(mainContainer, user) {
  const overlay = document.getElementById('modal-overlay');
  const body = document.getElementById('modal-body');
  const title = document.getElementById('modal-title');
  const state = stateStore.state;

  title.textContent = 'Create New Department';
  body.innerHTML = `
    <form id="add-dept-form">
      <div class="form-group">
        <label for="dept-name">Department Name</label>
        <input type="text" id="dept-name" class="form-control form-control-noicon" required placeholder="e.g. Finance">
      </div>
      <div class="form-group">
        <label for="dept-head">Department Head</label>
        <select id="dept-head" class="select-control" style="width: 100%; height: 42px;">
          <option value="">-- Assign Head (Optional) --</option>
          ${state.users.map(u => `<option value="${u.id}">${u.name} (${u.role})</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label for="dept-parent">Parent Department (For Hierarchy)</label>
        <select id="dept-parent" class="select-control" style="width: 100%; height: 42px;">
          <option value="">-- None (Root Department) --</option>
          ${state.departments.filter(d => d.status === 'Active').map(d => `<option value="${d.id}">${d.name}</option>`).join('')}
        </select>
      </div>
      <div style="display:flex; justify-content: flex-end; gap: 12px; margin-top: 20px;">
        <button type="button" class="btn btn-secondary" onclick="document.getElementById('modal-overlay').classList.remove('active')" style="width: auto;">Cancel</button>
        <button type="submit" class="btn btn-primary" style="width: auto;">Create Department</button>
      </div>
    </form>
  `;

  overlay.classList.add('active');

  document.getElementById('add-dept-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('dept-name').value;
    const head = document.getElementById('dept-head').value || null;
    const parent = document.getElementById('dept-parent').value || null;

    try {
      stateStore.createDepartment(name, head, parent);
      overlay.classList.remove('active');
      showToast('Department created successfully.', 'success');
      renderOrgSetup(mainContainer, user);
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

function triggerEditDeptModal(deptId, mainContainer, user) {
  const overlay = document.getElementById('modal-overlay');
  const body = document.getElementById('modal-body');
  const title = document.getElementById('modal-title');
  const state = stateStore.state;
  const dept = state.departments.find(d => d.id === deptId);

  title.textContent = `Edit Department: ${dept.name}`;
  body.innerHTML = `
    <form id="edit-dept-form">
      <div class="form-group">
        <label for="dept-name">Department Name</label>
        <input type="text" id="dept-name" class="form-control form-control-noicon" value="${dept.name}" required>
      </div>
      <div class="form-group">
        <label for="dept-head">Department Head</label>
        <select id="dept-head" class="select-control" style="width: 100%; height: 42px;">
          <option value="">-- Assign Head (Optional) --</option>
          ${state.users.map(u => `<option value="${u.id}" ${u.id === dept.headEmployeeId ? 'selected' : ''}>${u.name} (${u.role})</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label for="dept-parent">Parent Department</label>
        <select id="dept-parent" class="select-control" style="width: 100%; height: 42px;">
          <option value="">-- None (Root Department) --</option>
          ${state.departments.filter(d => d.id !== deptId && d.status === 'Active').map(d => `<option value="${d.id}" ${d.id === dept.parentDepartmentId ? 'selected' : ''}>${d.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label for="dept-status">Status</label>
        <select id="dept-status" class="select-control" style="width: 100%; height: 42px;">
          <option value="Active" ${dept.status === 'Active' ? 'selected' : ''}>Active</option>
          <option value="Inactive" ${dept.status === 'Inactive' ? 'selected' : ''}>Inactive (Deactivated)</option>
        </select>
      </div>
      <div style="display:flex; justify-content: flex-end; gap: 12px; margin-top: 20px;">
        <button type="button" class="btn btn-secondary" onclick="document.getElementById('modal-overlay').classList.remove('active')" style="width: auto;">Cancel</button>
        <button type="submit" class="btn btn-primary" style="width: auto;">Save Changes</button>
      </div>
    </form>
  `;

  overlay.classList.add('active');

  document.getElementById('edit-dept-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('dept-name').value;
    const head = document.getElementById('dept-head').value || null;
    const parent = document.getElementById('dept-parent').value || null;
    const status = document.getElementById('dept-status').value;

    try {
      stateStore.updateDepartment(deptId, name, head, parent, status);
      overlay.classList.remove('active');
      showToast('Department details updated.', 'success');
      renderOrgSetup(mainContainer, user);
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

function triggerAddCategoryModal(mainContainer, user) {
  const overlay = document.getElementById('modal-overlay');
  const body = document.getElementById('modal-body');
  const title = document.getElementById('modal-title');

  let customFields = [];

  title.textContent = 'Create Asset Category';
  
  function renderModalBody() {
    body.innerHTML = `
      <form id="add-cat-form">
        <div class="form-group">
          <label for="cat-name">Category Name</label>
          <input type="text" id="cat-name" class="form-control form-control-noicon" required placeholder="e.g. Office Furniture">
        </div>

        <div style="margin: 20px 0;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px;">
            <label style="font-weight: 600; text-transform: none; letter-spacing:0;">Category-Specific Custom Fields</label>
            <button type="button" class="btn btn-secondary btn-sm" id="btn-add-field-row" style="padding: 4px 10px;">
              <i data-lucide="plus-circle" style="width:14px; height:14px; margin-right:4px;"></i> Add Field
            </button>
          </div>

          <div id="custom-fields-rows" style="display:flex; flex-direction:column; gap:8px;">
            ${customFields.length === 0 ? `
              <p style="font-size:0.8rem; color:var(--text-secondary); text-align:center; padding:12px; border:1px dashed var(--border-color); border-radius:6px;">
                No custom fields configured yet.
              </p>
            ` : customFields.map((f, i) => `
              <div style="display:flex; gap:8px; align-items:center;">
                <input type="text" class="form-control form-control-noicon field-lbl" style="flex:2;" placeholder="Field Label (e.g. Warranty)" value="${f.label}" required>
                <select class="select-control field-typ" style="flex:1; height:38px;">
                  <option value="text" ${f.type === 'text' ? 'selected' : ''}>Text</option>
                  <option value="number" ${f.type === 'number' ? 'selected' : ''}>Number</option>
                  <option value="date" ${f.type === 'date' ? 'selected' : ''}>Date</option>
                </select>
                <button type="button" class="btn btn-danger btn-sm btn-del-field" data-index="${i}" style="padding:8px 10px;">
                  <i data-lucide="trash-2" style="width:14px; height:14px;"></i>
                </button>
              </div>
            `).join('')}
          </div>
        </div>

        <div style="display:flex; justify-content: flex-end; gap: 12px; margin-top: 28px;">
          <button type="button" class="btn btn-secondary" onclick="document.getElementById('modal-overlay').classList.remove('active')" style="width: auto;">Cancel</button>
          <button type="submit" class="btn btn-primary" style="width: auto;">Create Category</button>
        </div>
      </form>
    `;

    if (window.lucide) window.lucide.createIcons();

    // Bind sub actions inside form
    const addRowBtn = document.getElementById('btn-add-field-row');
    if (addRowBtn) {
      addRowBtn.addEventListener('click', () => {
        saveCurrentFieldsData();
        customFields.push({ name: `field_${Date.now()}`, type: 'text', label: '' });
        renderModalBody();
      });
    }

    body.querySelectorAll('.btn-del-field').forEach(btn => {
      btn.addEventListener('click', (e) => {
        saveCurrentFieldsData();
        const index = parseInt(e.currentTarget.getAttribute('data-index'));
        customFields.splice(index, 1);
        renderModalBody();
      });
    });

    document.getElementById('add-cat-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('cat-name').value;
      saveCurrentFieldsData();

      try {
        stateStore.createCategory(name, customFields);
        overlay.classList.remove('active');
        showToast('Category created successfully.', 'success');
        renderOrgSetup(mainContainer, user);
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  function saveCurrentFieldsData() {
    const labels = body.querySelectorAll('.field-lbl');
    const types = body.querySelectorAll('.field-typ');
    labels.forEach((inp, idx) => {
      if (customFields[idx]) {
        customFields[idx].label = inp.value;
        customFields[idx].type = types[idx].value;
        // Generate an alphanumeric snake name
        customFields[idx].name = inp.value.toLowerCase().replace(/[^a-z0-9]/g, '_');
      }
    });
  }

  renderModalBody();
  overlay.classList.add('active');
}

function triggerEditCategoryModal(catId, mainContainer, user) {
  const overlay = document.getElementById('modal-overlay');
  const body = document.getElementById('modal-body');
  const title = document.getElementById('modal-title');
  const state = stateStore.state;
  const cat = state.categories.find(c => c.id === catId);

  let customFields = [...cat.fields];

  title.textContent = `Edit Category: ${cat.name}`;

  function renderModalBody() {
    body.innerHTML = `
      <form id="edit-cat-form">
        <div class="form-group">
          <label for="cat-name">Category Name</label>
          <input type="text" id="cat-name" class="form-control form-control-noicon" value="${cat.name}" required>
        </div>

        <div style="margin: 20px 0;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px;">
            <label style="font-weight: 600; text-transform: none; letter-spacing:0;">Category-Specific Custom Fields</label>
            <button type="button" class="btn btn-secondary btn-sm" id="btn-add-field-row" style="padding: 4px 10px;">
              <i data-lucide="plus-circle" style="width:14px; height:14px; margin-right:4px;"></i> Add Field
            </button>
          </div>

          <div id="custom-fields-rows" style="display:flex; flex-direction:column; gap:8px;">
            ${customFields.length === 0 ? `
              <p style="font-size:0.8rem; color:var(--text-secondary); text-align:center; padding:12px; border:1px dashed var(--border-color); border-radius:6px;">
                No custom fields configured yet.
              </p>
            ` : customFields.map((f, i) => `
              <div style="display:flex; gap:8px; align-items:center;">
                <input type="text" class="form-control form-control-noicon field-lbl" style="flex:2;" placeholder="Field Label" value="${f.label}" required>
                <select class="select-control field-typ" style="flex:1; height:38px;">
                  <option value="text" ${f.type === 'text' ? 'selected' : ''}>Text</option>
                  <option value="number" ${f.type === 'number' ? 'selected' : ''}>Number</option>
                  <option value="date" ${f.type === 'date' ? 'selected' : ''}>Date</option>
                </select>
                <button type="button" class="btn btn-danger btn-sm btn-del-field" data-index="${i}" style="padding:8px 10px;">
                  <i data-lucide="trash-2" style="width:14px; height:14px;"></i>
                </button>
              </div>
            `).join('')}
          </div>
        </div>

        <div style="display:flex; justify-content: flex-end; gap: 12px; margin-top: 28px;">
          <button type="button" class="btn btn-secondary" onclick="document.getElementById('modal-overlay').classList.remove('active')" style="width: auto;">Cancel</button>
          <button type="submit" class="btn btn-primary" style="width: auto;">Save Changes</button>
        </div>
      </form>
    `;

    if (window.lucide) window.lucide.createIcons();

    // Bind sub actions inside form
    const addRowBtn = document.getElementById('btn-add-field-row');
    if (addRowBtn) {
      addRowBtn.addEventListener('click', () => {
        saveCurrentFieldsData();
        customFields.push({ name: `field_${Date.now()}`, type: 'text', label: '' });
        renderModalBody();
      });
    }

    body.querySelectorAll('.btn-del-field').forEach(btn => {
      btn.addEventListener('click', (e) => {
        saveCurrentFieldsData();
        const index = parseInt(e.currentTarget.getAttribute('data-index'));
        customFields.splice(index, 1);
        renderModalBody();
      });
    });

    document.getElementById('edit-cat-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('cat-name').value;
      saveCurrentFieldsData();

      try {
        stateStore.updateCategory(catId, name, customFields);
        overlay.classList.remove('active');
        showToast('Category updated successfully.', 'success');
        renderOrgSetup(mainContainer, user);
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  function saveCurrentFieldsData() {
    const labels = body.querySelectorAll('.field-lbl');
    const types = body.querySelectorAll('.field-typ');
    labels.forEach((inp, idx) => {
      if (customFields[idx]) {
        customFields[idx].label = inp.value;
        customFields[idx].type = types[idx].value;
        customFields[idx].name = inp.value.toLowerCase().replace(/[^a-z0-9]/g, '_');
      }
    });
  }

  renderModalBody();
  overlay.classList.add('active');
}

function triggerEditEmployeeModal(empId, mainContainer, user) {
  const overlay = document.getElementById('modal-overlay');
  const body = document.getElementById('modal-body');
  const title = document.getElementById('modal-title');
  const state = stateStore.state;
  const emp = state.users.find(u => u.id === empId);

  title.textContent = `Promote / Edit Employee: ${emp.name}`;
  body.innerHTML = `
    <form id="edit-emp-form">
      <div class="form-group">
        <label>Full Name</label>
        <input type="text" class="form-control form-control-noicon" value="${emp.name}" disabled>
      </div>
      <div class="form-group">
        <label>Email Address</label>
        <input type="email" class="form-control form-control-noicon" value="${emp.email}" disabled>
      </div>

      <div class="form-group">
        <label for="emp-dept">Assign Department</label>
        <select id="emp-dept" class="select-control" style="width:100%; height:42px;">
          <option value="">-- Select Department --</option>
          ${state.departments.filter(d => d.status === 'Active').map(d => `<option value="${d.id}" ${d.id === emp.departmentId ? 'selected' : ''}>${d.name}</option>`).join('')}
        </select>
      </div>

      <div class="form-group">
        <label for="emp-role">System Role (RBAC Promotion)</label>
        <select id="emp-role" class="select-control" style="width: 100%; height: 42px;">
          <option value="Employee" ${emp.role === 'Employee' ? 'selected' : ''}>Employee (Basic Access)</option>
          <option value="Department Head" ${emp.role === 'Department Head' ? 'selected' : ''}>Department Head</option>
          <option value="Asset Manager" ${emp.role === 'Asset Manager' ? 'selected' : ''}>Asset Manager</option>
          <option value="Admin" ${emp.role === 'Admin' ? 'selected' : ''}>Admin (Full Controls)</option>
        </select>
      </div>

      <div class="form-group">
        <label for="emp-status">Account Activity Status</label>
        <select id="emp-status" class="select-control" style="width: 100%; height: 42px;">
          <option value="Active" ${emp.status === 'Active' ? 'selected' : ''}>Active</option>
          <option value="Inactive" ${emp.status === 'Inactive' ? 'selected' : ''}>Inactive (Deactivated)</option>
        </select>
      </div>

      <div style="display:flex; justify-content: flex-end; gap: 12px; margin-top: 20px;">
        <button type="button" class="btn btn-secondary" onclick="document.getElementById('modal-overlay').classList.remove('active')" style="width: auto;">Cancel</button>
        <button type="submit" class="btn btn-primary" style="width: auto;">Save Assignments</button>
      </div>
    </form>
  `;

  overlay.classList.add('active');

  document.getElementById('edit-emp-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const deptId = document.getElementById('emp-dept').value || null;
    const role = document.getElementById('emp-role').value;
    const status = document.getElementById('emp-status').value;

    try {
      // Update local values in state
      emp.departmentId = deptId;
      
      // Perform promotions via state triggers to log changes properly
      if (emp.role !== role) {
        stateStore.promoteEmployee(empId, role);
      }
      
      if (emp.status !== status) {
        stateStore.updateEmployeeStatus(empId, status);
      } else {
        // Just emit regular state update
        stateStore._emit();
      }

      overlay.classList.remove('active');
      showToast('Employee parameters updated successfully.', 'success');
      renderOrgSetup(mainContainer, user);
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}
