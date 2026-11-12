# Contexto para continuar el proyecto en un chat nuevo

Documento de traspaso. Contiene solo lo necesario para retomar el trabajo sin
arrastrar conversación. Última actualización: 10/11/2026.

---

## 1. Qué es el proyecto

**Reskato Route** es un simulador web académico de rescate en un laberinto:

- Un rescatista debe llegar a una mascota atrapada.
- El tablero se modela como un **grafo ponderado** y la ruta óptima se calcula con **A\***.
- La búsqueda se anima en el navegador: **amarillo** = frontera, **rojo** = descartado, **verde** = ruta óptima.
- La interacción principal es por **gestos con la cámara**: mano abierta = puntero, puño = clic.
- Estética **pixel-art** dibujada por código (sin assets de terceros).
- Toda la lógica académica está en **Python**; el navegador solo renderiza y captura gestos.

Requisitos de cátedra que ya se cumplen: sistema web, teoría de grafos, A\*,
grid 10×10–25×25, edición manual, generación automática, fases de exploración,
ruta óptima, movimiento animado, detección de bloqueo total y control por gestos.

---

## 2. Carpeta y ejecución

**Carpeta del proyecto:**

```
C:\Users\Yohander Dls\Documents\reskato-route
```

**Ejecutar:**

```bat
run.bat
```

Abre el navegador en `http://127.0.0.1:8000/` (el servidor queda en una ventana negra;
se detiene al cerrarla).

**Ejecución manual:**

```bat
.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

**Si se borró el entorno virtual:**

```bat
setup.bat
run.bat
```

`setup.bat` descarga `uv`, instala Python 3.12 y las dependencias **sin permisos de
administrador**. La cámara solo funciona en `localhost` (contexto seguro).

---

## 3. Stack y entorno

| Elemento | Detalle |
|---|---|
| Python | 3.12.16 en `.venv` local |
| Backend | FastAPI 0.162.2 · Uvicorn 0.54.0 · Pydantic 2.14.3 |
| Instalador | `uv` en `%USERPROFILE%\.local\bin\uv.exe` |
| Frontend | HTML5 + CSS3 + JavaScript ES modules + Canvas 2D |
| Visión | MediaPipe Tasks Vision 0.10.35 (HandLandmarker), **local** |
| Fuentes | Press Start 2P y VT323, locales |
| Navegador probado | Brave (también sirve Chrome/Edge) |

Sin CDN ni servicios externos: funciona **offline** una vez instalado.

---

## 4. Mapa de archivos

```
reskato-route/
├─ app/
│  ├─ main.py                 FastAPI: endpoints y servido de estáticos
│  └─ core/
│     ├─ grid.py              Matriz de costos y vecinos (grafo implícito)
│     ├─ astar.py             A* con traza de eventos open/close
│     ├─ maze.py              Generador DFS + trenzado + terrenos con costo + meta lejana
│     └─ validator.py         BFS de conectividad (bloqueo total)
├─ static/
│  ├─ index.html              Estructura del tablero y del panel
│  ├─ css/style.css           Estilo pixel-art y layout del panel
│  ├─ js/
│  │  ├─ app.js               Estado, animación, eventos, atajos; expone window.__reskato
│  │  ├─ render.js            Render del tablero (escena estática cacheada)
│  │  ├─ art.js               Sprites y tiles procedurales (rescatista, gato, pasto, muro)
│  │  └─ gestures.js          MediaPipe: mano abierta / puño, puntero y clic
│  ├─ vendor/mediapipe/       Modelo .task + WASM + vision_bundle.mjs (local)
│  └─ assets/fonts/           Fuentes pixel locales
├─ docs/
│  ├─ DOCUMENTACION_TECNICA.md   Grafos, A*, heurística, complejidad, API, visión
│  ├─ MANUAL_DE_USO.md           Uso paso a paso y solución de problemas
│  ├─ GUION_EXPOSICION.md        Guion de 7 min + preguntas del profesor
│  └─ CONTEXTO_NUEVO_CHAT.md     Este documento
├─ run.bat                    Lanzador (servidor + navegador)
├─ setup.bat                  Instalador sin admin
├─ requirements.txt
└─ README.md
```

---

## 5. Funcionalidad ya implementada

- [x] Tablero de 10×10 a 25×25 (slider).
- [x] Generación aleatoria de laberintos con ramas, ciclos y terrenos con costo.
- [x] Edición manual: **Añadir**, **Borrar**, **Mover meta**, **Mover inicio** (clic y arrastre).
- [x] A\* en Python con traza (`open`/`close`, `g`, `h`, `f`).
- [x] Animación de exploración y ruta óptima con halo, flechas y destellos.
- [x] Rescatista animado recorriendo la ruta hasta la mascota.
- [x] Pausa / reanudar / reiniciar.
- [x] Velocidad en 5 niveles.
- [x] Modo diagonales (8-vecindad + regla anti-esquina).
- [x] Interruptor de costos (demuestra “camino corto” vs “camino barato”).
- [x] Detección de bloqueo total con alerta roja y anillo en la meta.
- [x] Control por gestos con MediaPipe; también ratón/teclado.
- [x] HUD con nodos, frontera, costo y tiempo reales.
- [x] Panel derecho compacto: **todo cabe sin scroll** en pantallas normales.

---

## 6. Última corrección importante (layout)

El usuario reportó que el panel derecho obligaba a desplazarse, lo que hacía
imposible usarlo con gestos. Se reorganizó **solo el panel**:

- Marca en una sola línea.
- Herramientas en 2×2 con icono a la izquierda y texto a la derecha.
- Acciones en una fila.
- Cámara en 4:3 con altura adaptable.
- Sliders **Tablero** y **Velocidad** lado a lado.
- Interruptores **Diagonales / Costos / Gestos** en una fila.
- Leyenda de colores solo en pantallas altas (`min-height: 880px`).
- Pie con tip, anclado abajo.
- Media queries: `max-height: 762px`, `max-height: 680px`, `max-width: 1180px`, `max-width: 900px`.

Verificado con **0 px de desborde** en:
`1024×768`, `1093×614`, `1280×720`, `1280×800`, `1280×1024`, `1366×620`,
`1366×658`, `1366×768`, `1440×700`, `1440×900`, `1536×730`, `1600×900`, `1920×1040`.

Si se vuelve a tocar el panel: comprobar `panel.scrollHeight === panel.clientHeight`.

---

## 7. API

`POST /api/maze`

```json
{ "rows": 16, "cols": 16, "seed": null }
```

`POST /api/solve`

```json
{ "cells": [[0,1]], "start": [1,1], "goal": [9,11], "diagonal": false, "weighted": true }
```

Devuelve `found`, `path`, `trace`, `cost`, `expanded`, `generated`, `elapsed_ms`, `reason`, `blocked`.

`POST /api/check`

```json
{ "cells": [[0,1]], "start": [1,1], "goal": [9,11], "diagonal": false }
```

Devuelve `{ "reachable": bool, "reachable_count": int }`.

`GET /api/health` → `{ "ok": true, "service": "reskato-route" }`

---

## 8. Cómo verificar rápido

```powershell
# 1. Servidor arriba
Invoke-RestMethod http://127.0.0.1:8000/api/health

# 2. A* directo en Python
.\.venv\Scripts\python.exe -c "from app.core.maze import generate; from app.core.astar import search; b=generate(16,16,seed=1); r=search(b.cells,b.start,b.goal); print(r.found, len(r.path), r.cost)"
```

Suite end-to-end (Puppeteer + Brave) en:

```
C:\Users\Yohander Dls\AppData\Local\Temp\opencode\rtest\test.js
```

> Esa carpeta está en `Temp` y puede desaparecer. Si no existe, recrear el script.
> Requiere el servidor corriendo. Brave está en
> `C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe`.
> La cámara simulada tarda ~37 s en cargar el modelo la primera vez.

---

## 9. Detalles delicados / trampas conocidas

- **Puerto 8000 ocupado**: si queda un servidor anterior, `run.bat` falla. Cerrar la ventana negra o matar el proceso del puerto.
- **Caché del navegador**: tras cambiar CSS/JS, recargar con `Ctrl + F5`.
- **Cámara**: es una webcam VGA 640×480. Los umbrales de gestos **no se han probado con la cámara real del usuario**, solo con dispositivo falso. Archivo a ajustar: `static/js/gestures.js` (`HOLD_MS = 240`, `COOLDOWN_MS = 650`, ratio `1.15`, `spread < 2.35`, suavizado `alpha = 0.38`).
- **MediaPipe**: modelo y WASM son locales. Si faltan archivos, falla el arranque de gestos. Carga en frío ~37 s.
- **IDs y `window.__reskato`**: no renombrarlos; `app.js` y las pruebas dependen de ellos.
- **Arquitectura**: el algoritmo debe seguir en Python. No mover A\* a JavaScript.
- **Celdas**: `0` muro, `1` pasto, `2`–`99` costo de charcos, arbustos o vallas transitables.
- **HUD**: “Nodos” = celdas cerradas; el número en celdas rojas es `g`; los terrenos muestran su costo.
- **`[hidden] { display: none !important; }`** es necesario para que alertas y victoria no aparezcan al cargar.
- **Screenshots headless**: con `--virtual-time-budget` el canvas puede salir vacío. Usar Puppeteer esperando `#statStatus === "LISTO"` y luego capturar.
- **PyPowerShell**: usar `npm.cmd`, no `npm.ps1`. No dejar `function` en lugar de `def` en Python.

---

## 10. Pendiente

1. **Lista de correcciones del usuario**: aún no entregada. Es lo primero que hay que pedir/escuchar.
2. **Afinar gestos con la cámara real** (sensibilidad, estabilidad, clic).
3. **Opcional**: generar diapositivas `.pptx` a partir de `docs/GUION_EXPOSICION.md`.
4. **Opcional**: pulir detalles visuales que el usuario note al usar la app.

---

## 11. Reglas para el nuevo agente

- Responder en **español**, tono directo y sin rodeos.
- Mantener la estética pixel-art, las fuentes locales y el funcionamiento offline.
- Hacer cambios quirúrgicos y consistentes con el código existente.
- Antes de tocar layout, verificar que el panel siga sin scroll.
- Si se cambia la UI o el flujo, actualizar `docs/MANUAL_DE_USO.md`.
- Probar con el servidor corriendo; si se puede, con Puppeteer.
- No reescribir la arquitectura ni eliminar `static/vendor/mediapipe`.
- No inventar funciones que no existen; si algo no está claro, preguntar.

---

## 12. Primer mensaje sugerido para el chat nuevo

> Estoy retomando **Reskato Route**, un simulador web de rescate con A\* y control
> por gestos. El proyecto está en
> `C:\Users\Yohander Dls\Documents\reskato-route`.
>
> Lee `docs/CONTEXTO_NUEVO_CHAT.md` y, si necesitas detalle académico,
> `docs/DOCUMENTACION_TECNICA.md`. El servidor se levanta con `run.bat`
> (`http://127.0.0.1:8000/`).
>
> Hoy quiero aplicar estas correcciones: **[escribe aquí tu lista]**.
>
> Antes de tocar código, confirma que entendiste el estado actual y propón un plan
> corto. No cambies la arquitectura ni el algoritmo en Python sin avisar.
