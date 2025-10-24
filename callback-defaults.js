// callback-defaults.js (v5)
(function () {
  class AgentxCallbackDefaults extends HTMLElement {
    static get observedAttributes() { return ['queuename','hidequeue','hideassign']; }

    constructor() {
      super();
      this._iv = null;
      this._hideQueue  = (this.getAttribute('hidequeue')  ?? 'true') !== 'false';
      this._hideAssign = (this.getAttribute('hideassign') ?? 'true') !== 'false';
      // initial fallback
      this._queueName = this.getAttribute('queuename')
        || (window.__agentx_props?.queueName)
        || 'YOUR_QUEUE_NAME_HERE';
    }

    // WxCC sets properties as real JS props; pick them up here
    connectedCallback() {
      // If the layout passed "properties": { queueName: "…" }
      if (this.queueName && typeof this.queueName === 'string') {
        this._queueName = this.queueName;
      }
      console.log('[WXCC] callback-defaults connected (v5), queueName =', this._queueName);
      this._iv = setInterval(() => this._apply(), 700);
    }
    disconnectedCallback(){ if (this._iv) clearInterval(this._iv); }
    attributeChangedCallback(n, _o, v){
      if (n === 'queuename' && v) this._queueName = v;
      if (n === 'hidequeue')  this._hideQueue  = (v ?? 'true') !== 'false';
      if (n === 'hideassign') this._hideAssign = (v ?? 'true') !== 'false';
    }

    // ---------- utils ----------
    _hasText(el, txt){ return (el?.textContent || '').toLowerCase().includes((txt||'').toLowerCase()); }
    _collectOpenRoots(){
      const stack=[document], out=[];
      while(stack.length){
        const r=stack.pop(); out.push(r);
        const nodes=r.querySelectorAll ? r.querySelectorAll('*') : [];
        for(const el of nodes){ if(el.shadowRoot && el.shadowRoot.mode==='open') stack.push(el.shadowRoot); }
      }
      return out;
    }
    _qDeep(sel){
      for(const r of this._collectOpenRoots()){
        try{ const el = r.querySelector ? r.querySelector(sel) : null; if(el) return el; }catch{}
      }
      return null;
    }
    _qAllDeep(sel){
      const a=[]; for(const r of this._collectOpenRoots()){ try{ a.push(...(r.querySelectorAll? r.querySelectorAll(sel):[])); }catch{} }
      return a;
    }

    // ---------- assign to = myself ----------
    _setAssignToMyself(){
      const group = this._qDeep('md-radiogroup#assign-to-radio-group') || this._qDeep('md-radiogroup[aria-label*="assign" i]');
      if(!group) return false;
      const selfOpt = group.querySelector('md-radio[value="SELF"]')
        || Array.from(group.querySelectorAll('md-radio')).find(r => this._hasText(r,'Myself'));
      if(!selfOpt) return false;

      try{
        if(!selfOpt.hasAttribute('checked')) selfOpt.setAttribute('checked','true');
        selfOpt.setAttribute('aria-checked','true');
        const input = selfOpt.shadowRoot?.querySelector('input[type=radio]');
        if(input && !input.checked){
          input.checked = true;
          input.dispatchEvent(new Event('input',{bubbles:true}));
          input.dispatchEvent(new Event('change',{bubbles:true}));
        } else {
          selfOpt.click();
        }
      }catch(e){ console.warn('AssignToMyself error', e); }
      if(this._hideAssign) group.style.display='none';
      console.log('[WXCC] callback-defaults: Assign to -> SELF');
      return true;
    }

    // ---------- queue = label ----------
    _setQueueByLabel(label){
      // your tenant uses agentx-wc-advanced-combobox inside agentx-wc-callback-queue-list
      const combo = this._qDeep('agentx-wc-callback-queue-list agentx-wc-advanced-combobox')
                 || this._qDeep('agentx-wc-advanced-combobox');
      if(!combo){ console.log('[WXCC] callback-defaults: queue combobox not found'); return false; }

      let ok = false;

      // 1) Set attribute (many custom elements react to attribute changes)
      try{
        const cur = combo.getAttribute('selecteditemname');
        if(cur !== label){
          combo.setAttribute('selecteditemname', label);
          combo.dispatchEvent(new Event('change',{bubbles:true}));
        }
        ok = true;
        console.log('[WXCC] callback-defaults: Queue set via attribute selecteditemname');
      }catch(_){}

      // 2) If property exists, set it too (covers other builds)
      try{
        if ('selecteditemname' in combo) {
          if (combo.selecteditemname !== label) {
            combo.selecteditemname = label;
            combo.dispatchEvent(new Event('change',{bubbles:true}));
            console.log('[WXCC] callback-defaults: Queue set via property selecteditemname');
          }
          ok = true;
        }
      }catch(_){}

      // 3) Fallback: open list and click matching option by text
      if(!ok){
        try{
          // try clicking inside its shadow input/button to open list
          const inputLike = combo.shadowRoot?.querySelector('input,button,[role="combobox"]') || combo;
          inputLike.click();
          const items = this._qAllDeep('md-option, md-list-item, md-menu-item, li, [role="option"], [data-option]');
          const hit = items.find(i => this._hasText(i, label));
          if(hit){ hit.click(); ok = true; console.log('[WXCC] callback-defaults: Queue set via click on option'); }
        }catch(_){}
      }

      if(ok && this._hideQueue) combo.style.display='none';
      if(ok) console.log('[WXCC] callback-defaults: Queue ->', label);
      return ok;
    }

    _apply(){
      const qn = this.queueName && typeof this.queueName==='string' ? this.queueName : this._queueName;
      const assignOk = this._setAssignToMyself();
      const queueOk  = this._setQueueByLabel(qn);
      if(assignOk && queueOk){
        console.log('[WXCC] callback-defaults: applied (SELF +', qn, ')');
        clearInterval(this._iv); this._iv=null;
      }
    }
  }
  customElements.define('agentx-callback-defaults', AgentxCallbackDefaults);
})();
