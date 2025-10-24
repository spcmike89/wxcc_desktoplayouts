// callback-defaults.js (v2) — shadow-aware defaults for Schedule Callback
(function () {
  class AgentxCallbackDefaults extends HTMLElement {
    static get observedAttributes() { return ['queuename','hidequeue','hideassign']; }

    constructor() {
      super();
      // Read attributes OR properties injected by WxCC (window.__agentx_props)
      this._queueName = this.getAttribute('queuename')
        || (window.__agentx_props?.queueName)
        || 'YOUR_QUEUE_NAME_HERE';
      this._hideQueue  = (this.getAttribute('hidequeue')  ?? 'true') !== 'false';
      this._hideAssign = (this.getAttribute('hideassign') ?? 'true') !== 'false';
      this._iv = null;
    }

    connectedCallback() {
      console.log('[WXCC] callback-defaults connected');
      // tick every 500ms to handle shadow DOM & re-renders
      this._iv = setInterval(() => this._apply(), 500);
    }
    disconnectedCallback() { if (this._iv) clearInterval(this._iv); }
    attributeChangedCallback(name, _old, val) {
      if (name === 'queuename') this._queueName = val || this._queueName;
      if (name === 'hidequeue')  this._hideQueue  = (val ?? 'true') !== 'false';
      if (name === 'hideassign') this._hideAssign = (val ?? 'true') !== 'false';
    }

    // ---------- utilities ----------
    _hasText(el, txt) { return (el?.textContent || '').toLowerCase().includes((txt||'').toLowerCase()); }

    _collectOpenRoots() {
      const stack = [document], roots = [];
      while (stack.length) {
        const r = stack.pop(); roots.push(r);
        const nodes = r.querySelectorAll ? r.querySelectorAll('*') : [];
        for (const el of nodes) if (el.shadowRoot && el.shadowRoot.mode === 'open') stack.push(el.shadowRoot);
      }
      return roots;
    }

    _qAllDeep(selector) {
      const result = [];
      for (const r of this._collectOpenRoots()) {
        try {
          const list = r.querySelectorAll ? r.querySelectorAll(selector) : [];
          result.push(...list);
        } catch (_) {}
      }
      return result;
    }

    _qDeep(selector) {
      for (const r of this._collectOpenRoots()) {
        try {
          const el = r.querySelector ? r.querySelector(selector) : null;
          if (el) return el;
        } catch (_) {}
      }
      return null;
    }

    // ---------- apply defaults ----------
    _setAssignToMyself() {
      // Radio group can be inside shadow; search deeply
      const group = this._qDeep('md-radiogroup#assign-to-radio-group');
      if (!group) return false;

      const selfOpt = group.querySelector('md-radio[value="SELF"]');
      if (!selfOpt) return false;

      // mark checked for UI + a11y
      selfOpt.setAttribute('checked', 'true');
      selfOpt.setAttribute('aria-checked', 'true');

      // also try the internal <input type="radio"> inside shadow, if present
      try {
        const input = selfOpt.shadowRoot?.querySelector('input[type=radio]');
        if (input && !input.checked) {
          input.checked = true;
          input.dispatchEvent(new Event('change', { bubbles: true }));
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      } catch (_) {}

      if (this._hideAssign) group.style.display = 'none';
      return true;
    }

    _setQueueByLabel(label) {
      // Look for queue control in various shapes inside open roots
      let box = this._qDeep('md-combobox[aria-label*="queue" i]')
             || this._qDeep('md-select[aria-label*="queue" i]')
             || this._qDeep('md-combobox[name="queue"]')
             || this._qDeep('md-select[name="queue"]');

      if (!box) {
        // Fallback: find a group with visible text 'Queue' that contains a combobox/select
        const groups = this._qAllDeep('div, md-input, md-form, md-field, section');
        const grp = groups.find(g => this._hasText(g, 'Queue') && g.querySelector('md-combobox, md-select'));
        box = grp?.querySelector('md-combobox, md-select') || null;
      }
      if (!box) return false;

      // Try direct assignment
      let ok = false;
      try {
        if ('value' in box) {
          if (box.value !== label) {
            box.value = label;
            box.setAttribute('value', label);
            box.dispatchEvent(new Event('input', { bubbles: true }));
            box.dispatchEvent(new Event('change', { bubbles: true }));
          }
          ok = true;
        }
      } catch (_) {}

      // Fallback: open & click an option matching the label
      if (!ok) {
        try {
          // attempt to open
          box.click();
          const pick = () => {
            const items = this._qAllDeep('md-option, md-list-item, md-menu-item, li, [role="option"], [data-option]');
            const hit = items.find(i => this._hasText(i, label));
            if (hit) { hit.click(); return true; }
            return false;
          };
          ok = pick() || false;
        } catch (_) {}
      }

      if (ok && this._hideQueue) box.style.display = 'none';
      return ok;
    }

    _apply() {
      const a = this._setAssignToMyself();
      const q = this._setQueueByLabel(this._queueName);
      if (a && q) {
        console.log('[WXCC] callback-defaults applied:', { assign: 'SELF', queue: this._queueName });
        clearInterval(this._iv);
        this._iv = null;
      }
    }
  }

  customElements.define('agentx-callback-defaults', AgentxCallbackDefaults);
})();
