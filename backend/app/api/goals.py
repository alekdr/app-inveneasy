"""
Goals Control API - Metas a largo, medio y corto plazo

Las metas viven en la tabla `public.goals` de Supabase PostgreSQL.
Este router usa el cliente oficial de Supabase (No requiere SQLAlchemy).
"""
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, status
from supabase import Client, create_client

from app.core.config import get_settings
from app.models.schemas import GoalCreate, GoalInDB, GoalProgress, GoalUpdate

router = APIRouter(prefix="/goals", tags=["goals"])

TABLE = "goals"
GOAL_TYPES = ("short_term", "medium_term", "long_term")


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


def progress_percent(goal: dict) -> float:
    """Calcula el porcentaje de avance (0-100) de una meta."""
    if goal.get("is_completed"):
        return 100.0

    try:
        target = float(goal.get("target_value") or 0)
        current = float(goal.get("current_value") or 0)
    except (TypeError, ValueError):
        return 0.0

    if target <= 0:
        return 0.0

    return round(max(0.0, min(100.0, (current / target) * 100)), 1)


def days_remaining(goal: dict) -> Optional[int]:
    """Días restantes hasta la fecha objetivo (negativo si ya venció)."""
    raw = goal.get("target_date")
    if not raw:
        return None

    try:
        target = datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
    except ValueError:
        return None

    if target.tzinfo is None:
        target = target.replace(tzinfo=timezone.utc)

    return (target - datetime.now(timezone.utc)).days


@router.get("/", response_model=list[GoalInDB])
def list_goals(user_id: str, goal_type: Optional[str] = None):
    """Lista las metas de un usuario, opcionalmente filtradas por tipo."""
    query = get_client().table(TABLE).select("*").eq("user_id", user_id)

    if goal_type:
        query = query.eq("goal_type", goal_type)

    response = query.order("goal_type").order("target_date", desc=True).execute()
    return response.data or []


@router.post("/", response_model=GoalInDB, status_code=status.HTTP_201_CREATED)
def create_goal(goal: GoalCreate, user_id: str):
    """Crea una nueva meta para el usuario."""
    payload = goal.model_dump(mode="json")
    payload.update(
        {
            "user_id": user_id,
            "current_value": 0,
            "is_completed": False,
            "completed_date": None,
        }
    )

    response = get_client().table(TABLE).insert(payload).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo crear la meta",
        )

    return response.data[0]


@router.put("/{goal_id}", response_model=GoalInDB)
def update_goal(goal_id: str, goal_update: GoalUpdate, user_id: str):
    """Actualiza una meta existente del usuario."""
    payload = goal_update.model_dump(exclude_unset=True, mode="json")

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No hay campos para actualizar",
        )

    now = datetime.now(timezone.utc).isoformat()
    payload["updated_at"] = now

    if "is_completed" in payload:
        payload["completed_date"] = now if payload["is_completed"] else None

    if "goal_type" in payload and payload["goal_type"] not in GOAL_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"goal_type debe ser uno de: {', '.join(GOAL_TYPES)}",
        )

    response = (
        get_client()
        .table(TABLE)
        .update(payload)
        .eq("id", goal_id)
        .eq("user_id", user_id)
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meta no encontrada o no pertenece al usuario",
        )

    return response.data[0]


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_goal(goal_id: str, user_id: str):
    """Elimina una meta del usuario."""
    client = get_client()
    existing = (
        client.table(TABLE)
        .select("id")
        .eq("id", goal_id)
        .eq("user_id", user_id)
        .execute()
    )

    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meta no encontrada o no pertenece al usuario",
        )

    client.table(TABLE).delete().eq("id", goal_id).eq("user_id", user_id).execute()
    return None


@router.get("/stats/summary", response_model=dict)
def get_goals_summary(user_id: str):
    """Resumen estadístico de todas las metas del usuario."""
    response = get_client().table(TABLE).select("*").eq("user_id", user_id).execute()
    goals = response.data or []

    by_type = {
        goal_type: {
            "total": 0,
            "completed": 0,
            "achieved": 0,
            "average_progress": 0.0,
        }
        for goal_type in GOAL_TYPES
    }

    for goal in goals:
        goal_type = goal.get("goal_type")
        if goal_type not in by_type:
            continue

        stats = by_type[goal_type]
        stats["total"] += 1
        if goal.get("is_completed"):
            stats["completed"] += 1

        target = goal.get("target_value")
        current = goal.get("current_value") or 0
        if target is not None and float(target) > 0 and float(current) >= float(target):
            stats["achieved"] += 1

        stats["average_progress"] += progress_percent(goal)

    for stats in by_type.values():
        stats["average_progress"] = (
            round(stats["average_progress"] / stats["total"], 1)
            if stats["total"]
            else 0.0
        )

    total_goals = len(goals)
    completed_goals = sum(1 for goal in goals if goal.get("is_completed"))

    return {
        "total_goals": total_goals,
        "completed_goals": completed_goals,
        "in_progress_goals": total_goals - completed_goals,
        "by_type": by_type,
    }


@router.get("/{goal_id}/progress", response_model=GoalProgress)
def get_goal_progress(goal_id: str, user_id: str):
    """Obtiene el progreso detallado de una meta específica."""
    response = (
        get_client()
        .table(TABLE)
        .select("*")
        .eq("id", goal_id)
        .eq("user_id", user_id)
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meta no encontrada o no pertenece al usuario",
        )

    goal = response.data[0]

    return {
        "goal_id": goal["id"],
        "title": goal["title"],
        "goal_type": goal["goal_type"],
        "target_date": goal["target_date"],
        "current_value": float(goal.get("current_value") or 0),
        "target_value": goal.get("target_value"),
        "unit": goal.get("unit"),
        "progress_percent": progress_percent(goal),
        "is_completed": bool(goal.get("is_completed")),
        "days_remaining": days_remaining(goal),
    }
