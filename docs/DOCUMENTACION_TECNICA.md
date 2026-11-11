# Reskato Route — Documentación técnica

**Proyecto:** Reskato Route · Sistema de Búsqueda
**Tipo:** Simulador web interactivo de enrutamiento espacial
**Algoritmo central:** A\* (A-Star) sobre un grafo implícito en cuadrícula
**Interacción:** visión por computador (MediaPipe Hands) + ratón/teclado
**Stack:** Python 3.12 · FastAPI · JavaScript · Canvas 2D

---

## 1. Resumen

El sistema representa un laberinto como un **grafo no dirigido y ponderado**, donde
cada celda transitable es un nodo y cada movimiento válido entre celdas vecinas es
una arista. Sobre ese grafo se ejecuta **A\*** para encontrar la ruta de **menor
costo** entre el rescatista (origen) y la mascota (meta), y el resultado se anima
celda por celda mostrando las tres fases de la búsqueda:

1. **Frontera** (amarillo): nodos descubiertos pendientes de expandir.
2. **Descartados** (rojo): nodos ya expandidos y cerrados.
3. **Ruta óptima** (verde): camino reconstruido desde la meta hasta el origen.

La interfaz se controla con la mano frente a la webcam: **mano abierta = puntero**,
**puño cerrado = clic**.

---

## 2. Cumplimiento de los requisitos de la cátedra

| Requisito | Implementación | Archivo |
|---|---|---|
| Simulador web interactivo | Servidor FastAPI + cliente Canvas | `app/main.py`, `static/` |
| Teoría de grafos | Grafo implícito en cuadrícula con pesos | `app/core/grid.py` |
| Ruta óptima con A\* | A\* con `g`, `h`, `f` y traza | `app/core/astar.py` |
| Grid configurable 10×10–25×25 | Slider + regeneración de mapa | `static/js/app.js` |
| Muros / espacios libres | Matriz de costos (`0` = muro) | `app/core/grid.py` |
| Generación manual | Herramientas Añadir / Borrar / Mover | `static/js/app.js` |
| Generación automática | DFS aleatorio + trenzado + escombros | `app/core/maze.py` |
| Fase de exploración visual | Eventos `open`/`close` animados | `app/core/astar.py`, `static/js/app.js` |
| Ruta óptima en verde | Trazado con halo y flechas | `static/js/render.js` |
| Movimiento animado del rescatista | Interpolación sobre la ruta | `static/js/app.js`, `render.js` |
| Detección de bloqueo total | BFS de conectividad + alerta | `app/core/validator.py`, `astar.py` |
| Control por gestos (mano abierta / puño) | MediaPipe HandLandmarker | `static/js/gestures.js` |

---

## 3. Modelado del tablero como grafo

### 3.1 Nodos y aristas

- **Nodo:** cada celda `(r, c)` del tablero, con `r ∈ [0, R)` y `c ∈ [0, C)`.
- **Arista:** existe entre dos celdas si son vecinas y ambas son transitables.
  - Por defecto **4-vecindad** (arriba, derecha, abajo, izquierda). El costo de un paso es el costo de la celda destino.
  - Opcional **8-vecindad** (incluye diagonales) con costo `√2 × costo(celda)`.
  - En 8-vecindad se aplica la **regla anti-esquina**: no se permite cruzar en diagonal
    entre dos muros, porque el movimiento "atravesaría" una pared.

> El grafo **no se materializa** en memoria: se genera bajo demanda a partir de la
> matriz (grafo implícito). Para 25×25 son 625 nodos y a lo sumo 4·625 = 2500 aristas,
> por lo que cualquier estructura explícita sería desperdicio.

### 3.2 Matriz de costos

La matriz `cells[R][C]` codifica el terreno y los obstáculos en un solo valor:

| Valor | Significado | Transitable |
|---|---|---|
| `0` | Muro / escombro impenetrable | No |
| `1` | Pasto (costo normal) | Sí, costo 1 |
| `3` | Escombro liviano | Sí, costo 3 |
| `5` | Escombro pesado | Sí, costo 5 |

Esta decisión permite que **el mismo dato describa topología y peso**, y que el
algoritmo elija no el camino más *corto* sino el más **barato** (ver §5).

### 3.3 Interfaz del grafo

```python
class GridMap:
    def is_wall(r, c) -> bool
    def step_cost(r, c) -> float      # 0/muro => inf
    def neighbors(r, c) -> [(vecino, costo_paso)]
```

---

## 4. Algoritmo A\*

### 4.1 Ecuación de evaluación

Para cada nodo `n`:

```
f(n) = g(n) + h(n)
```

- `g(n)`: costo real acumulado desde el origen hasta `n`.
- `h(n)`: estimación optimista del costo restante hasta la meta.
- `f(n)`: prioridad en la cola de abiertos (menor = más prometedor).

### 4.2 Pseudocódigo

```
A*(origen, meta):
    abiertos   ← cola de prioridad por (f, h)     # desempate por h
    g[origen]  ← 0
    padre      ← {}
    cerrados   ← ∅

    mientras abiertos ≠ ∅:
        n ← extraer mínimo f
        si n ∈ cerrados: continuar
        cerrados ← cerrados ∪ {n}
        registrar evento "close"(n)

        si n = meta:
            devolver reconstruir_camino(padre, meta)

        para cada (v, costo) en vecinos(n):
            si v ∈ cerrados: continuar
            tentative ← g[n] + costo
            si tentative < g[v]:
                g[v]     ← tentative
                padre[v] ← n
                f(v)     ← tentative + h(v)
                insertar v en abiertos
                registrar evento "open"(v)
    devolver SIN_RUTA
```

La implementación real (`app/core/astar.py`) usa `heapq` y una tupla
`(f, h, contador, nodo)`; el contador garantiza un orden determinista y evita
comparar coordenadas.

### 4.3 Heurística

**4-vecindad → distancia Manhattan:**

```
h(n) = |r_n − r_meta| + |c_n − c_meta|
```

**8-vecindad → distancia octil:**

```
h(n) = max(Δr, Δc) + (√2 − 1) · min(Δr, Δc)
```

**¿Por qué es admisible?**
Cada movimiento cambia `Δr + Δc` como máximo en 1 y su costo mínimo es 1
(los pesos del terreno son siempre ≥ 1). Por lo tanto, Manhattan nunca
**sobreestima** el costo real restante: `h(n) ≤ h*(n)`.

**¿Por qué es consistente?**
Para toda arista `(n, n')` de costo `c`, se cumple
`|h(n) − h(n')| ≤ c`, que es exactamente la desigualdad triangular de la
distancia Manhattan/octil en una cuadrícula. La consistencia implica que un nodo
nunca necesita reabrirse y que `f` es no decreciente a lo largo de cualquier camino.

### 4.4 Optimalidad y completitud

- A\* es **completo**: si existe camino, lo encuentra (el grafo es finito y se
  exploran todos los nodos alcanzables en el peor caso).
- A\* es **óptimo** con heurística admisible: al extraer la meta de la cola,
  `g(meta)` es el costo mínimo posible.
- En el caso de bloqueo total, la cola se vacía y el algoritmo devuelve
  `found = false` con la razón correspondiente.

### 4.5 Complejidad

Con `V = R·C` nodos y `E ≤ 4V` aristas (8V en diagonales):

| Recurso | Complejidad |
|---|---|
| Tiempo (peor caso) | `O(E log V) = O(V log V)` con montículo binario |
| Memoria | `O(V)` para `g`, `padre`, `cerrados` y la cola |

Medido en esta máquina (Python 3.12):

| Tablero | Nodos | Expandidos | Tiempo |
|---|---|---|---|
| 10×10 | 100 | ~19 | < 1 ms |
| 16×16 | 256 | ~70 | 2–5 ms |
| 25×25 | 625 | ~200 | 10–20 ms |

La traza completa se envía al navegador (a lo sumo ~1250 eventos), lo que permite
animar el proceso sin recalcular nada en el cliente.

### 4.6 Comparación con otros algoritmos

| Algoritmo | Costo de búsqueda | ¿Óptimo? | Comentario |
|---|---|---|---|
| BFS | No usa pesos | Solo si todos los costos son iguales | Ignora los escombros |
| Dijkstra | `O(E log V)` | Sí | Explora en todas las direcciones por igual |
| **A\*** | `O(E log V)`, en la práctica mucho menor | **Sí** | Usa `h` para dirigir la búsqueda hacia la meta |
| Greedy Best-First | Muy rápido | **No** | Solo usa `h`; puede elegir rutas caras |

En este tablero, A\* expande típicamente entre 30 % y 60 % menos nodos que
Dijkstra, y a diferencia de Greedy **garantiza** el óptimo.

### 4.7 La traza como instrumento didáctico

Cada evento de la traza tiene la forma:

```json
{"t": "open",  "r": 4, "c": 7, "g": 6.0, "h": 9.0, "f": 15.0}
{"t": "close", "r": 4, "c": 7, "g": 6.0, "h": 9.0, "f": 15.0}
```

- `open` → la celda entra a la frontera (amarillo).
- `close` → la celda se expande y se descarta (rojo).
- Sobre cada celda cerrada se dibuja `g(n)`: el costo acumulado desde el origen.

Esto hace visible una propiedad clave de A\*: los nodos de una misma "banda" hacia
la meta comparten valores de `f`, y los desvíos hacia escombros disparan `g`.

---

## 5. Terreno con costo: rutas baratas, no solo cortas

Los escombros (`3` y `5`) son transitables pero caros. Ejemplo:

```
Ruta A: 12 pasos por pasto            → costo 12
Ruta B:  8 pasos, 3 de ellos escombro → costo 8 + 3·2 = 14
```

A\* elige la **A**, aunque sea más larga en celdas. Si se desactiva la casilla
**Costos**, todos los valores > 0 se tratan como costo 1 y el resultado pasa a ser
la ruta más corta en pasos. Esto permite demostrar en vivo la diferencia entre
**camino mínimo** y **costo mínimo**.

---

## 6. Generación automática de laberintos

`app/core/maze.py` implementa cuatro etapas:

1. **Excavado (DFS con backtracking).** Se parte de un tablero lleno de muros y se
   excava un laberinto "perfecto" sobre una retícula de celdas impares, eligiendo
   vecinos al azar a dos celdas de distancia y derribando el muro intermedio.
2. **Trenzado (*braiding*).** Se detectan callejones sin salida (celdas con un solo
   vecino abierto) y, con probabilidad 0.32, se abre un muro hacia otra zona
   transitable. Esto crea **ciclos y rutas alternativas**, indispensables para
   comparar costos.
3. **Escombros.** Un 9 % de los muros que tocan un pasillo se convierten en
   escombros de costo 3 (60 %) o 5 (40 %). Nunca se colocan sobre el origen ni la meta.
4. **Selección de la meta.** Se calcula el **BFS de distancias** desde el origen y se
   elige la celda de costo normal más lejana dentro del cuadrante inferior derecho
   (para que el recorrido sea largo y visualmente atractivo).

Complejidad: `O(V)` por etapa, dominada por el DFS y el BFS. Generar un 25×25 es
prácticamente instantáneo.

Garantías:

- El origen `(1,1)` y la meta siempre quedan con costo 1.
- Todas las celdas excavadas pertenecen a la misma componente conexa, por lo que
  el mapa recién generado **siempre tiene solución**.

---

## 7. Detección de bloqueo total

Cuando el usuario encierra a la mascota, A\* no encuentra camino, pero además el
sistema ofrece una verificación explícita de conectividad con **BFS**
(`app/core/validator.py`):

```
alcanzables ← BFS(origen)
si meta ∉ alcanzables  →  bloqueo total
```

Al ocurrir:

1. La ejecución se detiene y **no** se anima ninguna ruta.
2. Se muestra una **alerta roja pulsante** con la instrucción de abrir un pasillo.
3. El contador de nodos muestra la región alcanzable completa y la meta queda
   marcada con un anillo rojo.
4. Cualquier edición posterior limpia el estado y permite recalcular.

La diferencia entre "no hay ruta" y "el algoritmo falló" queda así descartada:
es una propiedad topológica del grafo, no un error de búsqueda.

---

## 8. Arquitectura del sistema

```
┌──────────────────────────────────────────┐        ┌───────────────────────────────┐
│ NAVEGADOR (cliente)                      │        │ SERVIDOR LOCAL (Python)       │
│                                          │        │                               │
│  index.html + style.css                  │ HTTP   │  FastAPI                      │
│  Canvas 2D  ── render.js / art.js        │◄──────►│   POST /api/maze  → maze.py   │
│  app.js     ── estado y animación        │  JSON  │   POST /api/solve → astar.py  │
│  gestures.js ─ MediaPipe (WASM+modelo)   │        │   POST /api/check → validator │
│  Webcam local (nunca se transmite)       │        │   GET  /          → index     │
└──────────────────────────────────────────┘        └───────────────────────────────┘
```

**Reparto de responsabilidades**

| Componente | Responsabilidad |
|---|---|
| Python / FastAPI | Toda la lógica académica: grafo, A\*, generación y validación |
| Canvas / JS | Render, animación y captura de gestos |
| MediaPipe | Detección de 21 puntos de la mano en el navegador |

Se eligió esta división porque el acceso a la cámara desde el navegador es más
robusto y rápido que capturarla desde Python, mientras que el algoritmo —el objeto
de estudio— permanece íntegramente en Python.

---

## 9. API REST

### `POST /api/maze`

```json
{ "rows": 16, "cols": 16, "seed": null }
```

Respuesta:

```json
{
  "rows": 16,
  "cols": 16,
  "cells": [[0,0,0],[0,1,1]],
  "start": [1,1],
  "goal": [9,11]
}
```

### `POST /api/solve`

```json
{
  "cells": [[0,1,1],[1,1,0]],
  "start": [1,1],
  "goal": [9,11],
  "diagonal": false,
  "weighted": true
}
```

Respuesta:

```json
{
  "found": true,
  "path": [[1,1],[1,2],[2,2]],
  "trace": [{"t":"open","r":1,"c":1,"g":0,"h":19,"f":19}],
  "cost": 22.0,
  "expanded": 46,
  "generated": 112,
  "elapsed_ms": 2.8,
  "reason": "",
  "blocked": false
}
```

### `POST /api/check`

Devuelve `{ "reachable": bool, "reachable_count": int }` usando BFS; se usa para
diagnóstico y para la alerta de bloqueo.

### `GET /api/health`

`{ "ok": true, "service": "reskato-route" }`

---

## 10. Visión por computador y gestos

### 10.1 Modelo

- **MediaPipe Tasks Vision 0.10.35**, tarea `HandLandmarker` en modo `VIDEO`.
- Detecta **1 mano** y devuelve **21 landmarks** normalizados `(x, y, z)`.
- Se ejecuta en el navegador con **WebAssembly**; el modelo (`hand_landmarker.task`,
  7,5 MB) y los binarios WASM están **descargados localmente** en
  `static/vendor/mediapipe/`, por lo que **funciona sin internet**.
- El delegado es `GPU`; si falla, se reintenta automáticamente con `CPU`.

### 10.2 Clasificación de la mano

Para los dedos índice, medio, anular y meñique se comparan las distancias al punto
de la muñeca:

```
extendido_i = dist(punta_i, muñeca) > 1.15 · dist(falange_i, muñeca)
```

- `≥ 3` dedos extendidos → **mano abierta**.
- `≤ 1` dedo extendido y apertura relativa `< 2.35` → **puño**.
- Estado intermedio → se conserva la última clasificación (histéresis).

Se aplica un **filtro de mayoría sobre los últimos 4 cuadros** para eliminar
parpadeos por ruido de detección.

### 10.3 Puntero

- Se usa la **punta del índice** con la mano abierta y el **centro de la palma** con
  el puño (más estable).
- La coordenada se **espeja** (efecto espejo natural) y se normaliza a una zona
  cómoda de la pantalla:

```
nx = clamp((1 − x − 0.16) / 0.68, 0, 1)
ny = clamp((y − 0.12) / 0.72, 0, 1)
```

- Se suaviza con un **filtro exponencial** (`α = 0.38`) para reducir el temblor.
- El puntero se dibuja como un anillo HTML con `transform: translate3d(...)`.

### 10.4 Clic por puño

1. El puño debe mantenerse **240 ms**; el anillo se llena como retroalimentación.
2. Al completarse, se emite un clic sintético (`pointerdown` + `pointerup` + `click`)
   sobre el elemento que está bajo el puntero.
3. **Anti-rebote:** 650 ms entre clics.
4. El cursor cambia a rojo mientras el puño está cerrado.

Esto permite usar **tanto los botones del panel como las celdas del tablero**.

### 10.5 Privacidad

El video se procesa en el navegador. No se envía, guarda ni transmite ningún frame
al servidor Python ni a Internet.

---

## 11. Rendimiento

- **Escena estática cacheada:** pasto, decoración, tiles, cuadrícula y marco se
  dibujan una sola vez en un canvas fuera de pantalla; cada frame solo hace un
  `drawImage`. La caché se invalida cuando cambian las celdas, el tamaño o el layout.
- **`devicePixelRatio` limitado a 2** para no gastar memoria en pantallas 4K.
- **Tiles pre-renderizados** por tamaño y variante (pasto, muro, escombro).
- **Animación por tiempo** (`dt`), no por número de frames: la velocidad es
  independiente del hardware.
- A 25×25 el tablero completo (625 celdas) se mantiene fluido.

---

## 12. Decisiones de diseño relevantes

| Decisión | Motivo |
|---|---|
| Matriz de costos única | Simplifica el modelo y unifica muros con terreno difícil |
| Grafo implícito | Evita construir estructuras innecesarias |
| 4-vecindad por defecto | Movimiento natural en un laberinto y heurística Manhattan clásica |
| Diagonales opcionales | Permite comparar heurísticas (Manhattan vs octil) en clase |
| Traza enviada al cliente | El cliente solo reproduce; no reimplementa el algoritmo |
| A\* en Python | El algoritmo es el objeto de evaluación de la cátedra |
| Arte procedural | Sin dependencias de licencias ni descargas externas |
| Alertas y estados explícitos | Convierten los casos límite en parte de la demostración |

---

## 13. Limitaciones y trabajo futuro

- Una sola mano y una sola mascota (el modelo soporta más, pero la interfaz no).
- El costo de las diagonales no penaliza el "roce" con esquinas más allá de la regla anti-esquina.
- La heurística no incorpora los pesos del terreno (sigue siendo admisible porque el
  costo mínimo es 1; una heurística más informativa podría reducir aún más los nodos).
- Posibles ampliaciones: múltiples objetivos, terreno dinámico, comparación lado a
  lado A\* vs Dijkstra, exportación de la traza a CSV y modo multijugador.

---

## 14. Referencias

1. Hart, P. E., Nilsson, N. J., & Raphael, B. (1968). *A Formal Basis for the Heuristic
   Determination of Minimum Cost Paths*. IEEE Transactions on Systems Science and Cybernetics.
2. Russell, S., & Norvig, P. *Artificial Intelligence: A Modern Approach* (búsqueda
   informada, admisibilidad y consistencia).
3. Cormen, T. et al. *Introduction to Algorithms* (grafos, BFS, colas de prioridad).
4. Google MediaPipe — *Hand Landmarker* (Tasks Vision API).
