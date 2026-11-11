# Reskato Route · Sistema de Búsqueda

Simulador web interactivo de **enrutamiento espacial** sobre una cuadrícula, basado en
**Teoría de Grafos** y en el algoritmo de búsqueda de rutas óptimas **A\*** (A-Star).
Un rescatista debe llegar hasta una mascota atrapada en un laberinto, y el sistema
muestra en tiempo real cómo el algoritmo "piensa" hasta encontrar el camino más barato.

La interacción principal es **por gestos con la cámara web**:

- 🖐️ **Mano abierta** → puntero flotante (hover).
- ✊ **Puño cerrado** → clic (con anillo de progreso y anti-rebote).

> También incluye **modo ratón/teclado** como respaldo para probar sin cámara.

---

## Inicio rápido

```bat
run.bat
```

Eso abre el navegador en `http://127.0.0.1:8000/`.

Si es la primera vez en otra PC (o se borró la carpeta `.venv`):

```bat
setup.bat
run.bat
```

`setup.bat` descarga `uv`, instala Python 3.12 y las dependencias **sin pedir
permisos de administrador** (todo queda dentro de la carpeta del proyecto y del perfil
del usuario).

### Ejecución manual

```bat
.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

---

## Cómo se usa

1. **Mapa aleatorio** genera un laberinto con ramas, callejones y escombros.
2. **Añadir / Borrar** permite editar muros arrastrando el puntero sobre el tablero.
3. **Mover meta / Mover inicio** reubican a la mascota y al rescatista.
4. El deslizador **Tamaño** va de **10×10** a **25×25**.
5. **Ejecutar** corre A\*: las celdas en **amarillo** son la frontera de búsqueda,
   las **rojas** son las descartadas y la **verde** es la ruta óptima.
6. El rescatista recorre la ruta hasta la mascota.
7. Si encierras a la mascota, aparece la **alerta de bloqueo total**.

### Atajos

| Tecla | Acción |
|---|---|
| `Espacio` | Ejecutar / Pausar / Reanudar |
| `R` | Reiniciar animación |
| `M` | Nuevo mapa aleatorio |
| `1` … `4` | Añadir / Borrar / Mover meta / Mover inicio |
| `G` | Activar o desactivar gestos |

---

## Estructura

```
reskato-route/
├─ app/
│  ├─ main.py              Servidor FastAPI y endpoints REST
│  └─ core/
│     ├─ grid.py           El tablero como grafo implícito
│     ├─ astar.py          A* con traza de exploración
│     ├─ maze.py           Generador de laberintos
│     └─ validator.py      Conectividad y detección de bloqueo (BFS)
├─ static/
│  ├─ index.html           Interfaz
│  ├─ css/style.css        Estilo pixel-art (panel de madera)
│  ├─ js/
│  │  ├─ app.js            Estado, animación y eventos
│  │  ├─ render.js         Renderizado del tablero
│  │  ├─ art.js            Sprites y tiles dibujados por código
│  │  └─ gestures.js       MediaPipe: mano abierta / puño
│  ├─ vendor/mediapipe/    Modelo y WASM locales (funciona sin internet)
│  └─ assets/fonts/        Fuentes pixel locales
├─ docs/
│  ├─ DOCUMENTACION_TECNICA.md
│  ├─ MANUAL_DE_USO.md
│  └─ GUION_EXPOSICION.md
├─ run.bat                 Lanzador
├─ setup.bat               Instalador
└─ requirements.txt
```

---

## Tecnologías

| Capa | Tecnología |
|---|---|
| Lógica y API | Python 3.12 · FastAPI · Uvicorn |
| Interfaz | HTML5 · CSS3 · JavaScript (módulos ES) · Canvas 2D |
| Visión por computador | MediaPipe Tasks Vision `0.10.35` · HandLandmarker |
| Arte | Sprites y tiles procedurales (sin assets de terceros) |

Todo corre **localmente**: el video de la cámara nunca sale de tu máquina.

---

## Documentación

- [`docs/DOCUMENTACION_TECNICA.md`](docs/DOCUMENTACION_TECNICA.md) — grafos, A\*, heurística, complejidad, API, visión.
- [`docs/MANUAL_DE_USO.md`](docs/MANUAL_DE_USO.md) — uso paso a paso y solución de problemas.
- [`docs/GUION_EXPOSICION.md`](docs/GUION_EXPOSICION.md) — guion de defensa y preguntas probables.

---

## Licencia y créditos

Proyecto académico. Código y arte originales del proyecto.
MediaPipe es software de Google bajo licencia Apache 2.0.
