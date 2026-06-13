/**
 * HCMVERSE — chỉ tiếng Việt: khóa ngôn ngữ vn, ẩn UI chọn EN/VI.
 */
(function () {
  const LANG = 'vn';
  const LANG_KEY = 'hcmverse_map_lang';

  try {
    localStorage.setItem(LANG_KEY, LANG);
  } catch (_) {}

  if (typeof language_selected !== 'undefined') {
    language_selected = LANG;
  }

  const HIDE_SELECTORS = [
    '#loading_text_choose_language',
    '.loading_list_language',
    '#loading_language_en',
    '#settings_language',
    '#instructionLangTitle',
    '#instructionLanguage',
    '#instructionLanguageIcon',
  ];

  function hideLanguageUi() {
    HIDE_SELECTORS.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        el.style.display = 'none';
      });
    });
    document.getElementById('loading_language_en')?.remove();
  }

  function patchUtilGeneral() {
    const g = window.util?.general;
    if (!g || g._viOnly) return !!g?._viOnly;

    const origSet = g.setCurrentLanguage?.bind(g);
    g.getCurrentLanguage = () => LANG;
    g.setCurrentLanguage = async () => {
      if (origSet) {
        try {
          await origSet(LANG);
        } catch (_) {}
      }
      return LANG;
    };
    g._viOnly = true;
    return true;
  }

  function patchAudioGroupServices() {
    const s = window.audioGroupServices;
    if (!s || s._viOnly) return !!s?._viOnly;
    const orig = s.getAvailableLanguages?.bind(s);
    if (!orig) return false;

    s.getAvailableLanguages = async () => {
      const all = await orig();
      const vnOnly = (all || []).filter((item) => item.id === 'vn' || item.id === 'vi');
      if (vnOnly.length) return vnOnly;
      return [{ id: 'vn', display_name: 'Tiếng Việt' }];
    };
    s._viOnly = true;
    return true;
  }

  function patchCreateListLanguage() {
    if (typeof window.createListLanguage !== 'function' || window.createListLanguage._viOnly) {
      return !!window.createListLanguage?._viOnly;
    }
    const orig = window.createListLanguage;
    window.createListLanguage = async function (...args) {
      await orig.apply(this, args);
      hideLanguageUi();
    };
    window.createListLanguage._viOnly = true;
    return true;
  }

  function patchChangeLoadingLanguage() {
    if (typeof window.changeLoadingLanguage !== 'function' || window.changeLoadingLanguage._viOnly) {
      return !!window.changeLoadingLanguage?._viOnly;
    }
    window.changeLoadingLanguage = async function () {};
    window.changeLoadingLanguage._viOnly = true;
    return true;
  }

  function patchCreateItemLanguageSetting() {
    if (
      typeof window.createItemLanguageSetting !== 'function' ||
      window.createItemLanguageSetting._viOnly
    ) {
      return !!window.createItemLanguageSetting?._viOnly;
    }
    window.createItemLanguageSetting = async function () {
      const empty = document.createElement('div');
      empty.style.display = 'none';
      return empty;
    };
    window.createItemLanguageSetting._viOnly = true;
    return true;
  }

  function ensurePrintText() {
    if (typeof print_text === 'undefined') return false;
    const pathKey = window.location.pathname.split('/').filter(Boolean)[0];
    const label = 'Bản đồ 3D / 360° TP.HCM';
    print_text['smart-tourism-3d'] = print_text['smart-tourism-3d'] || label;
    print_text['hcmverse_hcm202'] = print_text['hcmverse_hcm202'] || label;
    if (pathKey) print_text[pathKey] = print_text[pathKey] || label;
    print_text['LOADING_START_TOUR'] = print_text['LOADING_START_TOUR'] || 'Bắt đầu tham quan';
    print_text['SETTINGS_LANGUAGE_SELECT'] =
      print_text['SETTINGS_LANGUAGE_SELECT'] || 'Chọn ngôn ngữ';
    return true;
  }

  function patchOpenLoadingModal() {
    if (typeof window.openLoadingModal !== 'function' || window.openLoadingModal._viOnly) {
      return !!window.openLoadingModal?._viOnly;
    }
    const orig = window.openLoadingModal;
    window.openLoadingModal = async function (...args) {
      ensurePrintText();
      patchUtilGeneral();
      if (window.util?.general?.setCurrentLanguage) {
        try {
          await window.util.general.setCurrentLanguage(LANG);
        } catch (_) {}
      }
      await orig.apply(this, args);
      hideLanguageUi();
    };
    window.openLoadingModal._viOnly = true;
    return true;
  }

  function patchOpenInstructionModal() {
    if (typeof window.openInstructionModal !== 'function' || window.openInstructionModal._viOnly) {
      return !!window.openInstructionModal?._viOnly;
    }
    const orig = window.openInstructionModal;
    window.openInstructionModal = async function (...args) {
      await orig.apply(this, args);
      hideLanguageUi();
    };
    window.openInstructionModal._viOnly = true;
    return true;
  }

  const wait = setInterval(() => {
    ensurePrintText();
    patchUtilGeneral();
    patchAudioGroupServices();
    patchCreateListLanguage();
    patchChangeLoadingLanguage();
    patchCreateItemLanguageSetting();
    patchOpenLoadingModal();
    patchOpenInstructionModal();
    hideLanguageUi();
  }, 80);
  setTimeout(() => clearInterval(wait), 90000);

  if (document.documentElement) {
    new MutationObserver(hideLanguageUi).observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  hideLanguageUi();
})();
