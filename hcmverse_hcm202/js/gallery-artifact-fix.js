/**
 * Hiện vật 3D: sửa URL audio/model, iframe loadModel, mô tả trống.
 * Chạy trên localhost và map3d.visithcmc.vn (CDN không mirror upload/audio local).
 */
(function () {
  const SDL_CDN = 'https://sanpham.starglobal3d.vn/smart-tourism-3d/sdl-tphcm/';
  const LOAD_MODEL =
    'https://sanpham.starglobal3d.vn/managements/admin/modules/management_model/html/loadModel.html';

  function normalizeUploadPath(url) {
    if (typeof url !== 'string') return url;
    return url.replace(/\/upload\/audio\/+\/upload\/audio\//g, '/upload/audio/');
  }

  function resolveArtifactUrl(url) {
    if (!url) return url;
    url = normalizeUploadPath(url);
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('/upload/') || url.startsWith('upload/')) {
      return SDL_CDN + url.replace(/^\//, '');
    }
    return url;
  }

  function resolveLoadModelUrl(url) {
    if (typeof url !== 'string' || !url.includes('loadModel.html')) return url;
    try {
      const u = new URL(url, location.origin);
      const id = u.searchParams.get('id') || (typeof id_path !== 'undefined' ? id_path : '20250624');
      const modelId = u.searchParams.get('model_id') || '';
      return `${LOAD_MODEL}?id=${encodeURIComponent(id)}&model_id=${encodeURIComponent(modelId)}`;
    } catch {
      return url.replace(/^https?:\/\/[^/]+/, 'https://sanpham.starglobal3d.vn');
    }
  }

  function resolveMediaUrl(url) {
    if (typeof url !== 'string') return url;
    if (url.includes('loadModel.html')) return resolveLoadModelUrl(url);
    return resolveArtifactUrl(url);
  }

  /** const globals (galleryServices, util, …) are not on window — read from global lexical scope. */
  function globalRef(name) {
    try {
      return (0, eval)(name);
    } catch {
      return undefined;
    }
  }

  function patchGalleryServices() {
    const svc = globalRef('galleryServices');
    if (!svc?.getAudioObject || svc._galleryArtifactPatched) {
      return !!svc?._galleryArtifactPatched;
    }
    const orig = svc.getAudioObject.bind(svc);
    svc.getAudioObject = async function (...args) {
      const data = await orig(...args);
      if (data?.file) data.file = resolveArtifactUrl(data.file);
      return data;
    };
    svc._galleryArtifactPatched = true;
    return true;
  }

  function patchAutoCompleteUrl() {
    const g = globalRef('util')?.general;
    if (!g?.autoCompleteUrl) return false;
    if (g.autoCompleteUrl._galleryArtifactUrlPatched) return true;
    const orig = g.autoCompleteUrl.bind(g);
    g.autoCompleteUrl = function (url, nameUrl) {
      const fixed = resolveArtifactUrl(url);
      if (fixed !== url) return fixed;
      const out = orig(url, nameUrl);
      return resolveArtifactUrl(out);
    };
    g.autoCompleteUrl._galleryArtifactUrlPatched = true;
    return true;
  }

  function patchCreateElement() {
    const g = globalRef('util')?.general;
    if (!g?.createElement) return false;
    if (g.createElement._galleryCreateElementPatched) return true;
    const orig = g.createElement.bind(g);
    const wrapped = function (tag, classNames, attributes = {}) {
      if (attributes && typeof attributes === 'object') {
        for (const k of Object.keys(attributes)) {
          if (typeof attributes[k] === 'string') {
            const v = attributes[k];
            if (!v || v === 'undefined') {
              delete attributes[k];
            } else {
              attributes[k] = resolveMediaUrl(v);
            }
          }
        }
      }
      return orig(tag, classNames, attributes);
    };
    wrapped._galleryCreateElementPatched = true;
    g.createElement = wrapped;
    return true;
  }

  function patchMaterialServices() {
    const svc = globalRef('materialServices');
    if (!svc?._galleryArtifactPatched) {
      if (svc?.getModels) {
        const origGetModels = svc.getModels.bind(svc);
        svc.getModels = async function (...args) {
          const list = await origGetModels(...args);
          if (!Array.isArray(list)) return list;
          const lang = globalRef('util')?.general?.getCurrentLanguage?.() || 'vn';
          await Promise.all(
            list.map(async (m) => {
              if (m?.description?.trim()) return;
              try {
                const full = await svc.getModelById(lang, m.id);
                m.description = full?.description || full?.mieu_ta_vn || m.description || '';
              } catch (_) {}
            })
          );
          return list;
        };
      }
      if (svc?.getModelsCategories) {
        const origCats = svc.getModelsCategories.bind(svc);
        svc.getModelsCategories = async function (...args) {
          const cats = await origCats(...args);
          if (!Array.isArray(cats)) return cats;
          const lang = globalRef('util')?.general?.getCurrentLanguage?.() || 'vn';
          for (const cat of cats) {
            if (!Array.isArray(cat?.objects)) continue;
            await Promise.all(
              cat.objects.map(async (m) => {
                if (m?.description?.trim()) return;
                try {
                  const full = await svc.getModelById(lang, m.id);
                  m.description = full?.description || full?.mieu_ta_vn || m.description || '';
                } catch (_) {}
              })
            );
          }
          return cats;
        };
      }
      if (svc) svc._galleryArtifactPatched = true;
    }
    return !!svc?._galleryArtifactPatched;
  }

  function patchDisplayModel() {
    const fn = globalRef('displayModel');
    if (typeof fn !== 'function' || fn._galleryArtifactPatched) {
      return !!fn?._galleryArtifactPatched;
    }
    const orig = fn;
    const wrapped = async function (object) {
      await orig(object);
      const iframe = document.getElementById('gallery_details_model');
      if (iframe?.src && iframe.src.includes('loadModel.html')) {
        const fixed = resolveLoadModelUrl(iframe.src);
        if (fixed !== iframe.src) iframe.src = fixed;
      }
    };
    Object.defineProperty(wrapped, 'object_id', {
      configurable: true,
      get() {
        return orig.object_id;
      },
      set(v) {
        orig.object_id = v;
      },
    });
    wrapped._galleryArtifactPatched = true;
    try {
      (0, eval)('displayModel = wrapped');
    } catch (_) {}
    return true;
  }

  function patchPlayVoiceModel() {
    const fn = globalRef('playVoiceModel');
    if (typeof fn !== 'function' || fn._galleryArtifactPatched) {
      return !!fn?._galleryArtifactPatched;
    }
    const orig = fn;
    const wrapped = async function (id_model) {
      await patchGalleryServices();
      await patchAutoCompleteUrl();
      return orig(id_model);
    };
    wrapped._galleryArtifactPatched = true;
    try {
      (0, eval)('playVoiceModel = wrapped');
    } catch (_) {}
    return true;
  }

  function patchIframeSrcSetter() {
    const proto = HTMLIFrameElement.prototype;
    const desc = Object.getOwnPropertyDescriptor(proto, 'src');
    if (!desc?.set || desc.set._galleryArtifactPatched) return !!desc?.set?._galleryArtifactPatched;
    const origSet = desc.set;
    const origGet = desc.get;
    const patchedSet = function (value) {
      if (typeof value === 'string') value = resolveMediaUrl(value);
      return origSet.call(this, value);
    };
    patchedSet._galleryArtifactPatched = true;
    Object.defineProperty(proto, 'src', {
      configurable: true,
      enumerable: desc.enumerable,
      get: origGet,
      set: patchedSet,
    });
    return true;
  }

  function patchIframeSrcAttribute() {
    const origSet = Element.prototype.setAttribute;
    if (origSet._galleryArtifactPatched) return true;
    Element.prototype.setAttribute = function (name, value) {
      if (name === 'src' && typeof value === 'string') {
        if (!value || value === 'undefined') return;
        value = resolveMediaUrl(value);
      }
      return origSet.call(this, name, value);
    };
    Element.prototype.setAttribute._galleryArtifactPatched = true;
    return true;
  }

  function refreshDescriptionPanel() {
    const panel = document.getElementById('gallery_details_description');
    if (!panel || panel.dataset.enriched === '1') return;
    const text = (panel.innerHTML || '').replace(/<[^>]+>/g, '').trim();
    if (text) return;
    const modelId =
      globalRef('displayModel')?.object_id ||
      document.getElementById('gallery_details_model')?.getAttribute('object_id');
    const svc = globalRef('materialServices');
    if (!modelId || !svc?.getModelById) return;
    const lang = globalRef('util')?.general?.getCurrentLanguage?.() || 'vn';
    svc
      .getModelById(lang, modelId)
      .then((data) => {
        const html = data?.description || data?.mieu_ta_vn || '';
        if (html) {
          panel.innerHTML = html;
          panel.dataset.enriched = '1';
        }
      })
      .catch(() => {});
  }

  function runPatches() {
    patchIframeSrcAttribute();
    patchIframeSrcSetter();
    patchGalleryServices();
    patchMaterialServices();
    patchAutoCompleteUrl();
    patchCreateElement();
    patchDisplayModel();
    patchPlayVoiceModel();
    refreshDescriptionPanel();
  }

  runPatches();

  const tick = setInterval(runPatches, 120);
  setTimeout(() => clearInterval(tick), 180000);

  document.addEventListener(
    'click',
    (e) => {
      if (
        e.target.closest('#gallery_details_seemore') ||
        e.target.closest('.gallery_details_explore_list_item') ||
        e.target.closest('.gallery_item')
      ) {
        setTimeout(refreshDescriptionPanel, 600);
      }
    },
    true
  );
})();
