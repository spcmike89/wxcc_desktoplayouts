// callback-defaults.js (v6) — makes a real selection so selecteditemid is set
(function () {
  class AgentxCallbackDefaults extends HTMLElement {
    static get observedAttributes() { return ['queuename','hidequeue','hideassign']; }
    constructor(){
      super();
      this._iv=null;
      this._hideQueue  = (this.getAttribute('hidequeue')  ?? 'true') !== 'false';
      this._hideAssign = (this.getAttribute('hideassign') ?? 'true') !== 'false';
      this._queueName  = this.getAttribute('queuename') || (window.__agentx_props?.queueName) || 'YOUR_QUEUE_NAME_HERE';
    }
    connectedCallback(){
      if (this.queueName && typeof this.queueName === 'string') this._queueName = this.queueName;
      console.log('[WXCC] callback-defaults connected (v6), queueName =', this._queueName);
      this._iv = setInterval(() => this._apply(), 700);
    }
    disconnectedCallback(){ if(this._iv) clearInterval(this._iv); }

    // ---- shadow utils
    _collectOpenRoots(){ const s=[document], r=[]; while(s.length){ const n=s.pop(); r.push(n); const els=n.querySelectorAll? n.querySelectorAll('*'):[]; for(const e of els){ if(e.shadowRoot && e.shadowRoot.mode==='open') s.push(e.shadowRoot);} } return r; }
    _qDeep(sel){ for(const r of this._collectOpenRoots()){ try{ const el=r.querySelector? r.querySelector(sel):null; if(el) return el; }catch{} } return null; }
    _qAllDeep(sel){ const out=[]; for(const r of this._collectOpenRoots()){ try{ out.push(...(r.querySelectorAll? r.querySelectorAll(sel):[])); }catch{} } return out; }
    _hasText(el, txt){ return (el?.textContent||'').toLowerCase().includes((txt||'').toLowerCase()); }

    // ---- Assign to = Myself
    _setAssignToMyself(){
      const group = this._qDeep('md-radiogroup#assign-to-radio-group') || this._qDeep('md-radiogroup[aria-label*="assign" i]');
      if(!group) return false;
      const self = group.querySelector('md-radio[value="SELF"]') || Array.from(group.querySelectorAll('md-radio')).find(r=>this._hasText(r,'Myself'));
      if(!self) return false;
      try{
        if(!self.hasAttribute('checked')) self.setAttribute('checked','true');
        self.setAttribute('aria-checked','true');
        const input = self.shadowRoot?.querySelector('input[type=radio]');
        if(input && !input.checked){
          input.checked = true;
          input.dispatchEvent(new Event('input',{bubbles:true}));
          input.dispatchEvent(new Event('change',{bubbles:true}));
        } else { self.click(); }
      }catch{}
      if(this._hideAssign) group.style.display='none';
      console.log('[WXCC] callback-defaults: Assign to -> SELF');
      return true;
    }

    // ---- Queue = label (perform real selection)
    async _setQueueByLabel(label){
      const combo = this._qDeep('agentx-wc-callback-queue-list agentx-wc-advanced-combobox') || this._qDeep('agentx-wc-advanced-combobox');
      if(!combo){ console.log('[WXCC] callback-defaults: queue combobox not found'); return false; }

      // If already selected, stop.
      const curName = combo.getAttribute('selecteditemname');
      if (curName === label && combo.getAttribute('selecteditemid')) {
        if (this._hideQueue) combo.style.display = 'none';
        console.log('[WXCC] callback-defaults: Queue already selected:', label);
        return true;
      }

      // Open the list (click internal trigger if present)
      const trigger = combo.shadowRoot?.querySelector('button,[role="combobox"],input') || combo;
      trigger.click();
      await new Promise(r=>setTimeout(r,120));

      // Find and click the option by visible text, anywhere in open roots
      const items = this._qAllDeep('[role="option"], md-option, md-list-item, md-menu-item, li, [data-option]');
      const hit = items.find(i => this._hasText(i, label));
      if (hit) {
        hit.click();
        await new Promise(r=>setTimeout(r,60));
      } else {
        // last resort: set both attributes (name + id if we can see a data-id)
        combo.setAttribute('selecteditemname', label);
        const withId = items.find(i => this._hasText(i, label) && i.getAttribute('data-id'));
        if (withId) combo.setAttribute('selecteditemid', withId.getAttribute('data-id'));
        combo.dispatchEvent(new Event('change', { bubbles:true }));
      }

      // Verify id is now present
      const ok = !!combo.getAttribute('selecteditemid');
      if (ok) {
        if (this._hideQueue) combo.style.display='none';
        console.log('[WXCC] callback-defaults: Queue selected ->', combo.getAttribute('selecteditemname'), combo.getAttribute('selecteditemid'));
      } else {
        console.log('[WXCC] callback-defaults: WARNING — name set but id still missing');
      }
      return ok;
    }

    async _apply(){
      const a = this._setAssignToMyself();
      const q = await this._setQueueByLabel(this.queueName || this._queueName);
      if (a && q) { console.log('[WXCC] callback-defaults: applied (SELF +', this.queueName || this._queueName, ')'); clearInterval(this._iv); this._iv=null; }
    }
  }
  customElements.define('agentx-callback-defaults', AgentxCallbackDefaults);
})();
