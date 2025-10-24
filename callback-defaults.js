// callback-defaults.js (v3) — shadow-aware + robust logs for Schedule Callback
(function () {
  class AgentxCallbackDefaults extends HTMLElement {
    static get observedAttributes() { return ['queuename','hidequeue','hideassign']; }

    constructor() {
      super();
      this._queueName  = this.getAttribute('queuename') || (window.__agentx_props?.queueName) || 'YOUR_QUEUE_NAME_HERE';
      this._hideQueue  = (this.getAttribute('hidequeue')  ?? 'true') !== 'false';
      this._hideAssign = (this.getAttribute('hideassign') ?? 'true') !== 'false';
      this._iv = null;
    }

    connectedCallback() {
      console.log('[WXCC] callback-defaults connected (v3)');
      // Re-apply regularly; panels re-render and shadow DOM can appear late
      this._iv = setInterval(() => this._apply(), 700);
    }
    disconnectedCallback() { if (this._iv) clearInterval(this._iv); }
    attributeChangedCallback(name, _old, val) {
      if (name === 'queuename')  this._queueName  = val || this._queueName;
      if (name === 'hidequeue')  this._hideQueue  = (val ?? 'true') !== 'false';
      if (name === 'hideassign') this._hideAssign = (val ?? 'true') !== 'false';
    }

    // ---------- utils ----------
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

    _qDeep(selector) {
      for (const r of this._collectOpenRoots()) {
        try {
          const el = r.querySelector ? r.querySelector(selector) : null;
          if (el) return el;
        } catch (_) {}
      }
      return null;
    }
    _qAllDeep(selector) {
      const out = [];
      for (const r of this._collectOpenRoots()) {
        try {
          const list = r.querySelectorAll ? r.querySelectorAll(selector) : [];
          out.push(...list);
        } catch (_) {}
      }
      return out;
    }

    // ---------- assign to = myself ----------
    _setAssignToMyself() {
      const group = this._qDeep('md-radiogroup#assign-to-radio-group') || this._qDeep('md-radiogroup[aria-label*="assign" i]');
      if (!group) { console.log('[WXCC] callback-defaults: assign group not found yet'); return false; }

      // Try value="SELF"
      let selfRadio = group.querySelector('md-radio[value="SELF"]');

      // If value not present, try by visible label text containing "Myself"
      if (!selfRadio) {
        const radios = Array.from(group.querySelectorAll('md-radio'));
        selfRadio = radios.find(r => this._hasText(r, 'Myself')) || null;
      }

      if (!selfRadio) {
        console.log('[WXCC] callback-defaults: SELF radio not found; radios seen:',
          Array.from(group.querySelectorAll('md-radio')).map(r => ({
            value: r.getAttribute('value'),
            text: (r.textContent || '').trim()
          }))
        );
        return false;
      }

      // Mark checked on host + internal input and fire events
      try {
        if (!selfRadio.hasAttribute('checked')) selfRadio.setAttribute('checked', 'true');
        selfRadio.setAttribute('aria-checked', 'true');

        const input = selfRadio.shadowRoot?.querySelector('input[type=radio]');
        if (input) {
          if (!input.checked) input.checked = true;
          input.dispatchEvent(new Event('input',  { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
          // fallback: click the radio so framework changes state
          selfRadio.click();
        }
      } catch (e) { console.log('[WXCC] callback-defaults: error setting SELF:', e); }

      if (this._hideAssign) group.style.display = 'none';
      console.log('[WXCC] callback-defaults: Assign to -> SELF');
      return true;
    }

    // ---------- queue = label ----------
    _setQueueByLabel(label) {
      // Find a likely queue control
      let box = this._qDeep('md-combobox[aria-label*="queue" i]')
             || this._qDeep('md-select[aria-label*="queue" i]')
             || this._qDeep('md-combobox[name="queue"]')
             || this._qDeep('md-select[name="queue"]');

      if (!box) {
        // Fallback: any group that mentions "Queue" and has a combobox/select inside
        const groups = this._qAllDeep('div, md-input, md-form, md-field, section, form');
        const grp = groups.find(g => this._hasText(g, 'Queue') && g.querySelector('md-combobox, md-select'));
        box = grp?.querySelector('md-combobox, md-select') || null;
      }
      if (!box) { console.log('[WXCC] callback-defaults: queue control not found yet'); return false; }

      let ok = false;

      // 1) Try direct assignment
      try {
        if ('value' in box) {
          if (box.value !== label) {
            box.value = label;
            box.setAttribute('value', label);
            box.dispatchEvent(new Event('input',  { bubbles: true }));
            box.dispatchEvent(new Event('change', { bubbles: true }));
          }
          ok = true;
        }
      } catch (e) { /* swallow */ }

      // 2) Fallback: open & click
      if (!ok) {
        try {
          box.click();
          const items = this._qAllDeep('md-option, md-list-item, md-menu-item, li, [role="option"], [data-option]');
          const hit = items.find(i => this._hasText(i, label));
          if (hit) {
            hit.click();
            ok = true;
          } else {
            console.log('[WXCC] callback-defaults: queue option not found; options seen:',
              items.slice(0,15).map(i => (i.textContent||'').trim()).filter(Boolean));
          }
        } catch (e) { /* swallow */ }
      }

      if (ok) {
        if (this._hideQueue) box.style.display = 'none';
        console.log('[WXCC] callback-defaults: Queue ->', label);
      }
      return ok;
    }

    _apply() {
      const assignOk = this._setAssignToMyself();
      const queueOk  = this._setQueueByLabel(this._queueName);
      if (assignOk && queueOk) {
        console.log('[WXCC] callback-defaults: applied (SELF +', this._queueName, ')');
        clearInterval(this._iv);
        this._iv = null;
      }
    }
  }

  customElements.define('agentx-callback-defaults', AgentxCallbackDefaults);
})();
