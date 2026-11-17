-- =====================================================
-- InvenEasy - Migración 002: Rutinas y Finanzas
-- =====================================================

-- 1. RUTINAS DIARIAS (Sección 3 del README)
CREATE TABLE IF NOT EXISTS public.routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  time_of_day TIME, -- Hora opcional (ej: 07:00:00)
  frequency TEXT DEFAULT 'daily', -- 'daily', 'weekly', 'monthly', 'custom'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Registro diario de ejecución de rutinas (para historial y estadísticas)
CREATE TABLE IF NOT EXISTS public.routine_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id UUID REFERENCES public.routines(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL CHECK (status IN ('completed', 'uncompleted', 'pending')),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(routine_id, log_date)
);

-- 2. FINANZAS (Sección 4 del README)
CREATE TABLE IF NOT EXISTS public.financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount NUMERIC(12, 2) NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Lista de compras (Artículos por comprar / comprados)
CREATE TABLE IF NOT EXISTS public.shopping_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  estimated_price NUMERIC(12, 2) DEFAULT 0,
  actual_price NUMERIC(12, 2),
  is_purchased BOOLEAN DEFAULT false,
  purchased_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Ahorros
CREATE TABLE IF NOT EXISTS public.savings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  saving_type TEXT DEFAULT 'digital', -- 'digital' o 'efectivo'
  saving_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- RLS (Seguridad por usuario)
-- =====================================================
ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own routines" ON public.routines FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own routine logs" ON public.routine_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own transactions" ON public.financial_transactions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own shopping items" ON public.shopping_items FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own savings" ON public.savings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Índices
CREATE INDEX IF NOT EXISTS idx_routines_user ON public.routines(user_id);
CREATE INDEX IF NOT EXISTS idx_routine_logs_user_date ON public.routine_logs(user_id, log_date);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.financial_transactions(user_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_shopping_user ON public.shopping_items(user_id);
