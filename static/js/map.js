/* ══════════════════════════════════════════
   map.js – Leaflet map with station landmarks,
   user location, navigation & routing
   ══════════════════════════════════════════ */
const MapView = {
  map: null, markers: [], stations: [], initialized: false,
  userPos: null, userMarker: null, routeLayer: null, navPanel: null,

  async init() {
    if (this.initialized) { this.map.invalidateSize(); return; }
    this.initialized = true;

    this.map = L.map('leaflet-map', {
      center: [20.5937, 78.9629], zoom: 5, zoomControl: false
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CartoDB',
      subdomains: 'abcd', maxZoom: 19
    }).addTo(this.map);

    L.control.zoom({ position: 'bottomright' }).addTo(this.map);
    await this.loadStations();
    this.locateUser(true);
  },

  async loadStations(params = {}) {
    try {
      let url = '/api/stations';
      const q = new URLSearchParams(params).toString();
      if (q) url += '?' + q;
      this.stations = await API.get(url);
      this.renderMarkers(this.stations);
    } catch { App.toast('Failed to load stations', 'error'); }
  },

  renderMarkers(stations) {
    this.markers.forEach(m => m.remove());
    this.markers = [];

    stations.forEach(s => {
      const avail = s.available_chargers, total = s.total_chargers;
      const cls = avail === 0 ? 'marker-full' : avail < total * 0.4 ? 'marker-busy' : 'marker-available';
      const pulseClass = avail > 0 ? 'marker-pulse' : '';

      const icon = L.divIcon({
        className: '',
        html: `<div class="custom-marker ${cls}">
          <span class="marker-pin-emoji">📍</span>
          <i class="fa-solid fa-charging-station"></i>
          <span class="marker-count">${avail}</span>
          ${pulseClass ? '<span class="marker-pulse-ring"></span>' : ''}
        </div>`,
        iconSize: [44, 52], iconAnchor: [22, 52], popupAnchor: [0, -52]
      });

      const dist = this.userPos ? this._dist(this.userPos.lat, this.userPos.lng, s.lat, s.lng) : null;
      const distText = dist !== null ? `<div class="popup-dist"><i class="fa-solid fa-route"></i> ${dist < 1 ? (dist*1000).toFixed(0)+' m' : dist.toFixed(1)+' km'} away</div>` : '';

      const marker = L.marker([s.lat, s.lng], { icon }).addTo(this.map);
      const popup = L.popup({ closeButton: false, maxWidth: 260, className: 'ev-popup' }).setContent(`
        <div class="popup-header">
          <div class="popup-icon ${cls}"><i class="fa-solid fa-charging-station"></i></div>
          <div>
            <div class="popup-name">${s.name}</div>
            <div class="popup-city"><i class="fa-solid fa-location-dot"></i> ${s.address}, ${s.city}</div>
          </div>
        </div>
        <div class="popup-stats">
          <div class="popup-stat"><i class="fa-solid fa-bolt"></i> ${avail}/${total} free</div>
          <div class="popup-stat"><span class="stars" style="font-size:.7rem">${App.stars(s.rating)}</span> ${s.rating}</div>
        </div>
        ${distText}
        <div class="popup-actions">
          <div class="popup-btn" onclick="Stations.showDetail(${s.id})"><i class="fa-solid fa-eye"></i> Details</div>
          <div class="popup-btn popup-btn-nav" onclick="MapView.navigateTo(${s.id})"><i class="fa-solid fa-diamond-turn-right"></i> Navigate</div>
        </div>
      `);
      marker.bindPopup(popup);
      this.markers.push(marker);
    });
  },

  search(query) {
    if (!query) { this.renderMarkers(this.stations); return; }
    const q = query.toLowerCase();
    const filtered = this.stations.filter(s =>
      s.name.toLowerCase().includes(q) || s.city.toLowerCase().includes(q)
    );
    this.renderMarkers(filtered);
    if (filtered.length > 0) this.map.setView([filtered[0].lat, filtered[0].lng], 12);
  },

  applyFilter() {
    const type = document.getElementById('filter-type').value;
    const params = {};
    if (type) params.charger_type = type;
    this.loadStations(params);
  },

  locateUser(silent = false) {
    if (!navigator.geolocation) { if (!silent) App.toast('Geolocation not supported', 'error'); return; }
    navigator.geolocation.getCurrentPosition(pos => {
      this.userPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      if (this.userMarker) this.userMarker.remove();

      const userIcon = L.divIcon({
        className: '',
        html: `<div class="user-location-marker">
          <div class="user-location-dot"></div>
          <div class="user-location-ring"></div>
        </div>`,
        iconSize: [24, 24], iconAnchor: [12, 12]
      });
      this.userMarker = L.marker([this.userPos.lat, this.userPos.lng], { icon: userIcon, zIndexOffset: 1000 })
        .addTo(this.map).bindPopup('<div class="popup-name">📍 You are here</div>');

      if (!silent) {
        this.map.setView([this.userPos.lat, this.userPos.lng], 13);
        App.toast('Location found!', 'success');
      }
      // Refresh markers to update distances
      this.renderMarkers(this.stations);
    }, () => { if (!silent) App.toast('Could not get location', 'error'); },
    { enableHighAccuracy: true, timeout: 10000 });
  },

  /* ── NAVIGATION ── */
  navigateTo(stationId) {
    const s = this.stations.find(st => st.id === stationId);
    if (!s) return;

    if (!this.userPos) {
      // Try to get location first, then navigate
      App.toast('Getting your location...', 'info');
      navigator.geolocation.getCurrentPosition(pos => {
        this.userPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        this.locateUser(true);
        this._startNavigation(s);
      }, () => {
        App.toast('Enable location to navigate', 'error');
      }, { enableHighAccuracy: true });
      return;
    }
    this._startNavigation(s);
  },

  _startNavigation(s) {
    // Close any open popup
    this.map.closePopup();

    // Clear existing route
    if (this.routeLayer) { this.map.removeLayer(this.routeLayer); this.routeLayer = null; }
    if (this.navPanel) { this.navPanel.remove(); this.navPanel = null; }

    const from = this.userPos;
    const to = { lat: s.lat, lng: s.lng };
    const dist = this._dist(from.lat, from.lng, to.lat, to.lng);
    const driveMins = Math.ceil(dist / 0.6); // Approx 36 km/h city driving
    const walkMins = Math.ceil(dist / 0.083); // Approx 5 km/h walking

    // Draw route line with animated dash
    const routePoints = this._generateRoute(from, to);
    this.routeLayer = L.layerGroup();

    // Route background (glow)
    L.polyline(routePoints, {
      color: '#39ff6a', weight: 6, opacity: 0.2, lineCap: 'round'
    }).addTo(this.routeLayer);

    // Route foreground
    L.polyline(routePoints, {
      color: '#39ff6a', weight: 3, opacity: 0.9, lineCap: 'round',
      dashArray: '12, 8', className: 'route-animated'
    }).addTo(this.routeLayer);

    // Destination marker highlight
    L.circleMarker([to.lat, to.lng], {
      radius: 18, color: '#39ff6a', fillColor: '#39ff6a',
      fillOpacity: 0.15, weight: 2, className: 'dest-pulse'
    }).addTo(this.routeLayer);

    this.routeLayer.addTo(this.map);

    // Fit bounds to show entire route
    const bounds = L.latLngBounds([
      [from.lat, from.lng], [to.lat, to.lng]
    ]).pad(0.3);
    this.map.fitBounds(bounds);

    // Show navigation panel
    this._showNavPanel(s, dist, driveMins, walkMins);
  },

  _showNavPanel(s, dist, driveMins, walkMins) {
    const panel = document.createElement('div');
    panel.className = 'nav-panel';
    panel.innerHTML = `
      <div class="nav-panel-header">
        <div class="nav-panel-icon"><i class="fa-solid fa-diamond-turn-right"></i></div>
        <div class="nav-panel-info">
          <div class="nav-panel-name">${s.name}</div>
          <div class="nav-panel-addr">${s.address}, ${s.city}</div>
        </div>
        <button class="nav-close-btn" onclick="MapView.clearNavigation()"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="nav-panel-stats">
        <div class="nav-stat">
          <i class="fa-solid fa-route" style="color:var(--neon)"></i>
          <span class="nav-stat-val">${dist < 1 ? (dist*1000).toFixed(0)+' m' : dist.toFixed(1)+' km'}</span>
          <span class="nav-stat-lbl">Distance</span>
        </div>
        <div class="nav-stat">
          <i class="fa-solid fa-car" style="color:var(--accent)"></i>
          <span class="nav-stat-val">${driveMins} min</span>
          <span class="nav-stat-lbl">Drive</span>
        </div>
        <div class="nav-stat">
          <i class="fa-solid fa-person-walking" style="color:var(--yellow)"></i>
          <span class="nav-stat-val">${walkMins} min</span>
          <span class="nav-stat-lbl">Walk</span>
        </div>
        <div class="nav-stat">
          <i class="fa-solid fa-bolt" style="color:var(--neon)"></i>
          <span class="nav-stat-val">${s.available_chargers}/${s.total_chargers}</span>
          <span class="nav-stat-lbl">Free</span>
        </div>
      </div>
      <div class="nav-panel-actions">
        <button class="btn-primary btn-full" onclick="MapView.openExternalNav(${s.lat},${s.lng})">
          <i class="fa-solid fa-map-location-dot"></i> Open in Google Maps
        </button>
        <button class="btn-secondary" onclick="Stations.showDetail(${s.id})" style="flex:1">
          <i class="fa-solid fa-calendar-check"></i> Book Slot
        </button>
      </div>
    `;
    document.getElementById('leaflet-map').parentElement.appendChild(panel);
    this.navPanel = panel;
    // Animate in
    requestAnimationFrame(() => panel.classList.add('visible'));
  },

  clearNavigation() {
    if (this.routeLayer) { this.map.removeLayer(this.routeLayer); this.routeLayer = null; }
    if (this.navPanel) { this.navPanel.classList.remove('visible'); setTimeout(() => { this.navPanel?.remove(); this.navPanel = null; }, 300); }
  },

  openExternalNav(lat, lng) {
    const url = this.userPos
      ? `https://www.google.com/maps/dir/${this.userPos.lat},${this.userPos.lng}/${lat},${lng}`
      : `https://www.google.com/maps?q=${lat},${lng}`;
    window.open(url, '_blank');
  },

  /* ── ROUTE GENERATION (curved path between points) ── */
  _generateRoute(from, to) {
    const pts = [];
    const steps = 30;
    // Slight curve via bezier-like midpoint
    const midLat = (from.lat + to.lat) / 2 + (to.lng - from.lng) * 0.08;
    const midLng = (from.lng + to.lng) / 2 - (to.lat - from.lat) * 0.08;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const lat = (1-t)*(1-t)*from.lat + 2*(1-t)*t*midLat + t*t*to.lat;
      const lng = (1-t)*(1-t)*from.lng + 2*(1-t)*t*midLng + t*t*to.lng;
      pts.push([lat, lng]);
    }
    return pts;
  },

  /* ── DISTANCE (Haversine in km) ── */
  _dist(lat1, lon1, lat2, lon2) {
    const R = 6371, d2r = Math.PI / 180;
    const dLat = (lat2 - lat1) * d2r, dLon = (lon2 - lon1) * d2r;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*d2r)*Math.cos(lat2*d2r)*Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  },

  flyTo(lat, lng) {
    if (!this.map) return;
    App.navigate('map');
    setTimeout(() => {
      this.map.invalidateSize();
      this.map.flyTo([lat, lng], 15, { duration: 1.2 });
    }, 200);
  }
};
