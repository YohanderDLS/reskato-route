# Reskato Route — Manual de uso

Guía práctica para operar el simulador, incluida la parte de gestos con cámara.

---

## 1. Requisitos

| Elemento | Mínimo |
|---|---|
| Sistema | Windows 10/11 |
| Navegador | Chrome, Edge o Brave actualizado |
| Cámara | Webcam integrada o USB (con buena iluminación) |
| RAM | 4 GB |
| Disco | ~400 MB (Python + modelo de manos) |
| Internet | Solo para la primera instalación; luego funciona offline |

> El navegador debe abrir `http://127.0.0.1:8000` (no el archivo `index.html`
> directamente): la cámara solo se habilita en contextos seguros como `localhost`.

---

## 2. Iniciar el sistema

1. Abre la carpeta `reskato-route`.
2. Haz doble clic en **`run.bat`**.
3. Se abrirá una ventana negra (servidor) y el navegador en `http://127.0.0.1:8000/`.
4. Para detener todo, cierra la ventana negra.

Si aparece un error de entorno:

```bat
setup.bat
run.bat
```

---

## 3. La interfaz

### Tablero (izquierda)

- **Rescatista** (arriba a la izquierda): origen de la búsqueda.
- **Mascota** (abajo a la derecha): meta, sobre un cojín rojo.
- **Muros**: bloques de piedra oscuros.
- **Escombros**: bloques rojizos con un número (`3` o `5`) = costo extra.
- **HUD superior**: nodos expandidos, tamaño de la frontera, costo de la ruta y
  tiempo de cálculo del algoritmo.
- **Leyenda inferior**: amarillo = frontera, rojo = descartado, verde = ruta óptima.

### Panel (derecha)

| Sección | Qué hace |
|---|---|
| **Controles** | Añadir muro, Borrar muro, Mover meta, Mover inicio |
| **Acciones** | Ejecutar, Pausar/Reanudar, Reiniciar |
| **Cámara** | Vista de la webcam con el esqueleto de la mano detectada |
| **Ajustes** | Mapa aleatorio, tamaño (10–25), velocidad, diagonales, costos, gestos |

---

## 4. Editar el laberinto

### Herramienta Añadir
1. Pulsa **Añadir** (o tecla `1`).
2. Haz clic o **arrastra** sobre celdas libres: se convierten en muro.
3. No se puede poner un muro sobre el rescatista ni sobre la mascota.

### Herramienta Borrar
1. Pulsa **Borrar** (o tecla `2`).
2. Clic o arrastra sobre muros o escombros: vuelven a pasto.

### Mover meta / inicio
1. Pulsa **Mover meta** (`3`) o **Mover inicio** (`4`).
2. Haz clic en la celda destino. Si era un muro, se abre automáticamente.
3. La mascota o el rescatista se reubican y el estado se reinicia.

> Si editas mientras hay una animación en curso, la animación se detiene y se
> limpia para evitar resultados inconsistentes.

---

## 5. Generar un mapa

- **Mapa aleatorio**: crea un laberinto nuevo del tamaño actual.
- **Tablero**: desliza entre **10×10** y **25×25**. Al soltar el control
  se genera un mapa nuevo con ese tamaño.
- Cada mapa incluye ramas, callejones y escombros con costo.

---

## 6. Ejecutar y leer el resultado

1. Pulsa **Ejecutar** (o `Espacio`).
2. Observa las fases:
   - **Amarillo**: celdas descubiertas, candidatas a explorar.
   - **Rojo**: celdas expandidas y descartadas. El número es `g`, el costo
     acumulado desde el inicio.
   - **Verde**: ruta óptima consolidada, con flechas y destellos.
3. El rescatista recorre la ruta y se detiene junto a la mascota.
4. Aparece el resumen: pasos, costo total y nodos explorados.

### Pausar / Reanudar
- **Pausar** congela la animación sin perder el progreso.
- **Reanudar** continúa desde el mismo punto.

### Reiniciar
- Borra las capas de exploración y devuelve a los personajes a su posición inicial.
  El laberinto **no** cambia.

### Velocidad
Cinco niveles, de **Muy lenta** a **Muy rápida**. La velocidad afecta por igual a la
exploración, al trazado de la ruta y al caminado del rescatista.

---

## 7. Control por gestos

### 7.1 Activar

1. En **Ajustes**, activa el interruptor **Gestos** (o tecla `G`).
2. El navegador pedirá permiso de cámara → pulsa **Permitir**.
3. En la sección **Cámara** verás tu imagen en espejo con el esqueleto de la mano y
   la insignia **LIVE**.
4. Espera a que el estado diga “Mano abierta = puntero · Puño = clic”.

### 7.2 Cómo usar la mano

| Gesto | Efecto |
|---|---|
| 🖐️ **Mano abierta** | Mueve el puntero por la pantalla; resalta botones y celdas |
| ✊ **Puño cerrado** | Clic: el anillo se llena 0,24 s y se ejecuta la acción |
| 🚫 **Sin mano** | El puntero se oculta; el sistema sigue funcionando con ratón |

### 7.3 Recomendaciones para que funcione bien

- **Iluminación frontal**: la luz debe venir de frente, no de una ventana a tu espalda.
- **Distancia**: mano a 50–70 cm de la cámara.
- **Fondo**: pared lisa y contrastada es mejor que un fondo con movimiento.
- **Mano completa dentro del cuadro**, con la palma hacia la cámara.
- **Movimientos pausados**: el puntero se suaviza para evitar temblor.
- Para hacer clic, cierra el puño **y mantenlo** hasta que el anillo se complete.

### 7.4 Qué se puede hacer con gestos

- Pulsar cualquier botón del panel (Ejecutar, Mapa aleatorio, Añadir, etc.).
- Mover los deslizadores (arrastrando con el puño).
- Pintar muros y borrar celdas sobre el tablero.
- Activar o desactivar interruptores.

> El ratón sigue funcionando siempre, incluso con los gestos activados.

---

## 8. Atajos de teclado

| Tecla | Acción |
|---|---|
| `Espacio` | Ejecutar / Pausar / Reanudar |
| `R` | Reiniciar animación |
| `M` | Mapa aleatorio |
| `1` | Herramienta Añadir |
| `2` | Herramienta Borrar |
| `3` | Mover meta |
| `4` | Mover inicio |
| `G` | Activar/desactivar gestos |

---

## 9. Situaciones especiales

### Bloqueo total

Si encierras a la mascota con muros:

- Aparece una **alerta roja**: “Bloqueo total detectado”.
- El estado pasa a **SIN RUTA** y la ejecución se detiene.
- La meta queda rodeada por un anillo rojo pulsante.
- **Solución:** borra un muro para abrir un pasillo. La alerta desaparece y puedes
  volver a ejecutar.

### Sin ruta por escombros
Los escombros son transitables. Si el único camino pasa por escombros caros, A\*
lo usará igual, pero el costo total será mayor: es una buena forma de mostrar la
diferencia entre “camino corto” y “camino barato”.

### Cambiar de modo de movimiento
- **Diagonales** activado: el rescatista puede moverse en 8 direcciones (costo √2
  por diagonal). Cambia la heurística a octil.
- **Costos** desactivado: los escombros cuestan 1 y el resultado es la ruta más
  corta en pasos.

---

## 10. Solución de problemas

| Problema | Causa probable | Solución |
|---|---|---|
| El navegador no abre | `run.bat` cerró por error | Ejecuta `setup.bat` y revisa la ventana negra |
| “No se pudo iniciar la cámara” | Otra app usa la webcam | Cierra Teams/Zoom/Cámara de Windows y reintenta |
| “Permiso de cámara denegado” | Bloqueaste el permiso | Clic en el candado de la barra de direcciones → Permitir cámara |
| La mano no se detecta | Poca luz o fondo complejo | Ilumina de frente, acerca la mano y muévela despacio |
| El puntero tiembla | Ruido de detección | Mantén la mano más estable y a mayor distancia |
| El clic no se dispara | El puño se abre antes de 0,24 s | Mantén el puño hasta que el anillo se complete |
| “No se pudo cargar el modelo de manos” | Archivos de `static/vendor/mediapipe` faltantes | Reinstala con `setup.bat` o restaura esa carpeta |
| El puerto 8000 está ocupado | Otro servidor | Cierra la otra aplicación o cambia el puerto en `app/main.py` |
| Se ve lento en 25×25 | GPU integrada | Usa un tamaño menor o un navegador con aceleración activada |

---

## 11. Checklist para la demo

- [ ] `run.bat` abre el navegador correctamente.
- [ ] Permiso de cámara concedido **antes** de la exposición.
- [ ] Luz frontal y fondo despejado.
- [ ] Tamaño 16×16 para empezar (se ve bien y es rápido).
- [ ] Velocidad **Media**.
- [ ] Probar una vez el gesto de puño.
- [ ] Tener preparado el plan B: desactivar gestos y usar ratón.
