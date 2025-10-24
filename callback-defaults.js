    // === Schedule Callback defaults ===
    (function () {
      const DEFAULT_QUEUE = 'Outdial_Q_EnterpriseSupport';  // <-- change me

      // Utility: find text inside element (trim + case insensitive)
      const hasText = (el, txt) => (el?.textContent || '').toLowerCase().includes((txt || '').toLowerCase());

      // Try to set 'Assign to' = Myself and hide the radio group
      function setAssignToMyself() {
        const group = document.querySelector('md-radiogroup#assign-to-radio-group');
        if (!group) return false;
        const selfOpt = group.querySelector('md-radio[value=\"SELF\"]');
        if (selfOpt) {
          // mark checked for UI + accessibility + framework bindings
          selfOpt.setAttribute('checked', 'true');
          selfOpt.setAttribute('aria-checked', 'true');
          const input = selfOpt.shadowRoot?.querySelector('input[type=radio]');
          if (input) { input.checked = true; input.dispatchEvent(new Event('change', { bubbles: true })); }
        }
        // hide the whole chooser (remove this line if you prefer it visible but preselected)
        group.style.display = 'none';
        return true;
      }

      // Try several queue selector shapes (md-combobox / md-select). Pick by visible label text.
      function setQueueByLabel(label) {
        // 1) Direct combobox/select with aria-label/name/id containing 'queue'
        const selectorCandidates = [
          'md-combobox[aria-label*=\"queue\" i]',
          'md-select[aria-label*=\"queue\" i]',
          'md-combobox[name=\"queue\"]',
          'md-select[name=\"queue\"]',
          '#queue md-combobox',
          '#queue md-select'
        ];
        let box = null;
        for (const sel of selectorCandidates) {
          box = document.querySelector(sel);
          if (box) break;
        }
        // 2) If still not found, look for any field grouping that has a label/span text 'Queue'
        if (!box) {
          const groups = Array.from(document.querySelectorAll('div, md-input, md-form, md-field, section'));
          const grp = groups.find(g => hasText(g, 'Queue') && (g.querySelector('md-combobox, md-select')));
          box = grp?.querySelector('md-combobox, md-select') || null;
        }
        if (!box) return false;

        // Prefer setting value directly if supported
        const tryDirect = () => {
          try {
            if ('value' in box) {
              box.value = label;
              box.setAttribute('value', label);
              box.dispatchEvent(new Event('input', { bubbles: true }));
              box.dispatchEvent(new Event('change', { bubbles: true }));
              return true;
            }
          } catch(e) {}
          return false;
        };

        // Otherwise, open the dropdown and click the matching option/item
        const tryOpenAndClick = async () => {
          try {
            // open
            box.click();
            // look both in light DOM and any open overlays/popovers
            const pick = () => {
              const items = Array.from(document.querySelectorAll(
                'md-option, md-list-item, md-menu-item, li, [role=\"option\"], [data-option]'
              ));
              const hit = items.find(i => hasText(i, label));
              if (hit) { hit.click(); return true; }
              return false;
            };
            // attempt now and shortly after (overlay animations)
            if (pick()) return true;
            return await new Promise(resolve => setTimeout(() => resolve(pick()), 120));
          } catch(e) { return false; }
        };

        const ok = tryDirect() || false;
        if (ok) return true;
        return tryOpenAndClick();
      }

      // Optionally hide the queue control after selection (set to false if you want it visible)
      const HIDE_QUEUE_CONTROL = true;
      function hideQueueControl() {
        const el = document.querySelector('md-combobox[aria-label*=\"queue\" i], md-select[aria-label*=\"queue\" i]');
        if (el && HIDE_QUEUE_CONTROL) el.style.display = 'none';
      }

      // Observe and apply when panel is rendered
      const obs = new MutationObserver(() => {
        // Heuristic: schedule callback panel typically contains a label like 'Assign to' and date/time fields
        const assignDone = setAssignToMyself();
        const queueDone  = setQueueByLabel(DEFAULT_QUEUE);
        if (assignDone && queueDone) {
          hideQueueControl();
          // If both are done, stop observing to save cycles
          obs.disconnect();
        }
      });

      obs.observe(document.body, { childList: true, subtree: true });
    })();
