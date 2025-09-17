// Jahr im Footer
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// Dialog/Lightbox Grundlogik (zentriert)
const dialog = document.getElementById('lightbox');
const lbStage = document.getElementById('lb-stage');
const lbTitle = document.getElementById('lb-title');
const lbTags = document.getElementById('lb-tags');
const lbClose = document.getElementById('lb-close');
if (dialog && lbClose) {
  lbClose.addEventListener('click', () => dialog.close());
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && dialog.open) dialog.close(); });
}

function openLightboxForImage(item) {
  lbStage.innerHTML = '';
  const img = document.createElement('img');
  img.src = item.src; img.alt = `${item.title} – Großansicht`;
  lbStage.appendChild(img);
  lbTitle.textContent = item.title;
  lbTags.textContent = item.desc || (item.tags?.join(', ') || '');
  dialog.showModal();
}

// 3D Viewer im Lightbox (GLB/GLTF)
let threeCache = null; // { THREE, OrbitControls, GLTFLoader }
async function ensureThree() {
  if (threeCache) return threeCache;
  const [THREE, controlsMod, gltfMod] = await Promise.all([
    import('https://unpkg.com/three@0.161.0/build/three.module.js'),
    import('https://unpkg.com/three@0.161.0/examples/jsm/controls/OrbitControls.js?module'),
    import('https://unpkg.com/three@0.161.0/examples/jsm/loaders/GLTFLoader.js?module')
  ]);
  threeCache = { THREE, OrbitControls: controlsMod.OrbitControls, GLTFLoader: gltfMod.GLTFLoader };
  return threeCache;
}

async function openLightboxForGLTF(item) {
  lbStage.innerHTML = '';
  const { THREE, OrbitControls, GLTFLoader } = await ensureThree();
  // Canvas anlegen
  const canvas = document.createElement('canvas');
  lbStage.appendChild(canvas);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const scene = new THREE.Scene();
  scene.background = null;
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
  camera.position.set(0.8, 0.6, 1.5);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  const hemi = new THREE.HemisphereLight(0xffffff, 0x222233, 0.9); scene.add(hemi);
  const dir = new THREE.DirectionalLight(0xffffff, 0.8); dir.position.set(2,2,2); scene.add(dir);

  // Laden
  const loader = new GLTFLoader();
  loader.load(item.src, (gltf) => {
    const root = gltf.scene; scene.add(root);
    // Versuch: Modell automatisch in Frame setzen
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3()).length();
    const center = box.getCenter(new THREE.Vector3());
    root.position.sub(center);
    camera.position.set(0, size * 0.2, size * 1.4);
    controls.update();
    render();
  });

  function resize() {
    const w = lbStage.clientWidth;
    const h = Math.min(window.innerHeight * 0.72, lbStage.clientWidth * 0.75);
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize); ro.observe(lbStage);

  function render() {
    controls.update();
    renderer.render(scene, camera);
    anim = requestAnimationFrame(render);
  }
  let anim = requestAnimationFrame(render);

  // Titel/Tags & Dialog öffnen
  lbTitle.textContent = item.title;
  lbTags.textContent = item.desc || (item.tags?.join(', ') || '');
  dialog.showModal();

  // Aufräumen beim Schließen
  const onClose = () => { cancelAnimationFrame(anim); renderer.dispose(); ro.disconnect(); dialog.removeEventListener('close', onClose); };
  dialog.addEventListener('close', onClose);
}

// Util: Karte erzeugen
function makeCard(item) {
  const el = document.createElement('article');
  el.className = 'card';
  el.innerHTML = `
    <figure>${ item.type === 'image' ? `<img src="${item.thumb}" alt="${item.title}">` : `<img src="${item.thumb}" alt="${item.title} – 3D Preview">` }</figure>
    <div class="meta"><span>${item.title}</span><span class="tag">${(item.tags&&item.tags[0])||''}</span></div>`;
  el.addEventListener('click', () => item.type === 'image' ? openLightboxForImage(item) : openLightboxForGLTF(item));
  return el;
}

// Seiten‑Router per data‑page
const pageRoot = document.querySelector('[data-page]');
if (pageRoot) {
  const mode = pageRoot.getAttribute('data-page');
  const data = window.GALLERY_DATA || { twoD: [], threeD: [] };
  if (mode === '2d') {
    data.twoD.forEach(item => pageRoot.appendChild(makeCard(item)));
  } else if (mode === '3d') {
    data.threeD.forEach(item => pageRoot.appendChild(makeCard(item)));
  } else if (mode === 'featured') {
    data.twoD.slice(0,3).forEach(item => pageRoot.appendChild(makeCard(item)));
  }
}

// Hintergrund‑Three.js nur auf Landing (Hero)
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!reduceMotion && document.getElementById('bg')) {
  (async () => {
    const [THREE, controlsMod] = await Promise.all([
      import('https://unpkg.com/three@0.161.0/build/three.module.js'),
      import('https://unpkg.com/three@0.161.0/examples/jsm/controls/OrbitControls.js?module')
    ]);
    const { OrbitControls } = controlsMod;
    const canvas = document.getElementById('bg');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.enableZoom = false; controls.enablePan = false;
    controls.autoRotate = true; controls.autoRotateSpeed = 0.6;

    function resize() {
      const { clientWidth: w, clientHeight: h } = canvas.parentElement;
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
    }
    new ResizeObserver(resize).observe(canvas.parentElement);

    const hemi = new THREE.HemisphereLight(0x9fd3ff, 0x0a0a12, 0.9); scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffffff, 0.8); dir.position.set(2,2,3); scene.add(dir);

    const starGeo = new THREE.BufferGeometry();
    const COUNT = 600;
    const positions = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      const r = THREE.MathUtils.randFloat(20, 80);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(THREE.MathUtils.randFloatSpread(2));
      positions[i*3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i*3+2] = r * Math.cos(phi);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const starMat = new THREE.PointsMaterial({ size: 0.06, transparent: true, opacity: 0.85 });
    const stars = new THREE.Points(starGeo, starMat); scene.add(stars);

    const ico = new THREE.Mesh(new THREE.IcosahedronGeometry(2.2, 0), new THREE.MeshStandardMaterial({ color: 0x8bd3dd, metalness: 0.35, roughness: 0.3, flatShading: true }));
    scene.add(ico);
    camera.position.set(0, 0.4, 8);
    resize();

    let t = 0; (function animate(){ t += 0.006; ico.rotation.x += 0.0035; ico.rotation.y += 0.0055; ico.position.y = Math.sin(t) * 0.25; stars.rotation.y += 0.0008; controls.update(); renderer.render(scene, camera); requestAnimationFrame(animate); })();
    window.addEventListener('scroll', () => { const p = Math.min(window.scrollY / window.innerHeight, 1); camera.position.z = 8 + p * 1.2; }, { passive: true });
  })();
}