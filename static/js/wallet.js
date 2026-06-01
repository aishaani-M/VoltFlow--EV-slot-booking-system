/* ══════════════════════════════════════════
   wallet.js – Reward wallet & points system
   ══════════════════════════════════════════ */
const Wallet = {
  data: null,

  async load() {
    const el = document.getElementById('wallet-content');
    el.innerHTML = '<div class="skeleton" style="height:200px;border-radius:20px;margin-bottom:16px"></div>';
    try {
      this.data = await API.get('/api/wallet');
      this.render();
    } catch {
      el.innerHTML = '<p style="color:var(--red);padding:20px">Failed to load wallet</p>';
    }
  },

  render() {
    const d = this.data;
    const pct = Math.min((d.points / 2000) * 100, 100);
    const remaining = Math.max(2000 - d.points, 0);
    const vtLabel = d.vehicle_type === 'scooter' ? 'Scooter' : 'Car';

    document.getElementById('wallet-content').innerHTML = `
      <!-- Points Hero -->
      <div class="wallet-hero">
        <div class="wallet-points-circle">
          <svg viewBox="0 0 120 120" class="wallet-ring">
            <circle cx="60" cy="60" r="52" fill="none" stroke="var(--bg-600)" stroke-width="8"/>
            <circle cx="60" cy="60" r="52" fill="none" stroke="url(#walletGrad)" stroke-width="8"
                    stroke-dasharray="${pct * 3.27} 327" stroke-linecap="round"
                    transform="rotate(-90 60 60)" class="wallet-ring-fill"/>
            <defs><linearGradient id="walletGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="var(--neon)"/><stop offset="100%" stop-color="var(--accent)"/>
            </linearGradient></defs>
          </svg>
          <div class="wallet-points-inner">
            <div class="wallet-pts-number">${d.points}</div>
            <div class="wallet-pts-label">points</div>
          </div>
        </div>
        <div class="wallet-hero-info">
          <h2 class="gradient-text" style="font-size:1.6rem;margin-bottom:8px">Reward Points</h2>
          <div class="wallet-meta-row">
            <i class="fa-solid fa-${d.vehicle_type === 'scooter' ? 'motorcycle' : 'car'}"></i>
            <span>${vtLabel} – <b>${d.pts_per_charge} pts</b> per charge</span>
          </div>
          <div class="wallet-progress-wrap">
            <div class="progress-bar" style="height:10px;border-radius:8px">
              <div class="progress-fill" style="width:${pct}%"></div>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:.78rem;color:var(--text-300);margin-top:6px">
              <span>${d.points} / 2,000 pts</span>
              <span>${remaining > 0 ? remaining + ' pts to go!' : '🎉 Ready to redeem!'}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- How it works -->
      <div class="wallet-section">
        <h3><i class="fa-solid fa-circle-info"></i> How It Works</h3>
        <div class="wallet-how-grid">
          <div class="wallet-how-card">
            <div class="wallet-how-icon"><i class="fa-solid fa-bolt"></i></div>
            <div class="wallet-how-title">Charge</div>
            <div class="wallet-how-desc">Book & pay for any EV charging session</div>
          </div>
          <div class="wallet-how-card">
            <div class="wallet-how-icon"><i class="fa-solid fa-coins"></i></div>
            <div class="wallet-how-title">Earn</div>
            <div class="wallet-how-desc">Scooter: 50 pts · Car: 80 pts per charge</div>
          </div>
          <div class="wallet-how-card">
            <div class="wallet-how-icon"><i class="fa-solid fa-gift"></i></div>
            <div class="wallet-how-title">Redeem</div>
            <div class="wallet-how-desc">2,000 pts = free charge or station offers</div>
          </div>
        </div>
      </div>

      <!-- Available Offers -->
      <div class="wallet-section">
        <h3><i class="fa-solid fa-tags"></i> Available Offers</h3>
        ${d.offers.length ? `<div class="wallet-offers-grid">
          ${d.offers.map(o => `
            <div class="wallet-offer-card ${d.points >= o.points_required ? '' : 'locked'}">
              <div class="offer-station"><i class="fa-solid fa-charging-station"></i> ${o.station_name}</div>
              <div class="offer-title">${o.title}</div>
              <div class="offer-desc">${o.description || ''}</div>
              <div class="offer-footer">
                <span class="offer-pts"><i class="fa-solid fa-coins"></i> ${o.points_required} pts</span>
                ${o.discount_percent === 100 ? '<span class="offer-badge-free">FREE</span>' : '<span class="offer-badge-disc">' + o.discount_percent + '% OFF</span>'}
                <button class="btn-primary" style="padding:7px 14px;font-size:.8rem" onclick="Wallet.redeem(${o.id})"
                        ${d.points < o.points_required ? 'disabled' : ''}>
                  ${d.points >= o.points_required ? '<i class="fa-solid fa-gift"></i> Redeem' : '<i class="fa-solid fa-lock"></i> Locked'}
                </button>
              </div>
            </div>
          `).join('')}
        </div>` : '<p style="color:var(--text-300);font-size:.88rem">No offers available yet. Stations can create offers for you to redeem!</p>'}
      </div>

      <!-- Transaction History -->
      <div class="wallet-section">
        <h3><i class="fa-solid fa-clock-rotate-left"></i> Points History</h3>
        ${d.transactions.length ? `<div class="wallet-txn-list">
          ${d.transactions.map(t => `
            <div class="wallet-txn ${t.points > 0 ? 'earned' : 'spent'}">
              <div class="txn-icon"><i class="fa-solid fa-${t.points > 0 ? 'arrow-up' : 'arrow-down'}"></i></div>
              <div class="txn-info">
                <div class="txn-desc">${t.description}</div>
                <div class="txn-date">${App.formatDate(t.created_at)}</div>
              </div>
              <div class="txn-pts ${t.points > 0 ? 'plus' : 'minus'}">${t.points > 0 ? '+' : ''}${t.points} pts</div>
            </div>
          `).join('')}
        </div>` : '<p style="color:var(--text-300);font-size:.88rem">No transactions yet. Start charging to earn points!</p>'}
      </div>`;
  },

  async redeem(offerId) {
    if (!confirm('Redeem this offer? Points will be deducted.')) return;
    try {
      const data = await API.post('/api/wallet/redeem', { offer_id: offerId });
      if (data.success) {
        App.toast('Offer redeemed! 🎉 Remaining: ' + data.remaining_points + ' pts', 'success');
        Wallet.load();
      }
    } catch (e) {
      App.toast(e.message || 'Redemption failed', 'error');
    }
  }
};
