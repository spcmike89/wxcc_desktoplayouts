// hold-banner.js
(function () {
  class AgentxHoldBannerDom extends HTMLElement {
    static get observedAttributes() { return ['thresholdms','snoozems']; }

    constructor() {
      super();
      this._thresholdMs = 300000;   // default 5 min
      this._snoozeMs    = 0;        // default: snooze until hold resets (no timer)
      this._interval = null;
      this._showing  = false;
      this._acked    = false;       // true after Ack; blocks re-show until reset or snooze over
      this._snoozeUntil = 0;
      this._lastSecs = null;        // track timer to detect reset

      const root = this.attachShadow({ mode: 'open' });
      root.innerHTML = `
        <style>
          .hold-banner{
            position: fixed; top: 64px; left: 50%; transform: translateX(-50%);
            max-width: 80%; background: #ffe7ba; color: #402;
            border: 2px solid #eed150; border-radius: 8px;
            box-shadow: 0 6px 18px rgba(0,0,0,.1);
            font: 600 14px/1.2 system-ui, -apple-system, "Segoe UI", Roboto, Arial;
            padding: 8px 12px; display: none; z-index: 10000; gap: 10px; align-items: center;
          }
          .hold-banner.show { display: inline-flex; animation: slide .12s ease-out; }
          @keyframes slide { from { opacity:.8; transform: translate(-50%,-6px) } to { opacity:1; transform: translate(-50%,0) } }
          .hold-banner button {
            margin-left: 8px; background: #fff; color:#402; border: 1px solid #ddd;
            padding: 6px 10px; border-radius: 8px; font-weight: 600; cursor: pointer;
          }
          .elapsed { font-weight: 700; }
        </style>
        <div class="hold-banner" role="alert" aria-live="assertive" aria-atomic="true">
          🔔 Call has been on hold too long. <span class="elapsed">(00:00)</span>
          <button type="button">Ack</button>
        </div>
      `;
      this.$banner  = root.querySelector('.hold-banner');
      this.$elapsed = root.querySelector('.elapsed');
      root.querySelector('button').addEventListener('click', () => this._ack());
    }

    connectedCallback() {
      console.log('[WXCC] hold-banner widget connected');
      this._applyThresholds();
      this._start();
    }
    disconnectedCallback() {
      if (this._interval) { clearInterval(this._interval); this._interval = null; }
    }
    attributeChangedCallback(name) {
      if (name === 'thresholdms' || name === 'snoozems') this._applyThresholds();
    }

    set thresholdMs(v) { this.setAttribute('thresholdms', String(v)); }
    get thresholdMs()  { return Number(this.getAttribute('thresholdms')) || this._thresholdMs; }
    set snoozeMs(v)    { this.setAttribute('snoozems', String(v)); }
    get snoozeMs()     { return Number(this.getAttribute('snoozems')) || this._snoozeMs; }

    _applyThresholds() {
      const th = Number(this.getAttribute('thresholdms'));
      if (!Number.isNaN(th) && th > 0) this._thresholdMs = th;
      const sn = Number(this.getAttribute('snoozems'));
      if (!Number.isNaN(sn) && sn >= 0) this._snoozeMs = sn;
    }

    // Parse "Call on Hold- 02:26" (hyphen/en dash/em dash; spaces optional)
    _parseHoldSeconds() {
      const text = (document.body && document.body.innerText) || '';
      const m = text.match(/Call\s+on\s+Hold\s*(\d{1,2}):(\d{2})/i);
      if (!m) return null;
      const min = parseInt(m[1], 10), sec = parseInt(m[2], 10);
      return (min * 60) + sec;
    }

    _start() {
      this._interval = setInterval(() => {
        const secs = this._parseHoldSeconds();

        // When hold text is gone, fully reset ack + tracking
        if (secs == null) {
          if (this._showing) this.hide();
          this._acked = false;
          this._snoozeUntil = 0;
          this._lastSecs = null;
          return;
        }

        // Detect timer reset (e.g., hold released then re-entered)
        if (this._lastSecs !== null && secs < this._lastSecs) {
          this._acked = false;
          this._snoozeUntil = 0;
        }
        this._lastSecs = secs;

        // Update elapsed in banner (mm:ss)
        const mm = Math.floor(secs / 60);
        const ss = String(secs % 60).padStart(2, '0');
        this.$elapsed.textContent = `(${mm}:${ss})`;

        const overThreshold = (secs * 1000) >= this._thresholdMs;
        const snoozed = this._snoozeUntil && Date.now() < this._snoozeUntil;

        if (!this._showing && overThreshold && !this._acked && !snoozed) {
          console.log('[WXCC] hold-banner showing at', secs, 'seconds');
          this.show();
        } else if (this._showing && (!overThreshold || this._acked || snoozed)) {
          this.hide();
        }
      }, 1200);
    }

    _ack() {
      this._acked = true;
      if (this._snoozeMs > 0) this._snoozeUntil = Date.now() + this._snoozeMs;
      this.hide();
    }

    show() { this._showing = true;  this.$banner.classList.add('show'); }
    hide() { this._showing = false; this.$banner.classList.remove('show'); }
  }

  customElements.define('agentx-hold-banner-dom', AgentxHoldBannerDom);
})();
