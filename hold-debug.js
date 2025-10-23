// hold-debug.js — reads the <time.agent-current-status-timer> dateTime attribute
(function () {
  class AgentxHoldDebug extends HTMLElement {
    constructor() {
      super();
      this._iv = null;

      const root = this.attachShadow({ mode: 'open' });
      root.innerHTML = `
        <style>
          .box{
            position: fixed; top: 8px; right: 16px;
            background:#f6f7fb; border:1px solid #dfe3f0; color:#222;
            border-radius: 8px; padding:8px 12px;
            font: 500 12px/1.2 system-ui, -apple-system, "Segoe UI", Roboto, Arial;
            z-index: 10000; box-shadow:0 2px 8px rgba(0,0,0,.06);
          }
          .row{ display:flex; gap:8px; align-items:center; margin:2px 0; }
          .k{ color:#667085; min-width:140px; }
          .v{ font-weight:600; }
          .ok{ color:#0f7a3b; }
          .muted{ color:#98a2b3; }
          .bad{ color:#b00020; }
        </style>
        <div class="box" role="status" aria-live="polite">
          <div class="row"><span class="k">Timer element found:</span> <span class="v" id="found">NO</span></div>
          <div class="row"><span class="k">Hold (from dateTime):</span> <span class="v" id="dt">—</span></div>
          <div class="row"><span class="k">Seconds (parsed):</span> <span class="v" id="sec">—</span></div>
        </div>
      `;
      this.$found = root.getElementById('found');
      this.$dt = root.getElementById('dt');
      this.$sec = root.getElementById('sec');
    }

    connectedCallback() {
      console.log('[WXCC] hold-debug (dateTime) connected');
      this._tick();
      this._iv = setInterval(() => this._tick(), 500);
    }
    disconnectedCallback() {
      if (this._iv) clearInterval(this._iv);
    }

    _findTimerEl() {
      // Be specific to avoid false matches
      return document.querySelector('time.agent-current-status-timer[role="timer"]');
    }

    _tick() {
      const el = this._findTimerEl();
      if (!el) {
        this.$found.textContent = 'NO';
        this.$found.className = 'v bad';
        this.$dt.textContent = '—';
        this.$dt.className = 'v muted';
        this.$sec.textContent = '—';
        this.$sec.className = 'v muted';
        return;
      }

      this.$found.textContent = 'YES';
      this.$found.className = 'v ok';

      // dateTime is typically "MM:SS" while on hold; sometimes "HH:MM:SS"
      const raw = el.dateTime || el.getAttribute('datetime') || '';
      this.$dt.textContent = raw || '—';
      this.$dt.className = raw ? 'v ok' : 'v muted';

      let secs = null;
      if (raw) {
        const parts = raw.split(':').map(n => parseInt(n, 10));
        if (parts.length === 2) secs = parts[0] * 60 + parts[1];
        else if (parts.length === 3) secs = parts[0] * 3600 + parts[1] * 60 + parts[2];
      }
      if (secs == null || Number.isNaN(secs)) {
        this.$sec.textContent = '—';
        this.$sec.className = 'v muted';
      } else {
        this.$sec.textContent = String(secs);
        this.$sec.className = 'v ok';
      }
    }
  }

  customElements.define('agentx-hold-debug', AgentxHoldDebug);
})();
