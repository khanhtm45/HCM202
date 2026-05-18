/**
 * HCMVERSE — giao diện tour Bảo tàng 3D (layout gốc, branding HCMVERSE).
 */
(function () {
  const LOGO = '../assets/images/hero-museum.png';
  const HOTSPOT_CSS =
    'font-family:Montserrat,Arial,sans-serif;font-size:13px;color:#fff;' +
    'background:linear-gradient(90deg,rgba(0,210,255,0.92),rgba(191,0,255,0.85));' +
    'padding:6px 14px;border-radius:8px;box-shadow:0 0 14px rgba(0,210,255,0.4);';

  const state = {
    rooms: [],
    sceneMap: new Map(),
    lang: 'vi',
    soundOn: true,
    rotateOn: false,
    guideOn: true,
    mapOpen: false,
    currentTitle: 'Bảo tàng Hồ Chí Minh',
  };

  function homeUrl() {
    const p = location.pathname;
    const i = p.indexOf('/baotang-hochiminh');
    return i >= 0 ? p.slice(0, i + 1) || '/' : '../';
  }

  function krpanoEl() {
    return document.getElementById('virtualmuseum');
  }

  /** Cùng API với main.js / egal.js: `krpano()` trả về div embed có `.call()`. */
  function getKrpano() {
    try {
      if (typeof window.krpano === 'function') {
        const el = window.krpano();
        if (el && typeof el.call === 'function') return el;
      }
    } catch (_) {}
    const el = krpanoEl();
    if (!el) return null;
    if (typeof el.call === 'function') return el;
    try {
      const g = el.get?.('global');
      if (g && typeof g.call === 'function') return g;
    } catch (_) {}
    return null;
  }

  function waitKrpano(maxMs) {
    return new Promise((resolve) => {
      const t0 = Date.now();
      (function tick() {
        const k = getKrpano();
        if (k) return resolve(k);
        if (Date.now() - t0 > maxMs) return resolve(null);
        setTimeout(tick, 150);
      })();
    });
  }

  function waitSceneDict(maxMs = 15000) {
    return new Promise((resolve) => {
      const t0 = Date.now();
      (function tick() {
        if (window.SCENE_DICT && Object.keys(window.SCENE_DICT).length > 0) {
          return resolve(window.SCENE_DICT);
        }
        if (Date.now() - t0 > maxMs) return resolve(window.SCENE_DICT || {});
        setTimeout(tick, 120);
      })();
    });
  }

  async function loadSceneMap() {
    try {
      const res = await fetch('virtualmuseumdata/load_scene.xml');
      const doc = new DOMParser().parseFromString(await res.text(), 'text/xml');
      doc.querySelectorAll('scene').forEach((el) => {
        const id = el.getAttribute('id');
        const value = el.getAttribute('value');
        if (id && value) state.sceneMap.set(id, value);
      });
    } catch (e) {
      console.warn('[HCMVERSE] load_scene', e);
    }
  }

  async function loadRooms() {
    try {
      const res = await fetch('data/xml/exhibition.xml');
      const doc = new DOMParser().parseFromString(await res.text(), 'text/xml');
      const rooms = [];
      doc.querySelectorAll('Section').forEach((sec) => {
        const keyId = sec.getAttribute('key_id');
        const action = sec.getAttribute('action');
        const title =
          sec.querySelector('title vi')?.textContent?.trim() ||
          sec.querySelector('title en')?.textContent?.trim() ||
          '';
        if (!action || keyId === '0' || !title) return;
        let panoId = action;
        let loc = state.sceneMap.get(action);
        if (!loc) {
          loc = `${keyId}_1`;
          for (const [id, val] of state.sceneMap) {
            if (val === loc) {
              panoId = id;
              break;
            }
          }
        }
        const thumbDir = findThumbDir(panoId, keyId);
        rooms.push({ keyId, panoId, loc, title, thumbDir });
      });
      state.rooms = rooms;
    } catch (e) {
      console.warn('[HCMVERSE] exhibition', e);
    }
  }

  function findThumbDir(panoId, keyId) {
    const maps = {
      pano180: '_0_7_180',
      pano185: '_20_1_185',
      pano9: '_1234_9',
      pano13: '_3_13',
      pano15: '_4_15',
      pano21: '_2_11',
      pano61: '_3_1_61',
      pano89: '_6_2_111',
      pano115: '_6_1_115',
      pano151: '_7_1_151',
      pano168: '_8_1_168',
      pano17: '_11_1_39',
      pano39: '_11_1_39',
      pano65: '_12_1_65',
      pano85: '_13_2_87',
      pano128: '_14_1_128',
      pano108: '_15_1_108',
      pano166: '_0_6_166',
      pano518: '_20_4_518',
      pano520: '_20_3_520',
    };
    return maps[panoId] || `_20_1_${keyId}`;
  }

  function thumbUrl(dir) {
    return `virtualmuseumdata/${dir}/thumbnail.jpg`;
  }

  function setTitle(text) {
    state.currentTitle = text;
    const el = document.getElementById('hcm-top-title');
    if (el) el.textContent = text;
  }

  function enforceAudioPrefsAfterSceneChange() {
    setTimeout(() => {
      if (!state.soundOn) {
        kCall('stop_background_sound();');
        setKrpanoSoundFlags(false, undefined);
      } else {
        kCall('playBackgroundSound();');
      }
      if (!state.guideOn) {
        kCall('stopAutoguideSound();');
        setKrpanoSoundFlags(undefined, false);
      } else {
        resumeAutoguidePlayback();
      }
    }, 500);
  }

  async function goToRoom(room) {
    const k = getKrpano();
    if (!k || !room) return;
    setTitle(room.title);
    closeMap();
    await waitSceneDict();
    const loc = room.loc || `${room.keyId}_1`;
    if (window.egal?.viewPano) {
      try {
        window.egal.viewPano(loc);
        enforceAudioPrefsAfterSceneChange();
        return;
      } catch (e) {
        console.warn('[HCMVERSE] viewPano', loc, e);
      }
    }
    const sceneId = window.SCENE_DICT?.[loc] || room.panoId;
    if (sceneId) k.call(`mainloadscene(${sceneId});`);
    enforceAudioPrefsAfterSceneChange();
  }

  const LEGACY_LAYERS = [
    'topbg',
    'phongtruyenthong',
    'phongtruyenthong_en',
    'topleftbg2',
    'topleftbg3',
    'location_title',
    'location_title_en',
    'tapdoanviettel',
    'tapdoanviettel_en',
    'toprightbg',
    'languague_en',
    'languague_vi',
    'mapicon',
    'footer',
    'controlbar_menu_bg',
    'menu_control_mode',
    'menu_resolution_mode',
    'controlbarhelpScreenBg',
    'controlbarhelpScreenFg',
    'controlbarbtn_in',
    'controlbarbtn_out',
    'controlbarbtn_left',
    'controlbarbtn_right',
    'controlbarbtn_up',
    'controlbarbtn_down',
    'controlbarbtn_control',
    'controlbarbtn_autoplay',
    'controlbarbtn_autoplay_off',
    'controlbarbtn_sound_on',
    'controlbarbtn_sound_off',
    'controlbarbtn_autoguide_on',
    'controlbarbtn_autoguide_off',
    'controlbarbtn_openfs',
    'controlbarbtn_closefs',
    'controlbarbtn_autorotate_on',
    'controlbarbtn_autorotate_off',
    'controlbarbtn_display_help',
    'controlbarbtn_close_help',
    'controlbarbtn_resolution_mode',
  ];

  const LEGACY_SHOW_ACTIONS = [
    'showtoprightbg',
    'showtopleftbg2',
    'showfooter',
    'showtapdoanviettel',
    'showtapdoanviettel_en',
    'controlbarshowMenuControls',
    'controlbarCallOnStartTour',
    'showlanguague_en',
    'showlanguague_vi',
  ];

  let legacyBlockInstalled = false;

  function hideLayerCmd(name) {
    return `if(layer[${name}], set(layer[${name}].visible,false); set(layer[${name}].alpha,0); set(layer[${name}].enabled,false); );`;
  }

  function installLegacyUiBlock(k) {
    if (!k?.call || legacyBlockInstalled) return;
    legacyBlockInstalled = true;

    const hideBody =
      LEGACY_LAYERS.map((n) => hideLayerCmd(n)).join('') +
      'if(layer[locationTextField], set(layer[locationTextField].visible,false); set(layer[locationTextField].alpha,0); );';
    k.call(`def(hcmHideLegacyUi, ${hideBody} );`);

    LEGACY_SHOW_ACTIONS.forEach((action) => {
      k.call(`def(${action}, hcmHideLegacyUi(); );`);
    });

    k.set('events[hcmverseUi].keep', true);
    k.set('events[hcmverseUi].onTourStart', 'hcmHideLegacyUi();');
    k.set('events[hcmverseUi].onnewpano', 'hcmHideLegacyUi();');
    k.set('events[hcmverseUi].onloadcomplete', 'hcmHideLegacyUi();');

    k.call('hcmHideLegacyUi();');
    try {
      k.call('controlbarhideMenuControls();');
    } catch (_) {}
  }

  function hideOriginalChrome(k) {
    if (!k?.call) return;
    if (!legacyBlockInstalled) installLegacyUiBlock(k);
    else k.call('hcmHideLegacyUi();');
  }

  function hideLegacyDom() {
    const root = krpanoEl();
    if (!root) return;
    const re =
      /skin\/(header|phongtruyenthong|bottomright|img\.png|map_icon|location_bg|footer|topright)|icontrolbar/i;
    root.querySelectorAll('div, img').forEach((el) => {
      const bg = el.style?.backgroundImage || '';
      const src = el.getAttribute?.('src') || '';
      if (re.test(bg) || re.test(src)) {
        el.style.setProperty('display', 'none', 'important');
        el.style.setProperty('visibility', 'hidden', 'important');
        el.style.setProperty('opacity', '0', 'important');
        el.style.setProperty('pointer-events', 'none', 'important');
      }
    });
  }

  function resizePanoViewer() {
    const k = getKrpano();
    if (!k) return;
    try {
      if (typeof k.resize === 'function') k.resize();
    } catch (_) {}
    try {
      k.call('updatescreen();');
    } catch (_) {}
  }

  function applyTheme(k) {
    hideOriginalChrome(k);
    k.call('set(bgcolor, 0x05051a);');
    try {
      if (k.get('hotspotstyle.buttonstyle')) {
        k.set('hotspotstyle.buttonstyle.css', HOTSPOT_CSS);
      }
    } catch (_) {}
    resizePanoViewer();
  }

  function kCall(cmd) {
    const k = getKrpano();
    if (!k?.call) {
      console.warn('[HCMVERSE] krpano chưa sẵn sàng:', cmd);
      return false;
    }
    try {
      k.call(cmd);
      return true;
    } catch (e) {
      console.warn('[HCMVERSE] krpano call failed:', cmd, e);
      return false;
    }
  }

  function toggleLang() {
    state.lang = state.lang === 'vi' ? 'en' : 'vi';
    const btn = document.getElementById('hcm-lang-btn');
    if (btn) btn.textContent = state.lang === 'vi' ? 'ENGLISH' : 'TIẾNG VIỆT';
    if (window.egal?.languageChange) {
      window.egal.languageChange(state.lang);
    } else {
      kCall(state.lang === 'en' ? 'languague_enOnClick();' : 'languague_viOnClick();');
    }
    renderThumbs();
  }

  function updateAudioButtons() {
    document.getElementById('hcm-btn-sound')?.classList.toggle('is-on', state.soundOn);
    document.getElementById('hcm-btn-guide')?.classList.toggle('is-on', state.guideOn);
    const soundBtn = document.getElementById('hcm-btn-sound');
    const guideBtn = document.getElementById('hcm-btn-guide');
    if (soundBtn) {
      soundBtn.title = state.soundOn ? 'Tắt nhạc nền' : 'Bật nhạc nền';
      soundBtn.setAttribute('aria-pressed', state.soundOn ? 'true' : 'false');
    }
    if (guideBtn) {
      guideBtn.title = state.guideOn ? 'Tắt thuyết minh' : 'Bật thuyết minh';
      guideBtn.setAttribute('aria-pressed', state.guideOn ? 'true' : 'false');
    }
  }

  /** Chỉ cập nhật cờ krpano — không gọi action stop/play đầy đủ (tránh side-effect). */
  function setKrpanoSoundFlags(bgOn, guideOn) {
    const k = getKrpano();
    if (!k?.set) return;
    try {
      if (bgOn !== undefined) {
        k.set('tour_soundson', bgOn);
        k.set('plugin[data].soundOn', bgOn);
      }
      if (guideOn !== undefined) {
        k.set('tour_autoguide_soundson', guideOn);
        k.set('plugin[data].sound_autoguide_On', guideOn);
      }
    } catch (_) {}
  }

  /** Phát lại thuyết minh (sau khi tắt nhạc nền có thể bị krpano cắt chung track). */
  function resumeAutoguidePlayback() {
    if (!state.guideOn) return;
    if (typeof window.AUTOGUIDE_EXHIBITION !== 'undefined') {
      window.AUTOGUIDE_EXHIBITION = 'on';
    }
    setKrpanoSoundFlags(undefined, true);
    const keyId = String(window.EXHIBITION_KEY_ID || '20');
    if (window.egal?.playAutoguide) {
      window.egal.playAutoguide(keyId);
    } else {
      kCall('playAutoguideSound();');
    }
  }

  /**
   * Nhạc nền và thuyết minh tách riêng:
   * - Chỉ stopsound(backgroundsound), KHÔNG mute plugin (mute ảnh hưởng cả voice trên krpano 1.17).
   */
  function setBackgroundSound(on) {
    const shouldResumeGuide = !on && state.guideOn;
    state.soundOn = on;
    if (typeof window.SOUND_BG !== 'undefined') window.SOUND_BG = on ? 'on' : 'off';

    if (on) {
      setKrpanoSoundFlags(true, undefined);
      kCall('playBackgroundSound();');
    } else {
      kCall('stop_background_sound();');
      setKrpanoSoundFlags(false, undefined);
    }
    updateAudioButtons();

    if (shouldResumeGuide) {
      setTimeout(resumeAutoguidePlayback, 200);
    }
  }

  function setAutoguideSound(on) {
    state.guideOn = on;
    if (typeof window.AUTOGUIDE_EXHIBITION !== 'undefined') {
      window.AUTOGUIDE_EXHIBITION = on ? 'on' : 'off';
    }

    if (on) {
      setKrpanoSoundFlags(undefined, true);
      resumeAutoguidePlayback();
    } else {
      kCall('stopAutoguideSound();');
      setKrpanoSoundFlags(undefined, false);
    }
    updateAudioButtons();
  }

  function toggleSound() {
    setBackgroundSound(!state.soundOn);
  }

  function toggleGuide() {
    setAutoguideSound(!state.guideOn);
  }

  function syncAudioStateFromKrpano() {
    const k = getKrpano();
    if (!k?.get) return;
    try {
      const ts = k.get('tour_soundson');
      const tg = k.get('tour_autoguide_soundson');
      if (ts !== null && ts !== undefined && ts !== '') {
        state.soundOn = ts === true || ts === 'true' || ts === 1 || ts === '1';
      }
      if (tg !== null && tg !== undefined && tg !== '') {
        state.guideOn = tg === true || tg === 'true' || tg === 1 || tg === '1';
      }
    } catch (_) {}
    if (typeof window.SOUND_BG === 'string') state.soundOn = window.SOUND_BG === 'on';
    if (typeof window.AUTOGUIDE_EXHIBITION === 'string') {
      state.guideOn = window.AUTOGUIDE_EXHIBITION === 'on';
    }
    updateAudioButtons();
  }

  function toggleRotate() {
    state.rotateOn = !state.rotateOn;
    kCall(state.rotateOn ? 'startautorotation();' : 'stopautorotation();');
    document.getElementById('hcm-btn-rotate')?.classList.toggle('is-on', state.rotateOn);
  }

  function toggleFullscreen() {
    const k = getKrpano();
    let fs = false;
    try {
      fs = k?.get?.('fullscreen') === true || k?.get?.('device.fullscreen') === true;
    } catch (_) {}
    kCall(fs ? 'exitFullscreen();' : 'enterFullscreen();');
  }

  function toggleHelp() {
    const panel = document.getElementById('hcm-help-panel');
    panel?.classList.toggle('open');
  }

  function toggleControlPad() {
    document.getElementById('hcm-nav-pad')?.classList.toggle('open');
  }

  function bindPanoMove(btn, varName, valueOn) {
    const start = (e) => {
      e.preventDefault();
      kCall(`set(${varName}, ${valueOn});`);
    };
    const stop = (e) => {
      e.preventDefault();
      kCall(`set(${varName}, 0);`);
    };
    btn.addEventListener('mousedown', start);
    btn.addEventListener('touchstart', start, { passive: false });
    btn.addEventListener('mouseup', stop);
    btn.addEventListener('mouseleave', stop);
    btn.addEventListener('touchend', stop);
    btn.addEventListener('touchcancel', stop);
  }

  function toggleMap() {
    state.mapOpen = !state.mapOpen;
    if (state.mapOpen) kCall('show_map();');
    else closeMap();
    document.getElementById('hcm-btn-map')?.classList.toggle('is-on', state.mapOpen);
  }

  function closeMap() {
    state.mapOpen = false;
    kCall('close_map();');
    document.getElementById('hcm-btn-map')?.classList.remove('is-on');
  }

  function renderThumbs() {
    const box = document.getElementById('hcm-thumbs');
    if (!box) return;
    const picks = state.rooms.slice(0, 3);
    box.innerHTML = picks
      .map(
        (r, i) => `
      <button type="button" class="hcm-thumb" style="--i:${i}" title="${escapeAttr(r.title)}">
        <img src="${thumbUrl(r.thumbDir)}" alt="" loading="lazy" onerror="this.style.display='none'">
      </button>`
      )
      .join('');
    box.querySelectorAll('.hcm-thumb').forEach((btn, i) => {
      btn.addEventListener('click', () => goToRoom(picks[i]));
    });
  }

  function escapeAttr(s) {
    return String(s).replace(/"/g, '&quot;');
  }

  function buildRoomList() {
    const ul = document.getElementById('hcm-room-list');
    if (!ul) return;
    ul.innerHTML = state.rooms
      .map(
        (r) =>
          `<li><button type="button" data-loc="${escapeAttr(r.loc)}">${r.title}</button></li>`
      )
      .join('');
    ul.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', () => {
        const room = state.rooms.find((x) => x.loc === btn.dataset.loc);
        if (room) goToRoom(room);
      });
    });
  }

  function injectUi() {
    if (document.getElementById('hcmverse-ui')) return;

    const ui = document.createElement('div');
    ui.id = 'hcmverse-ui';
    ui.innerHTML = `
      <header class="hcm-top">
        <a class="hcm-top__brand" href="${homeUrl()}">
          <span class="hcm-top__logo"><img src="${LOGO}" alt="HCMVERSE"></span>
          <span class="hcm-top__brand-text">
            <span class="hcm-top__wordmark"><span class="hcm">HCM</span><span class="verse">VERSE</span></span>
            <span class="hcm-top__sub">Bảo tàng Hồ Chí Minh</span>
          </span>
        </a>
        <div class="hcm-top__title-wrap">
          <p id="hcm-top-title" class="hcm-top__title">${state.currentTitle}</p>
        </div>
        <button type="button" id="hcm-lang-btn" class="hcm-top__lang">ENGLISH</button>
      </header>

      <div id="hcm-thumbs" class="hcm-thumbs" aria-label="Phòng gợi ý"></div>

      <div class="hcm-badge">
        <span class="hcm-badge__main">HCMVERSE</span>
        <span class="hcm-badge__sub">Bảo tàng 360°</span>
      </div>

      <div class="hcm-bottom-right">
        <button type="button" id="hcm-btn-map" class="hcm-map-btn" title="Sơ đồ bảo tàng">
          <span class="hcm-map-btn__icon">🗺</span>
          <span class="hcm-map-btn__label">Sơ đồ</span>
        </button>
        <div class="hcm-controls" role="toolbar" aria-label="Điều khiển">
          <button type="button" id="hcm-btn-pad" class="hcm-ctl" title="Điều hướng">◎</button>
          <button type="button" id="hcm-btn-guide" class="hcm-ctl is-on" title="Thuyết minh">🎤</button>
          <button type="button" id="hcm-btn-sound" class="hcm-ctl is-on" title="Nhạc nền">♪</button>
          <button type="button" id="hcm-btn-rotate" class="hcm-ctl" title="Tự xoay">↻</button>
          <button type="button" id="hcm-btn-fs" class="hcm-ctl" title="Toàn màn hình">⛶</button>
          <button type="button" id="hcm-btn-help" class="hcm-ctl" title="Hướng dẫn">?</button>
        </div>
      </div>

      <button type="button" id="hcm-btn-rooms" class="hcm-rooms-fab" title="Danh sách phòng">☰ Phòng</button>

      <div id="hcm-nav-pad" class="hcm-nav-pad" aria-hidden="true">
        <button type="button" class="hcm-nav-pad__btn" data-pano="in" title="Phóng to">+</button>
        <button type="button" class="hcm-nav-pad__btn" data-pano="up" title="Lên">▲</button>
        <button type="button" class="hcm-nav-pad__btn" data-pano="out" title="Thu nhỏ">−</button>
        <button type="button" class="hcm-nav-pad__btn" data-pano="left" title="Trái">◀</button>
        <button type="button" class="hcm-nav-pad__btn hcm-nav-pad__btn--mid" data-pano="close" title="Đóng">✕</button>
        <button type="button" class="hcm-nav-pad__btn" data-pano="right" title="Phải">▶</button>
        <button type="button" class="hcm-nav-pad__btn" data-pano="down" title="Xuống">▼</button>
      </div>

      <div id="hcm-help-panel" class="hcm-help-panel">
        <p><strong>Điều khiển:</strong> kéo chuột / vuốt để xoay 360°.</p>
        <p><strong>◎</strong> Bàn phím di chuyển · <strong>♪</strong> Nhạc · <strong>🎤</strong> Thuyết minh</p>
        <p><strong>Sơ đồ</strong> / <strong>☰ Phòng</strong> để chuyển khu vực.</p>
        <button type="button" id="hcm-help-close">Đóng</button>
      </div>

      <div id="hcm-map-backdrop" class="hcm-map-backdrop"></div>
      <aside id="hcm-map-panel" class="hcm-side-panel">
        <div class="hcm-side-panel__head">
          <h2>Danh sách phòng</h2>
          <button type="button" class="hcm-side-close" data-close="map">✕</button>
        </div>
        <p class="hcm-side-panel__hint">Chọn phòng để nhảy tới panorama tương ứng.</p>
        <ul id="hcm-room-list" class="hcm-room-list"></ul>
      </aside>
    `;

    document.body.appendChild(ui);

    const padMap = {
      left: ['hlookat_moveforce', -1],
      right: ['hlookat_moveforce', 1],
      up: ['vlookat_moveforce', -1],
      down: ['vlookat_moveforce', 1],
      in: ['fov_moveforce', -1],
      out: ['fov_moveforce', 1],
    };
    ui.querySelectorAll('[data-pano]').forEach((btn) => {
      const key = btn.getAttribute('data-pano');
      if (key === 'close') {
        btn.addEventListener('click', () =>
          document.getElementById('hcm-nav-pad')?.classList.remove('open')
        );
        return;
      }
      const spec = padMap[key];
      if (spec) bindPanoMove(btn, spec[0], spec[1]);
    });

    document.getElementById('hcm-help-close')?.addEventListener('click', () => {
      document.getElementById('hcm-help-panel')?.classList.remove('open');
    });

    document.getElementById('hcm-lang-btn')?.addEventListener('click', toggleLang);
    document.getElementById('hcm-btn-map')?.addEventListener('click', toggleMap);
    document.getElementById('hcm-btn-pad')?.addEventListener('click', toggleControlPad);
    document.getElementById('hcm-btn-guide')?.addEventListener('click', toggleGuide);
    document.getElementById('hcm-btn-sound')?.addEventListener('click', toggleSound);
    document.getElementById('hcm-btn-rotate')?.addEventListener('click', toggleRotate);
    document.getElementById('hcm-btn-fs')?.addEventListener('click', toggleFullscreen);
    document.getElementById('hcm-btn-help')?.addEventListener('click', toggleHelp);
    document.getElementById('hcm-btn-rooms')?.addEventListener('click', () => {
      document.getElementById('hcm-map-panel')?.classList.toggle('open');
      document.getElementById('hcm-map-backdrop')?.classList.toggle('open');
    });
    document.querySelector('[data-close="map"]')?.addEventListener('click', () => {
      document.getElementById('hcm-map-panel')?.classList.remove('open');
      document.getElementById('hcm-map-backdrop')?.classList.remove('open');
      closeMap();
    });
    document.getElementById('hcm-map-backdrop')?.addEventListener('click', () => {
      document.getElementById('hcm-map-panel')?.classList.remove('open');
      document.getElementById('hcm-map-backdrop')?.classList.remove('open');
    });
  }

  function hookTitleSync(k) {
    if (typeof k.get !== 'function' || typeof k.set !== 'function') return;
    const hook = 'js(window.__hcmUiSync&&window.__hcmUiSync())';
    let prev = '';
    try {
      prev = k.get('events.onnewpano') || '';
    } catch (_) {}
    k.set('events.onnewpano', prev && prev !== 'null' ? `${prev};${hook}` : hook);
    window.__hcmUiSync = function () {
      const kk = getKrpano();
      if (kk) applyTheme(kk);
    };
  }

  function watchTheme(k) {
    let n = 0;
    const t = setInterval(() => {
      hideOriginalChrome(k);
      if (n === 0 || n === 5) hideLegacyDom();
      if (++n > 12) clearInterval(t);
    }, 400);
    if (!window.__hcmResizeBound) {
      window.__hcmResizeBound = true;
      window.addEventListener('resize', resizePanoViewer);
    }
    resizePanoViewer();
    setTimeout(resizePanoViewer, 800);
  }

  async function init() {
    document.title = 'HCMVERSE — Bảo tàng 3D Hồ Chí Minh';
    injectUi();

    const k = await krpanoReady;
    if (k) {
      installLegacyUiBlock(k);
      applyTheme(k);
      watchTheme(k);
      hookTitleSync(k);
    }

    await loadSceneMap();
    await loadRooms();
    renderThumbs();
    buildRoomList();

    if (!k) return;

    const intro =
      state.rooms.find((r) => r.keyId === '20') ||
      state.rooms.find((r) => r.panoId === 'pano180') ||
      state.rooms[0];
    if (intro) setTitle(intro.title);

    syncAudioStateFromKrpano();

    pollRoomTitle();
    setTimeout(hideLegacyDom, 1500);
  }

  function pollRoomTitle() {
    let last = '';
    setInterval(() => {
      const k = getKrpano();
      if (!k) return;
      try {
        const html = k.get('layer[locationTextField].html');
        if (!html || html === last) return;
        last = html;
        const text = String(html).replace(/<[^>]*>/g, '').trim();
        if (text) setTitle(text);
      } catch (_) {}
    }, 600);
  }

  const krpanoReady = waitKrpano(60000);
  init();
})();
