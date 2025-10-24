// callback-defaults.js (v4) — support for agentx-wc-advanced-combobox queue control
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
      console.log('[WXCC] callback-defaults connected (v4)');
      this._iv = setInterval(() => this._apply(), 800);
    }
    disconnectedCallback() { if (this._iv) clearInterval(this._iv); }

    // --- helpers ---
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
      const all = [];
      for (const r of this._collectOpenRoots()) {
        try {
          const list = r.querySelectorAll ? r.querySelectorAll(selector) : [];
          all.push(...list);
        } catch (_) {}
      }
      return all;
    }

    _hasText(el, txt) { return (el?.textContent || '').toLowerCase().includes((txt||'').toLowerCase()); }

    // --- Assign to Myself ---
    _setAssignToMyself() {
      const group = this._qDeep('md-radiogroup#assign-to-radio-group') || this._qDeep('md-radiogroup[aria-label*="assign" i]');
      if (!group) return false;
      const selfOpt = group.querySelector('md-radio[value="SELF"]') ||
                      Array.from(group.querySelectorAll('md-radio')).find(r => this._hasText(r, 'Myself'));
      if (!selfOpt) return false;

      try {
        if (!selfOpt.hasAttribute('checked')) selfOpt.setAttribute('checked', 'true');
        selfOpt.setAttribute('aria-checked', 'true');
        const input = selfOpt.shadowRoot?.querySelector('input[type=radio]');
        if (input && !input.checked) {
          input.checked = true;
          input.dispatchEvent(new Event('change', { bubbles: true }));
          input.dispatchEvent(new Event('input',  { bubbles: true }));
        } else {
          selfOpt.click();
        }
      } catch (e) { console.warn('AssignToMyself error', e); }

      if (this._hideAssign) group.style.display = 'none';
      console.log('[WXCC] callback-defaults: Assign to -> SELF');
      return true;
    }

    // --- Queue field (agentx-wc-advanced-combobox) ---
    _setQueueByLabel(label) {
      const combo = this._qDeep('agentx-wc-advanced-combobox');
      if (!combo) { console.log('[WXCC] callback-defaults: queue combobox not found'); return false; }

      try {
        // Try using Web Component API
        if ('selecteditemname' in combo) {
          if (combo.selecteditemname !== label) {
            combo.selecteditemname = label;
            combo.setAttribute('selecteditemname', label);
            combo.dispatchEvent(new Event('change', { bubbles: true }));
            console.log('[WXCC] callback-defaults: Queue set via selecteditemname');
          }
        } else if ('value' in combo) {
          combo.value = label;
          combo.setAttribute('value', label);
          combo.dispatchEvent(new Event('change', { bubbles: true }));
          console.log('[WXCC] callback-defaults: Queue set via value');
        } else {
          console.log('[WXCC] callback-defaults: combobox has no settable property');
        }

        if (this._hideQueue) combo.style.display = 'none';
        console.log('[WXCC] callback-defaults: Queue ->', label);
        return true;
      } catch (err) {
        console.error('[WXCC] callback-defaults: error setting queue', err);
        return false;
      }
    }

    // --- Main apply loop ---
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
