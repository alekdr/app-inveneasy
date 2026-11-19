"""
Tests de humo y CRUD de la API de InvenEasy.

Se ejecutan contra un Supabase falso en memoria:
    cd backend
    venv\\Scripts\\python -m pytest
"""
from datetime import date, timedelta

from fastapi.testclient import TestClient


def test_health(client: TestClient):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_openapi_incluye_todos_los_modulos(client: TestClient):
    paths = client.get("/openapi.json").json()["paths"]

    for expected in (
        "/closet/items",
        "/routines/",
        "/finances/transactions",
        "/habits/",
        "/calendar/",
        "/wishlist/",
        "/recipes/",
        "/goals/",
        "/notifications/register-device",
    ):
        assert expected in paths


# ============================================================
# Closet
# ============================================================

def test_closet_flujo_completo(client: TestClient):
    category = client.post(
        "/closet/categories",
        params={"user_id": "u1"},
        json={"name": "Ropa", "sort_order": 1},
    )
    assert category.status_code == 201
    category_id = category.json()["id"]

    subcategory = client.post(
        "/closet/subcategories",
        params={"user_id": "u1"},
        json={"category_id": category_id, "name": "Camisas", "sort_order": 1},
    )
    assert subcategory.status_code == 201
    subcategory_id = subcategory.json()["id"]

    item = client.post(
        "/closet/items",
        params={"user_id": "u1"},
        json={"name": "Camisa blanca", "subcategory_id": subcategory_id},
    )
    assert item.status_code == 201
    assert item.json()["name"] == "Camisa blanca"

    items = client.get("/closet/items", params={"user_id": "u1"})
    assert items.status_code == 200
    assert len(items.json()) == 1

    summary = client.get("/closet/stats/summary", params={"user_id": "u1"})
    assert summary.status_code == 200
    body = summary.json()
    assert body["total_items"] == 1
    assert body["categories"][0]["subcategories"][0]["items"] == 1


# ============================================================
# Rutinas
# ============================================================

def test_rutinas_crear_y_registrar_log(client: TestClient):
    routine = client.post(
        "/routines/",
        params={"user_id": "u1"},
        json={"title": "Estirar", "time_of_day": "07:00:00", "frequency": "daily"},
    )
    assert routine.status_code == 201
    routine_id = routine.json()["id"]

    log = client.post(
        "/routines/logs",
        params={"user_id": "u1"},
        json={"routine_id": routine_id, "status": "completed"},
    )
    assert log.status_code == 201
    assert log.json()["status"] == "completed"

    # Segundo registro del mismo día debe actualizar, no duplicar
    log2 = client.post(
        "/routines/logs",
        params={"user_id": "u1"},
        json={"routine_id": routine_id, "status": "uncompleted"},
    )
    assert log2.status_code == 201

    logs = client.get("/routines/logs", params={"user_id": "u1"})
    assert len(logs.json()) == 1
    assert logs.json()[0]["status"] == "uncompleted"


def test_rutinas_rechaza_frecuencia_invalida(client: TestClient):
    response = client.post(
        "/routines/",
        params={"user_id": "u1"},
        json={"title": "Rara", "frequency": "cada_luna"},
    )
    assert response.status_code == 400


# ============================================================
# Finanzas
# ============================================================

def test_finanzas_transacciones_y_resumen(client: TestClient):
    income = client.post(
        "/finances/transactions",
        params={"user_id": "u1"},
        json={"type": "income", "amount": 1000, "category": "Salario"},
    )
    assert income.status_code == 201

    expense = client.post(
        "/finances/transactions",
        params={"user_id": "u1"},
        json={"type": "expense", "amount": 250.5, "category": "Comida"},
    )
    assert expense.status_code == 201

    saving = client.post(
        "/finances/savings",
        params={"user_id": "u1"},
        json={"amount": 100, "saving_type": "digital"},
    )
    assert saving.status_code == 201

    shopping = client.post(
        "/finances/shopping",
        params={"user_id": "u1"},
        json={"name": "Arroz", "estimated_price": 10},
    )
    assert shopping.status_code == 201

    summary = client.get("/finances/stats/summary", params={"user_id": "u1"})
    assert summary.status_code == 200
    body = summary.json()
    assert body["total_income"] == 1000
    assert body["total_expenses"] == 250.5
    assert body["balance"] == 749.5
    assert body["savings_total"] == 100
    assert body["shopping_pending"] == 1


def test_finanzas_rechaza_tipo_invalido(client: TestClient):
    response = client.post(
        "/finances/transactions",
        params={"user_id": "u1"},
        json={"type": "regalo", "amount": 10, "category": "Otros"},
    )
    assert response.status_code == 400


# ============================================================
# Hábitos
# ============================================================

def test_habitos_calcula_racha(client: TestClient):
    habit = client.post(
        "/habits/",
        params={"user_id": "u1"},
        json={"name": "Leer", "frequency": "daily"},
    )
    assert habit.status_code == 201
    habit_id = habit.json()["id"]

    today = date.today()
    for offset in (2, 1, 0):
        log = client.post(
            "/habits/logs",
            params={"user_id": "u1"},
            json={
                "habit_id": habit_id,
                "log_date": (today - timedelta(days=offset)).isoformat(),
                "progress_value": 1,
                "status": "completed",
            },
        )
        assert log.status_code == 201

    habits = client.get("/habits/", params={"user_id": "u1"})
    stored = habits.json()[0]
    assert stored["current_streak"] == 3
    assert stored["best_streak"] == 3

    summary = client.get("/habits/stats/summary", params={"user_id": "u1"})
    assert summary.json()["completed_today"] == 1


# ============================================================
# Calendario
# ============================================================

def test_calendario_crear_y_toggle(client: TestClient):
    event = client.post(
        "/calendar/",
        params={"user_id": "u1"},
        json={
            "title": "Cita médica",
            "event_date": date.today().isoformat(),
            "event_time": "09:30:00",
            "event_type": "Urgente",
        },
    )
    assert event.status_code == 201
    event_id = event.json()["id"]

    toggled = client.patch(f"/calendar/{event_id}/toggle", params={"user_id": "u1"})
    assert toggled.status_code == 200
    assert toggled.json()["is_completed"] is True

    summary = client.get("/calendar/stats/summary", params={"user_id": "u1"})
    assert summary.json()["completed_events"] == 1


def test_calendario_rechaza_tipo_invalido(client: TestClient):
    response = client.post(
        "/calendar/",
        params={"user_id": "u1"},
        json={
            "title": "X",
            "event_date": date.today().isoformat(),
            "event_type": "Fiesta",
        },
    )
    assert response.status_code == 400


# ============================================================
# Wishlist
# ============================================================

def test_wishlist_flujo_completo(client: TestClient):
    item = client.post(
        "/wishlist/",
        params={"user_id": "u1"},
        json={"title": "Auriculares", "estimated_price": 80, "category": "Tecnología"},
    )
    assert item.status_code == 201
    item_id = item.json()["id"]

    toggled = client.patch(
        f"/wishlist/{item_id}/toggle-purchased", params={"user_id": "u1"}
    )
    assert toggled.status_code == 200
    assert toggled.json()["is_purchased"] is True
    assert toggled.json()["purchased_date"] == date.today().isoformat()

    summary = client.get("/wishlist/stats/summary", params={"user_id": "u1"})
    body = summary.json()
    assert body["purchased_items"] == 1
    assert body["pending_items"] == 0

    deleted = client.delete(f"/wishlist/{item_id}", params={"user_id": "u1"})
    assert deleted.status_code == 204


# ============================================================
# Notificaciones
# ============================================================

def test_notificaciones_preferencias_por_defecto(client: TestClient):
    prefs = client.get("/notifications/preferences", params={"user_id": "u1"})
    assert prefs.status_code == 200
    assert prefs.json()["routines"] is True

    updated = client.put(
        "/notifications/preferences",
        params={"user_id": "u1"},
        json={
            "routines": False,
            "habits": True,
            "calendar": True,
            "budgets": False,
            "fixed_expenses": True,
            "debts": True,
            "weekly_summary": False,
        },
    )
    assert updated.status_code == 200
    assert updated.json()["routines"] is False


def test_notificaciones_registrar_dispositivo(client: TestClient):
    response = client.post(
        "/notifications/register-device",
        json={"user_id": "u1", "token": "fcm-token-123456", "platform": "android"},
    )
    assert response.status_code == 201
    assert response.json()["ok"] is True

    devices = client.get("/notifications/devices", params={"user_id": "u1"})
    assert len(devices.json()) == 1
