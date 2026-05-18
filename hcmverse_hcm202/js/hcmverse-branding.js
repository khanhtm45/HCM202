/**
 * Logo HCMVERSE trên màn loading / menu — không patch autoCompleteUrl (tránh kẹt load tour).
 */
(function () {
  const LOGO_FILE = 'assets/images/hero-museum.png';

  function basePath() {
    if (typeof root_path2 !== 'undefined') return root_path2.replace(/\/?$/, '/');
    const m = location.pathname.match(/^(.*\/hcmverse_hcm202\/)/);
    if (m) return location.origin + m[1];
    const dir = location.pathname.replace(/[^/]*$/, '');
    return location.origin + dir;
  }

  function logoUrl() {
    return basePath() + LOGO_FILE;
  }

  function homeUrl() {
    const path = location.pathname;
    const i = path.indexOf('/hcmverse_hcm202');
    if (i >= 0) return path.slice(0, i + 1) || '/';
    return '../';
  }

  const HCMVERSE_LOGO = logoUrl();

  const LOGO_IMG_IDS = new Set([
    'loading_logo_project',
    'logo_main_icon',
  ]);

  function isExternalLogoUrl(src) {
    if (!src || src.includes('hero-museum')) return false;
    return (
      /logo\.png|logo_bottom|museum-template|visithcmc\.vn/i.test(src) ||
      /starglobal3d\.vn.*\/logo/i.test(src)
    );
  }

  function applyLogoTo(img) {
    if (!img || img.tagName !== 'IMG') return;
    const src = img.currentSrc || img.src || '';
    if (!isExternalLogoUrl(src) && src.includes('hero-museum')) return;
    if (img.dataset.hcmverseLogo === '1' && src.includes('hero-museum')) return;
    img.src = HCMVERSE_LOGO;
    img.dataset.hcmverseLogo = '1';
    img.classList.add('hcmverse-logo-round');
  }

  function patchLoadingImages() {
    LOGO_IMG_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) applyLogoTo(el);
    });
    const left = document.querySelector('#default_logo_left img');
    if (left) applyLogoTo(left);
    document.querySelectorAll('#loading-screen img').forEach(applyLogoTo);
  }

  function patchLoadingCopy() {
    document.querySelectorAll('.loading_content').forEach((block) => {
      const kids = block.children;
      if (kids.length >= 2) {
        kids[0].textContent = 'HO CHI MINH METAVERSE MUSEUM';
        kids[1].textContent = 'HCMVERSE';
      }
    });
    const field = document.getElementById('loading_field');
    if (field) field.textContent = 'BẢN ĐỒ 3D / 360° TP.HCM';
  }

  function patchPrintText() {
    if (typeof print_text === 'undefined') return;
    const line = 'Bản đồ 3D / 360° TP.HCM';
    print_text['smart-tourism-3d'] = line;
    print_text['hcmverse_hcm202'] = line;
    print_text['LOADING_START_TOUR'] = print_text['LOADING_START_TOUR'] || 'Bắt đầu tham quan';
  }

  function patchOpenLoadingModal() {
    if (typeof window.openLoadingModal !== 'function' || window.openLoadingModal._hcmversePatched) {
      return !!window.openLoadingModal?._hcmversePatched;
    }
    const orig = window.openLoadingModal;
    window.openLoadingModal = async function (...args) {
      try {
        if (window.util?.general?.metaData) {
          window.util.general.metaData.logo = LOGO_FILE;
        }
        await orig.apply(this, args);
      } finally {
        patchLoadingImages();
        patchLoadingCopy();
      }
    };
    window.openLoadingModal._hcmversePatched = true;
    return true;
  }

  function injectChrome() {
    if (!document.body || document.getElementById('hcmverse-chrome')) return;
    const header = document.createElement('header');
    header.id = 'hcmverse-chrome';
    header.innerHTML = `
      <a class="hcmverse-chrome__home" href="${homeUrl()}">
        <span class="hcmverse-chrome__logo"><img src="${HCMVERSE_LOGO}" alt="HCMVERSE" width="40" height="40"></span>
        <span class="hcmverse-chrome__wordmark"><span class="hcm">HCM</span><span class="verse">VERSE</span></span>
      </a>
      <a class="hcmverse-chrome__back" href="${homeUrl()}">← Trang chủ</a>
    `;
    document.body.appendChild(header);
  }

  function onReady() {
    patchPrintText();
    patchOpenLoadingModal();
    patchLoadingImages();
    injectChrome();
  }

  let logoObserver;
  function watchLogoOnce() {
    if (logoObserver) return;
    logoObserver = new MutationObserver((records) => {
      for (const r of records) {
        if (r.type !== 'attributes' || r.attributeName !== 'src') continue;
        const t = r.target;
        if (t.tagName !== 'IMG') continue;
        if (t.id && LOGO_IMG_IDS.has(t.id)) applyLogoTo(t);
        else if (t.closest('#default_logo_left, #loading-screen, .loading_logo')) applyLogoTo(t);
      }
    });
    logoObserver.observe(document.documentElement, {
      subtree: true,
      attributes: true,
      attributeFilter: ['src'],
    });
  }

  const setupTimer = setInterval(() => {
    if (patchOpenLoadingModal()) {
      onReady();
      watchLogoOnce();
      clearInterval(setupTimer);
    }
  }, 100);
  setTimeout(() => clearInterval(setupTimer), 60000);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady);
  } else {
    onReady();
  }
})();
