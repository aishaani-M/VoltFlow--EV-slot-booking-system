/* ══════════════════════════════════════════
   auth.js – Login, Register (User + Station), Logout
   ══════════════════════════════════════════ */
const Auth = {
  regType: 'user',

  showLogin() {
    document.getElementById('login-form').classList.remove('hidden');
    document.getElementById('register-form').classList.add('hidden');
  },

  showRegister() {
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('register-form').classList.remove('hidden');
  },

  switchRegTab(type) {
    Auth.regType = type;
    document.getElementById('tab-user').classList.toggle('active', type === 'user');
    document.getElementById('tab-station').classList.toggle('active', type === 'station');
    document.getElementById('reg-user-fields').classList.toggle('hidden', type !== 'user');
    document.getElementById('reg-station-fields').classList.toggle('hidden', type !== 'station');
  },

  async login() {
    const email    = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errEl    = document.getElementById('login-error');
    errEl.classList.add('hidden');
    const btn = document.getElementById('btn-login');
    btn.innerHTML = '<span class="spinner"></span> Signing in…';
    btn.disabled = true;
    try {
      const data = await API.post('/api/login', { email, password });
      if (data.success) {
        App.currentUser = data.user;
        App.showApp();
        App.toast('Welcome back, ' + data.user.name + '!', 'success');
      } else {
        errEl.textContent = data.message || 'Login failed';
        errEl.classList.remove('hidden');
      }
    } catch (e) {
      errEl.textContent = e.message || 'Login failed';
      errEl.classList.remove('hidden');
    } finally {
      btn.innerHTML = '<i class="fa-solid fa-arrow-right-to-bracket"></i> Sign In';
      btn.disabled = false;
    }
  },

  async demoLogin() {
    document.getElementById('login-email').value    = 'demo@voltflow.com';
    document.getElementById('login-password').value = 'demo123';
    await Auth.login();
  },

  async register() {
    const errEl = document.getElementById('register-error');
    errEl.classList.add('hidden');
    let body;

    if (Auth.regType === 'station') {
      const name     = document.getElementById('reg-s-name').value.trim();
      const phone    = document.getElementById('reg-s-phone').value.trim();
      const email    = document.getElementById('reg-s-email').value.trim();
      const password = document.getElementById('reg-s-password').value;
      const sName    = document.getElementById('reg-station-name').value.trim();
      const sAddr    = document.getElementById('reg-station-addr').value.trim();
      const sCity    = document.getElementById('reg-station-city').value.trim();
      if (!name || !email || !password || !sName) {
        errEl.textContent = 'Please fill in all required fields.';
        errEl.classList.remove('hidden'); return;
      }
      body = {
        register_type: 'station', name, phone, email, password,
        station_name: sName, station_address: sAddr, station_city: sCity,
        station_lat: 28.6139, station_lng: 77.2090
      };
    } else {
      const name       = document.getElementById('reg-name').value.trim();
      const phone      = document.getElementById('reg-phone').value.trim();
      const email      = document.getElementById('reg-email').value.trim();
      const password   = document.getElementById('reg-password').value;
      const vehicleType = document.getElementById('reg-vehicle-type').value;
      const vehicle    = document.getElementById('reg-vehicle').value.trim();
      const vehicleNum = document.getElementById('reg-vehicle-num').value.trim();
      if (!name || !email || !password) {
        errEl.textContent = 'Please fill in all required fields.';
        errEl.classList.remove('hidden'); return;
      }
      body = {
        register_type: 'user', name, phone, email, password,
        vehicle_type: vehicleType, vehicle_model: vehicle, vehicle_number: vehicleNum
      };
    }

    try {
      const data = await API.post('/api/register', body);
      if (data.success) {
        App.currentUser = data.user;
        App.showApp();
        App.toast('Account created! Welcome ' + data.user.name, 'success');
      } else {
        errEl.textContent = data.message || 'Registration failed';
        errEl.classList.remove('hidden');
      }
    } catch (e) {
      errEl.textContent = e.message || 'Registration failed';
      errEl.classList.remove('hidden');
    }
  },

  async logout() {
    try { await API.post('/api/logout'); } catch {}
    App.currentUser = null;
    App.showAuth();
    App.toast('Logged out successfully', 'info');
    const saNav = document.getElementById('station-admin-nav');
    if (saNav) saNav.classList.add('hidden');
    document.querySelectorAll('.user-only-nav').forEach(el => el.classList.remove('hidden'));
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';
  }
};

// Allow pressing Enter to submit login
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('login-password')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') Auth.login();
  });
});
