/**
 * Self-hosted deploy: S3 → /proxy-s3/, CDN managements → /managements/ (serve-hcm202).
 */
(function () {
  const host = location.hostname;
  if (/^sanpham\.starglobal3d\.(vn|com)$/i.test(host)) return;

  const S3 = 'https://s3.hcm-1.cloud.cmctelecom.vn/';
  const S3_HOST = 's3.hcm-1.cloud.cmctelecom.vn';
  const PROXY = '/proxy-s3/';
  const MGMT = '/managements/';
  const CDN_MGMT_HOSTS = ['sanpham.starglobal3d.vn', 'sanpham.starglobal3d.com'];
  const S3_URL_RE = /https?:\/\/s3\.hcm-1\.cloud\.cmctelecom\.vn\//gi;

  function toMgmtProxy(url) {
    for (const host of CDN_MGMT_HOSTS) {
      for (const scheme of ['https://', 'http://']) {
        const prefix = `${scheme}${host}/managements/`;
        if (url.startsWith(prefix)) return MGMT + url.slice(prefix.length);
      }
    }
    return url;
  }

  function resolveLoadModelUrl(url) {
    if (typeof url !== 'string' || !url.includes('loadModel.html')) return url;
    try {
      const u = new URL(url, location.origin);
      const id = u.searchParams.get('id') || (typeof id_path !== 'undefined' ? id_path : '20250624');
      const modelId = u.searchParams.get('model_id') || '';
      return (
        'https://sanpham.starglobal3d.vn/managements/admin/modules/management_model/html/loadModel.html' +
        `?id=${encodeURIComponent(id)}&model_id=${encodeURIComponent(modelId)}`
      );
    } catch {
      return url;
    }
  }

  function toProxy(url) {
    if (typeof url !== 'string') return url;
    if (url.includes('loadModel.html')) return resolveLoadModelUrl(url);
    const mgmt = toMgmtProxy(url);
    if (mgmt !== url) return mgmt;
    if (url.startsWith(S3)) return PROXY + url.slice(S3.length);
    if (url.includes(S3_HOST)) {
      const i = url.indexOf(S3_HOST);
      const path = url.slice(i + S3_HOST.length).replace(/^\//, '');
      return PROXY + path;
    }
    return url;
  }

  function rewriteS3InString(text) {
    if (typeof text !== 'string' || !text.includes('s3.hcm-1.cloud.cmctelecom.vn')) return text;
    return text.replace(S3_URL_RE, PROXY);
  }

  function fixAssetUrl(url) {
    if (!url) return url;
    if (typeof url === 'string' && url.includes('loadModel.html')) return resolveLoadModelUrl(url);
    const proxied = toProxy(url);
    if (proxied !== url) return proxied;
    if (url.includes('http')) return url;
    if (typeof url === 'string') {
      url = url.replace(/\/upload\/audio\/+\/upload\/audio\//g, '/upload/audio/');
      if (url.startsWith('/upload/') || url.startsWith('upload/')) {
        return (
          'https://sanpham.starglobal3d.vn/smart-tourism-3d/sdl-tphcm/' +
          url.replace(/^\//, '')
        );
      }
    }
    const base = (
      typeof root_path2 !== 'undefined' ? root_path2 : `${location.origin}/`
    ).replace(/\/?$/, '/');
    return base + (url.startsWith('/') ? url.slice(1) : url);
  }

  function proxyImgSrc(img) {
    const raw = img.getAttribute('src');
    if (!raw) return;
    const next = toProxy(raw);
    if (next !== raw) img.setAttribute('src', next);
  }

  function proxyElementTree(root) {
    if (!root || root.nodeType !== 1) return;
    if (root.matches?.('img[src]')) proxyImgSrc(root);
    root.querySelectorAll?.('img[src]').forEach(proxyImgSrc);
    root.querySelectorAll?.('[style*="s3.hcm-1.cloud"]').forEach((el) => {
      el.setAttribute('style', rewriteS3InString(el.getAttribute('style')));
    });
  }

  const ATTRS = new Set(['src', 'href', 'poster', 'data-src', 'data-href', 'data-bg', 'srcset']);

  const origSetAttribute = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function (name, value) {
    if (typeof value === 'string') {
      if (ATTRS.has(name) || name.startsWith('data-')) value = toProxy(value);
      if (name === 'style') value = rewriteS3InString(value);
    }
    return origSetAttribute.call(this, name, value);
  };

  function patchHtmlSetter(prop) {
    const desc = Object.getOwnPropertyDescriptor(Element.prototype, prop);
    if (!desc?.set || desc.set._localS3Patched) return;
    const origSet = desc.set;
    const patchedSet = function (html) {
      return origSet.call(this, rewriteS3InString(html));
    };
    patchedSet._localS3Patched = true;
    Object.defineProperty(Element.prototype, prop, {
      configurable: true,
      enumerable: desc.enumerable,
      get: desc.get,
      set: patchedSet,
    });
  }

  patchHtmlSetter('innerHTML');
  patchHtmlSetter('outerHTML');

  const mediaSrc = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'src');
  if (mediaSrc?.set) {
    Object.defineProperty(HTMLMediaElement.prototype, 'src', {
      configurable: true,
      get: mediaSrc.get,
      set(v) {
        mediaSrc.set.call(this, toProxy(v));
      },
    });
  }

  const imgSrc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
  if (imgSrc?.set) {
    Object.defineProperty(HTMLImageElement.prototype, 'src', {
      configurable: true,
      get: imgSrc.get,
      set(v) {
        imgSrc.set.call(this, toProxy(v));
      },
    });
  }

  const cssSetProperty = CSSStyleDeclaration.prototype.setProperty;
  CSSStyleDeclaration.prototype.setProperty = function (name, value, priority) {
    if (typeof value === 'string' && (name === 'background-image' || value.includes(S3_HOST))) {
      value = rewriteS3InString(value);
    }
    return cssSetProperty.call(this, name, value, priority);
  };

  const nativeFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    if (typeof input === 'string') return nativeFetch(toProxy(input), init);
    if (input instanceof Request) {
      const u = toProxy(input.url);
      if (u !== input.url) input = new Request(u, input);
    }
    return nativeFetch(input, init);
  };

  const xhrOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    return xhrOpen.call(this, method, toProxy(url), ...rest);
  };

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === 'attributes' && m.target.nodeType === 1) {
        if (m.attributeName === 'src' && m.target.tagName === 'IMG') proxyImgSrc(m.target);
        if (m.attributeName === 'style') {
          const style = m.target.getAttribute('style');
          if (style?.includes(S3_HOST)) {
            origSetAttribute.call(m.target, 'style', rewriteS3InString(style));
          }
        }
      }
      for (const node of m.addedNodes) {
        if (node.nodeType === 1) proxyElementTree(node);
      }
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['src', 'style'],
  });

  function stopDomObserver() {
    try {
      observer.disconnect();
    } catch (_) {}
  }
  setTimeout(stopDomObserver, 45000);
  if (window.eventEmitter?.on) {
    window.eventEmitter.on('endLoadingScreen', stopDomObserver);
  }

  function patchUtilGeneral() {
    const g = window.util?.general;
    if (!g || g._localUtilPatched) return !!g?._localUtilPatched;
    g._localUtilPatched = true;
    g.autoCompleteUrl = fixAssetUrl;
    const origCreate = g.createElement;
    if (typeof origCreate === 'function') {
      g.createElement = function (tag, classNames, attributes = {}) {
        if (attributes && typeof attributes === 'object') {
          for (const k of Object.keys(attributes)) {
            if (typeof attributes[k] === 'string') {
              attributes[k] =
                k === 'style' ? rewriteS3InString(attributes[k]) : toProxy(attributes[k]);
            }
          }
        }
        return origCreate.call(this, tag, classNames, attributes);
      };
    }
    return true;
  }

  function patchPrintText() {
    if (typeof print_text === 'undefined') return false;
    const label = 'Bản đồ 3D / 360° TP.HCM — HCMVERSE';
    print_text['smart-tourism-3d'] = print_text['smart-tourism-3d'] || label;
    print_text['hcmverse_hcm202'] = print_text['hcmverse_hcm202'] || label;
    print_text['LOADING_START_TOUR'] = print_text['LOADING_START_TOUR'] || 'Bắt đầu tham quan';
    return true;
  }

  function ensureAudioMaps() {
    const ag = window.util?.audioGroup;
    if (!ag) return false;
    if (ag.allSceneUrls == null) ag.allSceneUrls = {};
    if (ag.allGroupUrls == null) ag.allGroupUrls = {};
    if (!ag._localDevPatched) {
      ag._localDevPatched = true;
      const wrap = (fn) =>
        async function (...args) {
          this.allSceneUrls = this.allSceneUrls || {};
          this.allGroupUrls = this.allGroupUrls || {};
          try {
            await fn.apply(this, args);
          } catch (e) {
            console.warn('[local-dev] audioGroup:', e.message);
          }
          if (this.allSceneUrls == null) this.allSceneUrls = {};
          if (this.allGroupUrls == null) this.allGroupUrls = {};
        };
      if (typeof ag.init === 'function') ag.init = wrap(ag.init);
      if (typeof ag.refreshUrls === 'function') ag.refreshUrls = wrap(ag.refreshUrls);
    }
    return true;
  }

  const EMPTY_SCENE_RELATION = { scene: { thumbnail: '', name: '' } };

  function patchGroupViewServices() {
    const svc = window.groupViewServices;
    if (!svc?.getSceneRelation || svc.getSceneRelation._localPatched) {
      return !!svc?.getSceneRelation?._localPatched;
    }
    const orig = svc.getSceneRelation.bind(svc);
    svc.getSceneRelation = async function (...args) {
      try {
        const result = await orig(...args);
        return result?.scene ? result : EMPTY_SCENE_RELATION;
      } catch (e) {
        console.warn('[local-dev] getSceneRelation:', e.message);
        return EMPTY_SCENE_RELATION;
      }
    };
    svc.getSceneRelation._localPatched = true;
    return true;
  }

  function patchGetUptoDateViewInfo() {
    if (typeof window.getUptoDateViewInfo !== 'function' || window.getUptoDateViewInfo._localPatched) {
      return !!window.getUptoDateViewInfo?._localPatched;
    }
    const orig = window.getUptoDateViewInfo;
    window.getUptoDateViewInfo = async function () {
      ensureAudioMaps();
      const scene = util?.general?.getCurrentScene?.();
      if (!scene || scene === 'null') return;
      const map = util?.audioGroup?.allSceneUrls;
      if (!map || map[scene] == null) return;
      try {
        await orig();
      } catch (e) {
        console.warn('[local-dev] getUptoDateViewInfo:', e.message);
      }
    };
    window.getUptoDateViewInfo._localPatched = true;
    return true;
  }

  function patchGroupViewAccordion() {
    if (
      typeof window.createGroupViewAccordion !== 'function' ||
      window.createGroupViewAccordion._localPatched
    ) {
      return !!window.createGroupViewAccordion?._localPatched;
    }
    window.createGroupViewAccordion = async function () {
      const { getElements, getCurrentLanguage, createLoadingCardElement } = util.general;

      if (getElements('#offcanvas_group_view', 'one')) return;

      const body = getElements('#drawer_home_body', 'one');
      body.innerHTML = '';

      if (window.group_view_exist && window.cloneBodyGroupView instanceof Node) {
        body.appendChild(window.cloneBodyGroupView);
        return;
      }

      window.group_view_exist = true;
      body.appendChild(createLoadingCardElement());

      const sublink = queryParamsMap.get('sublink') ?? '';
      const data = await groupViewServices.getListScenesRelation(getCurrentLanguage(), sublink);
      body.innerHTML = '';

      const view = await createOffcanvasGroupView(data);
      body.appendChild(view);
      window.cloneBodyGroupView = view.cloneNode(true);
    };
    window.createGroupViewAccordion._localPatched = true;
    return true;
  }

  const tick = setInterval(() => {
    patchPrintText();
    const utilOk = patchUtilGeneral();
    const audioOk = ensureAudioMaps();
    const groupViewOk = patchGroupViewServices();
    const viewInfoOk = patchGetUptoDateViewInfo();
    const accordionOk = patchGroupViewAccordion();
    if (utilOk && audioOk && groupViewOk && viewInfoOk && accordionOk) clearInterval(tick);
  }, 20);

  setTimeout(() => clearInterval(tick), 120000);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => proxyElementTree(document.body));
  } else {
    proxyElementTree(document.body);
  }
})();
