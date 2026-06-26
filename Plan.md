# Plan.md — Pulpito: El Gran Robo del Fondo del Mar 🐙

> Instrucciones completas para que GitHub Copilot implemente el videojuego **Pulpito**.

---

## 1. Visión General del Juego

**Pulpito** es un videojuego arcade 2D vectorial de plataformas con scroll horizontal, ambientado en el mundo submarino de la serie animada *Bob Esponja*. El protagonista es un pulpo de peluche que debe robar el banco Cangrejo Crujiente y escapar con vida.

| Campo | Valor |
|---|---|
| Género | Arcade 2D side-scroller con scroll horizontal |
| Gráficos | 100 % vectoriales (Canvas 2D API, sin imágenes raster) |
| Entradas | Teclado, ratón/puntero y pantalla táctil |
| Idioma del código | JavaScript ES2022 (módulos, clases, async/await) |
| Plataforma | Navegador web moderno (Chrome, Firefox, Safari, Edge) |

---

## 2. Estructura de Archivos

```
/
├── index.html          ← Página única del juego
├── gameplay.js         ← Lógica principal del juego (módulo ES)
├── README.md
└── Plan.md
```

Todo el juego vive en **dos archivos**: `index.html` y `gameplay.js`.  
No se usarán imágenes externas, fuentes de terceros (salvo Google Fonts para la fuente infantil), ni librerías de juego adicionales.

---

## 3. `index.html` — Página Principal

### 3.1 Estructura HTML

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Pulpito: El Gran Robo del Fondo del Mar</title>
  <!-- Fuente infantil tipo Comic Sans -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Bubblegum+Sans&display=swap" rel="stylesheet" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #001133;
      display: flex;
      flex-direction: column;
      align-items: center;
      height: 100dvh;
      overflow: hidden;
      font-family: 'Bubblegum Sans', 'Comic Sans MS', cursive;
    }
    #game-title {
      /* Título con letras de colores */
      font-size: clamp(1.5rem, 5vw, 3rem);
      letter-spacing: 0.05em;
      padding: 0.4em 0;
      /* Cada letra del título tendrá color diferente — se aplica mediante spans inline */
    }
    #game-canvas {
      display: block;
      /* El canvas ocupa todo el espacio restante */
      width: 100%;
      flex: 1;
      touch-action: none; /* Evita scroll al tocar el canvas */
    }
  </style>
</head>
<body>
  <!-- Título con letras de colores (un <span> por letra con color inline) -->
  <h1 id="game-title">
    <span style="color:#FF4E4E">P</span><span style="color:#FF9900">u</span><span style="color:#FFE033">l</span><span style="color:#66FF66">p</span><span style="color:#33CCFF">i</span><span style="color:#CC44FF">t</span><span style="color:#FF4E4E">o</span>
    &nbsp;
    <span style="color:#FF9900">🐙</span>
    &nbsp;
    <span style="color:#FFE033">E</span><span style="color:#66FF66">l</span>
    &nbsp;
    <span style="color:#33CCFF">G</span><span style="color:#CC44FF">r</span><span style="color:#FF4E4E">a</span><span style="color:#FF9900">n</span>
    &nbsp;
    <span style="color:#FFE033">R</span><span style="color:#66FF66">o</span><span style="color:#33CCFF">b</span><span style="color:#CC44FF">o</span>
  </h1>
  <canvas id="game-canvas"></canvas>
  <script type="module" src="gameplay.js"></script>
</body>
</html>
```

### 3.2 Escalado del Canvas

En `gameplay.js`, el canvas se redimensiona dinámicamente para ocupar todo el espacio disponible.  
El **viewport lógico interno** es siempre **960 × 540 píxeles** (16:9). Se aplica una transformación de escala uniforme para adaptar ese viewport al tamaño físico del canvas.

---

## 4. `gameplay.js` — Arquitectura del Módulo

### 4.1 Constantes Globales

```js
const LOGICAL_WIDTH  = 960;
const LOGICAL_HEIGHT = 540;
const TARGET_FPS     = 60;

// Colores de la paleta del mundo Fondo del Mar
const PALETTE = {
  sea:        '#0a3566',
  seaLight:   '#1a5fa8',
  sand:       '#c8a85a',
  coral:      '#e05a3a',
  white:      '#f0f0f0',
  inkBlack:   '#111133',
  gold:       '#ffd700',
  octopusPink:'#f4a0c0',
  octopusPurple: '#9b59b6',
};
```

### 4.2 Método `Initialize()`

```js
/**
 * Initialize()
 * Configura el canvas, registra event listeners, crea todas las entidades
 * del juego, carga la máquina de estados y prepara el primer frame.
 */
export function Initialize() { … }
```

Responsabilidades:
1. Obtener referencia al `<canvas>` y a su `CanvasRenderingContext2D`.
2. Ajustar el `canvas.width` / `canvas.height` al viewport físico y calcular `scaleX`, `scaleY`.
3. Registrar `window.addEventListener('resize', onResize)`.
4. Registrar listeners de entrada (teclado, ratón, toque).
5. Crear las instancias iniciales: `Player`, `HUD`, `SoundManager`, `SceneManager`.
6. Establecer el estado inicial: `GameState.MENU`.

### 4.3 Método `Run()`

```js
/**
 * Run()
 * Inicia el Game Loop principal usando requestAnimationFrame.
 * Llama internamente a Initialize() si aún no se ha llamado.
 */
export function Run() { … }
```

El Game Loop ejecuta en cada frame, **en este orden exacto**:

```
1. captureEvents()        ← Procesa la cola de inputs
2. update(deltaTime)      ← Actualiza posiciones, física y lógica
3. checkCollisions()      ← Detecta y resuelve colisiones
4. updateSounds()         ← Gestiona audio y SFX
5. render()               ← Renderizado vectorial (fondo → entidades → HUD)
6. updateHUD()            ← Puntaje (Cangre Euros) y vidas en pantalla
```

---

## 5. Máquina de Estados (`GameState`)

```js
const GameState = Object.freeze({
  MENU:          'MENU',
  PHASE_1:       'PHASE_1',
  PHASE_1_WIN:   'PHASE_1_WIN',
  PHASE_2:       'PHASE_2',
  PHASE_2_WIN:   'PHASE_2_WIN',
  PHASE_3:       'PHASE_3',
  PHASE_3_WIN:   'PHASE_3_WIN',  // Victoria final
  GAME_OVER:     'GAME_OVER',
});
```

Cada estado tiene sus propios métodos `enter()`, `update(dt)`, `render(ctx)` y `exit()`.  
Un `SceneManager` centraliza las transiciones:

```js
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
```

---

## 6. Pantalla Principal (Menú — `GameState.MENU`)

El menú se renderiza **dentro del canvas** (no en HTML externo).

### Elementos renderizados en canvas:
- **Fondo** del fondo del mar (vectorial: gradiente azul oscuro, burbujas, algas, peces decorativos pequeños).
- **Título del juego** en letras grandes con la fuente `Bubblegum Sans` y colores alternos.
- **Botón START** centrado, rectangulado con bordes redondeados, relleno degradado de naranja a amarillo, texto en negro.
- **Texto de instrucciones**: "WASD / Flechas para moverse · Click / Touch para disparar".

```js
// Renderizado del botón START en canvas
ctx.save();
const btnX = LOGICAL_WIDTH / 2 - 100;
const btnY = LOGICAL_HEIGHT / 2 + 40;
const btnW = 200, btnH = 60, r = 20;
const grad = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH);
grad.addColorStop(0, '#FF9900');
grad.addColorStop(1, '#FFD700');
ctx.fillStyle = grad;
// roundRect path
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
```

Cuando el jugador hace click/touch dentro del rectángulo del botón START, se transiciona a `GameState.PHASE_1`.

---

## 7. Gestión de Entradas

### 7.1 Teclado

```js
const keys = {};
window.addEventListener('keydown', e => { keys[e.code] = true; });
window.addEventListener('keyup',   e => { keys[e.code] = false; });
```

Mapeo:
| Acción | Tecla |
|---|---|
| Mover izquierda | `ArrowLeft` / `KeyA` |
| Mover derecha | `ArrowRight` / `KeyD` |
| Saltar | `ArrowUp` / `KeyW` / `Space` |
| Agacharse | `ArrowDown` / `KeyS` |
| Disparar | `KeyZ` / `KeyJ` / `ControlLeft` |
| Pausa | `Escape` / `KeyP` |

### 7.2 Ratón / Puntero

```js
canvas.addEventListener('pointerdown', e => {
  const lx = (e.offsetX / canvas.offsetWidth)  * LOGICAL_WIDTH;
  const ly = (e.offsetY / canvas.offsetHeight) * LOGICAL_HEIGHT;
  inputQueue.push({ type: 'shoot', x: lx, y: ly });
  // También detecta click en botón START
});
canvas.addEventListener('pointermove', e => { /* actualiza puntero */ });
```

### 7.3 Táctil

```js
canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  // Mapea múltiples toques: izquierda de pantalla = mover, derecha = disparar
  for (const t of e.changedTouches) {
    const lx = (t.clientX / canvas.offsetWidth) * LOGICAL_WIDTH;
    if (lx < LOGICAL_WIDTH / 2) inputQueue.push({ type: 'move_left' });
    else inputQueue.push({ type: 'shoot' });
  }
}, { passive: false });
```

---

## 8. Entidades del Juego

### 8.1 Clase Base `Entity`

```js
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
  /** @abstract */
  render(ctx) {}
}
```

### 8.2 `Player` — Pulpito (El Protagonista)

**Descripción visual vectorial:**  
Pulpito es un pulpo de peluche de colores rosados/morados con ojos grandes y redondos de peluche (círculos blancos con pupila negra pequeña), un cuerpo ovoide con costuras simuladas, 8 tentáculos cortos y redondeados que cuelgan hacia abajo, y lleva una mini pistola negra en uno de sus tentáculos.

```
Cabeza: óvalo relleno color octopusPurple con borde más oscuro
  - Costuras: líneas de puntos con ctx.setLineDash([3,4])
  - Ojos: dos círculos blancos grandes con pupila pequeña negra + reflejo blanco
  - Boca: curva con ctx.bezierCurveTo (sonrisa)
  - Mejillas: dos círculos semitransparentes rosa (blush)
Tentáculos: 8 curvas cuadráticas simétricas, rellenas color octopusPink
Pistola: rectángulo negro con cañón cilíndrico, sostenido por tentáculo derecho
```

```js
class Player extends Entity {
  constructor() {
    super(120, LOGICAL_HEIGHT - 160, 60, 80);
    this.lives = 5;
    this.coins = 0;          // Cangre Euros acumulados
    this.facingRight = true;
    this.isJumping = false;
    this.shootCooldown = 0;
    this.inkBalls = [];      // Proyectiles activos
    this.invincibleTime = 0; // Parpadeo tras recibir daño
  }

  shoot() {
    if (this.shootCooldown > 0) return;
    this.inkBalls.push(new InkBall(
      this.x + (this.facingRight ? this.w : 0),
      this.y + this.h * 0.4,
      this.facingRight ? 400 : -400
    ));
    this.shootCooldown = 0.25; // segundos entre disparos
    SoundManager.play('inkShoot');
  }

  render(ctx) {
    // ctx.save / translate / scale(-1,1) si facingLeft
    drawPulpito(ctx, this.x, this.y, this.w, this.h, this.invincibleTime > 0);
    // ctx.restore
    this.inkBalls.forEach(b => b.render(ctx));
  }
}
```

**Función `drawPulpito(ctx, x, y, w, h, blink)`:**

```js
function drawPulpito(ctx, x, y, w, h, blink = false) {
  if (blink && Math.floor(Date.now() / 100) % 2 === 0) return; // parpadeo
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);

  // --- Tentáculos (8, distribuidos en abanico) ---
  const tentacleCount = 8;
  for (let i = 0; i < tentacleCount; i++) {
    const angle = Math.PI + (i / (tentacleCount - 1)) * Math.PI; // semicírculo inferior
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

  // --- Cuerpo (óvalo) ---
  ctx.beginPath();
  ctx.ellipse(0, 0, w * 0.45, h * 0.38, 0, 0, Math.PI * 2);
  ctx.fillStyle = PALETTE.octopusPurple;
  ctx.fill();
  ctx.strokeStyle = '#6c3483';
  ctx.lineWidth = 2;
  ctx.stroke();

  // --- Costuras (líneas de puntos) ---
  ctx.setLineDash([3, 5]);
  ctx.strokeStyle = '#c39bd3';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-w * 0.25, -h * 0.1); ctx.lineTo(-w * 0.25, h * 0.25); ctx.stroke();
  ctx.beginPath(); ctx.moveTo( w * 0.25, -h * 0.1); ctx.lineTo( w * 0.25, h * 0.25); ctx.stroke();
  ctx.setLineDash([]);

  // --- Ojos ---
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

  // --- Boca (sonrisa) ---
  ctx.beginPath();
  ctx.moveTo(-w * 0.1, h * 0.08);
  ctx.bezierCurveTo(-w * 0.05, h * 0.16, w * 0.05, h * 0.16, w * 0.1, h * 0.08);
  ctx.strokeStyle = '#6c3483';
  ctx.lineWidth = 2;
  ctx.stroke();

  // --- Mejillas rosadas ---
  [-1, 1].forEach(side => {
    ctx.beginPath();
    ctx.arc(side * w * 0.3, h * 0.04, w * 0.09, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 150, 170, 0.45)';
    ctx.fill();
  });

  // --- Pistola de bolas de tinta ---
  ctx.fillStyle = '#222';
  ctx.fillRect(w * 0.3, h * 0.05, w * 0.28, h * 0.1);  // cuerpo pistola
  ctx.fillRect(w * 0.52, h * 0.02, w * 0.1, h * 0.06); // cañón
  // Bola de tinta en cañón
  ctx.beginPath();
  ctx.arc(w * 0.65, h * 0.05, w * 0.05, 0, Math.PI * 2);
  ctx.fillStyle = PALETTE.inkBlack;
  ctx.fill();

  ctx.restore();
}
```

### 8.3 `InkBall` — Bala de Tinta

Proyectil circular negro/azul oscuro con halo semitransparente. Viaja horizontalmente.

```js
class InkBall extends Entity {
  constructor(x, y, vx) {
    super(x, y, 12, 12);
    this.vx = vx;
  }
  render(ctx) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.x, this.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = PALETTE.inkBlack;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(this.x, this.y, 12, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(20,20,80,0.3)';
    ctx.fill();
    ctx.restore();
  }
}
```

---

## 9. Personajes Enemigos (Vectoriales)

### 9.1 Calamardo (Squidward)

Calamardo es un calamar antropomorfo alto y delgado con nariz bulbosa, expresión aburrida, cuerpo azul-verdoso, dos tentáculos como piernas y seis como brazos, ojos caídos.

```js
function drawCalamardo(ctx, x, y, w, h) {
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);

  // Cabeza ovalada grande con nariz bulbosa
  ctx.beginPath();
  ctx.ellipse(0, -h * 0.2, w * 0.38, h * 0.3, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#6aadba';
  ctx.fill(); ctx.strokeStyle = '#3d7a8a'; ctx.lineWidth = 2; ctx.stroke();

  // Nariz bulbosa (óvalo vertical prominente)
  ctx.beginPath();
  ctx.ellipse(0, -h * 0.15, w * 0.14, h * 0.2, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#5a9daa';
  ctx.fill(); ctx.stroke();

  // Ojos (almendrados, cansados — línea superior recta, inferior curva)
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
```

### 9.2 Bob Esponja (SpongeBob)

Bob Esponja es un personaje cuadrado/rectangular con textura de esponja (agujeros), color amarillo, pantalones marrones, corbata roja, ojos grandes, dientes grandes y separados.

```js
function drawBobEsponja(ctx, x, y, w, h) {
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);

  // Cuerpo esponja (rectángulo con esquinas ligeramente redondeadas)
  ctx.beginPath();
  ctx.roundRect(-w * 0.38, -h * 0.45, w * 0.76, h * 0.7, w * 0.06);
  ctx.fillStyle = '#f5e642'; ctx.fill();
  ctx.strokeStyle = '#c8b800'; ctx.lineWidth = 2; ctx.stroke();

  // Poros/agujeros de la esponja
  const holePositions = [
    [-0.2, -0.3], [0.1, -0.35], [-0.05, -0.1],
    [0.22, -0.15], [-0.25, 0.0], [0.05, 0.1], [0.2, 0.05],
  ];
  holePositions.forEach(([hx, hy]) => {
    ctx.beginPath();
    ctx.ellipse(hx * w, hy * h, w * 0.05, h * 0.04, Math.random() * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = '#d4c400';
    ctx.fill();
  });

  // Pantalones marrones (parte inferior)
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

  // Ojos grandes (con pupilas azules)
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

  // Dientes grandes separados
  [-1, 1].forEach(side => {
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#ccc'; ctx.lineWidth = 1;
    ctx.fillRect(side * w * 0.08, h * 0.0, w * 0.1, h * 0.09);
    ctx.strokeRect(side * w * 0.08, h * 0.0, w * 0.1, h * 0.09);
  });

  ctx.restore();
}
```

### 9.3 Don Cangrejo (Mr. Krabs)

Don Cangrejo es un cangrejo rojo antropomorfo con pinzas grandes, ojos en pedúnculos, cuerpo compacto. Aparece solo en la Fase 2.

```js
function drawDonCangrejo(ctx, x, y, w, h) {
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);

  // Cuerpo semicircular rojizo
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

  // Pinzas (semicírculos con apertura)
  [-1, 1].forEach(side => {
    ctx.save();
    ctx.translate(side * w * 0.52, h * 0.0);
    ctx.beginPath();
    ctx.ellipse(0, 0, w * 0.22, h * 0.16, side * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = '#e74c3c'; ctx.fill(); ctx.strokeStyle = '#922b21'; ctx.stroke();
    // Línea de apertura de pinza
    ctx.beginPath();
    ctx.moveTo(0, -h * 0.08); ctx.lineTo(w * 0.12 * side, h * 0.04);
    ctx.strokeStyle = '#922b21'; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
  });

  // Patas (4 líneas curvadas por lado)
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
```

### 9.4 Tiburón Jefe Final

Tiburón grande, blanco/gris azulado, con dientes triangulares afilados, aleta dorsal, ojos pequeños y negros. En Fase 3 es el enemigo final con 15 puntos de vida.

```js
function drawTiburon(ctx, x, y, w, h, lives = 15) {
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

  // Aleta dorsal (triángulo)
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
  // Dientes
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

  // Barra de vida del jefe
  const barW = w * 0.9, barH = h * 0.07;
  const barX = -barW / 2, barY = -h * 0.7;
  ctx.fillStyle = '#333';
  ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
  ctx.fillStyle = `hsl(${(lives / 15) * 120}, 80%, 45%)`;
  ctx.fillRect(barX, barY, barW * (lives / 15), barH);
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
  ctx.strokeRect(barX, barY, barW, barH);

  ctx.restore();
}
```

### 9.5 Mini Tiburones (Proyectiles del Jefe)

Versión pequeña del tiburón (misma función con parámetros reducidos), lanzada por el jefe hacia Pulpito.

```js
class MiniShark extends Entity {
  constructor(x, y, vx, vy) {
    super(x, y, 48, 28);
    this.vx = vx; this.vy = vy;
  }
  render(ctx) {
    drawTiburon(ctx, this.x, this.y, this.w, this.h, null); // sin barra de vida
  }
}
```

---

## 10. Scroll Horizontal y Fondo Vectorial

El fondo se divide en capas con diferentes velocidades (parallax):

| Capa | Velocidad | Contenido |
|---|---|---|
| 0 (fondo) | 0 (fijo) | Degradado azul oceánico |
| 1 | 0.1× | Oscuridad del fondo del mar con peces decorativos lejanos |
| 2 | 0.3× | Arrecifes de coral, algas y rocas |
| 3 | 0.6× | Suelo arenoso con tesoros |
| 4 (primer plano) | 1.0× | Plataformas, edificios (banco), objetos del juego |

```js
class ParallaxLayer {
  constructor(drawFn, speedFactor, width) {
    this.drawFn = drawFn;
    this.speedFactor = speedFactor;
    this.offset = 0;
    this.width = width; // ancho lógico de la capa (normalmente 2×LOGICAL_WIDTH)
  }
  scroll(worldDelta) {
    this.offset = (this.offset + worldDelta * this.speedFactor) % this.width;
  }
  render(ctx) {
    this.drawFn(ctx, -this.offset);
    this.drawFn(ctx, -this.offset + this.width);
  }
}
```

**Escenario Fase 1 — Fondo del Mar / Banco:**

```js
function drawSeaBackground(ctx, offsetX) {
  // Degradado oceánico
  const grad = ctx.createLinearGradient(0, 0, 0, LOGICAL_HEIGHT);
  grad.addColorStop(0, '#001a4d');
  grad.addColorStop(1, '#0a4d6e');
  ctx.fillStyle = grad;
  ctx.fillRect(offsetX, 0, LOGICAL_WIDTH * 2, LOGICAL_HEIGHT);

  // Rayos de luz filtrados
  ctx.save();
  ctx.globalAlpha = 0.07;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(offsetX + i * 200 + 50, 0);
    ctx.lineTo(offsetX + i * 200 - 60, LOGICAL_HEIGHT);
    ctx.lineTo(offsetX + i * 200 + 20, LOGICAL_HEIGHT);
    ctx.lineTo(offsetX + i * 200 + 130, 0);
    ctx.closePath();
    ctx.fillStyle = '#aaddff';
    ctx.fill();
  }
  ctx.restore();

  // Burbujas flotantes (animadas mediante frameCount)
  // ...
}
```

---

## 11. Fase 1 — El Gran Robo

### Objetivo
Pulpito debe recolectar **10.000 Cangre Euros** saqueando el banco. El mundo se extiende horizontalmente mucho más allá de la pantalla inicial; a medida que Pulpito avanza, el sistema genera dinámicamente nuevos sacos de dinero y oleadas de enemigos.

### Mecánica de Juego
- **Scroll horizontal** hacia la derecha; Pulpito puede moverse en las 4 direcciones dentro de su área de pantalla.
- **Sacos de dinero (Moneybags)** se generan dinámicamente conforme avanza el scroll (ver §22). Al tocarlos, se suman entre 150 y 400 Cangre Euros.
- **Calamardo y Bob Esponja** patrullan el banco e intentan interceptar a Pulpito.
  - Si uno de ellos toca a Pulpito, pierde 1 vida y entra en modo invencible 2 segundos.
  - Las bolas de tinta de Pulpito **dañan** a Calamardo y Bob (cada bola quita 1 HP de los 5 que tienen — ver §23).
- **Contador de vidas:** Pulpito empieza con 5 vidas en esta fase.
- **HUD:** "Cangre Euros: XXXX / 10000 💰" y "Vidas: ❤️❤️❤️❤️❤️" en la parte superior del canvas.

### Condición de Victoria
`player.coins >= 10000` → transiciona a `GameState.PHASE_1_WIN` → pantalla de celebración → `GameState.PHASE_2`.

### Condición de Derrota
`player.lives <= 0` → `GameState.GAME_OVER`.

### Dificultad Progresiva
- Cada 2.000 Cangre Euros, la velocidad de los enemigos aumenta un 15 %.
- A los 5.000, la tasa de spawn de nuevos enemigos se duplica (ver §22).
- A los 8.000, los enemigos también disparan (proyectiles lentos de burbujas de agua).

```js
class Phase1State extends State {
  enter() {
    this.enemies = [
      new Calamardo(600, LOGICAL_HEIGHT - 140),
      new BobEsponja(800, LOGICAL_HEIGHT - 140),
    ];
    this.moneybags = generateMoneybags(5, 0); // 5 sacos en la zona inicial visible
    this.scrollX = 0;
    this.worldX = 0;       // coordenada del mundo (crece sin límite)
    this.nextBagWorld  = 400;   // worldX en que se spawneará el próximo saco
    this.nextEnemyWorld = 800;  // worldX en que se spawneará la próxima oleada de enemigos
    this.respawnQueue  = [];    // cola de respawns pendientes (ver §23)
    player.lives = 5;
    player.coins = 0;
  }
  update(dt) {
    handlePhase1Input(dt);
    const delta = SCROLL_SPEED * dt;
    this.scrollX  += delta;
    this.worldX   += delta;
    this.enemies.forEach(e => e.update(dt, this.scrollX));
    this.moneybags.forEach(b => b.update(dt, this.scrollX));
    processRespawnQueue(this, dt);   // §23
    spawnContentIfNeeded(this);      // §22
    pruneOffScreenEntities(this);    // elimina entidades muy a la izquierda
    checkPhase1Collisions();
    if (player.coins >= 10000) sceneManager.changeState(new Phase1WinState());
    if (player.lives <= 0)    sceneManager.changeState(new GameOverState());
  }
  render(ctx) {
    renderSeaBackground(ctx, this.scrollX);
    renderBankBuilding(ctx, this.scrollX);
    this.moneybags.forEach(b => b.render(ctx));
    this.enemies.forEach(e => e.render(ctx));
    player.render(ctx);
    renderHUD(ctx, 1);
  }
}
```

---

## 12. Fase 2 — La Huida

### Objetivo
Pulpito debe escapar hacia la derecha alcanzando la **meta** (zona de escape marcada con una puerta brillante en la pared del fondo del mar) sin perder todas sus vidas.

### Mecánica de Juego
- Perseguidores: **Calamardo, Bob Esponja y Don Cangrejo**, moviéndose más rápido a medida que Pulpito avanza.
- Los perseguidores disparan **hamburguesas** (proyectiles rectangulares marrones con semillas).
- Si una hamburguesa impacta a Pulpito, pierde 1 vida.
- Pulpito **mantiene las vidas de la Fase 1**.
- Pulpito sigue pudiendo disparar bolas de tinta para ralentizar a los perseguidores.

### Condición de Victoria
Pulpito llega a la puerta de escape → `GameState.PHASE_2_WIN` → `GameState.PHASE_3`.

### Condición de Derrota
`player.lives <= 0` → `GameState.GAME_OVER`.

### Elemento visual de hamburguesa

```js
function drawHamburger(ctx, x, y, w, h) {
  ctx.save(); ctx.translate(x, y);
  // Pan superior
  ctx.beginPath(); ctx.ellipse(w/2, h*0.15, w*0.45, h*0.2, 0, 0, Math.PI*2);
  ctx.fillStyle = '#c8870a'; ctx.fill();
  // Semillas
  [[-0.1,0], [0.15,-0.05], [0.05,0.05]].forEach(([sx, sy]) => {
    ctx.beginPath(); ctx.ellipse(w/2+sx*w, h*0.12+sy*h, w*0.04, h*0.03, 0.5, 0, Math.PI*2);
    ctx.fillStyle = '#f0e0a0'; ctx.fill();
  });
  // Lechuga
  ctx.fillStyle = '#3a8a2a';
  ctx.fillRect(w*0.1, h*0.28, w*0.8, h*0.1);
  // Carne
  ctx.fillStyle = '#8B3A0A';
  ctx.fillRect(w*0.08, h*0.38, w*0.84, h*0.12);
  // Pan inferior
  ctx.beginPath(); ctx.ellipse(w/2, h*0.82, w*0.45, h*0.18, 0, 0, Math.PI*2);
  ctx.fillStyle = '#c8870a'; ctx.fill();
  ctx.restore();
}
```

---

## 13. Fase 3 — El Jefe Final (Tiburón)

### Objetivo
Pulpito debe quitar las **15 vidas** al tiburón jefe disparándole bolas de tinta, mientras esquiva los **mini tiburones** que este lanza.

### Mecánica de Juego
- Al entrar en esta fase, **Pulpito recupera 5 vidas** (se reinicia su vida).
- El tiburón ocupa la parte derecha del canvas, moviéndose verticalmente.
- Cada vez que Pulpito dispara y acierta al tiburón, este pierde 1 vida (barra de vida decrece).
- El tiburón lanza mini tiburones periódicamente (frecuencia aumenta cuando le quedan pocas vidas).
- Los mini tiburones se mueven en trayectorias curvas hacia Pulpito (bezier o parábola).

### Condición de Victoria
`bossLives <= 0` → `GameState.PHASE_3_WIN` → Pantalla de victoria final con animación.

### Condición de Derrota
`player.lives <= 0` → `GameState.GAME_OVER` → vuelve a `GameState.PHASE_1` (con opción de reiniciar desde el principio).

```js
class Phase3State extends State {
  enter() {
    player.lives = 5;          // Nueva oportunidad
    this.bossLives = 15;
    this.boss = new SharkBoss(LOGICAL_WIDTH * 0.7, LOGICAL_HEIGHT / 2);
    this.miniSharks = [];
    this.spawnTimer = 0;
    this.spawnInterval = 3.0; // segundos entre oleadas
  }
  update(dt) {
    this.boss.update(dt);
    this.spawnTimer += dt;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      this.miniSharks.push(new MiniShark(
        this.boss.x, this.boss.y,
        -200 - Math.random() * 80,
        (Math.random() - 0.5) * 120
      ));
      // Aumentar dificultad al bajar las vidas del jefe
      if (this.bossLives <= 8) this.spawnInterval = 2.0;
      if (this.bossLives <= 4) this.spawnInterval = 1.2;
    }
    this.miniSharks = this.miniSharks.filter(s => s.alive && s.x > -50);
    this.miniSharks.forEach(s => s.update(dt));
    checkPhase3Collisions();
    if (this.bossLives <= 0)  sceneManager.changeState(new Phase3WinState());
    if (player.lives <= 0)    sceneManager.changeState(new GameOverState());
  }
}
```

---

## 14. Detección de Colisiones

Usar **AABB (Axis-Aligned Bounding Box)** para simplicidad y rendimiento:

```js
function aabbCollide(a, b) {
  return (
    a.x < b.x + b.w && a.x + a.w > b.x &&
    a.y < b.y + b.h && a.y + a.h > b.y
  );
}
```

Para los proyectiles circulares (bolas de tinta), usar colisión círculo-rectángulo:

```js
function circleRectCollide(cx, cy, cr, rx, ry, rw, rh) {
  const nearX = Math.max(rx, Math.min(cx, rx + rw));
  const nearY = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - nearX, dy = cy - nearY;
  return dx * dx + dy * dy < cr * cr;
}
```

---

## 15. Sistema de Sonido (`SoundManager`)

El `SoundManager` utiliza la **Web Audio API** para generar sonidos procedurales sintéticos (sin archivos de audio externos).

```js
class SoundManager {
  constructor() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.sounds = {};
  }

  // Genera un sonido sintético y lo registra
  define(name, { type = 'sine', frequency = 440, duration = 0.1, gain = 0.3, sweep = null }) {
    this.sounds[name] = { type, frequency, duration, gain, sweep };
  }

  play(name) {
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const s = this.sounds[name];
    if (!s) return;
    const osc = this.ctx.createOscillator();
    const vol = this.ctx.createGain();
    osc.type = s.type;
    osc.frequency.setValueAtTime(s.frequency, this.ctx.currentTime);
    if (s.sweep) osc.frequency.linearRampToValueAtTime(s.sweep, this.ctx.currentTime + s.duration);
    vol.gain.setValueAtTime(s.gain, this.ctx.currentTime);
    vol.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + s.duration);
    osc.connect(vol); vol.connect(this.ctx.destination);
    osc.start(); osc.stop(this.ctx.currentTime + s.duration);
  }
}

// Sonidos a definir en Initialize():
soundManager.define('inkShoot',   { type: 'sawtooth', frequency: 180, duration: 0.08, gain: 0.2, sweep: 60 });
soundManager.define('coinPickup', { type: 'sine',     frequency: 880, duration: 0.15, gain: 0.3, sweep: 1200 });
soundManager.define('playerHit',  { type: 'square',   frequency: 150, duration: 0.25, gain: 0.4, sweep: 80 });
soundManager.define('enemyStun',  { type: 'sine',     frequency: 300, duration: 0.2,  gain: 0.25, sweep: 100 });
soundManager.define('bossHit',    { type: 'sawtooth', frequency: 100, duration: 0.3,  gain: 0.5, sweep: 40 });
soundManager.define('victory',    { type: 'sine',     frequency: 523, duration: 0.6,  gain: 0.4, sweep: 1046 });
soundManager.define('gameOver',   { type: 'sawtooth', frequency: 200, duration: 0.8,  gain: 0.4, sweep: 80 });
```

---

## 16. HUD (Heads-Up Display)

Renderizado en canvas sobre todas las demás capas. Fuente: `'Bubblegum Sans', cursive`.

```js
function renderHUD(ctx, phase) {
  ctx.save();
  ctx.font = "22px 'Bubblegum Sans', cursive";

  // --- Cangre Euros (monedas) ---
  ctx.fillStyle = PALETTE.gold;
  ctx.textAlign = 'left';
  ctx.fillText(`💰 ${player.coins.toLocaleString()} / 10000 CE`, 12, 30);

  // --- Vidas ---
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ff6b6b';
  const heartsStr = '❤️'.repeat(player.lives) + '🖤'.repeat(Math.max(0, 5 - player.lives));
  ctx.fillText(heartsStr, LOGICAL_WIDTH - 12, 30);

  // --- Fase actual ---
  ctx.textAlign = 'center';
  ctx.fillStyle = '#aef';
  ctx.fillText(`FASE ${phase}`, LOGICAL_WIDTH / 2, 30);

  ctx.restore();
}
```

---

## 17. Pantallas de Transición

### Pantalla de Celebración (Fin de Fase 1)

```js
class Phase1WinState extends State {
  enter() { this.timer = 0; SoundManager.play('victory'); }
  update(dt) {
    this.timer += dt;
    if (this.timer > 4) sceneManager.changeState(new Phase2State());
  }
  render(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    ctx.font = "bold 48px 'Bubblegum Sans', cursive";
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.gold;
    ctx.fillText('¡ROBO COMPLETADO!', LOGICAL_WIDTH/2, LOGICAL_HEIGHT/2 - 40);
    ctx.font = "28px 'Bubblegum Sans', cursive";
    ctx.fillStyle = '#fff';
    ctx.fillText(`Cangre Euros: ${player.coins.toLocaleString()} 💰`, LOGICAL_WIDTH/2, LOGICAL_HEIGHT/2 + 10);
    ctx.fillText(`Vidas restantes: ${'❤️'.repeat(player.lives)}`, LOGICAL_WIDTH/2, LOGICAL_HEIGHT/2 + 50);
    // Confeti vectorial animado (puntos de colores cayendo)
    renderConfetti(ctx, this.timer);
  }
}
```

### Pantalla de Victoria Final (Fin de Fase 3)

```js
class Phase3WinState extends State {
  render(ctx) {
    // Fondo festivo
    // Pulpito grande en el centro con animación de victoria (tentáculos arriba)
    // Texto: "¡PULPITO LIBRE! ¡EL GRAN LADRÓN DEL MAR!"
    // Puntuación final
    // Botón "JUGAR DE NUEVO" → MenuState
  }
}
```

### Game Over

```js
class GameOverState extends State {
  render(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    ctx.font = "bold 56px 'Bubblegum Sans', cursive";
    ctx.textAlign = 'center'; ctx.fillStyle = '#e00';
    ctx.fillText('GAME OVER', LOGICAL_WIDTH/2, LOGICAL_HEIGHT/2 - 30);
    ctx.font = "26px 'Bubblegum Sans', cursive";
    ctx.fillStyle = '#fff';
    ctx.fillText('Click o toca para volver a Fase 1', LOGICAL_WIDTH/2, LOGICAL_HEIGHT/2 + 30);
  }
  enter() { SoundManager.play('gameOver'); }
}
```

---

## 18. Escalado y Responsividad

```js
function onResize() {
  const canvas = document.getElementById('game-canvas');
  const rect = canvas.getBoundingClientRect();
  canvas.width  = rect.width  * window.devicePixelRatio;
  canvas.height = rect.height * window.devicePixelRatio;
  scaleX = canvas.width  / LOGICAL_WIDTH;
  scaleY = canvas.height / LOGICAL_HEIGHT;
}

// En render(), antes de cualquier dibujo:
function render() {
  ctx.save();
  ctx.scale(scaleX, scaleY);   // Todo se dibuja en coordenadas lógicas 960×540
  sceneManager.render(ctx);
  ctx.restore();
}
```

---

## 19. Resumen de Clases y Módulos en `gameplay.js`

```
gameplay.js
├── Constantes y Paleta
├── Vector Math (helpers inline)
├── Entity (clase base)
│   ├── Player
│   │   └── InkBall
│   ├── Calamardo
│   ├── BobEsponja
│   ├── DonCangrejo
│   ├── Moneybag
│   ├── Hamburger
│   ├── SharkBoss
│   └── MiniShark
├── ParallaxLayer
├── SoundManager
├── SceneManager
│   ├── MenuState
│   ├── Phase1State
│   ├── Phase1WinState
│   ├── Phase2State
│   ├── Phase2WinState
│   ├── Phase3State
│   ├── Phase3WinState
│   └── GameOverState
├── Funciones de Renderizado Vectorial
│   ├── drawPulpito()
│   ├── drawCalamardo()
│   ├── drawBobEsponja()
│   ├── drawDonCangrejo()
│   ├── drawTiburon()
│   ├── drawSeaBackground()
│   ├── drawBankBuilding()
│   ├── drawHamburger()
│   ├── renderHUD()
│   └── renderConfetti()
├── Gestión de Inputs
│   ├── captureEvents()
│   ├── handlePhase1Input()
│   ├── handlePhase2Input()
│   └── handlePhase3Input()
├── Initialize()   ← exportada
└── Run()          ← exportada
```

---

## 20. Punto de Entrada

Al final de `gameplay.js`:

```js
// Auto-arranque cuando el DOM está listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Run());
} else {
  Run();
}
```

---

## 22. Generación Dinámica de Contenido — Streaming del Mundo

### Problema que resuelve
Con solo los sacos iniciales en pantalla no es posible alcanzar los 10.000 Cangre Euros porque el número de objetos es fijo y el jugador los recoge rápidamente. El mundo debe generar contenido nuevo de forma continua conforme el scroll avanza.

### Concepto: coordenada de mundo (`worldX`)

La variable `worldX` crece ilimitadamente a medida que el jugador avanza. **No** se reinicia con módulo. Las entidades se sitúan en coordenadas de mundo; su posición en pantalla es `entityWorldX - scrollX`.

```
posiciónEnPantalla = entityWorldX - scrollX
```

Una entidad es visible cuando `posiciónEnPantalla` está entre `0` y `LOGICAL_WIDTH`.

### Algoritmo `spawnContentIfNeeded(state)`

```js
const BAG_SPAWN_INTERVAL   = 350;  // cada 350 px de worldX se spawna un saco
const ENEMY_SPAWN_INTERVAL = 700;  // cada 700 px se lanza una oleada de enemigos

function spawnContentIfNeeded(state) {
  // Sacos de dinero: se generan siempre un paso por delante de la pantalla
  while (state.worldX + LOGICAL_WIDTH > state.nextBagWorld) {
    const bagWorldX = state.nextBagWorld + LOGICAL_WIDTH;
    const bagY      = LOGICAL_HEIGHT - 80 - Math.random() * 180;
    const value     = 150 + Math.floor(Math.random() * 251); // 150–400 CE
    state.moneybags.push(new Moneybag(bagWorldX, bagY, value));
    state.nextBagWorld += BAG_SPAWN_INTERVAL;
  }

  // Oleadas de enemigos
  while (state.worldX + LOGICAL_WIDTH > state.nextEnemyWorld) {
    spawnEnemyWave(state, state.nextEnemyWorld + LOGICAL_WIDTH);
    state.nextEnemyWorld += ENEMY_SPAWN_INTERVAL;
  }
}
```

**Cálculo de suficiencia:** con `BAG_SPAWN_INTERVAL = 350 px` y valor medio de 275 CE por saco, se necesitan ~37 sacos para alcanzar 10.000 CE. El jugador recorrerá ~13.000 px de mundo (≈ 13 pantallas) — tiempo más que suficiente para recogerlos sin que se sientan escasos.

### Variedad en posición de los sacos

| Zona vertical | Probabilidad | Descripción |
|---|---|---|
| Suelo (LOGICAL_HEIGHT − 60 px) | 30 % | Fácil de recoger |
| Media altura (200–340 px) | 50 % | Requiere saltar |
| Plataforma alta (80–160 px) | 20 % | Difícil, da +50 CE adicionales |

### Oleadas de Enemigos (`spawnEnemyWave`)

```js
function spawnEnemyWave(state, worldX) {
  const difficultyFactor = Math.min(state.worldX / 5000, 1); // 0→1 según progreso
  const count = 1 + Math.floor(difficultyFactor * 2); // 1–3 enemigos por oleada

  for (let i = 0; i < count; i++) {
    const type  = Math.random() < 0.5 ? 'calamardo' : 'bob';
    const y     = LOGICAL_HEIGHT - 140;
    const enemy = type === 'calamardo'
      ? new Calamardo(worldX + i * 120, y)
      : new BobEsponja(worldX + i * 120, y);
    enemy.speed *= (1 + difficultyFactor * 0.6);
    state.enemies.push(enemy);
  }
}
```

### Limpieza de entidades fuera de pantalla (`pruneOffScreenEntities`)

Para evitar que las listas crezcan indefinidamente, se eliminan entidades que quedaron más de 200 px a la izquierda del scroll:

```js
function pruneOffScreenEntities(state) {
  const leftBound = state.scrollX - 200;
  state.moneybags = state.moneybags.filter(b => b.worldX > leftBound && b.alive);
  state.enemies   = state.enemies.filter(e => e.worldX > leftBound && e.alive);
}
```

### Coordenadas de Mundo en `Moneybag` y `Enemy`

Todas las entidades de la Fase 1 usan `worldX`. En sus métodos `render` y `update` reciben `scrollX` como parámetro:

```js
render(ctx, scrollX) {
  const screenX = this.worldX - scrollX;
  if (screenX < -this.w - 50 || screenX > LOGICAL_WIDTH + 50) return; // culling
  // dibuja en screenX, this.y
}

update(dt, scrollX) {
  this.worldX += this.vx * dt;  // movimiento relativo al mundo
}
```

---

## 23. Sistema de Vida y Muerte de Enemigos con Respawn

### Problema que resuelve
En la primera implementación, las bolas de tinta solo aturden a los enemigos. Para mayor jugabilidad y sensación de progresión, los enemigos deben poder **morir** acumulando daño (5 impactos) y luego **respawnear** después de un tiempo, manteniendo presión constante sobre el jugador.

### Propiedad `hp` en enemigos

| Enemigo | `hp` base | Notas |
|---|---|---|
| `Calamardo` | 5 | Enemigo estándar Fase 1 y 2 |
| `BobEsponja` | 5 | Enemigo estándar Fase 1 y 2 |
| `DonCangrejo` | 8 | Solo Fase 2, más resistente |
| `SharkBoss` | 15 | Jefe Final Fase 3 (sin respawn) |

### Modificación de la clase `Enemy` base

```js
class Enemy extends Entity {
  constructor(worldX, y, w, h, hp) {
    super(worldX, y, w, h);
    this.worldX = worldX;
    this.hp = hp;
    this.maxHp = hp;
    this.stunTime = 0;
    this.deathTimer = -1;          // -1 = vivo; ≥ 0 = animación de muerte activa
    this.DEATH_ANIM_DURATION = 0.6;
  }

  hit() {
    if (this.deathTimer >= 0) return; // ya muerto
    this.hp -= 1;
    this.stunTime = 0.4;
    SoundManager.play('enemyHit');
    if (this.hp <= 0) this.die();
  }

  die() {
    this.deathTimer = 0;
    SoundManager.play('enemyDeath');
    player.coins += 200; // bonus por matar enemigo
    if (currentPhaseState?.respawnQueue) {
      currentPhaseState.respawnQueue.push({
        type: this.constructor.name,
        delay: 4.0,
        elapsed: 0,
        done: false,
      });
    }
  }

  update(dt, scrollX) {
    if (this.deathTimer >= 0) {
      this.deathTimer += dt;
      if (this.deathTimer >= this.DEATH_ANIM_DURATION) this.alive = false;
      return;
    }
    if (this.stunTime > 0) {
      this.stunTime -= dt;
      return;
    }
    this.worldX += this.vx * dt;
    // lógica de patrulla específica en cada subclase
  }
}
```

### Animación de muerte — explosión de tinta

Cuando `deathTimer >= 0`, en lugar del sprite normal se renderiza una explosión de partículas:

```js
function renderDeathExplosion(ctx, screenX, screenY, w, timer, duration) {
  const progress = timer / duration; // 0 → 1
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
  // Flash blanco al inicio del impacto
  if (progress < 0.2) {
    ctx.beginPath();
    ctx.arc(screenX + w / 2, screenY + w / 2, w * 0.6 * (1 - progress / 0.2), 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fill();
  }
  ctx.restore();
}
```

Y en el `render` de cada enemigo se incluye la barra de vida y la detección de estado de muerte:

```js
render(ctx, scrollX) {
  const screenX = this.worldX - scrollX;
  if (screenX < -this.w - 50 || screenX > LOGICAL_WIDTH + 50) return;

  if (this.deathTimer >= 0) {
    renderDeathExplosion(ctx, screenX, this.y, this.w, this.deathTimer, this.DEATH_ANIM_DURATION);
    return;
  }
  // Parpadeo rápido al recibir daño
  if (this.stunTime > 0 && Math.floor(Date.now() / 80) % 2 === 0) return;

  this.drawSelf(ctx, screenX, this.y, this.w, this.h);

  // Barra de vida pequeña sobre el enemigo (visible solo si hp < maxHp)
  if (this.hp < this.maxHp) {
    const barW = this.w * 0.8;
    const barX = screenX + this.w * 0.1;
    const barY = this.y - 10;
    ctx.fillStyle = '#333';
    ctx.fillRect(barX, barY, barW, 5);
    ctx.fillStyle = `hsl(${(this.hp / this.maxHp) * 120}, 80%, 45%)`;
    ctx.fillRect(barX, barY, barW * (this.hp / this.maxHp), 5);
  }
}
```

### Cola de Respawn (`respawnQueue`)

```js
function processRespawnQueue(state, dt) {
  const aliveCount = state.enemies.filter(e => e.alive && e.deathTimer < 0).length;

  for (const entry of state.respawnQueue) {
    entry.elapsed += dt;
    if (entry.elapsed >= entry.delay && aliveCount < 6) {
      entry.done = true;
      const spawnWorldX = state.scrollX + LOGICAL_WIDTH + 80; // fuera de pantalla, a la derecha
      const spawnY      = LOGICAL_HEIGHT - 140;
      const diffFactor  = Math.min(state.worldX / 5000, 1);
      const newEnemy    = entry.type === 'Calamardo'
        ? new Calamardo(spawnWorldX, spawnY)
        : new BobEsponja(spawnWorldX, spawnY);
      newEnemy.speed *= (1 + diffFactor * 0.6);
      state.enemies.push(newEnemy);
    }
  }
  state.respawnQueue = state.respawnQueue.filter(e => !e.done);
}
```

**Reglas del Respawn:**
- Máximo **6 enemigos vivos** simultáneamente en Fase 1. Si se alcanza el máximo, los respawns se posponen hasta que alguno muera o salga de pantalla.
- El delay de 4 segundos da al jugador un breve respiro tras matar a un enemigo.
- El nuevo enemigo siempre aparece **fuera de la pantalla por la derecha** para evitar que aparezca encima del jugador.
- En Fase 2, el mismo mecanismo aplica a `DonCangrejo` con delay de 5 segundos y máximo de 4 enemigos.

### Colisiones actualizadas (Fase 1)

```js
function checkPhase1Collisions() {
  // Ink balls vs enemigos
  for (const ball of player.inkBalls) {
    for (const enemy of phase1State.enemies) {
      if (!enemy.alive || enemy.deathTimer >= 0) continue;
      const screenX = enemy.worldX - phase1State.scrollX;
      if (circleRectCollide(ball.x, ball.y, 8, screenX, enemy.y, enemy.w, enemy.h)) {
        ball.alive = false;
        enemy.hit(); // quita 1 HP; si llega a 0 dispara die() → respawnQueue
      }
    }
  }
  player.inkBalls = player.inkBalls.filter(b => b.alive && b.x < LOGICAL_WIDTH + 50 && b.x > -50);

  // Enemigo toca a Pulpito
  for (const enemy of phase1State.enemies) {
    if (!enemy.alive || enemy.deathTimer >= 0 || enemy.stunTime > 0) continue;
    const screenX = enemy.worldX - phase1State.scrollX;
    if (aabbCollide(player.getBBox(), { x: screenX, y: enemy.y, w: enemy.w, h: enemy.h })) {
      if (player.invincibleTime <= 0) {
        player.lives -= 1;
        player.invincibleTime = 2.0;
        SoundManager.play('playerHit');
      }
    }
  }

  // Sacos de dinero
  for (const bag of phase1State.moneybags) {
    if (!bag.alive) continue;
    const screenX = bag.worldX - phase1State.scrollX;
    if (aabbCollide(player.getBBox(), { x: screenX, y: bag.y, w: bag.w, h: bag.h })) {
      bag.alive = false;
      player.coins += bag.value;
      SoundManager.play('coinPickup');
    }
  }
}
```

### Sonidos adicionales

```js
soundManager.define('enemyHit',   { type: 'square',   frequency: 350, duration: 0.12, gain: 0.3,  sweep: 200 });
soundManager.define('enemyDeath', { type: 'sawtooth', frequency: 180, duration: 0.4,  gain: 0.45, sweep: 60  });
```

---

## 21. Checklist de Implementación para Copilot

- [ ] Crear `index.html` con la estructura descrita en §3, título de colores, canvas responsive.
- [ ] Crear `gameplay.js` como módulo ES con todas las clases y funciones descritas.
- [ ] Implementar `Initialize()` y `Run()` exportados.
- [ ] Implementar el Game Loop completo (§4.3) dentro de `Run()`.
- [ ] Implementar `SceneManager` y todos los estados del juego (§5, §11–13, §17).
- [ ] Implementar `drawPulpito()` con todos los detalles vectoriales (§8.2).
- [ ] Implementar `drawCalamardo()`, `drawBobEsponja()`, `drawDonCangrejo()` (§9).
- [ ] Implementar `drawTiburon()` con barra de vida y mini tiburones (§9.4–9.5).
- [ ] Implementar sistema de Parallax Scrolling con 5 capas (§10).
- [ ] Implementar coordenadas de mundo (`worldX`) en todas las entidades de Fase 1 (§22).
- [ ] Implementar `spawnContentIfNeeded()` para generar sacos y oleadas de enemigos dinámicamente (§22).
- [ ] Implementar `pruneOffScreenEntities()` para limpiar entidades fuera de pantalla (§22).
- [ ] Implementar `spawnEnemyWave()` con dificultad escalada (§22).
- [ ] Implementar Fase 1 completa con dificultad progresiva y streaming de contenido (§11, §22).
- [ ] Implementar clase `Enemy` base con `hp`, `hit()`, `die()`, `stunTime` y `deathTimer` (§23).
- [ ] Implementar animación de muerte vectorial `renderDeathExplosion()` (§23).
- [ ] Implementar barra de vida pequeña sobre cada enemigo (§23).
- [ ] Implementar cola de respawn `respawnQueue` con límite de 6 enemigos simultáneos (§23).
- [ ] Implementar `processRespawnQueue()` con spawn fuera de pantalla a la derecha (§23).
- [ ] Actualizar `checkPhase1Collisions()` para usar `enemy.hit()` en lugar de stun (§23).
- [ ] Añadir sonidos `enemyHit` y `enemyDeath` al `SoundManager` (§23).
- [ ] Implementar Fase 2 con perseguidores y hamburguesas (§12).
- [ ] Implementar Fase 3 con jefe tiburón y mini tiburones (§13).
- [ ] Implementar detección de colisiones AABB y círculo-rectángulo (§14).
- [ ] Implementar `SoundManager` con Web Audio API procedural (§15).
- [ ] Implementar HUD con monedas y vidas (§16).
- [ ] Implementar pantallas de celebración, victoria y game over (§17).
- [ ] Implementar escalado responsivo del canvas (§18).
- [ ] Verificar entradas de teclado, ratón y táctil (§7).
- [ ] Probar en Chrome, Firefox y Safari en escritorio y móvil.

---

*Plan generado para el repositorio **Pulpito** — Junio 2026.*
