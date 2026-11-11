/* Arte procedural: sprites y tiles dibujados con Canvas.
   Todo es original, no depende de imágenes externas. */

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvasOf(w, h) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

/* ------------------------------------------------------------------ tiles */

const GRASS_SHADES = ["#4c7c3a", "#517f3d", "#477436", "#547f42", "#4a7838"];
const GRASS_DARK = ["#3e6630", "#365c29", "#42702f"];
const GRASS_LIGHT = ["#6d9c50", "#7aa85a", "#648f47"];

function paintGrass(ctx, size, rnd) {
  const shade = GRASS_SHADES[Math.floor(rnd() * GRASS_SHADES.length)];
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, size, size);

  // Manchas suaves de pasto
  const blobs = 5 + Math.floor(rnd() * 4);
  for (let i = 0; i < blobs; i++) {
    ctx.fillStyle = rnd() > 0.5 ? GRASS_DARK[Math.floor(rnd() * 3)] : GRASS_LIGHT[Math.floor(rnd() * 3)];
    ctx.globalAlpha = 0.35;
    const w = Math.max(2, Math.floor(size * (0.12 + rnd() * 0.25)));
    const h = Math.max(2, Math.floor(size * (0.1 + rnd() * 0.22)));
    ctx.fillRect(Math.floor(rnd() * (size - w)), Math.floor(rnd() * (size - h)), w, h);
  }
  ctx.globalAlpha = 1;

  // Briznas de pasto (pixel art)
  const unit = Math.max(1, Math.round(size / 16));
  const blades = 3 + Math.floor(rnd() * 5);
  for (let i = 0; i < blades; i++) {
    const x = Math.floor(rnd() * size);
    const y = Math.floor(rnd() * (size - unit * 4));
    ctx.fillStyle = rnd() > 0.4 ? GRASS_DARK[0] : GRASS_LIGHT[0];
    ctx.fillRect(x, y, unit, unit * (1 + Math.floor(rnd() * 2)));
    if (rnd() > 0.6) ctx.fillRect(x + unit, y + unit, unit, unit);
  }

  // Borde sutil
  ctx.fillStyle = "rgba(0,0,0,0.08)";
  ctx.fillRect(0, size - 1, size, 1);
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  ctx.fillRect(0, 0, size, 1);
}

function paintWall(ctx, size, rnd) {
  const top = "#3a424c";
  const mid = "#2b323b";
  const low = "#1e242b";
  ctx.fillStyle = mid;
  ctx.fillRect(0, 0, size, size);

  // Cara superior iluminada (efecto 3D tipo bloque)
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, size, Math.max(2, size * 0.16));
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(0, 0, size, 1);

  // Sombra inferior
  ctx.fillStyle = low;
  ctx.fillRect(0, size - Math.max(2, size * 0.14), size, Math.max(2, size * 0.14));

  // Ladrillos de piedra
  const rows = 3;
  const rowH = size / rows;
  ctx.strokeStyle = "rgba(0,0,0,0.45)";
  ctx.lineWidth = Math.max(1, size * 0.03);
  for (let r = 1; r < rows; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * rowH);
    ctx.lineTo(size, r * rowH);
    ctx.stroke();
  }
  for (let r = 0; r < rows; r++) {
    const offset = r % 2 === 0 ? 0 : size * 0.5;
    for (let x = offset; x < size; x += size) {
      ctx.beginPath();
      ctx.moveTo(x, r * rowH);
      ctx.lineTo(x, (r + 1) * rowH);
      ctx.stroke();
    }
  }

  // Ruido de piedra
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = rnd() > 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.12)";
    ctx.fillRect(Math.floor(rnd() * size), Math.floor(rnd() * size), Math.max(1, size * 0.1), Math.max(1, size * 0.06));
  }

  // Musgo ocasional
  if (rnd() > 0.55) {
    ctx.fillStyle = "#4f7a3a";
    const w = size * (0.15 + rnd() * 0.25);
    ctx.fillRect(rnd() * (size - w), 0, w, Math.max(2, size * 0.08));
  }

  ctx.strokeStyle = "rgba(0,0,0,0.55)";
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, size - 1, size - 1);
}

function paintRubble(ctx, size, rnd) {
  ctx.fillStyle = "#6d2b26";
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "#8a3830";
  ctx.fillRect(0, 0, size, Math.max(2, size * 0.14));

  const rows = 3;
  const rowH = size / rows;
  for (let r = 0; r < rows; r++) {
    const offset = r % 2 === 0 ? 0 : -size * 0.5;
    for (let x = offset; x < size; x += size) {
      ctx.fillStyle = rnd() > 0.5 ? "#9d453c" : "#7f342d";
      ctx.fillRect(x + 1, r * rowH + 1, size - 2, rowH - 2);
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.fillRect(x + 1, r * rowH + 1, size - 2, 1);
    }
  }

  // Grietas
  ctx.strokeStyle = "rgba(0,0,0,0.45)";
  ctx.lineWidth = Math.max(1, size * 0.03);
  ctx.beginPath();
  let x = rnd() * size;
  let y = 0;
  ctx.moveTo(x, y);
  while (y < size) {
    x += (rnd() - 0.5) * size * 0.35;
    y += size * 0.22;
    ctx.lineTo(Math.max(0, Math.min(size, x)), Math.min(size, y));
  }
  ctx.stroke();

  ctx.strokeStyle = "rgba(0,0,0,0.6)";
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, size - 1, size - 1);
}

const tileCache = new Map();

export function getTile(kind, size, variant = 0) {
  const key = `${kind}:${size}:${variant}`;
  const cached = tileCache.get(key);
  if (cached) return cached;

  const c = canvasOf(size, size);
  const ctx = c.getContext("2d");
  const rnd = mulberry32(1337 + variant * 977 + size * 31);

  if (kind === "wall") paintWall(ctx, size, rnd);
  else if (kind === "rubble") paintRubble(ctx, size, rnd);
  else paintGrass(ctx, size, rnd);

  tileCache.set(key, c);
  return c;
}

/* ---------------------------------------------------------------- sprites */

const RESCUER = {
  colors: {
    h: "#6f4324",
    s: "#f2c9a0",
    e: "#2b1a10",
    g: "#3f7d4a",
    p: "#8a5a2b",
    t: "#4c3a2a",
    d: "#2b1a10",
  },
  rows: [
    "....hhhh....",
    "...hhhhhh...",
    "..hhhhhhhh..",
    ".hhhhhhhhhh.",
    ".hssssssssh.",
    ".hses..sesh.",
    ".hssssssssh.",
    "..ssssssss..",
    "...gggggg...",
    "..gggggggg..",
    ".pgggggggp..",
    ".pgggggggp..",
    "..gggggggg..",
    "...tt..tt...",
    "..dd....dd..",
  ],
};

const CAT = {
  colors: {
    c: "#e2924a",
    d: "#b96b2c",
    w: "#2b1a10",
    m: "#e37f7f",
    e: "#f9e6c8",
  },
  rows: [
    "..c....c..",
    ".ccc..ccc.",
    ".cccccccc.",
    ".cwc..cwc.",
    ".cccccccc.",
    ".cccmmccc.",
    "..cddddc..",
    "..c.cc.c..",
    ".cc....cc.",
  ],
};

function drawPixelArt(ctx, def, x, y, pixel, flip = false, outline = null) {
  const rows = def.rows;
  const h = rows.length;
  const w = rows[0].length;
  ctx.save();
  if (flip) {
    ctx.translate(x + w * pixel, y);
    ctx.scale(-1, 1);
  } else {
    ctx.translate(x, y);
  }

  if (outline) {
    ctx.fillStyle = outline;
    const offsets = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ];
    for (const [dx, dy] of offsets) {
      for (let ry = 0; ry < h; ry++) {
        const row = rows[ry];
        for (let rx = 0; rx < w; rx++) {
          if (row[rx] === ".") continue;
          ctx.fillRect((rx + dx) * pixel, (ry + dy) * pixel, pixel + 0.4, pixel + 0.4);
        }
      }
    }
  }

  for (let ry = 0; ry < h; ry++) {
    const row = rows[ry];
    for (let rx = 0; rx < w; rx++) {
      const ch = row[rx];
      if (ch === ".") continue;
      ctx.fillStyle = def.colors[ch] || "#fff";
      ctx.fillRect(rx * pixel, ry * pixel, pixel + 0.3, pixel + 0.3);
    }
  }
  ctx.restore();
}

export function drawRescuer(ctx, cx, cy, size, flip = false, bob = 0) {
  const pixel = Math.max(1, size / 16);
  const w = 12 * pixel;
  const h = 15 * pixel;
  const x = cx - w / 2;
  const y = cy - h / 2 + bob;
  // Sombra
  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.ellipse(cx, cy + h / 2 - pixel, w * 0.42, pixel * 2.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  drawPixelArt(ctx, RESCUER, x, y, pixel, flip, "#20100a");
}

export function drawCat(ctx, cx, cy, size, t = 0) {
  // Cojín
  const cw = size * 0.82;
  const ch = size * 0.34;
  ctx.save();
  ctx.fillStyle = "#8e2f34";
  ctx.strokeStyle = "#4a1418";
  ctx.lineWidth = Math.max(1, size * 0.04);
  ctx.beginPath();
  ctx.roundRect(cx - cw / 2, cy + size * 0.16, cw, ch, size * 0.08);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#c34a4f";
  ctx.beginPath();
  ctx.roundRect(cx - cw / 2 + size * 0.06, cy + size * 0.2, cw - size * 0.12, ch * 0.42, size * 0.05);
  ctx.fill();
  ctx.restore();

  const pixel = Math.max(1, (size * 0.58) / 10);
  const w = 10 * pixel;
  const h = 9 * pixel;
  const bounce = Math.sin(t * 0.003) * pixel * 0.35;
  drawPixelArt(ctx, CAT, cx - w / 2, cy - h * 0.55 + bounce, pixel, false, "#20100a");

  // Colita animada
  ctx.save();
  ctx.strokeStyle = "#e2924a";
  ctx.lineWidth = Math.max(1.5, pixel * 1.2);
  ctx.lineCap = "round";
  ctx.beginPath();
  const tx = cx + w * 0.46;
  const ty = cy + h * 0.1 + bounce;
  ctx.moveTo(tx, ty);
  ctx.quadraticCurveTo(tx + pixel * 4, ty - pixel * 2, tx + pixel * 3, ty - pixel * 5 + Math.sin(t * 0.004) * pixel);
  ctx.stroke();
  ctx.restore();
}

/* ------------------------------------------------------------ decoración */

export function drawTree(ctx, x, y, scale) {
  const u = Math.max(1, scale);
  // tronco
  ctx.fillStyle = "#5a3a1e";
  ctx.fillRect(x - u * 2, y - u * 8, u * 4, u * 8);
  ctx.fillStyle = "#3d2613";
  ctx.fillRect(x - u * 2, y - u * 8, u, u * 8);
  // copa en capas
  const layers = [
    { dx: -10, dy: -14, w: 20, h: 9, c: "#2f5c28" },
    { dx: -8, dy: -20, w: 16, h: 8, c: "#3a6e2f" },
    { dx: -5, dy: -25, w: 10, h: 7, c: "#478238" },
  ];
  for (const l of layers) {
    ctx.fillStyle = l.c;
    ctx.fillRect(x + l.dx * u, y + l.dy * u, l.w * u, l.h * u);
  }
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(x - u * 4, y - u * 27, u * 6, u);
}

export function drawRock(ctx, x, y, scale, rnd) {
  const u = Math.max(1, scale);
  ctx.fillStyle = "#4a5158";
  ctx.fillRect(x - u * 5, y - u * 3, u * 10, u * 4);
  ctx.fillRect(x - u * 3, y - u * 5, u * 6, u * 3);
  ctx.fillStyle = "#5d656d";
  ctx.fillRect(x - u * 4, y - u * 5, u * 6, u);
  ctx.fillStyle = rnd() > 0.5 ? "#4f7a3a" : "#3f6330";
  ctx.fillRect(x - u * 2, y - u * 5, u * 3, u);
}

export function drawFlower(ctx, x, y, scale, rnd) {
  const u = Math.max(1, scale);
  const colors = ["#e6c94f", "#d96a7c", "#e8e2c9", "#b08ad6"];
  ctx.fillStyle = "#3d6b2c";
  ctx.fillRect(x, y, u, u * 2);
  ctx.fillStyle = colors[Math.floor(rnd() * colors.length)];
  ctx.fillRect(x - u, y - u, u * 3, u);
  ctx.fillRect(x, y - u * 2, u, u * 3);
  ctx.fillStyle = "#f7f0c9";
  ctx.fillRect(x, y - u, u, u);
}

export const TILE_KINDS = { GRASS: "grass", WALL: "wall", RUBBLE: "rubble" };
