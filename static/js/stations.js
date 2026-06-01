/* ══════════════════════════════════════════
   stations.js – Station list & detail view
   ══════════════════════════════════════════ */
const Stations = {
  all: [],
  filtered: [],
  selectedRating: 0,

  async load() {
    const grid = document.getElementById('stations-grid');
    grid.innerHTML = '<div class="skeleton" style="height:200px;margin-bottom:12px"></div>'.repeat(4);
    try {
      this.all = await API.get('/api/stations');
      this.filtered = [...this.all];
      this.render();
    } catch {
      grid.innerHTML = '<p style="color:var(--text-300);padding:20px">Failed to load stations</p>';
    }
  },

  render() {
    const grid = document.getElementById('stations-grid');
    if (!this.filtered.length) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon"><i class="fa-solid fa-charging-station"></i></div>
        <div class="empty-title">No stations found</div>
        <div class="empty-sub">Try a different search or filter</div>
      </div>`;
      return;
    }
    grid.innerHTML = '';
    grid.className = 'stations-grid stagger-children';
    this.filtered.forEach(s => {
      const card = document.createElement('div');
      card.className = 'station-card shimmer-card';
      card.onclick = () => Stations.showDetail(s.id);
      const types = [...new Set(s.chargers.map(c => c.type))];
      card.innerHTML = `
        <div class="station-card-header">
          <div class="station-card-icon"><i class="fa-solid fa-charging-station"></i></div>
          <div class="station-card-name">${s.name}</div>
          <div class="station-card-addr"><i class="fa-solid fa-location-dot"></i> ${s.address}, ${s.city}</div>
          <div class="station-card-avail-badge">${App.availBadge(s.available_chargers, s.total_chargers)}</div>
        </div>
        <div class="station-card-body">
          <div class="station-meta">
            <span class="stars">${App.stars(s.rating)}</span>
            <span class="rating-text">${s.rating}</span>
            <span style="color:var(--text-300);font-size:.8rem"><i class="fa-solid fa-bolt"></i> ${s.available_chargers}/${s.total_chargers} free</span>
          </div>
          <div class="station-charger-types">
            ${types.map(t => `<span class="charger-badge ${t.replace(' ','')}">${t}</span>`).join('')}
          </div>
        </div>
        <div class="station-card-footer">
          <span style="font-size:.8rem;color:var(--text-300)">${s.city}</span>
          <button class="btn-primary" style="padding:7px 14px;font-size:.8rem" onclick="event.stopPropagation();Stations.showDetail(${s.id})">
            <i class="fa-solid fa-arrow-right"></i> Book
          </button>
        </div>`;
      grid.appendChild(card);
    });
  },

  search(q) {
    const lo = q.toLowerCase();
    const city = document.getElementById('station-city-filter').value;
    const type = document.getElementById('station-type-filter').value;
    this.applyFilters(lo, city, type);
  },

  filterCity(city) {
    const q = document.getElementById('station-search').value.toLowerCase();
    const type = document.getElementById('station-type-filter').value;
    this.applyFilters(q, city, type);
  },

  filterType(type) {
    const q = document.getElementById('station-search').value.toLowerCase();
    const city = document.getElementById('station-city-filter').value;
    this.applyFilters(q, city, type);
  },

  applyFilters(q, city, type) {
    this.filtered = this.all.filter(s => {
      const matchQ = !q || s.name.toLowerCase().includes(q) || s.city.toLowerCase().includes(q);
      const matchCity = !city || s.city === city;
      const matchType = !type || s.chargers.some(c => c.type === type);
      return matchQ && matchCity && matchType;
    });
    this.render();
  },

  async showDetail(id) {
    App.navigate('station-detail');
    const content = document.getElementById('station-detail-content');
    content.innerHTML = `<div class="skeleton" style="height:200px;border-radius:20px"></div>`;
    try {
      const s = await API.get(`/api/stations/${id}`);
      const types = [...new Set(s.chargers.map(c => c.type))];
      Stations.selectedRating = 0;
      content.innerHTML = `
        <div class="station-detail-hero scan-wrap">
          <div class="station-detail-hero-top">
            <div>
              <div class="station-detail-name">${s.name}</div>
              <div class="station-detail-addr"><i class="fa-solid fa-location-dot"></i> ${s.address}, ${s.city}</div>
            </div>
            <div>${App.availBadge(s.available_chargers, s.total_chargers)}</div>
          </div>
          <div class="station-detail-stats">
            <div class="detail-stat">
              <span class="detail-stat-val gradient-text">${s.available_chargers}/${s.total_chargers}</span>
              <span class="detail-stat-lbl">Available</span>
            </div>
            <div class="detail-stat">
              <span class="detail-stat-val">${s.rating} <span class="stars" style="font-size:.9rem">${App.stars(s.rating)}</span></span>
              <span class="detail-stat-lbl">Rating</span>
            </div>
            <div class="detail-stat">
              <span class="detail-stat-val">${types.length}</span>
              <span class="detail-stat-lbl">Charger Types</span>
            </div>
          </div>
          <div style="margin-top:16px;display:flex;gap:10px;flex-wrap:wrap">
            <button class="btn-primary" onclick="MapView.navigateTo(${s.id})">
              <i class="fa-solid fa-diamond-turn-right"></i> Navigate
            </button>
            <button class="btn-secondary" onclick="MapView.flyTo(${s.lat},${s.lng})">
              <i class="fa-solid fa-map-location-dot"></i> View on Map
            </button>
            <button class="btn-secondary" onclick="MapView.openExternalNav(${s.lat},${s.lng})">
              <i class="fa-brands fa-google"></i> Google Maps
            </button>
          </div>
        </div>

        <!-- CHARGERS -->
        <div class="detail-section">
          <h3><i class="fa-solid fa-plug"></i> Available Chargers</h3>
          <div class="chargers-list">
            ${s.chargers.map(c => `
              <div class="charger-item ${c.status !== 'available' ? 'booked' : ''}">
                <div class="charger-info">
                  <i class="fa-solid fa-bolt charger-icon"></i>
                  <div>
                    <div class="charger-name">${c.type}</div>
                    <div class="charger-power">${c.power_kw} kW</div>
                  </div>
                  <span class="charger-badge ${c.type.replace(' ','')}">${c.type}</span>
                </div>
                <div style="display:flex;align-items:center;gap:12px">
                  <div class="charger-price">₹${c.price_per_kwh}/kWh</div>
                  ${c.status === 'available'
                    ? `<button class="btn-primary" style="padding:7px 14px;font-size:.8rem" onclick="Booking.open(${JSON.stringify(s).replace(/"/g,'&quot;')},${JSON.stringify(c).replace(/"/g,'&quot;')})">Book</button>`
                    : `<span class="badge badge-full">Booked</span>`}
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- AMENITIES -->
        <div class="detail-section">
          <h3><i class="fa-solid fa-star"></i> Amenities</h3>
          <div class="amenities-wrap">
            ${s.amenities.map(a => `<span class="amenity-tag"><i class="fa-solid ${App.amenityIcon(a)}"></i>${a}</span>`).join('')}
          </div>
        </div>

        <!-- REVIEWS -->
        <div class="detail-section">
          <h3><i class="fa-solid fa-comments"></i> Reviews</h3>
          <div class="reviews-list">
            ${s.reviews.length ? s.reviews.map(r => `
              <div class="review-card">
                <div class="review-header">
                  <span class="reviewer-name">${r.user_name}</span>
                  <span class="stars">${App.stars(r.rating)}</span>
                </div>
                <div class="review-text">${r.comment || 'No comment.'}</div>
                <div class="review-date" style="margin-top:6px">${App.formatDate(r.created_at)}</div>
              </div>
            `).join('') : '<p style="color:var(--text-300);font-size:.88rem">No reviews yet. Be the first!</p>'}
          </div>
          <div class="add-review-wrap">
            <h4 style="font-size:.9rem;margin-bottom:10px">Add Your Review</h4>
            <div class="star-picker" id="star-picker-${s.id}">
              ${[1,2,3,4,5].map(n => `<i class="fa-solid fa-star" data-val="${n}" onclick="Stations.setRating(${s.id},${n})"></i>`).join('')}
            </div>
            <textarea id="review-comment-${s.id}" rows="3" placeholder="Share your experience…"
              style="width:100%;background:var(--bg-700);border:1px solid var(--glass-border);border-radius:var(--radius-sm);color:var(--text-100);padding:10px;font-size:.85rem;outline:none;resize:vertical;font-family:inherit;margin-bottom:10px"></textarea>
            <button class="btn-secondary" onclick="Stations.submitReview(${s.id})">
              <i class="fa-solid fa-paper-plane"></i> Submit Review
            </button>
          </div>
        </div>`;
    } catch {
      content.innerHTML = '<p style="color:var(--red);padding:20px">Failed to load station details</p>';
    }
  },

  setRating(stationId, val) {
    Stations.selectedRating = val;
    document.querySelectorAll(`#star-picker-${stationId} i`).forEach((star, i) => {
      star.classList.toggle('active', i < val);
    });
  },

  async submitReview(stationId) {
    if (!Stations.selectedRating) { App.toast('Please select a rating', 'error'); return; }
    const comment = document.getElementById(`review-comment-${stationId}`).value.trim();
    try {
      await API.post('/api/reviews', { station_id: stationId, rating: Stations.selectedRating, comment });
      App.toast('Review submitted!', 'success');
      Stations.showDetail(stationId);
    } catch (e) {
      App.toast(e.message || 'Failed to submit review', 'error');
    }
  }
};
