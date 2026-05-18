/**
 * HCMVERSE — giao diện tour Phủ Chủ Tịch 3D (layout gốc, branding HCMVERSE).
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
    /** vi = giọng nam, en = giọng nữ (thư mục autoguide gốc en/vi). */
    guideVoice: 'vi',
    soundOn: true,
    rotateOn: false,
    guideOn: true,
    mapOpen: false,
    currentTitle: 'Phủ Chủ Tịch',
    panoDirs: {},
  };

  function homeUrl() {
    const p = location.pathname;
    const i = p.indexOf('/phuchutich-egal');
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

  async function loadPanoDirs() {
    try {
      const res = await fetch('virtualmuseumdata/virtualmuseum_final.xml');
      const xml = await res.text();
      for (const block of xml.split(/<scene name="/).slice(1)) {
        const idM = block.match(/^([^"]+)"/);
        if (!idM) continue;
        const thumbM = block.match(/thumburl="%FIRSTXML%\/([^"]+)"/i);
        if (thumbM) {
          state.panoDirs[idM[1]] = thumbM[1].replace(/\/thumbnail\.jpg$/i, '');
        }
      }
    } catch (e) {
      console.warn('[HCMVERSE] pano dirs', e);
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
        if (!action || !title) return;
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
        const thumbDir = findThumbDir(action, panoId);
        rooms.push({ keyId, panoId, loc, title, thumbDir });
      });
      state.rooms = rooms;
    } catch (e) {
      console.warn('[HCMVERSE] exhibition', e);
    }
  }

  /** Bỏ đường dẫn fallback sai từ bản bảo tàng (_20_1_N). */
  function normalizeThumbDir(dir) {
    if (!dir || typeof dir !== 'string') return null;
    const d = dir.replace(/\\/g, '/').replace(/^\/+/, '');
    if (!d || /^_20_1_\d+$/i.test(d)) return null;
    return d;
  }

  function findThumbDir(action, panoId) {
    return (
      normalizeThumbDir(state.panoDirs[action]) ||
      normalizeThumbDir(state.panoDirs[panoId]) ||
      null
    );
  }

  function thumbUrl(dir) {
    const d = normalizeThumbDir(dir);
    if (!d) return '';
    return `virtualmuseumdata/${d}/thumbnail.jpg`;
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
    if (state.mapOpen) closeMap();
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
    'locationTextField',
    'tapdoanviettel',
    'tapdoanviettel_en',
    'toprightbg',
    'languague_en',
    'languague_vi',
    'mapicon',
    'footer',
    'gioithieu',
    'gioithieu_en',
    'gioithieu_point',
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
    if (state.mapOpen) return;
    const root = krpanoEl();
    if (!root) return;
    const re =
      /skin\/(header|phongtruyenthong|bottomright|img\.png|map_icon|location_bg|footer|intro_btn|topright)|icontrolbar/i;
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
    k.call('set(bgcolor, 0x000000);');
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

  function refreshHeaderTitle() {
    const keyId = String(window.EXHIBITION_KEY_ID ?? '0');
    if (!window.EXHIBITION_XML || !window.jQuery) return;
    try {
      const sec = window
        .jQuery(EXHIBITION_XML)
        .find(`exhibition SectionCollection Section[key_id=${keyId}]`);
      const title = sec.find('title vi').text()?.trim() || '';
      if (title) setTitle(title);
    } catch (_) {}
  }

  function guideVoiceBtnLabel() {
    return state.guideVoice === 'vi' ? 'GIỌNG NỮ' : 'GIỌNG NAM';
  }

  /** Đổi bản thuyết minh (nam ↔ nữ), không đổi ngôn ngữ giao diện. */
  function applyGuideVoice(voice) {
    const next = voice === 'en' ? 'en' : 'vi';
    state.guideVoice = next;
    window.LANG = next;

    const btn = document.getElementById('hcm-lang-btn');
    if (btn) {
      btn.textContent = guideVoiceBtnLabel();
      btn.title =
        next === 'vi'
          ? 'Chuyển sang giọng nữ thuyết minh'
          : 'Chuyển sang giọng nam thuyết minh';
    }

    if (window.egal?.languageChange) {
      window.egal.languageChange(next);
    } else {
      kCall(next === 'en' ? 'languague_enOnClick();' : 'languague_viOnClick();');
    }
  }

  function toggleGuideVoice() {
    applyGuideVoice(state.guideVoice === 'vi' ? 'en' : 'vi');
  }

  function syncGuideVoiceButton() {
    if (typeof window.LANG === 'string') {
      state.guideVoice = window.LANG === 'en' ? 'en' : 'vi';
    }
    const btn = document.getElementById('hcm-lang-btn');
    if (btn) btn.textContent = guideVoiceBtnLabel();
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
    const keyId = String(window.EXHIBITION_KEY_ID ?? '1');
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

  /** Điểm trên sơ đồ (tọa độ % từ skin.xml gốc). */
  const FLOOR_MAP_SPOTS = [
    { loc: '0', x: 39, y: 62, title: 'Giới thiệu' },
    { loc: '1_2', x: 54.3, y: 36.2, title: 'Phủ Chủ tịch' },
    { loc: '2_1', x: 24, y: 41, title: 'Nhà 54' },
    { loc: '3_1', x: 28.5, y: 25, title: 'Nhà sàn' },
    { loc: '4_1', x: 32, y: 31, title: 'Nhà 67' },
    { loc: '5_2', x: 14.8, y: 12.35, title: 'Phòng họp' },
    { loc: '6_1', x: 30.5, y: 28, title: 'Phòng y tế' },
    { loc: '7_2', x: 19, y: 21.5, title: 'Nhà xe' },
    { loc: '8_1', x: 21.8, y: 31.5, title: 'Ao cá' },
    { loc: '9_1', x: 41, y: 40.2, title: 'Đường xoài' },
    { loc: '10', x: 53, y: 29.5, title: 'Gian hoa' },
    { loc: '11_3', x: 12.7, y: 37, title: 'Vườn cây' },
    { loc: '12', x: 35.7, y: 50.4, title: 'Cây đa' },
  ];

  function floorMapImage() {
    return 'virtualmuseumdata/skin/phuchutichmap.jpg';
  }

  function goToLoc(loc) {
    if (window.egal?.viewPano) {
      try {
        window.egal.viewPano(loc);
        enforceAudioPrefsAfterSceneChange();
        return;
      } catch (e) {
        console.warn('[HCMVERSE] viewPano', loc, e);
      }
    }
    const room =
      state.rooms.find((r) => r.loc === loc) ||
      state.rooms.find((r) => r.keyId === String(loc).split('_')[0]) ||
      { loc, title: '' };
    goToRoom({ ...room, loc });
  }

  function openMap() {
    state.mapOpen = true;
    document.getElementById('hcm-map-panel')?.classList.remove('open');
    document.getElementById('hcm-map-backdrop')?.classList.remove('open');
    const floor = document.getElementById('hcm-floor-map');
    const img = document.getElementById('hcm-floor-map-img');
    if (img) img.src = floorMapImage();
    floor?.classList.add('open');
    floor?.setAttribute('aria-hidden', 'false');
    kCall('hideFloorplan();');
    kCall('showmapfloor();');
    document.getElementById('hcm-btn-map')?.classList.add('is-on');
  }

  function closeMap() {
    state.mapOpen = false;
    const floor = document.getElementById('hcm-floor-map');
    floor?.classList.remove('open');
    floor?.setAttribute('aria-hidden', 'true');
    kCall('set(layer[zoom_floor].visible,false);');
    kCall('set(layer[zoom_floor_bg].visible,false);');
    kCall('hideFloorplan();');
    document.getElementById('hcm-btn-map')?.classList.remove('is-on');
  }

  function toggleMap() {
    if (state.mapOpen) closeMap();
    else openMap();
  }

  function renderThumbs() {
    const box = document.getElementById('hcm-thumbs');
    if (!box) return;
    const withThumb = state.rooms.filter((r) => r.thumbDir);
    const picks = withThumb.slice(0, 3);
    if (!picks.length) return;
    box.innerHTML = picks
      .map(
        (r, i) => {
          const src = thumbUrl(r.thumbDir);
          const img = src
            ? `<img src="${src}" alt="" loading="lazy" onerror="this.style.display='none'">`
            : '';
          return `
      <button type="button" class="hcm-thumb" style="--i:${i}" title="${escapeAttr(r.title)}">
        ${img}
      </button>`;
        }
      )
      .join('');
    box.querySelectorAll('.hcm-thumb').forEach((btn, i) => {
      btn.addEventListener('click', () => goToRoom(picks[i]));
    });
  }

  function escapeAttr(s) {
    return String(s).replace(/"/g, '&quot;');
  }

  function buildFloorMapSpots() {
    const box = document.getElementById('hcm-floor-map-spots');
    if (!box) return;
    box.innerHTML = FLOOR_MAP_SPOTS.map(
      (s) =>
        `<button type="button" class="hcm-floor-map__spot" style="left:${s.x}%;top:${s.y}%" title="${escapeAttr(s.title)}" data-loc="${escapeAttr(s.loc)}" aria-label="${escapeAttr(s.title)}"></button>`
    ).join('');
    box.querySelectorAll('.hcm-floor-map__spot').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeMap();
        goToLoc(btn.dataset.loc);
      });
    });
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
            <span class="hcm-top__sub">Phủ Chủ Tịch</span>
          </span>
        </a>
        <div class="hcm-top__title-wrap">
          <p id="hcm-top-title" class="hcm-top__title">${state.currentTitle}</p>
        </div>
        <button type="button" id="hcm-lang-btn" class="hcm-top__lang" title="Chuyển sang giọng nữ thuyết minh">GIỌNG NỮ</button>
      </header>

      <div id="hcm-thumbs" class="hcm-thumbs" aria-label="Phòng gợi ý"></div>

      <div class="hcm-badge">
        <span class="hcm-badge__main">HCMVERSE</span>
        <span class="hcm-badge__sub">Khu di tích 360°</span>
      </div>

      <div class="hcm-bottom-right">
        <button type="button" id="hcm-btn-map" class="hcm-map-btn" title="Sơ đồ khu di tích">
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
      <div id="hcm-floor-map" class="hcm-floor-map" aria-hidden="true" role="dialog" aria-label="Sơ đồ khu di tích">
        <div class="hcm-floor-map__backdrop" data-close-floor-map></div>
        <div class="hcm-floor-map__box">
          <img id="hcm-floor-map-img" src="virtualmuseumdata/skin/phuchutichmap.jpg" alt="Sơ đồ Phủ Chủ Tịch" />
          <div class="hcm-floor-map__spots" id="hcm-floor-map-spots"></div>
          <button type="button" class="hcm-floor-map__close" data-close-floor-map title="Đóng sơ đồ">✕</button>
        </div>
      </div>
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

    document.getElementById('hcm-lang-btn')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleGuideVoice();
    });
    document.getElementById('hcm-btn-map')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleMap();
    });
    ui.querySelectorAll('[data-close-floor-map]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        closeMap();
      });
    });
    buildFloorMapSpots();
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
    document.title = 'HCMVERSE — Tham quan 3D Phủ Chủ Tịch';
    injectUi();

    const k = await krpanoReady;
    if (k) {
      installLegacyUiBlock(k);
      applyTheme(k);
      watchTheme(k);
      hookTitleSync(k);
    }

    await loadSceneMap();
    await loadPanoDirs();
    await loadRooms();
    renderThumbs();
    buildRoomList();

    if (!k) return;

    for (let i = 0; i < 40 && !window.EXHIBITION_XML; i++) {
      await new Promise((r) => setTimeout(r, 150));
    }
    syncGuideVoiceButton();
    refreshHeaderTitle();

    const intro =
      state.rooms.find((r) => r.keyId === '0') ||
      state.rooms.find((r) => r.panoId === 'pano7601') ||
      state.rooms[0];
    if (intro && !window.EXHIBITION_XML) setTitle(intro.title);
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
