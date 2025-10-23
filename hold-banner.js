// hold-banner.js
(function () {
  class AgentxHoldBannerDom extends HTMLElement {
    static get observedAttributes() { return ['state','thresholdms','snoozems']; }

    constructor() {
      super();
      // Config
      this._thresholdMs = 300000; // default 5 min
      this._snoozeMs    = 0;      // 0 = snooze until hold resets
      // Internal
      this._interval = null;
      this._showing  = false;
      this._acked    = false;
      this._snoozeUntil = 0;
      this._holdStartTs = null;   // when we detected entering "hold"
      this._lastHoldSecs = null;  // for DOM fallback; detect resets

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

    // ===== lifecycle =====
    connectedCallback() {
      console.log('[WXCC] hold-banner widget connected');
      this._applyConfig();
      this._startTicker();
    }
    disconnectedCallback() { if (this._interval) { clearInterval(this._interval); this._interval = null; } }
    attributeChangedCallback(name) {
      if (name === 'thresholdms' || name === 'snoozems') this._applyConfig();
      if (name === 'state') this._onStateChange((this.getAttribute('state') || '').toLowerCase());
    }

    // ===== properties =====
    set state(v){ this.setAttribute('state', v ?? ''); }
    get state(){ return (this.getAttribute('state') || '').toLowerCase(); }
    set thresholdMs(v){ this.setAttribute('thresholdms', String(v)); }
    get thresholdMs(){ return Number(this.getAttribute('thresholdms')) || this._thresholdMs; }
    set snoozeMs(v){ this.setAttribute('snoozems', String(v)); }
    get snoozeMs(){ return Number(this.getAttribute('snoozems')) || this._snoozeMs; }

    _applyConfig(){
      const th = Number(this.getAttribute('thresholdms'));
      if (!Number.isNaN(th) && th > 0) this._thresholdMs = th;
      const sn = Number(this.getAttribute('snoozems'));
      if (!Number.isNaN(sn) && sn >= 0) this._snoozeMs = sn;
    }

    // ===== state-driven logic (primary) =====
    _onStateChange(s){
      // Entering hold?
      if (s.includes('hold')) {
        if (this._holdStartTs == null) {
          this._holdStartTs = Date.now();
          this._acked = false;
          this._snoozeUntil = 0;
          console.log('[WXCC] hold detected: starting timer at', new Date(this._holdStartTs).toISOString());
        }
        return;
      }
      // Leaving hold (connected, ringing, wrapup, etc.)
      if (this._holdStartTs != null) console.log('[WXCC] hold cleared');
      this._holdStartTs = null;
      this._acked = false;
      this._snoozeUntil = 0;
      this._lastHoldSecs = null;
      this.hide();
    }

    // ===== DOM fallback (only if state not provided/unknown) =====
    _parseHoldSecondsFromDOM(){
      const text = (document.body && document.body.innerText) || '';
      // NO hyphen: just "Call on Hold 02:26" (case-insensitive)
      const m = text.match(/Call\s+on\s+Hold\s*(\d{1,2}):(\d{2})/i);
      if (!m) return null;
      const min = parseInt(m[1], 10), sec = parseInt(m[2], 10);
      return (min * 60) + sec;
    }

    // ===== main ticker =====
    _startTicker(){
      this._interval = setInterval(() => {
        let elapsedMs = null;

        if (this.state) {
          // Use store: compute elapsed from when state entered hold
          if (this.state.includes('hold') && this._holdStartTs != null) {
            elapsedMs = Date.now() - this._holdStartTs;
          }
        } else {
          // No state binding → try DOM fallback (may fail if closed shadow DOM)
          const secs = this._parseHoldSecondsFromDOM();
          if (secs == null) { this.hide(); return; }
          // Detect reset
          if (this._lastHoldSecs !== null && secs < this._lastHoldSecs) {
            this._acked = false; this._snoozeUntil = 0;
          }
          this._lastHoldSecs = secs;
          elapsedMs = secs * 1000;
        }

        if (elapsedMs == null) { /* not on hold */ this.hide(); return; }

        // update mm:ss display
        const mm = Math.floor(elapsedMs / 60000);
        const ss = String(Math.floor((elapsedMs % 60000) / 1000)).padStart(2, '0');
        this.$elapsed.textContent = `(${mm}:${ss})`;

        const over = elapsedMs >= this._thresholdMs;
        const snoozed = this._snoozeUntil && Date.now() < this._snoozeUntil;

        if (!this._showing && over && !this._acked && !snoozed) {
          console.log('[WXCC] hold-banner showing at', mm + ':' + ss);
          this.show();
        } else if (this._showing && (!over || this._acked || snoozed)) {
          this.hide();
        }
      }, 1000);
    }

    _ack(){
      this._acked = true;
      if (this._snoozeMs > 0) this._snoozeUntil = Date.now() + this._snoozeMs;
      this.hide();
    }

    show(){ this._showing = true;  this.$banner.classList.add('show'); }
    hide(){ this._showing = false; this.$banner.classList.remove('show'); }
  }

  customElements.define('agentx-hold-banner-dom', AgentxHoldBannerDom);
})();
