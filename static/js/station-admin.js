/* Station Dashboard – merged admin + station management */
const StationAdmin = {
  data:null,platformData:null,allStations:[],addMode:false,editMode:false,
  selectedAmenities:[],chargersList:[],pickerMap:null,pickerMarker:null,activeTab:'overview',

  async load(){
    const el=document.getElementById('station-admin-content');if(!el)return;
    if(!App.currentUser?.station_id){this.addMode=true;this.renderAddForm();return;}
    this.addMode=false;
    el.innerHTML='<div class="skeleton" style="height:200px;border-radius:16px"></div>';
    try{
      const[st,pl]=await Promise.all([API.get('/api/station-admin/stats'),API.get('/api/admin/stats')]);
      this.data=st;this.platformData=pl;this.allStations=pl.all_stations||[];this.render();
    }catch(e){el.innerHTML='<p style="color:var(--red);padding:20px">'+e.message+'</p>';}
  },

  render(){
    const d=this.data,s=d.station,p=this.platformData,el=document.getElementById('station-admin-content');
    el.innerHTML=`
    <div class="station-detail-hero scan-wrap" style="margin-bottom:20px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px">
        <div>
          <div class="station-detail-name">${s.name}</div>
          <div class="station-detail-addr"><i class="fa-solid fa-location-dot"></i> ${s.address}, ${s.city}${s.state?', '+s.state:''}</div>
          ${s.description?'<p style="color:var(--text-300);font-size:.85rem;margin-top:8px">'+s.description+'</p>':''}
          <div style="display:flex;gap:12px;margin-top:8px;flex-wrap:wrap;font-size:.8rem;color:var(--text-300)">
            ${s.operating_hours?'<span><i class="fa-solid fa-clock" style="color:var(--neon)"></i> '+s.operating_hours+'</span>':''}
            ${s.contact_phone?'<span><i class="fa-solid fa-phone" style="color:var(--neon)"></i> '+s.contact_phone+'</span>':''}
            ${s.station_type?'<span><i class="fa-solid fa-tag" style="color:var(--neon)"></i> '+s.station_type+'</span>':''}
          </div>
        </div>
        ${App.availBadge(s.available_chargers,s.total_chargers)}
      </div>
      <div style="display:flex;gap:20px;margin-top:16px;flex-wrap:wrap">
        <div class="detail-stat"><span class="detail-stat-val gradient-text">${s.available_chargers}/${s.total_chargers}</span><span class="detail-stat-lbl">Available</span></div>
        <div class="detail-stat"><span class="detail-stat-val">${s.rating} <span class="stars" style="font-size:.85rem">${App.stars(s.rating)}</span></span><span class="detail-stat-lbl">Rating</span></div>
      </div>
      <div style="display:flex;gap:8px;margin-top:12px"><button class="btn-secondary" onclick="StationAdmin.showEditForm()"><i class="fa-solid fa-pen"></i> Edit Station</button></div>
    </div>
    <div class="booking-tabs" style="margin-bottom:20px">
      <button class="tab-btn ${this.activeTab==='overview'?'active':''}" onclick="StationAdmin.switchTab('overview')">Overview</button>
      <button class="tab-btn ${this.activeTab==='bookings'?'active':''}" onclick="StationAdmin.switchTab('bookings')">Bookings</button>
      <button class="tab-btn ${this.activeTab==='chargers'?'active':''}" onclick="StationAdmin.switchTab('chargers')">Chargers</button>
      <button class="tab-btn ${this.activeTab==='all-stations'?'active':''}" onclick="StationAdmin.switchTab('all-stations')">All Stations</button>
    </div>
    <div id="sa-tab-overview" class="${this.activeTab==='overview'?'':'hidden'}">${this._overview(d,p)}</div>
    <div id="sa-tab-bookings" class="${this.activeTab==='bookings'?'':'hidden'}">${this._bookings(d)}</div>
    <div id="sa-tab-chargers" class="${this.activeTab==='chargers'?'':'hidden'}">${this._chargers(d)}</div>
    <div id="sa-tab-all-stations" class="${this.activeTab==='all-stations'?'':'hidden'}">${this._allStations()}</div>`;
  },

  switchTab(t){this.activeTab=t;['overview','bookings','chargers','all-stations'].forEach(x=>{const e=document.getElementById('sa-tab-'+x);if(e)e.classList.toggle('hidden',x!==t);});document.querySelectorAll('#station-admin-content .tab-btn').forEach((b,i)=>{b.classList.toggle('active',['overview','bookings','chargers','all-stations'][i]===t);});},

  _overview(d,p){return`
    <div class="stats-grid stagger-children">
      <div class="stat-card"><div class="stat-icon green"><i class="fa-solid fa-indian-rupee-sign"></i></div><div class="stat-value">₹${Number(d.revenue).toLocaleString('en-IN')}</div><div class="stat-label">My Revenue</div></div>
      <div class="stat-card"><div class="stat-icon blue"><i class="fa-solid fa-calendar-check"></i></div><div class="stat-value">${d.total_bookings}</div><div class="stat-label">My Bookings</div></div>
      <div class="stat-card"><div class="stat-icon yellow"><i class="fa-solid fa-clock"></i></div><div class="stat-value">${d.upcoming}</div><div class="stat-label">Upcoming</div></div>
      <div class="stat-card"><div class="stat-icon red"><i class="fa-solid fa-ban"></i></div><div class="stat-value">${d.cancelled}</div><div class="stat-label">Cancelled</div></div>
    </div>
    <h3 style="font-size:1rem;font-weight:700;margin:20px 0 14px;display:flex;align-items:center;gap:8px"><i class="fa-solid fa-earth-americas" style="color:var(--neon)"></i> Platform Overview</h3>
    <div class="stats-grid stagger-children">
      <div class="stat-card"><div class="stat-icon green"><i class="fa-solid fa-charging-station"></i></div><div class="stat-value">${p.total_stations}</div><div class="stat-label">Total Stations</div></div>
      <div class="stat-card"><div class="stat-icon blue"><i class="fa-solid fa-users"></i></div><div class="stat-value">${p.total_users}</div><div class="stat-label">Users</div></div>
      <div class="stat-card"><div class="stat-icon yellow"><i class="fa-solid fa-calendar-check"></i></div><div class="stat-value">${p.total_bookings}</div><div class="stat-label">All Bookings</div></div>
      <div class="stat-card"><div class="stat-icon red"><i class="fa-solid fa-indian-rupee-sign"></i></div><div class="stat-value">₹${Number(p.total_revenue).toLocaleString('en-IN')}</div><div class="stat-label">Platform Revenue</div></div>
    </div>`;},

  _bkAct(b){
    if(b.status==='upcoming')return'<button class="btn-primary" style="padding:4px 10px;font-size:.72rem" onclick="StationAdmin.completeBk('+b.id+')"><i class="fa-solid fa-check"></i> Complete</button>';
    if(b.status==='pending')return'<button class="btn-primary" style="padding:4px 10px;font-size:.72rem" onclick="StationAdmin.acceptBk('+b.id+')"><i class="fa-solid fa-check"></i> Accept</button>';
    return'—';},
  async acceptBk(id){try{await API.post('/api/station-admin/bookings/'+id+'/accept');App.toast('Accepted','success');this.load();}catch(e){App.toast(e.message,'error');}},
  async completeBk(id){if(!confirm('Mark completed?'))return;try{await API.post('/api/station-admin/bookings/'+id+'/complete');App.toast('Completed','success');this.load();}catch(e){App.toast(e.message,'error');}},

  _bookings(d){return`<div class="admin-table-wrap"><div class="admin-table-header"><h3><i class="fa-solid fa-list" style="color:var(--neon);margin-right:8px"></i> Station Bookings</h3></div><div style="overflow-x:auto"><table class="data-table"><thead><tr><th>Ref</th><th>User</th><th>Charger</th><th>Date</th><th>Time</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead><tbody>${d.bookings.length?d.bookings.map(b=>'<tr><td style="font-family:monospace;font-size:.78rem;color:var(--text-300)">'+b.booking_ref+'</td><td>'+b.user_name+'</td><td><span class="charger-badge '+(b.charger_type||'').replace(' ','')+'">'+b.charger_type+'</span></td><td style="color:var(--text-300)">'+App.formatDate(b.booking_date)+'</td><td>'+b.start_time+'–'+b.end_time+'</td><td style="color:var(--neon);font-weight:600">₹'+Number(b.total_amount).toFixed(2)+'</td><td><span class="badge badge-'+b.status+'">'+b.status+'</span></td><td>'+this._bkAct(b)+'</td></tr>').join(''):'<tr><td colspan="8" style="text-align:center;color:var(--text-300);padding:24px">No bookings yet</td></tr>'}</tbody></table></div></div>`;},

  _chargers(d){return`<div class="admin-form"><h3><i class="fa-solid fa-plug"></i> Chargers</h3><div class="chargers-list" style="margin-bottom:16px">${d.chargers.map(c=>'<div class="charger-item"><div class="charger-info"><i class="fa-solid fa-bolt charger-icon"></i><div><div class="charger-name">'+c.type+'</div><div class="charger-power">'+c.power_kw+' kW · ₹'+c.price_per_kwh+'/kWh</div></div><span class="badge badge-'+(c.status==='available'?'available':'full')+'">'+c.status+'</span></div><button class="btn-danger" style="padding:5px 10px;font-size:.75rem" onclick="StationAdmin.removeCharger('+c.id+')"><i class="fa-solid fa-trash"></i></button></div>').join('')}</div><h4 style="font-size:.88rem;margin-bottom:10px"><i class="fa-solid fa-circle-plus" style="color:var(--neon)"></i> Add Charger</h4><div class="form-row"><div class="form-group"><label>Type</label><select id="sa-ctype"><option>CCS</option><option>CHAdeMO</option><option>Type 2</option><option>Tesla</option></select></div><div class="form-group"><label>Power (kW)</label><input type="number" id="sa-cpow" value="150" min="1"/></div></div><div class="form-group"><label>Price (₹/kWh)</label><input type="number" id="sa-cprice" value="18" min="1" step="0.5"/></div><button class="btn-primary" onclick="StationAdmin.addCharger()"><i class="fa-solid fa-plus"></i> Add Charger</button></div>`;},

  _allStations(){return`<div class="admin-table-wrap"><div class="admin-table-header"><h3><i class="fa-solid fa-list" style="color:var(--neon);margin-right:8px"></i> All Stations</h3><button class="btn-secondary" onclick="StationAdmin.load()"><i class="fa-solid fa-rotate"></i> Refresh</button></div><div style="overflow-x:auto"><table class="data-table"><thead><tr><th>#</th><th>Name</th><th>City</th><th>Available</th><th>Rating</th><th>Actions</th></tr></thead><tbody>${this.allStations.map(s=>'<tr><td style="color:var(--text-300)">'+s.id+'</td><td style="font-weight:600">'+s.name+'</td><td style="color:var(--text-300)">'+s.city+'</td><td><div style="display:flex;align-items:center;gap:8px"><div class="progress-bar" style="width:80px"><div class="progress-fill" style="width:'+(s.total_chargers?(s.available_chargers/s.total_chargers*100):0)+'%"></div></div><span style="font-size:.8rem">'+s.available_chargers+'/'+s.total_chargers+'</span></div></td><td><span class="stars" style="font-size:.8rem">'+App.stars(s.rating)+'</span> '+s.rating+'</td><td><button class="btn-danger" style="padding:5px 10px;font-size:.75rem" onclick="StationAdmin.delStation('+s.id+')"><i class="fa-solid fa-trash"></i></button></td></tr>').join('')}</tbody></table></div></div>`;},

  async delStation(id){if(!confirm('Deactivate?'))return;try{await API.delete('/api/stations/'+id);App.toast('Deactivated','info');this.load();}catch(e){App.toast(e.message,'error');}},

  /* ── ADD/EDIT STATION FORM ── */
  renderAddForm(){
    this.selectedAmenities=[];this.chargersList=[];
    const el=document.getElementById('station-admin-content');
    el.innerHTML=`
    <div class="sa-add-hero"><div class="sa-add-hero-icon"><i class="fa-solid fa-charging-station"></i></div><h2>Add Your Station</h2><p>Register your EV charging station on VoltFlow</p></div>
    <div class="sa-add-form">
      <div class="sa-steps">
        <div class="sa-step active" data-step="1"><span class="sa-step-num">1</span><span class="sa-step-label">Basic Info</span></div><div class="sa-step-line"></div>
        <div class="sa-step" data-step="2"><span class="sa-step-num">2</span><span class="sa-step-label">Location</span></div><div class="sa-step-line"></div>
        <div class="sa-step" data-step="3"><span class="sa-step-num">3</span><span class="sa-step-label">Amenities</span></div><div class="sa-step-line"></div>
        <div class="sa-step" data-step="4"><span class="sa-step-num">4</span><span class="sa-step-label">Chargers</span></div>
      </div>
      <div class="sa-form-step active" id="sa-step-1">
        <h3><i class="fa-solid fa-building" style="color:var(--neon)"></i> Station Details</h3>
        <div class="form-group"><label>Station Name *</label><input type="text" id="sa-name" placeholder="e.g. PowerGrid Beta"/></div>
        <div class="form-group"><label>Description</label><textarea id="sa-desc" rows="3" placeholder="Brief description..." style="resize:vertical"></textarea></div>
        <div class="form-row"><div class="form-group"><label>Type</label><select id="sa-type"><option value="public">Public</option><option value="semi-public">Semi-Public</option><option value="private">Private</option></select></div><div class="form-group"><label>Hours</label><select id="sa-hours"><option value="24/7">24/7</option><option value="6AM - 10PM">6AM–10PM</option><option value="8AM - 8PM">8AM–8PM</option></select></div></div>
        <div class="form-row"><div class="form-group"><label>Phone</label><input type="tel" id="sa-phone" placeholder="9876543210"/></div><div class="form-group"><label>Email</label><input type="email" id="sa-email" placeholder="station@example.com"/></div></div>
        <div style="display:flex;justify-content:flex-end;margin-top:8px"><button class="btn-primary" onclick="StationAdmin.nextStep(2)">Next <i class="fa-solid fa-arrow-right"></i></button></div>
      </div>
      <div class="sa-form-step" id="sa-step-2">
        <h3><i class="fa-solid fa-map-location-dot" style="color:var(--neon)"></i> Location</h3>
        <div class="form-group"><label>Address *</label><input type="text" id="sa-address" placeholder="Building, Street"/></div>
        <div class="form-row"><div class="form-group"><label>City *</label><input type="text" id="sa-city" placeholder="New Delhi"/></div><div class="form-group"><label>State</label><input type="text" id="sa-state" placeholder="Delhi"/></div></div>
        <div class="form-group"><label>Country</label><input type="text" id="sa-country" value="India"/></div>
        <div class="form-row"><div class="form-group"><label>Latitude *</label><input type="number" id="sa-lat" placeholder="28.6315" step="any"/></div><div class="form-group"><label>Longitude *</label><input type="number" id="sa-lng" placeholder="77.2167" step="any"/></div></div>
        <p style="font-size:.8rem;color:var(--text-300);margin-bottom:8px"><i class="fa-solid fa-info-circle" style="color:var(--accent)"></i> Click the map to set coordinates</p>
        <div id="sa-location-map" style="height:220px;border-radius:var(--radius-md);border:1px solid var(--glass-border);margin-bottom:12px"></div>
        <div style="display:flex;justify-content:space-between;margin-top:8px"><button class="btn-secondary" onclick="StationAdmin.nextStep(1)"><i class="fa-solid fa-arrow-left"></i> Back</button><button class="btn-primary" onclick="StationAdmin.nextStep(3)">Next <i class="fa-solid fa-arrow-right"></i></button></div>
      </div>
      <div class="sa-form-step" id="sa-step-3">
        <h3><i class="fa-solid fa-star" style="color:var(--neon)"></i> Amenities</h3>
        <div class="sa-amenities-grid" id="sa-amenities-grid"></div>
        <div style="display:flex;justify-content:space-between;margin-top:20px"><button class="btn-secondary" onclick="StationAdmin.nextStep(2)"><i class="fa-solid fa-arrow-left"></i> Back</button><button class="btn-primary" onclick="StationAdmin.nextStep(4)">Next <i class="fa-solid fa-arrow-right"></i></button></div>
      </div>
      <div class="sa-form-step" id="sa-step-4">
        <h3><i class="fa-solid fa-plug-circle-bolt" style="color:var(--neon)"></i> Chargers</h3>
        <div id="sa-chargers-list" class="sa-chargers-preview"></div>
        <div class="sa-add-charger-box"><h4 style="font-size:.88rem;margin-bottom:12px"><i class="fa-solid fa-circle-plus" style="color:var(--neon)"></i> Add Charger Type</h4>
          <div class="form-row"><div class="form-group"><label>Type</label><select id="sa-new-ctype"><option value="CCS">CCS</option><option value="CHAdeMO">CHAdeMO</option><option value="Type 2">Type 2</option><option value="Tesla">Tesla</option></select></div><div class="form-group"><label>Power (kW)</label><input type="number" id="sa-new-cpow" value="150" min="1"/></div></div>
          <div class="form-row"><div class="form-group"><label>Price (₹/kWh)</label><input type="number" id="sa-new-cprice" value="18" min="1" step="0.5"/></div><div class="form-group"><label>Qty</label><input type="number" id="sa-new-ccount" value="2" min="1"/></div></div>
          <button class="btn-secondary" onclick="StationAdmin.addChargerToList()"><i class="fa-solid fa-plus"></i> Add</button>
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:20px"><button class="btn-secondary" onclick="StationAdmin.nextStep(3)"><i class="fa-solid fa-arrow-left"></i> Back</button><button class="btn-primary" onclick="StationAdmin.submitStation()" id="sa-submit-btn"><i class="fa-solid fa-rocket"></i> Register Station</button></div>
      </div>
    </div>`;
    this.renderAmenities();this.renderChargersList();setTimeout(()=>this.initPickerMap(),200);
  },

  nextStep(n){
    if(n===2&&!document.getElementById('sa-name')?.value.trim()){App.toast('Name required','error');return;}
    if(n===3){if(!document.getElementById('sa-address')?.value.trim()||!document.getElementById('sa-city')?.value.trim()){App.toast('Address & city required','error');return;}}
    document.querySelectorAll('.sa-form-step').forEach(s=>s.classList.remove('active'));
    document.getElementById('sa-step-'+n)?.classList.add('active');
    document.querySelectorAll('.sa-step').forEach(s=>{const sn=parseInt(s.dataset.step);s.classList.toggle('active',sn===n);s.classList.toggle('done',sn<n);});
    if(n===2)setTimeout(()=>this.initPickerMap(),100);
  },

  initPickerMap(){const c=document.getElementById('sa-location-map');if(!c||c._leaflet_id)return;const lat=parseFloat(document.getElementById('sa-lat')?.value)||20.59;const lng=parseFloat(document.getElementById('sa-lng')?.value)||78.96;this.pickerMap=L.map('sa-location-map').setView([lat,lng],5);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OSM'}).addTo(this.pickerMap);this.pickerMap.on('click',e=>{document.getElementById('sa-lat').value=e.latlng.lat.toFixed(6);document.getElementById('sa-lng').value=e.latlng.lng.toFixed(6);if(this.pickerMarker)this.pickerMap.removeLayer(this.pickerMarker);this.pickerMarker=L.marker([e.latlng.lat,e.latlng.lng]).addTo(this.pickerMap);});},

  allAmenities:[{id:'WiFi',icon:'fa-wifi',label:'WiFi'},{id:'Cafe',icon:'fa-mug-hot',label:'Café'},{id:'Restaurant',icon:'fa-utensils',label:'Restaurant'},{id:'Restroom',icon:'fa-toilet',label:'Restroom'},{id:'Parking',icon:'fa-square-parking',label:'Parking'},{id:'Shopping',icon:'fa-bag-shopping',label:'Shopping'},{id:'EV Store',icon:'fa-charging-station',label:'EV Store'},{id:'Lounge',icon:'fa-couch',label:'Lounge'},{id:'ATM',icon:'fa-money-bill-wave',label:'ATM'},{id:'Security',icon:'fa-shield-halved',label:'Security'},{id:'CCTV',icon:'fa-video',label:'CCTV'},{id:'Wheelchair',icon:'fa-wheelchair',label:'Accessible'}],

  renderAmenities(){const g=document.getElementById('sa-amenities-grid');if(!g)return;g.innerHTML=this.allAmenities.map(a=>'<div class="sa-amenity-card '+(this.selectedAmenities.includes(a.id)?'selected':'')+'" onclick="StationAdmin.toggleAmenity(\''+a.id+'\')"><i class="fa-solid '+a.icon+'"></i><span>'+a.label+'</span></div>').join('');},
  toggleAmenity(id){const i=this.selectedAmenities.indexOf(id);if(i>=0)this.selectedAmenities.splice(i,1);else this.selectedAmenities.push(id);this.renderAmenities();},

  addChargerToList(){const t=document.getElementById('sa-new-ctype').value,p=parseFloat(document.getElementById('sa-new-cpow').value),pr=parseFloat(document.getElementById('sa-new-cprice').value),c=parseInt(document.getElementById('sa-new-ccount').value)||1;if(!p||!pr){App.toast('Fill details','error');return;}this.chargersList.push({charger_type:t,power_kw:p,price_per_kwh:pr,count:c});this.renderChargersList();App.toast('Added '+c+'× '+t,'success');},
  removeChargerFromList(i){this.chargersList.splice(i,1);this.renderChargersList();},
  renderChargersList(){const el=document.getElementById('sa-chargers-list');if(!el)return;if(!this.chargersList.length){el.innerHTML='<div class="sa-empty-chargers"><i class="fa-solid fa-plug-circle-xmark"></i><p>No chargers added</p></div>';return;}el.innerHTML=this.chargersList.map((c,i)=>'<div class="sa-charger-preview-item"><div class="sa-charger-preview-info"><span class="charger-badge '+c.charger_type.replace(' ','')+'">'+c.charger_type+'</span><span>'+c.power_kw+' kW</span><span style="color:var(--yellow)">₹'+c.price_per_kwh+'/kWh</span><span style="color:var(--text-300)">×'+c.count+'</span></div><button class="btn-danger" style="padding:4px 8px;font-size:.72rem" onclick="StationAdmin.removeChargerFromList('+i+')"><i class="fa-solid fa-xmark"></i></button></div>').join('');},

  async submitStation(){
    const name=document.getElementById('sa-name')?.value.trim(),addr=document.getElementById('sa-address')?.value.trim(),city=document.getElementById('sa-city')?.value.trim(),lat=parseFloat(document.getElementById('sa-lat')?.value),lng=parseFloat(document.getElementById('sa-lng')?.value);
    if(!name||!addr||!city||isNaN(lat)||isNaN(lng)){App.toast('Fill required fields','error');return;}
    const btn=document.getElementById('sa-submit-btn');btn.innerHTML='<span class="spinner"></span> Saving...';btn.disabled=true;
    try{
      const body={name,address:addr,city,lat,lng,state:document.getElementById('sa-state')?.value.trim()||'',country:document.getElementById('sa-country')?.value.trim()||'India',description:document.getElementById('sa-desc')?.value.trim()||'',station_type:document.getElementById('sa-type')?.value||'public',operating_hours:document.getElementById('sa-hours')?.value||'24/7',contact_phone:document.getElementById('sa-phone')?.value.trim()||'',contact_email:document.getElementById('sa-email')?.value.trim()||'',amenities:this.selectedAmenities,chargers:this.chargersList};
      const ep=this.editMode?'/api/stations/'+App.currentUser.station_id:'/api/station-admin/create-station';
      const res=await API[this.editMode?'put':'post'](ep,body);
      if(res.success){if(res.station_id)App.currentUser.station_id=res.station_id;App.toast(this.editMode?'Updated!':'Registered! 🎉','success');this.editMode=false;this.load();}
    }catch(e){App.toast(e.message||'Failed','error');}
    finally{btn.innerHTML='<i class="fa-solid fa-rocket"></i> Register Station';btn.disabled=false;}
  },

  showEditForm(){
    this.editMode=true;const s=this.data.station;this.selectedAmenities=[...(s.amenities||[])];this.chargersList=[];this.renderAddForm();
    setTimeout(()=>{
      document.getElementById('sa-name').value=s.name||'';document.getElementById('sa-desc').value=s.description||'';
      document.getElementById('sa-type').value=s.station_type||'public';document.getElementById('sa-hours').value=s.operating_hours||'24/7';
      document.getElementById('sa-phone').value=s.contact_phone||'';document.getElementById('sa-email').value=s.contact_email||'';
      document.getElementById('sa-address').value=s.address||'';document.getElementById('sa-city').value=s.city||'';
      document.getElementById('sa-state').value=s.state||'';document.getElementById('sa-country').value=s.country||'India';
      document.getElementById('sa-lat').value=s.lat||'';document.getElementById('sa-lng').value=s.lng||'';
      const h=document.querySelector('.sa-add-hero h2');if(h)h.textContent='Edit Station';
      const b=document.getElementById('sa-submit-btn');if(b)b.innerHTML='<i class="fa-solid fa-save"></i> Save Changes';
      this.renderAmenities();
    },50);
  },

  async addCharger(){const t=document.getElementById('sa-ctype').value,p=parseFloat(document.getElementById('sa-cpow').value),pr=parseFloat(document.getElementById('sa-cprice').value);if(!p||!pr){App.toast('Fill fields','error');return;}try{await API.post('/api/station-admin/chargers',{charger_type:t,power_kw:p,price_per_kwh:pr});App.toast('Added!','success');this.load();}catch(e){App.toast(e.message,'error');}},
  async removeCharger(id){if(!confirm('Remove?'))return;try{await API.delete('/api/station-admin/chargers/'+id);App.toast('Removed','info');this.load();}catch(e){App.toast(e.message,'error');}}
};
