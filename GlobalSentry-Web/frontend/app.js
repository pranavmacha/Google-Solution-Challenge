/* ═══════════════════════════════════════════════════════════════════════
   SupplySentry — JavaScript Application
   Handles: alert feed, pipeline status, modal, API calls
═══════════════════════════════════════════════════════════════════════ */

// ─── Configuration ──────────────────────────────────────────────────────────
const API_BASE = 'http://localhost:8000/api';
const USE_API  = true; // FastAPI is running at localhost:8000 with /api/ prefix

// No mock data — all alerts come from live Indian RSS feeds and the AI agent pipeline.

const state = {
  activeMode: 'supply',
  alerts: [],
};

// ─── Mode Config ────────────────────────────────────────────────────────────
const MODE_CONFIG = {
  supply: {
    label: '♻️ SUPPLY-SENTRY MODE',
    feedTitle: '♻️ Supply Chain Disruption Alerts',
    badge: 'SUPPLY',
    bodyClass: 'mode-supply',
    badgeClass: 'badge-mode-supply',
  },
};

// ─── Switch Mode ────────────────────────────────────────────────────────────
function switchMode(mode) {
  if (state.activeMode === mode) return;
  state.activeMode = mode;

  // Body class
  document.body.className = MODE_CONFIG[mode].bodyClass;

  // Navbar buttons
  document.querySelectorAll('.nav-mode-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.mode === mode) btn.classList.add('active');
  });

  // Dashboard toggle buttons
  document.querySelectorAll('.mode-toggle-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.mode === mode) btn.classList.add('active');
  });

  // Dashboard label
  const lbl = document.getElementById('dashboard-mode-label');
  if (lbl) lbl.textContent = MODE_CONFIG[mode].label;

  // Feed title
  const ft = document.getElementById('feed-title');
  if (ft) ft.textContent = MODE_CONFIG[mode].feedTitle;

  // Sidebar mode badge
  const mb = document.getElementById('sidebar-mode-badge');
  if (mb) {
    mb.textContent = MODE_CONFIG[mode].badge;
    mb.className = `status-value mode-badge ${MODE_CONFIG[mode].badgeClass}`;
  }

  // Update last poll
  const lp = document.getElementById('status-last-poll');
  if (lp) lp.textContent = 'Just now';

  // Reload alert feed
  loadAlerts(mode);

  showToast(`Switched to ${MODE_CONFIG[mode].feedTitle}`, 'info');
}

function switchModeAndScroll(mode) {
  switchMode(mode);
  scrollToDashboard();
}

// ─── Scroll helpers ─────────────────────────────────────────────────────────
function scrollToDashboard() {
  document.getElementById('dashboard').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function scrollToSection(id) {
  document.getElementById(id).scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ─── Load Alerts ────────────────────────────────────────────────────────────
async function loadAlerts(mode) {
  const container = document.getElementById('alerts-container');
  container.innerHTML = '<div class="alert-loading"><div class="spinner"></div><span>Fetching intelligence...</span></div>';

  await sleep(600);

  let alerts = [];

  if (USE_API) {
    try {
      const resp = await fetch(`${API_BASE}/alerts?mode=${mode}&limit=50`);
      const data = await resp.json();
      // Only show agent-processed alerts — NOT raw RSS feeds
      alerts = (data.alerts || []).filter(a => a.is_raw_feed !== true);
    } catch (e) {
      console.warn('API error', e);
    }
  }

  state.alerts = alerts;
  renderAlerts(alerts);
  checkConvergence(alerts);
  updateMiniStats();
}

function renderAlerts(alerts) {
  const container = document.getElementById('alerts-container');
  container.innerHTML = '';

  if (!alerts.length) {
    container.innerHTML = '<div class="alert-loading"><span>No alerts in this mode.</span></div>';
    return;
  }

  alerts.forEach((alert, i) => {
    const card = buildAlertCard(alert, i);
    container.appendChild(card);
  });
}

function buildAlertCard(alert, index) {
  const card = document.createElement('div');
  const isRaw = alert.is_raw_feed || alert.severity === 0;
  card.className = `alert-card mode-${alert.mode} ${isRaw ? 'sev-raw' : `sev-${alert.severity}`} entering`;
  card.style.animationDelay = `${index * 60}ms`;
  card.setAttribute('data-alert-id', alert.id);

  const modeBadgeClass = `badge-${alert.mode}`;
  const timeAgo = formatTimeAgo(new Date(alert.timestamp));

  if (isRaw) {
    // Raw RSS headline — not yet processed by AI agent
    card.innerHTML = `
      <div class="alert-card-top">
        <div class="alert-headline">${escapeHtml(alert.headline)}</div>
        <div class="alert-badges">
          <span class="badge ${modeBadgeClass}">${alert.mode.toUpperCase()}</span>
          <span class="badge badge-raw">📡 RSS FEED</span>
        </div>
      </div>
      <div class="alert-card-bottom">
        <div class="alert-meta">
          <span class="alert-source">${escapeHtml(alert.source)}</span>
          <span class="alert-time">${timeAgo}</span>
        </div>
      </div>
    `;
  } else {
    // Agent-processed alert — full card with severity, analysis, and badges
    const verifiedBadge = alert.is_verified
      ? '<span class="badge badge-verified">✅ VERIFIED</span>'
      : '<span class="badge badge-unverified">⏳ UNVERIFIED</span>';

    const convergenceHtml = alert.convergence_warning
      ? `<div class="alert-convergence">🧠 ${escapeHtml(alert.convergence_warning)}</div>`
      : '';

    card.innerHTML = `
      <div class="alert-card-top">
        <div class="alert-headline">${escapeHtml(alert.headline)}</div>
        <div class="alert-badges">
          <span class="badge ${modeBadgeClass}">${alert.mode.toUpperCase()}</span>
          <span class="badge badge-agent">🤖 AI AGENT</span>
          ${verifiedBadge}
        </div>
      </div>
      <div class="alert-severity-row">
        <div class="severity-dots">${buildSeverityDots(alert.severity, alert.mode)}</div>
        <span class="alert-confidence">${Math.round((alert.confidence || 0) * 100)}% confidence</span>
      </div>
      <div class="alert-analysis">${escapeHtml((alert.analysis || '').substring(0, 300))}</div>
      ${convergenceHtml}
      <div class="alert-card-bottom">
        <div class="alert-meta">
          <span class="alert-source">${escapeHtml(alert.source || 'Agent Pipeline')}</span>
          <span class="alert-time">${timeAgo}</span>
        </div>
      </div>
    `;
  }

  return card;
}

function buildSeverityDots(severity, mode) {
  const color = 'var(--supply)';
  let html = '';
  for (let i = 1; i <= 5; i++) {
    const filled = i <= severity;
    html += `<div class="sev-dot" style="background:${filled ? color : 'var(--border-medium)'}; opacity:${filled ? 1 : 0.3}"></div>`;
  }
  return html;
}

// ─── Convergence Panel ──────────────────────────────────────────────────────
function checkConvergence(alerts) {
  const panel = document.getElementById('convergence-panel');
  const text  = document.getElementById('convergence-text');
  const convergent = alerts.find(a => a.convergence_warning);

  if (convergent) {
    text.textContent = convergent.convergence_warning;
    panel.style.display = 'flex';
  } else {
    panel.style.display = 'none';
  }
}

function closeConvergence() {
  document.getElementById('convergence-panel').style.display = 'none';
}

// ─── Refresh & Clear ────────────────────────────────────────────────────────
function refreshFeed() {
  loadAlerts(state.activeMode);
  showToast('Feed refreshed', 'success');
}

function clearFeed() {
  const container = document.getElementById('alerts-container');
  container.innerHTML = '<div class="alert-loading"><span>Feed cleared. Click Refresh to reload.</span></div>';
  document.getElementById('convergence-panel').style.display = 'none';
  showToast('Feed cleared', 'info');
}

// ─── Autonomous Agent Status UI ──────────────────────────────────────────────
async function pollSystemStatus() {
  if (!USE_API) return;
  try {
    const resp = await fetch(`${API_BASE}/status`);
    const data = await resp.json();
    updateAutonomousUI(data.current_analysis);
  } catch (e) {
    console.warn('Failed to poll status', e);
  }
}

function updateAutonomousUI(currentAnalysis) {
  const display = document.getElementById('current-analysis-display');
  const indText = document.getElementById('active-node-text');

  if (!currentAnalysis) {
    if (display) display.innerHTML = '<em>Waiting for next signal...</em>';
    if (indText) indText.textContent = 'Idling (Waiting 20s)';
    return;
  }

  if (display) display.innerHTML = `<strong>[Mode: ${currentAnalysis.mode.toUpperCase()}]</strong> ${escapeHtml(currentAnalysis.headline)}`;
  
  const nodeNames = {
    'profiler': 'Profiler',
    'triage': 'Triage (Agent A)',
    'retriever': 'Retriever (RAG)',
    'analyst': 'Analyst (Agent B)',
    'correlator': 'Correlator (Neural Moat)',
    'validator': 'Validator (Agent C)',
    'retry': 'Reflection Loop',
    'notify': 'Notify',
    'archiver': 'Archiver'
  };
  
  const activeLabel = nodeNames[currentAnalysis.active_node] || currentAnalysis.active_node;
  if (indText) indText.textContent = `Running: ${activeLabel}...`;
}

// ─── Alert Modal ────────────────────────────────────────────────────────────
function openAlertModal(alertId) {
  const alert = state.alerts.find(a => a.id === alertId);
  if (!alert) return;

  const overlay = document.getElementById('modal-overlay');
  const title   = document.getElementById('modal-title');
  const body    = document.getElementById('modal-body');

  title.textContent = alert.headline;

  const colorMap = { supply: 'var(--supply)' };
  const color = colorMap[alert.mode] || 'var(--supply)';
  const sevDots = Array.from({length: 5}, (_, i) =>
    `<div class="modal-sev-dot" style="background:${i < alert.severity ? color : 'var(--border-medium)'}; opacity:${i < alert.severity ? 1 : 0.3}"></div>`
  ).join('');

  const vBadge = alert.is_verified
    ? `<span class="badge badge-verified">✓ Verified by secondary sources</span>`
    : `<span class="badge badge-unverified">⚠ Awaiting verification</span>`;

  body.innerHTML = `
    <div class="modal-section">
      <div class="modal-section-label">Badges</div>
      <div class="modal-badges">
        <span class="badge badge-${alert.mode}">${alert.mode.toUpperCase()} SENTRY</span>
        ${vBadge}
        <span class="badge" style="background:var(--bg-card);color:var(--text-secondary);border:1px solid var(--border-subtle);">
          Confidence: ${Math.round(alert.confidence * 100)}%
        </span>
      </div>
    </div>
    <div class="modal-section">
      <div class="modal-section-label">Severity Level</div>
      <div class="modal-severity-bar">
        ${sevDots}
        <span class="modal-sev-label" style="color:${color}; margin-left:10px;">${alert.severity}/5</span>
      </div>
    </div>
    <div class="modal-section">
      <div class="modal-section-label">AI Analysis</div>
      <div class="modal-section-text">${escapeHtml(alert.analysis)}</div>
    </div>
    ${alert.convergence_warning ? `
    <div class="modal-section">
      <div class="modal-section-label">Cross-Mode Convergence</div>
      <div class="modal-section-text" style="color:var(--eco);">${escapeHtml(alert.convergence_warning)}</div>
    </div>` : ''}
    <div class="modal-section">
      <div class="modal-section-label">Source & Timestamp</div>
      <div class="modal-section-text">${escapeHtml(alert.source)} · ${new Date(alert.timestamp).toLocaleString()}</div>
    </div>
  `;

  overlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeModal(event) {
  if (event && event.target !== event.currentTarget) return;
  document.getElementById('modal-overlay').style.display = 'none';
  document.body.style.overflow = '';
}

// Close modal on Escape
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// ─── Mini Stats ─────────────────────────────────────────────────────────────
function updateMiniStats() {
  const supplyCount = state.alerts.filter(a => a.mode === 'supply').length;

  const s = document.getElementById('mini-supply');
  if (s) s.textContent = supplyCount || '-';

  // Update memory status
  const mem = document.getElementById('status-memory');
  if (mem) mem.textContent = `${state.alerts.length} events indexed`;
}

// ─── Status Last Poll Clock ─────────────────────────────────────────────────
function startStatusClock() {
  const el = document.getElementById('status-last-poll');
  let seconds = 0;
  setInterval(() => {
    seconds++;
    if (seconds < 60) el.textContent = `${seconds}s ago`;
    else if (seconds < 3600) el.textContent = `${Math.floor(seconds/60)}m ago`;
    else el.textContent = 'Polling...';
  }, 1000);
}

// ─── Animated Stat Counters ─────────────────────────────────────────────────
function animateCounters() {
  document.querySelectorAll('[data-target]').forEach(el => {
    const target = parseInt(el.dataset.target);
    const duration = 1800;
    const step = 16;
    const increment = target / (duration / step);
    let current = 0;

    const timer = setInterval(() => {
      current = Math.min(current + increment, target);
      el.textContent = Math.round(current).toLocaleString();
      if (current >= target) clearInterval(timer);
    }, step);
  });
}

// ─── Hero Particles ─────────────────────────────────────────────────────────
function createParticles() {
  const container = document.getElementById('hero-particles');
  if (!container) return;

  const colors = ['#10b981', '#34d399', '#6ee7b7', '#059669'];
  for (let i = 0; i < 35; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = 2 + Math.random() * 5;
    p.style.cssText = `
      width: ${size}px; height: ${size}px;
      left: ${Math.random() * 100}%;
      top: ${20 + Math.random() * 80}%;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      animation-duration: ${8 + Math.random() * 12}s;
      animation-delay: ${Math.random() * 8}s;
      filter: blur(${Math.random() > 0.7 ? 1 : 0}px);
    `;
    container.appendChild(p);
  }
}

// ─── Navbar scroll effect ───────────────────────────────────────────────────
function initNavbarScroll() {
  window.addEventListener('scroll', () => {
    const navbar = document.getElementById('navbar');
    if (window.scrollY > 60) {
      navbar.style.borderBottomColor = 'var(--border-medium)';
    } else {
      navbar.style.borderBottomColor = 'var(--border-subtle)';
    }
  }, { passive: true });
}

// ─── Intersection Observer for counter animation ────────────────────────────
function initCounterObserver() {
  const statsEl = document.querySelector('.hero-stats');
  if (!statsEl) return;

  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounters();
        obs.disconnect();
      }
    });
  }, { threshold: 0.5 });

  obs.observe(statsEl);
}

// ─── Intersection Observer for reveal animations ────────────────────────────
function initRevealObserver() {
  const reveals = document.querySelectorAll('.reveal');
  if (!reveals.length) return;

  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });

  reveals.forEach(el => obs.observe(el));
}

// ─── Toast notifications ────────────────────────────────────────────────────
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; }, 2500);
  setTimeout(() => toast.remove(), 2900);
}

// ─── Utilities ──────────────────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatTimeAgo(date) {
  const diff = (Date.now() - date) / 1000;
  if (diff < 60) return `${Math.round(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return date.toLocaleDateString();
}


// ═══════════════════════════════════════════════════════════════════════
//  3D GLOBE + SCROLL-DRIVEN ANIMATIONS
// ═══════════════════════════════════════════════════════════════════════

let globeScene, globeCamera, globeRenderer, globeMesh, atmosphereMesh;
let globeThreats = [];
let threatSprites = [];
let globeAnimating = false;
let globeRotationSpeed = 0.003;

// ─── Three.js Globe Init ────────────────────────────────────────────────
function initGlobeSection() {
  const canvas = document.getElementById('globe3d');
  if (!canvas || typeof THREE === 'undefined') return;

  const wrapper = document.getElementById('globe-canvas-wrapper');
  const w = wrapper.clientWidth;
  const h = wrapper.clientHeight;

  // Scene
  globeScene = new THREE.Scene();

  // Camera
  globeCamera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
  globeCamera.position.z = 3.2;

  // Renderer
  globeRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  globeRenderer.setSize(w, h);
  globeRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  globeRenderer.setClearColor(0x000000, 0);

  // ── Earth Sphere ──
  const earthGeo = new THREE.SphereGeometry(1, 64, 64);
  const textureLoader = new THREE.TextureLoader();

  // High-res realistic dark textures
  const earthMat = new THREE.MeshPhongMaterial({
    map: textureLoader.load('https://unpkg.com/three-globe/example/img/earth-dark.jpg'),
    bumpMap: textureLoader.load('https://unpkg.com/three-globe/example/img/earth-topology.png'),
    bumpScale: 0.02,
    specularMap: textureLoader.load('https://unpkg.com/three-globe/example/img/earth-water.png'),
    specular: new THREE.Color(0x333333),
    shininess: 15,
  });
  globeMesh = new THREE.Mesh(earthGeo, earthMat);
  globeScene.add(globeMesh);

  // ── Cloud Layer ──
  const cloudGeo = new THREE.SphereGeometry(1.008, 64, 64);
  const cloudMat = new THREE.MeshLambertMaterial({
    map: textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_clouds_1024.png'),
    transparent: true,
    opacity: 0.4,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide
  });
  const cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
  cloudMesh.name = 'clouds';
  globeMesh.add(cloudMesh);

  // ── Wireframe overlay (gives grid/tech look) ──
  const wireGeo = new THREE.SphereGeometry(1.012, 36, 36);
  const wireMat = new THREE.MeshBasicMaterial({
    color: 0x10b981,
    wireframe: true,
    transparent: true,
    opacity: 0.04,
  });
  const wireMesh = new THREE.Mesh(wireGeo, wireMat);
  globeMesh.add(wireMesh);

  // ── Atmosphere glow ──
  const atmosGeo = new THREE.SphereGeometry(1.15, 64, 64);
  const atmosMat = new THREE.ShaderMaterial({
    vertexShader: `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vNormal;
      void main() {
        float intensity = pow(0.6 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.5);
        gl_FragColor = vec4(0.063, 0.725, 0.506, 1.0) * intensity * 0.6;
      }
    `,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    transparent: true,
  });
  atmosphereMesh = new THREE.Mesh(atmosGeo, atmosMat);
  globeScene.add(atmosphereMesh);

  // ── Lighting ──
  const ambient = new THREE.AmbientLight(0x334466, 0.6);
  globeScene.add(ambient);

  const point1 = new THREE.PointLight(0x10b981, 1.8, 10);
  point1.position.set(3, 2, 4);
  globeScene.add(point1);

  const point2 = new THREE.PointLight(0x818cf8, 0.8, 10);
  point2.position.set(-3, -1, 3);
  globeScene.add(point2);

  // ── Star Field ──
  const starGeo = new THREE.BufferGeometry();
  const starPositions = [];
  for (let i = 0; i < 2000; i++) {
    starPositions.push(
      (Math.random() - 0.5) * 100,
      (Math.random() - 0.5) * 100,
      (Math.random() - 0.5) * 100
    );
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.08, transparent: true, opacity: 0.6 });
  globeScene.add(new THREE.Points(starGeo, starMat));

  // Start animation loop
  globeAnimating = true;
  animateGlobe();

  // Load threats
  loadGlobeThreats();

  // Resize handler
  window.addEventListener('resize', () => {
    if (!globeRenderer) return;
    const nw = wrapper.clientWidth;
    const nh = wrapper.clientHeight;
    globeCamera.aspect = nw / nh;
    globeCamera.updateProjectionMatrix();
    globeRenderer.setSize(nw, nh);
  });
}

function animateGlobe() {
  if (!globeAnimating) return;
  requestAnimationFrame(animateGlobe);

  if (globeMesh) {
    globeMesh.rotation.y += globeRotationSpeed;
    const clouds = globeMesh.getObjectByName('clouds');
    if (clouds) {
      clouds.rotation.y += globeRotationSpeed * 0.25;
    }
  }

  // Pulse threat sprites
  const t = Date.now() * 0.003;
  threatSprites.forEach((sprite, i) => {
    const scale = 0.04 + Math.sin(t + i * 0.7) * 0.015;
    sprite.scale.set(scale, scale, 1);
  });

  globeRenderer.render(globeScene, globeCamera);
}

// ─── Convert lat/lng to 3D position on sphere ──────────────────────────
function latLngToVector3(lat, lng, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
     radius * Math.cos(phi),
     radius * Math.sin(phi) * Math.sin(theta)
  );
}

// ─── Load threats from API and plot on globe ────────────────────────────
async function loadGlobeThreats() {
  try {
    const resp = await fetch(`${API_BASE}/globe-threats`);
    const data = await resp.json();
    globeThreats = data.threats || [];

    const regionEl = document.getElementById('globe-hud-region');
    if (regionEl && data.region_focus) regionEl.textContent = data.region_focus;
  } catch {
    // keep existing data
  }

  plotGlobeThreatPoints();
  updateGlobeHudCounts();
}

function plotGlobeThreatPoints() {
  // Remove old sprites
  threatSprites.forEach(s => globeMesh.remove(s));
  threatSprites = [];

  globeThreats.forEach(d => {
    const pos = latLngToVector3(d.lat, d.lng, 1.03);

    // Glowing sprite
    const spriteMat = new THREE.SpriteMaterial({
      color: d.severity >= 4 ? 0xf87171 : 0x10b981,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.position.copy(pos);
    sprite.scale.set(0.04, 0.04, 1);
    globeMesh.add(sprite);
    threatSprites.push(sprite);

    // Outer ring
    const ringMat = new THREE.SpriteMaterial({
      color: d.severity >= 4 ? 0xf87171 : 0x10b981,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
    });
    const ring = new THREE.Sprite(ringMat);
    ring.position.copy(pos);
    ring.scale.set(0.08, 0.08, 1);
    globeMesh.add(ring);
    threatSprites.push(ring);
  });
}

function updateGlobeHudCounts() {
  const count = globeThreats.length;
  const el = document.getElementById('globe-hud-count');
  if (el) el.textContent = count;
}

// ─── Scroll-driven Hero Parallax + Dark Theme Observer ──────────────────
function initGlobeDarkObserver() {
  const heroSection = document.querySelector('.hero');
  const globeSection = document.getElementById('globe-section');
  if (!globeSection) return;

  // 1) IntersectionObserver: toggle dark theme + HUD reveal
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        document.body.classList.add('theme-dark');
        globeSection.classList.add('in-view');
      } else {
        document.body.classList.remove('theme-dark');
        globeSection.classList.remove('in-view');
      }
    });
  }, {
    threshold: 0.15,
    rootMargin: '-60px 0px 0px 0px'
  });
  observer.observe(globeSection);

  // 2) Scroll listener: hero parallax fade-out as user scrolls toward globe
  if (heroSection) {
    window.addEventListener('scroll', () => {
      const scrollY = window.scrollY;
      const heroH = heroSection.offsetHeight;
      const fadeStart = heroH * 0.4;
      const fadeEnd = heroH * 0.85;

      if (scrollY > fadeStart && scrollY < fadeEnd + 200) {
        heroSection.classList.add('scroll-fade');
      } else if (scrollY <= fadeStart) {
        heroSection.classList.remove('scroll-fade');
      }
    }, { passive: true });
  }
}


// ─── Initialize App ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Set initial body mode class
  document.body.classList.add('mode-supply');

  createParticles();
  initNavbarScroll();
  initCounterObserver();
  initRevealObserver();
  startStatusClock();
  loadAlerts('supply');   // Load supply chain alerts immediately
  loadThreatCounts();   // Populate pillar card with real threat data
  loadConvergence();    // 🧠 Neural Moat

  // 🌍 Inline Globe Section
  initGlobeSection();
  initGlobeDarkObserver();

  // Start recurring polling
  setInterval(pollSystemStatus, 2000);
  setInterval(() => loadAlerts(state.activeMode), 15000);
  setInterval(loadThreatCounts, 10000);
  setInterval(loadConvergence, 8000);  // 🧠 Poll convergence every 8s
  setInterval(loadGlobeThreats, 15000);  // 🌍 Refresh globe threats

  // Init Infographics
  initCharts();
});

// ─── 🧠 Neural Moat — Convergence Fetcher ────────────────────────────────────
async function loadConvergence() {
  try {
    const resp = await fetch(`${API_BASE}/convergence`);
    if (!resp.ok) return;
    const data = await resp.json();

    // Update stats
    const totalEl = document.getElementById('moat-total');
    const vectorsEl = document.getElementById('moat-vectors');
    if (totalEl) totalEl.textContent = data.total || 0;
    if (vectorsEl) vectorsEl.textContent = data.memory_vectors || 0;

    // Update SVG link map
    updateMoatGraph(data.mode_links || {});

    // Render convergence alerts
    renderMoatAlerts(data.convergence_alerts || []);
  } catch (e) {
    console.warn('[NeuralMoat] Convergence fetch error:', e);
  }
}

function updateMoatGraph(links) {
  const linkPairs = {
    'epi-eco':     { lineId: 'link-epi-eco',     badgeId: 'badge-epi-eco',     textId: 'badge-epi-eco-text' },
    'eco-supply':  { lineId: 'link-eco-supply',   badgeId: 'badge-eco-supply',  textId: 'badge-eco-supply-text' },
    'epi-supply':  { lineId: 'link-epi-supply',   badgeId: 'badge-epi-supply',  textId: 'badge-epi-supply-text' },
  };

  for (const [key, ids] of Object.entries(linkPairs)) {
    const count = links[key] || 0;
    const line = document.getElementById(ids.lineId);
    const badge = document.getElementById(ids.badgeId);
    const text = document.getElementById(ids.textId);

    if (count > 0) {
      line?.classList.add('active');
      if (badge) badge.style.display = '';
      if (text) text.textContent = count;
    } else {
      line?.classList.remove('active');
      if (badge) badge.style.display = 'none';
    }
  }
}

function renderMoatAlerts(alerts) {
  const container = document.getElementById('moat-alerts-list');
  if (!container) return;

  if (!alerts.length) {
    container.innerHTML = `
      <div class="moat-empty">
        <span class="moat-empty-icon">🔍</span>
        <span>Scanning for cross-mode patterns...</span>
      </div>`;
    return;
  }

  container.innerHTML = alerts.map(a => {
    const warning = escapeHtml(a.convergence_warning || '').substring(0, 200);
    const headline = escapeHtml(a.headline || '').substring(0, 100);
    const mode = a.mode || 'eco';
    const sevDots = Array.from({length: 5}, (_, i) =>
      `<span style="display:inline-block;width:6px;height:6px;border-radius:50%;margin-right:2px;background:${i < (a.severity||3) ? '#6366f1' : 'var(--border-medium)'}"></span>`
    ).join('');

    return `
      <div class="moat-alert-item">
        <div class="moat-alert-headline">${headline}</div>
        <div class="moat-alert-warning">${warning}</div>
        <div class="moat-alert-meta">
          <span class="moat-alert-badge badge-${mode}">${mode.toUpperCase()}</span>
          <span class="moat-alert-badge badge-convergence">🧠 CONVERGENCE</span>
          ${sevDots}
        </div>
      </div>`;
  }).join('');
}


// ─── Threat Counts & Consequences for Pillar Cards ──────────────────────────
async function loadThreatCounts() {
  try {
    // Fetch total counts
    const countsResp = await fetch(`${API_BASE}/threat-counts`);
    const counts = await countsResp.json();

    const el = document.getElementById('supply-threat-count');
    if (el && counts.supply) {
      el.textContent = counts.supply.total;
    }

    // Fetch top headlines for supply as "consequences"
    const listEl = document.getElementById('supply-consequences-list');
    if (!listEl) return;

    try {
      const feedResp = await fetch(`${API_BASE}/feed/supply?page=1&per_page=20`);
      const feedData = await feedResp.json();
      const items = feedData.headlines || feedData.items || [];

      if (items.length === 0) {
        listEl.innerHTML = '<li style="opacity:0.5">Scanning supply chain feeds...</li>';
        return;
      }

      // Duplicate items for infinite scroll effect
      const displayItems = [...items, ...items];
      listEl.innerHTML = displayItems
        .map(item => `<li>${escapeHtml(item.headline || item.title || '')}</li>`)
        .join('');
    } catch (e) {
      console.warn('[Ticker] Failed to load supply feed', e);
    }
  } catch (e) {
    console.warn('[ThreatCounts] API error', e);
  }
}
  
  function initCharts() {
    if (typeof Chart === 'undefined') return;
  
    Chart.defaults.color = '#86868b';
    Chart.defaults.font.family = "'Inter', system-ui, sans-serif";
  
    const ctxSupply = document.getElementById('chartSupply');
  
    if (ctxSupply) {
      charts.supply = new Chart(ctxSupply, {
        type: 'doughnut',
        data: {
          labels: ['Logistics', 'Raw Materials', 'Labor Shortage', 'Energy Costs', 'Tariffs & Sanctions'],
          datasets: [{
            data: [30, 22, 18, 15, 15],
            backgroundColor: ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#059669'],
            borderWidth: 0,
            hoverOffset: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '65%',
          plugins: {
            legend: { position: 'right' }
          }
        }
      });
    }
  }
