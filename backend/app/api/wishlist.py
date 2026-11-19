"""
Wishlist API - Lista de deseos

Los ítems viven en `public.wishlist_items`.
"""
from datetime import date, datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, status
from supabase import Client, create_client

from app.core.config import get_settings
from app.models.schemas import (
    WishlistItemCreate,
    WishlistItemInDB,
    WishlistItemUpdate,
)

router = APIRouter(prefix="/wishlist", tags=["wishlist"])

TABLE = "wishlist_items"


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


@router.get("/", response_model=list[WishlistItemInDB])
def list_items(
    user_id: str,
    category: Optional[str] = None,
    only_pending: bool = False,
    search: Optional[str] = None,
):
    query = get_client().table(TABLE).select("*").eq("user_id", user_id)

    if category:
        query = query.eq("category", category)
    if only_pending:
        query = query.eq("is_purchased", False)
    if search:
        query = query.ilike("title", f"%{search}%")

    response = query.order("created_at", desc=True).execute()
    return response.data or []


@router.post("/", response_model=WishlistItemInDB, status_code=status.HTTP_201_CREATED)
def create_item(item: WishlistItemCreate, user_id: str):
    payload = item.model_dump(mode="json")
    payload["user_id"] = user_id

    response = get_client().table(TABLE).insert(payload).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo crear el ítem",
        )

    return response.data[0]


@router.put("/{item_id}", response_model=WishlistItemInDB)
def update_item(item_id: str, item: WishlistItemUpdate, user_id: str):
    payload = item.model_dump(exclude_unset=True, mode="json")
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No hay campos para actualizar",
        )

    if payload.get("is_purchased") and not payload.get("purchased_date"):
        payload["purchased_date"] = date.today().isoformat()

    payload["updated_at"] = datetime.now(timezone.utc).isoformat()

    response = (
        get_client()
        .table(TABLE)
        .update(payload)
        .eq("id", item_id)
        .eq("user_id", user_id)
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ítem no encontrado o no pertenece al usuario",
        )

    return response.data[0]


@router.patch("/{item_id}/toggle-purchased", response_model=WishlistItemInDB)
def toggle_purchased(item_id: str, user_id: str):
    """Marca o desmarca un ítem como comprado."""
    client = get_client()
    existing = (
        client.table(TABLE)
        .select("is_purchased")
        .eq("id", item_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ítem no encontrado o no pertenece al usuario",
        )

    purchased = not existing.data[0].get("is_purchased", False)
    payload = {
        "is_purchased": purchased,
        "purchased_date": date.today().isoformat() if purchased else None,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    response = (
        client.table(TABLE)
        .update(payload)
        .eq("id", item_id)
        .eq("user_id", user_id)
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo actualizar el ítem",
        )

    return response.data[0]


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(item_id: str, user_id: str):
    client = get_client()
    existing = (
        client.table(TABLE)
        .select("id")
        .eq("id", item_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ítem no encontrado o no pertenece al usuario",
        )

    client.table(TABLE).delete().eq("id", item_id).eq("user_id", user_id).execute()
    return None


@router.get("/stats/summary", response_model=dict)
def get_wishlist_summary(user_id: str):
    """Resumen de la lista de deseos: pendientes, comprados y valor estimado."""
    items = (
        get_client()
        .table(TABLE)
        .select("estimated_price, is_purchased, category")
        .eq("user_id", user_id)
        .execute()
    ).data or []

    pending = [item for item in items if not item.get("is_purchased")]
    purchased = [item for item in items if item.get("is_purchased")]

    by_category = {}
    for item in pending:
        category = item.get("category") or "General"
        by_category[category] = by_category.get(category, 0) + 1

    return {
        "total_items": len(items),
        "pending_items": len(pending),
        "purchased_items": len(purchased),
        "pending_estimated_value": round(
            sum(float(item.get("estimated_price") or 0) for item in pending), 2
        ),
        "purchased_value": round(
            sum(float(item.get("estimated_price") or 0) for item in purchased), 2
        ),
        "by_category": by_category,
    }
