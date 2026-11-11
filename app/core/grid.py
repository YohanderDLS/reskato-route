"""Modelo de la cuadricula como grafo implicito.

Cada celda es un nodo del grafo. Dos celdas son vecinas si comparten un lado
(4-vecindad) o, opcionalmente, una esquina (8-vecindad). El valor de cada celda
representa su costo de transito:

    0  -> muro / escombro impenetrable
    1  -> pasto (costo normal)
    3  -> escombro liviano (costo 3)
    5  -> escombro pesado (costo 5)
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Iterator, List, Sequence, Tuple

Coord = Tuple[int, int]

WALL = 0
FREE = 1

DIAGONAL_FACTOR = math.sqrt(2.0)

# Orden de exploracion: arriba, derecha, abajo, izquierda.
ORTHO_DIRS: Tuple[Coord, ...] = ((-1, 0), (0, 1), (1, 0), (0, -1))
DIAG_DIRS: Tuple[Coord, ...] = ((-1, -1), (-1, 1), (1, 1), (1, -1))


@dataclass(slots=True)
class GridMap:
    """Vista de solo lectura sobre la matriz de celdas."""

    cells: Sequence[Sequence[int]]
    diagonal: bool = False
    weighted: bool = True

    @property
    def rows(self) -> int:
        return len(self.cells)

    @property
    def cols(self) -> int:
        return len(self.cells[0]) if self.cells else 0

    def in_bounds(self, r: int, c: int) -> bool:
        return 0 <= r < self.rows and 0 <= c < self.cols

    def is_wall(self, r: int, c: int) -> bool:
        return not self.in_bounds(r, c) or self.cells[r][c] <= WALL

    def step_cost(self, r: int, c: int) -> float:
        value = self.cells[r][c]
        if value <= WALL:
            return math.inf
        return float(value) if self.weighted else 1.0

    def neighbors(self, r: int, c: int) -> Iterator[Tuple[Coord, float]]:
        """Devuelve (vecino, costo del paso) para cada vecino transitable."""
        for dr, dc in ORTHO_DIRS:
            nr, nc = r + dr, c + dc
            if self.is_wall(nr, nc):
                continue
            yield (nr, nc), self.step_cost(nr, nc)

        if not self.diagonal:
            return

        for dr, dc in DIAG_DIRS:
            nr, nc = r + dr, c + dc
            if self.is_wall(nr, nc):
                continue
            # Evita "cortar esquinas": ambos lados deben ser transitables.
            if self.is_wall(r, nc) or self.is_wall(nr, c):
                continue
            yield (nr, nc), self.step_cost(nr, nc) * DIAGONAL_FACTOR
