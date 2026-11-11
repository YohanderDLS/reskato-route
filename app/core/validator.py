"""Validaciones de conectividad sobre el grafo del tablero."""

from __future__ import annotations

from collections import deque
from typing import Sequence, Tuple

Coord = Tuple[int, int]


def reachable_cells(
    cells: Sequence[Sequence[int]], start: Coord, diagonal: bool = False
) -> set[Coord]:
    rows, cols = len(cells), len(cells[0])
    if not (0 <= start[0] < rows and 0 <= start[1] < cols) or cells[start[0]][start[1]] <= 0:
        return set()

    dirs = [(-1, 0), (0, 1), (1, 0), (0, -1)]
    if diagonal:
        dirs += [(-1, -1), (-1, 1), (1, 1), (1, -1)]

    seen = {start}
    queue = deque([start])
    while queue:
        r, c = queue.popleft()
        for dr, dc in dirs:
            nr, nc = r + dr, c + dc
            if not (0 <= nr < rows and 0 <= nc < cols):
                continue
            if cells[nr][nc] <= 0 or (nr, nc) in seen:
                continue
            seen.add((nr, nc))
            queue.append((nr, nc))
    return seen


def is_reachable(
    cells: Sequence[Sequence[int]], start: Coord, goal: Coord, diagonal: bool = False
) -> bool:
    return goal in reachable_cells(cells, start, diagonal)
