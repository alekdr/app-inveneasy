-- ============================================================
-- 008_goals_control.sql – Tabla de Metas (Largo, Mediano, Corto Plazo)
-- ============================================================

-- 1. TABLA DE METAS
CREATE TABLE IF NOT EXISTS public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  target_date TIMESTAMPTZ NOT NULL, -- Fecha objetivo
  goal_type TEXT NOT NULL DEFAULT 'short_term' CHECK (goal_type IN ('short_term', 'medium_term', 'long_term')),
  -- short_term: hasta 3 meses, medium_term: 3-12 meses, long_term: > 1 año
  category TEXT NOT NULL DEFAULT 'personal', -- personal, finanzas, salud, carrera, etc.
  target_value NUMERIC(12, 2), -- Valor objetivo medible (ej. monto, peso, puntaje)
  current_value NUMERIC(12, 2) DEFAULT 0, -- Valor actual acumulado
  unit TEXT, -- 'monedas', 'kg', 'km', 'proyectos', etc.
  is_completed BOOLEAN DEFAULT false,
  completed_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Row Level Security
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own goals"
  ON public.goals FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Índices para rendimiento
CREATE INDEX IF NOT EXISTS goals_user_idx ON public.goals(user_id);
CREATE INDEX IF NOT EXISTS goals_type_idx ON public.goals(goal_type);
CREATE INDEX IF NOT EXISTS goals_target_date_idx ON public.goals(target_date);
CREATE INDEX IF NOT EXISTS goals_category_idx ON public.goals(category);

-- 2. Función: Calcular progreso de metas
CREATE OR REPLACE FUNCTION public.recalc_goal_progress(p_goal_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_goal public.goals%ROWTYPE;
  v_today TIMESTAMPTZ := CURRENT_TIMESTAMP;
  v_progress NUMERIC(5, 2);
BEGIN
  SELECT * INTO v_goal FROM public.goals WHERE id = p_goal_id;
  IF NOT FOUND THEN RETURN; END IF;

  -- Calcular progreso basado en valor actual vs objetivo
  IF v_goal.target_value != 0 THEN
    v_progress := (v_goal.current_value / v_goal.target_value) * 100;
  ELSE
    v_progress := 0;
  END IF;

  -- Marcar como completado si se alcanzó el objetivo y fecha pasó
  IF v_progress >= 100 AND v_today >= v_goal.target_date THEN
    UPDATE public.goals
    SET is_completed = true,
        current_value = v_goal.target_value,
        completed_date = v_today
    WHERE id = p_goal_id;
  ELSE
    -- Actualizar progreso sin marcar completado
    UPDATE public.goals
    SET current_value = v_goal.current_value, -- Mantener valor actual, solo recalcular percentage si hay trigger
        updated_at = v_today
    WHERE id = p_goal_id;
  END IF;
END;
$$;

-- 3. Trigger: Actualizar progreso al insertar/actualizar logros
CREATE OR REPLACE FUNCTION public.trigger_goal_progress_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM public.recalc_goal_progress(NEW.id);
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS goals_progress_updates ON public.goals;
CREATE TRIGGER goals_progress_updates
AFTER INSERT ON public.goals
FOR EACH ROW EXECUTE FUNCTION public.trigger_goal_progress_updates();

-- 4. Insertar metas ejemplo para usuarios nuevos
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Obtener un usuario de ejemplo (el primero)
  SELECT id INTO v_user_id FROM public.profiles LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'No hay perfiles de usuario, se omitirán las metas ejemplo';
    RETURN;
  END IF;

  -- Meta corto plazo: Beber más agua (30 días)
  INSERT INTO public.goals (user_id, title, description, target_date, goal_type, category, target_value, unit)
  VALUES (
    v_user_id,
    'Mejorar hidratación',
    'Beber 8 vasos de agua diarios durante 30 días',
    CURRENT_TIMESTAMP + INTERVAL '30 days',
    'short_term',
    'salud',
    8,
    'vasos'
  );

  -- Meta mediano plazo: Ahorrar para viaje (6 meses)
  INSERT INTO public.goals (user_id, title, description, target_date, goal_type, category, target_value, unit)
  VALUES (
    v_user_id,
    'Ahorro para viaje',
    'Reservar dinero para vacaciones familiares',
    CURRENT_TIMESTAMP + INTERVAL '6 months',
    'medium_term',
    'finanzas',
    500000, -- en COP
    'COP'
  );

  -- Meta largo plazo: Título universitario (2 años)
  INSERT INTO public.goals (user_id, title, description, target_date, goal_type, category, target_value, unit)
  VALUES (
    v_user_id,
    'Título universitario',
    'Completar carrera profesional',
    CURRENT_TIMESTAMP + INTERVAL '2 years',
    'long_term',
    'carrera',
    1, -- Indicador booleano/estado
    'certificado'
  );

  RAISE NOTICE 'Metas ejemplo insertadas para usuario %', v_user_id;
END
$$;