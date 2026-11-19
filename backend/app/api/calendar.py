"""
Calendar API - Eventos, recordatorios y tareas por fecha

Los eventos viven en `public.calendar_events`.
"""
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, status
from supabase import Client, create_client

from app.core.config import get_settings
from app.models.schemas import (
    CalendarEventCreate,
    CalendarEventInDB,
    CalendarEventUpdate,
)

router = APIRouter(prefix="/calendar", tags=["calendar"])

TABLE = "calendar_events"
EVENT_TYPES = (
    "Evento",
    "Recordatorio",
    "Tarea",
    "Urgente",
    "Importante",
    "Meta",
    "Idea",
)


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


def _validate_event_type(event_type: Optional[str]) -> None:
    if event_type and event_type not in EVENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"event_type debe ser uno de: {', '.join(EVENT_TYPES)}",
        )


@router.get("/", response_model=list[CalendarEventInDB])
def list_events(
    user_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    event_type: Optional[str] = None,
    only_pending: bool = False,
):
    query = get_client().table(TABLE).select("*").eq("user_id", user_id)

    if start_date:
        query = query.gte("event_date", start_date)
    if end_date:
        query = query.lte("event_date", end_date)
    if event_type:
        query = query.eq("event_type", event_type)
    if only_pending:
        query = query.eq("is_completed", False)

    response = query.order("event_date").order("event_time").execute()
    return response.data or []


@router.post("/", response_model=CalendarEventInDB, status_code=status.HTTP_201_CREATED)
def create_event(event: CalendarEventCreate, user_id: str):
    _validate_event_type(event.event_type)

    payload = event.model_dump(mode="json")
    payload["user_id"] = user_id

    response = get_client().table(TABLE).insert(payload).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo crear el evento",
        )

    return response.data[0]


@router.put("/{event_id}", response_model=CalendarEventInDB)
def update_event(event_id: str, event: CalendarEventUpdate, user_id: str):
    payload = event.model_dump(exclude_unset=True, mode="json")
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No hay campos para actualizar",
        )

    _validate_event_type(payload.get("event_type"))

    payload["updated_at"] = datetime.now(timezone.utc).isoformat()

    response = (
        get_client()
        .table(TABLE)
        .update(payload)
        .eq("id", event_id)
        .eq("user_id", user_id)
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evento no encontrado o no pertenece al usuario",
        )

    return response.data[0]


@router.patch("/{event_id}/toggle", response_model=CalendarEventInDB)
def toggle_event(event_id: str, user_id: str):
    """Marca el evento como completado o pendiente."""
    client = get_client()
    existing = (
        client.table(TABLE)
        .select("is_completed")
        .eq("id", event_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evento no encontrado o no pertenece al usuario",
        )

    response = (
        client.table(TABLE)
        .update(
            {
                "is_completed": not existing.data[0].get("is_completed", False),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        .eq("id", event_id)
        .eq("user_id", user_id)
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo actualizar el evento",
        )

    return response.data[0]


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(event_id: str, user_id: str):
    client = get_client()
    existing = (
        client.table(TABLE)
        .select("id")
        .eq("id", event_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evento no encontrado o no pertenece al usuario",
        )

    client.table(TABLE).delete().eq("id", event_id).eq("user_id", user_id).execute()
    return None


@router.get("/stats/summary", response_model=dict)
def get_calendar_summary(user_id: str):
    """Resumen del calendario: pendientes, completados y próximos eventos."""
    from datetime import date

    client = get_client()
    today = date.today().isoformat()

    events = (
        client.table(TABLE)
        .select("id, title, event_date, event_time, event_type, is_completed")
        .eq("user_id", user_id)
        .execute()
    ).data or []

    pending = [event for event in events if not event.get("is_completed")]
    completed = [event for event in events if event.get("is_completed")]
    upcoming = sorted(
        (event for event in pending if event.get("event_date") >= today),
        key=lambda event: (event.get("event_date"), event.get("event_time") or ""),
    )[:5]

    return {
        "total_events": len(events),
        "pending_events": len(pending),
        "completed_events": len(completed),
        "urgent_pending": sum(
            1 for event in pending if event.get("event_type") == "Urgente"
        ),
        "upcoming": upcoming,
    }
