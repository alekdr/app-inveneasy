-- =====================================================
-- InvenEasy - Migraci├│n 004: Calendario y H├íbitos
-- =====================================================

-- 1. CALENDARIO (Eventos, Recordatorios, Tareas por fecha)
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_time TIME,
  event_type TEXT NOT NULL DEFAULT 'Recordatorio' CHECK (
    event_type IN ('Evento', 'Recordatorio', 'Tarea', 'Urgente', 'Importante', 'Meta', 'Idea')
  ),
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. H├üBITOS (Mogged)
CREATE TABLE IF NOT EXISTS public.habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  icon_name TEXT DEFAULT 'IoFlameOutline',
  color TEXT DEFAULT '#6b5ce7',
  frequency TEXT DEFAULT 'daily', -- 'daily', 'weekdays', 'weekends', 'custom'
  reminder_time TIME,
  is_measurable BOOLEAN DEFAULT false,
  target_value NUMERIC(10, 2) DEFAULT 1,
  unit TEXT, -- 'vasos', 'min', 'p├íginas', etc.
  current_streak INT DEFAULT 0,
  best_streak INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Registro diario de h├íbitos
CREATE TABLE IF NOT EXISTS public.habit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID REFERENCES public.habits(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  progress_value NUMERIC(10, 2) DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('completed', 'skipped', 'pending')),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(habit_id, log_date)
);

-- RLS
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own calendar events"
  ON public.calendar_events FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own habits"
  ON public.habits FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own habit logs"
  ON public.habit_logs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ├ìndices
CREATE INDEX IF NOT EXISTS idx_calendar_user_date ON public.calendar_events(user_id, event_date);
CREATE INDEX IF NOT EXISTS idx_habits_user ON public.habits(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_logs_user_date ON public.habit_logs(user_id, log_date);
