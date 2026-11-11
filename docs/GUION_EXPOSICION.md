# Reskato Route — Guion de exposición

Duración objetivo: **7–8 minutos** (ajustable a 5 recortando la demo 3).
Incluye texto sugerido, acciones en pantalla y preguntas probables del profesor.

---

## Antes de empezar (checklist de 2 minutos)

- [ ] `run.bat` abierto y página cargada.
- [ ] Permiso de cámara ya concedido y gesto de puño probado.
- [ ] **Mapa aleatorio** generado, tamaño **16×16**, velocidad **Media**.
- [ ] Zoom del navegador al **100 %** y ventana maximizada.
- [ ] Modo ratón listo como plan B (tecla `G` desactiva gestos).

---

## 0:00 – 0:40 · Apertura y problema

> “El proyecto se llama **Reskato Route** y resuelve un problema clásico de
> optimización de redes: encontrar la ruta de **menor costo** entre dos puntos de un
> laberinto. Lo planteamos como un escenario de rescate: un rescatista debe llegar
> hasta una mascota atrapada, y el sistema no solo encuentra el camino, sino que
> **muestra cómo lo piensa**.”

**En pantalla:** tablero con el rescatista y la mascota.

> “El requisito de la cátedra era un sistema web con control por gestos, así que la
> interacción es con la cámara: **mano abierta mueve el puntero y puño cerrado hace
> clic**.”

---

## 0:40 – 2:00 · Modelado como grafo

> “Primero, ¿cómo representamos el laberinto? Lo modelamos como un **grafo
> no dirigido y ponderado**.
>
> - Cada **celda** es un **nodo** del grafo.
> - Cada **movimiento válido** entre celdas vecinas es una **arista**.
> - El **peso** de la arista es el costo de entrar a la celda.
>
> La matriz del tablero guarda ese costo en un solo número: `0` significa muro
> impenetrable, `1` pasto, y `3` o `5` escombros transitables pero caros.
>
> Trabajamos con un **grafo implícito**: no lo guardamos en memoria, lo generamos
> bajo demanda. En el peor caso, 25 por 25 son 625 nodos y 2500 aristas, así que
> construirlo explícitamente sería un desperdicio.”

**En pantalla:** señalar celdas y el panel, sin ejecutar todavía.

> “El sistema permite **4 vecinos** por defecto o **8 con diagonales**, y en ese caso
> bloqueamos el paso en diagonal entre dos muros para no atravesar paredes.”

---

## 2:00 – 3:30 · A\* y heurística

> “Para resolverlo usamos **A\***, que evalúa cada nodo con
> **f(n) = g(n) + h(n)**:
>
> - **g** es el costo real acumulado desde el origen;
> - **h** es una estimación del costo que falta hasta la meta;
> - **f** es la prioridad: siempre expandimos el nodo con menor f.
>
> La heurística es la **distancia Manhattan**, que en una cuadrícula es la suma de
> las diferencias de fila y columna. Es **admisible**: nunca sobreestima el costo
> real, porque cada movimiento cuesta como mínimo 1. Y es **consistente**, así que
> ningún nodo necesita reabrirse.
>
> Eso garantiza dos propiedades: A\* es **completo** —si hay camino, lo encuentra— y
> es **óptimo** —cuando saca la meta de la cola, el costo es el mínimo posible.
>
> La complejidad es **O(V log V)** con cola de prioridad, donde V es el número de
> celdas.”

**Comparación que conviene mencionar:**

> “Frente a **Dijkstra**, que explora en todas las direcciones, A\* usa la heurística
> para dirigirse hacia la meta y expande entre un 30 y un 60 % menos de nodos.
> Frente a **Greedy**, que es más rápido pero no garantiza el óptimo.”

---

## 3:30 – 5:30 · Demo principal

**Acción:** clic en **Ejecutar** (o `Espacio`).

> “Al ejecutar, el tablero muestra las tres fases de la búsqueda en tiempo real:
>
> - las celdas **amarillas** son la **frontera**: nodos descubiertos que todavía
>   pueden explorarse;
> - las **rojas** son los nodos ya expandidos y **descartados**; el número que
>   aparece es **g**, el costo acumulado desde el inicio;
> - cuando el algoritmo llega a la meta, reconstruye el camino y se consolida en
>   **verde**.”

**Acción:** cuando aparezca la ruta verde, señalar el recorrido.

> “Y el rescatista recorre la ruta paso a paso hasta la mascota. El resumen muestra
> el número de pasos, el costo total y cuántos nodos se exploraron.”

**Acción:** señalar el HUD y el panel.

> “Los contadores de nodos, frontera, costo y tiempo vienen del cálculo real en
> Python, no son decorativos.”

---

## 5:30 – 6:30 · Casos que demuestran el modelo

### A) Costos: no siempre gana el camino más corto

**Acción:** activar/desactivar **Costos** y volver a ejecutar.

> “Los escombros cuestan 3 o 5. Con costos activados, A\* puede elegir un camino con
> **más pasos pero menos costo**. Si desactivo costos, todos valen 1 y el resultado
> pasa a ser la ruta más corta en pasos. Es la diferencia entre **camino mínimo** y
> **costo mínimo**.”

### B) Bloqueo total

**Acción:** con **Añadir**, encerrar la mascota con muros; pulsar **Ejecutar**.

> “Si encierro a la mascota, el sistema no se queda colgado ni inventa una ruta:
> detecta el **bloqueo total** mediante un recorrido BFS de conectividad, detiene la
> ejecución y muestra una alerta. Abro un pasillo y el algoritmo puede recalcular.
>
> Esto es una propiedad **topológica** del grafo: la meta no está en la componente
> conexa del origen.”

**Acción:** borrar un muro, mostrar que la alerta desaparece.

### C) Escalabilidad
**Acción:** mover el deslizador a **25×25** y ejecutar.

> “El tablero escala de 10×10 a 25×25 y el algoritmo sigue respondiendo en
> milisegundos.”

---

## 6:30 – 7:00 · Gestos y cierre

**Acción:** activar **Cámara / Gestos**, mover la mano y pulsar un botón con el puño.

> “El control por gestos usa **MediaPipe HandLandmarker**, que detecta 21 puntos de
> la mano directamente en el navegador. Clasificamos la mano como **abierta** o
> **puño** comparando la extensión de los dedos, suavizamos la posición con un filtro
> exponencial y exigimos que el puño se mantenga 240 milisegundos para evitar clics
> accidentales. Todo el video se procesa localmente: no se envía nada a ningún
> servidor.”

**Cierre:**

> “En resumen: modelamos el laberinto como un grafo ponderado, resolvimos la ruta
> óptima con A\* en Python, visualizamos el proceso completo y agregamos interacción
> por visión por computador. El sistema es escalable, funciona sin internet y maneja
> explícitamente el caso crítico de bloqueo total.”

---

## Preguntas probables y respuestas cortas

**1. ¿Por qué A\* y no Dijkstra?**
Porque A\* incorpora una heurística que dirige la búsqueda hacia la meta. Con una
heurística admisible sigue siendo óptimo, pero expande menos nodos.

**2. ¿Qué pasa si la heurística sobreestima?**
Deja de ser admisible y A\* puede devolver una ruta que no es óptima. Por eso usamos
Manhattan y garantizamos que el costo mínimo por paso sea 1.

**3. ¿Cuál es la complejidad?**
`O(V log V)` en tiempo con montículo binario y `O(V)` en memoria, con `V = R·C`.

**4. ¿Cómo detectan que no hay ruta?**
Con un BFS de conectividad desde el origen. Si la meta no está en el conjunto
alcanzable, es un bloqueo total. A\* también devuelve “no encontrado”, pero el BFS lo
verifica explícitamente.

**5. ¿Por qué el algoritmo está en Python y los gestos en el navegador?**
Porque el algoritmo es el objeto de estudio y debe estar en Python, mientras que el
acceso a la cámara y el render en tiempo real son más estables y rápidos en el
navegador. La comunicación es por HTTP/JSON local.

**6. ¿Cómo diferencian mano abierta de puño?**
Comparamos la distancia de cada punta de dedo a la muñeca contra la de su falange.
Si hay tres o más dedos extendidos es mano abierta; si hay uno o ninguno y la mano
está compacta, es puño. Aplicamos un filtro de mayoría de 4 cuadros.

**7. ¿Cómo evitan los clics accidentales?**
El puño debe mantenerse 240 ms, hay 650 ms de anti-rebote y un filtro de suavizado
en la posición.

**8. ¿Funciona sin internet?**
Sí. Python, el modelo de MediaPipe, los binarios WASM y las fuentes están
descargados localmente. Internet solo se usa en la primera instalación.

**9. ¿Qué representa el número en las celdas rojas?**
El costo acumulado `g` desde el origen. En los escombros, el número es su costo de
terreno (3 o 5).

**10. ¿Se puede mover la meta?**
Sí, con la herramienta **Mover meta**; el sistema recalcula sobre el nuevo destino.

---

## Plan B si falla la cámara

1. Desactiva **Cámara / Gestos** (tecla `G`).
2. Continúa la demo con ratón y teclado: **las funcionalidades son las mismas**.
3. Menciona que el video se procesa localmente y que el permiso depende del navegador.

> La rúbrica evalúa el sistema; el gesto es un canal de entrada, no el algoritmo.
