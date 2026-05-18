/**
 * HCMVERSE — Bình Thuận (Panotour / krpano krpanoSWFObject).
 * Mặc định bật; giao diện gốc: ?classic=1
 */
(function () {
  if (!document.documentElement.classList.contains('hcmverse-active')) return;

  const LOGO = '../assets/images/hero-museum.png';
  const state = {
    scenes: [],
    groups: [],
    menuOpen: false,
    mapOpen: false,
    padOpen: false,
    openZone: -1,
    currentScene: 'pano10',
    currentTitle: 'Bảo tàng Hồ Chí Minh — Bình Thuận',
  };

  let zoneCloseTimer = null;

  function homeUrl() {
    const p = location.pathname;
    const i = p.indexOf('/binhthuan-hcmverse');
    return i >= 0 ? p.slice(0, i + 1) || '/' : '../';
  }

  function getKrpano() {
    try {
      if (typeof window.getCurrentTourPlayer === 'function') {
        const el = window.getCurrentTourPlayer();
        if (el?.call) return el;
      }
    } catch (_) {}
    const el = document.getElementById('krpanoSWFObject');
    if (el?.call) return el;
    try {
      if (typeof window.krpano === 'function') {
        const k = window.krpano();
        if (k?.call) return k;
      }
    } catch (_) {}
    return null;
  }

  function kCall(cmd) {
    const k = getKrpano();
    if (!k?.call) return false;
    try {
      k.call(cmd);
      return true;
    } catch (e) {
      console.warn('[HCMVERSE-BT]', cmd, e);
      return false;
    }
  }

  function clickOrig(sel) {
    const el = document.querySelector(sel);
    if (el) {
      el.click();
      return true;
    }
    return false;
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

  function getActiveGroupIndex() {
    const cur = state.scenes.find((s) => s.id === state.currentScene);
    if (!cur) return 0;
    const idx = state.groups.findIndex((g) => g.groupTitle === cur.group);
    return idx >= 0 ? idx : 0;
  }

  function loadScene(id) {
    if (!id) return;
    state.currentScene = id;
    kCall(`loadscene(${id}, null, MERGE, BLEND(0.5));`);
    document.getElementById(id)?.click();
    syncTitleFromDom();
    renderThumbs();
    renderRoomList();
    renderZoneNav();
    closeZoneDropdown();
  }

  function syncTitleFromDom() {
    const t = document.querySelector('.pano_title')?.textContent?.trim();
    if (t) {
      state.currentTitle = t;
      const el = document.getElementById('hcm-top-title');
      if (el) el.textContent = t;
      renderZoneNav();
    }
  }

  function splitMenuColumns(items) {
    if (items.length <= 5) return [items];
    const mid = Math.ceil(items.length / 2);
    return [items.slice(0, mid), items.slice(mid)];
  }

  function defaultThumbForGroup(g) {
    const cur = g.items.find((s) => s.id === state.currentScene);
    const pick = cur || g.items[0];
    return pick?.thumb || 'Tour360data/thumbnail.jpg';
  }

  function closeZoneDropdown() {
    state.openZone = -1;
    document.querySelectorAll('.hcm-zone-item.is-open').forEach((el) => {
      el.classList.remove('is-open');
    });
    document.querySelectorAll('.hcm-zone-tab[aria-expanded]').forEach((tab) => {
      tab.setAttribute('aria-expanded', 'false');
    });
  }

  function openZoneDropdown(zoneIndex) {
    if (zoneCloseTimer) {
      clearTimeout(zoneCloseTimer);
      zoneCloseTimer = null;
    }
    state.openZone = zoneIndex;
    document.querySelectorAll('.hcm-zone-item').forEach((el, i) => {
      el.classList.toggle('is-open', i === zoneIndex);
    });
    document.querySelectorAll('.hcm-zone-tab').forEach((tab, i) => {
      tab.setAttribute('aria-expanded', i === zoneIndex ? 'true' : 'false');
    });
  }

  function scheduleCloseZoneDropdown() {
    if (zoneCloseTimer) clearTimeout(zoneCloseTimer);
    zoneCloseTimer = setTimeout(closeZoneDropdown, 280);
  }

  function renderDropSceneBtn(s) {
    return `<li>
      <button type="button" class="hcm-zone-drop__link${
        s.id === state.currentScene ? ' is-active' : ''
      }" data-scene="${escapeAttr(s.id)}" data-thumb="${escapeAttr(
      s.thumb || ''
    )}">${escapeAttr(s.title)}<span class="hcm-zone-drop__arrow" aria-hidden="true">›</span></button>
    </li>`;
  }

  function renderZoneDrop(g, zoneIndex) {
    const cols = splitMenuColumns(g.items);
    const isDouble = cols.length > 1;
    const thumb = defaultThumbForGroup(g);
    return `
      <div class="hcm-zone-drop" data-zone-drop="${zoneIndex}">
        <div class="hcm-zone-drop__panel${isDouble ? ' is-wide' : ''}">
          <div class="hcm-zone-drop__cols">
            ${cols
              .map(
                (col) => `
            <ul class="hcm-zone-drop__col">
              ${col.map((s) => renderDropSceneBtn(s)).join('')}
            </ul>`
              )
              .join('')}
          </div>
          <div class="hcm-zone-drop__preview">
            <img src="${escapeAttr(thumb)}" alt="" loading="lazy" data-zone-preview="${zoneIndex}" />
          </div>
        </div>
      </div>`;
  }

  function parseScenesFromDom() {
    const groups = [];
    document.querySelectorAll('.menu_item_bg').forEach((groupEl) => {
      const groupTitle =
        groupEl.querySelector('.menu_item')?.textContent?.trim() || 'Khác';
      const items = [];
      groupEl.querySelectorAll('.sub_menu_item[id^="pano"]').forEach((a) => {
        const id = a.id;
        if (!id) return;
        items.push({
          id,
          title: a.textContent?.trim() || id,
          thumb: a.getAttribute('data-thumb') || '',
          group: groupTitle,
        });
      });
      if (items.length) groups.push({ groupTitle, items });
    });
    state.groups = groups;
    state.scenes = groups.flatMap((g) => g.items);
  }

  function escapeAttr(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;');
  }

  function shortZoneLabel(title) {
    const t = String(title || '').toLowerCase();
    if (t.includes('dục thanh')) return 'Dục Thanh';
    if (t.includes('trưng bày')) return 'Trưng bày';
    if (t.includes('toàn cảnh') || t.includes('bảo tàng')) return 'Bảo tàng';
    return title.length > 16 ? `${title.slice(0, 14)}…` : title;
  }

  function renderRoomList() {
    const ul = document.getElementById('hcm-room-list');
    if (!ul) return;
    ul.innerHTML = state.groups
      .map(
        (g) => `
      <section>
        <h3>${escapeAttr(g.groupTitle)}</h3>
        <ul>
          ${g.items
            .map(
              (s) => `
            <li>
              <button type="button" class="${s.id === state.currentScene ? 'is-active' : ''}"
                data-scene="${escapeAttr(s.id)}">${escapeAttr(s.title)}</button>
            </li>`
            )
            .join('')}
        </ul>
      </section>`
      )
      .join('');
    ul.querySelectorAll('[data-scene]').forEach((btn) => {
      btn.addEventListener('click', () => {
        loadScene(btn.getAttribute('data-scene'));
        closeRoomsPanel();
      });
    });
  }

  function bindZoneNav() {
    const nav = document.getElementById('hcm-zone-nav');
    if (!nav) return;

    nav.querySelectorAll('.hcm-zone-item').forEach((item) => {
      const zone = Number(item.getAttribute('data-zone'));
      const tab = item.querySelector('.hcm-zone-tab');
      const drop = item.querySelector('.hcm-zone-drop');

      item.addEventListener('mouseenter', () => openZoneDropdown(zone));
      item.addEventListener('mouseleave', scheduleCloseZoneDropdown);
      drop?.addEventListener('mouseenter', () => openZoneDropdown(zone));
      drop?.addEventListener('mouseleave', scheduleCloseZoneDropdown);

      tab?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (state.openZone === zone) {
          closeZoneDropdown();
          return;
        }
        openZoneDropdown(zone);
        const g = state.groups[zone];
        const inGroup = g?.items?.some((s) => s.id === state.currentScene);
        if (!inGroup && g?.items?.[0]) loadScene(g.items[0].id);
      });
    });

    nav.querySelectorAll('.hcm-zone-drop__link').forEach((btn) => {
      btn.addEventListener('mouseenter', () => {
        const thumb = btn.getAttribute('data-thumb');
        const zone = btn.closest('.hcm-zone-item')?.getAttribute('data-zone');
        if (!thumb || zone == null) return;
        const img = nav.querySelector(`[data-zone-preview="${zone}"]`);
        if (img) img.src = thumb;
      });
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        loadScene(btn.getAttribute('data-scene'));
        closeZoneDropdown();
      });
    });
  }

  function renderZoneNav() {
    const nav = document.getElementById('hcm-zone-nav');
    if (!nav || !state.groups.length) return;
    const activeIdx = getActiveGroupIndex();
    const wasOpen = state.openZone;

    nav.innerHTML = state.groups
      .map(
        (g, i) => `
      <div class="hcm-zone-item${i === activeIdx ? ' is-active-zone' : ''}${
          wasOpen === i ? ' is-open' : ''
        }" data-zone="${i}">
        <button type="button" class="hcm-zone-tab${i === activeIdx ? ' is-active' : ''}"
          aria-label="${escapeAttr(g.groupTitle)}"
          aria-haspopup="true"
          aria-expanded="${wasOpen === i ? 'true' : 'false'}">
          <span class="hcm-zone-tab__text">${escapeAttr(shortZoneLabel(g.groupTitle))}</span>
          <span class="hcm-zone-tab__caret" aria-hidden="true">▾</span>
        </button>
        ${renderZoneDrop(g, i)}
      </div>`
      )
      .join('');

    bindZoneNav();
  }

  function renderThumbs() {
    const wrap = document.getElementById('hcm-thumbs');
    if (wrap) wrap.innerHTML = '';
  }

  function closeRoomsPanel() {
    state.menuOpen = false;
    document.getElementById('hcm-map-panel')?.classList.remove('open');
    document.getElementById('hcm-map-backdrop')?.classList.remove('open');
  }

  function toggleRoomsPanel() {
    const open = !document.getElementById('hcm-map-panel')?.classList.contains('open');
    document.getElementById('hcm-map-panel')?.classList.toggle('open', open);
    document.getElementById('hcm-map-backdrop')?.classList.toggle('open', open);
  }

  function toggleMap() {
    state.mapOpen = !state.mapOpen;
    kCall('toggleKolorArea_panotourmapsArea();');
    document.getElementById('hcm-btn-map')?.classList.toggle('is-on', state.mapOpen);
  }

  function toggleControlPad() {
    state.padOpen = !state.padOpen;
    document.getElementById('hcm-nav-pad')?.classList.toggle('open', state.padOpen);
  }

  function toggleLang() {
    document.querySelector('.lang_menu_bg .en')?.click();
  }

  function resizePano() {
    try {
      getKrpano()?.resize?.();
    } catch (_) {}
    try {
      kCall('updatescreen();');
    } catch (_) {}
  }

  function buildUi() {
    if (document.getElementById('hcmverse-ui')) return;

    const ui = document.createElement('div');
    ui.id = 'hcmverse-ui';
    ui.innerHTML = `
      <header class="hcm-top hcm-top--zones">
        <a class="hcm-top__brand" href="${homeUrl()}">
          <span class="hcm-top__logo"><img src="${LOGO}" alt="HCMVERSE" /></span>
          <span class="hcm-top__brand-text">
            <span class="hcm-top__wordmark"><span class="hcm">HCM</span><span class="verse">VERSE</span></span>
            <span class="hcm-top__sub">Bình Thuận</span>
          </span>
        </a>
        <div class="hcm-top__title-wrap hcm-top__zones-wrap">
          <div id="hcm-zone-nav" class="hcm-zone-nav" role="navigation" aria-label="Khu vực tham quan"></div>
        </div>
        <button type="button" id="hcm-lang-btn" class="hcm-top__lang">EN / VI</button>
      </header>
      <p id="hcm-top-title" class="hcm-scene-title" hidden>${escapeAttr(state.currentTitle)}</p>
      <div id="hcm-thumbs" class="hcm-thumbs"></div>
      <div class="hcm-badge">
        <span class="hcm-badge__main">HCMVERSE</span>
        <span class="hcm-badge__sub">Bình Thuận 360°</span>
      </div>
      <div class="hcm-bottom-right">
        <button type="button" id="hcm-btn-map" class="hcm-map-btn" title="Bản đồ Google">
          <span class="hcm-map-btn__icon">🗺</span>
          <span class="hcm-map-btn__label">Sơ đồ</span>
        </button>
        <div class="hcm-controls">
          <button type="button" id="hcm-btn-pad" class="hcm-ctl" title="Điều hướng">◎</button>
          <button type="button" id="hcm-btn-guide" class="hcm-ctl is-on" title="Thuyết minh">🎤</button>
          <button type="button" id="hcm-btn-sound" class="hcm-ctl is-on" title="Nhạc nền">♪</button>
          <button type="button" id="hcm-btn-rotate" class="hcm-ctl" title="Tự xoay">↻</button>
          <button type="button" id="hcm-btn-fs" class="hcm-ctl" title="Toàn màn hình">⛶</button>
          <button type="button" id="hcm-btn-help" class="hcm-ctl" title="Hướng dẫn">?</button>
        </div>
      </div>
      <button type="button" id="hcm-btn-rooms" class="hcm-rooms-fab">☰ Phòng</button>
      <div id="hcm-nav-pad" class="hcm-nav-pad">
        <button type="button" class="hcm-nav-pad__btn" data-pano="in">+</button>
        <button type="button" class="hcm-nav-pad__btn" data-pano="up">▲</button>
        <button type="button" class="hcm-nav-pad__btn" data-pano="out">−</button>
        <button type="button" class="hcm-nav-pad__btn" data-pano="left">◀</button>
        <button type="button" class="hcm-nav-pad__btn hcm-nav-pad__btn--mid" data-pano="close">✕</button>
        <button type="button" class="hcm-nav-pad__btn" data-pano="right">▶</button>
        <button type="button" class="hcm-nav-pad__btn" data-pano="down">▼</button>
      </div>
      <div id="hcm-help-panel" class="hcm-help-panel">
        <p><strong>Điều khiển:</strong> kéo chuột / vuốt để xoay 360°.</p>
        <p><strong>◎</strong> Di chuyển · <strong>♪</strong> Nhạc · <strong>🎤</strong> Thuyết minh</p>
        <p><strong>Sơ đồ</strong> bản đồ · <strong>☰ Phòng</strong> chuyển khu vực.</p>
        <button type="button" id="hcm-help-close">Đóng</button>
      </div>
      <div id="hcm-map-backdrop" class="hcm-map-backdrop"></div>
      <aside id="hcm-map-panel" class="hcm-side-panel">
        <div class="hcm-side-panel__head">
          <h2>Danh sách phòng</h2>
          <button type="button" class="hcm-side-close" data-close="map">✕</button>
        </div>
        <div id="hcm-room-list" class="hcm-room-list"></div>
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

    document.getElementById('hcm-lang-btn')?.addEventListener('click', (e) => {
      e.preventDefault();
      toggleLang();
    });
    document.getElementById('hcm-btn-map')?.addEventListener('click', (e) => {
      e.preventDefault();
      toggleMap();
    });
    document.getElementById('hcm-btn-pad')?.addEventListener('click', toggleControlPad);
    document.getElementById('hcm-btn-sound')?.addEventListener('click', () => {
      clickOrig('.control_btn.sound');
      document.getElementById('hcm-btn-sound')?.classList.toggle('is-on');
    });
    document.getElementById('hcm-btn-guide')?.addEventListener('click', () => {
      clickOrig('.control_btn.guide');
      document.getElementById('hcm-btn-guide')?.classList.toggle('is-on');
    });
    document.getElementById('hcm-btn-rotate')?.addEventListener('click', () => {
      clickOrig('.control_btn.auto_rotation');
      document.getElementById('hcm-btn-rotate')?.classList.toggle('is-on');
    });
    document.getElementById('hcm-btn-fs')?.addEventListener('click', () =>
      clickOrig('.control_btn.fullscreen')
    );
    document.getElementById('hcm-btn-help')?.addEventListener('click', () => {
      document.getElementById('hcm-help-panel')?.classList.toggle('open');
    });
    document.getElementById('hcm-help-close')?.addEventListener('click', () => {
      document.getElementById('hcm-help-panel')?.classList.remove('open');
    });
    document.getElementById('hcm-btn-rooms')?.addEventListener('click', toggleRoomsPanel);
    document.querySelector('[data-close="map"]')?.addEventListener('click', closeRoomsPanel);
    document.getElementById('hcm-map-backdrop')?.addEventListener('click', closeRoomsPanel);
  }

  function suppressPanotourChrome() {
    document
      .querySelectorAll(
        '.title_bg, .pano_title, .master_pano_link_bg, .sub_menu_bg, .menu_thumb_bg'
      )
      .forEach((el) => {
        el.style.setProperty('display', 'none', 'important');
      });
  }

  async function init() {
    document.querySelector('.loading')?.style.setProperty('display', 'none', 'important');

    parseScenesFromDom();
    buildUi();
    renderZoneNav();
    renderThumbs();

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.hcm-zone-item')) closeZoneDropdown();
    });
    renderRoomList();

    await new Promise((resolve) => {
      const t0 = Date.now();
      (function tick() {
        if (getKrpano()) return resolve();
        if (Date.now() - t0 > 90000) return resolve();
        setTimeout(tick, 200);
      })();
    });

    suppressPanotourChrome();
    syncTitleFromDom();
    setInterval(() => {
      syncTitleFromDom();
      suppressPanotourChrome();
    }, 800);
    window.addEventListener('resize', resizePano);
    setTimeout(resizePano, 800);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 400));
  } else {
    setTimeout(init, 400);
  }
})();
