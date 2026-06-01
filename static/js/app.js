/* ══════════════════════════════════════════
   app.js – SPA core: navigation, toasts, theme, init
   Two sides: USER  → Map, Stations, Bookings, Wallet, Profile
              STATION → Station Dashboard, Stations, Profile
   ══════════════════════════════════════════ */
const App = {
  currentPage: 'map',
  currentUser: null,

  isStation() {
    const r = this.currentUser?.role;
    return r === 'station_admin' || r === 'admin';
  },

  async init() {
    const saved = localStorage.getItem('evhub-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    App._syncThemeIcon(saved);

    setTimeout(async () => {
      try {
        const data = await API.get('/api/session');
        if (data.logged_in) {
          App.currentUser = data.user;
          App.showApp();
        } else {
          App.showAuth();
        }
      } catch {
        App.showAuth();
      }
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

    if (App.isStation()) {
      App.navigate('station-admin');
    } else {
      App.navigate('map');
    }
  },

  updateSidebar() {
    const u = App.currentUser;
    if (!u) return;
    const initial = u.name ? u.name[0].toUpperCase() : '?';
    document.getElementById('sidebar-avatar').textContent = initial;
    const mob = document.getElementById('mobile-user-avatar');
    if (mob) mob.textContent = initial;
    document.getElementById('sidebar-name').textContent = u.name;

    const isS = App.isStation();
    const labels = { admin: 'Station Owner', station_admin: 'Station Owner', user: 'EV User' };
    document.getElementById('sidebar-role').textContent = labels[u.role] || 'User';

    // Show/hide role-specific nav items
    const saNav = document.getElementById('station-admin-nav');
    if (saNav) saNav.classList.toggle('hidden', !isS);

    // Hide user-only items for station owners
    document.querySelectorAll('.user-only-nav').forEach(el => {
      el.classList.toggle('hidden', isS);
    });
  },

  navigate(page) {
    App.currentPage = page;
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const el = document.getElementById('page-' + page);
    if (el) el.classList.add('active');

    document.querySelectorAll('.nav-item').forEach(n => {
      n.classList.toggle('active', n.dataset.page === page);
    });
    document.querySelectorAll('.bottom-nav-btn').forEach(n => {
      n.classList.toggle('active', n.dataset.page === page);
    });

    // Lazy-load page data
    if (page === 'map')           MapView.init();
    if (page === 'stations')      Stations.load();
    if (page === 'bookings')      Bookings.load();
    if (page === 'wallet')        Wallet.load();
    if (page === 'profile')       Profile.load();
    if (page === 'station-admin') StationAdmin.load();
  },

  /* ── Theme Toggle ── */
  toggleTheme() {
    const cur  = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('evhub-theme', next);
    App._syncThemeIcon(next);
  },

  _syncThemeIcon(theme) {
    const cls = theme === 'dark' ? 'fa-sun' : 'fa-moon';
    ['theme-icon', 'theme-icon-mobile'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.className = 'fa-solid ' + cls;
    });
  },

  toast(message, type = 'info') {
    const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info' };
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i> ${message}`;
    document.getElementById('toast-container').appendChild(t);
    setTimeout(() => { t.classList.add('removing'); setTimeout(() => t.remove(), 350); }, 3200);
  },

  formatDate(str) {
    return new Date(str).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
  },

  formatCurrency(n) {
    return '₹' + Number(n).toFixed(2);
  },

  stars(rating) {
    const full = Math.floor(rating);
    const half = rating - full >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    return '<i class="fa-solid fa-star"></i>'.repeat(full) +
           (half ? '<i class="fa-solid fa-star-half-stroke"></i>' : '') +
           '<i class="fa-regular fa-star"></i>'.repeat(empty);
  },

  availBadge(avail, total) {
    if (avail === 0)         return '<span class="badge badge-full">Full</span>';
    if (avail < total * 0.4) return '<span class="badge badge-busy">Busy</span>';
    return '<span class="badge badge-available"><span class="avail-pulse"></span>Available</span>';
  },

  amenityIcon(a) {
    const map = { WiFi:'fa-wifi', Cafe:'fa-mug-hot', Restaurant:'fa-utensils',
      Restroom:'fa-toilet', Parking:'fa-square-parking', Shopping:'fa-bag-shopping',
      'EV Store':'fa-charging-station' };
    return map[a] || 'fa-circle-check';
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
