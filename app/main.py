"""Reskato Route - servidor web (FastAPI).

Expone la logica academica en Python (grafo, A*, generacion de laberintos y
deteccion de bloqueo) y sirve el tablero interactivo en HTML/Canvas.
"""

from __future__ import annotations

from pathlib import Path
from typing import List

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, field_validator

from .core.astar import search
from .core.maze import MAX_SIZE, MIN_SIZE, generate
from .core.validator import is_reachable, reachable_cells

BASE_DIR = Path(__file__).resolve().parent.parent
STATIC_DIR = BASE_DIR / "static"

app = FastAPI(
    title="Reskato Route",
    description="Simulador de enrutamiento optimo con A* y control por gestos.",
    version="1.0.0",
)


class MazeRequest(BaseModel):
    rows: int = Field(default=16, ge=MIN_SIZE, le=MAX_SIZE)
    cols: int = Field(default=16, ge=MIN_SIZE, le=MAX_SIZE)
    seed: int | None = None


class SolveRequest(BaseModel):
    cells: List[List[int]]
    start: List[int]
    goal: List[int]
    diagonal: bool = False
    weighted: bool = True

    @field_validator("cells")
    @classmethod
    def _check_cells(cls, cells: List[List[int]]) -> List[List[int]]:
        if not cells or not cells[0]:
            raise ValueError("el tablero esta vacio")
        rows, cols = len(cells), len(cells[0])
        if not (MIN_SIZE <= rows <= MAX_SIZE and MIN_SIZE <= cols <= MAX_SIZE):
            raise ValueError(f"el tablero debe medir entre {MIN_SIZE}x{MIN_SIZE} y {MAX_SIZE}x{MAX_SIZE}")
        for row in cells:
            if len(row) != cols:
                raise ValueError("todas las filas deben tener el mismo largo")
            for value in row:
                if not isinstance(value, int) or not 0 <= value <= 9:
                    raise ValueError("cada celda debe ser un entero entre 0 y 9")
        return cells

    @field_validator("start", "goal")
    @classmethod
    def _check_point(cls, point: List[int]) -> List[int]:
        if len(point) != 2 or not all(isinstance(v, int) for v in point):
            raise ValueError("las coordenadas deben ser [fila, columna]")
        return point


class CheckRequest(BaseModel):
    cells: List[List[int]]
    start: List[int]
    goal: List[int]
    diagonal: bool = False


@app.get("/api/health")
def health() -> dict:
    return {"ok": True, "service": "reskato-route"}


@app.post("/api/maze")
def new_maze(payload: MazeRequest) -> dict:
    board = generate(payload.rows, payload.cols, payload.seed)
    return {
        "rows": board.rows,
        "cols": board.cols,
        "cells": board.cells,
        "start": list(board.start),
        "goal": list(board.goal),
    }


@app.post("/api/solve")
def solve(payload: SolveRequest) -> dict:
    start = (payload.start[0], payload.start[1])
    goal = (payload.goal[0], payload.goal[1])
    result = search(
        payload.cells,
        start,
        goal,
        diagonal=payload.diagonal,
        weighted=payload.weighted,
    )
    return {
        "found": result.found,
        "path": [[r, c] for r, c in result.path],
        "trace": result.trace,
        "cost": result.cost,
        "expanded": result.expanded,
        "generated": result.generated,
        "elapsed_ms": result.elapsed_ms,
        "reason": result.reason,
        "blocked": not result.found,
    }


@app.post("/api/check")
def check(payload: CheckRequest) -> dict:
    rows = len(payload.cells)
    cols = len(payload.cells[0]) if rows else 0
    start = (payload.start[0], payload.start[1])
    goal = (payload.goal[0], payload.goal[1])
    if not (0 <= start[0] < rows and 0 <= start[1] < cols and 0 <= goal[0] < rows and 0 <= goal[1] < cols):
        raise HTTPException(status_code=400, detail="coordenadas fuera del tablero")
    reachable = is_reachable(payload.cells, start, goal, payload.diagonal)
    return {
        "reachable": reachable,
        "reachable_count": len(reachable_cells(payload.cells, start, payload.diagonal)),
    }


@app.get("/")
def index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html", headers={"Cache-Control": "no-store"})


app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

if __name__ == "__main__":
    import threading
    import webbrowser

    import uvicorn

    threading.Timer(1.2, lambda: webbrowser.open("http://127.0.0.1:8000/")).start()
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="warning")
