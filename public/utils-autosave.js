/**
 * Auto-Save utility for preserving form state across reloads/sessions.
 */
(function() {
  /**
   * Sets up auto-save bindings for a set of form input IDs.
   * @param {string} storageKey - Unique localStorage key
   * @param {Array<string>} fieldIds - List of input element IDs
   * @param {string|HTMLElement} [formContainer] - Optional form ID or element scope
   */
  window.setupAutoSave = function(storageKey, fieldIds, formContainer) {
    if (!storageKey || !fieldIds || !fieldIds.length) return;

    let container = document;
    if (formContainer) {
      if (typeof formContainer === 'string') {
        container = document.getElementById(formContainer) || document;
      } else {
        container = formContainer;
      }
    }

    // Function to load saved data
    const loadSavedData = () => {
      try {
        const savedData = localStorage.getItem(storageKey);
        if (!savedData) return;
        const parsed = JSON.parse(savedData);

        fieldIds.forEach(id => {
          const el = container.querySelector('#' + id) || document.getElementById(id);
          if (el && parsed[id] !== undefined) {
            if (el.type === 'checkbox') {
              el.checked = !!parsed[id];
            } else if (el.type === 'radio') {
              // Handles radio group
              const radio = container.querySelector(`input[name="${el.name}"][value="${parsed[id]}"]`);
              if (radio) radio.checked = true;
            } else {
              el.value = parsed[id];
            }
            // Trigger change event to fire any UI handlers
            el.dispatchEvent(new Event('change', { bubbles: true }));
          }
        });
      } catch (e) {
        console.error('Error loading auto-save data for key ' + storageKey, e);
      }
    };

    // Function to save current data
    const saveCurrentData = () => {
      try {
        const data = {};
        fieldIds.forEach(id => {
          const el = container.querySelector('#' + id) || document.getElementById(id);
          if (el) {
            if (el.type === 'checkbox') {
              data[id] = el.checked;
            } else if (el.type === 'radio') {
              const checkedRadio = container.querySelector(`input[name="${el.name}"]:checked`);
              data[id] = checkedRadio ? checkedRadio.value : '';
            } else {
              data[id] = el.value;
            }
          }
        });
        localStorage.setItem(storageKey, JSON.stringify(data));
      } catch (e) {
        console.error('Error saving auto-save data for key ' + storageKey, e);
      }
    };

    // Load existing data first
    loadSavedData();

    // Attach event listeners for change/input
    fieldIds.forEach(id => {
      const el = container.querySelector('#' + id) || document.getElementById(id);
      if (el) {
        el.addEventListener('input', saveCurrentData);
        el.addEventListener('change', saveCurrentData);
      }
    });

    // Also watch container for dynamic rendering changes (fallback)
    if (formContainer && typeof MutationObserver !== 'undefined') {
      const observer = new MutationObserver(() => {
        // Re-check elements and attach listeners if not already done
        fieldIds.forEach(id => {
          const el = container.querySelector('#' + id) || document.getElementById(id);
          if (el && !el._hasAutoSaveListener) {
            el._hasAutoSaveListener = true;
            // Load saved value for this element if available
            try {
              const savedData = localStorage.getItem(storageKey);
              if (savedData) {
                const parsed = JSON.parse(savedData);
                if (parsed[id] !== undefined) {
                  if (el.type === 'checkbox') el.checked = !!parsed[id];
                  else el.value = parsed[id];
                  el.dispatchEvent(new Event('change', { bubbles: true }));
                }
              }
            } catch {}
            el.addEventListener('input', saveCurrentData);
            el.addEventListener('change', saveCurrentData);
          }
        });
      });
      observer.observe(container, { childList: true, subtree: true });
    }
  };

  /**
   * Clears auto-saved data for a specific key.
   * @param {string} storageKey - Unique localStorage key
   */
  window.clearAutoSave = function(storageKey) {
    if (storageKey) {
      localStorage.removeItem(storageKey);
    }
  };
})();
