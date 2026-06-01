/* ══════════════════════════════════════════
   admin.js – Admin dashboard
   ══════════════════════════════════════════ */
const Admin = {
  stats: null,
  stations: [],

  async load() {
    if (App.currentUser?.role !== 'admin') {
      document.getElementById('admin-content').innerHTML =
        '<div class="empty-state"><div class="empty-icon"><i class="fa-solid fa-lock"></i></div><div class="empty-title">Admin Access Only</div></div>';
      return;
    }

    const el = document.getElementById('admin-content');
    el.innerHTML = '<div class="skeleton" style="height:180px;border-radius:16px;margin-bottom:16px"></div>';

    try {
      const [statsData, stationsData] = await Promise.all([
        API.get('/api/admin/stats'),
        API.get('/api/stations')
      ]);
      this.stats = statsData;
      this.stations = stationsData;
      this.render();
    } catch (e) {
      el.innerHTML = `<p style="color:var(--red);padding:20px">Failed to load admin data: ${e.message}</p>`;
    }
  },

  render() {
    const s = this.stats;
    document.getElementById('admin-content').innerHTML = `
      <!-- KPI STATS -->
      <div class="stats-grid stagger-children">
        <div class="stat-card">
          <div class="stat-icon green"><i class="fa-solid fa-charging-station"></i></div>
          <div class="stat-value">${s.total_stations}</div>
          <div class="stat-label">Active Stations</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon blue"><i class="fa-solid fa-users"></i></div>
          <div class="stat-value">${s.total_users}</div>
          <div class="stat-label">Registered Users</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon yellow"><i class="fa-solid fa-calendar-check"></i></div>
          <div class="stat-value">${s.total_bookings}</div>
          <div class="stat-label">Total Bookings</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon red"><i class="fa-solid fa-indian-rupee-sign"></i></div>
          <div class="stat-value">₹${Number(s.total_revenue).toLocaleString('en-IN')}</div>
          <div class="stat-label">Total Revenue</div>
        </div>
      </div>

      <!-- ADD STATION FORM -->
      <div class="admin-form">
        <h3><i class="fa-solid fa-circle-plus"></i> Add New Station</h3>
        <div class="admin-form-row">
          <div class="form-group">
            <label><i class="fa-solid fa-building"></i> Station Name</label>
            <input type="text" id="new-station-name" placeholder="PowerGrid Station Beta" />
          </div>
          <div class="form-group">
            <label><i class="fa-solid fa-city"></i> City</label>
            <input type="text" id="new-station-city" placeholder="New Delhi" />
          </div>
        </div>
        <div class="form-group">
          <label><i class="fa-solid fa-location-dot"></i> Address</label>
          <input type="text" id="new-station-address" placeholder="Building name, Street, Area" />
        </div>
        <div class="admin-form-row">
          <div class="form-group">
            <label><i class="fa-solid fa-map-pin"></i> Latitude</label>
            <input type="number" id="new-station-lat" placeholder="28.6315" step="any" />
          </div>
          <div class="form-group">
            <label><i class="fa-solid fa-map-pin"></i> Longitude</label>
            <input type="number" id="new-station-lng" placeholder="77.2167" step="any" />
          </div>
        </div>
        <div class="admin-form-row">
          <div class="form-group">
            <label><i class="fa-solid fa-plug"></i> Total Chargers</label>
            <input type="number" id="new-station-total" placeholder="8" min="1" />
          </div>
          <div class="form-group">
            <label><i class="fa-solid fa-bolt"></i> Available Chargers</label>
            <input type="number" id="new-station-avail" placeholder="6" min="0" />
          </div>
        </div>
        <button class="btn-primary" onclick="Admin.addStation()">
          <i class="fa-solid fa-plus"></i> Add Station
        </button>
      </div>

      <!-- STATIONS TABLE -->
      <div class="admin-table-wrap">
        <div class="admin-table-header">
          <h3><i class="fa-solid fa-list" style="color:var(--neon);margin-right:8px"></i> All Stations</h3>
          <button class="btn-secondary" onclick="Admin.load()">
            <i class="fa-solid fa-rotate"></i> Refresh
          </button>
        </div>
        <div style="overflow-x:auto">
          <table class="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>City</th>
                <th>Available</th>
                <th>Rating</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${this.stations.map((s, i) => `
                <tr>
                  <td style="color:var(--text-300)">${s.id}</td>
                  <td style="font-weight:600">${s.name}</td>
                  <td><span style="color:var(--text-300)">${s.city}</span></td>
                  <td>
                    <div style="display:flex;align-items:center;gap:8px">
                      <div class="progress-bar" style="width:80px">
                        <div class="progress-fill" style="width:${s.total_chargers ? (s.available_chargers/s.total_chargers*100) : 0}%"></div>
                      </div>
                      <span style="font-size:.8rem">${s.available_chargers}/${s.total_chargers}</span>
                    </div>
                  </td>
                  <td><span class="stars" style="font-size:.8rem">${App.stars(s.rating)}</span> ${s.rating}</td>
                  <td>${App.availBadge(s.available_chargers, s.total_chargers)}</td>
                  <td>
                    <div style="display:flex;gap:6px">
                      <button class="btn-secondary" style="padding:5px 10px;font-size:.75rem"
                        onclick="Admin.editStation(${s.id})">
                        <i class="fa-solid fa-pen"></i>
                      </button>
                      <button class="btn-danger" style="padding:5px 10px;font-size:.75rem"
                        onclick="Admin.deleteStation(${s.id})">
                        <i class="fa-solid fa-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- RECENT BOOKINGS -->
      <div class="admin-table-wrap">
        <div class="admin-table-header">
          <h3><i class="fa-solid fa-clock-rotate-left" style="color:var(--neon);margin-right:8px"></i> Recent Bookings</h3>
        </div>
        <div style="overflow-x:auto">
          <table class="data-table">
            <thead>
              <tr>
                <th>Ref</th>
                <th>User</th>
                <th>Station</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${s.recent_bookings.map(b => `
                <tr>
                  <td style="font-family:'JetBrains Mono',monospace;font-size:.78rem;color:var(--text-300)">${b.booking_ref}</td>
                  <td>${b.user_name}</td>
                  <td>${b.station_name}</td>
                  <td style="color:var(--text-300)">${App.formatDate(b.booking_date)}</td>
                  <td style="color:var(--neon);font-weight:600">₹${Number(b.total_amount).toFixed(2)}</td>
                  <td><span class="badge badge-${b.status}">${b.status.charAt(0).toUpperCase()+b.status.slice(1)}</span></td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  },

  async addStation() {
    const name  = document.getElementById('new-station-name').value.trim();
    const city  = document.getElementById('new-station-city').value.trim();
    const addr  = document.getElementById('new-station-address').value.trim();
    const lat   = parseFloat(document.getElementById('new-station-lat').value);
    const lng   = parseFloat(document.getElementById('new-station-lng').value);
    const total = parseInt(document.getElementById('new-station-total').value);
    const avail = parseInt(document.getElementById('new-station-avail').value);

    if (!name || !city || !addr || isNaN(lat) || isNaN(lng)) {
      App.toast('Please fill all required fields', 'error'); return;
    }
    try {
      await API.post('/api/stations', { name, city, address: addr, lat, lng,
        total_chargers: total || 0, available_chargers: avail || 0, amenities: [] });
      App.toast('Station added!', 'success');
      Admin.load();
    } catch (e) { App.toast(e.message || 'Failed to add station', 'error'); }
  },

  editStation(id) {
    const s = this.stations.find(x => x.id === id);
    if (!s) return;
    const newName = prompt('Station Name:', s.name);
    if (!newName) return;
    const newCity = prompt('City:', s.city);
    if (!newCity) return;
    API.put(`/api/stations/${id}`, { name: newName, city: newCity, address: s.address, status: 'active' })
      .then(() => { App.toast('Station updated!', 'success'); Admin.load(); })
      .catch(() => App.toast('Update failed', 'error'));
  },

  async deleteStation(id) {
    if (!confirm('Deactivate this station?')) return;
    try {
      await API.delete(`/api/stations/${id}`);
      App.toast('Station deactivated', 'info');
      Admin.load();
    } catch { App.toast('Failed to delete', 'error'); }
  }
};
