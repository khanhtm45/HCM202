/**
 * HCMVERSE — header; ẩn hẳn logo skin krpano (khung trắng góc trái).
 */
(function () {
  const LOGO_ICON = 'assets/images/logo-icon.png';
  const HCM_ACCENT = 'rgba(0,210,255,0.88)';
  const HOTSPOT_CSS =
    'font-family:Montserrat,Arial,sans-serif;font-size:13px;color:#fff;' +
    `background:${HCM_ACCENT};padding:6px 12px;border-radius:6px;` +
    'box-shadow:0 0 12px rgba(0,210,255,0.35);';

  function tourBase() {
    const m = location.pathname.match(/^(.*\/phu-tho-bac-tp-ca-mau\/)/);
    if (m) return location.origin + m[1];
    const dir = location.pathname.replace(/[^/]*$/, '');
    return location.origin + dir;
  }

  function homeUrl() {
    const p = location.pathname;
    const i = p.indexOf('/phu-tho-bac-tp-ca-mau');
    if (i >= 0) return p.slice(0, i + 1) || '/';
    return '../';
  }

  const LOGO_URL = tourBase() + LOGO_ICON;

  function injectChrome() {
    if (document.getElementById('hcmverse-chrome')) return;
    const header = document.createElement('header');
    header.id = 'hcmverse-chrome';
    header.innerHTML = `
      <a class="hcmverse-chrome__home" href="${homeUrl()}">
        <span class="hcmverse-chrome__logo"><img src="${LOGO_URL}" alt="HCMVERSE" width="40" height="40"></span>
        <span class="hcmverse-chrome__wordmark"><span class="hcm">HCM</span><span class="verse">VERSE</span></span>
      </a>
      <span class="hcmverse-chrome__tour-title">Khu tưởng niệm · Tour 360°</span>
      <a class="hcmverse-chrome__back" href="${homeUrl()}">← Trang chủ</a>
    `;
    document.body.appendChild(header);
  }

  function layerCount(krpano) {
    const n = krpano.get('layer.count');
    return typeof n === 'number' && n > 0 ? n : 0;
  }

  function eachLayer(krpano, fn) {
    const n = layerCount(krpano);
    for (let i = 0; i < n; i++) {
      const name = krpano.get(`layer[${i}].name`);
      if (name) fn(name, i);
    }
  }

  function isWhiteBg(val) {
    if (val == null || val === '') return false;
    const n = Number(val);
    if (n === 16777215) return true;
    const s = String(val).toLowerCase().replace(/\s/g, '');
    return s === '0xffffff' || s === '#ffffff' || s === 'ffffff';
  }

  function hideLayer(krpano, name) {
    if (!name) return;
    krpano.call(
      `set(layer[${name}].visible,false); ` +
        `set(layer[${name}].alpha,0); ` +
        `set(layer[${name}].enabled,false); ` +
        `set(layer[${name}].width,0); ` +
        `set(layer[${name}].height,0);`
    );
  }

  /** Skin logo = div + background-image trong #pano (layer API thường rỗng). */
  function hideKrpanoDomLogo() {
    const pano = document.getElementById('pano');
    if (!pano) return;

    const markHidden = (el) => {
      if (!el || el.id === 'hcmverse-chrome') return;
      el.style.setProperty('display', 'none', 'important');
      el.style.setProperty('visibility', 'hidden', 'important');
      el.style.setProperty('opacity', '0', 'important');
      el.style.setProperty('pointer-events', 'none', 'important');
      el.setAttribute('data-hcm-hide', '1');
    };

    const isWhiteBox = (el) => {
      const inline = el.getAttribute('style') || '';
      const cs = getComputedStyle(el);
      const bg = `${inline} ${cs.backgroundColor}`;
      if (!/255,\s*255,\s*255/.test(bg)) return false;
      const r = el.getBoundingClientRect();
      return r.top >= 48 && r.top <= 200 && r.left <= 140 && r.width >= 70 && r.width <= 140 && r.height >= 70;
    };

    pano.querySelectorAll('div, img').forEach((el) => {
      if (el.closest('#hcmverse-chrome') || el.getAttribute('data-hcm-hide') === '1') return;

      const inline = el.getAttribute('style') || '';
      const bgImg = getComputedStyle(el).backgroundImage || '';
      const src = el.src || '';
      const blob = `${inline} ${bgImg} ${src}`;

      if (/skin_phone[/\\]logo|logo\.png/i.test(blob)) {
        markHidden(el);
        let p = el.parentElement;
        if (p && p !== pano && isWhiteBox(p)) markHidden(p);
        return;
      }

      if (isWhiteBox(el)) {
        const hasLogoChild = [...el.querySelectorAll('div')].some((c) => {
          const s = `${c.getAttribute('style') || ''} ${getComputedStyle(c).backgroundImage}`;
          return /skin_phone[/\\]logo|logo\.png/i.test(s);
        });
        if (hasLogoChild) markHidden(el);
      }
    });
  }

  function watchKrpanoDomLogo() {
    const pano = document.getElementById('pano');
    if (!pano || pano.__hcmLogoObs) return;
    pano.__hcmLogoObs = true;
    hideKrpanoDomLogo();
    const obs = new MutationObserver(() => hideKrpanoDomLogo());
    obs.observe(pano, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });
    let n = 0;
    const tick = setInterval(() => {
      hideKrpanoDomLogo();
      if (++n > 100) clearInterval(tick);
    }, 200);
  }

  /** Xóa mọi layer logo + khung trắng logo (skin_phone). */
  function removeSkinLogo(krpano) {
    if (!krpano?.call) return;

    krpano.call(`
      for(set(i,0), i LT layer.count, inc(i),
        copy(ln, layer[get(i)].name);
        if(ln,
          if(indexof('logo', ln) GE 0,
            set(layer[get(ln)].visible, false);
            set(layer[get(ln)].alpha, 0);
            set(layer[get(ln)].enabled, false);
            set(layer[get(ln)].width, 0);
            set(layer[get(ln)].height, 0);
          );
        );
      );
    `);

    const hideNames = new Set();
    eachLayer(krpano, (name) => {
      const lower = name.toLowerCase();
      if (lower.includes('logo')) hideNames.add(name);

      let url = '';
      try {
        url = String(krpano.get(`layer[${name}].url`) || '');
      } catch (_) {}
      if (/logo\.png|logo-icon|hero-museum|skin_phone/i.test(url)) hideNames.add(name);

      const bg = krpano.get(`layer[${name}].bgcolor`);
      const bgalpha = Number(krpano.get(`layer[${name}].bgalpha`));
      const w = Number(krpano.get(`layer[${name}].width`));
      const h = Number(krpano.get(`layer[${name}].height`));
      if (isWhiteBg(bg) && bgalpha > 0.3 && w > 0 && w < 420 && h > 0 && h < 420) {
        if (lower.includes('logo') || lower.includes('brand') || lower.includes('start')) {
          hideNames.add(name);
        }
      }
    });

    hideNames.forEach((name) => hideLayer(krpano, name));

    [
      'skin_logo',
      'skin_logobg',
      'skin_logo_bg',
      'skin_logobox',
      'logo',
      'logo_bg',
      'logo_image',
      'start_logo',
      'brand_logo',
      'loadinglogo',
      'skin_startlogo',
    ].forEach((name) => hideLayer(krpano, name));
  }

  function waitKrpano(maxMs) {
    return new Promise((resolve) => {
      const t0 = Date.now();
      (function tick() {
        const k = document.getElementById('pano')?.get?.('global');
        if (k?.get?.('version')) return resolve(k);
        if (Date.now() - t0 > maxMs) return resolve(null);
        setTimeout(tick, 150);
      })();
    });
  }

  function applyKrpanoBranding(krpano) {
    removeSkinLogo(krpano);
    hideKrpanoDomLogo();
  }

  window.__hcmHotspotCss = HOTSPOT_CSS;

  async function onKrpanoReady() {
    const krpano = await waitKrpano(45000);
    if (!krpano) return;

    applyKrpanoBranding(krpano);

    const prev = krpano.get('events.onnewpano');
    const onNew =
      (prev && prev !== 'null' ? `${prev};` : '') + 'js(window.__hcmOnPanoReady&&window.__hcmOnPanoReady())';
    krpano.set('events.onnewpano', onNew);

    const prevDone = krpano.get('events.onloadcomplete');
    const onDone =
      (prevDone && prevDone !== 'null' ? `${prevDone};` : '') +
      'js(window.__hcmOnPanoReady&&window.__hcmOnPanoReady())';
    krpano.set('events.onloadcomplete', onDone);

    window.__hcmOnPanoReady = function () {
      const k = document.getElementById('pano')?.get?.('global');
      if (k) applyKrpanoBranding(k);
    };

    let n = 0;
    const guard = setInterval(() => {
      applyKrpanoBranding(krpano);
      if (++n > 80) clearInterval(guard);
    }, 150);
  }

  injectChrome();
  watchKrpanoDomLogo();
  onKrpanoReady();
})();
