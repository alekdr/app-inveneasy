-- ============================================================
-- 007_budgets_and_fixed_expenses.sql
-- Tablas de Presupuestos por Categoría y Gastos Fijos Recurrentes
-- ============================================================

-- 1. Presupuestos por Categoría
CREATE TABLE IF NOT EXISTS public.category_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  monthly_limit NUMERIC(12, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, category)
);

-- RLS
ALTER TABLE public.category_budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their category budgets"
  ON public.category_budgets
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. Gastos Fijos Recurrentes (Arriendo, Internet, Servicios, Suscripciones)
CREATE TABLE IF NOT EXISTS public.fixed_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  category TEXT DEFAULT 'Servicios',
  due_day INTEGER DEFAULT 1 CHECK (due_day >= 1 AND due_day <= 31),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.fixed_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their fixed expenses"
  ON public.fixed_expenses
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Índices
CREATE INDEX IF NOT EXISTS idx_category_budgets_user ON public.category_budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_fixed_expenses_user ON public.fixed_expenses(user_id);


























































