/**
 * Tải nhanh hơn: defer script nặng, nhớ ngôn ngữ, tự vào tour lần sau.
 * ?fast=1 — bỏ qua bước loading trong phiên hiện tại.
 */
(function () {
  const LANG_KEY = 'hcmverse_map_lang';
  const LANG = 'vn';
  const urlFast = new URLSearchParams(location.search).get('fast') === '1';

  if (urlFast) sessionStorage.setItem('hcmverse_fast', '1');

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error(src));
      document.head.appendChild(s);
    });
  }

  function loadDeferredLibs() {
    const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 1500));
    idle(() => {
      loadScript('https://cdn.socket.io/4.7.2/socket.io.min.js').catch(() => {});
      loadScript('https://sp.zalo.me/plugins/sdk.js').catch(() => {});
      loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.9.359/pdf.min.js').catch(() => {});
    });
  }

  function autoEnterTour() {
    const startBtn = document.querySelector('#loading_start_tour, .loading_content div:nth-child(3)');
    if (startBtn) {
      startBtn.click();
      return true;
    }
    if (typeof window.closeLoadingModal === 'function') {
      window.closeLoadingModal();
      return true;
    }
    return false;
  }

  function printTextReady() {
    if (typeof print_text === 'undefined') return false;
    const pathKey = window.location.pathname.split('/').filter(Boolean)[0];
    const fieldKey = typeof field !== 'undefined' ? field : 'smart-tourism-3d';
    return !!(print_text[pathKey] || print_text[fieldKey] || print_text['hcmverse_hcm202']);
  }

  function patchChangeLanguage() {
    if (typeof window.changeLoadingLanguage !== 'function' || window.changeLoadingLanguage._loadFast) {
      return !!window.changeLoadingLanguage?._loadFast;
    }
    window.changeLoadingLanguage = async function () {};
    window.changeLoadingLanguage._loadFast = true;
    return true;
  }

  function scheduleAutoEnter() {
    const tryEnter = (attempt = 0) => {
      if (printTextReady() && window.util?.general?.getElements) {
        setTimeout(() => autoEnterTour(), 150);
        return;
      }
      if (attempt < 50) setTimeout(() => tryEnter(attempt + 1), 100);
    };
    tryEnter();
  }

  function patchOpenLoadingModal() {
    if (typeof window.openLoadingModal !== 'function' || window.openLoadingModal._loadFast) {
      return !!window.openLoadingModal?._loadFast;
    }
    const orig = window.openLoadingModal;
    window.openLoadingModal = async function (...args) {
      try {
        localStorage.setItem(LANG_KEY, LANG);
      } catch (_) {}

      if (window.util?.general?.setCurrentLanguage) {
        try {
          await window.util.general.setCurrentLanguage(LANG);
        } catch (_) {}
      }

      await orig.apply(this, args);

      const skip =
        sessionStorage.getItem('hcmverse_fast') === '1' ||
        urlFast ||
        window.util?.general?.getCurrentLanguage?.() === LANG;

      if (skip) scheduleAutoEnter();
    };
    window.openLoadingModal._loadFast = true;
    return true;
  }

  const wait = setInterval(() => {
    patchChangeLanguage();
    if (patchOpenLoadingModal()) clearInterval(wait);
  }, 80);
  setTimeout(() => clearInterval(wait), 90000);

  window.addEventListener('load', loadDeferredLibs, { once: true });
})();
