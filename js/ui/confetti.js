// ════════════════════════════════════════
// ── Canvas-based Confetti System ──
// Physics-driven particles using requestAnimationFrame.
// Replaces the old CSS confettiSpray keyframe approach.
// ════════════════════════════════════════

// Category colors from CSS vars — read once from computed styles
const _COLORS = [
  '#818cf8', // cat-1 indigo
  '#fb923c', // cat-2 orange
  '#34d399', // cat-3 emerald
  '#f472b6', // cat-4 pink
  '#38bdf8', // cat-5 sky
  '#a78bfa', // cat-6 violet
  '#fbbf24', // cat-7 amber
  '#4ade80', // cat-8 green
  '#2dd4bf', // accent teal
];

const _SHAPES = ['rect', 'circle', 'triangle'];

/** @param {'light'|'medium'|'heavy'} tier */
export function spawnConfetti(tier = 'medium') {
  if (document.querySelector('.confetti-canvas')) return; // already running

  const count = tier === 'light' ? 20 : tier === 'heavy' ? 80 : 40;
  const duration = tier === 'heavy' ? 3200 : 2500; // ms

  const canvas = document.createElement('canvas');
  canvas.className = 'confetti-canvas';
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  const startTime = performance.now();

  /** @type {Particle[]} */
  const particles = Array.from({ length: count }, () => _makeParticle(canvas));

  function _tick(now) {
    const elapsed = now - startTime;
    if (elapsed >= duration) {
      canvas.remove();
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const globalAlpha = elapsed > duration * 0.75
      ? 1 - (elapsed - duration * 0.75) / (duration * 0.25)
      : 1;

    particles.forEach(p => {
      _updateParticle(p);
      _drawParticle(ctx, p, globalAlpha);
    });

    requestAnimationFrame(_tick);
  }

  requestAnimationFrame(_tick);
}

// ─── Tier helpers ─────────────────────────────────────────────────── */

/** Tier 2: Section cleared — sparkle sweep across top of viewport */
export function spawnSparkleSweep() {
  spawnConfetti('light');
}

/** Tier 3: Day 100% — standard confetti burst */
export function spawnDayComplete() {
  spawnConfetti('medium');
}

/** Tier 4: Week streak / badge — full-screen rain */
export function spawnHeavyCelebration() {
  spawnConfetti('heavy');
}

// ─── Particle ─────────────────────────────────────────────────────── */

/**
 * @typedef {Object} Particle
 * @property {number} x
 * @property {number} y
 * @property {number} vx
 * @property {number} vy
 * @property {number} size
 * @property {number} rotation
 * @property {number} rotationSpeed
 * @property {string} color
 * @property {string} shape
 * @property {number} drag
 */

/** @returns {Particle} */
function _makeParticle(canvas) {
  const angle = Math.random() * Math.PI * 2;
  const speed = 3 + Math.random() * 6;
  // Spawn near center-top with spread
  const x = canvas.width * (0.25 + Math.random() * 0.5);
  const y = canvas.height * 0.15 + Math.random() * 40;

  return {
    x,
    y,
    vx: Math.cos(angle) * speed * (0.5 + Math.random()),
    vy: -speed * (0.5 + Math.random() * 1.5), // mostly upward
    size: 5 + Math.random() * 8,
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: (Math.random() - 0.5) * 0.3,
    color: _COLORS[Math.floor(Math.random() * _COLORS.length)],
    shape: _SHAPES[Math.floor(Math.random() * _SHAPES.length)],
    drag: 0.985 + Math.random() * 0.01, // air resistance
  };
}

/** @param {Particle} p */
function _updateParticle(p) {
  p.vy += 0.18;   // gravity
  p.vx *= p.drag; // horizontal drag (slight wind effect)
  p.vy *= 0.995;  // vertical drag
  p.vx += (Math.random() - 0.5) * 0.05; // micro-turbulence
  p.x += p.vx;
  p.y += p.vy;
  p.rotation += p.rotationSpeed;
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {Particle} p
 * @param {number} globalAlpha
 */
function _drawParticle(ctx, p, globalAlpha) {
  ctx.save();
  ctx.globalAlpha = globalAlpha;
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rotation);
  ctx.fillStyle = p.color;

  if (p.shape === 'rect') {
    ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
  } else if (p.shape === 'circle') {
    ctx.beginPath();
    ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // triangle
    ctx.beginPath();
    ctx.moveTo(0, -p.size / 2);
    ctx.lineTo(p.size / 2, p.size / 2);
    ctx.lineTo(-p.size / 2, p.size / 2);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}
