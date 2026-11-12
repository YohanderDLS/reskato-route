import { BoardRenderer } from "./render.js";
import { GestureController } from "./gestures.js";
import { SoundEffects } from "./audio.js";

/* ------------------------------------------------------------------ helpers */

const $ = (selector) => document.querySelector(selector);
const SPEEDS = [
  { name: "Muy lenta", trace: 150, path: 190, walk: 520 },
  { name: "Lenta", trace: 92, path: 120, walk: 360 },
  { name: "Media", trace: 52, path: 72, walk: 240 },
  { name: "Rápida", trace: 26, path: 38, walk: 150 },
  { name: "Muy rápida", trace: 12, path: 18, walk: 80 },
];
const BLOCKED_TRACE_MS = 9;
const keyOf = (r, c) => r * 1000 + c;

async function postJSON(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    let detail = response.statusText;
    try {
      const data = await response.json();
      if (typeof data.detail === "string") detail = data.detail;
      else if (data.detail) detail = JSON.stringify(data.detail);
    } catch (_) {
      /* ignore */
    }
    throw new Error(detail);
  }
  return response.json();
}

/* -------------------------------------------------------------------- state */

const state = {
  rows: 16,
  cols: 16,
  cells: [],
  terrain: [],
  start: [1, 1],
  goal: [1, 1],
  tool: "wall",
  diagonal: false,
  weighted: true,
  gestures: false,
  hover: null,
  blocked: false,
  overlay: {
    frontier: new Map(),
    closed: new Map(),
    path: [],
    pathReveal: 0,
    dim: 1,
  },
  walker: { active: false, index: 0 },
  run: null,
  speed: 2,
  painting: false,
  paintValue: 0,
};

const els = {
  stage: $("#stage"),
  board: $("#board"),
  statNodes: $("#statNodes"),
  statFrontier: $("#statFrontier"),
  statCost: $("#statCost"),
  statTime: $("#statTime"),
  statStatus: $("#statStatus"),
  alert: $("#alertBanner"),
  alertText: $("#alertText"),
  alertClose: $("#alertClose"),
  toast: $("#toast"),
  victory: $("#victory"),
  victoryText: $("#victoryText"),
  victoryBtn: $("#victoryBtn"),
  loading: $("#loading"),
  btnRun: $("#btnRun"),
  btnPause: $("#btnPause"),
  btnReset: $("#btnReset"),
  btnMaze: $("#btnMaze"),
  sizeRange: $("#sizeRange"),
  sizeOut: $("#sizeOut"),
  speedRange: $("#speedRange"),
  speedOut: $("#speedOut"),
  terrainCost: $("#terrainCost"),
  chkDiagonal: $("#chkDiagonal"),
  chkWeighted: $("#chkWeighted"),
  chkGestures: $("#chkGestures"),
  cam: $("#cam"),
  camOverlay: $("#camOverlay"),
  camStatus: $("#camStatus"),
  gestureCursor: $("#gestureCursor"),
  ring: $("#ringProgress"),
};

const renderer = new BoardRenderer(els.board, els.stage);
const sounds = new SoundEffects();

/* ------------------------------------------------------------------- status */

function setStatus(text, kind = "") {
  els.statStatus.textContent = text;
  els.statStatus.classList.toggle("busy", kind === "busy");
  els.statStatus.classList.toggle("ok", kind === "ok");
  els.statStatus.classList.toggle("bad", kind === "bad");
}

function updateStats() {
  const run = state.run;
  els.statNodes.textContent = String(state.overlay.closed.size);
  els.statFrontier.textContent = String(state.overlay.frontier.size);
  if (run?.result?.found) {
    els.statCost.textContent = String(run.result.cost);
    els.statTime.textContent = `${run.result.elapsed_ms.toFixed(1)} ms`;
  } else if (state.blocked) {
    els.statCost.textContent = "—";
    els.statTime.textContent = run?.result ? `${run.result.elapsed_ms.toFixed(1)} ms` : "—";
  } else {
    els.statCost.textContent = "—";
    els.statTime.textContent = "—";
  }
}

let toastTimer = 0;
function toast(message) {
  els.toast.textContent = message;
  els.toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    els.toast.hidden = true;
  }, 2600);
}

function showAlert(message) {
  if (message) els.alertText.textContent = message;
  els.alert.hidden = false;
}

function hideAlert() {
  els.alert.hidden = true;
}

function showVictory(run) {
  const result = run.result;
  els.victoryText.textContent = `Ruta de ${state.overlay.path.length} pasos · costo ${result.cost} · ${result.expanded} nodos explorados`;
  els.victory.hidden = false;
}

/* -------------------------------------------------------------------- board */

function clearRun() {
  state.run = null;
  state.overlay.frontier.clear();
  state.overlay.closed.clear();
  state.overlay.path = [];
  state.overlay.pathReveal = 0;
  state.overlay.dim = 1;
  state.walker = { active: false, index: 0 };
  state.blocked = false;
  sounds.stopExploring();
  hideAlert();
  els.victory.hidden = true;
  els.btnPause.disabled = true;
  els.btnPause.querySelector("span").textContent = "Pausar";
  updateStats();
  setStatus("LISTO");
}

function isProtected(r, c) {
  return (r === state.start[0] && c === state.start[1]) || (r === state.goal[0] && c === state.goal[1]);
}

function applyTool(r, c) {
  const inStart = r === state.start[0] && c === state.start[1];
  const inGoal = r === state.goal[0] && c === state.goal[1];

  if (state.tool === "wall") {
    if (inStart || inGoal) return false;
    if (state.cells[r][c] === 0) return false;
    state.cells[r][c] = 0;
    state.terrain[r][c] = "grass";
    return true;
  }
  if (state.tool === "erase") {
    if (state.cells[r][c] === 1 && state.terrain[r][c] === "grass") return false;
    state.cells[r][c] = 1;
    state.terrain[r][c] = "grass";
    return true;
  }
  if (state.tool === "water" || state.tool === "bush" || state.tool === "fence") {
    if (inStart || inGoal) return false;
    if (!els.terrainCost.checkValidity()) {
      state.painting = false;
      els.terrainCost.reportValidity();
      return false;
    }
    const cost = els.terrainCost.valueAsNumber;
    if (state.cells[r][c] === cost && state.terrain[r][c] === state.tool) return false;
    state.cells[r][c] = cost;
    state.terrain[r][c] = state.tool;
    return true;
  }
  if (state.tool === "goal") {
    if (inStart) return false;
    if (state.goal[0] === r && state.goal[1] === c) return false;
    if (state.cells[r][c] <= 0) {
      state.cells[r][c] = 1;
      state.terrain[r][c] = "grass";
    }
    state.goal = [r, c];
    return true;
  }
  if (state.tool === "start") {
    if (inGoal) return false;
    if (state.start[0] === r && state.start[1] === c) return false;
    if (state.cells[r][c] <= 0) {
      state.cells[r][c] = 1;
      state.terrain[r][c] = "grass";
    }
    state.start = [r, c];
    return true;
  }
  return false;
}

function registerEdit() {
  if (state.run) clearRun();
  hideAlert();
  state.blocked = false;
  els.victory.hidden = true;
}

function paintAt(r, c) {
  const changed = applyTool(r, c);
  if (!changed) return;
  registerEdit();
  if (state.tool === "goal" || state.tool === "start") {
    // Mover un punto no debe seguir pintando al arrastrar.
    state.painting = false;
  }
}

els.board.addEventListener("pointerdown", (event) => {
  if (event.button !== undefined && event.button !== 0) return;
  const cell = renderer.cellAt(event.clientX, event.clientY);
  if (!cell) return;
  event.preventDefault();
  state.painting = true;
  paintAt(cell.r, cell.c);
  els.board.setPointerCapture?.(event.pointerId);
});

els.board.addEventListener("pointermove", (event) => {
  const cell = renderer.cellAt(event.clientX, event.clientY);
  state.hover = cell;
  if (state.painting && cell) paintAt(cell.r, cell.c);
});

els.board.addEventListener("pointerup", () => {
  state.painting = false;
});

els.board.addEventListener("pointerleave", () => {
  state.painting = false;
  state.hover = null;
});

els.board.addEventListener("pointercancel", () => {
  state.painting = false;
});

els.board.addEventListener("contextmenu", (event) => event.preventDefault());

/* ------------------------------------------------------------------ actions */

function pauseResume() {
  if (!state.run) return;
  state.run.paused = !state.run.paused;
  els.btnPause.querySelector("span").textContent = state.run.paused ? "Reanudar" : "Pausar";
  if (state.run.paused) {
    sounds.stopExploring();
    setStatus("PAUSADO");
    return;
  }
  const labels = {
    exploring: ["EXPLORANDO", "busy"],
    pathing: ["TRAZANDO RUTA", "busy"],
    walking: ["RESCATE EN CURSO", "busy"],
    done: ["COMPLETADO", "ok"],
    blocked: ["SIN RUTA", "bad"],
  };
  const [text, kind] = labels[state.run.status] || ["EN CURSO", "busy"];
  setStatus(text, kind);
  if (state.run.status === "exploring") sounds.startExploring();
}

async function execute() {
  if (state.overlay.path.length) clearRun();
  clearRun();
  setStatus("CALCULANDO", "busy");
  try {
    const result = await postJSON("/api/solve", {
      cells: state.cells,
      start: state.start,
      goal: state.goal,
      diagonal: state.diagonal,
      weighted: state.weighted,
    });

    state.overlay.path = result.path.map(([r, c]) => [r, c]);
    state.overlay.pathReveal = 0;
    state.run = {
      status: "exploring",
      trace: result.trace,
      index: 0,
      acc: 0,
      paused: false,
      result,
      blocked: !result.found,
    };
    els.btnPause.disabled = false;
    els.btnPause.querySelector("span").textContent = "Pausar";
    setStatus("EXPLORANDO", "busy");
    sounds.startExploring();
    updateStats();
  } catch (error) {
    setStatus("ERROR", "bad");
    toast(`Error al ejecutar: ${error.message}`);
  }
}

async function newMaze(rows = state.rows, cols = state.cols) {
  els.loading.hidden = false;
  try {
    const board = await postJSON("/api/maze", { rows, cols });
    state.rows = board.rows;
    state.cols = board.cols;
    state.cells = board.cells;
    state.terrain =
      board.terrain ||
      board.cells.map((row, r) =>
        row.map((cost, c) =>
          cost > 1 ? ["water", "bush", "fence"][(r * 31 + c * 17) % 3] : "grass",
        ),
      );
    state.start = board.start;
    state.goal = board.goal;
    state.hover = null;
    clearRun();
    els.sizeRange.value = String(state.rows);
    els.sizeOut.textContent = `${state.rows} × ${state.cols}`;
    setStatus("LISTO");
  } catch (error) {
    toast(`No se pudo generar el mapa: ${error.message}`);
  } finally {
    els.loading.hidden = true;
  }
}

/* ------------------------------------------------------------------ animation */

function applyTraceEvent(node) {
  const k = keyOf(node.r, node.c);
  if (node.t === "open") {
    if (!state.overlay.closed.has(k)) {
      state.overlay.frontier.set(k, node);
    }
  } else if (node.t === "close") {
    state.overlay.frontier.delete(k);
    state.overlay.closed.set(k, node);
  }
}

function finishRun() {
  const run = state.run;
  if (!run) return;
  if (!run.result.found) {
    state.blocked = true;
    setStatus("SIN RUTA", "bad");
    showAlert("La mascota está encerrada: no existe ningún camino posible. Abre un nuevo pasillo tocando un muro para que el algoritmo pueda recalcular.");
    updateStats();
    return;
  }
  setStatus("COMPLETADO", "ok");
  showVictory(run);
  updateStats();
}

function tick(dt) {
  const run = state.run;
  if (!run || run.paused) return;

  if (run.status === "exploring") {
    const speed = SPEEDS[state.speed];
    const step = run.blocked ? Math.min(speed.trace, BLOCKED_TRACE_MS) : speed.trace;
    run.acc += dt;
    let guard = 0;
    while (run.acc >= step && run.index < run.trace.length && guard++ < 500) {
      run.acc -= step;
      applyTraceEvent(run.trace[run.index++]);
    }
    updateStats();
    if (run.index >= run.trace.length) {
      sounds.stopExploring();
      if (run.blocked) {
        run.status = "blocked";
        finishRun();
      } else {
        run.status = "pathing";
        run.acc = 0;
        state.overlay.dim = 0.9;
      }
    }
    return;
  }

  if (run.status === "pathing") {
    const speed = SPEEDS[state.speed];
    run.acc += dt;
    let guard = 0;
    while (run.acc >= speed.path && state.overlay.pathReveal < state.overlay.path.length && guard++ < 400) {
      run.acc -= speed.path;
      state.overlay.pathReveal += 1;
    }
    if (state.overlay.pathReveal >= state.overlay.path.length && state.overlay.path.length > 0) {
      state.overlay.pathReveal = state.overlay.path.length;
      run.status = "walking";
      state.walker = { active: true, index: 0 };
      setStatus("RESCATE EN CURSO", "busy");
      sounds.pathFound();
    }
    return;
  }

  if (run.status === "walking") {
    const speed = SPEEDS[state.speed];
    const previousTile = Math.floor(state.walker.index);
    state.walker.index += dt / speed.walk;
    if (Math.floor(state.walker.index) > previousTile) sounds.step();
    const last = state.overlay.path.length - 1;
    if (state.walker.index >= last) {
      state.walker.index = last;
      run.status = "done";
      setStatus("COMPLETADO", "ok");
      sounds.victory();
      showVictory(run);
      updateStats();
    }
  }
}

let lastFrame = performance.now();
function frame(now) {
  const dt = Math.min(120, Math.max(0, now - lastFrame));
  lastFrame = now;
  tick(dt);
  renderer.draw(state, now);
  requestAnimationFrame(frame);
}

/* ---------------------------------------------------------------------- UI */

document.querySelectorAll(".tool").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".tool").forEach((b) => b.classList.remove("active"));
    button.classList.add("active");
    state.tool = button.dataset.mode;
  });
});

document.addEventListener("pointerdown", () => sounds.unlock(), { once: true });
document.addEventListener("keydown", () => sounds.unlock(), { once: true });
document.addEventListener("pointerover", (event) => {
  const button = event.target.closest("button");
  if (button && !button.contains(event.relatedTarget)) sounds.hover();
});
document.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (button && !button.disabled) sounds.click();
});

function setTool(mode) {
  state.tool = mode;
  document.querySelectorAll(".tool").forEach((b) => b.classList.toggle("active", b.dataset.mode === mode));
}

els.btnRun.addEventListener("click", execute);
els.btnReset.addEventListener("click", () => clearRun());
els.btnPause.addEventListener("click", pauseResume);
els.btnMaze.addEventListener("click", () => newMaze(state.rows, state.cols));
els.alertClose.addEventListener("click", hideAlert);
els.victoryBtn.addEventListener("click", () => {
  els.victory.hidden = true;
});

els.sizeRange.addEventListener("input", () => {
  els.sizeOut.textContent = `${els.sizeRange.value} × ${els.sizeRange.value}`;
});
els.sizeRange.addEventListener("change", () => {
  newMaze(Number(els.sizeRange.value), Number(els.sizeRange.value));
});

els.speedRange.addEventListener("input", () => {
  state.speed = Number(els.speedRange.value);
  els.speedOut.textContent = SPEEDS[state.speed].name;
});

els.chkDiagonal.addEventListener("change", () => {
  state.diagonal = els.chkDiagonal.checked;
  if (state.run) clearRun();
});

els.chkWeighted.addEventListener("change", () => {
  state.weighted = els.chkWeighted.checked;
  if (state.run) clearRun();
});

els.chkGestures.addEventListener("change", async () => {
  if (els.chkGestures.checked) {
    try {
      await gestures.enable();
      state.gestures = true;
      els.gestureCursor.hidden = false;
    } catch (_) {
      els.chkGestures.checked = false;
      state.gestures = false;
    }
  } else {
    gestures.disable();
    state.gestures = false;
  }
});

window.addEventListener("keydown", (event) => {
  if (event.target instanceof HTMLInputElement) return;
  switch (event.key.toLowerCase()) {
    case " ":
      event.preventDefault();
      if (state.run && state.run.status !== "done") pauseResume();
      else execute();
      break;
    case "r":
      clearRun();
      break;
    case "m":
      newMaze(state.rows, state.cols);
      break;
    case "1":
      setTool("wall");
      break;
    case "2":
      setTool("erase");
      break;
    case "3":
      setTool("goal");
      break;
    case "4":
      setTool("start");
      break;
    case "g":
      els.chkGestures.checked = !els.chkGestures.checked;
      els.chkGestures.dispatchEvent(new Event("change"));
      break;
    default:
      break;
  }
});

/* ------------------------------------------------------------------ gestures */

const gestures = new GestureController({
  video: els.cam,
  overlay: els.camOverlay,
  cursor: els.gestureCursor,
  ring: els.ring,
  onStatus: (text, kind) => {
    els.camStatus.textContent = text;
    els.camStatus.classList.toggle("good", kind === "good");
    els.camStatus.classList.toggle("bad", kind === "bad");
  },
  onPointer: (info) => {
    if (!info) {
      els.gestureCursor.hidden = true;
      return;
    }
    els.gestureCursor.hidden = false;
  },
});

/* ------------------------------------------------------------------- startup */

async function boot() {
  els.speedOut.textContent = SPEEDS[state.speed].name;
  els.sizeOut.textContent = `${state.rows} × ${state.cols}`;
  try {
    await document.fonts.load('8px "Press Start 2P"');
    await document.fonts.load('16px "VT323"');
  } catch (_) {
    /* las fuentes son opcionales */
  }
  await newMaze(state.rows, state.cols);
  requestAnimationFrame(frame);
}

boot();

// Expuesto para depuración desde la consola del navegador.
window.__reskato = { state, execute, newMaze, clearRun, renderer, gestures };
