/* ═══════════════════════════════════════════════════════
   core.js  –  API helper · App shell · Auth · Map
   ═══════════════════════════════════════════════════════ */

/* ── API ─────────────────────────────────────────────── */
const API = {
  async request(method, url, body = null) {
    const opts = { method, headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin' };
    if (body) opts.body = JSON.stringify(body);
    const res  = await fetch(url, opts);
    const data = await res.json();
    if (!res.ok && data.error) throw new Error(data.error);
    return data;
  },
  get(url)        { return this.request('GET',    url); },
  post(url, body) { return this.request('POST',   url, body); },
  put(url, body)  { return this.request('PUT',    url, body); },
  delete(url)     { return this.request('DELETE', url); },
};

/* ── APP ─────────────────────────────────────────────── */
const App = {
  currentPage: 'map',
  currentUser: null,

  async init() {
    // Apply saved theme immediately
    const saved = localStorage.getItem('evhub-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    App._syncThemeIcon(saved);

    setTimeout(async () => {
      try {
        const data = await API.get('/api/session');
        if (data.logged_in) { App.currentUser = data.user; App.showApp(); }
        else                  App.showAuth();
      } catch { App.showAuth(); }
      document.getElementById('loading-screen').classList.add('hidden');
    }, 1900);
  },

  showAuth() {
    document.getElementById('auth-overlay').classList.remove('hidden');
    document.getElementById('main-app').classList.add('hidden');
  },

  showApp() {
    document.getElementById('auth-overlay').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
    App.updateSidebar();
    const role = App.currentUser?.role;
    // Navigate to best default page
    if (role === 'station_admin') App.navigate('station-admin');
    else App.navigate('map');
  },

  updateSidebar() {
    const u = App.currentUser;
    if (!u) return;
    const initial = u.name ? u.name[0].toUpperCase() : '?';
    document.getElementById('sidebar-avatar').textContent    = initial;
    const mob = document.getElementById('mobile-user-avatar');
    if (mob) mob.textContent = initial;
    document.getElementById('sidebar-name').textContent = u.name;
    const roleLabels = { admin:'Super Admin', station_admin:'Station Admin', user:'EV User' };
    document.getElementById('sidebar-role').textContent = roleLabels[u.role] || 'User';

    document.getElementById('admin-nav-item').classList.toggle('hidden', u.role !== 'admin');
    document.getElementById('station-admin-nav').classList.toggle('hidden', u.role !== 'station_admin');
  },

  navigate(page) {
    App.currentPage = page;
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const el = document.getElementById('page-' + page);
    if (el) el.classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.page === page));
    document.querySelectorAll('.bottom-nav-btn').forEach(n => n.classList.toggle('active', n.dataset.page === page));

    if (page === 'map')           MapView.init();
    if (page === 'stations')      Stations.load();
    if (page === 'bookings')      Bookings.load();
    if (page === 'profile')       Profile.load();
    if (page === 'admin')         Admin.load();
    if (page === 'station-admin') StationAdmin.load();
  },

  toast(msg, type = 'info') {
    const icons = { success:'fa-circle-check', error:'fa-circle-xmark', info:'fa-circle-info' };
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.innerHTML = `<i class="fa-solid ${icons[type]||icons.info}"></i> ${msg}`;
    document.getElementById('toast-container').appendChild(t);
    setTimeout(() => { t.classList.add('removing'); setTimeout(() => t.remove(), 350); }, 3200);
  },

  toggleTheme() {
    const cur  = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('evhub-theme', next);
    App._syncThemeIcon(next);
  },

  _syncThemeIcon(theme) {
    const icon  = document.getElementById('theme-icon');
    const iconM = document.getElementById('theme-icon-mobile');
    const cls   = theme === 'dark' ? 'fa-sun' : 'fa-moon';
    [icon, iconM].forEach(el => { if (el) { el.className = `fa-solid ${cls}`; } });
  },

  formatDate(s) { return new Date(s).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}); },
  formatCurrency(n) { return '₹' + Number(n).toFixed(2); },
  stars(r) {
    const f = Math.floor(r), h = r-f>=.5?1:0, e = 5-f-h;
    return '<i class="fa-solid fa-star"></i>'.repeat(f) +
           (h?'<i class="fa-solid fa-star-half-stroke"></i>':'') +
           '<i class="fa-regular fa-star"></i>'.repeat(e);
  },
  availBadge(avail, total) {
    if (avail===0)          return '<span class="badge badge-full">Full</span>';
    if (avail<total*.4)     return '<span class="badge badge-busy">Busy</span>';
    return '<span class="badge badge-available"><span class="avail-pulse"></span>Available</span>';
  },
  amenityIcon(a) {
    const m={WiFi:'fa-wifi',Cafe:'fa-mug-hot',Restaurant:'fa-utensils',Restroom:'fa-toilet',
             Parking:'fa-square-parking',Shopping:'fa-bag-shopping','EV Store':'fa-charging-station'};
    return m[a]||'fa-circle-check';
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());

/* ── AUTH ────────────────────────────────────────────── */
const Auth = {
  showLogin()    { document.getElementById('login-form').classList.remove('hidden'); document.getElementById('register-form').classList.add('hidden'); },
  showRegister() { document.getElementById('register-form').classList.remove('hidden'); document.getElementById('login-form').classList.add('hidden'); },

  async login() {
    const email = document.getElementById('login-email').value.trim();
    const pass  = document.getElementById('login-password').value;
    const errEl = document.getElementById('login-error');
    errEl.classList.add('hidden');
    const btn = document.getElementById('btn-login');
    btn.innerHTML = '<span class="spinner"></span> Signing in…'; btn.disabled = true;
    try {
      const data = await API.post('/api/login', { email, password: pass });
      if (data.success) { App.currentUser = data.user; App.showApp(); App.toast('Welcome back, '+data.user.name+'!','success'); }
      else { errEl.textContent = data.message||'Login failed'; errEl.classList.remove('hidden'); }
    } catch(e) { errEl.textContent = e.message||'Login failed'; errEl.classList.remove('hidden'); }
    finally { btn.innerHTML='<i class="fa-solid fa-arrow-right-to-bracket"></i> Sign In'; btn.disabled=false; }
  },

  demoLogin() {
    document.getElementById('login-email').value    = 'demo@voltflow.com';
    document.getElementById('login-password').value = 'demo123';
    Auth.login();
  },

  async register() {
    const errEl = document.getElementById('register-error'); errEl.classList.add('hidden');
    const name=document.getElementById('reg-name').value.trim(),
          phone=document.getElementById('reg-phone').value.trim(),
          email=document.getElementById('reg-email').value.trim(),
          pass=document.getElementById('reg-password').value,
          veh=document.getElementById('reg-vehicle').value.trim(),
          vnum=document.getElementById('reg-vehicle-num').value.trim();
    if (!name||!email||!pass) { errEl.textContent='Please fill all required fields'; errEl.classList.remove('hidden'); return; }
    try {
      const data = await API.post('/api/register',{name,phone,email,password:pass,vehicle_model:veh,vehicle_number:vnum});
      if (data.success) { App.currentUser=data.user; App.showApp(); App.toast('Welcome '+data.user.name,'success'); }
      else { errEl.textContent=data.message||'Registration failed'; errEl.classList.remove('hidden'); }
    } catch(e) { errEl.textContent=e.message||'Registration failed'; errEl.classList.remove('hidden'); }
  },

  async logout() {
    try { await API.post('/api/logout'); } catch {}
    App.currentUser = null;
    App.showAuth();
    App.toast('Logged out','info');
    document.getElementById('admin-nav-item').classList.add('hidden');
    document.getElementById('station-admin-nav').classList.add('hidden');
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';
  }
};
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('login-password')?.addEventListener('keydown', e => { if(e.key==='Enter') Auth.login(); });
});

/* ── MAP ─────────────────────────────────────────────── */
const MapView = {
  map: null, markers: [], stations: [], initialized: false,

  async init() {
    if (this.initialized) return;
    this.initialized = true;
    this.map = L.map('leaflet-map',{ center:[20.5937,78.9629], zoom:5, zoomControl:false });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      { attribution:'&copy; OpenStreetMap &copy; CartoDB', subdomains:'abcd', maxZoom:19 }).addTo(this.map);
    L.control.zoom({ position:'bottomright' }).addTo(this.map);
    await this.loadStations();
  },

  async loadStations(params={}) {
    try {
      let url='/api/stations'; const q=new URLSearchParams(params).toString(); if(q) url+='?'+q;
      this.stations = await API.get(url);
      this.renderMarkers(this.stations);
    } catch { App.toast('Failed to load stations','error'); }
  },

  renderMarkers(stations) {
    this.markers.forEach(m=>m.remove()); this.markers=[];
    stations.forEach(s => {
      const a=s.available_chargers,t=s.total_chargers;
      const cls = a===0?'marker-full':a<t*.4?'marker-busy':'marker-available';
      const icon = L.divIcon({ className:'', iconSize:[36,36], iconAnchor:[18,36], popupAnchor:[0,-36],
        html:`<div class="custom-marker ${cls}"><i class="fa-solid fa-bolt"></i></div>` });
      const marker = L.marker([s.lat,s.lng],{icon}).addTo(this.map);
      marker.bindPopup(L.popup({closeButton:false,maxWidth:240}).setContent(`
        <div class="popup-name">${s.name}</div>
        <div class="popup-city"><i class="fa-solid fa-location-dot"></i> ${s.city}</div>
        <div class="popup-avail"><i class="fa-solid fa-bolt"></i> ${a}/${t} available</div>
        <div class="stars">${App.stars(s.rating)}</div><br>
        <div class="popup-btn" onclick="Stations.showDetail(${s.id})">View &amp; Book</div>`));
      this.markers.push(marker);
    });
  },

  search(query) {
    if (!query) { this.renderMarkers(this.stations); return; }
    const q=query.toLowerCase();
    const f=this.stations.filter(s=>s.name.toLowerCase().includes(q)||s.city.toLowerCase().includes(q));
    this.renderMarkers(f);
    if(f.length) this.map.setView([f[0].lat,f[0].lng],12);
  },

  applyFilter() { this.loadStations(document.getElementById('filter-type').value?{charger_type:document.getElementById('filter-type').value}:{}); },

  locateUser() {
    if (!navigator.geolocation) { App.toast('Geolocation not supported','error'); return; }
    navigator.geolocation.getCurrentPosition(pos=>{
      const{latitude:lat,longitude:lng}=pos.coords;
      this.map.setView([lat,lng],13);
      L.circleMarker([lat,lng],{radius:10,color:'#6c5ce7',fillColor:'#6c5ce7',fillOpacity:.4,weight:2})
        .addTo(this.map).bindPopup('You are here').openPopup();
      App.toast('Location found!','success');
    },()=>App.toast('Could not get location','error'));
  },

  flyTo(lat,lng) { if(this.map){this.map.setView([lat,lng],15);App.navigate('map');} }
};
