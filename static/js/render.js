import {
  drawCat,
  drawFlower,
  drawRescuer,
  drawRock,
  drawTerrainSprite,
  drawTree,
  getTile,
  mulberry32,
} from "./art.js";

const COLORS = {
  frontier: "245, 213, 71",
  closed: "229, 72, 77",
  path: "111, 220, 127",
  start: "111, 220, 127",
  goal: "229, 72, 77",
};

export class BoardRenderer {
  constructor(canvas, stage) {
    this.canvas = canvas;
    this.stage = stage;
    this.ctx = canvas.getContext("2d");
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.geometry = { x: 0, y: 0, cell: 24, boardW: 0, boardH: 0, rows: 0, cols: 0 };
    this.decor = [];
    this.decorKey = "";
    this.scene = document.createElement("canvas");
    this.sceneCtx = this.scene.getContext("2d");
    this.sceneKey = "";
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(stage);
    this.resize();
  }

  resize() {
    const rect = this.stage.getBoundingClientRect();
    const w = Math.max(320, rect.width);
    const h = Math.max(320, rect.height);
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.viewW = w;
    this.viewH = h;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.decorKey = "";
    this.sceneKey = "";
  }

  updateGeometry(rows, cols) {
    const margin = Math.max(18, Math.min(46, Math.min(this.viewW, this.viewH) * 0.045));
    const availW = this.viewW - margin * 2;
    const availH = this.viewH - margin * 2;
    let cell = Math.floor(Math.min(availW / cols, availH / rows));
    cell = Math.max(10, cell);
    const boardW = cell * cols;
    const boardH = cell * rows;
    this.geometry = {
      x: Math.round((this.viewW - boardW) / 2),
      y: Math.round((this.viewH - boardH) / 2),
      cell,
      boardW,
      boardH,
      rows,
      cols,
    };
  }

  cellAt(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const { x: ox, y: oy, cell, cols, rows } = this.geometry;
    const c = Math.floor((x - ox) / cell);
    const r = Math.floor((y - oy) / cell);
    if (r < 0 || c < 0 || r >= rows || c >= cols) return null;
    return { r, c };
  }

  cellCenter(r, c) {
    const { x, y, cell } = this.geometry;
    return { x: x + c * cell + cell / 2, y: y + r * cell + cell / 2 };
  }

  buildDecor() {
    const { x, y, boardW, boardH, cell } = this.geometry;
    const signature = `${this.viewW}:${this.viewH}:${cell}:${boardW}:${boardH}`;
    if (signature === this.decorKey) return;
    this.decorKey = signature;

    const rnd = mulberry32(4242 + Math.round(cell));
    const items = [];
    const marginL = x;
    const marginR = this.viewW - (x + boardW);
    const marginT = y;
    const marginB = this.viewH - (y + boardH);
    const unit = Math.max(1, cell / 26);

    const pushDecor = (px, py, type) => {
      items.push({ px, py, type, scale: unit * (0.8 + rnd() * 0.5), seed: Math.floor(rnd() * 1000) });
    };

    for (let i = 0; i < Math.floor(marginL / 52); i++) {
      pushDecor(10 + rnd() * Math.max(2, marginL - 24), 22 + rnd() * (this.viewH - 44), rnd() > 0.35 ? "tree" : "rock");
    }
    for (let i = 0; i < Math.floor(marginR / 52); i++) {
      pushDecor(x + boardW + 16 + rnd() * Math.max(2, marginR - 28), 22 + rnd() * (this.viewH - 44), rnd() > 0.35 ? "tree" : "rock");
    }
    for (let i = 0; i < Math.floor(marginT / 70); i++) {
      pushDecor(22 + rnd() * (this.viewW - 44), 16 + rnd() * Math.max(2, marginT - 18), rnd() > 0.4 ? "tree" : "rock");
    }
    for (let i = 0; i < Math.floor(marginB / 80); i++) {
      pushDecor(22 + rnd() * (this.viewW - 44), y + boardH + 22 + rnd() * Math.max(2, marginB - 28), rnd() > 0.5 ? "tree" : "flower");
    }
    for (let i = 0; i < 16; i++) {
      const side = Math.floor(rnd() * 4);
      let px;
      let py;
      if (side === 0) {
        px = rnd() * Math.max(1, marginL);
        py = rnd() * this.viewH;
      } else if (side === 1) {
        px = x + boardW + rnd() * Math.max(1, marginR);
        py = rnd() * this.viewH;
      } else if (side === 2) {
        px = rnd() * this.viewW;
        py = rnd() * Math.max(1, marginT);
      } else {
        px = rnd() * this.viewW;
        py = y + boardH + rnd() * Math.max(1, marginB);
      }
      pushDecor(px, py, "flower");
    }

    this.decor = items;
  }

  /* ------------------------------------------------------ escena estática */

  sceneSignature(state) {
    const { rows, cols, cells } = state;
    const { cell, x, y } = this.geometry;
    let hash = 2166136261;
    for (let r = 0; r < rows; r++) {
      const row = cells[r];
      for (let c = 0; c < cols; c++) {
        hash ^= row[c] * (c + 3) + r * 17 + 1;
        hash = Math.imul(hash, 16777619);
        const terrain = state.terrain?.[r]?.[c];
        hash ^= terrain === "water" ? 2 : terrain === "bush" ? 3 : terrain === "fence" ? 4 : 1;
        hash = Math.imul(hash, 16777619);
      }
    }
    return `${this.viewW}x${this.viewH}:${x},${y},${cell}:${rows}x${cols}:${hash >>> 0}:${this.decorKey}`;
  }

  buildScene(state) {
    const { rows, cols, cells } = state;
    const { ctx } = this;
    const { x: ox, y: oy, cell, boardW, boardH } = this.geometry;

    this.scene.width = Math.round(this.viewW * this.dpr);
    this.scene.height = Math.round(this.viewH * this.dpr);
    const sctx = this.sceneCtx;
    sctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    sctx.clearRect(0, 0, this.viewW, this.viewH);

    // Fondo de pasto en todo el escenario
    const grassVariant = (r, c) => (r * 7 + c * 13) % 4;
    for (let py = 0; py < this.viewH; py += cell) {
      for (let px = 0; px < this.viewW; px += cell) {
        sctx.drawImage(getTile("grass", cell, grassVariant(py / cell, px / cell)), px, py, cell, cell);
      }
    }
    sctx.fillStyle = "rgba(8, 16, 6, 0.2)";
    sctx.fillRect(0, 0, this.viewW, this.viewH);

    for (const item of this.decor) {
      if (item.type === "tree") drawTree(sctx, item.px, item.py, item.scale);
      else if (item.type === "rock") drawRock(sctx, item.px, item.py, item.scale, mulberry32(item.seed));
      else drawFlower(sctx, item.px, item.py, Math.max(1, item.scale * 0.9), mulberry32(item.seed));
    }

    // Sombra del tablero
    sctx.fillStyle = "rgba(0,0,0,0.45)";
    sctx.fillRect(ox - 6, oy - 6, boardW + 12, boardH + 12);

    // Tiles del tablero
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const value = cells[r][c];
        const px = ox + c * cell;
        const py = oy + r * cell;
        let kind;
        let variant;
        if (value <= 0) {
          kind = "wall";
          variant = (r * 3 + c * 5) % 3;
        } else {
          kind = "grass";
          variant = grassVariant(r, c);
        }
        sctx.drawImage(getTile(kind, cell, variant), px, py, cell, cell);
      }
    }

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const terrain = state.terrain?.[r]?.[c];
        if (cells[r][c] <= 1 || !["water", "bush", "fence"].includes(terrain)) continue;
        const centerX = ox + c * cell + cell / 2;
        const centerY = oy + r * cell + cell / 2;
        drawTerrainSprite(sctx, terrain, centerX, centerY, cell);
      }
    }

    // Cuadrícula
    if (cell >= 16) {
      sctx.strokeStyle = "rgba(0,0,0,0.13)";
      sctx.lineWidth = 1;
      sctx.beginPath();
      for (let c = 1; c < cols; c++) {
        sctx.moveTo(ox + c * cell + 0.5, oy);
        sctx.lineTo(ox + c * cell + 0.5, oy + boardH);
      }
      for (let r = 1; r < rows; r++) {
        sctx.moveTo(ox, oy + r * cell + 0.5);
        sctx.lineTo(ox + boardW, oy + r * cell + 0.5);
      }
      sctx.stroke();
    }

    // Marco de piedra
    sctx.strokeStyle = "#20262d";
    sctx.lineWidth = 5;
    sctx.strokeRect(ox - 2.5, oy - 2.5, boardW + 5, boardH + 5);
    sctx.strokeStyle = "rgba(255,255,255,0.08)";
    sctx.lineWidth = 1;
    sctx.strokeRect(ox + 0.5, oy + 0.5, boardW - 1, boardH - 1);

    // Costo del terreno
    if (cell >= 20) {
      sctx.font = `${Math.max(7, Math.round(cell * 0.3))}px "Press Start 2P", monospace`;
      sctx.textAlign = "center";
      sctx.textBaseline = "middle";
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const value = cells[r][c];
          if (value <= 1) continue;
          const px = ox + c * cell + cell / 2;
          const terrain = state.terrain?.[r]?.[c];
          const py = oy + r * cell + (["water", "bush", "fence"].includes(terrain) ? cell * 0.84 : cell / 2);
          sctx.fillStyle = "rgba(20, 6, 6, 0.9)";
          sctx.fillText(String(value), px + 1, py + 1);
          sctx.fillStyle = "#ffe3a3";
          sctx.fillText(String(value), px, py);
        }
      }
    }

    this.sceneKey = this.sceneSignature(state);
  }

  /* ------------------------------------------------------------------ draw */

  draw(state, time) {
    const { ctx } = this;
    const { rows, cols } = state;
    const geometryChanged =
      this.geometry.rows !== rows || this.geometry.cols !== cols || this.geometry.cell === 0;
    this.updateGeometry(rows, cols);
    this.buildDecor();

    const signature = this.sceneSignature(state);
    if (geometryChanged || signature !== this.sceneKey) this.buildScene(state);

    ctx.clearRect(0, 0, this.viewW, this.viewH);
    ctx.drawImage(this.scene, 0, 0, this.viewW, this.viewH);

    const { x: ox, y: oy, cell, boardW, boardH } = this.geometry;
    const overlay = state.overlay;
    const dim = overlay.dim ?? 1;
    const pulse = 0.5 + 0.5 * Math.sin(time * 0.006);

    // ---- celdas descartadas (rojo) ------------------------------------------
    if (overlay.closed.size) {
      for (const node of overlay.closed.values()) {
        const px = ox + node.c * cell;
        const py = oy + node.r * cell;
        ctx.fillStyle = `rgba(170, 40, 45, ${(0.62 + 0.05 * pulse) * dim})`;
        ctx.fillRect(px + 0.5, py + 0.5, cell - 1, cell - 1);
      }
      ctx.strokeStyle = `rgba(${COLORS.closed}, ${0.55 * dim})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (const node of overlay.closed.values()) {
        const px = ox + node.c * cell;
        const py = oy + node.r * cell;
        ctx.rect(px + 0.5, py + 0.5, cell - 1, cell - 1);
      }
      ctx.stroke();

      if (cell >= 27 && dim > 0.6) {
        ctx.font = `${Math.max(7, Math.round(cell * 0.24))}px "Press Start 2P", monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        for (const node of overlay.closed.values()) {
          const px = ox + node.c * cell + cell / 2;
          const py = oy + node.r * cell + cell / 2;
          const label = Number.isInteger(node.g) ? String(node.g) : node.g.toFixed(1);
          ctx.fillStyle = "rgba(40, 4, 6, 0.9)";
          ctx.fillText(label, px + 1, py + 1);
          ctx.fillStyle = "rgba(255, 228, 228, 0.95)";
          ctx.fillText(label, px, py);
        }
      }
    }

    // ---- frontera de búsqueda (amarillo) -----------------------------------
    if (overlay.frontier.size) {
      for (const node of overlay.frontier.values()) {
        const px = ox + node.c * cell;
        const py = oy + node.r * cell;
        ctx.fillStyle = `rgba(245, 205, 60, ${(0.66 + 0.08 * pulse) * dim})`;
        ctx.fillRect(px + 0.5, py + 0.5, cell - 1, cell - 1);
      }
      ctx.strokeStyle = `rgba(${COLORS.frontier}, ${(0.7 + 0.25 * pulse) * dim})`;
      ctx.lineWidth = Math.max(1.5, cell * 0.04);
      ctx.beginPath();
      for (const node of overlay.frontier.values()) {
        const px = ox + node.c * cell;
        const py = oy + node.r * cell;
        ctx.rect(px + 1, py + 1, cell - 2, cell - 2);
      }
      ctx.stroke();
    }

    // ---- ruta óptima --------------------------------------------------------
    if (overlay.path.length > 1 && overlay.pathReveal > 0) {
      this.drawPath(overlay, time);
    }

    this.drawSpecialTiles(state, time);

    // ---- puntero ------------------------------------------------------------
    if (state.hover && !state.walker?.active) {
      const { r, c } = state.hover;
      const px = ox + c * cell;
      const py = oy + r * cell;
      ctx.save();
      ctx.strokeStyle = "rgba(255, 246, 220, 0.95)";
      ctx.lineWidth = Math.max(2, cell * 0.06);
      ctx.shadowColor = "rgba(255, 236, 180, 0.9)";
      ctx.shadowBlur = cell * 0.55;
      ctx.strokeRect(px + 2, py + 2, cell - 4, cell - 4);
      ctx.restore();
    }

    // ---- personajes ---------------------------------------------------------
    const goalCenter = this.cellCenter(state.goal[0], state.goal[1]);
    drawCat(ctx, goalCenter.x, goalCenter.y, cell, state.blocked ? time * 3 : time);

    if (state.blocked) {
      ctx.save();
      ctx.strokeStyle = `rgba(${COLORS.closed}, ${0.55 + 0.4 * pulse})`;
      ctx.lineWidth = Math.max(2, cell * 0.07);
      ctx.beginPath();
      ctx.arc(goalCenter.x, goalCenter.y, cell * 0.55, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (state.walker?.active) {
      const walker = state.walker;
      const path = overlay.path;
      const last = path.length - 1;
      // Se detiene un poco antes de la meta para que la mascota siga visible.
      const visual = Math.min(walker.index, Math.max(0, last - 0.72));
      const idx = Math.max(0, Math.min(last, Math.floor(visual)));
      const nextIdx = Math.min(last, idx + 1);
      const frac = visual - idx;
      const a = this.cellCenter(path[idx][0], path[idx][1]);
      const b = this.cellCenter(path[nextIdx][0], path[nextIdx][1]);
      const wx = a.x + (b.x - a.x) * frac;
      const wy = a.y + (b.y - a.y) * frac;
      const dc = path[nextIdx][1] - path[idx][1];
      const moving = walker.index < last - 0.45;
      const bob = moving ? Math.abs(Math.sin(time * 0.014)) * cell * 0.09 : 0;
      drawRescuer(ctx, wx, wy, cell * 1.02, dc < 0, -bob);
    } else if (!state.blocked) {
      const startCenter = this.cellCenter(state.start[0], state.start[1]);
      const bob = Math.sin(time * 0.004) * cell * 0.03;
      drawRescuer(ctx, startCenter.x, startCenter.y, cell * 1.02, false, bob);
    }
  }

  drawSpecialTiles(state, time) {
    const { ctx } = this;
    const { cell } = this.geometry;
    const pulse = 0.5 + 0.5 * Math.sin(time * 0.004);

    const paint = (r, c, rgb, strength) => {
      const px = this.geometry.x + c * cell;
      const py = this.geometry.y + r * cell;
      ctx.save();
      ctx.fillStyle = `rgba(${rgb}, ${strength})`;
      ctx.fillRect(px, py, cell, cell);
      ctx.shadowColor = `rgba(${rgb}, 0.95)`;
      ctx.shadowBlur = cell * (0.4 + 0.35 * pulse);
      ctx.strokeStyle = `rgba(${rgb}, 0.95)`;
      ctx.lineWidth = Math.max(2, cell * 0.06);
      ctx.strokeRect(px + 2, py + 2, cell - 4, cell - 4);
      ctx.restore();
    };

    paint(state.start[0], state.start[1], COLORS.start, 0.3 + 0.1 * pulse);
    paint(state.goal[0], state.goal[1], COLORS.goal, 0.32 + 0.12 * pulse);
  }

  drawPath(overlay, time) {
    const { ctx } = this;
    const { cell } = this.geometry;
    const path = overlay.path;
    const reveal = Math.min(path.length, Math.ceil(overlay.pathReveal));
    const visible = path.slice(0, Math.max(2, reveal));
    if (visible.length < 2) return;

    const points = visible.map(([r, c]) => this.cellCenter(r, c));

    // Base translúcida por celda
    ctx.save();
    ctx.fillStyle = "rgba(52, 190, 96, 0.24)";
    for (let i = 0; i < visible.length; i++) {
      const p = points[i];
      ctx.fillRect(p.x - cell / 2 + 1, p.y - cell / 2 + 1, cell - 2, cell - 2);
    }
    ctx.restore();

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Halo exterior
    ctx.shadowColor = "rgba(90, 255, 130, 0.9)";
    ctx.shadowBlur = Math.max(12, cell * 0.8);
    ctx.strokeStyle = "rgba(38, 176, 84, 0.72)";
    ctx.lineWidth = Math.max(4, cell * 0.6);
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.stroke();

    // Capa media
    ctx.shadowBlur = Math.max(8, cell * 0.35);
    ctx.strokeStyle = "rgba(120, 245, 150, 0.9)";
    ctx.lineWidth = Math.max(3, cell * 0.3);
    ctx.stroke();

    // Núcleo luminoso
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(232, 255, 238, 0.95)";
    ctx.lineWidth = Math.max(1.5, cell * 0.09);
    ctx.stroke();
    ctx.restore();

    // Flechas de dirección
    ctx.save();
    ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
    for (let i = 0; i < points.length - 1; i += 2) {
      const a = points[i];
      const b = points[i + 1];
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      const angle = Math.atan2(b.y - a.y, b.x - a.x);
      const s = Math.max(2.5, cell * 0.12);
      ctx.save();
      ctx.translate(mx, my);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(s, 0);
      ctx.lineTo(-s * 0.75, -s * 0.8);
      ctx.lineTo(-s * 0.3, 0);
      ctx.lineTo(-s * 0.75, s * 0.8);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();

    // Destellos
    ctx.save();
    ctx.fillStyle = "rgba(236, 255, 240, 0.95)";
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const phase = (time * 0.003 + i * 0.7) % 3;
      const alpha = phase < 1.5 ? 1 - phase / 1.5 : 0;
      if (alpha <= 0.06) continue;
      const offsetX = Math.sin(i * 12.9898 + time * 0.002) * cell * 0.26;
      const offsetY = Math.cos(i * 78.233 + time * 0.002) * cell * 0.26;
      const s = Math.max(1.2, cell * 0.05);
      ctx.globalAlpha = alpha * 0.9;
      ctx.fillRect(p.x + offsetX, p.y + offsetY, s, s);
    }
    ctx.restore();
  }
}
