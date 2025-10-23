// hold-banner.js — banner alert when "Call on Hold" > threshold
(function () {
  class AgentxHoldBannerDom extends HTMLElement {
    static get observedAttributes() { return ['thresholdms','snoozems']; }

    constructor() {
      super();
      // config
      this._thresholdMs = 60000; // default 60s
      this._snoozeMs    = 0;     // 0 = snooze until hold resets
      // internals
      this._iv = null;
      this._showing = false;
      this._acked   = false;
      this._snoozeUntil = 0;
      this._lastSecs = null;

      const root = this.attachShadow({ mode: 'open' });
      root.innerHTML = `
        <style>
          .banner{
            position: fixed; top: 64px; left: 50%; transform: translateX(-50%);
            max-width: 80%; background:#ffe7ba; color:#402;
            border:2px solid #eed150; border-radius:8px;
            box-shadow:0 6px 18px rgba(0,0,0,.1);
            font:600 14px/1.2 system-ui,-apple-system,"Segoe UI",Roboto,Arial;
            padding:8px 12px; display:none; z-index:10000; gap:10px; align-items:center;
          }
          .banner.show{ display:inline-flex; animation: slide .12s ease-out; }
          @keyframes slide{ from{opacity:.85; transform:translate(-50%,-6px)} to{opacity:1; transform:translate(-50%,0)} }
          .banner button{
            margin-left:8px; background:#fff; color:#402; border:1px solid #ddd;
            padding:6px 10px; border-radius:8px; font-weight:600; cursor:pointer;
          }
          .elapsed{ font-weight:700; }
        </style>
        <div class="banner" role="alert" aria-live="assertive" aria-atomic="true">
          🔔 Call has been on hold too long. <span class="elapsed">(00:00)</span>
          <button type="button">Ack</button>
        </div>
      `;
      this.$banner  = root.querySelector('.banner');
      this.$elapsed = root.querySelector('.elapsed');
      root.querySelector('button').addEventListener('click', () => this._ack());
    }

    connectedCallback(){
      console.log('[WXCC] hold-banner connected');
      this._applyConfig();
      this._iv = setInterval(() => this._tick(), 750);
    }
    disconnectedCallback(){ if (this._iv) clearInterval(this._iv); }
    attributeChangedCallback(n){ if (n==='thresholdms'||n==='snoozems') this._applyConfig(); }

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

    // ---- deep/shadow-aware search with hold-only targeting ----
    _deepFindHoldTimer() {
      const stack = [document], roots = [];
      while (stack.length) {
        const r = stack.pop(); roots.push(r);
        const nodes = r.querySelectorAll ? r.querySelectorAll('*') : [];
        for (const el of nodes) if (el.shadowRoot && el.shadowRoot.mode === 'open') stack.push(el.shadowRoot);
      }

      const cands = [];
      for (const r of roots) {
        const holdBadges = r.querySelectorAll
          ? r.querySelectorAll('md-badge[color="hold"], md-badge[arialabel*="Call on Hold" i]')
          : [];
        for (const badge of holdBadges) {
          const t = badge.querySelector && badge.querySelector('time[role="timer"]');
          if (t) {
            const lbl = t.querySelector('.timer-label')?.textContent?.trim() || '';
            const hasHold = /call\s+on\s+hold/i.test(lbl);
            cands.push({ t, lbl, score: 3 + (hasHold ? 2 : 0) }); // prefer badge+label
          }
        }
        const ts = r.querySelectorAll ? r.querySelectorAll('time[role="timer"]') : [];
        for (const t of ts) {
          const lbl = t.querySelector('.timer-label')?.textContent?.trim() || '';
          if (/call\s+on\s+hold/i.test(lbl)) cands.push({ t, lbl, score: 4 });
          else {
            const near = (t.parentElement?.textContent || '').includes('Call on Hold');
            if (near) cands.push({ t, lbl, score: 2 });
          }
        }
      }
      if (!cands.length) return null;
      cands.sort((a,b)=> a.score===b.score ? -1 : b.score - a.score);
      return cands[0];
    }

    _tick(){
      const hit = this._deepFindHoldTimer();

      // not on hold → reset & hide
      if (!hit) { this._resetAndHide(); return; }

      const el = hit.t;
      const raw = el.getAttribute('datetime') || el.dateTime || '';
      let secs = null;
      if (raw) {
        const parts = raw.split(':').map(n=>parseInt(n,10));
        if (parts.length===2) secs = parts[0]*60 + parts[1];
        else if (parts.length===3) secs = parts[0]*3600 + parts[1]*60 + parts[2];
      }

      if (secs == null || Number.isNaN(secs)) { this.hide(); return; }

      // detect reset (e.g., hold released & re-applied)
      if (this._lastSecs != null && secs < this._lastSecs) {
        this._acked = false;
        this._snoozeUntil = 0;
      }
      this._lastSecs = secs;

      // update banner text
      const mm = Math.floor(secs / 60);
      const ss = String(secs % 60).padStart(2, '0');
      this.$elapsed.textContent = `(${mm}:${ss})`;

      const over = (secs * 1000) >= this._thresholdMs;
      const snoozed = this._snoozeUntil && Date.now() < this._snoozeUntil;

      if (!this._showing && over && !this._acked && !snoozed) this.show();
      if (this._showing && (!over || this._acked || snoozed)) this.hide();
    }

    _resetAndHide(){
      this._lastSecs = null;
      this._acked = false;
      this._snoozeUntil = 0;
      this.hide();
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
