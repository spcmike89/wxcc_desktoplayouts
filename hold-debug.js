// hold-debug.js
(function () {
  class AgentxHoldDebug extends HTMLElement {
    static get observedAttributes() { return ['state']; }

    constructor() {
      super();
      this._interval = null;

      const root = this.attachShadow({ mode: 'open' });
      root.innerHTML = `
        <style>
          .box{
            position: fixed; top: 8px; right: 16px;
            background:#f6f7fb; border:1px solid #dfe3f0; color:#222;
            border-radius: 8px; padding:8px 12px; font: 500 12px/1.2 system-ui, -apple-system, "Segoe UI", Roboto, Arial;
            z-index: 10000; box-shadow:0 2px 8px rgba(0,0,0,.06);
          }
          .row{ display:flex; gap:8px; align-items:center; margin:2px 0; }
          .k{ color:#667085; min-width:120px; }
          .v{ font-weight:600; }
          .ok{ color:#0f7a3b; }
          .bad{ color:#b00020; }
          .muted{ color:#98a2b3; }
        </style>
        <div class="box" role="status" aria-live="polite">
          <div class="row"><span class="k">Store state:</span> <span class="v" id="st" class="muted">—</span></div>
          <div class="row"><span class="k">Hold secs (DOM):</span> <span class="v" id="dom" class="muted">—</span></div>
          <div class="row"><span class="k">Regex match:</span> <span class="v" id="rx" class="muted">—</span></div>
        </div>
      `;
      this.$st  = root.getElementById('st');
      this.$dom = root.getElementById('dom');
      this.$rx  = root.getElementById('rx');
    }

    connectedCallback() {
      console.log('[WXCC] hold-debug widget connected');
      this._tick(); // run immediately
      this._interval = setInterval(() => this._tick(), 1000);
    }
    disconnectedCallback() {
      if (this._interval) { clearInterval(this._interval); this._interval = null; }
    }
    attributeChangedCallback(name, _old, _new) {
      if (name === 'state') this._renderState(_new || '');
    }

    // public prop for layout -> properties
    set state(v){ this.setAttribute('state', v ?? ''); }
    get state(){ return this.getAttribute('state') || ''; }

    _renderState(s) {
      this.$st.textContent = s || '—';
      this.$st.className = 'v ' + (s ? 'ok' : 'muted');
    }

    // Try to read "Call on Hold 02:26" from page text (no dash required; case-insensitive)
    _parseHoldFromDOM() {
      const text = (document.body && document.body.innerText) || '';
      const m = text.match(/Call\s+on\s+Hold\s*(\d{1,2}):(\d{2})/i);
      if (!m) return { secs: null, matched: false };
      const min = parseInt(m[1], 10), sec = parseInt(m[2], 10);
      return { secs: (min * 60) + sec, matched: true };
    }

    _tick() {
      // update state (in case properties aren’t bound, leave as last value)
      this._renderState(this.state);

      const { secs, matched } = this._parseHoldFromDOM();
      if (secs == null) {
        this.$dom.textContent = '—';
        this.$dom.className = 'v muted';
      } else {
        const mm = Math.floor(secs / 60);
        const ss = String(secs % 60).padStart(2, '0');
        this.$dom.textContent = `${mm}:${ss}`;
        this.$dom.className = 'v ok';
      }
      this.$rx.textContent = matched ? 'YES' : 'NO';
      this.$rx.className = 'v ' + (matched ? 'ok' : 'bad');
    }
  }

  customElements.define('agentx-hold-debug', AgentxHoldDebug);
})();
