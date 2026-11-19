"""
Closet API - Armario digital: categorías, subcategorías e ítems

Las tablas viven en Supabase PostgreSQL (`closet_categories`,
`closet_subcategories`, `closet_items`).
"""
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, status
from supabase import Client, create_client

from app.core.config import get_settings
from app.models.schemas import (
    ClosetCategoryCreate,
    ClosetCategoryInDB,
    ClosetItemCreate,
    ClosetItemInDB,
    ClosetItemUpdate,
    ClosetSubcategoryCreate,
    ClosetSubcategoryInDB,
)

router = APIRouter(prefix="/closet", tags=["closet"])

CATEGORIES_TABLE = "closet_categories"
SUBCATEGORIES_TABLE = "closet_subcategories"
ITEMS_TABLE = "closet_items"


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


def _not_found(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


# ============================================================
# Categorías
# ============================================================

@router.get("/categories", response_model=list[ClosetCategoryInDB])
def list_categories(user_id: str):
    response = (
        get_client()
        .table(CATEGORIES_TABLE)
        .select("*")
        .eq("user_id", user_id)
        .order("sort_order")
        .execute()
    )
    return response.data or []


@router.post(
    "/categories",
    response_model=ClosetCategoryInDB,
    status_code=status.HTTP_201_CREATED,
)
def create_category(category: ClosetCategoryCreate, user_id: str):
    payload = category.model_dump(mode="json")
    payload["user_id"] = user_id

    response = get_client().table(CATEGORIES_TABLE).insert(payload).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo crear la categoría",
        )

    return response.data[0]


@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(category_id: str, user_id: str):
    client = get_client()
    existing = (
        client.table(CATEGORIES_TABLE)
        .select("id")
        .eq("id", category_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not existing.data:
        raise _not_found("Categoría no encontrada o no pertenece al usuario")

    client.table(CATEGORIES_TABLE).delete().eq("id", category_id).eq(
        "user_id", user_id
    ).execute()
    return None


# ============================================================
# Subcategorías
# ============================================================

@router.get("/subcategories", response_model=list[ClosetSubcategoryInDB])
def list_subcategories(user_id: str, category_id: str | None = None):
    query = get_client().table(SUBCATEGORIES_TABLE).select("*").eq("user_id", user_id)
    if category_id:
        query = query.eq("category_id", category_id)
    response = query.order("sort_order").execute()
    return response.data or []


@router.post(
    "/subcategories",
    response_model=ClosetSubcategoryInDB,
    status_code=status.HTTP_201_CREATED,
)
def create_subcategory(subcategory: ClosetSubcategoryCreate, user_id: str):
    payload = subcategory.model_dump(mode="json")
    payload["user_id"] = user_id

    response = get_client().table(SUBCATEGORIES_TABLE).insert(payload).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo crear la subcategoría",
        )

    return response.data[0]


@router.delete("/subcategories/{subcategory_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_subcategory(subcategory_id: str, user_id: str):
    client = get_client()
    existing = (
        client.table(SUBCATEGORIES_TABLE)
        .select("id")
        .eq("id", subcategory_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not existing.data:
        raise _not_found("Subcategoría no encontrada o no pertenece al usuario")

    client.table(SUBCATEGORIES_TABLE).delete().eq("id", subcategory_id).eq(
        "user_id", user_id
    ).execute()
    return None


# ============================================================
# Ítems
# ============================================================

@router.get("/items", response_model=list[ClosetItemInDB])
def list_items(user_id: str, subcategory_id: str | None = None):
    query = get_client().table(ITEMS_TABLE).select("*").eq("user_id", user_id)
    if subcategory_id:
        query = query.eq("subcategory_id", subcategory_id)
    response = query.order("created_at", desc=True).execute()
    return response.data or []


@router.post("/items", response_model=ClosetItemInDB, status_code=status.HTTP_201_CREATED)
def create_item(item: ClosetItemCreate, user_id: str):
    payload = item.model_dump(mode="json")
    payload["user_id"] = user_id

    response = get_client().table(ITEMS_TABLE).insert(payload).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo crear el ítem",
        )

    return response.data[0]


@router.put("/items/{item_id}", response_model=ClosetItemInDB)
def update_item(item_id: str, item: ClosetItemUpdate, user_id: str):
    payload = item.model_dump(exclude_unset=True, mode="json")
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No hay campos para actualizar",
        )

    payload["updated_at"] = datetime.now(timezone.utc).isoformat()

    response = (
        get_client()
        .table(ITEMS_TABLE)
        .update(payload)
        .eq("id", item_id)
        .eq("user_id", user_id)
        .execute()
    )

    if not response.data:
        raise _not_found("Ítem no encontrado o no pertenece al usuario")

    return response.data[0]


@router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(item_id: str, user_id: str):
    client = get_client()
    existing = (
        client.table(ITEMS_TABLE)
        .select("id")
        .eq("id", item_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not existing.data:
        raise _not_found("Ítem no encontrado o no pertenece al usuario")

    client.table(ITEMS_TABLE).delete().eq("id", item_id).eq("user_id", user_id).execute()
    return None


@router.get("/stats/summary", response_model=dict)
def get_closet_summary(user_id: str):
    """Resumen del armario: totales por categoría y subcategoría."""
    client = get_client()
    categories = (
        client.table(CATEGORIES_TABLE)
        .select("id, name")
        .eq("user_id", user_id)
        .order("sort_order")
        .execute()
    ).data or []
    subcategories = (
        client.table(SUBCATEGORIES_TABLE)
        .select("id, name, category_id")
        .eq("user_id", user_id)
        .execute()
    ).data or []
    items = (
        client.table(ITEMS_TABLE)
        .select("id, subcategory_id")
        .eq("user_id", user_id)
        .execute()
    ).data or []

    items_by_sub = {}
    for item in items:
        sub_id = item.get("subcategory_id")
        items_by_sub[sub_id] = items_by_sub.get(sub_id, 0) + 1

    subs_by_cat = {}
    for sub in subcategories:
        cat_id = sub.get("category_id")
        subs_by_cat.setdefault(cat_id, []).append(
            {"id": sub["id"], "name": sub["name"], "items": items_by_sub.get(sub["id"], 0)}
        )

    return {
        "total_items": len(items),
        "total_categories": len(categories),
        "total_subcategories": len(subcategories),
        "categories": [
            {
                "id": cat["id"],
                "name": cat["name"],
                "subcategories": subs_by_cat.get(cat["id"], []),
            }
            for cat in categories
        ],
    }
