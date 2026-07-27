/**
 * SPEAXA Platform Security — Built-in Anti-Inspect & DevTools Protection System
 * Prevents Right-Click, F12, Inspect Element, View Source, and console debugging.
 */
(function () {
  'use strict';

  // 1. Disable Right-Click Context Menu
  document.addEventListener('contextmenu', function (e) {
    e.preventDefault();
    return false;
  }, false);

  // 2. Disable Key Combinations (F12, Ctrl+Shift+I/J/C, Ctrl+U, Cmd+Opt+I/J/C/U)
  document.addEventListener('keydown', function (e) {
    // F12
    if (e.keyCode === 123 || e.key === 'F12') {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const metaOrCtrl = isMac ? (e.metaKey || e.ctrlKey) : e.ctrlKey;
    const key = (e.key || String.fromCharCode(e.keyCode)).toLowerCase();

    // Inspect: Ctrl/Cmd + Shift + I/J/C OR Cmd + Opt + I/J/C/U OR Ctrl/Cmd + U / S
    if (
      (metaOrCtrl && e.shiftKey && (key === 'i' || key === 'j' || key === 'c')) ||
      (isMac && e.altKey && (key === 'i' || key === 'j' || key === 'c' || key === 'u')) ||
      (metaOrCtrl && (key === 'u' || key === 's'))
    ) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  }, false);

  // 3. DevTools Trap / Debugger Loop
  function devToolsCheck() {
    const threshold = 160;
    const widthDiff = window.outerWidth - window.innerWidth;
    const heightDiff = window.outerHeight - window.innerHeight;

    if (widthDiff > threshold || heightDiff > threshold) {
      try {
        (function () {
          return false;
        })
          .constructor('debugger')
          .call('action');
      } catch (err) {}
    }
  }

  window.addEventListener('resize', devToolsCheck);
  setInterval(devToolsCheck, 1000);
})();
