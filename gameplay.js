/**
 * gameplay.js — Pulpito: El Gran Robo del Fondo del Mar
 * Módulo ES2022 — Canvas 2D vectorial, sin imágenes externas
 */

// ─── Constantes ──────────────────────────────────────────────────────────────
const LOGICAL_WIDTH  = 960;
const LOGICAL_HEIGHT = 540;
const SCROLL_SPEED   = 80; // px/s en Fase 1

const PALETTE = {
  sea:           '#0a3566',
  seaLight:      '#1a5fa8',
  sand:          '#c8a85a',
  coral:         '#e05a3a',
  white:         '#f0f0f0',
  inkBlack:      '#111133',
  gold:          '#ffd700',
  octopusPink:   '#f4a0c0',
  octopusPurple: '#9b59b6',
};

// ─── Estado global de inputs ──────────────────────────────────────────────────
const keys = {};
const inputQueue = [];
let pointerLogical = { x: 0, y: 0 };

// ─── Variables de escala ──────────────────────────────────────────────────────
let canvas, ctx, scaleX = 1, scaleY = 1;

// ─── Singletons ───────────────────────────────────────────────────────────────
let player, soundManager, sceneManager;
let frameCount = 0;
let currentPhaseState = null; // referencia al estado de fase activo (para respawnQueue)

// ─── Colisiones ──────────────────────────────────────────────────────────────
function aabbCollide(a, b) {
  return (
    a.x < b.x + b.w && a.x + a.w > b.x &&
    a.y < b.y + b.h && a.y + a.h > b.y
  );
}

function circleRectCollide(cx, cy, cr, rx, ry, rw, rh) {
  const nearX = Math.max(rx, Math.min(cx, rx + rw));
  const nearY = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - nearX, dy = cy - nearY;
  return dx * dx + dy * dy < cr * cr;
}

// ─── Clase base Entity ────────────────────────────────────────────────────────
class Entity {
  constructor(x, y, w, h) {
    this.x = x; this.y = y;
    this.w = w; this.h = h;
    this.vx = 0; this.vy = 0;
    this.alive = true;
  }
  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }
  getBBox() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
  render(ctx) {} // abstracto
}

// ─── InkBall — Bala de tinta ──────────────────────────────────────────────────
class InkBall extends Entity {
  constructor(x, y, vx) {
    super(x, y, 16, 16);
    this.vx = vx;
    this.r  = 8;
  }
  update(dt) {
    this.x += this.vx * dt;
    if (this.x < -50 || this.x > LOGICAL_WIDTH + 50) this.alive = false;
  }
  render(ctx) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.x + this.r, this.y + this.r, this.r, 0, Math.PI * 2);
    ctx.fillStyle = PALETTE.inkBlack;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(this.x + this.r, this.y + this.r, this.r + 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(20,20,80,0.3)';
    ctx.fill();
    ctx.restore();
  }
}

// ─── Dibujo de Pulpito ────────────────────────────────────────────────────────
function drawPulpito(ctx, x, y, w, h, blink = false) {
  if (blink && Math.floor(Date.now() / 100) % 2 === 0) return;
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);

  // Tentáculos (8, semicírculo inferior)
  const tentacleCount = 8;
  for (let i = 0; i < tentacleCount; i++) {
    const angle = Math.PI + (i / (tentacleCount - 1)) * Math.PI;
    const tx = Math.cos(angle) * (w * 0.45);
    const ty = Math.abs(Math.sin(angle)) * (h * 0.3) + h * 0.2;
    const cpx = tx * 1.2;
    const cpy = ty + h * 0.25;
    ctx.beginPath();
    ctx.moveTo(tx * 0.5, h * 0.1);
    ctx.quadraticCurveTo(cpx, cpy, tx, ty + h * 0.18);
    ctx.lineWidth = w * 0.08;
    ctx.strokeStyle = PALETTE.octopusPink;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  // Cuerpo (óvalo)
  ctx.beginPath();
  ctx.ellipse(0, 0, w * 0.45, h * 0.38, 0, 0, Math.PI * 2);
  ctx.fillStyle = PALETTE.octopusPurple;
  ctx.fill();
  ctx.strokeStyle = '#6c3483';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Costuras (líneas de puntos)
  ctx.setLineDash([3, 5]);
  ctx.strokeStyle = '#c39bd3';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-w * 0.25, -h * 0.1); ctx.lineTo(-w * 0.25, h * 0.25); ctx.stroke();
  ctx.beginPath(); ctx.moveTo( w * 0.25, -h * 0.1); ctx.lineTo( w * 0.25, h * 0.25); ctx.stroke();
  ctx.setLineDash([]);

  // Ojos
  [-1, 1].forEach(side => {
    ctx.beginPath();
    ctx.arc(side * w * 0.17, -h * 0.08, w * 0.13, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(side * w * 0.17 + side * 2, -h * 0.06, w * 0.06, 0, Math.PI * 2);
    ctx.fillStyle = '#111';
    ctx.fill();
    // Reflejo
    ctx.beginPath();
    ctx.arc(side * w * 0.17 + side * 1, -h * 0.1, w * 0.03, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
  });

  // Boca (sonrisa)
  ctx.beginPath();
  ctx.moveTo(-w * 0.1, h * 0.08);
  ctx.bezierCurveTo(-w * 0.05, h * 0.16, w * 0.05, h * 0.16, w * 0.1, h * 0.08);
  ctx.strokeStyle = '#6c3483';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Mejillas rosadas
  [-1, 1].forEach(side => {
    ctx.beginPath();
    ctx.arc(side * w * 0.3, h * 0.04, w * 0.09, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 150, 170, 0.45)';
    ctx.fill();
  });

  // Pistola de bolas de tinta
  ctx.fillStyle = '#222';
  ctx.fillRect(w * 0.3, h * 0.05, w * 0.28, h * 0.1);
  ctx.fillRect(w * 0.52, h * 0.02, w * 0.1, h * 0.06);
  // Bola de tinta en cañón
  ctx.beginPath();
  ctx.arc(w * 0.65, h * 0.05, w * 0.05, 0, Math.PI * 2);
  ctx.fillStyle = PALETTE.inkBlack;
  ctx.fill();

  ctx.restore();
}

// ─── Player ───────────────────────────────────────────────────────────────────
class Player extends Entity {
  constructor() {
    super(120, LOGICAL_HEIGHT - 160, 60, 80);
    this.lives        = 5;
    this.coins        = 0;
    this.facingRight  = true;
    this.isJumping    = false;
    this.onGround     = false;
    this.shootCooldown = 0;
    this.inkBalls     = [];
    this.invincibleTime = 0;
    this.groundY      = LOGICAL_HEIGHT - 160;
    this.jumpVy       = -700;
    this.gravity      = 1200;
  }

  shoot() {
    if (this.shootCooldown > 0) return;
    this.inkBalls.push(new InkBall(
      this.x + (this.facingRight ? this.w + 4 : -20),
      this.y + this.h * 0.4,
      this.facingRight ? 480 : -480
    ));
    this.shootCooldown = 0.25;
    soundManager.play('inkShoot');
  }

  update(dt) {
    this.shootCooldown  = Math.max(0, this.shootCooldown  - dt);
    this.invincibleTime = Math.max(0, this.invincibleTime - dt);

    // Gravedad
    this.vy += this.gravity * dt;
    this.y  += this.vy * dt;

    // Suelo
    if (this.y >= this.groundY) {
      this.y        = this.groundY;
      this.vy       = 0;
      this.isJumping = false;
      this.onGround  = true;
    }

    // Clamp horizontal dentro de pantalla
    this.x = Math.max(0, Math.min(LOGICAL_WIDTH - this.w, this.x));
    // Clamp vertical
    this.y = Math.min(this.groundY, Math.max(0, this.y));

    // Actualizar balas
    this.inkBalls = this.inkBalls.filter(b => b.alive);
    this.inkBalls.forEach(b => b.update(dt));
  }

  takeDamage() {
    if (this.invincibleTime > 0) return;
    this.lives--;
    this.invincibleTime = 2;
    soundManager.play('playerHit');
  }

  render(ctx) {
    ctx.save();
    if (!this.facingRight) {
      ctx.translate(this.x + this.w, 0);
      ctx.scale(-1, 1);
      drawPulpito(ctx, 0, this.y, this.w, this.h, this.invincibleTime > 0);
    } else {
      drawPulpito(ctx, this.x, this.y, this.w, this.h, this.invincibleTime > 0);
    }
    ctx.restore();
    this.inkBalls.forEach(b => b.render(ctx));
  }
}

// ─── Dibujo de Calamardo ──────────────────────────────────────────────────────
function drawCalamardo(ctx, x, y, w, h) {
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);

  // Cabeza ovalada grande con nariz bulbosa
  ctx.beginPath();
  ctx.ellipse(0, -h * 0.2, w * 0.38, h * 0.3, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#6aadba';
  ctx.fill(); ctx.strokeStyle = '#3d7a8a'; ctx.lineWidth = 2; ctx.stroke();

  // Nariz bulbosa
  ctx.beginPath();
  ctx.ellipse(0, -h * 0.15, w * 0.14, h * 0.2, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#5a9daa';
  ctx.fill(); ctx.stroke();

  // Ojos
  [-1, 1].forEach(side => {
    ctx.beginPath();
    ctx.ellipse(side * w * 0.18, -h * 0.28, w * 0.1, h * 0.06, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#fff'; ctx.fill();
    ctx.beginPath();
    ctx.arc(side * w * 0.18, -h * 0.27, w * 0.055, 0, Math.PI * 2);
    ctx.fillStyle = '#222'; ctx.fill();
  });

  // Cuerpo trapezoidal
  ctx.beginPath();
  ctx.moveTo(-w * 0.22, -h * 0.02);
  ctx.lineTo( w * 0.22, -h * 0.02);
  ctx.lineTo( w * 0.16,  h * 0.32);
  ctx.lineTo(-w * 0.16,  h * 0.32);
  ctx.closePath();
  ctx.fillStyle = '#6aadba'; ctx.fill(); ctx.stroke();

  // Tentáculos-piernas (2 curvados)
  [-1, 1].forEach(side => {
    ctx.beginPath();
    ctx.moveTo(side * w * 0.1, h * 0.3);
    ctx.quadraticCurveTo(side * w * 0.18, h * 0.48, side * w * 0.14, h * 0.52);
    ctx.lineWidth = w * 0.07; ctx.strokeStyle = '#6aadba';
    ctx.lineCap = 'round'; ctx.stroke();
  });

  ctx.restore();
}

// ─── Dibujo de Bob Esponja ────────────────────────────────────────────────────
function drawBobEsponja(ctx, x, y, w, h) {
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);

  // Cuerpo esponja
  ctx.beginPath();
  ctx.roundRect(-w * 0.38, -h * 0.45, w * 0.76, h * 0.7, w * 0.06);
  ctx.fillStyle = '#f5e642'; ctx.fill();
  ctx.strokeStyle = '#c8b800'; ctx.lineWidth = 2; ctx.stroke();

  // Poros
  const holePositions = [
    [-0.2, -0.3], [0.1, -0.35], [-0.05, -0.1],
    [0.22, -0.15], [-0.25, 0.0], [0.05, 0.1], [0.2, 0.05],
  ];
  holePositions.forEach(([hx, hy]) => {
    ctx.beginPath();
    ctx.ellipse(hx * w, hy * h, w * 0.05, h * 0.04, 0.3, 0, Math.PI * 2);
    ctx.fillStyle = '#d4c400';
    ctx.fill();
  });

  // Pantalones marrones
  ctx.beginPath();
  ctx.roundRect(-w * 0.32, h * 0.12, w * 0.64, h * 0.22, w * 0.04);
  ctx.fillStyle = '#7a4f1e'; ctx.fill(); ctx.strokeStyle = '#5a3a0e'; ctx.stroke();

  // Corbata roja
  ctx.beginPath();
  ctx.moveTo(-w * 0.05, -h * 0.08);
  ctx.lineTo( w * 0.05, -h * 0.08);
  ctx.lineTo( w * 0.02,  h * 0.1);
  ctx.lineTo(-w * 0.02,  h * 0.1);
  ctx.closePath();
  ctx.fillStyle = '#e00'; ctx.fill();

  // Ojos grandes
  [-1, 1].forEach(side => {
    ctx.beginPath();
    ctx.arc(side * w * 0.18, -h * 0.28, w * 0.14, 0, Math.PI * 2);
    ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#aaa'; ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath();
    ctx.arc(side * w * 0.18, -h * 0.28, w * 0.07, 0, Math.PI * 2);
    ctx.fillStyle = '#1a6ae0'; ctx.fill();
    ctx.beginPath();
    ctx.arc(side * w * 0.18, -h * 0.28, w * 0.035, 0, Math.PI * 2);
    ctx.fillStyle = '#000'; ctx.fill();
  });

  // Dientes grandes
  [-1, 1].forEach(side => {
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#ccc'; ctx.lineWidth = 1;
    ctx.fillRect(side * w * 0.08, h * 0.0, w * 0.1, h * 0.09);
    ctx.strokeRect(side * w * 0.08, h * 0.0, w * 0.1, h * 0.09);
  });

  ctx.restore();
}

// ─── Dibujo de Don Cangrejo ───────────────────────────────────────────────────
function drawDonCangrejo(ctx, x, y, w, h) {
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);

  // Cuerpo semicircular
  ctx.beginPath();
  ctx.ellipse(0, h * 0.05, w * 0.38, h * 0.28, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#c0392b'; ctx.fill();
  ctx.strokeStyle = '#922b21'; ctx.lineWidth = 2; ctx.stroke();

  // Ojos en pedúnculos
  [-1, 1].forEach(side => {
    ctx.beginPath();
    ctx.moveTo(side * w * 0.2, -h * 0.18);
    ctx.lineTo(side * w * 0.22, -h * 0.36);
    ctx.strokeStyle = '#c0392b'; ctx.lineWidth = w * 0.05; ctx.stroke();
    ctx.beginPath();
    ctx.arc(side * w * 0.22, -h * 0.4, w * 0.1, 0, Math.PI * 2);
    ctx.fillStyle = '#fff'; ctx.fill();
    ctx.beginPath();
    ctx.arc(side * w * 0.22, -h * 0.4, w * 0.055, 0, Math.PI * 2);
    ctx.fillStyle = '#111'; ctx.fill();
  });

  // Pinzas
  [-1, 1].forEach(side => {
    ctx.save();
    ctx.translate(side * w * 0.52, h * 0.0);
    ctx.beginPath();
    ctx.ellipse(0, 0, w * 0.22, h * 0.16, side * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = '#e74c3c'; ctx.fill(); ctx.strokeStyle = '#922b21'; ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -h * 0.08); ctx.lineTo(w * 0.12 * side, h * 0.04);
    ctx.strokeStyle = '#922b21'; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
  });

  // Patas
  [-1, 1].forEach(side => {
    for (let i = 0; i < 2; i++) {
      ctx.beginPath();
      ctx.moveTo(side * w * 0.3, h * 0.1 + i * h * 0.08);
      ctx.quadraticCurveTo(side * w * 0.5, h * 0.18 + i * h * 0.08, side * w * 0.45, h * 0.35);
      ctx.lineWidth = w * 0.04; ctx.strokeStyle = '#c0392b'; ctx.lineCap = 'round'; ctx.stroke();
    }
  });

  ctx.restore();
}

// ─── Dibujo de Tiburón ────────────────────────────────────────────────────────
function drawTiburon(ctx, x, y, w, h, lives = null) {
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);

  // Cuerpo fusiforme
  ctx.beginPath();
  ctx.ellipse(0, 0, w * 0.48, h * 0.28, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#8ecae6'; ctx.fill();
  ctx.strokeStyle = '#4a90c4'; ctx.lineWidth = 2; ctx.stroke();

  // Vientre más claro
  ctx.beginPath();
  ctx.ellipse(0, h * 0.08, w * 0.35, h * 0.14, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#dff3ff'; ctx.fill();

  // Aleta dorsal
  ctx.beginPath();
  ctx.moveTo(-w * 0.1, -h * 0.28);
  ctx.lineTo( w * 0.1, -h * 0.28);
  ctx.lineTo( w * 0.02, -h * 0.55);
  ctx.closePath();
  ctx.fillStyle = '#5a9fc0'; ctx.fill(); ctx.stroke();

  // Cola en V
  ctx.beginPath();
  ctx.moveTo( w * 0.45, 0);
  ctx.lineTo( w * 0.7, -h * 0.22);
  ctx.lineTo( w * 0.52, 0);
  ctx.lineTo( w * 0.7,  h * 0.22);
  ctx.closePath();
  ctx.fillStyle = '#5a9fc0'; ctx.fill(); ctx.stroke();

  // Ojo
  ctx.beginPath();
  ctx.arc(-w * 0.22, -h * 0.06, w * 0.06, 0, Math.PI * 2);
  ctx.fillStyle = '#111'; ctx.fill();
  ctx.beginPath();
  ctx.arc(-w * 0.2, -h * 0.08, w * 0.02, 0, Math.PI * 2);
  ctx.fillStyle = '#fff'; ctx.fill();

  // Boca con dientes triangulares
  ctx.beginPath();
  ctx.moveTo(-w * 0.38, h * 0.05);
  ctx.lineTo(-w * 0.48, h * 0.0);
  ctx.strokeStyle = '#333'; ctx.lineWidth = 2; ctx.stroke();
  for (let i = 0; i < 5; i++) {
    const tx = -w * 0.44 + i * w * 0.1;
    ctx.beginPath();
    ctx.moveTo(tx, h * 0.02);
    ctx.lineTo(tx + w * 0.05, h * 0.1);
    ctx.lineTo(tx + w * 0.1, h * 0.02);
    ctx.closePath();
    ctx.fillStyle = '#fff'; ctx.fill();
    ctx.strokeStyle = '#ccc'; ctx.lineWidth = 1; ctx.stroke();
  }

  // Barra de vida del jefe (solo cuando lives no es null)
  if (lives !== null) {
    const barW = w * 0.9, barH = h * 0.07;
    const barX = -barW / 2, barY = -h * 0.7;
    ctx.fillStyle = '#333';
    ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
    ctx.fillStyle = `hsl(${(lives / 15) * 120}, 80%, 45%)`;
    ctx.fillRect(barX, barY, barW * (lives / 15), barH);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);
  }

  ctx.restore();
}

// ─── Dibujo de hamburguesa ────────────────────────────────────────────────────
function drawHamburger(ctx, x, y, w, h) {
  ctx.save(); ctx.translate(x, y);
  // Pan superior
  ctx.beginPath(); ctx.ellipse(w / 2, h * 0.15, w * 0.45, h * 0.2, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#c8870a'; ctx.fill();
  // Semillas
  [[-0.1, 0], [0.15, -0.05], [0.05, 0.05]].forEach(([sx, sy]) => {
    ctx.beginPath(); ctx.ellipse(w / 2 + sx * w, h * 0.12 + sy * h, w * 0.04, h * 0.03, 0.5, 0, Math.PI * 2);
    ctx.fillStyle = '#f0e0a0'; ctx.fill();
  });
  // Lechuga
  ctx.fillStyle = '#3a8a2a';
  ctx.fillRect(w * 0.1, h * 0.28, w * 0.8, h * 0.1);
  // Carne
  ctx.fillStyle = '#8B3A0A';
  ctx.fillRect(w * 0.08, h * 0.38, w * 0.84, h * 0.12);
  // Pan inferior
  ctx.beginPath(); ctx.ellipse(w / 2, h * 0.82, w * 0.45, h * 0.18, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#c8870a'; ctx.fill();
  ctx.restore();
}

// ─── Entidades enemigos ───────────────────────────────────────────────────────

/**
 * Renderiza explosión de tinta cuando un enemigo muere.
 * Se llama con coordenadas de pantalla (screenX, screenY).
 */
function renderDeathExplosion(ctx, screenX, screenY, w, timer, duration) {
  const progress = timer / duration;
  ctx.save();
  ctx.globalAlpha = 1 - progress;
  const particleCount = 12;
  for (let i = 0; i < particleCount; i++) {
    const angle = (i / particleCount) * Math.PI * 2;
    const dist  = progress * w * 1.2;
    const px    = screenX + w / 2 + Math.cos(angle) * dist;
    const py    = screenY + w / 2 + Math.sin(angle) * dist;
    const r     = (1 - progress) * 8 + 2;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fillStyle = i % 2 === 0 ? PALETTE.inkBlack : '#4444aa';
    ctx.fill();
  }
  if (progress < 0.2) {
    ctx.beginPath();
    ctx.arc(screenX + w / 2, screenY + w / 2, w * 0.6 * (1 - progress / 0.2), 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fill();
  }
  ctx.restore();
}

class Calamardo extends Entity {
  constructor(x, y) {
    super(x, y, 56, 80);
    this.worldX        = x;         // coordenada de mundo (Fase 1); en Fase 2 == x de pantalla
    this.spawnWorldX   = x;
    this.baseSpeed     = 80;
    this.speed         = 80;
    this.dir           = -1;
    this.stunTime      = 0;
    this.shootTimer    = 0;
    this.shootInterval = 4;
    this.bubbles       = [];
    this.hp            = 5;
    this.maxHp         = 5;
    this.deathTimer    = -1;
    this.DEATH_ANIM_DURATION = 0.6;
  }

  hit() {
    if (this.deathTimer >= 0) return;
    this.hp--;
    this.stunTime = 0.4;
    soundManager.play('enemyHit');
    if (this.hp <= 0) this.die();
  }

  die() {
    this.deathTimer = 0;
    soundManager.play('enemyDeath');
    player.coins += 200;
    if (currentPhaseState?.respawnQueue) {
      currentPhaseState.respawnQueue.push({ type: 'Calamardo', delay: 4.0, elapsed: 0, done: false });
    }
  }

  stun() {
    this.stunTime = 2;
    soundManager.play('enemyStun');
  }

  // scrollX: si se provee, usa worldX (Fase 1); si no, usa this.x (Fase 2)
  update(dt, scrollX, canShoot = false) {
    if (this.deathTimer >= 0) {
      this.deathTimer += dt;
      if (this.deathTimer >= this.DEATH_ANIM_DURATION) this.alive = false;
      return;
    }
    this.stunTime = Math.max(0, this.stunTime - dt);
    if (this.stunTime > 0) {
      this.bubbles = this.bubbles.filter(b => b.alive);
      this.bubbles.forEach(b => b.update(dt));
      return;
    }

    if (scrollX !== undefined) {
      // Fase 1: movimiento en coordenadas de mundo, patrulla alrededor del spawn
      this.worldX += this.dir * this.speed * dt;
      const minW = this.spawnWorldX - 160;
      const maxW = this.spawnWorldX + 200;
      if (this.worldX < minW || this.worldX > maxW) {
        this.dir *= -1;
        this.worldX = Math.max(minW, Math.min(maxW, this.worldX));
      }
      this.x = this.worldX; // mantener sincronizado
      this.y = LOGICAL_HEIGHT - this.h - 80;

      if (canShoot) {
        this.shootTimer += dt;
        if (this.shootTimer >= this.shootInterval) {
          this.shootTimer = 0;
          const sx = this.worldX - scrollX;
          this.bubbles.push(new BubbleProjectile(sx + this.w / 2, this.y + this.h / 2));
        }
      }
    } else {
      // Fase 2: movimiento en coordenadas de pantalla
      this.x += this.dir * this.speed * dt;
      if (this.x < 50 || this.x > LOGICAL_WIDTH - 100) this.dir *= -1;
      this.y = LOGICAL_HEIGHT - this.h - 80;
      this.worldX = this.x;

      if (canShoot) {
        this.shootTimer += dt;
        if (this.shootTimer >= this.shootInterval) {
          this.shootTimer = 0;
          this.bubbles.push(new BubbleProjectile(this.x + this.w / 2, this.y + this.h / 2));
        }
      }
    }
    this.bubbles = this.bubbles.filter(b => b.alive);
    this.bubbles.forEach(b => b.update(dt));
  }

  // scrollX: si se provee, calcula posición de pantalla desde worldX (Fase 1)
  render(ctx, scrollX) {
    const screenX = scrollX !== undefined ? this.worldX - scrollX : this.x;
    if (screenX < -this.w - 50 || screenX > LOGICAL_WIDTH + 50) return;

    if (this.deathTimer >= 0) {
      renderDeathExplosion(ctx, screenX, this.y, this.w, this.deathTimer, this.DEATH_ANIM_DURATION);
      return;
    }

    ctx.save();
    if (this.stunTime > 0 && Math.floor(Date.now() / 80) % 2 === 0) {
      ctx.restore();
      this.bubbles.forEach(b => b.render(ctx));
      return;
    }
    if (this.stunTime > 0) ctx.globalAlpha = 0.5;
    drawCalamardo(ctx, screenX, this.y, this.w, this.h);
    ctx.restore();

    if (this.hp < this.maxHp && this.deathTimer < 0) {
      const barW = this.w * 0.8;
      const barX = screenX + this.w * 0.1;
      const barY = this.y - 10;
      ctx.fillStyle = '#333';
      ctx.fillRect(barX, barY, barW, 5);
      ctx.fillStyle = `hsl(${(this.hp / this.maxHp) * 120}, 80%, 45%)`;
      ctx.fillRect(barX, barY, barW * (this.hp / this.maxHp), 5);
    }

    this.bubbles.forEach(b => b.render(ctx));
  }
}

class BobEsponja extends Entity {
  constructor(x, y) {
    super(x, y, 50, 80);
    this.worldX        = x;
    this.spawnWorldX   = x;
    this.speed         = 90;
    this.baseSpeed     = 90;
    this.dir           = 1;
    this.stunTime      = 0;
    this.shootTimer    = 0;
    this.shootInterval = 3.5;
    this.bubbles       = [];
    this.hp            = 5;
    this.maxHp         = 5;
    this.deathTimer    = -1;
    this.DEATH_ANIM_DURATION = 0.6;
  }

  hit() {
    if (this.deathTimer >= 0) return;
    this.hp--;
    this.stunTime = 0.4;
    soundManager.play('enemyHit');
    if (this.hp <= 0) this.die();
  }

  die() {
    this.deathTimer = 0;
    soundManager.play('enemyDeath');
    player.coins += 200;
    if (currentPhaseState?.respawnQueue) {
      currentPhaseState.respawnQueue.push({ type: 'BobEsponja', delay: 4.0, elapsed: 0, done: false });
    }
  }

  stun() {
    this.stunTime = 2;
    soundManager.play('enemyStun');
  }

  update(dt, scrollX, canShoot = false) {
    if (this.deathTimer >= 0) {
      this.deathTimer += dt;
      if (this.deathTimer >= this.DEATH_ANIM_DURATION) this.alive = false;
      return;
    }
    this.stunTime = Math.max(0, this.stunTime - dt);
    if (this.stunTime > 0) {
      this.bubbles = this.bubbles.filter(b => b.alive);
      this.bubbles.forEach(b => b.update(dt));
      return;
    }

    if (scrollX !== undefined) {
      this.worldX += this.dir * this.speed * dt;
      const minW = this.spawnWorldX - 160;
      const maxW = this.spawnWorldX + 200;
      if (this.worldX < minW || this.worldX > maxW) {
        this.dir *= -1;
        this.worldX = Math.max(minW, Math.min(maxW, this.worldX));
      }
      this.x = this.worldX;
      this.y = LOGICAL_HEIGHT - this.h - 80;

      if (canShoot) {
        this.shootTimer += dt;
        if (this.shootTimer >= this.shootInterval) {
          this.shootTimer = 0;
          const sx = this.worldX - scrollX;
          this.bubbles.push(new BubbleProjectile(sx + this.w / 2, this.y + this.h / 2));
        }
      }
    } else {
      this.x += this.dir * this.speed * dt;
      if (this.x < 50 || this.x > LOGICAL_WIDTH - 100) this.dir *= -1;
      this.y = LOGICAL_HEIGHT - this.h - 80;
      this.worldX = this.x;

      if (canShoot) {
        this.shootTimer += dt;
        if (this.shootTimer >= this.shootInterval) {
          this.shootTimer = 0;
          this.bubbles.push(new BubbleProjectile(this.x + this.w / 2, this.y + this.h / 2));
        }
      }
    }
    this.bubbles = this.bubbles.filter(b => b.alive);
    this.bubbles.forEach(b => b.update(dt));
  }

  render(ctx, scrollX) {
    const screenX = scrollX !== undefined ? this.worldX - scrollX : this.x;
    if (screenX < -this.w - 50 || screenX > LOGICAL_WIDTH + 50) return;

    if (this.deathTimer >= 0) {
      renderDeathExplosion(ctx, screenX, this.y, this.w, this.deathTimer, this.DEATH_ANIM_DURATION);
      return;
    }

    ctx.save();
    if (this.stunTime > 0 && Math.floor(Date.now() / 80) % 2 === 0) {
      ctx.restore();
      this.bubbles.forEach(b => b.render(ctx));
      return;
    }
    if (this.stunTime > 0) ctx.globalAlpha = 0.5;
    drawBobEsponja(ctx, screenX, this.y, this.w, this.h);
    ctx.restore();

    if (this.hp < this.maxHp && this.deathTimer < 0) {
      const barW = this.w * 0.8;
      const barX = screenX + this.w * 0.1;
      const barY = this.y - 10;
      ctx.fillStyle = '#333';
      ctx.fillRect(barX, barY, barW, 5);
      ctx.fillStyle = `hsl(${(this.hp / this.maxHp) * 120}, 80%, 45%)`;
      ctx.fillRect(barX, barY, barW * (this.hp / this.maxHp), 5);
    }

    this.bubbles.forEach(b => b.render(ctx));
  }
}

class DonCangrejo extends Entity {
  constructor(x, y) {
    super(x, y, 60, 70);
    this.speed    = 110;
    this.dir      = -1;
    this.stunTime = 0;
    this.hamburgers = [];
    this.shootTimer = 0;
    this.shootInterval = 2.5;
  }
  update(dt) {
    this.stunTime = Math.max(0, this.stunTime - dt);
    if (this.stunTime > 0) return;

    // Persigue al jugador
    const dx = player.x - this.x;
    this.dir = dx > 0 ? 1 : -1;
    this.x += this.dir * this.speed * dt;
    this.y = LOGICAL_HEIGHT - this.h - 80;

    this.shootTimer += dt;
    if (this.shootTimer >= this.shootInterval) {
      this.shootTimer = 0;
      this.hamburgers.push(new Hamburger(this.x + this.w / 2, this.y + this.h / 2, this.dir * 220));
    }
    this.hamburgers = this.hamburgers.filter(b => b.alive);
    this.hamburgers.forEach(b => b.update(dt));
  }
  stun() {
    this.stunTime = 2;
    soundManager.play('enemyStun');
  }
  render(ctx) {
    ctx.save();
    if (this.stunTime > 0) ctx.globalAlpha = 0.5;
    drawDonCangrejo(ctx, this.x, this.y, this.w, this.h);
    ctx.restore();
    this.hamburgers.forEach(b => b.render(ctx));
  }
}

class BubbleProjectile extends Entity {
  constructor(x, y) {
    super(x, y, 14, 14);
    const angle = Math.atan2(player.y - y, player.x - x);
    this.vx = Math.cos(angle) * 120;
    this.vy = Math.sin(angle) * 120;
    this.r  = 7;
  }
  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.x < -20 || this.x > LOGICAL_WIDTH + 20 ||
        this.y < -20 || this.y > LOGICAL_HEIGHT + 20) this.alive = false;
  }
  render(ctx) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.x + this.r, this.y + this.r, this.r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(100,200,255,0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = 'rgba(100,200,255,0.2)';
    ctx.fill();
    ctx.restore();
  }
}

class Hamburger extends Entity {
  constructor(x, y, vx) {
    super(x, y, 28, 22);
    this.vx = vx;
    this.vy = -60;
    this.gravity = 300;
  }
  update(dt) {
    this.vy += this.gravity * dt;
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;
    if (this.x < -50 || this.x > LOGICAL_WIDTH + 50 || this.y > LOGICAL_HEIGHT + 50) this.alive = false;
  }
  render(ctx) {
    drawHamburger(ctx, this.x, this.y, this.w, this.h);
  }
}

class Moneybag extends Entity {
  constructor(x, y, value) {
    super(x, y, 36, 36);
    this.worldX  = x;   // coordenada de mundo (Fase 1)
    this.value   = value;
    this.baseY   = y;
    this.bobTime = Math.random() * Math.PI * 2;
  }
  update(dt) {
    this.bobTime += dt * 1.5;
    this.y = this.baseY + Math.sin(this.bobTime) * 65;
  }
  render(ctx, scrollX) {
    const screenX = scrollX !== undefined ? this.worldX - scrollX : this.x;
    if (screenX < -this.w - 50 || screenX > LOGICAL_WIDTH + 50) return;
    ctx.save();
    ctx.translate(screenX + this.w / 2, this.y + this.h / 2);
    // Saco
    ctx.beginPath();
    ctx.ellipse(0, 4, this.w * 0.42, this.h * 0.4, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#c8a830';
    ctx.fill();
    ctx.strokeStyle = '#8a6a10';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Cuello del saco
    ctx.beginPath();
    ctx.moveTo(-this.w * 0.12, -this.h * 0.18);
    ctx.lineTo( this.w * 0.12, -this.h * 0.18);
    ctx.lineTo( this.w * 0.08, -this.h * 0.36);
    ctx.lineTo(-this.w * 0.08, -this.h * 0.36);
    ctx.closePath();
    ctx.fillStyle = '#c8a830';
    ctx.fill(); ctx.stroke();
    // Símbolo $
    ctx.fillStyle = '#5a3a00';
    ctx.font = `bold ${this.w * 0.4}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', 0, 4);
    ctx.restore();
  }
}

class SharkBoss extends Entity {
  constructor(x, y) {
    super(x, y, 160, 100);
    this.vy       = 80;
    this.bounceMin = 60;
    this.bounceMax = LOGICAL_HEIGHT - 160;
  }
  update(dt) {
    this.y += this.vy * dt;
    if (this.y < this.bounceMin || this.y > this.bounceMax) {
      this.vy *= -1;
      this.y = Math.max(this.bounceMin, Math.min(this.bounceMax, this.y));
    }
  }
  render(ctx, lives) {
    drawTiburon(ctx, this.x, this.y, this.w, this.h, lives);
  }
}

class MiniShark extends Entity {
  constructor(x, y, vx, vy) {
    super(x, y, 48, 28);
    this.vx = vx; this.vy = vy;
  }
  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.x < -80) this.alive = false;
    if (this.y < -50 || this.y > LOGICAL_HEIGHT + 50) this.vy *= -1;
  }
  render(ctx) {
    drawTiburon(ctx, this.x, this.y, this.w, this.h, null);
  }
}

// ─── SoundManager ─────────────────────────────────────────────────────────────
class SoundManager {
  constructor() {
    this.actx   = null;
    this.sounds = {};
  }

  _ensureContext() {
    if (!this.actx) {
      this.actx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return this.actx;
  }

  define(name, { type = 'sine', frequency = 440, duration = 0.1, gain = 0.3, sweep = null }) {
    this.sounds[name] = { type, frequency, duration, gain, sweep };
  }

  play(name) {
    const actx = this._ensureContext();
    if (actx.state === 'suspended') actx.resume();
    const s = this.sounds[name];
    if (!s) return;
    const osc = actx.createOscillator();
    const vol = actx.createGain();
    osc.type = s.type;
    osc.frequency.setValueAtTime(s.frequency, actx.currentTime);
    if (s.sweep) osc.frequency.linearRampToValueAtTime(s.sweep, actx.currentTime + s.duration);
    vol.gain.setValueAtTime(s.gain, actx.currentTime);
    vol.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + s.duration);
    osc.connect(vol); vol.connect(actx.destination);
    osc.start(); osc.stop(actx.currentTime + s.duration);
  }
}

// ─── SceneManager ─────────────────────────────────────────────────────────────
class SceneManager {
  constructor() { this.current = null; }
  changeState(newState) {
    this.current?.exit();
    this.current = newState;
    this.current.enter();
  }
  update(dt) { this.current?.update(dt); }
  render(ctx) { this.current?.render(ctx); }
}

// ─── State base ───────────────────────────────────────────────────────────────
class State {
  enter()       {}
  update(dt)    {}
  render(ctx)   {}
  exit()        {}
}

// ─── Fondo del mar ────────────────────────────────────────────────────────────
let bubblesList = [];
function initBubbles() {
  bubblesList = [];
  for (let i = 0; i < 25; i++) {
    bubblesList.push({
      x: Math.random() * LOGICAL_WIDTH,
      y: Math.random() * LOGICAL_HEIGHT,
      r: 3 + Math.random() * 6,
      speed: 20 + Math.random() * 30,
    });
  }
}

function updateBubbles(dt) {
  for (const b of bubblesList) {
    b.y -= b.speed * dt;
    if (b.y < -20) {
      b.y = LOGICAL_HEIGHT + 10;
      b.x = Math.random() * LOGICAL_WIDTH;
    }
  }
}

function drawSeaBackground(ctx, offsetX) {
  const grad = ctx.createLinearGradient(0, 0, 0, LOGICAL_HEIGHT);
  grad.addColorStop(0, '#001a4d');
  grad.addColorStop(1, '#0a4d6e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

  // Rayos de luz filtrados
  ctx.save();
  ctx.globalAlpha = 0.07;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    const bx = ((offsetX * 0.1 + i * 200 + 50) % (LOGICAL_WIDTH + 200)) - 100;
    ctx.moveTo(bx,       0);
    ctx.lineTo(bx - 60,  LOGICAL_HEIGHT);
    ctx.lineTo(bx - 60 + 80, LOGICAL_HEIGHT);
    ctx.lineTo(bx + 80,  0);
    ctx.closePath();
    ctx.fillStyle = '#aaddff';
    ctx.fill();
  }
  ctx.restore();

  // Algas y coral (capa media)
  ctx.save();
  const coralOff = ((offsetX * 0.3) % LOGICAL_WIDTH);
  for (let i = 0; i < 8; i++) {
    const ax = ((i * 130 - coralOff + LOGICAL_WIDTH * 2) % (LOGICAL_WIDTH + 100)) - 50;
    const ay = LOGICAL_HEIGHT - 80;
    // Alga
    ctx.strokeStyle = '#2e8b57';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.quadraticCurveTo(ax + 20, ay - 40, ax + 5, ay - 80);
    ctx.stroke();
    // Coral
    ctx.fillStyle = PALETTE.coral;
    ctx.beginPath();
    ctx.arc(ax + 50, ay - 5, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(ax + 38, ay - 18, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(ax + 62, ay - 16, 9, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Suelo arenoso
  ctx.fillStyle = PALETTE.sand;
  ctx.fillRect(0, LOGICAL_HEIGHT - 80, LOGICAL_WIDTH, 80);
  // Textura de arena (líneas ondeadas)
  ctx.strokeStyle = '#b09040';
  ctx.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    const sy = LOGICAL_HEIGHT - 65 + i * 10;
    ctx.beginPath();
    ctx.moveTo(0, sy);
    for (let x = 0; x < LOGICAL_WIDTH; x += 40) {
      ctx.quadraticCurveTo(x + 10, sy - 4, x + 20, sy);
      ctx.quadraticCurveTo(x + 30, sy + 4, x + 40, sy);
    }
    ctx.stroke();
  }

  // Burbujas
  ctx.save();
  for (const b of bubblesList) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(150,220,255,0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = 'rgba(150,220,255,0.1)';
    ctx.fill();
  }
  ctx.restore();
}

// ─── Banco de Cangrejo Crujiente ──────────────────────────────────────────────
function drawBankBuilding(ctx, scrollX) {
  const bx = 600 - (scrollX * 0.6 % (LOGICAL_WIDTH * 3));
  const bw = 280, bh = 200;
  const by = LOGICAL_HEIGHT - 80 - bh;

  // Edificio principal
  ctx.fillStyle = '#e8d5a0';
  ctx.fillRect(bx, by, bw, bh);
  ctx.strokeStyle = '#b09060';
  ctx.lineWidth = 3;
  ctx.strokeRect(bx, by, bw, bh);

  // Letrero
  ctx.fillStyle = '#c0392b';
  ctx.fillRect(bx + 20, by + 20, bw - 40, 40);
  ctx.fillStyle = '#fff';
  ctx.font = "bold 16px 'Bubblegum Sans', cursive";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('BANCO CANGREJO', bx + bw / 2, by + 40);

  // Columnas
  [0.15, 0.4, 0.65, 0.88].forEach(f => {
    ctx.fillStyle = '#d4c080';
    ctx.fillRect(bx + bw * f - 8, by + 65, 16, bh - 65);
    ctx.strokeStyle = '#b09060';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx + bw * f - 8, by + 65, 16, bh - 65);
  });

  // Puerta
  ctx.fillStyle = '#7a5a20';
  ctx.fillRect(bx + bw / 2 - 18, by + bh - 70, 36, 68);
  ctx.beginPath();
  ctx.arc(bx + bw / 2, by + bh - 70, 18, Math.PI, 0);
  ctx.fill();
  // Pomo
  ctx.beginPath();
  ctx.arc(bx + bw / 2 + 12, by + bh - 36, 3, 0, Math.PI * 2);
  ctx.fillStyle = PALETTE.gold;
  ctx.fill();

  // Cúpula
  ctx.beginPath();
  ctx.ellipse(bx + bw / 2, by, bw * 0.25, 28, 0, Math.PI, 0);
  ctx.fillStyle = '#e8d5a0';
  ctx.fill();
  ctx.strokeStyle = '#b09060';
  ctx.lineWidth = 2;
  ctx.stroke();
}

// ─── Puerta de escape (Fase 2) ────────────────────────────────────────────────
function drawEscapeDoor(ctx, x, y) {
  ctx.save();
  // Marco brillante
  ctx.shadowColor = '#ffd700';
  ctx.shadowBlur  = 20;
  ctx.fillStyle = '#ffd700';
  ctx.fillRect(x - 5, y - 5, 70, 110);
  ctx.shadowBlur = 0;
  // Puerta
  ctx.fillStyle = '#4a90d9';
  ctx.fillRect(x, y, 60, 100);
  // Destello
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(x + 8 + i * 16, y + 10, 6, 80);
  }
  // Texto
  ctx.fillStyle = '#ffd700';
  ctx.font = "bold 11px 'Bubblegum Sans', cursive";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SALIDA', x + 30, y + 110 + 14);
  ctx.restore();
}

// ─── HUD ──────────────────────────────────────────────────────────────────────
function renderHUD(ctx, phase) {
  ctx.save();
  ctx.font = "22px 'Bubblegum Sans', cursive";

  // Cangre Euros
  ctx.fillStyle = PALETTE.gold;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  if (phase === 1) {
    ctx.fillText(`💰 ${player.coins.toLocaleString()} / 10000 CE`, 12, 8);
  } else {
    ctx.fillText(`💰 ${player.coins.toLocaleString()} CE`, 12, 8);
  }

  // Vidas
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ff6b6b';
  const heartsStr = '❤️'.repeat(Math.max(0, player.lives)) + '🖤'.repeat(Math.max(0, 5 - player.lives));
  ctx.fillText(heartsStr, LOGICAL_WIDTH - 12, 8);

  // Fase actual
  ctx.textAlign = 'center';
  ctx.fillStyle = '#aef';
  ctx.fillText(`FASE ${phase}`, LOGICAL_WIDTH / 2, 8);

  ctx.restore();
}

// ─── Confeti ──────────────────────────────────────────────────────────────────
const CONFETTI_COLORS = ['#FF4E4E', '#FF9900', '#FFE033', '#66FF66', '#33CCFF', '#CC44FF'];
let confettiParticles = [];

function initConfetti() {
  confettiParticles = [];
  for (let i = 0; i < 60; i++) {
    confettiParticles.push({
      x:     Math.random() * LOGICAL_WIDTH,
      y:     -20 - Math.random() * 100,
      vx:    (Math.random() - 0.5) * 80,
      vy:    80 + Math.random() * 100,
      r:     4 + Math.random() * 6,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      rot:   Math.random() * Math.PI * 2,
      rotV:  (Math.random() - 0.5) * 4,
    });
  }
}

function renderConfetti(ctx, dt) {
  for (const p of confettiParticles) {
    p.x  += p.vx * dt;
    p.y  += p.vy * dt;
    p.rot += p.rotV * dt;
    if (p.y > LOGICAL_HEIGHT + 20) {
      p.y = -10; p.x = Math.random() * LOGICAL_WIDTH;
    }
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.color;
    ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r);
    ctx.restore();
  }
}

// ─── Función de ayuda: generación de sacos de dinero ─────────────────────────
function generateMoneybags(count, startWorldX = 0) {
  const bags = [];
  for (let i = 0; i < count; i++) {
    const worldX = startWorldX + 80 + i * 160 + Math.random() * 80;
    const value  = 150 + Math.floor(Math.random() * 251); // 150–400 CE
    const roll   = Math.random();
    let yPos;
    if (roll < 0.3) {
      yPos = LOGICAL_HEIGHT - 80 - 40;                   // suelo: fácil
    } else if (roll < 0.8) {
      yPos = LOGICAL_HEIGHT - 200 - Math.random() * 140; // media altura
    } else {
      yPos = 80 + Math.random() * 80;                    // plataforma alta
    }
    const bag = new Moneybag(worldX, yPos, value);
    bags.push(bag);
  }
  return bags;
}

// ─── Streaming de Mundo — Fase 1 (§22) ───────────────────────────────────────
const BAG_SPAWN_INTERVAL   = 350; // px de worldX entre sacos
const ENEMY_SPAWN_INTERVAL = 700; // px de worldX entre oleadas de enemigos

function spawnContentIfNeeded(state) {
  // Sacos de dinero: siempre un paso por delante de la pantalla
  while (state.worldX + LOGICAL_WIDTH > state.nextBagWorld) {
    const bagWorldX = state.nextBagWorld + LOGICAL_WIDTH;
    const roll      = Math.random();
    let bagY;
    if (roll < 0.3) {
      bagY = LOGICAL_HEIGHT - 80 - 40;
    } else if (roll < 0.8) {
      bagY = LOGICAL_HEIGHT - 200 - Math.random() * 140;
    } else {
      bagY = 80 + Math.random() * 80;
    }
    const value = 150 + Math.floor(Math.random() * 251);
    state.moneybags.push(new Moneybag(bagWorldX, bagY, value));
    state.nextBagWorld += BAG_SPAWN_INTERVAL;
  }

  // Oleadas de enemigos
  while (state.worldX + LOGICAL_WIDTH > state.nextEnemyWorld) {
    spawnEnemyWave(state, state.nextEnemyWorld + LOGICAL_WIDTH);
    state.nextEnemyWorld += ENEMY_SPAWN_INTERVAL;
  }
}

function spawnEnemyWave(state, worldX) {
  const difficultyFactor = Math.min(state.worldX / 5000, 1);
  const count = 1 + Math.floor(difficultyFactor * 2); // 1–3 enemigos
  for (let i = 0; i < count; i++) {
    const type  = Math.random() < 0.5 ? 'calamardo' : 'bob';
    const y     = LOGICAL_HEIGHT - 140;
    const enemy = type === 'calamardo'
      ? new Calamardo(worldX + i * 180, y)
      : new BobEsponja(worldX + i * 180, y);
    enemy.speed     *= (1 + difficultyFactor * 0.6);
    enemy.baseSpeed  = enemy.speed;
    state.enemies.push(enemy);
  }
}

function pruneOffScreenEntities(state) {
  const leftBound = state.scrollX - 200;
  state.moneybags = state.moneybags.filter(b => b.worldX > leftBound && b.alive);
  state.enemies   = state.enemies.filter(e => e.worldX > leftBound && e.alive);
}

function processRespawnQueue(state, dt) {
  const aliveCount = state.enemies.filter(e => e.alive && e.deathTimer < 0).length;
  for (const entry of state.respawnQueue) {
    entry.elapsed += dt;
    if (entry.elapsed >= entry.delay && aliveCount < 6) {
      entry.done = true;
      const spawnWorldX  = state.scrollX + LOGICAL_WIDTH + 80;
      const spawnY       = LOGICAL_HEIGHT - 140;
      const diffFactor   = Math.min(state.worldX / 5000, 1);
      const newEnemy = entry.type === 'Calamardo'
        ? new Calamardo(spawnWorldX, spawnY)
        : new BobEsponja(spawnWorldX, spawnY);
      newEnemy.speed    *= (1 + diffFactor * 0.6);
      newEnemy.baseSpeed = newEnemy.speed;
      state.enemies.push(newEnemy);
    }
  }
  state.respawnQueue = state.respawnQueue.filter(e => !e.done);
}

// ─── Estado: Menú ─────────────────────────────────────────────────────────────
class MenuState extends State {
  constructor() {
    super();
    this.time = 0;
  }
  enter() {
    this.time = 0;
    initBubbles();
  }
  update(dt) {
    this.time += dt;
    updateBubbles(dt);
  }
  render(ctx) {
    drawSeaBackground(ctx, this.time * 30);

    // Pulpito decorativo grande
    drawPulpito(ctx, LOGICAL_WIDTH / 2 - 60, 100 + Math.sin(this.time * 1.5) * 8, 120, 160, false);

    // Título del juego en el canvas
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = "bold 50px 'Bubblegum Sans', cursive";
    const titleColors = ['#FF4E4E', '#FF9900', '#FFE033', '#66FF66', '#33CCFF', '#CC44FF'];
    const titleText = 'PULPITO';
    const totalW = titleText.length * 36;
    let tx = LOGICAL_WIDTH / 2 - totalW / 2 + 18;
    for (let i = 0; i < titleText.length; i++) {
      ctx.fillStyle = titleColors[i % titleColors.length];
      ctx.fillText(titleText[i], tx, 290);
      tx += 36;
    }
    ctx.restore();

    // Botón START
    const btnX = LOGICAL_WIDTH / 2 - 100;
    const btnY = LOGICAL_HEIGHT / 2 + 40;
    const btnW = 200, btnH = 60, r = 20;
    ctx.save();
    const grad = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH);
    grad.addColorStop(0, '#FF9900');
    grad.addColorStop(1, '#FFD700');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(btnX + r, btnY);
    ctx.lineTo(btnX + btnW - r, btnY);
    ctx.arcTo(btnX + btnW, btnY, btnX + btnW, btnY + r, r);
    ctx.lineTo(btnX + btnW, btnY + btnH - r);
    ctx.arcTo(btnX + btnW, btnY + btnH, btnX + btnW - r, btnY + btnH, r);
    ctx.lineTo(btnX + r, btnY + btnH);
    ctx.arcTo(btnX, btnY + btnH, btnX, btnY + btnH - r, r);
    ctx.lineTo(btnX, btnY + r);
    ctx.arcTo(btnX, btnY, btnX + r, btnY, r);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#884400';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#111';
    ctx.font = "bold 32px 'Bubblegum Sans', cursive";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('START', btnX + btnW / 2, btnY + btnH / 2);
    ctx.restore();

    // Instrucciones
    ctx.save();
    ctx.font = "16px 'Bubblegum Sans', cursive";
    ctx.fillStyle = '#aaddff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('WASD / Flechas para moverse · Z/J/Ctrl para disparar', LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2 + 125);
    ctx.fillText('Click / Touch para comenzar', LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2 + 148);
    ctx.restore();
  }
  handleInput(lx, ly) {
    const btnX = LOGICAL_WIDTH / 2 - 100;
    const btnY = LOGICAL_HEIGHT / 2 + 40;
    if (lx >= btnX && lx <= btnX + 200 && ly >= btnY && ly <= btnY + 60) {
      sceneManager.changeState(new Phase1State());
    }
  }
}

// ─── Estado: Fase 1 ───────────────────────────────────────────────────────────
class Phase1State extends State {
  enter() {
    currentPhaseState  = this;
    player.lives  = 5;
    player.coins  = 0;
    player.x      = 120;
    player.y      = player.groundY;
    player.vx     = 0;
    player.vy     = 0;
    player.inkBalls = [];
    player.invincibleTime = 0;
    this.enemies  = [
      new Calamardo(600, LOGICAL_HEIGHT - 140),
      new BobEsponja(800, LOGICAL_HEIGHT - 140),
    ];
    this.moneybags     = generateMoneybags(5, 0);   // 5 sacos en zona inicial
    this.scrollX       = 0;
    this.worldX        = 0;                          // coordenada de mundo acumulada
    this.nextBagWorld  = 400;                        // siguiente worldX para spawn de saco
    this.nextEnemyWorld = 800;                       // siguiente worldX para oleada de enemigos
    this.respawnQueue  = [];
    this.canShoot      = false;
    initBubbles();
  }

  update(dt) {
    updateBubbles(dt);

    // Avance del mundo
    const delta = SCROLL_SPEED * dt;
    this.scrollX += delta;
    this.worldX  += delta;

    // Dificultad progresiva: velocidad de patrulla
    const speedMult = 1 + Math.floor(player.coins / 2000) * 0.15;
    this.enemies.forEach(e => { e.speed = e.baseSpeed * speedMult; });

    // A los 8000: enemigos disparan
    this.canShoot = player.coins >= 8000;
    this.enemies.forEach(e => e.update(dt, this.scrollX, this.canShoot));

    // Streaming de contenido
    spawnContentIfNeeded(this);
    processRespawnQueue(this, dt);
    pruneOffScreenEntities(this);

    // Actualizar sacos
    this.moneybags.forEach(b => b.update(dt));

    // Input
    handlePhase1Input(dt, this);

    // Actualizar jugador
    player.update(dt);

    // Colisiones
    checkPhase1Collisions(this);

    if (player.coins >= 10000) sceneManager.changeState(new Phase1WinState());
    if (player.lives <= 0)     sceneManager.changeState(new GameOverState());
  }

  render(ctx) {
    drawSeaBackground(ctx, this.scrollX);
    drawBankBuilding(ctx, this.scrollX);
    this.moneybags.forEach(b => b.render(ctx, this.scrollX));
    this.enemies.forEach(e => e.render(ctx, this.scrollX));
    player.render(ctx);
    renderHUD(ctx, 1);
  }
}

function handlePhase1Input(dt, state) {
  const SPEED = 220;
  player.vx = 0;

  if (keys['ArrowLeft'] || keys['KeyA']) {
    player.x -= SPEED * dt;
    player.facingRight = false;
  }
  if (keys['ArrowRight'] || keys['KeyD']) {
    player.x += SPEED * dt;
    player.facingRight = true;
  }
  if ((keys['ArrowUp'] || keys['KeyW'] || keys['Space']) && !player.isJumping) {
    player.vy = player.jumpVy;
    player.isJumping = true;
    player.onGround  = false;
  }
  if (keys['KeyZ'] || keys['KeyJ'] || keys['ControlLeft'] || keys['ControlRight']) {
    player.shoot();
  }

  // Procesar cola de eventos táctiles/ratón
  while (inputQueue.length > 0) {
    const ev = inputQueue.shift();
    if (ev.type === 'shoot') player.shoot();
    if (ev.type === 'move_left') { player.x -= SPEED * dt; player.facingRight = false; }
  }
}

function checkPhase1Collisions(state) {
  // Bolas de tinta → sacos de dinero (para limpiarlos en pantalla)
  // Sacos de dinero → jugador
  for (const bag of state.moneybags) {
    if (!bag.alive) continue;
    const screenX = bag.worldX - state.scrollX;
    if (aabbCollide(player.getBBox(), { x: screenX, y: bag.y, w: bag.w, h: bag.h })) {
      bag.alive = false;
      player.coins += bag.value;
      soundManager.play('coinPickup');
    }
  }

  // Bolas de tinta → enemigos (usa hit() para reducir HP)
  for (const ball of player.inkBalls) {
    if (!ball.alive) continue;
    for (const enemy of state.enemies) {
      if (!enemy.alive || enemy.deathTimer >= 0 || enemy.stunTime > 0) continue;
      const screenX = enemy.worldX - state.scrollX;
      if (circleRectCollide(ball.x + ball.r, ball.y + ball.r, ball.r,
          screenX, enemy.y, enemy.w, enemy.h)) {
        ball.alive = false;
        enemy.hit();
        break;
      }
    }
  }

  // Proyectiles de enemigo (burbujas) → jugador
  for (const enemy of state.enemies) {
    if (!enemy.alive || enemy.deathTimer >= 0) continue;
    // Colisión cuerpo a cuerpo
    const screenX = enemy.worldX - state.scrollX;
    if (enemy.stunTime <= 0 &&
        aabbCollide(player.getBBox(), { x: screenX, y: enemy.y, w: enemy.w, h: enemy.h })) {
      player.takeDamage();
    }
    // Burbujas
    const projs = enemy.bubbles || [];
    for (const proj of projs) {
      if (!proj.alive) continue;
      if (circleRectCollide(proj.x + proj.r, proj.y + proj.r, proj.r,
          player.x, player.y, player.w, player.h)) {
        proj.alive = false;
        player.takeDamage();
      }
    }
  }
}

// ─── Estado: Fase 1 Win ───────────────────────────────────────────────────────
class Phase1WinState extends State {
  enter() {
    this.timer = 0;
    soundManager.play('victory');
    initConfetti();
  }
  update(dt) {
    this.timer += dt;
    if (this.timer > 4) sceneManager.changeState(new Phase2State());
  }
  render(ctx) {
    drawSeaBackground(ctx, this.timer * 30);
    renderConfetti(ctx, 0.016);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = "bold 48px 'Bubblegum Sans', cursive";
    ctx.fillStyle = PALETTE.gold;
    ctx.fillText('¡ROBO COMPLETADO!', LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2 - 40);
    ctx.font = "28px 'Bubblegum Sans', cursive";
    ctx.fillStyle = '#fff';
    ctx.fillText(`Cangre Euros: ${player.coins.toLocaleString()} 💰`, LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2 + 10);
    ctx.fillText(`Vidas restantes: ${'❤️'.repeat(Math.max(0, player.lives))}`, LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2 + 50);
    ctx.font = "20px 'Bubblegum Sans', cursive";
    ctx.fillStyle = '#aef';
    ctx.fillText('Preparando la huida…', LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2 + 90);
    ctx.restore();
  }
}

// ─── Estado: Fase 2 ───────────────────────────────────────────────────────────
class Phase2State extends State {
  enter() {
    player.x = 80;
    player.y = player.groundY;
    player.vx = 0; player.vy = 0;
    player.inkBalls = [];
    player.invincibleTime = 0;
    this.scrollX = 0;
    this.doorX   = LOGICAL_WIDTH * 4.5;
    this.enemies = [
      new Calamardo(500, LOGICAL_HEIGHT - 140),
      new BobEsponja(700, LOGICAL_HEIGHT - 140),
      new DonCangrejo(LOGICAL_WIDTH - 80, LOGICAL_HEIGHT - 150),
    ];
    initBubbles();
  }

  update(dt) {
    updateBubbles(dt);

    // Velocidad de scroll aumenta con el tiempo
    const scrollSpeed = SCROLL_SPEED * 1.3 + this.scrollX * 0.01;
    this.scrollX += scrollSpeed * dt;

    // Mover jugador para que no quede fuera de pantalla izquierda
    player.x = Math.max(30, player.x);

    this.enemies.forEach(e => {
      if (e instanceof DonCangrejo) {
        e.speed = 110 + this.scrollX * 0.02;
      } else {
        e.speed = Math.min(180, e.baseSpeed + this.scrollX * 0.02);
      }
      e.update(dt);
    });

    handlePhase2Input(dt);
    player.update(dt);
    checkPhase2Collisions(this);

    // Condición de victoria: llegar a la puerta
    if (player.x >= this.doorX - this.scrollX) sceneManager.changeState(new Phase2WinState());
    if (player.lives <= 0) sceneManager.changeState(new GameOverState());
  }

  render(ctx) {
    drawSeaBackground(ctx, this.scrollX);
    // Puerta de escape
    const dScreenX = this.doorX - this.scrollX;
    if (dScreenX < LOGICAL_WIDTH) {
      drawEscapeDoor(ctx, dScreenX, LOGICAL_HEIGHT - 200);
    }
    this.enemies.forEach(e => e.render(ctx));
    player.render(ctx);
    renderHUD(ctx, 2);

    // Distancia restante
    ctx.save();
    ctx.font = "18px 'Bubblegum Sans', cursive";
    ctx.fillStyle = '#aef';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const dist = Math.max(0, Math.floor((this.doorX - this.scrollX - player.x) / 10));
    ctx.fillText(`🚪 Salida: ${dist}m`, LOGICAL_WIDTH / 2, 38);
    ctx.restore();
  }
}

function handlePhase2Input(dt) {
  const SPEED = 240;
  if (keys['ArrowLeft'] || keys['KeyA']) {
    player.x -= SPEED * dt;
    player.facingRight = false;
  }
  if (keys['ArrowRight'] || keys['KeyD']) {
    player.x += SPEED * dt;
    player.facingRight = true;
  }
  if ((keys['ArrowUp'] || keys['KeyW'] || keys['Space']) && !player.isJumping) {
    player.vy = player.jumpVy;
    player.isJumping = true;
    player.onGround  = false;
  }
  if (keys['KeyZ'] || keys['KeyJ'] || keys['ControlLeft'] || keys['ControlRight']) {
    player.shoot();
  }
  while (inputQueue.length > 0) {
    const ev = inputQueue.shift();
    if (ev.type === 'shoot') player.shoot();
  }
}

function checkPhase2Collisions(state) {
  for (const enemy of state.enemies) {
    if (aabbCollide(player, enemy)) player.takeDamage();

    // Hamburguesas
    const hbs = enemy.hamburgers || [];
    for (const hb of hbs) {
      if (!hb.alive) continue;
      if (aabbCollide(player, hb)) {
        hb.alive = false;
        player.takeDamage();
      }
    }
    // Burbujas
    const projs = enemy.bubbles || [];
    for (const proj of projs) {
      if (!proj.alive) continue;
      if (circleRectCollide(proj.x + proj.r, proj.y + proj.r, proj.r, player.x, player.y, player.w, player.h)) {
        proj.alive = false;
        player.takeDamage();
      }
    }
  }

  for (const ball of player.inkBalls) {
    if (!ball.alive) continue;
    for (const enemy of state.enemies) {
      if (circleRectCollide(ball.x + ball.r, ball.y + ball.r, ball.r, enemy.x, enemy.y, enemy.w, enemy.h)) {
        ball.alive = false;
        enemy.stun();
        break;
      }
    }
  }
}

// ─── Estado: Fase 2 Win ───────────────────────────────────────────────────────
class Phase2WinState extends State {
  enter() {
    this.timer = 0;
    soundManager.play('victory');
    initConfetti();
  }
  update(dt) {
    this.timer += dt;
    if (this.timer > 3.5) sceneManager.changeState(new Phase3State());
  }
  render(ctx) {
    drawSeaBackground(ctx, this.timer * 50);
    renderConfetti(ctx, 0.016);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = "bold 48px 'Bubblegum Sans', cursive";
    ctx.fillStyle = '#66ff66';
    ctx.fillText('¡ESCAPASTE!', LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2 - 30);
    ctx.font = "26px 'Bubblegum Sans', cursive";
    ctx.fillStyle = '#fff';
    ctx.fillText('¡Pero ahora viene el Tiburón…', LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2 + 20);
    ctx.fillText(`Vidas: ${'❤️'.repeat(Math.max(0, player.lives))}`, LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2 + 60);
    ctx.restore();
  }
}

// ─── Estado: Fase 3 ───────────────────────────────────────────────────────────
class Phase3State extends State {
  enter() {
    currentPhaseState = null; // Fase 3 no usa respawnQueue
    player.lives = 5;
    player.x = 100;
    player.y = player.groundY;
    player.vx = 0; player.vy = 0;
    player.inkBalls = [];
    player.invincibleTime = 0;
    this.bossLives    = 15;
    this.boss         = new SharkBoss(LOGICAL_WIDTH * 0.65, LOGICAL_HEIGHT / 2 - 50);
    this.miniSharks   = [];
    this.spawnTimer   = 0;
    this.spawnInterval = 3.0;
    initBubbles();
  }

  update(dt) {
    updateBubbles(dt);
    this.boss.update(dt);

    this.spawnTimer += dt;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      const count = this.bossLives <= 4 ? 3 : (this.bossLives <= 8 ? 2 : 1);
      for (let i = 0; i < count; i++) {
        this.miniSharks.push(new MiniShark(
          this.boss.x,
          this.boss.y + (Math.random() - 0.5) * this.boss.h,
          -180 - Math.random() * 80,
          (Math.random() - 0.5) * 140
        ));
      }
      if (this.bossLives <= 8) this.spawnInterval = 2.0;
      if (this.bossLives <= 4) this.spawnInterval = 1.2;
    }

    this.miniSharks = this.miniSharks.filter(s => s.alive);
    this.miniSharks.forEach(s => s.update(dt));

    handlePhase3Input(dt);
    player.update(dt);
    this.checkCollisions();

    if (this.bossLives <= 0)  sceneManager.changeState(new Phase3WinState());
    if (player.lives  <= 0)   sceneManager.changeState(new GameOverState());
  }

  checkCollisions() {
    // Bolas de tinta → jefe
    for (const ball of player.inkBalls) {
      if (!ball.alive) continue;
      if (circleRectCollide(ball.x + ball.r, ball.y + ball.r, ball.r,
          this.boss.x, this.boss.y, this.boss.w, this.boss.h)) {
        ball.alive = false;
        this.bossLives--;
        soundManager.play('bossHit');
      }
    }
    // Bolas de tinta → mini tiburones
    for (const ball of player.inkBalls) {
      if (!ball.alive) continue;
      for (const shark of this.miniSharks) {
        if (!shark.alive) continue;
        if (circleRectCollide(ball.x + ball.r, ball.y + ball.r, ball.r,
            shark.x, shark.y, shark.w, shark.h)) {
          ball.alive = false;
          shark.alive = false;
          break;
        }
      }
    }
    // Mini tiburones → jugador
    for (const shark of this.miniSharks) {
      if (!shark.alive) continue;
      if (aabbCollide(player, shark)) {
        shark.alive = false;
        player.takeDamage();
      }
    }
    // Jefe → jugador
    if (aabbCollide(player, this.boss)) player.takeDamage();
  }

  render(ctx) {
    drawSeaBackground(ctx, frameCount * 0.5);
    this.miniSharks.forEach(s => s.render(ctx));
    this.boss.render(ctx, this.bossLives);
    player.render(ctx);
    renderHUD(ctx, 3);
    // Barra de vida del jefe en la parte inferior
    ctx.save();
    ctx.font = "18px 'Bubblegum Sans', cursive";
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`🦈 Jefe: ${this.bossLives} / 15`, LOGICAL_WIDTH / 2, LOGICAL_HEIGHT - 88);
    ctx.restore();
  }
}

function handlePhase3Input(dt) {
  const SPEED = 220;
  if (keys['ArrowLeft'] || keys['KeyA']) {
    player.x -= SPEED * dt;
    player.facingRight = false;
  }
  if (keys['ArrowRight'] || keys['KeyD']) {
    player.x += SPEED * dt;
    player.facingRight = true;
  }
  if ((keys['ArrowUp'] || keys['KeyW'] || keys['Space']) && !player.isJumping) {
    player.vy = player.jumpVy;
    player.isJumping = true;
    player.onGround  = false;
  }
  if (keys['KeyZ'] || keys['KeyJ'] || keys['ControlLeft'] || keys['ControlRight']) {
    player.shoot();
    player.facingRight = true; // Siempre dispara hacia el jefe (derecha)
  }
  while (inputQueue.length > 0) {
    const ev = inputQueue.shift();
    if (ev.type === 'shoot') { player.shoot(); player.facingRight = true; }
  }
  // Limitar al lado izquierdo
  player.x = Math.max(0, Math.min(LOGICAL_WIDTH * 0.5, player.x));
}

// ─── Estado: Fase 3 Win (Victoria Final) ──────────────────────────────────────
class Phase3WinState extends State {
  enter() {
    this.timer = 0;
    soundManager.play('victory');
    initConfetti();
  }
  update(dt) {
    this.timer += dt;
    // Procesar input de reinicio
    while (inputQueue.length > 0) {
      const ev = inputQueue.shift();
      if (ev.type === 'shoot' || ev.type === 'click') sceneManager.changeState(new MenuState());
    }
  }
  render(ctx) {
    // Fondo festivo
    const grad = ctx.createLinearGradient(0, 0, 0, LOGICAL_HEIGHT);
    grad.addColorStop(0, '#001a4d');
    grad.addColorStop(1, '#0a4d6e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    renderConfetti(ctx, 0.016);

    // Pulpito grande en el centro con tentáculos arriba
    ctx.save();
    ctx.translate(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2 - 40 + Math.sin(this.timer * 2) * 10);
    ctx.scale(2.2, 2.2);
    drawPulpito(ctx, -40, -50, 80, 100, false);
    ctx.restore();

    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = "bold 42px 'Bubblegum Sans', cursive";
    ctx.fillStyle = PALETTE.gold;
    ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 16;
    ctx.fillText('¡PULPITO LIBRE!', LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2 + 105);
    ctx.shadowBlur = 0;
    ctx.font = "24px 'Bubblegum Sans', cursive";
    ctx.fillStyle = '#fff';
    ctx.fillText('¡El Gran Ladrón del Mar!', LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2 + 145);
    ctx.fillStyle = PALETTE.gold;
    ctx.fillText(`💰 ${player.coins.toLocaleString()} Cangre Euros robados`, LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2 + 178);
    ctx.font = "18px 'Bubblegum Sans', cursive";
    ctx.fillStyle = '#aef';
    ctx.fillText('Click o toca para jugar de nuevo', LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2 + 210);
    ctx.restore();
  }
  handleInput() {
    sceneManager.changeState(new MenuState());
  }
}

// ─── Estado: Game Over ────────────────────────────────────────────────────────
class GameOverState extends State {
  enter() {
    soundManager.play('gameOver');
  }
  update(dt) {
    while (inputQueue.length > 0) {
      const ev = inputQueue.shift();
      if (ev.type === 'shoot' || ev.type === 'click') sceneManager.changeState(new Phase1State());
    }
  }
  render(ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, LOGICAL_HEIGHT);
    grad.addColorStop(0, '#200000');
    grad.addColorStop(1, '#600000');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = "bold 72px 'Bubblegum Sans', cursive";
    ctx.fillStyle = '#e00';
    ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 20;
    ctx.fillText('GAME OVER', LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2 - 40);
    ctx.shadowBlur = 0;
    ctx.font = "26px 'Bubblegum Sans', cursive";
    ctx.fillStyle = '#fff';
    ctx.fillText('Click o toca para volver a Fase 1', LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2 + 30);
    ctx.restore();

    // Pulpito triste (invertido)
    ctx.save();
    ctx.translate(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2 + 120);
    ctx.scale(1, -1);
    drawPulpito(ctx, -30, -40, 60, 80, false);
    ctx.restore();
  }
  handleInput() {
    sceneManager.changeState(new Phase1State());
  }
}

// ─── Escalado y resize ────────────────────────────────────────────────────────
function onResize() {
  const rect = canvas.getBoundingClientRect();
  canvas.width  = rect.width  * window.devicePixelRatio;
  canvas.height = rect.height * window.devicePixelRatio;
  scaleX = canvas.width  / LOGICAL_WIDTH;
  scaleY = canvas.height / LOGICAL_HEIGHT;
}

// ─── Game Loop ────────────────────────────────────────────────────────────────
let lastTime = null;

function gameLoop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05); // cap a 50ms
  lastTime = timestamp;
  frameCount++;

  sceneManager.update(dt);

  ctx.save();
  ctx.scale(scaleX, scaleY);
  sceneManager.render(ctx);
  ctx.restore();

  requestAnimationFrame(gameLoop);
}

// ─── Initialize ───────────────────────────────────────────────────────────────
export function Initialize() {
  canvas = document.getElementById('game-canvas');
  ctx    = canvas.getContext('2d');

  onResize();
  window.addEventListener('resize', onResize);

  // Teclado
  window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (e.code === 'Space') e.preventDefault();
  });
  window.addEventListener('keyup',   e => { keys[e.code] = false; });

  // Ratón / Puntero
  canvas.addEventListener('pointerdown', e => {
    const lx = (e.offsetX / canvas.offsetWidth)  * LOGICAL_WIDTH;
    const ly = (e.offsetY / canvas.offsetHeight) * LOGICAL_HEIGHT;
    pointerLogical = { x: lx, y: ly };
    inputQueue.push({ type: 'shoot', x: lx, y: ly });
    // Click en botón START del menú
    if (sceneManager.current instanceof MenuState) {
      sceneManager.current.handleInput(lx, ly);
    } else if (sceneManager.current instanceof GameOverState) {
      sceneManager.current.handleInput();
    } else if (sceneManager.current instanceof Phase3WinState) {
      sceneManager.current.handleInput();
    }
  });
  canvas.addEventListener('pointermove', e => {
    pointerLogical.x = (e.offsetX / canvas.offsetWidth)  * LOGICAL_WIDTH;
    pointerLogical.y = (e.offsetY / canvas.offsetHeight) * LOGICAL_HEIGHT;
  });

  // Táctil
  canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      const lx = (t.clientX / canvas.offsetWidth)  * LOGICAL_WIDTH;
      const ly = (t.clientY / canvas.offsetHeight) * LOGICAL_HEIGHT;
      if (sceneManager.current instanceof MenuState) {
        sceneManager.current.handleInput(lx, ly);
      } else if (sceneManager.current instanceof GameOverState) {
        sceneManager.current.handleInput();
      } else if (sceneManager.current instanceof Phase3WinState) {
        sceneManager.current.handleInput();
      } else {
        if (lx < LOGICAL_WIDTH / 2) {
          inputQueue.push({ type: 'move_left' });
        } else {
          inputQueue.push({ type: 'shoot' });
        }
      }
    }
  }, { passive: false });

  // Singletons
  soundManager  = new SoundManager();
  soundManager.define('inkShoot',   { type: 'sawtooth', frequency: 180, duration: 0.08, gain: 0.2, sweep: 60 });
  soundManager.define('coinPickup', { type: 'sine',     frequency: 880, duration: 0.15, gain: 0.3, sweep: 1200 });
  soundManager.define('playerHit',  { type: 'square',   frequency: 150, duration: 0.25, gain: 0.4, sweep: 80 });
  soundManager.define('enemyStun',  { type: 'sine',     frequency: 300, duration: 0.2,  gain: 0.25, sweep: 100 });
  soundManager.define('enemyHit',   { type: 'square',   frequency: 350, duration: 0.12, gain: 0.3,  sweep: 200 });
  soundManager.define('enemyDeath', { type: 'sawtooth', frequency: 180, duration: 0.4,  gain: 0.45, sweep: 60 });
  soundManager.define('bossHit',    { type: 'sawtooth', frequency: 100, duration: 0.3,  gain: 0.5, sweep: 40 });
  soundManager.define('victory',    { type: 'sine',     frequency: 523, duration: 0.6,  gain: 0.4, sweep: 1046 });
  soundManager.define('gameOver',   { type: 'sawtooth', frequency: 200, duration: 0.8,  gain: 0.4, sweep: 80 });

  player       = new Player();
  sceneManager = new SceneManager();
  sceneManager.changeState(new MenuState());
}

// ─── Run ──────────────────────────────────────────────────────────────────────
export function Run() {
  Initialize();
  requestAnimationFrame(gameLoop);
}

// ─── Auto-arranque ────────────────────────────────────────────────────────────
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Run());
} else {
  Run();
}
