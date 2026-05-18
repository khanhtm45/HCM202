/**
 * HCMVERSE — scene WebGL (Three.js) cho đường hầm timeline & phòng hiện vật.
 */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js';

const CYAN = 0x00d2ff;
const PURPLE = 0xbf00ff;
const BG = 0x05051a;

function hostSize(host) {
  const w = host.clientWidth || host.parentElement?.clientWidth || 800;
  const h = host.clientHeight || Math.min(480, window.innerHeight * 0.55);
  return { w: Math.max(320, w), h: Math.max(280, h) };
}

function bindResize(host, renderer, camera) {
  const onResize = () => {
    const { w, h } = hostSize(host);
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  window.addEventListener('resize', onResize);
  onResize();
  return onResize;
}

function makeLabelSprite(text, sub) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = sub ? 200 : 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(5,5,26,0.75)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#00e5ff';
  ctx.font = 'bold 56px Orbitron, Montserrat, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(text, 256, 72);
  if (sub) {
    ctx.fillStyle = '#9aa8b8';
    ctx.font = '22px Montserrat, sans-serif';
    const words = sub.split(' ');
    let line = '';
    let y = 110;
    for (const w of words) {
      const test = line + w + ' ';
      if (ctx.measureText(test).width > 460 && line) {
        ctx.fillText(line, 256, y);
        line = w + ' ';
        y += 28;
      } else line = test;
    }
    if (line) ctx.fillText(line.trim(), 256, y);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(3.2, sub ? 1.4 : 0.9, 1);
  return sprite;
}

/** Đường hầm thời gian 3D — cuộn tiến, bấm cột mốc. */
export function createTimelineTunnel(host, items, onSelect) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);
  scene.fog = new THREE.FogExp2(BG, 0.028);

  const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 180);
  camera.position.set(0, 2.2, 10);

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.appendChild(renderer.domElement);
  renderer.domElement.className = 'webgl-canvas';
  renderer.domElement.setAttribute('aria-label', 'Đường hầm thời gian 3D');

  scene.add(new THREE.AmbientLight(0x334466, 0.65));
  const key = new THREE.DirectionalLight(0xffffff, 0.9);
  key.position.set(2, 8, 6);
  scene.add(key);
  const accent = new THREE.PointLight(CYAN, 2.2, 35);
  accent.position.set(0, 3, 4);
  scene.add(accent);
  const accent2 = new THREE.PointLight(PURPLE, 1.4, 35);
  accent2.position.set(-4, 2, -15);
  scene.add(accent2);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(14, items.length * 14 + 40),
    new THREE.MeshStandardMaterial({ color: 0x0a1530, metalness: 0.2, roughness: 0.85 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  floor.position.z = -(items.length * 7 + 5);
  scene.add(floor);

  const loader = new THREE.TextureLoader();
  const pickables = [];
  const spacing = 11;

  items.forEach((item, i) => {
    const z = -i * spacing - 6;

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(2.4, 0.07, 10, 48),
      new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: 0.45 })
    );
    ring.position.set(0, 1.8, z);
    ring.rotation.x = Math.PI / 2;
    scene.add(ring);

    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.9, 1.1, 0.5, 24),
      new THREE.MeshStandardMaterial({ color: 0x152238, metalness: 0.4, roughness: 0.5 })
    );
    pedestal.position.set(0, 0.25, z);
    scene.add(pedestal);

    const portal = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 2.6, 0.2),
      new THREE.MeshStandardMaterial({
        color: 0x1a3050,
        emissive: 0x001833,
        metalness: 0.35,
        roughness: 0.55,
      })
    );
    portal.position.set(0, 1.6, z);
    portal.userData = { item, kind: 'milestone' };
    scene.add(portal);
    pickables.push(portal);

    const url = item.media?.local || item.media?.url || item.mediaImage?.local || item.mediaImage?.url;
    if (url) {
      loader.load(
        url,
        (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          const frame = new THREE.Mesh(
            new THREE.PlaneGeometry(2, 1.35),
            new THREE.MeshBasicMaterial({ map: tex })
          );
          frame.position.set(0, 1.65, z + 0.12);
          scene.add(frame);
        },
        undefined,
        () => {}
      );
    }

    const label = makeLabelSprite(item.year, item.title);
    label.position.set(0, 3.2, z);
    scene.add(label);

    for (let s = 0; s < 8; s++) {
      const seg = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.08, spacing * 0.9),
        new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: 0.12 })
      );
      seg.position.set((s % 2 ? 3.5 : -3.5), 2.5, z - spacing / 2);
      scene.add(seg);
    }
  });

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.target.set(0, 1.8, -6);
  controls.maxPolarAngle = Math.PI * 0.48;
  controls.minPolarAngle = Math.PI * 0.18;
  controls.minDistance = 4;
  controls.maxDistance = 28;

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let travel = 0;
  const maxTravel = (items.length - 1) * spacing * 0.55;

  function setPointer(e) {
    const r = renderer.domElement.getBoundingClientRect();
    pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1;
  }

  function highlight(mesh) {
    pickables.forEach((m) => {
      m.material.emissive.setHex(m === mesh ? 0x113355 : 0x001833);
    });
    renderer.domElement.style.cursor = mesh ? 'pointer' : 'grab';
  }

  function onMove(e) {
    setPointer(e);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(pickables, false);
    highlight(hits[0]?.object || null);
  }

  function onClick(e) {
    setPointer(e);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(pickables, false);
    if (hits[0]?.object?.userData?.item) onSelect(hits[0].object.userData.item);
  }

  const onWheel = (e) => {
    e.preventDefault();
    travel = THREE.MathUtils.clamp(travel + e.deltaY * 0.02, 0, maxTravel);
    camera.position.z = 10 - travel;
    controls.target.z = -6 - travel;
  };

  renderer.domElement.addEventListener('pointermove', onMove);
  renderer.domElement.addEventListener('click', onClick);
  renderer.domElement.addEventListener('wheel', onWheel, { passive: false });

  const offResize = bindResize(host, renderer, camera);
  let rid;
  const clock = new THREE.Clock();
  const animate = () => {
    rid = requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    accent.intensity = 2 + Math.sin(t * 2) * 0.3;
    controls.update();
    renderer.render(scene, camera);
  };
  animate();

  return () => {
    cancelAnimationFrame(rid);
    window.removeEventListener('resize', offResize);
    renderer.domElement.removeEventListener('pointermove', onMove);
    renderer.domElement.removeEventListener('click', onClick);
    renderer.domElement.removeEventListener('wheel', onWheel);
    controls.dispose();
    renderer.dispose();
    host.innerHTML = '';
  };
}

/** Phòng hiện vật 3D — bệ đỡ quanh vòng, orbit quanh hiện vật đang chọn. */
export function createArtifactHall(host, artifacts, onSelect) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);
  scene.fog = new THREE.FogExp2(BG, 0.04);

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 80);
  camera.position.set(0, 3.5, 7);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.appendChild(renderer.domElement);
  renderer.domElement.className = 'webgl-canvas';

  scene.add(new THREE.AmbientLight(0x445566, 0.7));
  const spot = new THREE.SpotLight(0xffffff, 1.2);
  spot.position.set(5, 10, 5);
  spot.angle = 0.4;
  scene.add(spot);
  const fill = new THREE.PointLight(CYAN, 1.5, 20);
  fill.position.set(0, 4, 0);
  scene.add(fill);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(9, 48),
    new THREE.MeshStandardMaterial({ color: 0x0c1830, metalness: 0.3, roughness: 0.8 })
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const loader = new THREE.TextureLoader();
  const pickables = [];
  const n = artifacts.length;
  const radius = 4.2;

  artifacts.forEach((art, i) => {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.7, 0.35, 20),
      new THREE.MeshStandardMaterial({ color: 0x1e3355, metalness: 0.5, roughness: 0.45 })
    );
    base.position.set(x, 0.18, z);
    scene.add(base);

    const box = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 1.1, 1.1),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(art.color || '#1a3a5c'),
        emissive: 0x051020,
        metalness: 0.25,
        roughness: 0.5,
      })
    );
    box.position.set(x, 1.05, z);
    box.userData = { art };
    scene.add(box);
    pickables.push(box);

    const url = art.image?.local || art.image?.url;
    if (url) {
      loader.load(
        url,
        (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          const shell = new THREE.Mesh(
            new THREE.BoxGeometry(1.05, 1.05, 1.05),
            new THREE.MeshStandardMaterial({ map: tex, metalness: 0.1, roughness: 0.4 })
          );
          shell.position.copy(box.position);
          shell.userData = { art, isShell: true };
          scene.add(shell);
          pickables.push(shell);
        },
        undefined,
        () => {}
      );
    }

    const tag = makeLabelSprite(art.name.slice(0, 14), '');
    tag.scale.set(2.2, 0.55, 1);
    tag.position.set(x, 2.1, z);
    scene.add(tag);
  });

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(0, 1.2, 0);
  controls.minDistance = 3;
  controls.maxDistance = 14;
  controls.maxPolarAngle = Math.PI * 0.48;

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let focusMesh = null;

  function setPointer(e) {
    const r = renderer.domElement.getBoundingClientRect();
    pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1;
  }

  function focusArtifact(mesh) {
    focusMesh = mesh;
    const art = mesh.userData.art;
    if (art) onSelect(art);
    pickables.forEach((m) => {
      if (!m.material?.emissive) return;
      const on = m === mesh || (m.userData.art === art && m.userData.isShell);
      m.material.emissive.setHex(on ? 0x224466 : 0x051020);
    });
    controls.target.copy(mesh.position);
  }

  function onMove(e) {
    setPointer(e);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(pickables, false);
    renderer.domElement.style.cursor = hits.length ? 'pointer' : 'grab';
  }

  function onClick(e) {
    setPointer(e);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(pickables, false);
    if (hits[0]) focusArtifact(hits[0].object);
  }

  renderer.domElement.addEventListener('pointermove', onMove);
  renderer.domElement.addEventListener('click', onClick);

  const offResize = bindResize(host, renderer, camera);
  let rid;
  const animate = () => {
    rid = requestAnimationFrame(animate);
    if (focusMesh) focusMesh.rotation.y += 0.008;
    pickables.forEach((m) => {
      if (m !== focusMesh && m.userData?.art && !m.userData.isShell) m.rotation.y += 0.003;
    });
    controls.update();
    renderer.render(scene, camera);
  };
  animate();

  return {
    dispose: () => {
      cancelAnimationFrame(rid);
      window.removeEventListener('resize', offResize);
      renderer.domElement.removeEventListener('pointermove', onMove);
      renderer.domElement.removeEventListener('click', onClick);
      controls.dispose();
      renderer.dispose();
      host.innerHTML = '';
    },
    focusById(id) {
      const mesh = pickables.find((m) => m.userData?.art?.id === id);
      if (mesh) focusArtifact(mesh);
    },
  };
}

/** Không gian tư tưởng — 4 trụ chủ đề trong phòng 3D. */
export function createThoughtHall(host, topics, onSelect) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);
  scene.fog = new THREE.FogExp2(BG, 0.032);

  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 60);
  camera.position.set(0, 4, 9);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  host.appendChild(renderer.domElement);
  renderer.domElement.className = 'webgl-canvas';

  scene.add(new THREE.AmbientLight(0x556677, 0.75));
  const colors = { ethics: CYAN, education: 0x44aaff, youth: PURPLE, unity: 0x66ddaa };
  const pickables = [];
  const n = topics.length;
  const radius = 5;

  topics.forEach((topic, i) => {
    const angle = (i / n) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const col = colors[topic.theme] || CYAN;

    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.65, 3.2, 6),
      new THREE.MeshStandardMaterial({
        color: col,
        emissive: col,
        emissiveIntensity: 0.15,
        metalness: 0.35,
        roughness: 0.4,
      })
    );
    pillar.position.set(x, 1.6, z);
    pillar.userData = { topic };
    scene.add(pillar);
    pickables.push(pillar);

    const label = makeLabelSprite(topic.title.split(' ').slice(-2).join(' ') || topic.title, '');
    label.scale.set(2.4, 0.6, 1);
    label.position.set(x, 3.6, z);
    scene.add(label);
  });

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(8, 40),
    new THREE.MeshStandardMaterial({ color: 0x0a1428, metalness: 0.2, roughness: 0.9 })
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(0, 1.5, 0);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  function setPointer(e) {
    const r = renderer.domElement.getBoundingClientRect();
    pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1;
  }

  function onClick(e) {
    setPointer(e);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(pickables, false);
    if (hits[0]?.object?.userData?.topic) onSelect(hits[0].object.userData.topic);
  }

  renderer.domElement.addEventListener('click', onClick);
  const offResize = bindResize(host, renderer, camera);
  let rid;
  const animate = () => {
    rid = requestAnimationFrame(animate);
    pickables.forEach((p, i) => {
      p.rotation.y = Math.sin(Date.now() * 0.001 + i) * 0.05;
    });
    controls.update();
    renderer.render(scene, camera);
  };
  animate();

  return () => {
    cancelAnimationFrame(rid);
    window.removeEventListener('resize', offResize);
    renderer.domElement.removeEventListener('click', onClick);
    controls.dispose();
    renderer.dispose();
    host.innerHTML = '';
  };
}
