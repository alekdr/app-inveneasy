# Pydantic models para la API
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class GoalBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200, description="Título de la meta")
    description: Optional[str] = Field(
        None, max_length=500, description="Descripción opcional de la meta"
    )
    target_date: datetime = Field(..., description="Fecha objetivo de la meta")
    goal_type: str = Field(
        ..., description="Tipo de meta: short_term, medium_term, long_term"
    )
    category: str = Field(
        default="personal",
        description="Categoría: personal, finanzas, salud, carrera, etc.",
    )
    target_value: Optional[float] = Field(
        None, description="Valor objetivo medible (ej. monto, peso)"
    )
    unit: Optional[str] = Field(
        None, description="Unidad de medida (ej. monedas, kg, km)"
    )


class GoalCreate(GoalBase):
    pass


class GoalUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=500)
    target_date: Optional[datetime] = None
    goal_type: Optional[str] = Field(None, description="Tipo de meta")
    category: Optional[str] = Field(None, description="Categoría de la meta")
    target_value: Optional[float] = Field(None, description="Valor objetivo")
    unit: Optional[str] = Field(None, description="Unidad de medida")
    current_value: Optional[float] = Field(None, description="Valor actual acumulado")
    is_completed: Optional[bool] = None


class GoalInDB(GoalBase):
    id: str
    user_id: str
    current_value: float = Field(default=0, description="Valor actual acumulado")
    is_completed: bool = Field(default=False, description="Meta completada")
    completed_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class GoalProgress(BaseModel):
    """Progreso actual de una meta"""

    goal_id: str
    title: str
    goal_type: str
    target_date: datetime
    current_value: float
    target_value: Optional[float]
    unit: Optional[str]
    progress_percent: float = Field(description="Calculado a partir de current/target")
    is_completed: bool
    days_remaining: Optional[int] = Field(
        None, description="Días restantes hasta la fecha objetivo"
    )


# ============================================================
# Recetas
# ============================================================

class RecipeIngredient(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    amount: Optional[float] = Field(None, description="Cantidad numérica (ej. 200)")
    unit: Optional[str] = Field(None, max_length=30, description="g, ml, taza, cda...")
    notes: Optional[str] = Field(None, max_length=200)


class RecipeBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    category: str = Field(default="comida")
    difficulty: str = Field(default="facil")
    prep_time_minutes: Optional[int] = Field(None, ge=0)
    cook_time_minutes: Optional[int] = Field(None, ge=0)
    servings: int = Field(default=1, ge=1)
    ingredients: list[RecipeIngredient] = Field(default_factory=list)
    instructions: list[str] = Field(default_factory=list)
    image_url: Optional[str] = None
    cloudinary_public_id: Optional[str] = None
    tags: list[str] = Field(default_factory=list)
    is_favorite: bool = False
    source_url: Optional[str] = None


class RecipeCreate(RecipeBase):
    pass


class RecipeUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    category: Optional[str] = None
    difficulty: Optional[str] = None
    prep_time_minutes: Optional[int] = Field(None, ge=0)
    cook_time_minutes: Optional[int] = Field(None, ge=0)
    servings: Optional[int] = Field(None, ge=1)
    ingredients: Optional[list[RecipeIngredient]] = None
    instructions: Optional[list[str]] = None
    image_url: Optional[str] = None
    cloudinary_public_id: Optional[str] = None
    tags: Optional[list[str]] = None
    is_favorite: Optional[bool] = None
    source_url: Optional[str] = None


class RecipeInDB(RecipeBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class RecipeLogCreate(BaseModel):
    cooked_date: Optional[str] = None
    rating: Optional[int] = Field(None, ge=1, le=5)
    notes: Optional[str] = Field(None, max_length=500)


class RecipeLogInDB(BaseModel):
    id: str
    recipe_id: str
    user_id: str
    cooked_date: str
    rating: Optional[int] = None
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================================
# Notificaciones
# ============================================================

class DeviceRegister(BaseModel):
    user_id: str
    token: str = Field(..., min_length=8)
    platform: str = Field(default="android", description="android | ios | web")


class NotificationPreferences(BaseModel):
    routines: bool = True
    habits: bool = True
    calendar: bool = True
    budgets: bool = True
    fixed_expenses: bool = True
    debts: bool = True
    weekly_summary: bool = True


class NotificationSend(BaseModel):
    """Payload interno para enviar una notificación push."""

    user_id: str
    title: str = Field(..., min_length=1, max_length=120)
    body: str = Field(..., min_length=1, max_length=500)
    data: Optional[dict] = None


# ============================================================
# Closet
# ============================================================

class ClosetCategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=80)
    icon_url: Optional[str] = None
    sort_order: int = 0


class ClosetCategoryCreate(ClosetCategoryBase):
    pass


class ClosetCategoryInDB(ClosetCategoryBase):
    id: str
    user_id: str
    created_at: datetime

    class Config:
        from_attributes = True


class ClosetSubcategoryBase(BaseModel):
    category_id: str
    name: str = Field(..., min_length=1, max_length=80)
    icon_url: Optional[str] = None
    sort_order: int = 0


class ClosetSubcategoryCreate(ClosetSubcategoryBase):
    pass


class ClosetSubcategoryInDB(ClosetSubcategoryBase):
    id: str
    user_id: str
    created_at: datetime

    class Config:
        from_attributes = True


class ClosetItemBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    image_url: Optional[str] = None
    cloudinary_public_id: Optional[str] = None


class ClosetItemCreate(ClosetItemBase):
    subcategory_id: str


class ClosetItemUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=120)
    subcategory_id: Optional[str] = None
    image_url: Optional[str] = None
    cloudinary_public_id: Optional[str] = None


class ClosetItemInDB(ClosetItemBase):
    id: str
    user_id: str
    subcategory_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============================================================
# Rutinas
# ============================================================

class RoutineBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=160)
    time_of_day: Optional[str] = Field(None, description="HH:MM:SS")
    frequency: str = Field(default="daily", description="daily | weekly | monthly | custom")
    is_active: bool = True


class RoutineCreate(RoutineBase):
    pass


class RoutineUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=160)
    time_of_day: Optional[str] = None
    frequency: Optional[str] = None
    is_active: Optional[bool] = None


class RoutineInDB(RoutineBase):
    id: str
    user_id: str
    created_at: datetime

    class Config:
        from_attributes = True


class RoutineLogCreate(BaseModel):
    routine_id: str
    log_date: Optional[str] = Field(None, description="YYYY-MM-DD; por defecto hoy")
    status: str = Field(..., description="completed | uncompleted | pending")


class RoutineLogInDB(BaseModel):
    id: str
    routine_id: str
    user_id: str
    log_date: str
    status: str
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============================================================
# Finanzas
# ============================================================

class TransactionBase(BaseModel):
    type: str = Field(..., description="income | expense")
    amount: float = Field(..., gt=0)
    category: str = Field(..., min_length=1, max_length=80)
    description: Optional[str] = Field(None, max_length=300)
    transaction_date: Optional[str] = Field(None, description="YYYY-MM-DD")


class TransactionCreate(TransactionBase):
    pass


class TransactionUpdate(BaseModel):
    type: Optional[str] = None
    amount: Optional[float] = Field(None, gt=0)
    category: Optional[str] = None
    description: Optional[str] = None
    transaction_date: Optional[str] = None


class TransactionInDB(TransactionBase):
    id: str
    user_id: str
    transaction_date: str
    created_at: datetime

    class Config:
        from_attributes = True


class ShoppingItemBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=160)
    estimated_price: float = 0
    actual_price: Optional[float] = None
    is_purchased: bool = False
    purchased_date: Optional[str] = None


class ShoppingItemCreate(ShoppingItemBase):
    pass


class ShoppingItemUpdate(BaseModel):
    name: Optional[str] = None
    estimated_price: Optional[float] = None
    actual_price: Optional[float] = None
    is_purchased: Optional[bool] = None
    purchased_date: Optional[str] = None


class ShoppingItemInDB(ShoppingItemBase):
    id: str
    user_id: str
    created_at: datetime

    class Config:
        from_attributes = True


class SavingBase(BaseModel):
    amount: float = Field(..., gt=0)
    saving_type: str = Field(default="digital", description="digital | efectivo")
    saving_date: Optional[str] = None
    notes: Optional[str] = None


class SavingCreate(SavingBase):
    pass


class SavingInDB(SavingBase):
    id: str
    user_id: str
    saving_date: str
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================================
# Hábitos
# ============================================================

class HabitBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    icon_name: str = "IoFlameOutline"
    color: str = "#6b5ce7"
    frequency: str = Field(default="daily", description="daily | weekdays | weekends | custom")
    reminder_time: Optional[str] = Field(None, description="HH:MM:SS")
    is_measurable: bool = False
    target_value: float = 1
    unit: Optional[str] = None
    is_active: bool = True


class HabitCreate(HabitBase):
    pass


class HabitUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=120)
    icon_name: Optional[str] = None
    color: Optional[str] = None
    frequency: Optional[str] = None
    reminder_time: Optional[str] = None
    is_measurable: Optional[bool] = None
    target_value: Optional[float] = None
    unit: Optional[str] = None
    is_active: Optional[bool] = None


class HabitInDB(HabitBase):
    id: str
    user_id: str
    current_streak: int = 0
    best_streak: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


class HabitLogCreate(BaseModel):
    habit_id: str
    log_date: Optional[str] = Field(None, description="YYYY-MM-DD; por defecto hoy")
    progress_value: float = 0
    status: str = Field(..., description="completed | skipped | pending")


class HabitLogInDB(BaseModel):
    id: str
    habit_id: str
    user_id: str
    log_date: str
    progress_value: float
    status: str
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============================================================
# Calendario
# ============================================================

class CalendarEventBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=160)
    description: Optional[str] = Field(None, max_length=500)
    event_date: str = Field(..., description="YYYY-MM-DD")
    event_time: Optional[str] = Field(None, description="HH:MM:SS")
    event_type: str = Field(
        default="Recordatorio",
        description="Evento | Recordatorio | Tarea | Urgente | Importante | Meta | Idea",
    )
    is_completed: bool = False


class CalendarEventCreate(CalendarEventBase):
    pass


class CalendarEventUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=160)
    description: Optional[str] = None
    event_date: Optional[str] = None
    event_time: Optional[str] = None
    event_type: Optional[str] = None
    is_completed: Optional[bool] = None


class CalendarEventInDB(CalendarEventBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============================================================
# Wishlist
# ============================================================

class WishlistItemBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=160)
    estimated_price: float = 0
    image_url: Optional[str] = None
    cloudinary_public_id: Optional[str] = None
    category: str = "General"
    link_url: Optional[str] = None
    is_purchased: bool = False
    purchased_date: Optional[str] = None
    notes: Optional[str] = None


class WishlistItemCreate(WishlistItemBase):
    pass


class WishlistItemUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=160)
    estimated_price: Optional[float] = None
    image_url: Optional[str] = None
    cloudinary_public_id: Optional[str] = None
    category: Optional[str] = None
    link_url: Optional[str] = None
    is_purchased: Optional[bool] = None
    purchased_date: Optional[str] = None
    notes: Optional[str] = None


class WishlistItemInDB(WishlistItemBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
