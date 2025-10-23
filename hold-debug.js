// hold-debug.js — target ONLY the "Call on Hold" timer
(function () {
  class AgentxHoldDebug extends HTMLElement {
    constructor() {
      super();
      this._iv = null;
      const root = this.attachShadow({ mode: "open" });
      root.innerHTML = `
        <style>
          .box{position:fixed;top:8px;right:16px;background:#f6f7fb;border:1px solid #dfe3f0;color:#222;
               border-radius:8px;padding:8px 12px;font:500 12px/1.2 system-ui,-apple-system,"Segoe UI",Roboto,Arial;
               z-index:10000;box-shadow:0 2px 8px rgba(0,0,0,.06)}
          .row{display:flex;gap:8px;align-items:center;margin:2px 0}.k{color:#667085;min-width:170px}.v{font-weight:600}
          .ok{color:#0f7a3b}.muted{color:#98a2b3}.bad{color:#b00020}
        </style>
        <div class="box" role="status" aria-live="polite">
          <div class="row"><span class="k">Hold timer element:</span><span class="v" id="found">NO</span></div>
          <div class="row"><span class="k">Hold (dateTime):</span><span class="v" id="dt">—</span></div>
          <div class="row"><span class="k">Seconds (parsed):</span><span class="v" id="sec">—</span></div>
          <div class="row"><span class="k">Label seen:</span><span class="v" id="lbl">—</span></div>
          <div class="row"><span class="k">Heuristic:</span><span class="v" id="why">—</span></div>
        </div>`;
      this.$found = root.getElementById("found");
      this.$dt    = root.getElementById("dt");
      this.$sec   = root.getElementById("sec");
      this.$lbl   = root.getElementById("lbl");
      this.$why   = root.getElementById("why");
    }

    connectedCallback(){ console.log("[WXCC] hold-debug (hold-badge) connected"); this._tick(); this._iv=setInterval(()=>this._tick(), 750); }
    disconnectedCallback(){ if(this._iv) clearInterval(this._iv); }

    // ---- deep/shadow-aware search with scoring ----
    _deepFindHoldTimer() {
      // helper to collect open shadow roots
      const stack = [document];
      const roots = [];
      while (stack.length) {
        const r = stack.pop();
        roots.push(r);
        const nodes = r.querySelectorAll ? r.querySelectorAll("*") : [];
        for (const el of nodes) {
          if (el.shadowRoot && el.shadowRoot.mode === "open") stack.push(el.shadowRoot);
        }
      }

      // gather candidates with a score
      const cands = [];
      for (const r of roots) {
        // prefer timers inside a "hold" badge (color=hold or arialabel contains "Call on Hold")
        const holdBadges = r.querySelectorAll
          ? r.querySelectorAll('md-badge[color="hold"], md-badge[arialabel*="Call on Hold" i]')
          : [];

        for (const badge of holdBadges) {
          const t = badge.querySelector && badge.querySelector('time[role="timer"]');
          if (t) {
            const lblEl = t.querySelector(".timer-label");
            const lbl   = lblEl?.textContent?.trim() || "";
            const hasHoldInLabel = /call\s+on\s+hold/i.test(lbl);
            const score = 3 + (hasHoldInLabel ? 2 : 0); // 5 if label also confirms hold
            cands.push({ t, lbl, score, why: hasHoldInLabel ? "badge+label" : "badge" });
          }
        }

        // also look at any timer with a .timer-label mentioning "Call on Hold"
        const ts = r.querySelectorAll ? r.querySelectorAll('time[role="timer"]') : [];
        for (const t of ts) {
          const lblEl = t.querySelector(".timer-label");
          const lbl   = lblEl?.textContent?.trim() || "";
          if (/call\s+on\s+hold/i.test(lbl)) {
            cands.push({ t, lbl, score: 4, why: "label" });
          } else {
            // last resort: sibling text "Call on Hold" near this timer
            const near = (t.parentElement?.textContent || "").includes("Call on Hold");
            if (near) cands.push({ t, lbl, score: 2, why: "near-text" });
          }
        }
      }

      if (!cands.length) return null;
      // choose highest score; if tie, pick the last (often the right-side 'hold' timer)
      cands.sort((a,b)=> a.score===b.score ? -1 : b.score - a.score);
      return cands[0];
    }

    _tick() {
      const hit = this._deepFindHoldTimer();
      if (!hit) {
        this.$found.textContent="NO"; this.$found.className="v bad";
        this.$dt.textContent="—"; this.$dt.className="v muted";
        this.$sec.textContent="—"; this.$sec.className="v muted";
        this.$lbl.textContent="—"; this.$lbl.className="v muted";
        this.$why.textContent="—"; this.$why.className="v muted";
        return;
      }

      const { t: el, lbl, why } = hit;
      this.$found.textContent="YES"; this.$found.className="v ok";
      this.$lbl.textContent = lbl || "—"; this.$lbl.className = lbl ? "v ok" : "v muted";
      this.$why.textContent = why;

      const raw = el.getAttribute("datetime") || el.dateTime || "";
      this.$dt.textContent = raw || "—";
      this.$dt.className   = raw ? "v ok" : "v muted";

      let secs = null;
      if (raw) {
        const parts = raw.split(":").map(n=>parseInt(n,10));
        if (parts.length===2) secs = parts[0]*60 + parts[1];
        else if (parts.length===3) secs = parts[0]*3600 + parts[1]*60 + parts[2];
      }
      if (secs==null || Number.isNaN(secs)) {
        this.$sec.textContent="—"; this.$sec.className="v muted";
      } else {
        this.$sec.textContent=String(secs); this.$sec.className="v ok";
      }
    }
  }

  customElements.define("agentx-hold-debug", AgentxHoldDebug);
})();
