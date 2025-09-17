// Update footer year
document.getElementById('year').textContent = new Date().getFullYear();

// Lightweight lightbox
const dialog = document.getElementById('lightbox');
const lbImg = document.getElementById('lb-img');
const lbTitle = document.getElementById('lb-title');
const lbTags = document.getElementById('lb-tags');
const lbClose = document.getElementById('lb-close');
lbClose.addEventListener('click', () => dialog.close());
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && dialog.open) dialog.close(); });
document.querySelectorAll('.card').forEach(card => {
  card.addEventListener('click', () => {
    const src = card.getAttribute('data-src');
    lbImg.src = src; 
    lbImg.alt = card.getAttribute('data-title') + ' – Großansicht';
    lbTitle.textContent = card.getAttribute('data-title');
    lbTags.textContent = card.getAttribute('data-tags');
    dialog.showModal();
  });
});

// Respect reduced motion
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!reduceMotion) {
  // Import Three.js modules inside JS file
  const threeCdn = 'https://unpkg.com/three@0.161.0/build/three.module.js';
  const controlsCdn = 'https://unpkg.com/three@0.161.0/examples/jsm/controls/OrbitControls.js';
  Promise.all([
    import(threeCdn),
    import(controlsCdn)
  ]).then(([THREE, module]) => {
    const { OrbitControls } = module;

    // Scene setup
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

    // Lights
    const hemi = new THREE.HemisphereLight(0x9fd3ff, 0x0a0a12, 0.9); scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffffff, 0.8); dir.position.set(2, 2, 3); scene.add(dir);

    // Stars
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

    // Hero object
    const ico = new THREE.Mesh(
      new THREE.IcosahedronGeometry(2.2, 0),
      new THREE.MeshStandardMaterial({ color: 0x8bd3dd, metalness: 0.35, roughness: 0.3, flatShading: true })
    );
    scene.add(ico);

    // Camera start
    camera.position.set(0, 0.4, 8);
    resize();

    // Animate
    let t = 0;
    function animate() {
      t += 0.006;
      ico.rotation.x += 0.0035; ico.rotation.y += 0.0055; ico.position.y = Math.sin(t) * 0.25;
      stars.rotation.y += 0.0008; controls.update();
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    }
    animate();

    // Parallax on scroll
    window.addEventListener('scroll', () => {
      const p = Math.min(window.scrollY / window.innerHeight, 1);
      camera.position.z = 8 + p * 1.2;
    }, { passive: true });
  }).catch(console.error);
}
