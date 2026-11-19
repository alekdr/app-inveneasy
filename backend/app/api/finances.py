"""
Finances API - Transacciones, lista de compras y ahorros

Tablas en Supabase PostgreSQL:
  - `financial_transactions`
  - `shopping_items`
  - `savings`
"""
from datetime import date, datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, status
from supabase import Client, create_client

from app.core.config import get_settings
from app.models.schemas import (
    SavingCreate,
    SavingInDB,
    ShoppingItemCreate,
    ShoppingItemInDB,
    ShoppingItemUpdate,
    TransactionCreate,
    TransactionInDB,
    TransactionUpdate,
)

router = APIRouter(prefix="/finances", tags=["finances"])

TX_TABLE = "financial_transactions"
SHOPPING_TABLE = "shopping_items"
SAVINGS_TABLE = "savings"

TX_TYPES = ("income", "expense")
SAVING_TYPES = ("digital", "efectivo")


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
# Transacciones
# ============================================================

@router.get("/transactions", response_model=list[TransactionInDB])
def list_transactions(
    user_id: str,
    tx_type: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    category: Optional[str] = None,
):
    query = get_client().table(TX_TABLE).select("*").eq("user_id", user_id)

    if tx_type:
        query = query.eq("type", tx_type)
    if category:
        query = query.eq("category", category)
    if start_date:
        query = query.gte("transaction_date", start_date)
    if end_date:
        query = query.lte("transaction_date", end_date)

    response = query.order("transaction_date", desc=True).execute()
    return response.data or []


@router.post(
    "/transactions",
    response_model=TransactionInDB,
    status_code=status.HTTP_201_CREATED,
)
def create_transaction(tx: TransactionCreate, user_id: str):
    if tx.type not in TX_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"type debe ser uno de: {', '.join(TX_TYPES)}",
        )

    payload = tx.model_dump(mode="json")
    payload["user_id"] = user_id
    payload["transaction_date"] = tx.transaction_date or date.today().isoformat()

    response = get_client().table(TX_TABLE).insert(payload).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo crear la transacción",
        )

    return response.data[0]


@router.put("/transactions/{tx_id}", response_model=TransactionInDB)
def update_transaction(tx_id: str, tx: TransactionUpdate, user_id: str):
    payload = tx.model_dump(exclude_unset=True, mode="json")
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No hay campos para actualizar",
        )

    if payload.get("type") and payload["type"] not in TX_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"type debe ser uno de: {', '.join(TX_TYPES)}",
        )

    response = (
        get_client()
        .table(TX_TABLE)
        .update(payload)
        .eq("id", tx_id)
        .eq("user_id", user_id)
        .execute()
    )

    if not response.data:
        raise _not_found("Transacción no encontrada o no pertenece al usuario")

    return response.data[0]


@router.delete("/transactions/{tx_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(tx_id: str, user_id: str):
    client = get_client()
    existing = (
        client.table(TX_TABLE)
        .select("id")
        .eq("id", tx_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not existing.data:
        raise _not_found("Transacción no encontrada o no pertenece al usuario")

    client.table(TX_TABLE).delete().eq("id", tx_id).eq("user_id", user_id).execute()
    return None


# ============================================================
# Lista de compras
# ============================================================

@router.get("/shopping", response_model=list[ShoppingItemInDB])
def list_shopping(user_id: str, only_pending: bool = False):
    query = get_client().table(SHOPPING_TABLE).select("*").eq("user_id", user_id)
    if only_pending:
        query = query.eq("is_purchased", False)
    response = query.order("created_at", desc=True).execute()
    return response.data or []


@router.post(
    "/shopping", response_model=ShoppingItemInDB, status_code=status.HTTP_201_CREATED
)
def create_shopping_item(item: ShoppingItemCreate, user_id: str):
    payload = item.model_dump(mode="json")
    payload["user_id"] = user_id

    response = get_client().table(SHOPPING_TABLE).insert(payload).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo crear el ítem de compra",
        )

    return response.data[0]


@router.put("/shopping/{item_id}", response_model=ShoppingItemInDB)
def update_shopping_item(item_id: str, item: ShoppingItemUpdate, user_id: str):
    payload = item.model_dump(exclude_unset=True, mode="json")
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No hay campos para actualizar",
        )

    if payload.get("is_purchased") and not payload.get("purchased_date"):
        payload["purchased_date"] = date.today().isoformat()

    response = (
        get_client()
        .table(SHOPPING_TABLE)
        .update(payload)
        .eq("id", item_id)
        .eq("user_id", user_id)
        .execute()
    )

    if not response.data:
        raise _not_found("Ítem no encontrado o no pertenece al usuario")

    return response.data[0]


@router.delete("/shopping/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_shopping_item(item_id: str, user_id: str):
    client = get_client()
    existing = (
        client.table(SHOPPING_TABLE)
        .select("id")
        .eq("id", item_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not existing.data:
        raise _not_found("Ítem no encontrado o no pertenece al usuario")

    client.table(SHOPPING_TABLE).delete().eq("id", item_id).eq(
        "user_id", user_id
    ).execute()
    return None


# ============================================================
# Ahorros
# ============================================================

@router.get("/savings", response_model=list[SavingInDB])
def list_savings(user_id: str, saving_type: Optional[str] = None):
    query = get_client().table(SAVINGS_TABLE).select("*").eq("user_id", user_id)
    if saving_type:
        query = query.eq("saving_type", saving_type)
    response = query.order("saving_date", desc=True).execute()
    return response.data or []


@router.post("/savings", response_model=SavingInDB, status_code=status.HTTP_201_CREATED)
def create_saving(saving: SavingCreate, user_id: str):
    if saving.saving_type not in SAVING_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"saving_type debe ser uno de: {', '.join(SAVING_TYPES)}",
        )

    payload = saving.model_dump(mode="json")
    payload["user_id"] = user_id
    payload["saving_date"] = saving.saving_date or date.today().isoformat()

    response = get_client().table(SAVINGS_TABLE).insert(payload).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo registrar el ahorro",
        )

    return response.data[0]


@router.delete("/savings/{saving_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_saving(saving_id: str, user_id: str):
    client = get_client()
    existing = (
        client.table(SAVINGS_TABLE)
        .select("id")
        .eq("id", saving_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not existing.data:
        raise _not_found("Ahorro no encontrado o no pertenece al usuario")

    client.table(SAVINGS_TABLE).delete().eq("id", saving_id).eq(
        "user_id", user_id
    ).execute()
    return None


# ============================================================
# Resumen
# ============================================================

@router.get("/stats/summary", response_model=dict)
def get_finances_summary(user_id: str):
    """Resumen financiero total: ingresos, gastos, balance y ahorros."""
    client = get_client()

    transactions = (
        client.table(TX_TABLE).select("type, amount").eq("user_id", user_id).execute()
    ).data or []
    savings = (
        client.table(SAVINGS_TABLE)
        .select("amount, saving_type")
        .eq("user_id", user_id)
        .execute()
    ).data or []
    shopping = (
        client.table(SHOPPING_TABLE)
        .select("estimated_price, actual_price, is_purchased")
        .eq("user_id", user_id)
        .execute()
    ).data or []

    income = sum(
        float(tx["amount"]) for tx in transactions if tx.get("type") == "income"
    )
    expenses = sum(
        float(tx["amount"]) for tx in transactions if tx.get("type") == "expense"
    )

    savings_total = sum(float(item["amount"]) for item in savings)
    savings_digital = sum(
        float(item["amount"]) for item in savings if item.get("saving_type") == "digital"
    )
    savings_cash = sum(
        float(item["amount"]) for item in savings if item.get("saving_type") == "efectivo"
    )

    pending_shopping = [
        item for item in shopping if not item.get("is_purchased")
    ]

    return {
        "total_income": round(income, 2),
        "total_expenses": round(expenses, 2),
        "balance": round(income - expenses, 2),
        "savings_total": round(savings_total, 2),
        "savings_digital": round(savings_digital, 2),
        "savings_cash": round(savings_cash, 2),
        "shopping_pending": len(pending_shopping),
        "shopping_pending_estimate": round(
            sum(float(item.get("estimated_price") or 0) for item in pending_shopping), 2
        ),
    }
