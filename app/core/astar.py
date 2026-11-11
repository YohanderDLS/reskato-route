"""Algoritmo A* (A-Star) con traza completa de la busqueda.

La traza permite al frontend reconstruir, paso a paso, el "pensamiento" del
algoritmo: que celdas entran a la frontera de busqueda (amarillo) y cuales se
descartan al ser expandidas (rojo).

    f(n) = g(n) + h(n)

donde g(n) es el costo real desde el origen hasta n y h(n) es la heuristica
(Manhattan en 4-vecindad, octil en 8-vecindad). Como el costo minimo de una
celda es 1, la heuristica es admisible y consistente.
"""

from __future__ import annotations

import heapq
import math
import time
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Sequence, Tuple

from .grid import Coord, GridMap

SQRT2_MINUS_1 = math.sqrt(2.0) - 1.0


@dataclass(slots=True)
class AStarResult:
    found: bool
    path: List[Coord] = field(default_factory=list)
    trace: List[dict] = field(default_factory=list)
    cost: float = 0.0
    expanded: int = 0
    generated: int = 0
    elapsed_ms: float = 0.0
    reason: str = ""


def heuristic(a: Coord, b: Coord, diagonal: bool) -> float:
    dr = abs(a[0] - b[0])
    dc = abs(a[1] - b[1])
    if diagonal:
        return max(dr, dc) + SQRT2_MINUS_1 * min(dr, dc)
    return float(dr + dc)


def _reconstruct(parent: Dict[Coord, Coord], current: Coord) -> List[Coord]:
    path = [current]
    while current in parent:
        current = parent[current]
        path.append(current)
    path.reverse()
    return path


def search(
    cells: Sequence[Sequence[int]],
    start: Coord,
    goal: Coord,
    diagonal: bool = False,
    weighted: bool = True,
) -> AStarResult:
    t0 = time.perf_counter()
    grid = GridMap(cells, diagonal=diagonal, weighted=weighted)

    if not grid.in_bounds(*start) or not grid.in_bounds(*goal):
        return AStarResult(False, reason="origen o meta fuera del tablero")
    if grid.is_wall(*start) or grid.is_wall(*goal):
        return AStarResult(False, reason="el origen o la meta estan sobre un muro")

    open_heap: List[Tuple[float, float, int, Coord]] = []
    counter = 0
    h0 = heuristic(start, goal, diagonal)
    heapq.heappush(open_heap, (h0, h0, counter, start))

    g_score: Dict[Coord, float] = {start: 0.0}
    parent: Dict[Coord, Coord] = {}
    closed: set[Coord] = set()
    in_open: set[Coord] = {start}
    trace: List[dict] = [
        {
            "t": "open",
            "r": start[0],
            "c": start[1],
            "g": 0.0,
            "h": round(h0, 2),
            "f": round(h0, 2),
        }
    ]
    expanded = 0
    generated = 1

    while open_heap:
        f_cur, h_cur, _, current = heapq.heappop(open_heap)
        if current in closed:
            continue
        closed.add(current)
        in_open.discard(current)
        expanded += 1

        g_cur = g_score[current]
        trace.append(
            {
                "t": "close",
                "r": current[0],
                "c": current[1],
                "g": round(g_cur, 2),
                "h": round(h_cur, 2),
                "f": round(f_cur, 2),
            }
        )

        if current == goal:
            path = _reconstruct(parent, current)
            return AStarResult(
                found=True,
                path=path,
                trace=trace,
                cost=round(g_cur, 2),
                expanded=expanded,
                generated=generated,
                elapsed_ms=round((time.perf_counter() - t0) * 1000.0, 3),
            )

        for (nr, nc), step in grid.neighbors(*current):
            if (nr, nc) in closed:
                continue
            tentative = g_cur + step
            if tentative < g_score.get((nr, nc), math.inf) - 1e-9:
                g_score[(nr, nc)] = tentative
                parent[(nr, nc)] = current
                h = heuristic((nr, nc), goal, diagonal)
                f = tentative + h
                counter += 1
                generated += 1
                heapq.heappush(open_heap, (f, h, counter, (nr, nc)))
                in_open.add((nr, nc))
                trace.append(
                    {
                        "t": "open",
                        "r": nr,
                        "c": nc,
                        "g": round(tentative, 2),
                        "h": round(h, 2),
                        "f": round(f, 2),
                    }
                )

    return AStarResult(
        found=False,
        trace=trace,
        expanded=expanded,
        generated=generated,
        elapsed_ms=round((time.perf_counter() - t0) * 1000.0, 3),
        reason="no existe un camino entre el rescatista y la mascota",
    )
