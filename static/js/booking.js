/* ══════════════════════════════════════════
   booking.js – Booking modal & slot selection
   ══════════════════════════════════════════ */
const Booking = {
  station: null,
  charger: null,
  selectedDate: '',
  selectedStart: '',
  selectedEnd: '',
  duration: 1,
  bookingId: null,
  amount: 0,

  open(station, charger) {
    // station & charger may come as objects or JSON strings from onclick attrs
    this.station = typeof station === 'string' ? JSON.parse(station) : station;
    this.charger = typeof charger === 'string' ? JSON.parse(charger) : charger;
    this.step1();
    document.getElementById('booking-modal').classList.remove('hidden');
  },

  close() {
    document.getElementById('booking-modal').classList.add('hidden');
  },

  step1() {
    const today = new Date().toISOString().split('T')[0];
    const maxDate = new Date(); maxDate.setDate(maxDate.getDate() + 14);
    const maxStr = maxDate.toISOString().split('T')[0];

    document.getElementById('booking-modal-content').innerHTML = `
      <div class="modal-body">
        <div style="background:var(--bg-700);border-radius:var(--radius-md);padding:14px;margin-bottom:20px">
          <div style="font-weight:700;margin-bottom:4px">${this.station.name}</div>
          <div style="font-size:.82rem;color:var(--text-300)">
            <span class="charger-badge ${this.charger.type.replace(' ','')}" style="margin-right:8px">${this.charger.type}</span>
            ${this.charger.power_kw} kW · ₹${this.charger.price_per_kwh}/kWh
          </div>
        </div>

        <div class="form-group">
          <label><i class="fa-solid fa-calendar"></i> Booking Date</label>
          <input type="date" id="book-date" min="${today}" max="${maxStr}" value="${today}" onchange="Booking.updateDate(this.value)" />
        </div>

        <div class="form-group">
          <label><i class="fa-solid fa-clock"></i> Select Start Time</label>
          <div class="time-slots-grid" id="time-slots"></div>
        </div>

        <div class="form-group">
          <label><i class="fa-solid fa-hourglass-half"></i> Duration (hours)</label>
          <select id="book-duration" onchange="Booking.updateDuration(this.value)">
            <option value="0.5">30 minutes</option>
            <option value="1" selected>1 hour</option>
            <option value="1.5">1.5 hours</option>
            <option value="2">2 hours</option>
            <option value="3">3 hours</option>
            <option value="4">4 hours</option>
          </select>
        </div>

        <div id="booking-cost-preview" style="background:var(--bg-700);border-radius:var(--radius-md);padding:14px;margin-bottom:20px;display:none">
          <div class="booking-summary-row">
            <span class="label">Estimated Energy</span>
            <span class="value" id="est-energy">–</span>
          </div>
          <div class="booking-summary-row booking-total">
            <span class="label">Estimated Cost</span>
            <span class="value" id="est-cost">–</span>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" onclick="Booking.close()">Cancel</button>
        <button class="btn-primary" onclick="Booking.step2()"><i class="fa-solid fa-arrow-right"></i> Continue</button>
      </div>`;

    this.selectedDate = today;
    this.duration = 1;
    this.renderTimeSlots();
  },

  renderTimeSlots() {
    const container = document.getElementById('time-slots');
    if (!container) return;
    const slots = [];
    for (let h = 6; h <= 22; h++) {
      slots.push(`${String(h).padStart(2,'0')}:00`);
      if (h < 22) slots.push(`${String(h).padStart(2,'0')}:30`);
    }
    container.innerHTML = slots.map(t => `
      <div class="time-slot ${this.selectedStart === t ? 'selected' : ''}"
           onclick="Booking.selectTime('${t}')">${t}</div>
    `).join('');
  },

  selectTime(time) {
    this.selectedStart = time;
    // Calculate end time
    const [h, m] = time.split(':').map(Number);
    const totalMins = h * 60 + m + this.duration * 60;
    const endH = Math.floor(totalMins / 60) % 24;
    const endM = totalMins % 60;
    this.selectedEnd = `${String(endH).padStart(2,'0')}:${String(endM).padStart(2,'0')}`;
    this.renderTimeSlots();
    this.updateCostPreview();
  },

  updateDate(val) { this.selectedDate = val; },

  updateDuration(val) {
    this.duration = parseFloat(val);
    if (this.selectedStart) this.selectTime(this.selectedStart);
  },

  updateCostPreview() {
    const preview = document.getElementById('booking-cost-preview');
    if (!preview) return;
    preview.style.display = 'block';
    const energy = (this.charger.power_kw * this.duration).toFixed(1);
    const cost = (this.charger.power_kw * this.charger.price_per_kwh * this.duration / 100 * 10).toFixed(2);
    document.getElementById('est-energy').textContent = energy + ' kWh';
    document.getElementById('est-cost').textContent = '₹' + cost;
    this.amount = parseFloat(cost);
  },

  step2() {
    if (!this.selectedStart) { App.toast('Please select a start time', 'error'); return; }
    document.getElementById('booking-modal-content').innerHTML = `
      <div class="modal-body">
        <h3 style="margin-bottom:16px;font-size:.95rem;color:var(--text-200)">Confirm Booking Details</h3>
        <div style="background:var(--bg-700);border-radius:var(--radius-md);padding:16px">
          <div class="booking-summary-row"><span class="label">Station</span><span class="value">${this.station.name}</span></div>
          <div class="booking-summary-row"><span class="label">City</span><span class="value">${this.station.city}</span></div>
          <div class="booking-summary-row"><span class="label">Charger Type</span>
            <span class="value"><span class="charger-badge ${this.charger.type.replace(' ','')}">${this.charger.type}</span></span></div>
          <div class="booking-summary-row"><span class="label">Power</span><span class="value">${this.charger.power_kw} kW</span></div>
          <div class="booking-summary-row"><span class="label">Date</span><span class="value">${App.formatDate(this.selectedDate)}</span></div>
          <div class="booking-summary-row"><span class="label">Time</span><span class="value">${this.selectedStart} – ${this.selectedEnd}</span></div>
          <div class="booking-summary-row"><span class="label">Duration</span><span class="value">${this.duration} hr${this.duration > 1 ? 's' : ''}</span></div>
          <div class="booking-summary-row booking-total">
            <span class="label" style="font-weight:700">Total Amount</span>
            <span class="value">₹${this.amount.toFixed(2)}</span>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" onclick="Booking.step1()"><i class="fa-solid fa-arrow-left"></i> Back</button>
        <button class="btn-primary" onclick="Booking.confirm()"><i class="fa-solid fa-check"></i> Confirm & Pay</button>
      </div>`;
  },

  async confirm() {
    try {
      const data = await API.post('/api/bookings', {
        station_id: this.station.id,
        charger_id: this.charger.id,
        booking_date: this.selectedDate,
        start_time: this.selectedStart,
        end_time: this.selectedEnd,
        duration_hours: this.duration
      });
      this.bookingId = data.booking_id;
      this.amount = data.total_amount;
      Booking.close();
      Payment.open(data.booking_id, data.total_amount, data.booking_ref);
    } catch (e) {
      App.toast(e.message || 'Booking failed', 'error');
    }
  }
};
