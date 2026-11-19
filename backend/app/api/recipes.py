"""
Recipes API - Recetas de cocina, medicinales y otras

Las recetas viven en la tabla `public.recipes` de Supabase PostgreSQL.
El historial de recetas cocinadas vive en `public.recipe_logs`.
"""
from datetime import date, datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, status
from supabase import Client, create_client

from app.core.config import get_settings
from app.models.schemas import (
    RecipeCreate,
    RecipeInDB,
    RecipeLogCreate,
    RecipeLogInDB,
    RecipeUpdate,
)

router = APIRouter(prefix="/recipes", tags=["recipes"])

TABLE = "recipes"
LOGS_TABLE = "recipe_logs"
CATEGORIES = ("comida", "medicinal", "postre", "bebida", "otro")
DIFFICULTIES = ("facil", "media", "dificil")


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


def _validate_category(category: Optional[str]) -> None:
    if category and category not in CATEGORIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"category debe ser uno de: {', '.join(CATEGORIES)}",
        )


def _validate_difficulty(difficulty: Optional[str]) -> None:
    if difficulty and difficulty not in DIFFICULTIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"difficulty debe ser uno de: {', '.join(DIFFICULTIES)}",
        )


# ============================================================
# CRUD de recetas
# ============================================================

@router.get("/", response_model=list[RecipeInDB])
def list_recipes(
    user_id: str,
    category: Optional[str] = None,
    difficulty: Optional[str] = None,
    only_favorites: bool = False,
    search: Optional[str] = None,
):
    """Lista las recetas de un usuario con filtros opcionales."""
    _validate_category(category)
    _validate_difficulty(difficulty)

    query = get_client().table(TABLE).select("*").eq("user_id", user_id)

    if category:
        query = query.eq("category", category)
    if difficulty:
        query = query.eq("difficulty", difficulty)
    if only_favorites:
        query = query.eq("is_favorite", True)
    if search:
        term = search.replace("%", "").replace(",", "")
        query = query.or_(f"title.ilike.%{term}%,description.ilike.%{term}%")

    response = query.order("created_at", desc=True).execute()
    return response.data or []


@router.get("/stats/summary", response_model=dict)
def get_recipes_summary(user_id: str):
    """Resumen estadístico de las recetas del usuario."""
    client = get_client()
    recipes_res = client.table(TABLE).select("id, category, is_favorite").eq("user_id", user_id).execute()
    recipes = recipes_res.data or []

    first_day = date.today().replace(day=1).isoformat()
    logs_res = (
        client.table(LOGS_TABLE)
        .select("id, cooked_date")
        .eq("user_id", user_id)
        .gte("cooked_date", first_day)
        .execute()
    )

    by_category: dict[str, int] = {cat: 0 for cat in CATEGORIES}
    for recipe in recipes:
        cat = recipe.get("category")
        if cat in by_category:
            by_category[cat] += 1

    return {
        "total": len(recipes),
        "favorites": sum(1 for r in recipes if r.get("is_favorite")),
        "cooked_this_month": len(logs_res.data or []),
        "by_category": by_category,
    }


@router.get("/{recipe_id}", response_model=RecipeInDB)
def get_recipe(recipe_id: str, user_id: str):
    """Obtiene una receta específica del usuario."""
    response = (
        get_client()
        .table(TABLE)
        .select("*")
        .eq("id", recipe_id)
        .eq("user_id", user_id)
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Receta no encontrada o no pertenece al usuario",
        )

    return response.data[0]


@router.post("/", response_model=RecipeInDB, status_code=status.HTTP_201_CREATED)
def create_recipe(recipe: RecipeCreate, user_id: str):
    """Crea una nueva receta para el usuario."""
    _validate_category(recipe.category)
    _validate_difficulty(recipe.difficulty)

    payload = recipe.model_dump(mode="json")
    payload["user_id"] = user_id

    response = get_client().table(TABLE).insert(payload).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo crear la receta",
        )

    return response.data[0]


@router.put("/{recipe_id}", response_model=RecipeInDB)
def update_recipe(recipe_id: str, recipe_update: RecipeUpdate, user_id: str):
    """Actualiza una receta existente del usuario."""
    payload = recipe_update.model_dump(exclude_unset=True, mode="json")

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No hay campos para actualizar",
        )

    _validate_category(payload.get("category"))
    _validate_difficulty(payload.get("difficulty"))

    payload["updated_at"] = datetime.now(timezone.utc).isoformat()

    response = (
        get_client()
        .table(TABLE)
        .update(payload)
        .eq("id", recipe_id)
        .eq("user_id", user_id)
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Receta no encontrada o no pertenece al usuario",
        )

    return response.data[0]


@router.delete("/{recipe_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_recipe(recipe_id: str, user_id: str):
    """Elimina una receta del usuario."""
    client = get_client()
    existing = (
        client.table(TABLE)
        .select("id")
        .eq("id", recipe_id)
        .eq("user_id", user_id)
        .execute()
    )

    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Receta no encontrada o no pertenece al usuario",
        )

    client.table(TABLE).delete().eq("id", recipe_id).eq("user_id", user_id).execute()
    return None


# ============================================================
# Historial de recetas cocinadas
# ============================================================

@router.post(
    "/{recipe_id}/cook",
    response_model=RecipeLogInDB,
    status_code=status.HTTP_201_CREATED,
)
def cook_recipe(recipe_id: str, log: RecipeLogCreate, user_id: str):
    """Registra que el usuario cocinó una receta (con rating opcional)."""
    client = get_client()

    existing = (
        client.table(TABLE)
        .select("id")
        .eq("id", recipe_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Receta no encontrada o no pertenece al usuario",
        )

    payload = {
        "recipe_id": recipe_id,
        "user_id": user_id,
        "cooked_date": log.cooked_date or date.today().isoformat(),
        "rating": log.rating,
        "notes": log.notes,
    }

    response = client.table(LOGS_TABLE).insert(payload).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo registrar la receta cocinada",
        )

    return response.data[0]


@router.get("/{recipe_id}/logs", response_model=list[RecipeLogInDB])
def list_recipe_logs(
    recipe_id: str,
    user_id: str,
    limit: int = Query(default=50, ge=1, le=200),
):
    """Historial de veces que se cocinó una receta."""
    response = (
        get_client()
        .table(LOGS_TABLE)
        .select("*")
        .eq("recipe_id", recipe_id)
        .eq("user_id", user_id)
        .order("cooked_date", desc=True)
        .limit(limit)
        .execute()
    )
    return response.data or []
