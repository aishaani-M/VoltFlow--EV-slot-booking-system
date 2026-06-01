/* ══════════════════════════════════════════
   payment.js – Simulated payment gateway
   ══════════════════════════════════════════ */
const Payment = {
  bookingId: null,
  amount: 0,
  ref: '',
  method: 'card',

  open(bookingId, amount, ref) {
    this.bookingId = bookingId;
    this.amount = amount;
    this.ref = ref;
    this.method = 'card';
    this.renderForm();
    document.getElementById('payment-modal').classList.remove('hidden');
  },

  close() {
    document.getElementById('payment-modal').classList.add('hidden');
  },

  selectMethod(m) {
    this.method = m;
    document.querySelectorAll('.payment-tab').forEach(t => t.classList.remove('active'));
    document.getElementById('ptab-' + m).classList.add('active');
    this.renderMethodContent();
  },

  renderForm() {
    document.getElementById('payment-modal-content').innerHTML = `
      <div class="modal-body">
        <div style="background:var(--bg-700);border-radius:var(--radius-md);padding:14px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-size:.8rem;color:var(--text-300)">Amount to Pay</div>
            <div style="font-size:1.6rem;font-weight:800;color:var(--neon)">₹${Number(this.amount).toFixed(2)}</div>
          </div>
          <div style="font-size:.75rem;color:var(--text-300);font-family:'JetBrains Mono',monospace">Ref: ${this.ref}</div>
        </div>

        <div class="payment-method-tabs">
          <div class="payment-tab active" id="ptab-card" onclick="Payment.selectMethod('card')">
            <i class="fa-solid fa-credit-card"></i> Card
          </div>
          <div class="payment-tab" id="ptab-upi" onclick="Payment.selectMethod('upi')">
            <i class="fa-solid fa-mobile-screen"></i> UPI
          </div>
          <div class="payment-tab" id="ptab-wallet" onclick="Payment.selectMethod('wallet')">
            <i class="fa-solid fa-wallet"></i> Wallet
          </div>
        </div>

        <div id="payment-method-content"></div>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" onclick="Payment.close()">Cancel</button>
        <button class="btn-primary" id="pay-btn" onclick="Payment.process()">
          <i class="fa-solid fa-lock"></i> Pay ₹${Number(this.amount).toFixed(2)}
        </button>
      </div>`;

    this.renderMethodContent();
  },

  renderMethodContent() {
    const el = document.getElementById('payment-method-content');
    if (!el) return;

    if (this.method === 'card') {
      el.innerHTML = `
        <div class="card-visual">
          <div class="card-chip"></div>
          <div class="card-number" id="card-num-display">•••• •••• •••• ••••</div>
          <div class="card-details-row">
            <span id="card-holder-display">CARDHOLDER NAME</span>
            <span id="card-exp-display">MM/YY</span>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label><i class="fa-solid fa-credit-card"></i> Card Number</label>
            <input type="text" id="card-num" placeholder="1234 5678 9012 3456" maxlength="19"
              oninput="Payment.formatCard(this)" />
          </div>
          <div class="form-group">
            <label><i class="fa-solid fa-user"></i> Name on Card</label>
            <input type="text" id="card-name" placeholder="John Doe"
              oninput="document.getElementById('card-holder-display').textContent=this.value||'CARDHOLDER NAME'" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label><i class="fa-solid fa-calendar"></i> Expiry</label>
            <input type="text" id="card-exp" placeholder="MM/YY" maxlength="5"
              oninput="Payment.formatExpiry(this)" />
          </div>
          <div class="form-group">
            <label><i class="fa-solid fa-lock"></i> CVV</label>
            <input type="password" id="card-cvv" placeholder="•••" maxlength="3" />
          </div>
        </div>`;
    } else if (this.method === 'upi') {
      el.innerHTML = `
        <div style="text-align:center;padding:20px 0">
          <i class="fa-solid fa-mobile-screen" style="font-size:3rem;color:var(--neon);margin-bottom:16px"></i>
          <p style="font-size:.88rem;color:var(--text-300);margin-bottom:20px">Enter your UPI ID to pay</p>
        </div>
        <div class="form-group">
          <label><i class="fa-solid fa-at"></i> UPI ID</label>
          <input type="text" id="upi-id" placeholder="yourname@upi" />
        </div>
        <div style="text-align:center;margin-top:10px;font-size:.8rem;color:var(--text-300)">
          Or scan QR code with any UPI app
        </div>
        <div style="text-align:center;margin-top:12px">
          <div style="width:120px;height:120px;margin:0 auto;background:white;border-radius:12px;display:flex;align-items:center;justify-content:center">
            <i class="fa-solid fa-qrcode" style="font-size:4rem;color:#000"></i>
          </div>
        </div>`;
    } else {
      el.innerHTML = `
        <div style="text-align:center;padding:16px 0">
          <i class="fa-solid fa-wallet" style="font-size:3rem;color:var(--neon);margin-bottom:12px"></i>
          <p style="font-size:.88rem;color:var(--text-300);margin-bottom:8px">EV Charge Hub Wallet</p>
          <div style="font-size:1.4rem;font-weight:800;color:var(--neon)">₹2,500.00</div>
          <div style="font-size:.8rem;color:var(--text-300);margin-top:4px">Available Balance</div>
        </div>
        <div style="background:rgba(57,255,106,.08);border:1px solid var(--neon-dim);border-radius:var(--radius-md);padding:14px;margin-top:16px;text-align:center">
          <div style="font-size:.85rem;color:var(--text-200)">₹${Number(this.amount).toFixed(2)} will be deducted</div>
          <div style="font-size:.8rem;color:var(--text-300);margin-top:4px">Remaining: ₹${(2500 - this.amount).toFixed(2)}</div>
        </div>`;
    }
  },

  formatCard(input) {
    let v = input.value.replace(/\D/g,'').substring(0,16);
    input.value = v.replace(/(.{4})/g,'$1 ').trim();
    document.getElementById('card-num-display').textContent = input.value || '•••• •••• •••• ••••';
  },

  formatExpiry(input) {
    let v = input.value.replace(/\D/g,'').substring(0,4);
    if (v.length >= 2) v = v.substring(0,2) + '/' + v.substring(2);
    input.value = v;
    document.getElementById('card-exp-display').textContent = input.value || 'MM/YY';
  },

  async process() {
    const btn = document.getElementById('pay-btn');
    btn.innerHTML = '<span class="spinner"></span> Processing…';
    btn.disabled = true;

    // Simulate a small delay
    await new Promise(r => setTimeout(r, 2000));

    try {
      const data = await API.post('/api/payments', {
        booking_id: this.bookingId,
        amount: this.amount,
        payment_method: this.method
      });

      if (data.success) {
        Payment.showSuccess(data.transaction_id, data.points_earned, data.total_points);
      }
    } catch (e) {
      // Simulate rare failure
      Payment.showFailure();
    }
  },

  showSuccess(txnId, ptsEarned, totalPts) {
    const now = new Date();
    document.getElementById('payment-modal-content').innerHTML = `
      <div class="payment-success-anim">
        <div class="success-circle"><i class="fa-solid fa-check"></i></div>
        <h2 style="color:var(--neon);margin-bottom:8px">Payment Successful!</h2>
        <p style="color:var(--text-300);font-size:.88rem;margin-bottom:24px">Your slot has been booked successfully</p>

        ${ptsEarned ? `<div style="background:linear-gradient(135deg,rgba(108,92,231,.15),rgba(0,180,216,.15));border:1px solid var(--neon-dim);border-radius:var(--radius-md);padding:16px;margin-bottom:20px;text-align:center">
          <div style="font-size:1.8rem;font-weight:800;margin-bottom:4px" class="gradient-text">+${ptsEarned} pts</div>
          <div style="font-size:.82rem;color:var(--text-300)">Reward points earned! Total: <b style="color:var(--neon)">${totalPts}</b> pts</div>
          ${totalPts >= 2000 ? '<div style="margin-top:8px;font-size:.85rem;color:var(--yellow)"><i class="fa-solid fa-gift"></i> You can redeem offers now!</div>' : ''}
        </div>` : ''}

        <div style="background:var(--bg-700);border-radius:var(--radius-lg);padding:20px;text-align:left">
          <div style="font-weight:700;margin-bottom:12px;display:flex;align-items:center;gap:8px">
            <i class="fa-solid fa-receipt" style="color:var(--neon)"></i> Payment Receipt
          </div>
          <table class="receipt-table">
            <tr><td>Booking Ref</td><td style="font-family:'JetBrains Mono',monospace">${this.ref}</td></tr>
            <tr><td>Transaction ID</td><td style="font-family:'JetBrains Mono',monospace;font-size:.78rem">${txnId}</td></tr>
            <tr><td>Amount Paid</td><td style="color:var(--neon)">₹${Number(this.amount).toFixed(2)}</td></tr>
            <tr><td>Payment Method</td><td style="text-transform:capitalize">${this.method}</td></tr>
            <tr><td>Date & Time</td><td>${now.toLocaleString('en-IN')}</td></tr>
            <tr><td>Status</td><td style="color:var(--neon)">✓ Confirmed</td></tr>
          </table>
        </div>

        <div style="display:flex;gap:10px;justify-content:center;margin-top:20px">
          <button class="btn-secondary" onclick="Payment.close()">Close</button>
          <button class="btn-primary" onclick="Payment.close();App.navigate('bookings')">
            <i class="fa-solid fa-calendar-check"></i> View Bookings
          </button>
        </div>
      </div>`;
    App.toast('Payment successful! +' + (ptsEarned||0) + ' reward points 🎉', 'success');
  },

  showFailure() {
    document.getElementById('payment-modal-content').innerHTML = `
      <div class="payment-success-anim">
        <div class="success-circle" style="background:linear-gradient(135deg,var(--red),#cc0033)">
          <i class="fa-solid fa-xmark"></i>
        </div>
        <h2 style="color:var(--red);margin-bottom:8px">Payment Failed</h2>
        <p style="color:var(--text-300);font-size:.88rem;margin-bottom:24px">Something went wrong. Please try again.</p>
        <div style="display:flex;gap:10px;justify-content:center">
          <button class="btn-secondary" onclick="Payment.close()">Cancel</button>
          <button class="btn-primary" onclick="Payment.renderForm()">
            <i class="fa-solid fa-redo"></i> Retry
          </button>
        </div>
      </div>`;
  }
};
