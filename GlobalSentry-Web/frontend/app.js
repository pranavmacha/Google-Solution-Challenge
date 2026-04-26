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

const charts = {};

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
  document.body.classList.remove(...Object.values(MODE_CONFIG).map(config => config.bodyClass));
  document.body.classList.add(MODE_CONFIG[mode].bodyClass);

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

// ─── Scroll-driven dark theme + globe progress ──────────────────────────────
function initGlobalThreatTransition() {
  const section = document.getElementById('global-threat-model');
  const readout = document.getElementById('globe-readout');
  if (!section) return;

  const update = () => {
    const rect = section.getBoundingClientRect();
    const travel = Math.max(1, rect.height - window.innerHeight);
    const progress = Math.min(1, Math.max(0, -rect.top / travel));
    const shouldBeDark = window.scrollY > section.offsetTop - window.innerHeight * 0.42;

    section.style.setProperty('--globe-progress', progress.toFixed(3));
    document.body.classList.toggle('theme-threat-dark', shouldBeDark);
    if (readout) readout.textContent = `${Math.round(progress * 100)}%`;
  };

  update();
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
}

// ─── 3D Globe Model ────────────────────────────────────────────────────────
function initThreatGlobe() {
  const canvas = document.getElementById('threat-globe-canvas');
  const stage = document.getElementById('globe-stage');
  const labelLayer = document.getElementById('globe-label-layer');
  const section = document.getElementById('global-threat-model');
  if (!canvas || !stage || !labelLayer || !section || typeof THREE === 'undefined') return;

  const threats = [
    { label: 'Suez reroute risk', meta: 'Canal corridor', lat: 30.0444, lng: 32.5498, color: '#fb7185' },
    { label: 'Mumbai port pressure', meta: 'West India logistics', lat: 18.9388, lng: 72.8354, color: '#34d399' },
    { label: 'Singapore transshipment', meta: 'Container backlog', lat: 1.3521, lng: 103.8198, color: '#fbbf24' },
    { label: 'Shanghai supplier delays', meta: 'Manufacturing hub', lat: 31.2304, lng: 121.4737, color: '#8ff7c8' },
    { label: 'Panama canal drought', meta: 'Route capacity', lat: 9.08, lng: -79.68, color: '#fb7185' },
    { label: 'Rotterdam customs watch', meta: 'EU gateway', lat: 51.9244, lng: 4.4777, color: '#a5b4fc' },
  ];

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0.25, 6.3);

  const globeGroup = new THREE.Group();
  scene.add(globeGroup);

  scene.add(new THREE.AmbientLight(0x9fffd2, 0.82));

  const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
  keyLight.position.set(-3.2, 2.8, 4.6);
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0x34d399, 1.45);
  rimLight.position.set(4, -1.2, -3.4);
  scene.add(rimLight);

  const earthTexture = new THREE.CanvasTexture(createEarthTextureCanvas());
  earthTexture.colorSpace = THREE.SRGBColorSpace;
  earthTexture.anisotropy = 8;

  const globeMaterial = new THREE.MeshStandardMaterial({
    map: earthTexture,
    color: 0xffffff,
    roughness: 0.78,
    metalness: 0.02,
    emissive: new THREE.Color(0x06211a),
    emissiveIntensity: 0.18,
  });
  const globe = new THREE.Mesh(new THREE.SphereGeometry(2, 96, 96), globeMaterial);
  globeGroup.add(globe);

  const textureLoader = new THREE.TextureLoader();
  textureLoader.setCrossOrigin('anonymous');
  textureLoader.load(
    'assets/earth_atmos_2048.jpg',
    texture => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 8;
      globeMaterial.map = texture;
      globeMaterial.emissiveIntensity = 0.05;
      globeMaterial.needsUpdate = true;
    },
    undefined,
    () => {}
  );

  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(2.08, 96, 96),
    new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.BackSide,
      uniforms: {
        glowColor: { value: new THREE.Color(0x34d399) },
      },
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.68 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
          gl_FragColor = vec4(glowColor, intensity * 0.58);
        }
      `,
    })
  );
  globeGroup.add(atmosphere);

  const orbit = new THREE.Mesh(
    new THREE.TorusGeometry(2.42, 0.004, 12, 180),
    new THREE.MeshBasicMaterial({ color: 0x8ff7c8, transparent: true, opacity: 0.2 })
  );
  orbit.rotation.x = Math.PI / 2.8;
  orbit.rotation.y = -0.42;
  globeGroup.add(orbit);

  const labelItems = threats.map((threat, index) => {
    const point = latLngToVector3(threat.lat, threat.lng, 2.03);
    const outer = point.clone().multiplyScalar(1.18);
    const material = new THREE.MeshBasicMaterial({ color: threat.color, transparent: true, opacity: 0.95 });
    const marker = new THREE.Mesh(new THREE.SphereGeometry(0.045, 24, 24), material);
    marker.position.copy(point);

    const pulse = new THREE.Mesh(
      new THREE.SphereGeometry(0.076, 24, 24),
      new THREE.MeshBasicMaterial({ color: threat.color, transparent: true, opacity: 0.16 })
    );
    pulse.position.copy(point);

    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([point, outer]),
      new THREE.LineBasicMaterial({ color: threat.color, transparent: true, opacity: 0.55 })
    );

    const label = document.createElement('div');
    label.className = 'globe-threat-label';
    label.innerHTML = `<strong>${escapeHtml(threat.label)}</strong><span>${escapeHtml(threat.meta)}</span>`;
    labelLayer.appendChild(label);

    globeGroup.add(line, pulse, marker);
    return { ...threat, point, outer, marker, pulse, line, label, index };
  });

  const resize = () => {
    const size = Math.max(320, Math.min(stage.clientWidth, stage.clientHeight || 760));
    renderer.setSize(size, size, false);
    camera.aspect = 1;
    camera.updateProjectionMatrix();
  };

  const updateLabels = () => {
    const stageRect = stage.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    const canvasOffsetX = canvasRect.left - stageRect.left;
    const canvasOffsetY = canvasRect.top - stageRect.top;

    labelItems.forEach(item => {
      const worldPoint = item.outer.clone();
      globeGroup.localToWorld(worldPoint);
      const surfacePoint = item.point.clone();
      globeGroup.localToWorld(surfacePoint);

      const normal = surfacePoint.clone().normalize();
      const cameraDirection = camera.position.clone().sub(surfacePoint).normalize();
      const facingCamera = normal.dot(cameraDirection) > -0.35;

      const projected = worldPoint.project(camera);
      const rawX = canvasOffsetX + (projected.x * 0.5 + 0.5) * canvasRect.width;
      const rawY = canvasOffsetY + (-projected.y * 0.5 + 0.5) * canvasRect.height;
      const labelHalfWidth = Math.max(64, item.label.offsetWidth / 2);
      const labelHalfHeight = Math.max(28, item.label.offsetHeight / 2);
      const x = Math.min(stageRect.width - labelHalfWidth - 8, Math.max(labelHalfWidth + 8, rawX));
      const y = Math.min(stageRect.height - labelHalfHeight - 8, Math.max(labelHalfHeight + 8, rawY));
      const inside = projected.z < 1 && x > 0 && y > 0 && x < stageRect.width && y < stageRect.height;

      item.label.style.left = `${x}px`;
      item.label.style.top = `${y}px`;
      item.label.classList.toggle('is-visible', facingCamera && inside);
    });
  };

  const animate = time => {
    const progress = Number(section.style.getPropertyValue('--globe-progress')) || 0;
    const slowSpin = time * 0.00008;
    globeGroup.rotation.y = slowSpin + progress * 0.45 - 0.2;
    globeGroup.rotation.x = -0.22 + progress * 0.22;
    globeGroup.scale.setScalar(0.76 + progress * 0.27);
    orbit.rotation.z = time * 0.00014;

    labelItems.forEach(item => {
      const pulse = 1 + Math.sin(time * 0.004 + item.index) * 0.34;
      item.pulse.scale.setScalar(pulse);
      item.pulse.material.opacity = 0.12 + Math.max(0, Math.sin(time * 0.004 + item.index)) * 0.18;
    });

    renderer.render(scene, camera);
    updateLabels();
    requestAnimationFrame(animate);
  };

  resize();
  stage.classList.add('globe-ready');
  window.addEventListener('resize', resize);
  requestAnimationFrame(animate);
}

function latLngToVector3(lat, lng, radius) {
  const phi = (90 - lat) * Math.PI / 180;
  const theta = (lng + 180) * Math.PI / 180;
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    -radius * Math.sin(phi) * Math.sin(theta)
  );
}

function createEarthTextureCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  const ocean = ctx.createLinearGradient(0, 0, 0, canvas.height);
  ocean.addColorStop(0, '#09231e');
  ocean.addColorStop(0.45, '#0a3a32');
  ocean.addColorStop(1, '#061614');
  ctx.fillStyle = ocean;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = 'rgba(143,247,200,0.14)';
  ctx.lineWidth = 1;
  for (let lon = -180; lon <= 180; lon += 30) {
    const x = ((lon + 180) / 360) * canvas.width;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    const y = ((90 - lat) / 180) * canvas.height;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  const land = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  land.addColorStop(0, '#6dd7a4');
  land.addColorStop(0.5, '#2f8f67');
  land.addColorStop(1, '#8ff7c8');
  ctx.fillStyle = land;
  ctx.strokeStyle = 'rgba(230,255,244,0.32)';
  ctx.lineWidth = 2.4;

  const continents = [
    [[-168,70],[-136,72],[-104,62],[-82,48],[-72,28],[-96,15],[-112,22],[-126,38],[-150,50],[-168,70]],
    [[-84,12],[-70,4],[-54,-10],[-46,-25],[-56,-44],[-70,-55],[-78,-30],[-84,12]],
    [[-18,36],[8,58],[44,68],[92,58],[126,42],[144,20],[110,6],[82,22],[46,12],[30,-8],[16,-34],[-8,-34],[-18,4],[-18,36]],
    [[-18,34],[12,32],[36,10],[34,-24],[18,-35],[0,-30],[-12,-2],[-18,34]],
    [[68,24],[88,28],[102,18],[106,0],[96,-10],[78,6],[68,24]],
    [[112,-10],[154,-16],[154,-38],[128,-42],[112,-28],[112,-10]],
    [[-52,76],[18,78],[44,72],[18,64],[-34,66],[-52,76]],
  ];

  continents.forEach(poly => drawGeoPolygon(ctx, poly, canvas.width, canvas.height));

  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  for (let i = 0; i < 420; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const w = 18 + Math.random() * 80;
    ctx.beginPath();
    ctx.ellipse(x, y, w, 2 + Math.random() * 8, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  return canvas;
}

function drawGeoPolygon(ctx, points, width, height) {
  ctx.beginPath();
  points.forEach(([lng, lat], index) => {
    const x = ((lng + 180) / 360) * width;
    const y = ((90 - lat) / 180) * height;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
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


// ─── Initialize App ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Set initial body mode class
  document.body.classList.add('mode-supply');

  createParticles();
  initNavbarScroll();
  initCounterObserver();
  initRevealObserver();
  initGlobalThreatTransition();
  initThreatGlobe();
  startStatusClock();
  loadAlerts('supply');   // Load supply chain alerts immediately
  loadThreatCounts();   // Populate pillar card with real threat data
  loadConvergence();    // 🧠 Neural Moat

  // Start recurring polling
  setInterval(pollSystemStatus, 2000);
  setInterval(() => loadAlerts(state.activeMode), 15000);
  setInterval(loadThreatCounts, 10000);
  setInterval(loadConvergence, 8000);  // 🧠 Poll convergence every 8s

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
