// Footer Jahr
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// Lightbox Elemente
const dialog = document.getElementById('lightbox');
const lbStage = document.getElementById('lb-stage');
const lbTitle = document.getElementById('lb-title');
const lbTags = document.getElementById('lb-tags');
const lbClose = document.getElementById('lb-close');
const lbProgress = document.querySelector('.lb-progress');
const lbBar = lbProgress ? lbProgress.querySelector('.bar') : null;
const lbLabel = lbProgress ? lbProgress.querySelector('.label') : null;
if (dialog && lbClose) {
  lbClose.addEventListener('click', () => dialog.close());
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && dialog.open) dialog.close(); });
}

function focusClose(){ if(lbClose){ setTimeout(()=> lbClose.focus(), 0); } }

// 2D Lightbox mit 1×/2×/4× Klick‑Zoom & Drag‑Pan
function openLightboxForImage(item) {
  lbStage.innerHTML = '';
  if (lbProgress) lbProgress.hidden = true;
  dialog.setAttribute('aria-busy','false');
  const img = document.createElement('img');
  img.src = item.src; img.alt = `${item.title} – Großansicht`;
  img.className = 'zoomable'; img.draggable = false;
  lbStage.appendChild(img);
  lbTitle.textContent = item.title;
  lbTags.textContent = item.desc || (item.tags?.join(', ') || '');
  dialog.showModal(); focusClose();

  const levels = [1,2,4]; let li = 0; // index im levels‑Array
  let startX=0, startY=0, curX=0, curY=0, dragging=false;
  function apply(){ img.style.transform = `translate(${curX}px, ${curY}px) scale(${levels[li]})`; img.classList.toggle('zoomed', levels[li]>1); img.style.cursor = levels[li]>1 ? (dragging?'grabbing':'grab') : 'zoom-in'; }
  apply();

  img.addEventListener('click', (e)=>{
    if (dragging) return; // Klick nach Drag ignorieren
    const prev = li; li = (li + 1) % levels.length;
    if (levels[li] > 1 && levels[prev] === 1) {
      const rect = img.getBoundingClientRect();
      const cx = e.clientX - rect.left - rect.width/2;
      const cy = e.clientY - rect.top - rect.height/2;
      curX = -cx; curY = -cy;
    } else if (levels[li] === 1) { curX = curY = 0; }
    apply();
  });
  img.addEventListener('mousedown', (e)=>{ if(levels[li]===1) return; dragging=true; startX=e.clientX - curX; startY=e.clientY - curY; apply(); });
  window.addEventListener('mousemove', (e)=>{ if(!dragging) return; curX = e.clientX - startX; curY = e.clientY - startY; apply(); });
  window.addEventListener('mouseup', ()=>{ if(!dragging) return; dragging=false; apply(); });

  const onClose = () => { window.removeEventListener('mousemove',()=>{}); window.removeEventListener('mouseup',()=>{}); dialog.removeEventListener('close', onClose); };
  dialog.addEventListener('close', onClose);
}

// THREE helpers (lazy)
let threeCache = null; // { THREE, OrbitControls, GLTFLoader, DRACOLoader, RGBELoader }
async function ensureThree() {
  if (threeCache) return threeCache;
  const [THREE, controlsMod, gltfMod, dracoMod, rgbeMod] = await Promise.all([
    import('three'),
    import('https://unpkg.com/three@0.161.0/examples/jsm/controls/OrbitControls.js?module'),
    import('https://unpkg.com/three@0.161.0/examples/jsm/loaders/GLTFLoader.js?module'),
    import('https://unpkg.com/three@0.161.0/examples/jsm/loaders/DRACOLoader.js?module'),
    import('https://unpkg.com/three@0.161.0/examples/jsm/loaders/RGBELoader.js?module')
  ]);
  threeCache = { THREE, OrbitControls: controlsMod.OrbitControls, GLTFLoader: gltfMod.GLTFLoader, DRACOLoader: dracoMod.DRACOLoader, RGBELoader: rgbeMod.RGBELoader };
  return threeCache;
}

function showProgress(p){ if(!lbProgress||!lbBar||!lbLabel) return; lbProgress.hidden=false; const pct = Math.round(Math.max(0, Math.min(100, p))); lbBar.style.width = pct + '%'; lbLabel.textContent = pct + '%'; dialog.setAttribute('aria-busy','true'); }
function hideProgress(){ if(lbProgress){ lbProgress.hidden=true; dialog.setAttribute('aria-busy','false'); } }

// 3D Lightbox mit Progress, Zoom‑Limits, optional HDRI & Draco‑Fallback
async function openLightboxForGLTF(item) {
  lbStage.innerHTML = '';
  showProgress(1);
  const { THREE, OrbitControls, GLTFLoader, DRACOLoader, RGBELoader } = await ensureThree();
  const canvas = document.createElement('canvas'); lbStage.appendChild(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
  camera.position.set(0.8, 0.6, 1.5);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.enableZoom = true; controls.minDistance = 0.5; controls.maxDistance = 8; controls.enablePan = true;

  const hemi = new THREE.HemisphereLight(0xffffff, 0x222233, 0.9); scene.add(hemi);
  const dir = new THREE.DirectionalLight(0xffffff, 0.8); dir.position.set(2,2,2); scene.add(dir);

  // Optional HDRI
  if (item.env) {
    try {
      const pmrem = new THREE.PMREMGenerator(renderer); pmrem.compileEquirectangularShader();
      const rgbe = new RGBELoader(); const tex = await rgbe.loadAsync(item.env); const envMap = pmrem.fromEquirectangular(tex).texture; scene.environment = envMap; tex.dispose();
    } catch(e) { console.warn('HDRI konnte nicht geladen werden', e); }
  }

  const loader = new GLTFLoader();
  const onProgress = (e) => { if(e && e.lengthComputable){ showProgress((e.loaded/e.total)*100); } else { showProgress(30); } };
  function loadWith(optionalDraco=false){
    return new Promise((resolve,reject)=>{
      if (optionalDraco) { const draco = new DRACOLoader(); draco.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/'); loader.setDRACOLoader(draco); }
      loader.load(item.src, (g)=>resolve(g), onProgress, (err)=>reject(err));
    });
  }

  let gltf = null;
  try { gltf = await loadWith(false); }
  catch(err1){ console.warn('Ohne Draco fehlgeschlagen, versuche mit Draco…', err1); try { gltf = await loadWith(true); } catch(err2){ console.error('Laden fehlgeschlagen', err2); hideProgress(); lbStage.innerHTML = '<p class="muted">Fehler beim Laden des Modells. Prüfe Pfad/Datei.</p>'; return; } }

  hideProgress();
  const root = gltf.scene; scene.add(root);
  // Auto‑frame
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  root.position.sub(center);
  const radius = Math.max(size.x, size.y, size.z) * 0.6;
  camera.position.set(radius*1.2, radius*0.9, radius*1.6);
  controls.target.set(0, 0, 0); controls.update();

  function resize(){ const w = lbStage.clientWidth; const h = Math.min(window.innerHeight*0.72, w*0.75); renderer.setSize(w, h, false); camera.aspect = w/h; camera.updateProjectionMatrix(); }
  const ro = new ResizeObserver(resize); ro.observe(lbStage); resize();

  let animId; (function render(){ controls.update(); renderer.render(scene, camera); animId = requestAnimationFrame(render); })();

  lbTitle.textContent = item.title; lbTags.textContent = item.desc || (item.tags?.join(', ') || ''); dialog.showModal(); focusClose();

  const onClose = () => { cancelAnimationFrame(animId); renderer.dispose(); ro.disconnect(); dialog.removeEventListener('close', onClose); };
  dialog.addEventListener('close', onClose);
}

// Karte
function makeCard(item){
  const el = document.createElement('article'); el.className = 'card';
  el.innerHTML = `<figure><img src="${item.thumb}" alt="${item.title}"></figure><div class="meta"><span>${item.title}</span><span class="tag">${(item.tags&&item.tags[0])||''}</span></div>`;
  el.addEventListener('click', ()=> item.type==='image' ? openLightboxForImage(item) : openLightboxForGLTF(item));
  return el;
}

// Render Router
const pageRoot = document.querySelector('[data-page]');
if (pageRoot) {
  const mode = pageRoot.getAttribute('data-page');
  const data = window.GALLERY_DATA || { twoD:[], threeD:[] };
  if (mode==='2d') data.twoD.forEach(i=>pageRoot.appendChild(makeCard(i)));
  else if (mode==='3d') data.threeD.forEach(i=>pageRoot.appendChild(makeCard(i)));
  else if (mode==='featured') data.twoD.slice(0,6).forEach(i=>pageRoot.appendChild(makeCard(i)));
}

// Landing‑Hero Three.js
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!reduceMotion && document.getElementById('bg')) {
  (async () => {
    const [THREE, controlsMod] = await Promise.all([
      import('three'),
      import('https://unpkg.com/three@0.161.0/examples/jsm/controls/OrbitControls.js?module')
    ]);
    const { OrbitControls } = controlsMod;
    const canvas = document.getElementById('bg');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.enableZoom = false; controls.enablePan = false; controls.autoRotate = true; controls.autoRotateSpeed = 0.6;
    function resize(){ const {clientWidth:w, clientHeight:h} = canvas.parentElement; renderer.setSize(w,h,false); camera.aspect=w/h; camera.updateProjectionMatrix(); }
    new ResizeObserver(resize).observe(canvas.parentElement);
    const hemi = new THREE.HemisphereLight(0x9fd3ff, 0x0a0a12, 0.9); scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffffff, 0.8); dir.position.set(2,2,3); scene.add(dir);
    const starGeo = new THREE.BufferGeometry(); const COUNT=600; const positions=new Float32Array(COUNT*3);
    for(let i=0;i<COUNT;i++){ const r=THREE.MathUtils.randFloat(20,80); const theta=Math.random()*Math.PI*2; const phi=Math.acos(THREE.MathUtils.randFloatSpread(2)); positions[i*3]=r*Math.sin(phi)*Math.cos(theta); positions[i*3+1]=r*Math.sin(phi)*Math.sin(theta); positions[i*3+2]=r*Math.cos(phi); }
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions,3));
    const starMat = new THREE.PointsMaterial({ size:0.06, transparent:true, opacity:0.85 });
    const stars = new THREE.Points(starGeo, starMat); scene.add(stars);
    const ico = new THREE.Mesh(new THREE.IcosahedronGeometry(2.2,0), new THREE.MeshStandardMaterial({ color:0x8bd3dd, metalness:0.35, roughness:0.3, flatShading:true })); scene.add(ico);
    camera.position.set(0,0.4,8); resize();
    let t=0; (function animate(){ t+=0.006; ico.rotation.x+=0.0035; ico.rotation.y+=0.0055; ico.position.y=Math.sin(t)*0.25; stars.rotation.y+=0.0008; controls.update(); renderer.render(scene,camera); requestAnimationFrame(animate);} )();
    window.addEventListener('scroll', ()=>{ const p=Math.min(window.scrollY/window.innerHeight,1); camera.position.z=8+p*1.2; }, {passive:true});
  })();
}
