"""
Notifications API - Registro de dispositivos y preferencias

Los tokens push (FCM/APNs) viven en `public.notification_devices`.
Las preferencias por usuario viven en `public.notification_preferences`.

NOTA: El envío real de push requiere configurar credenciales FCM/APNs
(ver README de notificaciones). Este router expone los endpoints base.
"""
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, status
from supabase import Client, create_client

from app.core.config import get_settings
from app.models.schemas import DeviceRegister, NotificationPreferences, NotificationSend

router = APIRouter(prefix="/notifications", tags=["notifications"])

DEVICES_TABLE = "notification_devices"
PREFS_TABLE = "notification_preferences"
PLATFORMS = ("android", "ios", "web")


def get_client() -> Client:
    settings = get_settings()
    key = settings.supabase_service_key or settings.supabase_key

    if not settings.supabase_url or not key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase no está configurado en el backend",
        )

    return create_client(settings.supabase_url, key)


@router.post("/register-device", status_code=status.HTTP_201_CREATED)
def register_device(device: DeviceRegister):
    """Registra (o actualiza) el token push de un dispositivo."""
    if device.platform not in PLATFORMS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"platform debe ser uno de: {', '.join(PLATFORMS)}",
        )

    payload = {
        "user_id": device.user_id,
        "token": device.token,
        "platform": device.platform,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    response = (
        get_client()
        .table(DEVICES_TABLE)
        .upsert(payload, on_conflict="user_id,token")
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo registrar el dispositivo",
        )

    return {"ok": True, "id": response.data[0].get("id")}


@router.delete("/unregister-device", status_code=status.HTTP_204_NO_CONTENT)
def unregister_device(user_id: str, token: str):
    """Elimina un token push (ej. al cerrar sesión o desinstalar)."""
    get_client().table(DEVICES_TABLE).delete().eq("user_id", user_id).eq("token", token).execute()
    return None


@router.get("/devices", response_model=list[dict])
def list_devices(user_id: str):
    """Lista los dispositivos registrados del usuario."""
    response = (
        get_client()
        .table(DEVICES_TABLE)
        .select("id, platform, created_at, updated_at")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return response.data or []


@router.get("/preferences", response_model=NotificationPreferences)
def get_preferences(user_id: str):
    """Obtiene las preferencias de notificaciones (crea las de defecto si faltan)."""
    client = get_client()
    response = (
        client.table(PREFS_TABLE).select("*").eq("user_id", user_id).execute()
    )

    if response.data:
        return response.data[0]

    created = client.table(PREFS_TABLE).insert({"user_id": user_id}).execute()
    if not created.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudieron crear las preferencias",
        )
    return created.data[0]


@router.put("/preferences", response_model=NotificationPreferences)
def update_preferences(user_id: str, prefs: NotificationPreferences):
    """Actualiza las preferencias de notificaciones del usuario."""
    payload = prefs.model_dump()
    payload["user_id"] = user_id
    payload["updated_at"] = datetime.now(timezone.utc).isoformat()

    response = (
        get_client()
        .table(PREFS_TABLE)
        .upsert(payload, on_conflict="user_id")
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudieron actualizar las preferencias",
        )

    return response.data[0]


@router.post("/send", status_code=status.HTTP_501_NOT_IMPLEMENTED)
def send_notification(payload: NotificationSend, dry_run: Optional[bool] = True):
    """
    Envía una notificación push al usuario (placeholder).

    Para activarlo:
      1. Configurar FCM en Android (google-services.json + FCM_SERVER_KEY).
      2. Configurar APNs en iOS (AuthKey .p8 + Key ID + Team ID).
      3. Instalar `fcm-py` / `pyapns2` en requirements.
      4. Implementar el envío real aquí usando los tokens de `notification_devices`.
    """
    if dry_run:
        devices = (
            get_client()
            .table(DEVICES_TABLE)
            .select("id, platform")
            .eq("user_id", payload.user_id)
            .execute()
        )
        return {
            "dry_run": True,
            "would_send_to": devices.data or [],
            "title": payload.title,
            "body": payload.body,
        }

    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail=(
            "El envío real requiere configurar credenciales FCM/APNs. "
            "Usa dry_run=true para simular."
        ),
    )
