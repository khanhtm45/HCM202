/**
 * Nạp scene 360° tùy chỉnh (panorama tự chụp) vào tour krpano đã mã hóa.
 */
(function () {
  const CONFIG_URL = 'data/projects/denthobactpcamau/custom-scene-config.json';
  const XML_URL = 'data/projects/denthobactpcamau/custom-scenes.xml';
  const NAV_HOTSPOT_CSS =
    'font-family:Montserrat,Arial,sans-serif;font-size:13px;color:#fff;' +
    'background:rgba(0,210,255,0.88);padding:6px 12px;border-radius:6px;' +
    'box-shadow:0 0 12px rgba(0,210,255,0.35);';

  function getKrpano() {
    const el = document.getElementById('pano');
    if (!el || typeof el.get !== 'function') return null;
    return el.get('global');
  }

  function waitKrpano(maxMs) {
    return new Promise((resolve) => {
      const t0 = Date.now();
      (function tick() {
        const k = getKrpano();
        if (k && k.get && k.get('version')) return resolve(k);
        if (Date.now() - t0 > maxMs) return resolve(null);
        setTimeout(tick, 200);
      })();
    });
  }

  function esc(s) {
    return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }

  function buildSceneXml(scene) {
    const folder = scene.folder || 'panos/custom_user';
    const thumb = scene.thumb || `${folder}/thumb.jpg`;
    const title = esc(scene.title || scene.name);
    const name = esc(scene.name);
    const back = esc(scene.linkFrom || 'dtbh_s0');

    if (scene.mode === 'sphere') {
      const sphere = `${folder}/pano_sphere.jpg`;
      return (
        `<scene name="${name}" title="${title}" thumburl="${thumb}">` +
        `<view hlookat="0" vlookat="0" fovtype="MFOV" fov="90" fovmin="40" fovmax="120" />` +
        `<image><sphere url="${sphere}" /></image>` +
        (scene.preview ? `<preview url="${scene.preview}" />` : '') +
        `<hotspot name="hs_back_tour" type="text" html="← Quay lại tour chính" ` +
        `css="font-family:Arial;font-size:14px;color:#fff;background:rgba(0,0,0,0.55);padding:8px 12px;border-radius:6px;" ` +
        `ath="0" atv="12" distorted="false" zoom="false" ` +
        `onclick="loadscene(${back}, null, MERGE, BLEND(1));" />` +
        `</scene>`
      );
    }

    return (
      `<scene name="${name}" title="${title}" thumburl="${thumb}">` +
      `<view hlookat="0" vlookat="0" fovtype="MFOV" fov="90" fovmin="40" fovmax="120" />` +
      `<image><cube url="${folder}/pano_%s.jpg" /></image>` +
      `<preview url="${folder}/preview.jpg" />` +
      `<hotspot name="hs_back_tour" type="text" html="← Quay lại tour chính" ` +
      `css="font-family:Arial;font-size:14px;color:#fff;background:rgba(0,0,0,0.55);padding:8px 12px;border-radius:6px;" ` +
      `ath="0" atv="12" distorted="false" zoom="false" ` +
      `onclick="loadscene(${back}, null, MERGE, BLEND(1));" />` +
      `</scene>`
    );
  }

  function injectNavHotspot(krpano, scene) {
    const from = scene.linkFrom || 'dtbh_s0';
    const target = scene.name;
    const label = esc(scene.navLabel || 'Góc chụp mới →');
    krpano.call(
      `if(scene[get(xml.scene)].name == '${from}', ` +
        `removehotspot(nav_custom_pano); ` +
        `addhotspot(nav_custom_pano); ` +
        `set(hotspot[nav_custom_pano].type,text); ` +
        `set(hotspot[nav_custom_pano].html,'${label}'); ` +
        `set(hotspot[nav_custom_pano].css,'${NAV_HOTSPOT_CSS.replace(/'/g, "\\'")}'); ` +
        `set(hotspot[nav_custom_pano].ath,25); ` +
        `set(hotspot[nav_custom_pano].atv,8); ` +
        `set(hotspot[nav_custom_pano].distorted,false); ` +
        `set(hotspot[nav_custom_pano].zoom,false); ` +
        `set(hotspot[nav_custom_pano].onclick, loadscene(${target}, null, MERGE, BLEND(1)); );`
    );
  }

  function wireUi(krpano, scenes) {
    const btn = document.getElementById('btn-custom-pano');
    if (!btn || !scenes.length) return;
    const primary = scenes[0];
    btn.textContent = primary.uiLabel || 'Góc chụp 360° mới';
    btn.title = primary.title || '';
    btn.hidden = false;
    btn.addEventListener('click', () => {
      krpano.call(`loadscene(${primary.name}, null, MERGE, BLEND(1));`);
    });
  }

  async function install() {
    const krpano = await waitKrpano(60000);
    if (!krpano) {
      console.warn('[custom-scene] krpano chưa sẵn sàng');
      return;
    }

    let scenes = [];
    try {
      const res = await fetch(CONFIG_URL, { cache: 'no-cache' });
      if (res.ok) {
        const cfg = await res.json();
        scenes = cfg.scenes || [];
      }
    } catch (e) {
      console.warn('[custom-scene] config:', e);
    }

    if (scenes.length) {
      const inner = scenes.map(buildSceneXml).join('');
      krpano.call(`loadxml('<krpano>${inner}</krpano>', null, MERGE, BLEND(0));`);
    } else {
      krpano.call(`loadxml('${XML_URL}', null, MERGE, BLEND(0));`);
    }

    scenes.forEach((s) => injectNavHotspot(krpano, s));
    krpano.set('events.onnewscene', 'js(window.__hcmOnSceneChange())');
    window.__hcmOnSceneChange = function () {
      scenes.forEach((s) => injectNavHotspot(krpano, s));
    };

    const list = scenes.length ? scenes : [{ name: 'custom_user', title: 'Góc chụp mới' }];
    wireUi(krpano, list);
    window.krpano = krpano;

    const params = new URLSearchParams(location.search);
    const start = params.get('startscene') || params.get('scene');
    if (start && list.some((s) => s.name === start)) {
      krpano.call(`loadscene(${start}, null, MERGE, BLEND(0.5));`);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(install, 500));
  } else {
    setTimeout(install, 500);
  }
})();
