"""
Habits API - Hábitos con rachas y registro diario

Los hábitos viven en `public.habits`; el historial en `public.habit_logs`.
"""
from datetime import date, timedelta
from typing import Optional

from fastapi import APIRouter, HTTPException, status
from supabase import Client, create_client

from app.core.config import get_settings
from app.models.schemas import (
    HabitCreate,
    HabitInDB,
    HabitLogCreate,
    HabitLogInDB,
    HabitUpdate,
)

router = APIRouter(prefix="/habits", tags=["habits"])

TABLE = "habits"
LOGS_TABLE = "habit_logs"
FREQUENCIES = ("daily", "weekdays", "weekends", "custom")
LOG_STATUSES = ("completed", "skipped", "pending")


def get_client() -> Client:
    """Crea un cliente de Supabase con la clave de servicio (o la pública)."""
    settings = get_settings()
    key = settings.supabase_service_key or settings.supabase_key

    if not settings.supabase_url or not key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase no está configurado en el backend",
        )

    return create_client(settings.supabase_url, key)


def _validate_frequency(frequency: Optional[str]) -> None:
    if frequency and frequency not in FREQUENCIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"frequency debe ser uno de: {', '.join(FREQUENCIES)}",
        )


@router.get("/", response_model=list[HabitInDB])
def list_habits(user_id: str, only_active: bool = False):
    query = get_client().table(TABLE).select("*").eq("user_id", user_id)
    if only_active:
        query = query.eq("is_active", True)
    response = query.order("created_at", desc=True).execute()
    return response.data or []


@router.post("/", response_model=HabitInDB, status_code=status.HTTP_201_CREATED)
def create_habit(habit: HabitCreate, user_id: str):
    _validate_frequency(habit.frequency)

    payload = habit.model_dump(mode="json")
    payload["user_id"] = user_id
    payload["current_streak"] = 0
    payload["best_streak"] = 0

    response = get_client().table(TABLE).insert(payload).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo crear el hábito",
        )

    return response.data[0]


@router.put("/{habit_id}", response_model=HabitInDB)
def update_habit(habit_id: str, habit: HabitUpdate, user_id: str):
    payload = habit.model_dump(exclude_unset=True, mode="json")
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No hay campos para actualizar",
        )

    _validate_frequency(payload.get("frequency"))

    response = (
        get_client()
        .table(TABLE)
        .update(payload)
        .eq("id", habit_id)
        .eq("user_id", user_id)
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hábito no encontrado o no pertenece al usuario",
        )

    return response.data[0]


@router.delete("/{habit_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_habit(habit_id: str, user_id: str):
    client = get_client()
    existing = (
        client.table(TABLE)
        .select("id")
        .eq("id", habit_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hábito no encontrado o no pertenece al usuario",
        )

    client.table(TABLE).delete().eq("id", habit_id).eq("user_id", user_id).execute()
    return None


# ============================================================
# Logs y rachas
# ============================================================

@router.get("/logs", response_model=list[HabitLogInDB])
def list_logs(
    user_id: str,
    habit_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
):
    query = get_client().table(LOGS_TABLE).select("*").eq("user_id", user_id)
    if habit_id:
        query = query.eq("habit_id", habit_id)
    if start_date:
        query = query.gte("log_date", start_date)
    if end_date:
        query = query.lte("log_date", end_date)
    response = query.order("log_date", desc=True).execute()
    return response.data or []


@router.post("/logs", response_model=HabitLogInDB, status_code=status.HTTP_201_CREATED)
def upsert_log(log: HabitLogCreate, user_id: str):
    """Registra o actualiza el progreso de un hábito y recalcula su racha."""
    if log.status not in LOG_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"status debe ser uno de: {', '.join(LOG_STATUSES)}",
        )

    client = get_client()
    payload = {
        "habit_id": log.habit_id,
        "user_id": user_id,
        "log_date": log.log_date or date.today().isoformat(),
        "progress_value": log.progress_value,
        "status": log.status,
    }

    response = (
        client.table(LOGS_TABLE)
        .upsert(payload, on_conflict="habit_id,log_date")
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo registrar el hábito",
        )

    _recalculate_streak(client, log.habit_id, user_id)
    return response.data[0]


def _recalculate_streak(client: Client, habit_id: str, user_id: str) -> None:
    """Recalcula current_streak y best_streak contando días completados consecutivos."""
    logs = (
        client.table(LOGS_TABLE)
        .select("log_date, status")
        .eq("habit_id", habit_id)
        .eq("user_id", user_id)
        .order("log_date", desc=True)
        .execute()
    ).data or []

    completed_dates = {
        log["log_date"] for log in logs if log.get("status") == "completed"
    }

    current_streak = 0
    cursor = date.today()
    # Permite que la racha siga viva si aún no se registra hoy
    if cursor.isoformat() not in completed_dates:
        cursor -= timedelta(days=1)

    while cursor.isoformat() in completed_dates:
        current_streak += 1
        cursor -= timedelta(days=1)

    habit = (
        client.table(TABLE)
        .select("best_streak")
        .eq("id", habit_id)
        .eq("user_id", user_id)
        .execute()
    ).data
    best_streak = int(habit[0].get("best_streak") or 0) if habit else 0
    best_streak = max(best_streak, current_streak)

    client.table(TABLE).update(
        {"current_streak": current_streak, "best_streak": best_streak}
    ).eq("id", habit_id).eq("user_id", user_id).execute()


@router.get("/stats/summary", response_model=dict)
def get_habits_summary(user_id: str):
    """Resumen de hábitos: activos, completados hoy y mejores rachas."""
    client = get_client()
    today = date.today().isoformat()

    habits = (
        client.table(TABLE)
        .select("id, name, is_active, current_streak, best_streak")
        .eq("user_id", user_id)
        .execute()
    ).data or []
    today_logs = (
        client.table(LOGS_TABLE)
        .select("habit_id, status")
        .eq("user_id", user_id)
        .eq("log_date", today)
        .execute()
    ).data or []

    active = [habit for habit in habits if habit.get("is_active")]
    completed_today = sum(1 for log in today_logs if log.get("status") == "completed")

    top_streaks = sorted(
        habits, key=lambda h: int(h.get("best_streak") or 0), reverse=True
    )[:5]

    return {
        "total_habits": len(habits),
        "active_habits": len(active),
        "completed_today": completed_today,
        "completion_rate_today": (
            round(completed_today / len(active) * 100, 1) if active else 0.0
        ),
        "top_streaks": [
            {
                "id": habit["id"],
                "name": habit["name"],
                "current_streak": habit.get("current_streak") or 0,
                "best_streak": habit.get("best_streak") or 0,
            }
            for habit in top_streaks
        ],
    }
