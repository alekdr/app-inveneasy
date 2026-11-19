-- ============================================================
-- 009_recipes.sql – Recetas de cocina, medicinales y otras
-- ============================================================

-- 1. TABLA DE RECETAS
CREATE TABLE IF NOT EXISTS public.recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'comida' CHECK (category IN ('comida', 'medicinal', 'postre', 'bebida', 'otro')),
  difficulty TEXT NOT NULL DEFAULT 'facil' CHECK (difficulty IN ('facil', 'media', 'dificil')),
  prep_time_minutes INT CHECK (prep_time_minutes IS NULL OR prep_time_minutes >= 0),
  cook_time_minutes INT CHECK (cook_time_minutes IS NULL OR cook_time_minutes >= 0),
  servings INT NOT NULL DEFAULT 1 CHECK (servings > 0),
  ingredients JSONB NOT NULL DEFAULT '[]'::jsonb,        -- [{name, amount, unit, notes}]
  instructions TEXT[] NOT NULL DEFAULT '{}',              -- pasos numerados
  image_url TEXT,
  cloudinary_public_id TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  source_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. HISTORIAL DE RECETAS COCINADAS
CREATE TABLE IF NOT EXISTS public.recipe_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID REFERENCES public.recipes(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  cooked_date DATE NOT NULL DEFAULT CURRENT_DATE,
  rating INT CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own recipes"
  ON public.recipes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own recipe logs"
  ON public.recipe_logs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- Índices para rendimiento
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_recipes_user ON public.recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_recipes_category ON public.recipes(user_id, category);
CREATE INDEX IF NOT EXISTS idx_recipes_favorite ON public.recipes(user_id, is_favorite);
CREATE INDEX IF NOT EXISTS idx_recipes_tags ON public.recipes USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_recipes_search ON public.recipes
  USING gin(to_tsvector('spanish', coalesce(title, '') || ' ' || coalesce(description, '')));
CREATE INDEX IF NOT EXISTS idx_recipe_logs_user_date ON public.recipe_logs(user_id, cooked_date DESC);
CREATE INDEX IF NOT EXISTS idx_recipe_logs_recipe ON public.recipe_logs(recipe_id);

-- ============================================================
-- Trigger: actualizar updated_at automáticamente
-- ============================================================
CREATE OR REPLACE FUNCTION public.touch_recipe_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS recipes_touch_updated_at ON public.recipes;
CREATE TRIGGER recipes_touch_updated_at
  BEFORE UPDATE ON public.recipes
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_recipe_updated_at();
