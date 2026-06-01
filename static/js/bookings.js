/* ══════════════════════════════════════════
   bookings.js – Booking list & management
   ══════════════════════════════════════════ */
const Bookings = {
  all: [],
  currentFilter: 'all',

  async load() {
    const list = document.getElementById('bookings-list');
    list.innerHTML = '<div class="skeleton" style="height:120px;border-radius:16px;margin-bottom:10px"></div>'.repeat(3);
    try {
      this.all = await API.get('/api/bookings');
      this.render();
    } catch {
      list.innerHTML = '<p style="color:var(--red);padding:20px">Failed to load bookings</p>';
    }
  },

  filterStatus(status, btn) {
    this.currentFilter = status;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    this.render();
  },

  render() {
    const list = document.getElementById('bookings-list');
    let items = this.all;
    if (this.currentFilter !== 'all') {
      items = items.filter(b => b.status === this.currentFilter);
    }

    if (!items.length) {
      list.innerHTML = `<div class="empty-state">
        <div class="empty-icon"><i class="fa-solid fa-calendar-xmark"></i></div>
        <div class="empty-title">No bookings found</div>
        <div class="empty-sub">Book a charging slot to get started</div>
        <button class="btn-primary" style="margin-top:16px" onclick="App.navigate('stations')">
          <i class="fa-solid fa-charging-station"></i> Find Stations
        </button>
      </div>`;
      return;
    }

    list.innerHTML = '';
    list.className = 'bookings-list stagger-children';
    items.forEach(b => {
      const card = document.createElement('div');
      card.className = 'booking-card';
      card.innerHTML = `
        <div class="booking-card-header">
          <div>
            <div style="font-weight:700;font-size:.95rem">${b.station_name}</div>
            <div class="booking-ref">${b.booking_ref}</div>
            <div style="font-size:.8rem;color:var(--text-300);margin-top:4px">
              <i class="fa-solid fa-location-dot"></i> ${b.city}
            </div>
          </div>
          <span class="badge badge-${b.status}">${b.status.charAt(0).toUpperCase() + b.status.slice(1)}</span>
        </div>
        <div class="booking-card-body">
          <div class="booking-detail-item">
            <span class="booking-detail-label"><i class="fa-solid fa-calendar"></i> Date</span>
            <span class="booking-detail-value">${App.formatDate(b.booking_date)}</span>
          </div>
          <div class="booking-detail-item">
            <span class="booking-detail-label"><i class="fa-solid fa-clock"></i> Time</span>
            <span class="booking-detail-value">${b.start_time} – ${b.end_time}</span>
          </div>
          <div class="booking-detail-item">
            <span class="booking-detail-label"><i class="fa-solid fa-plug"></i> Charger</span>
            <span class="booking-detail-value">
              <span class="charger-badge ${b.charger_type ? b.charger_type.replace(' ','') : ''}">${b.charger_type || '—'}</span>
            </span>
          </div>
          <div class="booking-detail-item">
            <span class="booking-detail-label"><i class="fa-solid fa-bolt"></i> Power</span>
            <span class="booking-detail-value">${b.power_kw} kW</span>
          </div>
          <div class="booking-detail-item">
            <span class="booking-detail-label"><i class="fa-solid fa-hourglass"></i> Duration</span>
            <span class="booking-detail-value">${b.duration_hours} hr${b.duration_hours > 1 ? 's' : ''}</span>
          </div>
          <div class="booking-detail-item">
            <span class="booking-detail-label"><i class="fa-solid fa-indian-rupee-sign"></i> Amount</span>
            <span class="booking-detail-value" style="color:var(--neon)">₹${Number(b.total_amount).toFixed(2)}</span>
          </div>
        </div>
        <div class="booking-card-footer">
          <span style="font-size:.75rem;color:var(--text-300)">
            Booked on ${App.formatDate(b.created_at)}
          </span>
          <div style="display:flex;gap:8px">
            ${b.status === 'upcoming'
              ? `<button class="btn-danger" onclick="Bookings.cancel(${b.id})">
                   <i class="fa-solid fa-xmark"></i> Cancel
                 </button>`
              : ''}
          </div>
        </div>`;
      list.appendChild(card);
    });
  },

  async cancel(id) {
    if (!confirm('Cancel this booking?')) return;
    try {
      await API.post(`/api/bookings/${id}/cancel`);
      App.toast('Booking cancelled', 'info');
      await this.load();
    } catch (e) {
      App.toast(e.message || 'Failed to cancel', 'error');
    }
  }
};
