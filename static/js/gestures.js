/* Control por gestos con MediaPipe HandLandmarker.
   - Mano abierta  -> puntero flotante (hover)
   - Puño cerrado  -> clic (con anillo de progreso y anti-rebote)
   Todo corre localmente en el navegador; el video no sale de la máquina. */

const CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
];

const HOLD_MS = 240;
const COOLDOWN_MS = 650;
const RING_LENGTH = 150.8;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export class GestureController {
  constructor({ video, overlay, cursor, ring, onStatus, onPointer, onClick }) {
    this.video = video;
    this.overlay = overlay;
    this.overlayCtx = overlay.getContext("2d");
    this.cursor = cursor;
    this.ring = ring;
    this.onStatus = onStatus || (() => {});
    this.onPointer = onPointer || (() => {});
    this.onClick = onClick || (() => {});

    this.enabled = false;
    this.landmarker = null;
    this.stream = null;
    this.raf = 0;
    this.lastVideoTime = -1;

    this.fistActive = false;
    this.fistStart = 0;
    this.lastClick = 0;
    this.frames = [];
    this.smooth = null;
    this.lastMoveDispatch = 0;
    this.hasHand = false;
  }

  async enable() {
    if (this.enabled) return;
    this.onStatus("Solicitando permiso de cámara…", "info");
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: false,
      });
    } catch (error) {
      this.onStatus(this.describeCameraError(error), "bad");
      throw error;
    }

    this.video.srcObject = this.stream;
    this.video.play().catch(() => {});
    await this.waitForVideo(2500);
    this.overlay.width = 320;
    this.overlay.height = 240;

    this.onStatus("Cargando modelo de manos…", "info");
    try {
      if (!this.landmarker) {
        const vision = await import("../vendor/mediapipe/vision_bundle.mjs");
        const fileset = await vision.FilesetResolver.forVisionTasks("/static/vendor/mediapipe/wasm");
        const options = {
          baseOptions: {
            modelAssetPath: "/static/vendor/mediapipe/hand_landmarker.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numHands: 1,
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        };
        try {
          this.landmarker = await vision.HandLandmarker.createFromOptions(fileset, options);
        } catch (gpuError) {
          options.baseOptions.delegate = "CPU";
          this.landmarker = await vision.HandLandmarker.createFromOptions(fileset, options);
        }
      }
    } catch (error) {
      console.error(error);
      this.disable();
      this.onStatus("No se pudo cargar el modelo de manos. Revisa la conexión o los archivos locales.", "bad");
      return;
    }

    this.enabled = true;
    this.onStatus("Mano abierta = puntero · Puño = clic", "good");
    this.loop();
  }

  async waitForVideo(timeout) {
    const start = performance.now();
    while (performance.now() - start < timeout) {
      if (this.video.videoWidth > 0 && this.video.readyState >= 2) return true;
      await new Promise((resolve) => setTimeout(resolve, 80));
    }
    return false;
  }

  disable() {
    this.enabled = false;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    if (this.stream) {
      for (const track of this.stream.getTracks()) track.stop();
      this.stream = null;
    }
    this.video.srcObject = null;
    this.cursor.hidden = true;
    this.fistActive = false;
    this.hasHand = false;
    this.smooth = null;
    this.frames = [];
    this.overlayCtx.clearRect(0, 0, this.overlay.width, this.overlay.height);
    this.onStatus("Cámara desactivada.");
    this.onPointer(null);
    this.updateBadge(false);
  }

  updateBadge(on) {
    const badge = document.getElementById("camBadge");
    const placeholder = document.getElementById("camPlaceholder");
    if (badge) {
      badge.textContent = on ? "LIVE" : "OFF";
      badge.classList.toggle("on", on);
    }
    if (placeholder) placeholder.hidden = on;
  }

  describeCameraError(error) {
    switch (error?.name) {
      case "NotAllowedError":
        return "Permiso de cámara denegado. Haz clic en el candado del navegador y permite la cámara.";
      case "NotFoundError":
        return "No se encontró ninguna cámara conectada.";
      case "NotReadableError":
        return "La cámara está siendo usada por otra aplicación (Teams, Zoom, etc.).";
      default:
        return "No se pudo iniciar la cámara. Usa el ratón mientras tanto.";
    }
  }

  loop = () => {
    if (!this.enabled) return;
    this.raf = requestAnimationFrame(this.loop);
    const video = this.video;
    if (!video.videoWidth || video.readyState < 2) return;

    let result;
    try {
      result = this.landmarker.detectForVideo(video, performance.now());
    } catch (error) {
      return;
    }
    const hand = result?.landmarks?.[0];
    this.drawOverlay(hand);
    this.processHand(hand);
  };

  processHand(hand) {
    if (!hand) {
      this.hasHand = false;
      this.cursor.hidden = true;
      this.fistActive = false;
      this.frames = [];
      this.onPointer(null);
      this.updateBadge(true);
      return;
    }

    this.hasHand = true;
    this.updateBadge(true);

    // ---- clasificación de dedos -------------------------------------------------
    const wrist = hand[0];
    const palm = {
      x: (hand[0].x + hand[5].x + hand[9].x + hand[13].x + hand[17].x) / 5,
      y: (hand[0].y + hand[5].y + hand[9].y + hand[13].y + hand[17].y) / 5,
    };
    const palmSize = Math.max(0.001, dist(hand[0], hand[9]));
    const tips = [8, 12, 16, 20];
    const pips = [6, 10, 14, 18];
    let extended = 0;
    for (let i = 0; i < tips.length; i++) {
      const tipDist = dist(hand[tips[i]], wrist);
      const pipDist = dist(hand[pips[i]], wrist);
      if (tipDist > pipDist * 1.15) extended++;
    }
    const spread = tips.reduce((acc, tip) => acc + dist(hand[tip], palm), 0) / tips.length / palmSize;

    // Filtro de mayoría sobre 4 cuadros para evitar parpadeos.
    this.frames.push(extended);
    if (this.frames.length > 4) this.frames.shift();
    const votes = this.frames.filter((v) => v === extended).length;
    const stableExtended = votes >= 3 ? extended : Math.max(...this.frames);

    let state;
    if (stableExtended >= 3) state = "open";
    else if (stableExtended <= 1 && spread < 2.35) state = "fist";
    else state = this.lastState || "open";
    this.lastState = state;

    // ---- posición del puntero ---------------------------------------------------
    const source = state === "fist" ? palm : hand[8];
    const nx = clamp((1 - source.x - 0.16) / 0.68, 0, 1);
    const ny = clamp((source.y - 0.12) / 0.72, 0, 1);
    const rawX = nx * window.innerWidth;
    const rawY = ny * window.innerHeight;
    if (!this.smooth) this.smooth = { x: rawX, y: rawY };
    const alpha = 0.38;
    this.smooth.x += (rawX - this.smooth.x) * alpha;
    this.smooth.y += (rawY - this.smooth.y) * alpha;
    const x = this.smooth.x;
    const y = this.smooth.y;

    this.cursor.hidden = false;
    this.cursor.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    this.cursor.classList.toggle("fist", state === "fist");

    // ---- clic por puño ----------------------------------------------------------
    const now = performance.now();
    if (state === "fist") {
      if (!this.fistActive) {
        this.fistActive = true;
        this.fistStart = now;
      }
      const held = now - this.fistStart;
      const progress = clamp(held / HOLD_MS, 0, 1);
      this.ring.style.strokeDashoffset = String(RING_LENGTH * (1 - progress));
      if (held >= HOLD_MS && now - this.lastClick > COOLDOWN_MS) {
        this.lastClick = now;
        this.ring.style.strokeDashoffset = "0";
        this.performClick(x, y);
      }
    } else {
      if (this.fistActive) {
        this.fistActive = false;
        this.ring.style.strokeDashoffset = String(RING_LENGTH);
      }
    }

    // ---- hover ------------------------------------------------------------------
    if (now - this.lastMoveDispatch > 45) {
      this.lastMoveDispatch = now;
      const target = document.elementFromPoint(x, y);
      if (target && target !== document.documentElement) {
        this.cursor.classList.toggle("hover", Boolean(target.closest("button, .pixel-btn, canvas")));
        target.dispatchEvent(
          new PointerEvent("pointermove", {
            bubbles: true,
            clientX: x,
            clientY: y,
            pointerType: "mouse",
            pointerId: 99,
            isPrimary: true,
          })
        );
      }
    }

    this.onPointer({ x, y, state, progress: clamp((now - this.fistStart) / HOLD_MS, 0, 1) });
  }

  performClick(x, y) {
    const target = document.elementFromPoint(x, y);
    if (!target) return;
    const base = {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
      pointerId: 99,
      isPrimary: true,
      pointerType: "mouse",
      button: 0,
    };
    target.dispatchEvent(new PointerEvent("pointerdown", { ...base, buttons: 1 }));
    target.dispatchEvent(new PointerEvent("pointerup", { ...base, buttons: 0 }));
    target.dispatchEvent(new MouseEvent("click", base));
    this.onClick({ x, y, target });
  }

  drawOverlay(hand) {
    const ctx = this.overlayCtx;
    const w = this.overlay.width;
    const h = this.overlay.height;
    ctx.clearRect(0, 0, w, h);
    if (!hand) return;

    const color = this.lastState === "fist" ? "#ff7a7f" : "#8ef0a0";
    ctx.lineWidth = 3;
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 6;
    for (const [a, b] of CONNECTIONS) {
      ctx.beginPath();
      ctx.moveTo(hand[a].x * w, hand[a].y * h);
      ctx.lineTo(hand[b].x * w, hand[b].y * h);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#f4e2c0";
    for (const point of hand) {
      ctx.beginPath();
      ctx.arc(point.x * w, point.y * h, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
    // Punta del índice resaltada
    const tip = hand[8];
    ctx.fillStyle = "#ffe08a";
    ctx.beginPath();
    ctx.arc(tip.x * w, tip.y * h, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}
