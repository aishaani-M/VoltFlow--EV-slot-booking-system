/* profile.js – dual profile: User (multi-vehicle) vs Station Owner (workers) */
const Profile = {
  data:null, editing:false, workers:[], vehicles:[],

  async load(){
    const el=document.getElementById('profile-content');
    el.innerHTML='<div class="skeleton" style="height:200px;border-radius:20px;margin-bottom:16px"></div>';
    try{
      this.data=await API.get('/api/profile');
      this.vehicles=this.data.vehicles||[];
      if(App.isStation()) this.workers=await API.get('/api/station-admin/workers');
      this.render();
    }catch{el.innerHTML='<p style="color:var(--red);padding:20px">Failed to load profile</p>';}
  },

  render(){
    if(App.isStation()) return this.renderStationProfile(this.data);
    this.renderUserProfile(this.data);
  },

  _vIcon(t){
    const m={car:'fa-car',suv:'fa-truck-monster',scooter:'fa-motorcycle',bike:'fa-bicycle',truck:'fa-truck'};
    return m[t]||'fa-car';
  },

  /* ── USER PROFILE ── */
  renderUserProfile(u){
    const initial=u.name?u.name[0].toUpperCase():'?';
    document.getElementById('profile-content').innerHTML=`
      <div class="profile-hero">
        <div class="profile-avatar">${initial}</div>
        <div class="profile-info" style="flex:1">
          <h2>${u.name}</h2><p>${u.email}</p>
          <p style="margin-top:4px;font-size:.8rem"><span class="badge badge-available">EV User</span></p>
        </div>
        <div class="profile-stats">
          <div class="profile-stat"><span class="profile-stat-val">${u.total_bookings}</span><span class="profile-stat-lbl">Bookings</span></div>
          <div class="profile-stat"><span class="profile-stat-val">₹${Number(u.total_spent).toFixed(0)}</span><span class="profile-stat-lbl">Spent</span></div>
          <div class="profile-stat"><span class="profile-stat-val">${this.vehicles.length}</span><span class="profile-stat-lbl">Vehicles</span></div>
        </div>
      </div>

      <!-- Personal Info -->
      <div class="profile-section">
        <div class="profile-section-header"><h3><i class="fa-solid fa-user"></i> Personal Information</h3>
          <button class="btn-secondary" onclick="Profile.toggleEdit()" id="edit-btn"><i class="fa-solid fa-pen"></i> Edit</button></div>
        <div id="profile-view"><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px">
          ${this.fv('Name',u.name)}${this.fv('Email',u.email)}${this.fv('Phone',u.phone||'—')}${this.fv('Member Since',App.formatDate(u.created_at))}
        </div></div>
        <div id="profile-edit" class="hidden">
          <div class="form-row"><div class="form-group"><label>Full Name</label><input type="text" id="edit-name" value="${u.name}"/></div>
          <div class="form-group"><label>Phone</label><input type="text" id="edit-phone" value="${u.phone||''}"/></div></div>
          <div style="display:flex;gap:10px;margin-top:8px"><button class="btn-primary" onclick="Profile.save()"><i class="fa-solid fa-check"></i> Save</button>
          <button class="btn-secondary" onclick="Profile.toggleEdit()">Cancel</button></div>
        </div>
      </div>

      <!-- Vehicles Section -->
      <div class="profile-section">
        <div class="profile-section-header">
          <h3><i class="fa-solid fa-car-side" style="color:var(--neon)"></i> My Vehicles</h3>
          <button class="btn-primary" style="padding:8px 16px;font-size:.82rem" onclick="Profile.toggleVehicleForm()"><i class="fa-solid fa-plus"></i> Add Vehicle</button>
        </div>

        <!-- Add Vehicle Form -->
        <div id="vehicle-form" class="hidden" style="margin-bottom:16px">
          <div class="sa-add-charger-box">
            <h4 style="font-size:.88rem;margin-bottom:12px"><i class="fa-solid fa-car-side" style="color:var(--neon)"></i> New Vehicle</h4>
            <div class="form-row">
              <div class="form-group"><label>Model *</label><input type="text" id="v-model" placeholder="e.g. Tata Nexon EV"/></div>
              <div class="form-group"><label>Number</label><input type="text" id="v-number" placeholder="DL-01-AB-1234" style="text-transform:uppercase"/></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Type</label>
                <select id="v-type">
                  <option value="car">🚗 Car</option>
                  <option value="suv">🚙 SUV</option>
                  <option value="scooter">🛵 Scooter</option>
                  <option value="bike">🚲 Bike</option>
                  <option value="truck">🚛 Truck</option>
                </select></div>
              <div class="form-group"><label>Color</label><input type="text" id="v-color" placeholder="e.g. White"/></div>
            </div>
            <div style="display:flex;gap:8px;margin-top:8px">
              <button class="btn-primary" onclick="Profile.addVehicle()"><i class="fa-solid fa-check"></i> Add Vehicle</button>
              <button class="btn-secondary" onclick="Profile.toggleVehicleForm()">Cancel</button>
            </div>
          </div>
        </div>

        <!-- Vehicle Cards -->
        ${this.vehicles.length ? `
        <div class="vehicles-grid">
          ${this.vehicles.map(v => `
            <div class="vehicle-card ${v.is_primary?'primary':''}">
              ${v.is_primary?'<span class="vehicle-primary-badge">⭐ Primary</span>':''}
              <div class="vehicle-card-header">
                <div class="vehicle-type-icon vtype-${v.vehicle_type}"><i class="fa-solid ${this._vIcon(v.vehicle_type)}"></i></div>
                <div>
                  <div class="vehicle-card-model">${v.model}</div>
                  <div class="vehicle-card-number">${v.number||'No plate'}</div>
                </div>
              </div>
              <div class="vehicle-card-meta">
                ${v.color?'<span><i class="fa-solid fa-palette"></i> '+v.color+'</span>':''}
                <span><i class="fa-solid fa-tag"></i> ${v.vehicle_type}</span>
                <span><i class="fa-solid fa-calendar"></i> ${App.formatDate(v.created_at)}</span>
              </div>
              <div class="vehicle-card-actions">
                ${!v.is_primary?'<button class="btn-secondary" style="padding:5px 12px;font-size:.75rem" onclick="Profile.setPrimary('+v.id+')"><i class="fa-solid fa-star"></i> Set Primary</button>':''}
                <button class="btn-danger" style="padding:5px 10px;font-size:.75rem" onclick="Profile.removeVehicle(${v.id})"><i class="fa-solid fa-trash"></i> Remove</button>
              </div>
            </div>
          `).join('')}
        </div>
        ` : '<div style="text-align:center;padding:30px;color:var(--text-300);border:2px dashed var(--glass-border);border-radius:var(--radius-md)"><i class="fa-solid fa-car" style="font-size:1.5rem;display:block;margin-bottom:8px"></i><p>No vehicles added yet. Add your first EV!</p></div>'}
      </div>

      <!-- Quick Links -->
      <div class="profile-section"><h3 style="margin-bottom:14px"><i class="fa-solid fa-link" style="color:var(--neon)"></i> Quick Actions</h3>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn-secondary" onclick="App.navigate('bookings')"><i class="fa-solid fa-calendar-check"></i> My Bookings</button>
          <button class="btn-secondary" onclick="App.navigate('stations')"><i class="fa-solid fa-charging-station"></i> Find Stations</button>
          <button class="btn-danger" onclick="Auth.logout()"><i class="fa-solid fa-right-from-bracket"></i> Logout</button>
        </div>
      </div>`;
  },

  /* ── STATION OWNER PROFILE ── */
  renderStationProfile(u){
    const initial=u.name?u.name[0].toUpperCase():'?';
    const totalWorkerRev=this.workers.reduce((s,w)=>s+w.revenue,0);
    const totalHandled=this.workers.reduce((s,w)=>s+w.bookings_handled,0);
    document.getElementById('profile-content').innerHTML=`
      <div class="profile-hero">
        <div class="profile-avatar" style="background:linear-gradient(135deg,var(--neon),var(--accent))">${initial}</div>
        <div class="profile-info" style="flex:1">
          <h2>${u.name}</h2><p>${u.email}</p>
          <p style="margin-top:4px;font-size:.8rem"><span class="badge badge-busy">Station Owner</span></p>
        </div>
        <div class="profile-stats">
          <div class="profile-stat"><span class="profile-stat-val">${this.workers.length}</span><span class="profile-stat-lbl">Workers</span></div>
          <div class="profile-stat"><span class="profile-stat-val">${totalHandled}</span><span class="profile-stat-lbl">Handled</span></div>
          <div class="profile-stat"><span class="profile-stat-val">${new Date(u.created_at).getFullYear()}</span><span class="profile-stat-lbl">Joined</span></div>
        </div>
      </div>
      <div class="profile-section">
        <div class="profile-section-header"><h3><i class="fa-solid fa-user-tie" style="color:var(--neon)"></i> Owner Details</h3>
          <button class="btn-secondary" onclick="Profile.toggleEdit()" id="edit-btn"><i class="fa-solid fa-pen"></i> Edit</button></div>
        <div id="profile-view"><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px">
          ${this.fv('Name',u.name)}${this.fv('Email',u.email)}${this.fv('Phone',u.phone||'—')}${this.fv('Member Since',App.formatDate(u.created_at))}
        </div></div>
        <div id="profile-edit" class="hidden">
          <div class="form-row"><div class="form-group"><label>Full Name</label><input type="text" id="edit-name" value="${u.name}"/></div>
          <div class="form-group"><label>Phone</label><input type="text" id="edit-phone" value="${u.phone||''}"/></div></div>
          <div style="display:flex;gap:10px;margin-top:8px"><button class="btn-primary" onclick="Profile.save()"><i class="fa-solid fa-check"></i> Save</button>
          <button class="btn-secondary" onclick="Profile.toggleEdit()">Cancel</button></div>
        </div>
      </div>
      <div class="profile-section">
        <div class="profile-section-header">
          <h3><i class="fa-solid fa-users-gear" style="color:var(--neon)"></i> Station Workers</h3>
          <button class="btn-primary" onclick="Profile.toggleWorkerForm()"><i class="fa-solid fa-user-plus"></i> Add Worker</button>
        </div>
        <div id="worker-form" class="hidden" style="margin-bottom:20px">
          <div class="sa-add-charger-box">
            <h4 style="font-size:.88rem;margin-bottom:12px"><i class="fa-solid fa-user-plus" style="color:var(--neon)"></i> New Worker</h4>
            <div class="form-row">
              <div class="form-group"><label>Name *</label><input type="text" id="wk-name" placeholder="Full name"/></div>
              <div class="form-group"><label>Email</label><input type="email" id="wk-email" placeholder="worker@email.com"/></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Phone</label><input type="tel" id="wk-phone" placeholder="9876543210"/></div>
              <div class="form-group"><label>Role</label>
                <select id="wk-role"><option value="operator">Operator</option><option value="technician">Technician</option><option value="supervisor">Supervisor</option><option value="attendant">Attendant</option></select></div>
            </div>
            <div class="form-group"><label>Shift</label>
              <select id="wk-shift"><option value="day">Day (6AM–6PM)</option><option value="night">Night (6PM–6AM)</option><option value="flexible">Flexible</option></select></div>
            <div style="display:flex;gap:8px;margin-top:8px">
              <button class="btn-primary" onclick="Profile.addWorker()"><i class="fa-solid fa-check"></i> Add Worker</button>
              <button class="btn-secondary" onclick="Profile.toggleWorkerForm()">Cancel</button>
            </div>
          </div>
        </div>
        ${this.workers.length ? `
        <div style="overflow-x:auto">
          <table class="data-table"><thead><tr>
            <th>Name</th><th>Role</th><th>Shift</th><th>Bookings</th><th>Completed</th><th>Revenue</th><th>Status</th><th>Actions</th>
          </tr></thead><tbody>
          ${this.workers.map(w=>`<tr>
            <td><div style="display:flex;align-items:center;gap:10px">
              <div class="worker-avatar">${w.name[0]}</div>
              <div><div style="font-weight:600">${w.name}</div><div style="font-size:.75rem;color:var(--text-300)">${w.email||w.phone||''}</div></div>
            </div></td>
            <td><span class="worker-role-badge role-${w.role}">${w.role}</span></td>
            <td><span style="font-size:.8rem"><i class="fa-solid ${w.shift==='day'?'fa-sun':'fa-moon'}" style="color:${w.shift==='day'?'var(--yellow)':'var(--accent)'}"></i> ${w.shift}</span></td>
            <td style="font-weight:600">${w.bookings_handled}</td>
            <td><span style="color:var(--neon)">${w.completed}</span></td>
            <td style="color:var(--neon);font-weight:600">₹${Number(w.revenue).toLocaleString('en-IN')}</td>
            <td><span class="badge badge-${w.status==='active'?'available':'full'}">${w.status}</span></td>
            <td><button class="btn-danger" style="padding:4px 8px;font-size:.72rem" onclick="Profile.removeWorker(${w.id})"><i class="fa-solid fa-trash"></i></button></td>
          </tr>`).join('')}
          </tbody></table>
        </div>` : '<div style="text-align:center;padding:30px;color:var(--text-300);border:2px dashed var(--glass-border);border-radius:var(--radius-md)"><i class="fa-solid fa-users" style="font-size:1.5rem;display:block;margin-bottom:8px"></i><p>No workers added yet</p></div>'}
        ${this.workers.length ? `
        <div class="stats-grid stagger-children" style="margin-top:20px">
          <div class="stat-card"><div class="stat-icon green"><i class="fa-solid fa-users"></i></div><div class="stat-value">${this.workers.filter(w=>w.status==='active').length}</div><div class="stat-label">Active Workers</div></div>
          <div class="stat-card"><div class="stat-icon blue"><i class="fa-solid fa-clipboard-check"></i></div><div class="stat-value">${totalHandled}</div><div class="stat-label">Total Handled</div></div>
          <div class="stat-card"><div class="stat-icon yellow"><i class="fa-solid fa-indian-rupee-sign"></i></div><div class="stat-value">₹${Number(totalWorkerRev).toLocaleString('en-IN')}</div><div class="stat-label">Worker Revenue</div></div>
          <div class="stat-card"><div class="stat-icon red"><i class="fa-solid fa-chart-line"></i></div><div class="stat-value">₹${this.workers.length?Math.round(totalWorkerRev/this.workers.length):0}</div><div class="stat-label">Avg/Worker</div></div>
        </div>` : ''}
      </div>
      <div class="profile-section"><h3 style="margin-bottom:14px"><i class="fa-solid fa-link" style="color:var(--neon)"></i> Quick Actions</h3>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn-secondary" onclick="App.navigate('station-admin')"><i class="fa-solid fa-gauge-high"></i> Dashboard</button>
          <button class="btn-secondary" onclick="App.navigate('stations')"><i class="fa-solid fa-charging-station"></i> All Stations</button>
          <button class="btn-danger" onclick="Auth.logout()"><i class="fa-solid fa-right-from-bracket"></i> Logout</button>
        </div>
      </div>`;
  },

  /* ── HELPERS ── */
  fv(label,value){return'<div class="profile-field"><div class="profile-field-label">'+label+'</div><div class="profile-field-value">'+value+'</div></div>';},

  toggleEdit(){
    const v=document.getElementById('profile-view'),e=document.getElementById('profile-edit'),b=document.getElementById('edit-btn');
    const show=e.classList.contains('hidden');e.classList.toggle('hidden',!show);v.classList.toggle('hidden',show);
    b.innerHTML=show?'<i class="fa-solid fa-xmark"></i> Cancel':'<i class="fa-solid fa-pen"></i> Edit';
  },

  toggleVehicleForm(){ document.getElementById('vehicle-form')?.classList.toggle('hidden'); },
  toggleWorkerForm(){ document.getElementById('worker-form')?.classList.toggle('hidden'); },

  async save(){
    const name=document.getElementById('edit-name').value.trim(),phone=document.getElementById('edit-phone').value.trim();
    try{await API.put('/api/profile',{name,phone,vehicle_model:this.data.vehicle_model,vehicle_number:this.data.vehicle_number});
      App.toast('Profile updated!','success');await this.load();App.updateSidebar();}catch{App.toast('Failed','error');}
  },

  /* ── VEHICLE CRUD ── */
  async addVehicle(){
    const model=document.getElementById('v-model')?.value.trim();
    if(!model){App.toast('Vehicle model required','error');return;}
    try{
      await API.post('/api/vehicles',{
        model, number:document.getElementById('v-number')?.value.trim().toUpperCase()||'',
        vehicle_type:document.getElementById('v-type')?.value||'car',
        color:document.getElementById('v-color')?.value.trim()||''
      });
      App.toast('Vehicle added! 🚗','success'); this.load();
    }catch(e){App.toast(e.message||'Failed','error');}
  },

  async removeVehicle(id){
    if(!confirm('Remove this vehicle?'))return;
    try{await API.delete('/api/vehicles/'+id);App.toast('Vehicle removed','info');this.load();}
    catch(e){App.toast(e.message,'error');}
  },

  async setPrimary(id){
    try{await API.post('/api/vehicles/'+id+'/primary');App.toast('Set as primary!','success');this.load();}
    catch(e){App.toast(e.message,'error');}
  },

  /* ── WORKER CRUD ── */
  async addWorker(){
    const name=document.getElementById('wk-name')?.value.trim();
    if(!name){App.toast('Worker name required','error');return;}
    try{
      await API.post('/api/station-admin/workers',{
        name, email:document.getElementById('wk-email')?.value.trim()||'',
        phone:document.getElementById('wk-phone')?.value.trim()||'',
        role:document.getElementById('wk-role')?.value||'operator',
        shift:document.getElementById('wk-shift')?.value||'day'
      });
      App.toast('Worker added!','success');this.load();
    }catch(e){App.toast(e.message||'Failed','error');}
  },

  async removeWorker(id){
    if(!confirm('Remove this worker?'))return;
    try{await API.delete('/api/station-admin/workers/'+id);App.toast('Worker removed','info');this.load();}
    catch(e){App.toast(e.message,'error');}
  }
};
