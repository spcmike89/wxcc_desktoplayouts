// hold-debug.js — find ONLY the "Call on Hold" timer
(function () {
  class AgentxHoldDebug extends HTMLElement {
    constructor() {
      super();
      this._iv = null;
      const root = this.attachShadow({ mode: 'open' });
      root.innerHTML = `
        <style>
          .box{position:fixed;top:8px;right:16px;background:#f6f7fb;border:1px solid #dfe3f0;color:#222;border-radius:8px;
                padding:8px 12px;font:500 12px/1.2 system-ui,-apple-system,"Segoe UI",Roboto,Arial;z-index:10000;box-shadow:0 2px 8px rgba(0,0,0,.06)}
          .row{display:flex;gap:8px;align-items:center;margin:2px 0}.k{color:#667085;min-width:170px}.v{font-weight:600}
          .ok{color:#0f7a3b}.muted{color:#98a2b3}.bad{color:#b00020}
        </style>
        <div class="box" role="status" aria-live="polite">
          <div class="row"><span class="k">Hold timer element:</span> <span class="v" id="found">NO</span></div>
          <div class="row"><span class="k">Hold (dateTime):</span> <span class="v" id="dt">—</span></div>
          <div class="row"><span class="k">Seconds (parsed):</span> <span class="v" id="sec">—</span></div>
          <div class="row"><span class="k">Label seen:</span> <span class="v" id="lbl">—</span></div>
        </div>
      `;
      this.$found = root.getElementById('found');
      this.$dt    = root.getElementById('dt');
      this.$sec   = root.getElementById('sec');
      this.$lbl   = root.getElementById('lbl');
    }

    connectedCallback(){ console.log('[WXCC] hold-debug (hold-only) connected'); this._tick(); this._iv=setInterval(()=>this._tick(),750); }
    disconnectedCallback(){ if(this._iv) clearInterval(this._iv); }

    // Deep search through ALL **open** shadow roots
    _deepFindHoldTimer() {
      const stack = [document];
      while (stack.length) {
        const root = stack.pop();
        // look at all time[role=timer] candidates at this depth
        const candidates = root.querySelectorAll ? root.querySelectorAll('time[role="timer"]') : [];
        for (const t of candidates) {
          // require a label span that mentions Call on Hold
          const labelEl = t.querySelector('.timer-label');
          const label   = (labelEl && labelEl.textContent) ? labelEl.textContent.trim() : '';
          if (/call\s+on\s+hold/i.test(label)) {
            return { el: t, label };
          }
        }
        // descend into open shadow roots
        const nodes = root.querySelectorAll ? root.querySelectorAll('*') : [];
        for (const el of nodes) {
          if (el.shadowRoot && el.shadowRoot.mode === 'open') stack.push(el.shadowRoot);
        }
      }
      return null;
    }

    _tick() {
      const found = this._deepFindHoldTimer();
      if (!found) {
        this.$found.textContent='NO'; this.$found.className='v bad';
        this.$dt.textContent='—'; this.$dt.className='v muted';
        this.$sec.textContent='—'; this.$sec.className='v muted';
        this.$lbl.textContent='—'; this.$lbl.className='v muted';
        return;
      }
      const { el, label } = found;
      this.$found.textContent='YES'; this.$found.className='v ok';
      this.$lbl.textContent=label;  this.$lbl.className='v ok';

      const raw = el.getAttribute('datetime') || el.dateTime || '';
      this.$dt.textContent = raw || '—';
      this.$dt.className = raw ? 'v ok' : 'v muted';

      let secs = null;
      if (raw) {
        const parts = raw.split(':').map(n=>parseInt(n,10));
        if (parts.length===2) secs = parts[0]*60+parts[1];
        else if (parts.length===3) secs = parts[0]*3600 + parts[1]*60 + parts[2];
      }
      if (secs==null || Number.isNaN(secs)) {
        this.$sec.textContent='—'; this.$sec.className='v muted';
      } else {
        this.$sec.textContent=String(secs); this.$sec.className='v ok';
      }
    }
  }
  customElements.define('agentx-hold-debug', AgentxHoldDebug);
})();
