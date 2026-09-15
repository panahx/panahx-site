import * as THREE from 'three';

const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isLowEnd = navigator.hardwareConcurrency <= 4 || navigator.deviceMemory <= 4;

const CONFIG = {
  particles: isMobile || isLowEnd ? 800 : 2000,
  particleSize: isMobile ? 1.5 : 1.2,
  enableGlow: !isLowEnd,
  enablePostProcessing: !isLowEnd && !isMobile,
  renderScale: isMobile ? Math.min(window.devicePixelRatio, 1.5) : Math.min(window.devicePixelRatio, 2),
  targetFPS: 60,
};

let currentQuality = 'auto';
const qualityLevels = {
  high: { particles: 2000, renderScale: 2, glow: true, post: true },
  medium: { particles: 1200, renderScale: 1.5, glow: true, post: false },
  low: { particles: 600, renderScale: 1, glow: false, post: false },
};

const canvasContainer = document.getElementById('canvas-container');
const ctaButton = document.getElementById('cta-btn');
const perfLabel = document.getElementById('perf-label');
const yearEl = document.getElementById('year');

yearEl.textContent = new Date().getFullYear();

let scene, camera, renderer, composer;
let panahLogo, particleSystem, glowMesh;
let mouseX = 0, mouseY = 0, targetX = 0, targetY = 0;
let windowHalfX = window.innerWidth / 2;
let windowHalfY = window.innerHeight / 2;
let time = 0;
let animationId = null;
let isInitialized = false;

function initThree() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 0, 5);

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: false,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(CONFIG.renderScale);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.shadowMap.enabled = false;
  canvasContainer.appendChild(renderer.domElement);

  createPanahLogo();
  createParticles();
  createAmbientLights();

  if (CONFIG.enablePostProcessing && !isMobile) {
    setupPostProcessing();
  }

  window.addEventListener('resize', onResize);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('touchmove', onTouchMove, { passive: true });
  window.addEventListener('touchstart', onTouchStart, { passive: true });

  document.addEventListener('visibilitychange', onVisibilityChange);

  isInitialized = true;
  animate();
}

function createPanahLogo() {
  const logoGroup = new THREE.Group();

  const mainGeometry = new THREE.IcosahedronGeometry(1.2, 8);
  const mainMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x050508,
    metalness: 0.3,
    roughness: 0.1,
    transmission: 0.95,
    thickness: 0.3,
    ior: 1.5,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    envMapIntensity: 1.5,
    side: THREE.DoubleSide,
  });

  const mainMesh = new THREE.Mesh(mainGeometry, mainMaterial);
  mainMesh.castShadow = true;
  mainMesh.receiveShadow = true;
  logoGroup.add(mainMesh);

  const edgeGeometry = new THREE.IcosahedronGeometry(1.22, 8);
  const edgeMaterial = new THREE.MeshBasicMaterial({
    color: 0x00d4aa,
    transparent: true,
    opacity: 0.15,
    side: THREE.BackSide,
  });
  const edgeMesh = new THREE.Mesh(edgeGeometry, edgeMaterial);
  logoGroup.add(edgeMesh);

  const innerGeometry = new THREE.OctahedronGeometry(0.5, 2);
  const innerMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x00ffcc,
    metalness: 0,
    roughness: 0,
    transmission: 1,
    thickness: 0.1,
    ior: 1.3,
    emissive: 0x00ffcc,
    emissiveIntensity: 0.5,
    transparent: true,
    opacity: 0.8,
  });
  const innerMesh = new THREE.Mesh(innerGeometry, innerMaterial);
  logoGroup.add(innerMesh);

  const ringGeometry = new THREE.TorusGeometry(1.5, 0.02, 16, 64);
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: 0x00d4aa,
    transparent: true,
    opacity: 0.3,
  });
  const ring1 = new THREE.Mesh(ringGeometry, ringMaterial);
  ring1.rotation.x = Math.PI / 2;
  logoGroup.add(ring1);

  const ring2 = ring1.clone();
  ring2.rotation.y = Math.PI / 2;
  ring2.scale.setScalar(1.1);
  ring2.material = ringMaterial.clone();
  ring2.material.opacity = 0.15;
  logoGroup.add(ring2);

  const ring3 = ring1.clone();
  ring3.rotation.z = Math.PI / 2;
  ring3.scale.setScalar(1.2);
  ring3.material = ringMaterial.clone();
  ring3.material.opacity = 0.1;
  logoGroup.add(ring3);

  const glowGeometry = new THREE.SphereGeometry(1.8, 32, 32);
  const glowMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(0x00d4aa) },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vWorldPosition;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColor;
      varying vec3 vNormal;
      varying vec3 vWorldPosition;
      void main() {
        float viewDot = dot(vNormal, vec3(0.0, 0.0, 1.0));
        float fresnel = pow(1.0 - viewDot, 3.0);
        float pulse = sin(uTime * 0.5) * 0.5 + 0.5;
        vec3 color = uColor * fresnel * (0.3 + pulse * 0.3);
        gl_FragColor = vec4(color, fresnel * 0.4);
      }
    `,
    transparent: true,
    side: THREE.BackSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
  logoGroup.add(glowMesh);

  const particleCount = 100;
  const logoParticlesGeometry = new THREE.BufferGeometry();
  const logoParticlesPositions = new Float32Array(particleCount * 3);
  const logoParticlesSizes = new Float32Array(particleCount);
  const logoParticlesAlphas = new Float32Array(particleCount);

  for (let i = 0; i < particleCount; i++) {
    const radius = 1.3 + Math.random() * 0.6;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    logoParticlesPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    logoParticlesPositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    logoParticlesPositions[i * 3 + 2] = radius * Math.cos(phi);
    logoParticlesSizes[i] = Math.random() * 2 + 1;
    logoParticlesAlphas[i] = Math.random() * 0.5 + 0.2;
  }

  logoParticlesGeometry.setAttribute('position', new THREE.BufferAttribute(logoParticlesPositions, 3));
  logoParticlesGeometry.setAttribute('size', new THREE.BufferAttribute(logoParticlesSizes, 1));
  logoParticlesGeometry.setAttribute('alpha', new THREE.BufferAttribute(logoParticlesAlphas, 1));

  const logoParticlesMaterial = new THREE.PointsMaterial({
    color: 0x00ffcc,
    size: 2,
    transparent: true,
    opacity: 0.6,
    vertexColors: false,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const logoParticles = new THREE.Points(logoParticlesGeometry, logoParticlesMaterial);
  logoGroup.add(logoParticles);

  logoGroup.userData = {
    mainMesh,
    innerMesh,
    edgeMesh,
    rings: [ring1, ring2, ring3],
    glowMesh,
    logoParticles,
    logoParticlesMaterial,
    rotationSpeed: 0.0003,
    floatAmplitude: 0.15,
    floatSpeed: 0.7,
  };

  scene.add(logoGroup);
  panahLogo = logoGroup;
}

function createParticles() {
  const count = CONFIG.particles;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const alphas = new Float32Array(count);
  const colors = new Float32Array(count * 3);
  const velocities = new Float32Array(count * 3);

  const color1 = new THREE.Color(0x00d4aa);
  const color2 = new THREE.Color(0x00ffcc);
  const color3 = new THREE.Color(0x009678);

  for (let i = 0; i < count; i++) {
    const radius = 10 + Math.random() * 25;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);

    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta) - 5;
    positions[i * 3 + 2] = radius * Math.cos(phi);

    sizes[i] = Math.random() * CONFIG.particleSize + 0.5;
    alphas[i] = Math.random() * 0.4 + 0.1;

    const colorChoice = Math.random();
    let color;
    if (colorChoice < 0.5) color = color1;
    else if (colorChoice < 0.8) color = color2;
    else color = color3;

    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;

    velocities[i * 3] = (Math.random() - 0.5) * 0.0005;
    velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.0005;
    velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.0005;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));

  const material = new THREE.PointsMaterial({
    size: CONFIG.particleSize,
    transparent: true,
    opacity: 0.6,
    vertexColors: true,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  particleSystem = new THREE.Points(geometry, material);
  scene.add(particleSystem);
}

function createAmbientLights() {
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  const keyLight = new THREE.DirectionalLight(0x00ffcc, 0.8);
  keyLight.position.set(5, 10, 7);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0x00d4aa, 0.4);
  fillLight.position.set(-5, 2, -5);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0xffffff, 0.3);
  rimLight.position.set(0, -5, -10);
  scene.add(rimLight);

  const pointLight1 = new THREE.PointLight(0x00d4aa, 0.5, 20);
  pointLight1.position.set(3, 3, 3);
  scene.add(pointLight1);

  const pointLight2 = new THREE.PointLight(0x00ffcc, 0.3, 15);
  pointLight2.position.set(-3, -2, -3);
  scene.add(pointLight2);
}

function setupPostProcessing() {
  const { EffectComposer } = await import('three/addons/postprocessing/EffectComposer.js');
  const { RenderPass } = await import('three/addons/postprocessing/RenderPass.js');
  const { UnrealBloomPass } = await import('three/addons/postprocessing/UnrealBloomPass.js');
  const { ShaderPass } = await import('three/addons/postprocessing/ShaderPass.js');

  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.5,
    0.4,
    0.85
  );
  bloomPass.threshold = 0.8;
  bloomPass.strength = 0.6;
  bloomPass.radius = 0.5;
  composer.addPass(bloomPass);

  const vignetteShader = {
    uniforms: {
      tDiffuse: { value: null },
      uIntensity: { value: 0.3 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform float uIntensity;
      varying vec2 vUv;
      void main() {
        vec4 color = texture2D(tDiffuse, vUv);
        vec2 center = vUv - 0.5;
        float dist = length(center) * 1.5;
        float vignette = smoothstep(0.5, 1.0, dist) * uIntensity;
        color.rgb *= (1.0 - vignette);
        gl_FragColor = color;
      }
    `,
  };

  const vignettePass = new ShaderPass(vignetteShader);
  composer.addPass(vignettePass);
}

function onResize() {
  windowHalfX = window.innerWidth / 2;
  windowHalfY = window.innerHeight / 2;

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(CONFIG.renderScale);

  if (composer) {
    composer.setSize(window.innerWidth, window.innerHeight);
    composer.setPixelRatio(CONFIG.renderScale);
  }
}

function onMouseMove(event) {
  if (prefersReducedMotion) return;
  mouseX = (event.clientX - windowHalfX) / windowHalfX;
  mouseY = (event.clientY - windowHalfY) / windowHalfY;
}

function onTouchMove(event) {
  if (prefersReducedMotion) return;
  const touch = event.touches[0];
  if (touch) {
    mouseX = (touch.clientX - windowHalfX) / windowHalfX;
    mouseY = (touch.clientY - windowHalfY) / windowHalfY;
  }
}

function onTouchStart(event) {
  if (prefersReducedMotion) return;
  const touch = event.touches[0];
  if (touch) {
    mouseX = (touch.clientX - windowHalfX) / windowHalfX;
    mouseY = (touch.clientY - windowHalfY) / windowHalfY;
  }
}

function onVisibilityChange() {
  if (document.hidden) {
    cancelAnimationFrame(animationId);
    animationId = null;
  } else if (!animationId) {
    animate();
  }
}

function animate() {
  if (!isInitialized) return;

  animationId = requestAnimationFrame(animate);

  time += 1 / CONFIG.targetFPS;

  targetX += (mouseX - targetX) * 0.05;
  targetY += (mouseY - targetY) * 0.05;

  if (panahLogo) {
    const ud = panahLogo.userData;

    panahLogo.rotation.y += ud.rotationSpeed * 60;
    panahLogo.rotation.x = Math.sin(time * ud.floatSpeed) * ud.floatAmplitude * 0.5;
    panahLogo.position.y = Math.sin(time * ud.floatSpeed) * ud.floatAmplitude;

    panahLogo.rotation.y += targetX * 0.02;
    panahLogo.rotation.x += targetY * 0.02;

    ud.innerMesh.rotation.y += 0.005;
    ud.innerMesh.rotation.x += 0.003;

    ud.rings.forEach((ring, i) => {
      ring.rotation.z += (0.001 + i * 0.0005) * 60;
      ring.rotation.y += (0.0005 - i * 0.0002) * 60;
    });

    if (ud.glowMesh && ud.glowMesh.material.uniforms) {
      ud.glowMesh.material.uniforms.uTime.value = time;
    }

    if (ud.logoParticles) {
      ud.logoParticles.rotation.y += 0.0002 * 60;
      const positions = ud.logoParticles.geometry.attributes.position.array;
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] += Math.sin(time * 2 + i) * 0.001;
      }
      ud.logoParticles.geometry.attributes.position.needsUpdate = true;
    }
  }

  if (particleSystem) {
    const positions = particleSystem.geometry.attributes.position.array;
    const velocities = particleSystem.geometry.attributes.velocity.array;

    particleSystem.rotation.y += 0.00005 * 60;
    particleSystem.rotation.x += 0.00002 * 60;

    for (let i = 0; i < positions.length; i += 3) {
      positions[i] += velocities[i];
      positions[i + 1] += velocities[i + 1];
      positions[i + 2] += velocities[i + 2];

      const dist = Math.sqrt(
        positions[i] ** 2 + positions[i + 1] ** 2 + positions[i + 2] ** 2
      );

      if (dist > 35) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const radius = 10;
        positions[i] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i + 1] = radius * Math.sin(phi) * Math.sin(theta) - 5;
        positions[i + 2] = radius * Math.cos(phi);
      }
    }
    particleSystem.geometry.attributes.position.needsUpdate = true;
  }

  camera.position.x += (targetX * 0.5 - camera.position.x) * 0.02;
  camera.position.y += (-targetY * 0.3 - camera.position.y) * 0.02;
  camera.lookAt(0, 0, 0);

  if (composer) {
    composer.render();
  } else {
    renderer.render(scene, camera);
  }
}

function setupCTA() {
  ctaButton.addEventListener('click', (e) => {
    ctaButton.classList.remove('ripple');
    void ctaButton.offsetWidth;
    ctaButton.classList.add('ripple');

    const rect = ctaButton.getBoundingClientRect();
    const x = (e.clientX || (e.touches?.[0]?.clientX || rect.left + rect.width / 2)) - rect.left;
    const y = (e.clientY || (e.touches?.[0]?.clientY || rect.top + rect.height / 2)) - rect.top;

    ctaButton.style.setProperty('--ripple-x', `${x}px`);
    ctaButton.style.setProperty('--ripple-y', `${y}px`);

    setTimeout(() => ctaButton.classList.remove('ripple'), 600);

    playClickSound();
    showToast('به‌زودی فعال می‌شود');
  });

  ctaButton.addEventListener('mouseenter', () => {
    if (!prefersReducedMotion && panahLogo) {
      panahLogo.userData.rotationSpeed *= 2;
    }
  });

  ctaButton.addEventListener('mouseleave', () => {
    if (panahLogo) {
      panahLogo.userData.rotationSpeed = 0.0003;
    }
  });
}

function playClickSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.02, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.1);
  } catch (e) {
    // Audio not available
  }
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 100px;
    left: 50%;
    transform: translateX(-50%) translateY(20px);
    padding: 12px 24px;
    background: var(--glass);
    border: 1px solid var(--glass-border);
    border-radius: 12px;
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    color: var(--fg);
    font-size: 0.9rem;
    font-weight: 500;
    z-index: 1000;
    opacity: 0;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    pointer-events: none;
  `;
  document.body.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
  });
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(-20px)';
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

function setupQualityToggle() {
  const badge = document.querySelector('.quality-badge');
  badge.addEventListener('click', () => {
    const levels = ['auto', 'high', 'medium', 'low'];
    const currentIndex = levels.indexOf(currentQuality);
    currentQuality = levels[(currentIndex + 1) % levels.length];
    perfLabel.textContent = currentQuality.toUpperCase();
    applyQuality(currentQuality);
  });
}

function applyQuality(level) {
  if (level === 'auto') {
    CONFIG.particles = isMobile || isLowEnd ? 800 : 2000;
    CONFIG.renderScale = isMobile ? Math.min(window.devicePixelRatio, 1.5) : Math.min(window.devicePixelRatio, 2);
    CONFIG.enableGlow = !isLowEnd;
    CONFIG.enablePostProcessing = !isLowEnd && !isMobile;
  } else {
    const q = qualityLevels[level];
    CONFIG.particles = q.particles;
    CONFIG.renderScale = q.renderScale;
    CONFIG.enableGlow = q.glow;
    CONFIG.enablePostProcessing = q.post;
  }

  renderer.setPixelRatio(CONFIG.renderScale);
  if (composer) composer.setPixelRatio(CONFIG.renderScale);

  if (particleSystem) {
    const positions = particleSystem.geometry.attributes.position.array;
    const newCount = CONFIG.particles;
    const oldCount = positions.length / 3;

    if (newCount !== oldCount) {
      scene.remove(particleSystem);
      particleSystem.geometry.dispose();
      particleSystem.material.dispose();
      createParticles();
    }
  }

  if (panahLogo && panahLogo.userData.glowMesh) {
    panahLogo.userData.glowMesh.visible = CONFIG.enableGlow;
  }
}

function init() {
  if (prefersReducedMotion) {
    document.documentElement.classList.add('reduced-motion');
  }

  if (isLowEnd) {
    document.documentElement.classList.add('low-performance');
  }

  initThree();
  setupCTA();
  setupQualityToggle();

  document.body.style.touchAction = 'none';
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

window.addEventListener('error', (e) => {
  console.error('Error:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled rejection:', e.reason);
});