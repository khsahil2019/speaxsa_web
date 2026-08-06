/**
 * Meta Pixel Tracking Integration for SPEAXA
 * Meta Pixel ID: 910181071564773
 */
(function() {
  if (window.fbq) return;
  var n = window.fbq = function() {
    n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
  };
  if (!window._fbq) window._fbq = n;
  n.push = n;
  n.loaded = true;
  n.version = '2.0';
  n.queue = [];
  var t = document.createElement('script');
  t.async = true;
  t.src = 'https://connect.facebook.net/en_US/fbevents.js';
  var s = document.getElementsByTagName('script')[0];
  if (s && s.parentNode) {
    s.parentNode.insertBefore(t, s);
  } else {
    document.head.appendChild(t);
  }
})();

fbq('init', '910181071564773');
fbq('track', 'PageView');

/**
 * Safe Helper to track Lead event (Enquiry Form Submission Success)
 */
window.trackMetaLead = function() {
  try {
    if (typeof window.fbq === 'function') {
      window.fbq('track', 'Lead');
      console.log('[Meta Pixel] Lead event tracked successfully');
    }
  } catch (err) {
    console.warn('[Meta Pixel] Error tracking Lead event:', err);
  }
};

/**
 * Safe Helper to track Contact event (WhatsApp Clicks)
 */
window.trackMetaContact = function() {
  try {
    if (typeof window.fbq === 'function') {
      window.fbq('track', 'Contact');
      console.log('[Meta Pixel] Contact event tracked successfully');
    }
  } catch (err) {
    console.warn('[Meta Pixel] Error tracking Contact event:', err);
  }
};

/**
 * Auto-attach Contact event listener to all WhatsApp buttons / links
 */
document.addEventListener('DOMContentLoaded', function() {
  function attachWhatsAppListeners() {
    var selectors = [
      'a[href*="wa.me"]',
      'a[href*="whatsapp.com"]',
      'a[href*="api.whatsapp.com"]',
      '.whatsapp-btn',
      '.whatsapp-link',
      '.btn-whatsapp',
      '#whatsappBtn',
      '[data-whatsapp]'
    ];
    
    var waElements = document.querySelectorAll(selectors.join(', '));
    waElements.forEach(function(el) {
      if (!el.getAttribute('data-meta-contact-attached')) {
        el.setAttribute('data-meta-contact-attached', 'true');
        el.addEventListener('click', function() {
          window.trackMetaContact();
        });
      }
    });
  }

  attachWhatsAppListeners();

  // Re-check periodically for dynamic elements
  setTimeout(attachWhatsAppListeners, 2000);
  setTimeout(attachWhatsAppListeners, 5000);
});
