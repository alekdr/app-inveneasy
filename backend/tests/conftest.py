"""
Fixtures compartidas de los tests del backend.

Usan un cliente falso de Supabase en memoria para no tocar la base de datos real.
"""
import uuid
from datetime import date, datetime, timezone
from typing import Any, Optional

import pytest

from app.main import app
from fastapi.testclient import TestClient


class FakeQuery:
    """Emula la cadena fluida de supabase-py sobre una tabla en memoria."""

    def __init__(self, store: dict[str, list[dict]], table: str):
        self.store = store
        self.table = table
        self.filters: list[tuple[str, str, Any]] = []
        self.order_by: list[tuple[str, bool]] = []
        self._op: Optional[tuple[str, Any]] = None
        self._on_conflict: Optional[str] = None
        self._columns = "*"

    # --- construcción de la consulta ---
    def select(self, columns: str = "*", *args, **kwargs):
        self._columns = columns
        return self

    def eq(self, column: str, value: Any):
        self.filters.append(("eq", column, value))
        return self

    def gte(self, column: str, value: Any):
        self.filters.append(("gte", column, value))
        return self

    def lte(self, column: str, value: Any):
        self.filters.append(("lte", column, value))
        return self

    def ilike(self, column: str, pattern: str):
        self.filters.append(("ilike", column, pattern))
        return self

    def order(self, column: str, desc: bool = False):
        self.order_by.append((column, desc))
        return self

    def insert(self, payload: dict | list[dict]):
        self._op = ("insert", payload)
        return self

    def upsert(self, payload: dict | list[dict], on_conflict: Optional[str] = None):
        self._op = ("upsert", payload)
        self._on_conflict = on_conflict
        return self

    def update(self, payload: dict):
        self._op = ("update", payload)
        return self

    def delete(self):
        self._op = ("delete", None)
        return self

    # --- ejecución ---
    def _matches(self, row: dict) -> bool:
        for op, column, value in self.filters:
            current = row.get(column)
            if op == "eq" and current != value:
                return False
            if op == "gte" and str(current) < str(value):
                return False
            if op == "lte" and str(current) > str(value):
                return False
            if op == "ilike":
                needle = pattern_to_text(value)
                if needle not in str(current or "").lower():
                    return False
        return True

    def execute(self):
        rows = self.store.setdefault(self.table, [])

        if self._op:
            kind, payload = self._op

            if kind == "insert":
                items = payload if isinstance(payload, list) else [payload]
                created = []
                for item in items:
                    row = {
                        "id": str(uuid.uuid4()),
                        "created_at": datetime.now(timezone.utc).isoformat(),
                        **item,
                    }
                    if self.table == "habit_logs" and "log_date" not in row:
                        row["log_date"] = date.today().isoformat()
                    rows.append(row)
                    created.append(dict(row))
                return FakeResponse(created)

            if kind == "upsert":
                item = payload
                keys = (self._on_conflict or "id").split(",")
                for row in rows:
                    if all(row.get(key) == item.get(key) for key in keys):
                        row.update(item)
                        return FakeResponse([dict(row)])
                row = {
                    "id": str(uuid.uuid4()),
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    **item,
                }
                rows.append(row)
                return FakeResponse([dict(row)])

            if kind == "update":
                updated = []
                for row in rows:
                    if self._matches(row):
                        row.update(payload)
                        updated.append(dict(row))
                return FakeResponse(updated)

            if kind == "delete":
                removed = [row for row in rows if self._matches(row)]
                self.store[self.table] = [row for row in rows if not self._matches(row)]
                return FakeResponse(removed)

        result = [dict(row) for row in rows if self._matches(row)]

        for column, desc in reversed(self.order_by):
            result.sort(key=lambda row: str(row.get(column) or ""), reverse=desc)

        return FakeResponse(result)


def pattern_to_text(pattern: str) -> str:
    return pattern.strip("%").lower()


class FakeResponse:
    def __init__(self, data: list[dict]):
        self.data = data


class FakeSupabase:
    """Cliente falso que expone `.table(name)`."""

    def __init__(self, seed: Optional[dict[str, list[dict]]] = None):
        self.store: dict[str, list[dict]] = seed or {}

    def table(self, name: str) -> FakeQuery:
        return FakeQuery(self.store, name)


@pytest.fixture()
def fake_supabase() -> FakeSupabase:
    return FakeSupabase()


@pytest.fixture()
def client(fake_supabase: FakeSupabase, monkeypatch: pytest.MonkeyPatch) -> TestClient:
    """Cliente HTTP con todos los routers apuntando al Supabase falso."""
    modules = (
        "closet",
        "routines",
        "finances",
        "habits",
        "calendar",
        "wishlist",
        "goals",
        "recipes",
        "notifications",
    )
    for module in modules:
        monkeypatch.setattr(
            f"app.api.{module}.get_client", lambda: fake_supabase, raising=True
        )

    return TestClient(app)
