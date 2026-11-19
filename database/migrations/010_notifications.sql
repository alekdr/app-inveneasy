-- ============================================================
-- 010_notifications.sql – Dispositivos y preferencias de notificaciones
-- ============================================================

-- 1. TOKENS DE DISPOSITIVOS (FCM / APNs)
CREATE TABLE IF NOT EXISTS public.notification_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  token TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'android' CHECK (platform IN ('android', 'ios', 'web')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, token)
);

-- 2. PREFERENCIAS DE NOTIFICACIONES
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  routines BOOLEAN NOT NULL DEFAULT true,
  habits BOOLEAN NOT NULL DEFAULT true,
  calendar BOOLEAN NOT NULL DEFAULT true,
  budgets BOOLEAN NOT NULL DEFAULT true,
  fixed_expenses BOOLEAN NOT NULL DEFAULT true,
  debts BOOLEAN NOT NULL DEFAULT true,
  weekly_summary BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE public.notification_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own devices"
  ON public.notification_devices FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own notification preferences"
  ON public.notification_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- Índices
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_notification_devices_user ON public.notification_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_devices_token ON public.notification_devices(token);

-- ============================================================
-- Trigger: crear preferencias por defecto al crear perfil
-- ============================================================
CREATE OR REPLACE FUNCTION public.seed_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_created_notifications ON public.profiles;
CREATE TRIGGER on_profile_created_notifications
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.seed_notification_preferences();
