"""Generador de laberintos con ramas, callejones y escombros con costo.

1. Se parte de un tablero lleno de muros.
2. Se excava un laberinto "perfecto" con backtracking aleatorio (DFS).
3. Se "trenzan" algunos callejones sin salida para crear rutas alternativas
   (varios caminos entre dos puntos, ideal para comparar costos).
4. Se convierten algunos muros en escombros transitables de costo 3 o 5.
5. La meta se ubica en la celda transitable mas lejana del cuadrante inferior
   derecho, para que el recorrido sea visualmente interesante.
"""

from __future__ import annotations

import random
from collections import deque
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

Coord = Tuple[int, int]

MIN_SIZE = 8
MAX_SIZE = 40


@dataclass(slots=True)
class MazeBoard:
    rows: int
    cols: int
    cells: List[List[int]]
    start: Coord
    goal: Coord


def _odd_positions(limit: int) -> List[int]:
    return [i for i in range(1, limit - 1, 2)]


def _carve(rows: int, cols: int, rng: random.Random) -> List[List[int]]:
    cells = [[0] * cols for _ in range(rows)]
    odd_rows = _odd_positions(rows) or [1]
    odd_cols = _odd_positions(cols) or [1]

    start = (odd_rows[0], odd_cols[0])
    cells[start[0]][start[1]] = 1
    stack = [start]

    while stack:
        r, c = stack[-1]
        options = []
        for dr, dc in ((-2, 0), (0, 2), (2, 0), (0, -2)):
            nr, nc = r + dr, c + dc
            if 0 < nr < rows - 1 and 0 < nc < cols - 1 and cells[nr][nc] == 0:
                options.append((nr, nc, r + dr // 2, c + dc // 2))
        if not options:
            stack.pop()
            continue
        nr, nc, wr, wc = rng.choice(options)
        cells[wr][wc] = 1
        cells[nr][nc] = 1
        stack.append((nr, nc))

    return cells


def _braid(cells: List[List[int]], rng: random.Random, probability: float = 0.32) -> None:
    """Abre algunos muros para eliminar callejones sin salida."""
    rows, cols = len(cells), len(cells[0])
    for r in range(1, rows - 1):
        for c in range(1, cols - 1):
            if cells[r][c] == 0:
                continue
            open_dirs = [
                (dr, dc)
                for dr, dc in ((-1, 0), (0, 1), (1, 0), (0, -1))
                if cells[r + dr][c + dc] > 0
            ]
            if len(open_dirs) != 1 or rng.random() > probability:
                continue
            candidates = []
            for dr, dc in ((-2, 0), (0, 2), (2, 0), (0, -2)):
                nr, nc = r + dr, c + dc
                wr, wc = r + dr // 2, c + dc // 2
                if 0 < nr < rows - 1 and 0 < nc < cols - 1 and cells[nr][nc] > 0 and cells[wr][wc] == 0:
                    candidates.append((wr, wc))
            if candidates:
                wr, wc = rng.choice(candidates)
                cells[wr][wc] = 1


def _add_rubble(
    cells: List[List[int]],
    rng: random.Random,
    probability: float,
    start: Coord,
    protected: Optional[set] = None,
) -> None:
    rows, cols = len(cells), len(cells[0])
    protected = protected or set()
    for r in range(1, rows - 1):
        for c in range(1, cols - 1):
            if cells[r][c] != 0 or (r, c) in protected or (r, c) == start:
                continue
            # Solo escombros que toquen un pasillo (se ven como derrumbes).
            touches_floor = any(
                cells[r + dr][c + dc] > 0
                for dr, dc in ((-1, 0), (0, 1), (1, 0), (0, -1))
            )
            if not touches_floor:
                continue
            if rng.random() < probability:
                cells[r][c] = 3 if rng.random() < 0.6 else 5


def _distances(cells: List[List[int]], start: Coord) -> Dict[Coord, int]:
    rows, cols = len(cells), len(cells[0])
    dist: Dict[Coord, int] = {start: 0}
    queue = deque([start])
    while queue:
        r, c = queue.popleft()
        for dr, dc in ((-1, 0), (0, 1), (1, 0), (0, -1)):
            nr, nc = r + dr, c + dc
            if 0 <= nr < rows and 0 <= nc < cols and cells[nr][nc] > 0 and (nr, nc) not in dist:
                dist[(nr, nc)] = dist[(r, c)] + 1
                queue.append((nr, nc))
    return dist


def _pick_goal(cells: List[List[int]], start: Coord) -> Coord:
    rows, cols = len(cells), len(cells[0])
    dist = _distances(cells, start)
    # Preferimos el cuadrante inferior derecho, como en la referencia visual.
    preferred = [
        (d, rc)
        for rc, d in dist.items()
        if rc[0] >= rows * 0.55 and rc[1] >= cols * 0.55 and cells[rc[0]][rc[1]] == 1
    ]
    pool = preferred or [(d, rc) for rc, d in dist.items() if cells[rc[0]][rc[1]] == 1]
    if not pool:
        return (1, 1)
    pool.sort(key=lambda item: (item[0], -item[1][0], -item[1][1]))
    return pool[-1][1]


def generate(
    rows: int = 16,
    cols: int = 16,
    seed: Optional[int] = None,
    rubble_probability: float = 0.09,
) -> MazeBoard:
    rows = max(MIN_SIZE, min(MAX_SIZE, int(rows)))
    cols = max(MIN_SIZE, min(MAX_SIZE, int(cols)))
    rng = random.Random(seed)

    cells = _carve(rows, cols, rng)
    _braid(cells, rng)
    start = (1, 1)
    goal = _pick_goal(cells, start)
    _add_rubble(cells, rng, rubble_probability, start, protected={goal})

    # Garantia final: origen y meta siempre transitables con costo normal.
    cells[start[0]][start[1]] = 1
    cells[goal[0]][goal[1]] = 1

    return MazeBoard(rows=rows, cols=cols, cells=cells, start=start, goal=goal)
