"""
Routines API - Rutinas diarias, semanales y mensuales

Las rutinas viven en `public.routines`; el historial de cumplimiento en
`public.routine_logs`.
"""
from datetime import date, datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, status
from supabase import Client, create_client

from app.core.config import get_settings
from app.models.schemas import (
    RoutineCreate,
    RoutineInDB,
    RoutineLogCreate,
    RoutineLogInDB,
    RoutineUpdate,
)

router = APIRouter(prefix="/routines", tags=["routines"])

TABLE = "routines"
LOGS_TABLE = "routine_logs"
FREQUENCIES = ("daily", "weekly", "monthly", "custom")
LOG_STATUSES = ("completed", "uncompleted", "pending")


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


@router.get("/", response_model=list[RoutineInDB])
def list_routines(user_id: str, only_active: bool = False):
    query = get_client().table(TABLE).select("*").eq("user_id", user_id)
    if only_active:
        query = query.eq("is_active", True)
    response = query.order("created_at", desc=True).execute()
    return response.data or []


@router.post("/", response_model=RoutineInDB, status_code=status.HTTP_201_CREATED)
def create_routine(routine: RoutineCreate, user_id: str):
    _validate_frequency(routine.frequency)

    payload = routine.model_dump(mode="json")
    payload["user_id"] = user_id

    response = get_client().table(TABLE).insert(payload).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo crear la rutina",
        )

    return response.data[0]


@router.put("/{routine_id}", response_model=RoutineInDB)
def update_routine(routine_id: str, routine: RoutineUpdate, user_id: str):
    payload = routine.model_dump(exclude_unset=True, mode="json")
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
        .eq("id", routine_id)
        .eq("user_id", user_id)
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rutina no encontrada o no pertenece al usuario",
        )

    return response.data[0]


@router.delete("/{routine_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_routine(routine_id: str, user_id: str):
    client = get_client()
    existing = (
        client.table(TABLE)
        .select("id")
        .eq("id", routine_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rutina no encontrada o no pertenece al usuario",
        )

    client.table(TABLE).delete().eq("id", routine_id).eq("user_id", user_id).execute()
    return None


# ============================================================
# Logs de rutinas
# ============================================================

@router.get("/logs", response_model=list[RoutineLogInDB])
def list_logs(user_id: str, log_date: Optional[str] = None):
    query = get_client().table(LOGS_TABLE).select("*").eq("user_id", user_id)
    if log_date:
        query = query.eq("log_date", log_date)
    response = query.order("log_date", desc=True).execute()
    return response.data or []


@router.post("/logs", response_model=RoutineLogInDB, status_code=status.HTTP_201_CREATED)
def upsert_log(log: RoutineLogCreate, user_id: str):
    """Registra o actualiza el estado de una rutina para una fecha."""
    if log.status not in LOG_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"status debe ser uno de: {', '.join(LOG_STATUSES)}",
        )

    payload = {
        "routine_id": log.routine_id,
        "user_id": user_id,
        "log_date": log.log_date or date.today().isoformat(),
        "status": log.status,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    response = (
        get_client()
        .table(LOGS_TABLE)
        .upsert(payload, on_conflict="routine_id,log_date")
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo registrar el estado de la rutina",
        )

    return response.data[0]


@router.get("/stats/summary", response_model=dict)
def get_routines_summary(user_id: str):
    """Resumen de cumplimiento de rutinas (hoy y total)."""
    client = get_client()
    today = date.today().isoformat()

    routines = (
        client.table(TABLE).select("id, is_active").eq("user_id", user_id).execute()
    ).data or []
    logs = (
        client.table(LOGS_TABLE)
        .select("routine_id, log_date, status")
        .eq("user_id", user_id)
        .execute()
    ).data or []

    today_logs = [log for log in logs if log.get("log_date") == today]
    completed_today = sum(1 for log in today_logs if log.get("status") == "completed")
    active_routines = sum(1 for r in routines if r.get("is_active"))

    completed_total = sum(1 for log in logs if log.get("status") == "completed")

    return {
        "total_routines": len(routines),
        "active_routines": active_routines,
        "today_logs": len(today_logs),
        "completed_today": completed_today,
        "completion_rate_today": (
            round(completed_today / active_routines * 100, 1) if active_routines else 0.0
        ),
        "completed_total": completed_total,
    }
